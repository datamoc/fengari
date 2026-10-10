"use strict";

const { lauxlib, lua, lualib, to_jsstring, to_luastring } = require('./library-runtime.js').fengari;

const MAX_DEPTH = 128;
const INTEGER_KEY = /^-?\d+$/;
const MIN_SAFE = BigInt(Number.MIN_SAFE_INTEGER);
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Plusieurs valeurs de retour depuis une fonction hôte.
 */
class Multi {
    constructor(values) {
        this.values = values;
    }
}

/**
 * Nombre à pousser comme flottant Lua (JavaScript ne distingue pas 5 de 5.0).
 * Avec l'option `preserveFloats`, les flottants Lua de valeur entière sont lus sous cette forme.
 */
class LuaFloat {
    constructor(value) {
        this.value = Number(value);
    }

    valueOf() {
        return this.value;
    }
}

/**
 * Valeur hôte opaque, poussée comme light userdata Lua (et lue sous cette forme).
 * Lua ne peut que la stocker, la comparer et la repasser à l'hôte.
 */
class Userdata {
    constructor(value) {
        this.value = value;
    }
}

/**
 * Retourné par une fonction hôte : suspend la coroutine appelante et lui fait
 * céder `values`. À la reprise, les arguments de `resume` deviennent les valeurs
 * de retour de la fonction hôte.
 */
class Yield extends Multi {}

/**
 * JSON.stringify tolérant pour les messages : BigInt, références Lua et cycles ne font pas échouer.
 */
function describe(value) {
    const seen = new WeakSet();
    try {
        return JSON.stringify(value, (key, entry) => {
            if (typeof entry === 'bigint') return String(entry);
            if (entry instanceof LuaFloat) return entry.value;
            if (entry instanceof LuaRef) return `<${entry.type}>`;
            if (entry instanceof Userdata) return '<userdata>';
            if (entry instanceof Uint8Array) return `<bytes:${entry.length}>`;
            if (entry instanceof Map) return Array.from(entry);
            if (entry && typeof entry === 'object') {
                if (seen.has(entry)) return '<cycle>';
                seen.add(entry);
            }
            return entry;
        });
    } catch {
        return String(value);
    }
}

/**
 * Erreur Lua avec traceback.
 */
class LuaError extends Error {
    constructor(message, traceback) {
        super(message);
        this.name = 'LuaError';
        this.traceback = traceback;
    }
}

/**
 * Référence vers une valeur Lua qui n'a pas d'équivalent JavaScript
 * (fonction ou thread), ancrée dans le registre Lua.
 */
class LuaRef {
    constructor(vm, id, type) {
        this.vm = vm;
        this.id = id;
        this.type = type;
        vm.refRegistry?.register(this, { state: vm.state, id }, this);
    }

    /** Pour un userdata complet : son contenu côté hôte (undefined pour les autres types). */
    get value() {
        if (this.type !== 'userdata' || this.id === null) return undefined;
        const { lua, state } = this.vm;
        lua.lua_rawgeti(state, lua.LUA_REGISTRYINDEX, this.id);
        const value = lua.lua_touserdata(state, -1);
        lua.lua_pop(state, 1);
        return value;
    }

    /** Appelle la fonction référencée ; retourne sa première valeur de retour. */
    call(...args) {
        return this.vm.callRef(this, ...args);
    }

    /** Libère la référence (automatique à la collecte de l'objet). */
    release() {
        if (this.id === null) return;
        this.vm.refRegistry?.unregister(this);
        this.vm.lauxlib.luaL_unref(this.vm.state, this.vm.lua.LUA_REGISTRYINDEX, this.id);
        this.id = null;
    }
}

/**
 * Coroutine Lua pilotée depuis l'hôte (créée par FengariVm#coroutine).
 */
class Coroutine {
    constructor(vm, thread) {
        this.vm = vm;
        this.thread = thread;
        this.active = false;
    }

    /** 'suspended' | 'running' | 'dead' */
    get status() {
        const { lua } = this.vm;
        if (this.active) return 'running';
        const status = lua.lua_status(this.thread);
        if (status === lua.LUA_YIELD) return 'suspended';
        if (status === lua.LUA_OK && lua.lua_gettop(this.thread) > 0) return 'suspended'; /* pas encore démarrée */
        return 'dead';
    }

    /**
     * Démarre ou reprend la coroutine avec `args`.
     * @returns {{done: boolean, values: Array}} `done` vaut true quand le corps de la
     *   coroutine est terminé (`values` = ses retours), false si elle a cédé (`values` = valeurs cédées).
     * @throws {LuaError} si la coroutine échoue ; elle est alors morte (voir `close`).
     */
    resume(...args) {
        const vm = this.vm;
        const { lua, lauxlib } = vm;
        const T = this.thread;
        const status = this.status;
        if (status !== 'suspended') throw new LuaError(`cannot resume ${status} coroutine`, `cannot resume ${status} coroutine`);
        lua.lua_checkstack(T, args.length + 1);
        for (const arg of args) vm.push(arg, T);
        this.active = true;
        let result;
        try {
            result = lua.lua_resume(T, vm.thread ?? vm.state, args.length);
        } finally {
            this.active = false;
        }
        if (result === lua.LUA_OK || result === lua.LUA_YIELD) {
            const values = [];
            const count = lua.lua_gettop(T);
            for (let index = 1; index <= count; index++) values.push(vm.read(index, 0, T));
            lua.lua_settop(T, 0);
            return { done: result === lua.LUA_OK, values };
        }
        const message = vm.errorMessage(T, -1);
        lauxlib.luaL_traceback(vm.state, T, to_luastring(message), 0);
        const trace = to_jsstring(lua.lua_tostring(vm.state, -1));
        lua.lua_pop(vm.state, 1);
        lua.lua_settop(T, 0);
        throw new LuaError(message, trace);
    }

    /**
     * Ferme la coroutine (exécute les variables `<close>` en attente) ; elle devient morte.
     * @throws {LuaError} si une fermeture échoue.
     */
    close() {
        const vm = this.vm;
        if (this.active) throw new LuaError('cannot close a running coroutine', 'cannot close a running coroutine');
        const status = vm.lua.lua_closethread(this.thread, vm.state);
        if (status !== vm.lua.LUA_OK) {
            const message = vm.errorMessage(this.thread, -1);
            vm.lua.lua_settop(this.thread, 0);
            throw new LuaError(message, message);
        }
        vm.lua.lua_settop(this.thread, 0);
    }
}

/* Bibliothèques sélectionnables via l'option `libs` (nom → nom de table globale). */
const LIBRARIES = {
    base: '_G', coroutine: 'coroutine', table: 'table', string: 'string', utf8: 'utf8',
    math: 'math', os: 'os', debug: 'debug', package: 'package', io: 'io', fengari: 'fengari'
};

/**
 * Une machine virtuelle Lua persistante pour Fengari.
 * Permet de maintenir un état entre les évaluations et d'exposer des objets JavaScript à Lua.
 */
class FengariVm {
    /**
   * Crée une nouvelle machine virtuelle Lua.
   * @param {Object} files - Un objet pour lire les fichiers Lua (optionnel).
   * @param {number} seed - Une graine pour le générateur aléatoire (optionnel).
   * @param {Object} options - Options (optionnel).
   * @param {string[]} [options.libs] - Bibliothèques à ouvrir parmi base, coroutine, table, string,
   *   utf8, math, os, debug, package, io, fengari. Par défaut : toutes (luaL_openlibs).
   * @param {string[]} [options.remove] - Chemins pointillés de globals à retirer après
   *   ouverture (ex. ['load', 'dofile', 'os.execute']).
   * @param {boolean} [options.preserveFloats] - Lire les flottants Lua de valeur entière (5.0)
   *   comme des LuaFloat plutôt que comme des nombres (5). Par défaut : false.
   */
    constructor(files = { read: () => null, list: () => null }, seed = 0x57e5a07, options = {}) {
        this.files = files;
        this.randomState = seed >>> 0;
        this.state = lauxlib.luaL_newstate();
        this.refRegistry = typeof FinalizationRegistry === 'function'
            ? new FinalizationRegistry(({ state, id }) => lauxlib.luaL_unref(state, lua.LUA_REGISTRYINDEX, id))
            : null;
        this.output = []; // Messages imprimés par Lua (print, wesnoth.log).
        this.thread = null; // Coroutine depuis laquelle une fonction hôte est appelée.
        this.lua = lua;
        this.lauxlib = lauxlib;
        this.lualib = lualib;
        this.to_jsstring = to_jsstring;
        this.to_luastring = to_luastring;

        this.preserveFloats = options.preserveFloats === true;
        this.openLibraries(options.libs);
        for (const path of options.remove ?? []) this.removeGlobal(path);

        // Définir les fonctions hôtes de base
        this.defineFunction('print', (...args) => {
            this.output.push(args.map((value) => (typeof value === 'string' ? value : describe(value))).join('\t'));
        });

        this.defineFunction('__random', () => this.nextRandom());
        this.defineFunction('__fs_read', (path) => this.files.read(String(path)));
        this.defineFunction('__fs_list', (path) => this.files.list(String(path)));
    }

    /**
   * Ouvre les bibliothèques demandées (toutes si `libs` est absent).
   */
    openLibraries(libs) {
        const L = this.state;
        if (libs === undefined || libs === null) {
            this.lualib.luaL_openlibs(L);
            return;
        }
        for (const name of libs) {
            const open = this.lualib[`luaopen_${name}`];
            if (!Object.hasOwn(LIBRARIES, name) || !open) throw new Error(`Unknown or unavailable Lua library: ${name}`);
            this.lauxlib.luaL_requiref(L, this.to_luastring(LIBRARIES[name]), open, 1);
            this.lua.lua_pop(L, 1);
        }
    }

    /**
   * Met à nil un global désigné par un chemin pointillé (ex. 'os.execute').
   */
    removeGlobal(path) {
        const L = this.state;
        const parts = path.split('.');
        const last = parts.pop();
        if (parts.length === 0) {
            this.lua.lua_pushnil(L);
            this.lua.lua_setglobal(L, this.to_luastring(last));
            return;
        }
        this.pushPath(L, parts.join('.'));
        if (this.lua.lua_istable(L, -1)) {
            this.lua.lua_pushnil(L);
            this.lua.lua_setfield(L, -2, this.to_luastring(last));
        }
        this.lua.lua_pop(L, 1);
    }

    /**
   * Génère un nombre aléatoire (mulberry32, un flottant dans [0, 1)).
   */
    nextRandom() {
        this.randomState = (this.randomState + 0x6d2b79f5) >>> 0;
        let t = this.randomState;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
   * Pousse une valeur JavaScript sur la pile Lua (celle de `L`, par défaut le thread courant).
   * Accepte aussi LuaFloat, BigInt (entier 64 bits), Userdata, les fonctions JS (converties en fonctions hôtes), LuaRef et Coroutine.
   */
    push(value, L = this.thread ?? this.state, depth = 0) {
        if (depth > MAX_DEPTH) throw new RangeError('Value too deeply nested (cyclic?) to convert to Lua');
        this.lua.lua_checkstack(L, 8);
        if (value === null || value === undefined) {
            this.lua.lua_pushnil(L);
        } else if (typeof value === 'boolean') {
            this.lua.lua_pushboolean(L, value);
        } else if (typeof value === 'number') {
            if (Number.isSafeInteger(value)) this.lua.lua_pushinteger(L, value);
            else this.lua.lua_pushnumber(L, value);
        } else if (typeof value === 'bigint') {
            this.lua.lua_pushinteger(L, BigInt.asIntN(64, value));
        } else if (value instanceof Userdata) {
            this.lua.lua_pushlightuserdata(L, value.value);
        } else if (value instanceof LuaFloat) {
            this.lua.lua_pushnumber(L, value.value);
        } else if (typeof value === 'string') {
            this.lua.lua_pushstring(L, this.to_luastring(value));
        } else if (value instanceof Uint8Array) {
            this.lua.lua_pushstring(L, new Uint8Array(value));
        } else if (typeof value === 'function') {
            this.lua.lua_pushcfunction(L, this.wrap(value));
        } else if (value instanceof LuaRef) {
            if (value.id === null) throw new Error('Lua reference was released');
            this.lua.lua_rawgeti(L, this.lua.LUA_REGISTRYINDEX, value.id);
        } else if (value instanceof Coroutine) {
            this.lua.lua_pushthread(value.thread);
            this.lua.lua_xmove(value.thread, L, 1);
        } else if (value instanceof Map) {
            this.lua.lua_createtable(L, 0, value.size);
            for (const [key, entry] of value) {
                if (key === null || key === undefined || Number.isNaN(key)) throw new TypeError('Lua table keys cannot be nil or NaN');
                this.push(key, L, depth + 1);
                this.push(entry, L, depth + 1);
                this.lua.lua_settable(L, -3);
            }
        } else if (Array.isArray(value)) {
            this.lua.lua_createtable(L, value.length, 0);
            value.forEach((entry, index) => {
                this.push(entry, L, depth + 1);
                this.lua.lua_seti(L, -2, index + 1);
            });
        } else {
            this.lua.lua_createtable(L, 0, Object.keys(value).length);
            for (const [key, entry] of Object.entries(value)) {
                this.push(entry, L, depth + 1);
                if (INTEGER_KEY.test(key)) this.lua.lua_seti(L, -2, Number(key));
                else this.lua.lua_setfield(L, -2, this.to_luastring(key));
            }
        }
    }

    /**
   * Lit une valeur Lua depuis la pile (celle de `L`, par défaut le thread courant) et la
   * convertit en JavaScript. Chaînes → string, ou Uint8Array si ce n'est pas de l'UTF-8 valide.
   * Tables → tableau (clés 1..n), objet (clés chaînes/entiers) ou Map (clés booléennes, flottantes,
   * tables, fonctions, chaînes binaires, ou collision entre la chaîne "1" et l'entier 1).
   * Fonctions, threads et userdata → LuaRef (light userdata → Userdata) ; entiers hors de ±2^53 → BigInt.
   * Les références circulaires sont préservées.
   */
    read(index, depth = 0, L = this.thread ?? this.state, seen = new Map()) {
        if (depth > MAX_DEPTH) throw new RangeError('Lua value too deeply nested to convert to JavaScript');
        const type = this.lua.lua_type(L, index);
        if (type === this.lua.LUA_TBOOLEAN) return this.lua.lua_toboolean(L, index);
        if (type === this.lua.LUA_TNUMBER) {
            if (this.lua.lua_isinteger(L, index)) {
                const integer = this.lua.lua_tointeger(L, index); /* BigInt dans le build 64 bits */
                if (typeof integer !== 'bigint') return integer;
                return integer >= MIN_SAFE && integer <= MAX_SAFE ? Number(integer) : integer;
            }
            const number = this.lua.lua_tonumber(L, index);
            if (this.preserveFloats && Number.isInteger(number) && !this.lua.lua_isinteger(L, index)) return new LuaFloat(number);
            return number;
        }
        if (type === this.lua.LUA_TSTRING) return this.readString(L, index);
        if (type === this.lua.LUA_TLIGHTUSERDATA) return new Userdata(this.lua.lua_touserdata(L, index));
        const refTypes = {
            [this.lua.LUA_TFUNCTION]: 'function', [this.lua.LUA_TTHREAD]: 'thread', [this.lua.LUA_TUSERDATA]: 'userdata'
        };
        if (refTypes[type]) {
            this.lua.lua_pushvalue(L, index);
            return new LuaRef(this, this.lauxlib.luaL_ref(L, this.lua.LUA_REGISTRYINDEX), refTypes[type]);
        }
        if (type !== this.lua.LUA_TTABLE) return null;
        this.lua.lua_checkstack(L, 8);
        const pointer = this.lua.lua_topointer(L, index);
        if (seen.has(pointer)) return seen.get(pointer);
        const table = index < 0 ? this.lua.lua_gettop(L) + index + 1 : index;
        const kind = this.classifyKeys(L, table);
        const result = kind === 'array' ? [] : kind === 'map' ? new Map() : {};
        seen.set(pointer, result);
        this.lua.lua_pushnil(L);
        while (this.lua.lua_next(L, table) !== 0) {
            if (kind === 'map') {
                result.set(this.read(-2, depth + 1, L, seen), this.read(-1, depth + 1, L, seen));
            } else if (kind === 'array') {
                result[Number(this.lua.lua_tointeger(L, -2)) - 1] = this.read(-1, depth + 1, L, seen);
            } else {
                const key = this.lua.lua_type(L, -2) === this.lua.LUA_TSTRING
                    ? this.readString(L, -2) : String(this.lua.lua_tointeger(L, -2));
                result[key] = this.read(-1, depth + 1, L, seen);
            }
            this.lua.lua_pop(L, 1);
        }
        return result;
    }

    /**
   * Lit une chaîne Lua : string JavaScript si c'est de l'UTF-8 valide, sinon Uint8Array.
   */
    readString(L, index) {
        const bytes = this.lua.lua_tostring(L, index);
        try {
            return this.to_jsstring(bytes);
        } catch {
            return Uint8Array.from(bytes); /* UTF-8 invalide : on garde les octets */
        }
    }

    /**
   * Choisit la représentation JavaScript de la table à `table` : 'array' (clés entières 1..n),
   * 'object' (clés chaînes UTF-8 et entiers) ou 'map' (toute autre clé, ou collision "1" / 1).
   */
    classifyKeys(L, table) {
        const { lua } = this;
        let count = 0;
        let allIntegers = true;
        let min = Infinity;
        let max = -Infinity;
        const integerKeys = new Set();
        const numericStrings = new Set();
        let kind = null;
        lua.lua_pushnil(L);
        while (lua.lua_next(L, table) !== 0) {
            count++;
            const keyType = lua.lua_type(L, -2);
            if (keyType === lua.LUA_TNUMBER && lua.lua_isinteger(L, -2)) {
                const key = lua.lua_tointeger(L, -2);
                integerKeys.add(String(key));
                const asNumber = Number(key);
                min = Math.min(min, asNumber);
                max = Math.max(max, asNumber);
            } else {
                allIntegers = false;
                if (keyType === lua.LUA_TSTRING) {
                    const key = this.readString(L, -2);
                    if (typeof key !== 'string') kind = 'map';
                    else if (INTEGER_KEY.test(key)) numericStrings.add(key);
                } else {
                    kind = 'map';
                }
            }
            lua.lua_pop(L, 1);
        }
        if (kind === 'map') return 'map';
        for (const key of numericStrings) if (integerKeys.has(key)) return 'map';
        return count > 0 && allIntegers && min >= 1 && max === count ? 'array' : 'object';
    }

    /**
   * Message d'une valeur d'erreur Lua à l'index donné.
   */
    errorMessage(L, index) {
        const raw = this.lua.lua_type(L, index) === this.lua.LUA_TSTRING || this.lua.lua_type(L, index) === this.lua.LUA_TNUMBER
            ? this.lua.lua_tostring(L, index) : null;
        if (raw) return this.to_jsstring(raw);
        if (this.lua.lua_istable(L, index)) return `error table ${describe(this.read(index, 0, L))}`;
        return `error object of type ${this.to_jsstring(this.lua.lua_typename(L, this.lua.lua_type(L, index)))}`;
    }

    /**
   * Enregistre une fonction JavaScript sous un nom donné (chemin pointillé) dans les globals Lua.
   * La fonction peut retourner `new Yield([...])` pour suspendre la coroutine appelante.
   */
    defineFunction(name, fn) {
        const L = this.state;
        const parts = name.split('.');
        const last = parts.pop();
        if (parts.length === 0) {
            this.lua.lua_pushcfunction(L, this.wrap(fn));
            this.lua.lua_setglobal(L, this.to_luastring(last));
            return;
        }
        this.lua.lua_getglobal(L, this.to_luastring(parts[0]));
        if (this.lua.lua_isnil(L, -1)) {
            this.lua.lua_pop(L, 1);
            this.lua.lua_newtable(L);
            this.lua.lua_pushvalue(L, -1);
            this.lua.lua_setglobal(L, this.to_luastring(parts[0]));
        }
        for (const part of parts.slice(1)) {
            this.lua.lua_getfield(L, -1, this.to_luastring(part));
            if (this.lua.lua_isnil(L, -1)) {
                this.lua.lua_pop(L, 1);
                this.lua.lua_newtable(L);
                this.lua.lua_pushvalue(L, -1);
                this.lua.lua_setfield(L, -3, this.to_luastring(part));
            }
            this.lua.lua_remove(L, -2);
        }
        this.lua.lua_pushcfunction(L, this.wrap(fn));
        this.lua.lua_setfield(L, -2, this.to_luastring(last));
        this.lua.lua_pop(L, 1);
    }

    /**
   * Enveloppe une fonction JavaScript pour qu'elle puisse être appelée depuis Lua.
   */
    wrap(fn) {
        return (L) => {
            const previous = this.thread;
            this.thread = L;
            try {
                const count = this.lua.lua_gettop(L);
                const args = [];
                for (let index = 1; index <= count; index++) args.push(this.read(index));
                let pushed;
                let yielded = false;
                try {
                    const results = fn(...args);
                    if (results === undefined) {
                        pushed = 0;
                    } else if (results instanceof Multi) {
                        for (const value of results.values) this.push(value);
                        pushed = results.values.length;
                        yielded = results instanceof Yield;
                    } else {
                        this.push(results);
                        pushed = 1;
                    }
                } catch (error) {
                    this.lua.lua_settop(L, count);
                    this.lua.lua_pushstring(L, this.to_luastring(error instanceof Error ? error.message : String(error)));
                    return this.lua.lua_error(L);
                }
                return yielded ? this.lua.lua_yield(L, pushed) : pushed;
            } finally {
                this.thread = previous;
            }
        };
    }

    /**
   * Pousse sur `L` la valeur Lua désignée par un chemin pointillé de globals (nil si absente).
   */
    pushPath(L, path) {
        const parts = path.split('.');
        this.lua.lua_getglobal(L, this.to_luastring(parts[0]));
        for (const part of parts.slice(1)) {
            if (!this.lua.lua_istable(L, -1)) {
                this.lua.lua_pop(L, 1);
                this.lua.lua_pushnil(L);
                return;
            }
            this.lua.lua_getfield(L, -1, this.to_luastring(part));
            this.lua.lua_remove(L, -2);
        }
    }

    /**
   * Exécute du code Lua et retourne sa première valeur de retour.
   */
    run(source, chunkName = '=chunk') {
        return this.execute(source, chunkName, false);
    }

    /**
   * Exécute du code Lua et retourne toutes ses valeurs de retour dans un tableau.
   */
    runMulti(source, chunkName = '=chunk') {
        return this.execute(source, chunkName, true);
    }

    execute(source, chunkName, all) {
        const L = this.state;
        const base = this.lua.lua_gettop(L);
        const handler = this.pushTracebackHandler();
        const bytes = this.to_luastring(source);
        const loaded = this.lauxlib.luaL_loadbuffer(L, bytes, bytes.length, this.to_luastring(chunkName));
        if (loaded !== this.lua.LUA_OK) {
            const message = this.to_jsstring(this.lua.lua_tostring(L, -1));
            this.lua.lua_settop(L, base);
            throw new LuaError(message, message);
        }
        return this.protectedCall(0, base, handler, all);
    }

    /**
   * Appelle une fonction Lua globale par son chemin pointillé avec des arguments JSON.
   */
    call(path, ...args) {
        return this.invoke(path, args, false);
    }

    /**
   * Comme `call`, mais retourne toutes les valeurs de retour dans un tableau.
   */
    callMulti(path, ...args) {
        return this.invoke(path, args, true);
    }

    invoke(path, args, all) {
        const L = this.state;
        const base = this.lua.lua_gettop(L);
        const handler = this.pushTracebackHandler();
        this.pushPath(L, path);
        for (const arg of args) this.push(arg, L);
        return this.protectedCall(args.length, base, handler, all);
    }

    /**
   * Appelle une fonction Lua référencée par un LuaRef.
   */
    callRef(ref, ...args) {
        const L = this.state;
        const base = this.lua.lua_gettop(L);
        const handler = this.pushTracebackHandler();
        this.push(ref, L);
        for (const arg of args) this.push(arg, L);
        return this.protectedCall(args.length, base, handler);
    }

    /**
   * Crée une coroutine pilotée par l'hôte (non démarrée).
   * @param {string|LuaRef} target - Chemin pointillé d'une fonction globale, ou LuaRef de fonction.
   * @returns {Coroutine}
   */
    coroutine(target) {
        const T = this.lua.lua_newthread(this.state);
        this.lua.lua_pop(this.state, 1); /* le Coroutine JS retient le thread */
        if (typeof target === 'string') this.pushPath(this.state, target);
        else this.push(target, this.state);
        if (!this.lua.lua_isfunction(this.state, -1)) {
            this.lua.lua_pop(this.state, 1);
            throw new TypeError(`Coroutine target is not a Lua function: ${String(target)}`);
        }
        this.lua.lua_xmove(this.state, T, 1);
        return new Coroutine(this, T);
    }

    /**
   * Crée une coroutine dont le corps est le chunk Lua `source` (non démarrée).
   * @returns {Coroutine}
   */
    coroutineFromSource(source, chunkName = '=chunk') {
        const T = this.lua.lua_newthread(this.state);
        this.lua.lua_pop(this.state, 1);
        const bytes = this.to_luastring(source);
        if (this.lauxlib.luaL_loadbuffer(T, bytes, bytes.length, this.to_luastring(chunkName)) !== this.lua.LUA_OK) {
            const message = this.to_jsstring(this.lua.lua_tostring(T, -1));
            throw new LuaError(message, message);
        }
        return new Coroutine(this, T);
    }

    /**
   * Appelle une fonction Lua de manière protégée.
   */
    protectedCall(argCount, base, handler, all = false) {
        const L = this.state;
        const status = this.lua.lua_pcall(L, argCount, all ? this.lua.LUA_MULTRET : 1, handler);
        if (status !== this.lua.LUA_OK) {
            const trace = this.errorMessage(L, -1);
            this.lua.lua_settop(L, base);
            throw new LuaError(trace.split('\n')[0], trace);
        }
        let value;
        if (all) {
            value = [];
            for (let index = handler + 1; index <= this.lua.lua_gettop(L); index++) value.push(this.read(index, 0, L));
        } else {
            value = this.read(-1, 0, L);
        }
        this.lua.lua_settop(L, base);
        return value;
    }

    /**
   * Ajoute un gestionnaire de traceback pour les erreurs Lua.
   */
    pushTracebackHandler() {
        const L = this.state;
        this.lua.lua_pushcfunction(L, (state) => {
            let message = this.lua.lua_tostring(state, 1);
            if (!message && this.lua.lua_istable(state, 1)) message = this.to_luastring(`error table ${describe(this.read(1, 0, state))}`);
            this.lauxlib.luaL_traceback(state, state, message, 1);
            return 1;
        });
        return this.lua.lua_gettop(L);
    }


}

module.exports = { FengariVm, LuaError, Multi, Yield, LuaRef, LuaFloat, Userdata, Coroutine };
