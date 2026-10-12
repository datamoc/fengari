(function() {
    "use strict";
    const I = window.PyroeisI18n || { t: (en) => en, onLang: () => {}, currentLang: () => "en" };
    const T = (en, fr) => I.t(en, fr);
    const get = id => document.getElementById(id);
    const input = get("exchange-data");
    const source = get("exchange-lua");
    const select = get("exchange-example");
    const run = get("exchange-run");
    const stop = get("exchange-stop");
    const status = get("exchange-status");
    const examples = {
        data: {
            data: { name: "Mars", prices: [8, 3, 5], bonus: 2 },
            source: {
                en: `function exchange(data)
  local total = 0
  for i, price in ipairs(data.prices) do
    total = total + price
  end
  data.name = "modified in Lua"
  return {
    total = total,
    first = data.prices[1], -- Lua indices start at 1
    received = data
  }
end`,
                fr: `function exchange(data)
  local total = 0
  for i, price in ipairs(data.prices) do
    total = total + price
  end
  data.name = "modifié dans Lua"
  return {
    total = total,
    first = data.prices[1], -- indices Lua à partir de 1
    received = data
  }
end`
            }
        },
        callback: {
            data: { prices: [8, 3, 5], factor: 2 },
            source: {
                en: `function exchange(data)
  local scaled = {}
  for i, price in ipairs(data.prices) do
    -- Lua calls a host JavaScript function.
    -- Its result comes straight back into Lua.
    scaled[i] = host.scale(price, data.factor)
  end
  return scaled
end`,
                fr: `function exchange(data)
  local scaled = {}
  for i, price in ipairs(data.prices) do
    -- Lua appelle une fonction JavaScript de l’hôte.
    -- Son résultat revient immédiatement dans Lua.
    scaled[i] = host.scale(price, data.factor)
  end
  return scaled
end`
            }
        },
        multiple: {
            data: { name: "Mars", prices: [8, 3, 5] },
            source: {
                en: `function exchange(data)
  return data.name, #data.prices, data.prices
end`,
                fr: `function exchange(data)
  return data.name, #data.prices, data.prices
end`
            }
        },
        reference: {
            data: { bonus: 5 },
            source: {
                en: `function exchange(data)
  -- The closure captures the Lua table.
  -- JavaScript receives a LuaRef and calls it with 7.
  return function(n)
    return n + data.bonus
  end
end`,
                fr: `function exchange(data)
  -- La fermeture capture la table Lua.
  -- JavaScript reçoit un LuaRef et l’appelle avec 7.
  return function(n)
    return n + data.bonus
  end
end`
            }
        }
    };
    let cancel = null;
    function lang() {
        return I.currentLang();
    }
    function hostCode() {
        let code = `const vm = new PyroeisVm(undefined, 42, {
  sandbox: true,
  limits: { instructions: 50000, timeMs: 100,
            allocation: 262144, totalAllocation: 1048576 }
});
${T("// Callback available in every example:", "// Callback disponible dans chaque exemple :")}
vm.defineFunction('host.scale', (value, factor) => {
  if (!Number.isFinite(value) || !Number.isFinite(factor)) {
    throw new Error('Expected two finite numbers');
  }
  const result = value * factor;
  if (!Number.isFinite(result)) throw new Error('Non-finite result');
  return result;
});
const data = JSON.parse(${JSON.stringify(input.value)});
vm.run(luaSource);
const values = vm.callMulti('exchange', data);
${T("// values holds ALL returns; vm.call keeps only the first.", "// values contient TOUS les retours ; vm.call ne garde que le premier.")}
`;
        if (select.value === "reference") code += `const ref = values[0]; ${T("// LuaRef of type 'function'", "// LuaRef de type 'function'")}
const result = ref.call(7);
ref.release();
`;
        code += T("// data stays the original JavaScript object, not the Lua table.\n", "// data reste l’objet JavaScript original, pas la table Lua.\n");
        get("exchange-host-code").textContent = code;
    }
    function setBusy(value) {
        run.disabled = select.disabled = input.disabled = source.disabled = value;
        stop.disabled = !value;
    }
    function showTrace(entries) {
        const list = get("exchange-trace");
        list.replaceChildren();
        for (const entry of entries) {
            const item = document.createElement("li");
            const title = document.createElement("strong");
            title.textContent = `${entry.direction}${T(": ", " : ")}${entry.operation}`;
            const value = document.createElement("pre");
            value.textContent = JSON.stringify(entry.arguments ?? entry.value, null, 2);
            item.append(title, value);
            list.appendChild(item);
        }
    }
    async function execute() {
        let payload;
        get("exchange-result").textContent = "";
        get("exchange-original").textContent = "";
        showTrace([]);
        try {
            if (input.value.length > 16000 || source.value.length > 32000) throw new Error(T("This demo accepts 16,000 characters of data and 32,000 of Lua.", "Cette démo accepte 16 000 caractères de données et 32 000 de Lua."));
            payload = JSON.parse(input.value);
        } catch (error) { status.textContent = T("Input rejected: ", "Entrée refusée : ") + error.message; return; }
        hostCode();
        setBusy(true);
        status.textContent = T("Exchanging in a worker…", "Échange en cours dans un worker…");
        try {
            const result = await new Promise(resolve => {
                const worker = new Worker("exchange-worker.js");
                let settled = false;
                let timer;
                function finish(result) {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    worker.terminate();
                    cancel = null;
                    resolve(result);
                }
                cancel = () => finish({ kind: "error", message: T("Worker stopped at your request.", "Worker arrêté à votre demande.") });
                timer = setTimeout(() => finish({ kind: "error", message: T("Engine loading took too long.", "Chargement du moteur trop long.") }), 15000);
                worker.onmessage = ({ data }) => {
                    if (data.kind === "ready") {
                        clearTimeout(timer);
                        timer = setTimeout(() => finish({ kind: "error", message: T("The watchdog stopped the worker after 2 seconds.", "Le watchdog a arrêté le worker après 2 secondes.") }), 2000);
                        worker.postMessage({ source: source.value, payload, mode: select.value, lang: lang() });
                    } else finish(data);
                };
                worker.onerror = event => finish({ kind: "error", message: event.message || T("Worker unavailable; open the page over HTTP(S).", "Worker indisponible ; ouvrez la page via HTTP(S).") });
            });
            showTrace(result.trace || []);
            get("exchange-original").textContent = JSON.stringify(result.inputAfter === undefined ? payload : result.inputAfter, null, 2);
            if (result.kind === "error") {
                status.textContent = T("Exchange interrupted: ", "Échange interrompu : ") + result.message;
                get("exchange-result").textContent = result.message;
            } else {
                get("exchange-result").textContent = JSON.stringify(result.returned, null, 2);
                const unchanged = JSON.stringify(payload) === JSON.stringify(result.inputAfter);
                status.textContent = T(`${result.returned.length} Lua return(s) received in JavaScript. JavaScript data ${unchanged ? "unchanged" : "modified"}.`,
                    `${result.returned.length} retour(s) Lua reçu(s) en JavaScript. Données JavaScript ${unchanged ? "inchangées" : "modifiées"}.`);
            }
        } catch (error) {
            status.textContent = T("Exchange interrupted: ", "Échange interrompu : ") + error.message;
        } finally { setBusy(false); }
    }
    function load(refreshSource) {
        const example = examples[select.value];
        input.value = JSON.stringify(example.data, null, 2);
        if (refreshSource !== false) source.value = T(example.source.en, example.source.fr);
        hostCode();
        execute();
    }
    select.addEventListener("change", () => load(true));
    run.addEventListener("click", execute);
    stop.addEventListener("click", () => cancel?.());
    input.addEventListener("input", hostCode);
    I.onLang(() => {
        /* Keep user edits; only refresh the example when untouched. */
        const example = examples[select.value];
        if (source.value === example.source.en || source.value === example.source.fr) {
            source.value = T(example.source.en, example.source.fr);
        }
        hostCode();
    });
    load(true);
})();
