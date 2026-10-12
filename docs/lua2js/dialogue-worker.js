"use strict";

importScripts("../benchmark/pyroeis.bundle.js");
let vm = null;
let coroutine = null;
let pending = null;
let count = 0;
self.postMessage({ kind: "ready" });

const STR = {
    en: {
        suspend: "Suspend this script with host.choose(question, choices).",
        question: "The question must be 1 to 200 characters.",
        choices: "Provide a list of 1 to 6 choices.",
        choiceShape: "Each choice needs a unique id and a short string label.",
        maxDialogues: "This demo allows at most 10 dialogues per run.",
        unexpected: "Unexpected answer or invalid choice.",
        unknown: "Unknown command."
    },
    fr: {
        suspend: "Suspendez ce script avec host.choose(question, choices).",
        question: "La question doit contenir entre 1 et 200 caractères.",
        choices: "Fournissez une liste de 1 à 6 choix.",
        choiceShape: "Chaque choix doit avoir un id unique et un label courts, de type chaîne.",
        maxDialogues: "Cette démonstration autorise au maximum 10 dialogues par exécution.",
        unexpected: "Réponse inattendue ou choix invalide.",
        unknown: "Commande inconnue."
    }
};
let S = STR.en;

function dispose() {
    if (vm) Pyroeis.lua.lua_close(vm.state);
    vm = coroutine = pending = null;
}
function advance(...args) {
    const step = coroutine.resume(...args);
    if (step.done) {
        // This demo's final result is data, not a transferable Lua handle.
        self.postMessage({ kind: "done", values: step.values, output: vm.output });
        dispose();
    } else {
        if (!pending || step.values.length !== 1 || step.values[0]?.kind !== "choice") {
            throw new Error(S.suspend);
        }
        self.postMessage({ kind: "choice", request: pending, output: vm.output });
    }
}
self.onmessage = ({ data }) => {
    try {
        if (data.action === "start") {
            dispose();
            count = 0;
            S = STR[data.lang] === undefined ? STR.en : STR[data.lang];
            vm = new Pyroeis.PyroeisVm(undefined, 42, {
                sandbox: true,
                limits: { instructions: 50000, timeMs: 100, allocation: 256 * 1024, totalAllocation: 1024 * 1024 }
            });
            vm.defineFunction("host.choose", (question, choices) => {
                if (typeof question !== "string" || question.length < 1 || question.length > 200) {
                    throw new Error(S.question);
                }
                if (!Array.isArray(choices) || choices.length < 1 || choices.length > 6) {
                    throw new Error(S.choices);
                }
                const ids = new Set();
                const options = choices.map(choice => {
                    if (!choice || typeof choice.id !== "string" || choice.id.length < 1 || choice.id.length > 80 ||
                        typeof choice.label !== "string" || choice.label.length < 1 || choice.label.length > 100 || ids.has(choice.id)) {
                        throw new Error(S.choiceShape);
                    }
                    ids.add(choice.id);
                    return { id: choice.id, label: choice.label };
                });
                if (++count > 10) throw new Error(S.maxDialogues);
                pending = { kind: "choice", id: count, question, choices: options };
                return new Pyroeis.Yield([pending]);
            });
            coroutine = vm.coroutineFromSource(data.source, "=user-dialogue");
            advance();
        } else if (data.action === "answer") {
            if (!pending || data.id !== pending.id || !pending.choices.some(choice => choice.id === data.value)) {
                throw new Error(S.unexpected);
            }
            pending = null;
            advance(data.value);
        } else throw new Error(S.unknown);
    } catch (error) {
        self.postMessage({ kind: "error", message: error.message, output: vm?.output || [] });
        dispose();
    }
};
