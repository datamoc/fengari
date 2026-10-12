(function() {
    "use strict";
    const I = window.PyroeisI18n || { t: (en) => en, onLang: () => {}, currentLang: () => "en" };
    const T = (en, fr) => I.t(en, fr);
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

    const DEFAULT_SOURCE = {
        en: `-- These variables persist across dialogues.
local destination = host.choose("Where should the robot go?", {
  { id = "crater", label = "Explore the crater" },
  { id = "base", label = "Return to base" }
})
print("Chosen destination: " .. destination)

local equipment = host.choose("Which equipment to take?", {
  { id = "camera", label = "A camera" },
  { id = "drill", label = "A drill" }
})
print("Chosen equipment: " .. equipment)

-- Lua resumes after each choice, without restarting the script.
return { destination = destination, equipment = equipment,
         message = "Both answers are back in Lua." }`,
        fr: `-- Ces variables restent en mémoire pendant les dialogues.
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
         message = "Les deux réponses sont revenues dans Lua." }`
    };

    source.value = T(DEFAULT_SOURCE.en, DEFAULT_SOURCE.fr);

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
        event(T("JavaScript cancels the wait and stops the Lua worker.", "JavaScript annule l’attente et arrête le worker Lua."));
        status.textContent = T("Dialogue cancelled. You can restart the script.", "Dialogue annulé. Vous pouvez relancer le script.");
        cleanup();
    }
    function guardExecution() {
        clearTimeout(timer);
        timer = setTimeout(() => {
            status.textContent = T("The watchdog stopped an unanswered run after 2 seconds.", "Le watchdog a arrêté une exécution sans réponse après 2 secondes.");
            event(status.textContent);
            cleanup();
        }, 2000);
    }
    function showChoice(request) {
        clearTimeout(timer); // Waiting for a human is not active Lua execution.
        waiting = request;
        status.textContent = T("Lua is suspended: JavaScript is waiting for your choice.", "Lua est suspendu\u202f: JavaScript attend votre choix.");
        event(T(`Lua → JavaScript: Yield, question "${request.question}". Coroutine suspended.`, `Lua → JavaScript\u202f: Yield, question «\u202f${request.question}\u202f». Coroutine suspendue.`));
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
                event(T(`JavaScript → Lua: coroutine.resume(${JSON.stringify(choice.id)}).`, `JavaScript → Lua\u202f: coroutine.resume(${JSON.stringify(choice.id)}).`));
                status.textContent = T("Lua is resuming with your answer…", "Lua reprend avec votre réponse…");
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
        if (source.value.length > 32000) { status.textContent = T("Scripts are limited to 32,000 characters in this demo.", "Le script est limité à 32 000 caractères dans cette démo."); return; }
        run.disabled = source.disabled = true;
        stop.disabled = false;
        status.textContent = T("Loading the Lua worker…", "Chargement du worker Lua…");
        try {
            worker = new Worker("dialogue-worker.js");
            const currentWorker = worker;
            const lang = I.currentLang();
            timer = setTimeout(() => { status.textContent = T("Worker loading took too long.", "Chargement du worker trop long."); cleanup(); }, 15000);
            worker.onmessage = ({ data }) => {
                if (worker !== currentWorker) return;
                try {
                    if (data.kind === "ready") {
                        event(T("JavaScript → Lua: coroutine creation and first resume().", "JavaScript → Lua\u202f: création de la coroutine et premier resume()."));
                        guardExecution();
                        worker.postMessage({ action: "start", source: source.value, lang });
                    } else if (data.kind === "choice") {
                        get("dialogue-output").textContent = data.output.join("\n");
                        showChoice(data.request);
                    } else if (data.kind === "done") {
                        get("dialogue-output").textContent = data.output.join("\n");
                        get("dialogue-result").textContent = JSON.stringify(data.values, null, 2);
                        event(T("Lua → JavaScript: done = true, final results received.", "Lua → JavaScript\u202f: done = true, résultats finaux reçus."));
                        status.textContent = T("Lua finished with your answers. The same script resumed after each dialogue.", "Lua a terminé avec vos réponses. Le même script a repris après chaque dialogue.");
                        cleanup();
                    } else {
                        status.textContent = T("Run interrupted: ", "Exécution interrompue\u202f: ") + data.message;
                        event(status.textContent);
                        get("dialogue-output").textContent = (data.output || []).join("\n");
                        cleanup();
                    }
                } catch (error) { status.textContent = error.message; cleanup(); }
            };
            worker.onerror = e => {
                if (worker !== currentWorker) return;
                status.textContent = e.message || T("Worker unavailable.", "Worker indisponible.");
                cleanup();
            };
        } catch (error) { status.textContent = error.message; cleanup(); }
    }
    I.onLang(() => {
        if (!worker && (source.value === DEFAULT_SOURCE.en || source.value === DEFAULT_SOURCE.fr)) {
            source.value = T(DEFAULT_SOURCE.en, DEFAULT_SOURCE.fr);
        }
    });
    run.addEventListener("click", start);
    stop.addEventListener("click", cancel);
    get("choice-cancel").addEventListener("click", cancel);
    dialog.addEventListener("cancel", e => { e.preventDefault(); cancel(); });
})();
