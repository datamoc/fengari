"use strict";

const select = document.getElementById("case");
const statusLine = document.getElementById("status");
const runButton = document.getElementById("run");
const allButton = document.getElementById("all");
const stopButton = document.getElementById("stop");
const pending = new Set();
let cancelled = false;
const history = new Map();
const i18n = window.PyroeisI18n || { t: (en) => en, onLang: () => {}, currentLang: () => "en" };

function text(value) {
    if (value && typeof value === "object") return i18n.t(value.en, value.fr);
    return value;
}
for (const sample of SECURITY_CASES) {
    const option = document.createElement("option");
    option.value = sample.id;
    option.textContent = text(sample.title);
    select.appendChild(option);
}
function showSource() {
    const sample = SECURITY_CASES.find(item => item.id === select.value);
    document.getElementById("description").textContent = text(sample.description);
    document.getElementById("source").textContent = sample.source;
}
function label(result, engine) {
    if (result.kind === "timeout") return i18n.t("Worker stopped after 1.5 s", "Worker arrêté après 1,5 s");
    if (result.kind === "cancelled") return i18n.t("Requested stop", "Arrêt demandé");
    if (result.kind === "setup-error") return i18n.t("Loading failed", "Chargement échoué");
    if (result.kind === "returned") return i18n.t("Normal return to the host code", "Retour normal au code hôte");
    if (engine === "pyroeis" && result.name === "LimitError") return i18n.t("Overrun blocked: ", "Dépassement bloqué : ") + result.limit;
    return i18n.t("Error reported to the host code", "Erreur signalée au code hôte");
}
function display(engine, result) {
    const panel = document.getElementById(engine);
    const blocked = result.kind === "error" && (result.name === "LimitError" || /memory|mémoire/i.test(result.message));
    panel.dataset.outcome = blocked ? "blocked" : result.kind;
    panel.querySelector(".badge").textContent = label(result, engine);
    panel.querySelector("pre").textContent = result.kind === "returned" ? JSON.stringify(result.value) : result.message || i18n.t("The page stopped the worker, not the Lua engine.", "La page a arrêté le worker, pas le moteur Lua.");
    panel.querySelector(".timing").textContent = result.ms === undefined ? "" : i18n.t("Run: ", "Exécution : ") + `${result.ms.toFixed(1)} ms`;
}
function execute(engine, sample) {
    return new Promise(resolve => {
        const worker = new Worker("worker.js");
        let timer;
        let settled = false;
        const cancel = () => finish({ kind: "cancelled", message: i18n.t("Worker stopped by the user.", "Worker arrêté par l’utilisateur.") });
        function finish(result) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            worker.terminate();
            pending.delete(cancel);
            display(engine, result);
            resolve(result);
        }
        pending.add(cancel);
        timer = setTimeout(() => finish({ kind: "setup-error", message: i18n.t("The engine did not load within 15 seconds.", "Le moteur n’a pas chargé dans les 15 secondes.") }), 15000);
        worker.onmessage = ({ data }) => {
            if (data.kind === "ready") {
                clearTimeout(timer);
                timer = setTimeout(() => finish({ kind: "timeout", ms: 1500 }), 1500);
            } else finish(data);
        };
        worker.onerror = event => finish({ kind: "setup-error", message: event.message || i18n.t("Worker unavailable; open this page over HTTP(S).", "Worker indisponible ; ouvrez cette page via HTTP(S).") });
        worker.postMessage({ engine, id: sample.id });
        const panel = document.getElementById(engine);
        delete panel.dataset.outcome;
        panel.querySelector(".badge").textContent = i18n.t("Running…", "Exécution en cours…");
        panel.querySelector("pre").textContent = "";
        panel.querySelector(".timing").textContent = "";
    });
}
function updateHistory() {
    const body = document.getElementById("history");
    body.replaceChildren();
    for (const { sample, upstream, pyroeis } of history.values()) {
        const row = document.createElement("tr");
        for (const item of [text(sample.title), label(upstream, "upstream"), label(pyroeis, "pyroeis")]) {
            const cell = document.createElement("td");
            cell.textContent = item;
            row.appendChild(cell);
        }
        body.appendChild(row);
    }
}
async function compare(samples) {
    cancelled = false;
    runButton.disabled = allButton.disabled = select.disabled = true;
    stopButton.disabled = false;
    try {
        for (const sample of samples) {
            if (cancelled) break;
            select.value = sample.id;
            showSource();
            statusLine.textContent = i18n.t("Comparing: ", "Comparaison : ") + text(sample.title);
            const [upstream, pyroeis] = await Promise.all([execute("upstream", sample), execute("pyroeis", sample)]);
            history.set(sample.id, { sample, upstream, pyroeis });
            updateHistory();
        }
        statusLine.textContent = cancelled ? i18n.t("Comparison stopped.", "Comparaison arrêtée.") : i18n.t("Comparison done. The results below come from this browser.", "Comparaison terminée. Les résultats ci-dessous proviennent de ce navigateur.");
    } finally {
        runButton.disabled = allButton.disabled = select.disabled = false;
        stopButton.disabled = true;
    }
}
/* Re-render dynamic strings when the visitor switches language. */
i18n.onLang(() => {
    const current = select.value;
    for (const option of select.options) {
        const sample = SECURITY_CASES.find(item => item.id === option.value);
        if (sample) option.textContent = text(sample.title);
    }
    select.value = current;
    showSource();
    updateHistory();
});
runButton.addEventListener("click", () => compare(SECURITY_CASES.filter(item => item.id === select.value)));
allButton.addEventListener("click", () => compare(SECURITY_CASES));
stopButton.addEventListener("click", () => { cancelled = true; for (const cancel of [...pending]) cancel(); });
select.addEventListener("change", showSource);
showSource();
