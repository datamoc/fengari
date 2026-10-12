"use strict";

importScripts("cases.js");
self.onmessage = ({ data }) => {
    const sample = SECURITY_CASES.find(item => item.id === data.id);
    if (!sample || !["upstream", "pyroeis"].includes(data.engine)) {
        self.postMessage({ kind: "setup-error", message: "Unknown demonstration" });
        return;
    }
    let vm;
    try {
        if (data.engine === "upstream") {
            importScripts("../assets/fengari-0.1.5.bundle.js", "../assets/upstream-vm.js");
            vm = new UpstreamVm(20000);
        } else {
            importScripts("../benchmark/pyroeis.bundle.js");
            vm = new Pyroeis.PyroeisVm(undefined, undefined, {
                sandbox: true,
                limits: { instructions: 20000, timeMs: 200, allocation: 1024 * 1024, totalAllocation: 4 * 1024 * 1024 }
            });
        }
    } catch (error) {
        self.postMessage({ kind: "setup-error", message: error.message });
        return;
    }
    self.postMessage({ kind: "ready" });
    const start = performance.now();
    try {
        const value = vm.run(sample.source);
        self.postMessage({ kind: "returned", value, ms: performance.now() - start });
    } catch (error) {
        self.postMessage({ kind: "error", name: error.name, limit: error.limit || null, message: error.message, ms: performance.now() - start });
    } finally {
        if (data.engine === "upstream") vm.close();
        else Pyroeis.lua.lua_close(vm.state);
    }
};
