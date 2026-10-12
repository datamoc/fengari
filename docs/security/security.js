"use strict";

const select = document.getElementById("case");
const statusLine = document.getElementById("status");
const runButton = document.getElementById("run");
const allButton = document.getElementById("all");
const stopButton = document.getElementById("stop");
const pending = new Set();
let cancelled = false;
const history = new Map();

for (const sample of SECURITY_CASES) {
    const option = document.createElement("option");
    option.value = sample.id;
    option.textContent = sample.title;
    select.appendChild(option);
}
function showSource() {
    const sample = SECURITY_CASES.find(item => item.id === select.value);
    document.getElementById("description").textContent = sample.description;
    document.getElementById("source").textContent = sample.source;
}
function label(result, engine) {
    if (result.kind === "timeout") return "Worker arrêté après 1,5 s";
    if (result.kind === "cancelled") return "Arrêt demandé";
    if (result.kind === "setup-error") return "Chargement échoué";
    if (result.kind === "returned") return "Retour normal au code hôte";
    if (engine === "pyroeis" && result.name === "LimitError") return "Dépassement bloqué : " + result.limit;
    return "Erreur signalée au code hôte";
}
function display(engine, result) {
    const panel = document.getElementById(engine);
    const blocked = result.kind === "error" && (result.name === "LimitError" || /memory|mémoire/i.test(result.message));
    panel.dataset.outcome = blocked ? "blocked" : result.kind;
    panel.querySelector(".badge").textContent = label(result, engine);
    panel.querySelector("pre").textContent = result.kind === "returned" ? JSON.stringify(result.value) : result.message || "La page a arrêté le worker, pas le moteur Lua.";
    panel.querySelector(".timing").textContent = result.ms === undefined ? "" : `Exécution : ${result.ms.toFixed(1)} ms`;
}
function execute(engine, sample) {
    return new Promise(resolve => {
        const worker = new Worker("worker.js");
        let timer;
        let settled = false;
        const cancel = () => finish({ kind: "cancelled", message: "Worker arrêté par l’utilisateur." });
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
        timer = setTimeout(() => finish({ kind: "setup-error", message: "Le moteur n’a pas chargé dans les 15 secondes." }), 15000);
        worker.onmessage = ({ data }) => {
            if (data.kind === "ready") {
                clearTimeout(timer);
                timer = setTimeout(() => finish({ kind: "timeout", ms: 1500 }), 1500);
            } else finish(data);
        };
        worker.onerror = event => finish({ kind: "setup-error", message: event.message || "Worker indisponible ; ouvrez cette page via HTTP(S)." });
        worker.postMessage({ engine, id: sample.id });
        const panel = document.getElementById(engine);
        delete panel.dataset.outcome;
        panel.querySelector(".badge").textContent = "Exécution en cours…";
        panel.querySelector("pre").textContent = "";
        panel.querySelector(".timing").textContent = "";
    });
}
function updateHistory() {
    const body = document.getElementById("history");
    body.replaceChildren();
    for (const { sample, upstream, pyroeis } of history.values()) {
        const row = document.createElement("tr");
        for (const text of [sample.title, label(upstream, "upstream"), label(pyroeis, "pyroeis")]) {
            const cell = document.createElement("td");
            cell.textContent = text;
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
            statusLine.textContent = "Comparaison : " + sample.title;
            const [upstream, pyroeis] = await Promise.all([execute("upstream", sample), execute("pyroeis", sample)]);
            history.set(sample.id, { sample, upstream, pyroeis });
            updateHistory();
        }
        statusLine.textContent = cancelled ? "Comparaison arrêtée." : "Comparaison terminée. Les résultats ci-dessous proviennent de ce navigateur.";
    } finally {
        runButton.disabled = allButton.disabled = select.disabled = false;
        stopButton.disabled = true;
    }
}
runButton.addEventListener("click", () => compare(SECURITY_CASES.filter(item => item.id === select.value)));
allButton.addEventListener("click", () => compare(SECURITY_CASES));
stopButton.addEventListener("click", () => { cancelled = true; for (const cancel of [...pending]) cancel(); });
select.addEventListener("change", showSource);
showSource();
