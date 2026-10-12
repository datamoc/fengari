"use strict";

importScripts("../benchmark/pyroeis.bundle.js");
self.postMessage({ kind: "ready" });
self.onmessage = ({ data }) => {
    const trace = [];
    const refs = new Set();
    let vm;
    function inspect(value, seen = new WeakSet(), depth = 0) {
        if (depth > 20) return "[profondeur d’affichage limitée]";
        if (value instanceof Pyroeis.LuaRef) {
            refs.add(value);
            return { type: "LuaRef", luaType: value.type };
        }
        if (typeof value === "bigint") return { type: "BigInt", value: String(value) };
        if (value instanceof Uint8Array) return { type: "Uint8Array", bytes: Array.from(value) };
        if (value instanceof Pyroeis.Userdata) return { type: "Userdata", value: "opaque" };
        if (value instanceof Pyroeis.LuaFloat) return { type: "LuaFloat", value: value.value };
        if (typeof value === "number" && !Number.isFinite(value)) return { type: "Number", value: String(value) };
        if (value === null || typeof value !== "object") return value;
        if (seen.has(value)) return "[référence déjà affichée]";
        seen.add(value);
        if (Array.isArray(value)) return value.map(entry => inspect(entry, seen, depth + 1));
        if (value instanceof Map) return { type: "Map", entries: Array.from(value, ([key, entry]) => [inspect(key, seen, depth + 1), inspect(entry, seen, depth + 1)]) };
        const result = Object.create(null);
        for (const [key, entry] of Object.entries(value)) result[key] = inspect(entry, seen, depth + 1);
        return result;
    }
    try {
        vm = new Pyroeis.PyroeisVm(undefined, 42, {
            sandbox: true,
            limits: { instructions: 50000, timeMs: 100, allocation: 256 * 1024, totalAllocation: 1024 * 1024 }
        });
        vm.defineFunction("host.scale", (value, factor) => {
            if (typeof value !== "number" || typeof factor !== "number" || !Number.isFinite(value) || !Number.isFinite(factor)) {
                throw new Error("host.scale attend deux nombres finis.");
            }
            const result = value * factor;
            if (!Number.isFinite(result)) throw new Error("Résultat non fini refusé.");
            if (trace.length >= 100) throw new Error("La démonstration limite le journal à 100 échanges.");
            trace.push({ direction: "Lua → JavaScript", operation: "host.scale(value, factor)", arguments: [value, factor] });
            trace.push({ direction: "JavaScript → Lua", operation: "retour du callback", value: result });
            return result;
        });
        vm.run(data.source, "=exchange-demo");
        trace.push({ direction: "JavaScript → Lua", operation: "vm.callMulti('exchange', data)", value: inspect(data.payload) });
        const values = vm.callMulti("exchange", data.payload);
        const returned = values.map(value => inspect(value));
        trace.push({ direction: "Lua → JavaScript", operation: "retours de exchange", value: returned });
        if (data.mode === "reference") {
            const ref = values[0];
            if (!(ref instanceof Pyroeis.LuaRef) || ref.type !== "function") {
                throw new Error("Cet exemple attend une fonction Lua comme premier retour.");
            }
            refs.add(ref);
            trace.push({ direction: "JavaScript → Lua", operation: "ref.call(7)", value: 7 });
            const result = ref.call(7);
            trace.push({ direction: "Lua → JavaScript", operation: "retour de la fonction référencée", value: inspect(result) });
        }
        self.postMessage({ kind: "result", returned, inputAfter: data.payload, trace, output: vm.output });
    } catch (error) {
        self.postMessage({ kind: "error", message: error.message, limit: error.limit || null, trace, inputAfter: data.payload });
    } finally {
        for (const ref of refs) ref.release();
        if (vm) Pyroeis.lua.lua_close(vm.state);
    }
};
