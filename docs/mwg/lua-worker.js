"use strict";

importScripts("../benchmark/pyroeis.bundle.js");
let vm = null;
self.postMessage({ kind: "ready" });
self.onmessage = ({ data }) => {
    try {
        if (data.action === "apply") {
            const next = new Pyroeis.PyroeisVm(undefined, 42, {
                sandbox: true,
                limits: { instructions: 30000, timeMs: 50, allocation: 256 * 1024, totalAllocation: 1024 * 1024 }
            });
            try {
                next.run(data.source, "=robot-strategy");
                if (next.run("return type(choose)") !== "function") throw new Error("Le script doit définir function choose(targets).");
            } catch (error) {
                Pyroeis.lua.lua_close(next.state);
                throw error;
            }
            if (vm) Pyroeis.lua.lua_close(vm.state);
            vm = next;
            self.postMessage({ id: data.id, kind: "applied" });
        } else if (data.action === "choose") {
            if (!vm) throw new Error("Appliquez une stratégie avant de jouer.");
            const index = vm.call("choose", data.targets);
            if (!Number.isInteger(index) || index < 1 || index > data.targets.length) {
                throw new Error(`choose doit renvoyer un indice entre 1 et ${data.targets.length}. Reçu\u202f: ${String(index)}`);
            }
            self.postMessage({ id: data.id, kind: "choice", index });
        } else throw new Error("Commande inconnue");
    } catch (error) {
        self.postMessage({ id: data.id, kind: "error", message: error.message, limit: error.limit || null });
    }
};
