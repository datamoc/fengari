"use strict";

const { lauxlib, lua, lualib, to_jsstring, to_luastring } = require('./fengari.js');

/**
 * Plusieurs valeurs de retour depuis une fonction hôte.
 */
class Multi {
    constructor(values) {
        this.values = values;
    }
}

/**
 * Une machine virtuelle Lua persistante pour Fengari.
 * Permet de maintenir un état entre les évaluations et d'exposer des objets JavaScript à Lua.
 */
class FengariVm {
    /**
   * Crée une nouvelle machine virtuelle Lua.
   * @param {Object} files - Un objet pour lire les fichiers Lua (optionnel).
   * @param {number} seed - Une graine pour le générateur aléatoire (optionnel).
   */
    constructor(files = { read: () => null, list: () => null }, seed = 0x57e5a07) {
        this.files = files;
        this.randomState = seed >>> 0;
        this.state = lauxlib.luaL_newstate();
        lualib.luaL_openlibs(this.state);
        this.output = []; // Messages imprimés par Lua (print, wesnoth.log).
        this.thread = null; // Coroutine depuis laquelle une fonction hôte est appelée.
        this.lua = lua;
        this.lauxlib = lauxlib;
        this.lualib = lualib;
        this.to_jsstring = to_jsstring;
        this.to_luastring = to_luastring;

        // Définir les fonctions hôtes de base
        this.defineFunction('print', (...args) => {
            this.output.push(args.map((value) => (typeof value === 'string' ? value : JSON.stringify(value))).join('\t'));
        });

        this.defineFunction('__random', () => this.nextRandom());
        this.defineFunction('__fs_read', (path) => this.files.read(String(path)));
        this.defineFunction('__fs_list', (path) => this.files.list(String(path)));
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
   * Pousse une valeur JavaScript sur la pile Lua.
   */
    push(value) {
        const L = this.thread ?? this.state;
        this.lua.lua_checkstack(L, 8);
        if (value === null || value === undefined) {
            this.lua.lua_pushnil(L);
        } else if (typeof value === 'boolean') {
            this.lua.lua_pushboolean(L, value);
        } else if (typeof value === 'number') {
            if (Number.isInteger(value)) this.lua.lua_pushinteger(L, value);
            else this.lua.lua_pushnumber(L, value);
        } else if (typeof value === 'string') {
            this.lua.lua_pushstring(L, this.to_luastring(value));
        } else if (Array.isArray(value)) {
            this.lua.lua_createtable(L, value.length, 0);
            value.forEach((entry, index) => {
                this.push(entry);
                this.lua.lua_seti(L, -2, index + 1);
            });
        } else {
            this.lua.lua_createtable(L, 0, Object.keys(value).length);
            for (const [key, entry] of Object.entries(value)) {
                this.push(entry);
                if (/^-?\d+$/.test(key)) this.lua.lua_seti(L, -2, Number(key));
                else this.lua.lua_setfield(L, -2, this.to_luastring(key));
            }
        }
    }

    /**
   * Lit une valeur Lua depuis la pile et la convertit en JavaScript.
   */
    read(index, depth = 0) {
        const L = this.thread ?? this.state;
        const type = this.lua.lua_type(L, index);
        if (type === this.lua.LUA_TBOOLEAN) return this.lua.lua_toboolean(L, index);
        if (type === this.lua.LUA_TNUMBER) return this.lua.lua_tonumber(L, index);
        if (type === this.lua.LUA_TSTRING) return this.to_jsstring(this.lua.lua_tostring(L, index));
        if (type !== this.lua.LUA_TTABLE || depth > 24) return null;
        this.lua.lua_checkstack(L, 8);
        const table = index < 0 ? this.lua.lua_gettop(L) + index + 1 : index;
        const result = {};
        this.lua.lua_pushnil(L);
        while (this.lua.lua_next(L, table) !== 0) {
            const keyType = this.lua.lua_type(L, -2);
            let key = null;
            if (keyType === this.lua.LUA_TNUMBER) key = String(this.lua.lua_tonumber(L, -2));
            else if (keyType === this.lua.LUA_TSTRING) key = this.to_jsstring(this.lua.lua_tostring(L, -2));
            if (key !== null) result[key] = this.read(-1, depth + 1);
            this.lua.lua_pop(L, 1);
        }
        return result;
    }

    /**
   * Enregistre une fonction JavaScript sous un nom donné (chemin pointillé) dans les globals Lua.
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
                let results;
                try {
                    results = fn(...args);
                } catch (error) {
                    this.lua.lua_pushstring(L, this.to_luastring(error instanceof Error ? error.message : String(error)));
                    return this.lua.lua_error(L);
                }
                if (results === undefined) return 0;
                if (results instanceof Multi) {
                    for (const value of results.values) this.push(value);
                    return results.values.length;
                }
                this.push(results);
                return 1;
            } finally {
                this.thread = previous;
            }
        };
    }

    /**
   * Exécute du code Lua et retourne sa première valeur de retour.
   */
    run(source, chunkName = '=chunk') {
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
        return this.protectedCall(0, base, handler);
    }

    /**
   * Appelle une fonction Lua globale par son chemin pointillé avec des arguments JSON.
   */
    call(path, ...args) {
        const L = this.state;
        const base = this.lua.lua_gettop(L);
        const handler = this.pushTracebackHandler();
        const parts = path.split('.');
        this.lua.lua_getglobal(L, this.to_luastring(parts[0]));
        for (const part of parts.slice(1)) {
            this.lua.lua_getfield(L, -1, this.to_luastring(part));
            this.lua.lua_remove(L, -2);
        }
        for (const arg of args) this.push(arg);
        return this.protectedCall(args.length, base, handler);
    }

    /**
   * Appelle une fonction Lua de manière protégée.
   */
    protectedCall(argCount, base, handler) {
        const L = this.state;
        const status = this.lua.lua_pcall(L, argCount, 1, handler);
        if (status !== this.lua.LUA_OK) {
            const raw = this.lua.lua_tostring(L, -1);
            const trace = raw ? this.to_jsstring(raw) : `error object of type ${this.to_jsstring(this.lua.lua_typename(L, this.lua.lua_type(L, -1)))}`;
            this.lua.lua_settop(L, base);
            throw new LuaError(trace.split('\n')[0], trace);
        }
        const value = this.read(-1);
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
            if (!message && this.lua.lua_istable(state, 1)) message = this.to_luastring(`error table ${JSON.stringify(this.read(1))}`);
            this.lauxlib.luaL_traceback(state, state, message, 1);
            return 1;
        });
        return this.lua.lua_gettop(L);
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

module.exports = { FengariVm, LuaError, Multi };
