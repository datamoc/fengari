"use strict";

const pyroeis = require("../src/pyroeis.js");
const { version } = require("../package.json");
const { PyroeisVm } = require("../src/pyroeis-vm.js");

describe("the version constants follow package.json", () => {
    test("PYROEIS_* constants match the package version", () => {
        const [major, minor, release] = version.split(".");
        expect(pyroeis.PYROEIS_VERSION_MAJOR).toBe(major);
        expect(pyroeis.PYROEIS_VERSION_MINOR).toBe(minor);
        expect(pyroeis.PYROEIS_VERSION_RELEASE).toBe(release);
        expect(pyroeis.PYROEIS_VERSION_NUM).toBe(Number(minor));
        expect(pyroeis.PYROEIS_RELEASE).toBe(`Pyroeis ${version}`);
    });

    test("the copyright keeps the Fengari and Lua attributions", () => {
        expect(pyroeis.PYROEIS_COPYRIGHT).toContain("Based on Fengari, Copyright (C) 2017-2019 B. Giannangeli, Daurnimator");
        expect(pyroeis.PYROEIS_COPYRIGHT).toContain("Lua.org, PUC-Rio");
    });

    test("Lua sees them in the pyroeis library, and no fengari library or global remains", () => {
        const vm = new PyroeisVm();
        expect(vm.run("return pyroeis.RELEASE")).toBe(`Pyroeis ${version}`);
        expect(vm.run("return pyroeis.VERSION_NUM")).toBe(Number(version.split(".")[1]));
        expect(vm.run("return fengari")).toBeNull();
        expect(Object.keys(pyroeis).filter(name => /fengari/i.test(name))).toEqual([]);
    });

    test("the sandbox does not open the pyroeis library", () => {
        const vm = new PyroeisVm(undefined, undefined, { sandbox: true });
        expect(vm.run("return pyroeis")).toBeNull();
    });
});
