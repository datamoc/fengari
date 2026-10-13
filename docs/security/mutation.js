"use strict";

(function() {
    const i18n = window.PyroeisI18n || { t: (en) => en };
    const button = document.getElementById("mutate");
    const status = document.getElementById("mutation-status");
    const SEED = 20260512;
    const COUNT = 1500;

    function runEngine(engine) {
        return new Promise(resolve => {
            const worker = new Worker("mutation-worker.js");
            let timer = setTimeout(() => finish({ kind: "setup-error", message: i18n.t("The engine did not load within 15 seconds.", "Le moteur n’a pas chargé dans les 15 secondes.") }), 15000);
            function finish(result) {
                clearTimeout(timer);
                worker.terminate();
                resolve(result);
            }
            worker.onmessage = ({ data }) => {
                if (data.kind === "ready") {
                    clearTimeout(timer);
                    timer = setTimeout(() => finish({ kind: "setup-error", message: i18n.t("Worker stopped after 30 s.", "Worker arrêté après 30 s.") }), 30000);
                } else finish(data);
            };
            worker.onerror = event => finish({ kind: "setup-error", message: event.message || i18n.t("Worker unavailable; open this page over HTTP(S).", "Worker indisponible\u202f; ouvrez cette page via HTTP(S).") });
            worker.postMessage({ engine, seed: SEED, count: COUNT });
        });
    }

    function show(engine, result) {
        const panel = document.getElementById("mutation-" + engine);
        const out = panel.querySelector("pre");
        const badge = panel.querySelector(".badge");
        const timing = panel.querySelector(".timing");
        if (result.kind !== "done") {
            panel.dataset.outcome = "setup-error";
            badge.textContent = i18n.t("Loading failed", "Chargement échoué");
            out.textContent = result.message;
            timing.textContent = "";
            return;
        }
        const { outcomes, escaped } = result;
        panel.dataset.outcome = outcomes.jsException ? "returned" : "blocked";
        badge.replaceChildren(verdictMark(!outcomes.jsException), outcomes.jsException
            ? i18n.t(`${outcomes.jsException} JavaScript exceptions escaped Lua`, `${outcomes.jsException} exceptions JavaScript sorties de Lua`)
            : i18n.t("Every failure stayed in Lua", "Tous les échecs sont restés dans Lua"));
        const lines = [
            i18n.t(`Chunks tried: ${result.count}`, `Chunks essayés\u202f: ${result.count}`),
            i18n.t(`Refused by load (Lua error): ${outcomes.refused}`, `Refusés par load (erreur Lua)\u202f: ${outcomes.refused}`),
            i18n.t(`Loaded and ran: ${outcomes.ran}`, `Chargés et exécutés\u202f: ${outcomes.ran}`),
            i18n.t(`Loaded, failed in pcall: ${outcomes.luaError}`, `Chargés, échec dans pcall\u202f: ${outcomes.luaError}`),
            i18n.t(`JavaScript exception at the host: ${outcomes.jsException}`, `Exception JavaScript chez l’hôte\u202f: ${outcomes.jsException}`)
        ];
        for (const [message, count] of escaped) lines.push(`  ${count} × ${message}`);
        out.textContent = lines.join("\n");
        timing.textContent = i18n.t("Run: ", "Exécution\u202f: ") + `${result.ms.toFixed(0)} ms`;
    }

    button.addEventListener("click", async () => {
        button.disabled = true;
        status.textContent = i18n.t("Mutating chunks in two workers…", "Mutation des chunks dans deux workers…");
        for (const engine of ["upstream", "pyroeis"]) {
            const panel = document.getElementById("mutation-" + engine);
            delete panel.dataset.outcome;
            panel.querySelector(".badge").textContent = i18n.t("Running…", "Exécution en cours…");
            panel.querySelector("pre").textContent = "";
            panel.querySelector(".timing").textContent = "";
        }
        const [upstream, pyroeis] = await Promise.all([runEngine("upstream"), runEngine("pyroeis")]);
        show("upstream", upstream);
        show("pyroeis", pyroeis);
        status.textContent = i18n.t("Done. The counts come from this browser; the seed is fixed, so the run is repeatable.", "Terminé. Les comptes proviennent de ce navigateur\u202f; la graine est fixe, l’exécution est donc reproductible.");
        button.disabled = false;
    });
})();
