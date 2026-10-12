(function() {
    "use strict";
    const get = id => document.getElementById(id);
    const source = get("dialogue-lua");
    const run = get("dialogue-run");
    const stop = get("dialogue-stop");
    const dialog = get("choice-dialog");
    const status = get("dialogue-status");
    const events = get("dialogue-trace");
    let worker = null;
    let timer = null;
    let waiting = null;

    source.value = `-- Ces variables restent en mémoire pendant les dialogues.
local destination = host.choose("Où envoyer le robot ?", {
  { id = "crater", label = "Explorer le cratère" },
  { id = "base", label = "Retourner à la base" }
})
print("Destination choisie : " .. destination)

local equipment = host.choose("Quel équipement emporter ?", {
  { id = "camera", label = "Une caméra" },
  { id = "drill", label = "Une foreuse" }
})
print("Équipement choisi : " .. equipment)

-- Lua reprend après chaque choix, sans recommencer le script.
return { destination = destination, equipment = equipment,
         message = "Les deux réponses sont revenues dans Lua." }`;

    function event(text) {
        const item = document.createElement("li");
        item.textContent = text;
        events.appendChild(item);
    }
    function cleanup() {
        clearTimeout(timer);
        worker?.terminate();
        worker = waiting = null;
        if (dialog.open) dialog.close();
        run.disabled = source.disabled = false;
        stop.disabled = true;
    }
    function cancel() {
        if (!worker) return;
        event("JavaScript annule l’attente et arrête le worker Lua.");
        status.textContent = "Dialogue annulé. Vous pouvez relancer le script.";
        cleanup();
    }
    function guardExecution() {
        clearTimeout(timer);
        timer = setTimeout(() => {
            status.textContent = "Le watchdog a arrêté une exécution sans réponse après 2 secondes.";
            event(status.textContent);
            cleanup();
        }, 2000);
    }
    function showChoice(request) {
        clearTimeout(timer); // Waiting for a human is not active Lua execution.
        waiting = request;
        status.textContent = "Lua est suspendu : JavaScript attend votre choix.";
        event(`Lua → JavaScript : Yield, question « ${request.question} ». Coroutine suspendue.`);
        get("choice-question").textContent = request.question;
        const buttons = get("choice-options");
        buttons.replaceChildren();
        for (const choice of request.choices) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = choice.label;
            button.addEventListener("click", () => {
                if (!waiting || !worker) return;
                const id = waiting.id;
                waiting = null;
                dialog.close();
                event(`JavaScript → Lua : coroutine.resume(${JSON.stringify(choice.id)}).`);
                status.textContent = "Lua reprend avec votre réponse…";
                guardExecution();
                worker.postMessage({ action: "answer", id, value: choice.id });
            });
            buttons.appendChild(button);
        }
        if (!dialog.open) dialog.showModal();
    }
    function start() {
        if (worker) return;
        events.replaceChildren();
        get("dialogue-result").textContent = "";
        get("dialogue-output").textContent = "";
        if (source.value.length > 32000) { status.textContent = "Le script est limité à 32 000 caractères dans cette démo."; return; }
        run.disabled = source.disabled = true;
        stop.disabled = false;
        status.textContent = "Chargement du worker Lua…";
        try {
            worker = new Worker("dialogue-worker.js");
            const currentWorker = worker;
            timer = setTimeout(() => { status.textContent = "Chargement du worker trop long."; cleanup(); }, 15000);
            worker.onmessage = ({ data }) => {
                if (worker !== currentWorker) return;
                try {
                    if (data.kind === "ready") {
                        event("JavaScript → Lua : création de la coroutine et premier resume().");
                        guardExecution();
                        worker.postMessage({ action: "start", source: source.value });
                    } else if (data.kind === "choice") {
                        get("dialogue-output").textContent = data.output.join("\n");
                        showChoice(data.request);
                    } else if (data.kind === "done") {
                        get("dialogue-output").textContent = data.output.join("\n");
                        get("dialogue-result").textContent = JSON.stringify(data.values, null, 2);
                        event("Lua → JavaScript : done = true, résultats finaux reçus.");
                        status.textContent = "Lua a terminé avec vos réponses. Le même script a repris après chaque dialogue.";
                        cleanup();
                    } else {
                        status.textContent = "Exécution interrompue : " + data.message;
                        event(status.textContent);
                        get("dialogue-output").textContent = (data.output || []).join("\n");
                        cleanup();
                    }
                } catch (error) { status.textContent = error.message; cleanup(); }
            };
            worker.onerror = e => {
                if (worker !== currentWorker) return;
                status.textContent = e.message || "Worker indisponible.";
                cleanup();
            };
        } catch (error) { status.textContent = error.message; cleanup(); }
    }
    run.addEventListener("click", start);
    stop.addEventListener("click", cancel);
    get("choice-cancel").addEventListener("click", cancel);
    dialog.addEventListener("cancel", e => { e.preventDefault(); cancel(); });
})();
