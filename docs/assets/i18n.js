/* Pyroeis site language: English by default, French when the browser
 * prefers French over English. Static pages carry both versions:
 * elements with data-l="en"/data-l="fr" are toggled by CSS from the
 * <html lang> attribute, while [data-en]/[data-fr] attributes (title,
 * meta description, aria-labels, ...) are swapped by applyLang below.
 * Dynamic scripts use PyroeisI18n.t(en, fr) and PyroeisI18n.onLang.
 */
(function () {
    "use strict";

    var KEY = "pyroeis-lang";
    var listeners = [];

    function base(tag) {
        return String(tag || "").toLowerCase().split(/[-_]/)[0];
    }

    function resolveLang() {
        try {
            var q = new URLSearchParams(location.search).get("lang");
            if (q === "fr" || q === "en") return q;
        } catch (e) { /* ignore */ }
        try {
            var saved = localStorage.getItem(KEY);
            if (saved === "fr" || saved === "en") return saved;
        } catch (e) { /* ignore */ }
        var langs = (navigator.languages && navigator.languages.length)
            ? navigator.languages
            : [navigator.language];
        var fr = -1, en = -1;
        for (var i = 0; i < langs.length; i++) {
            var b = base(langs[i]);
            if (b === "fr" && fr < 0) fr = i;
            else if (b === "en" && en < 0) en = i;
        }
        if (fr >= 0 && (en < 0 || fr < en)) return "fr";
        return "en";
    }

    function currentLang() {
        return document.documentElement.lang === "fr" ? "fr" : "en";
    }

    function applyToAttributes(lang) {
        var nodes = document.querySelectorAll("[data-en]");
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var value = lang === "fr" ? (node.getAttribute("data-fr") || node.getAttribute("data-en"))
                : node.getAttribute("data-en");
            var attr = node.getAttribute("data-attr") || "text";
            if (attr === "text") node.textContent = value;
            else if (attr === "html") node.innerHTML = value;
            else node.setAttribute(attr, value);
        }
    }

    function applySwitcher(lang) {
        var buttons = document.querySelectorAll("[data-set-lang]");
        for (var i = 0; i < buttons.length; i++) {
            var active = buttons[i].getAttribute("data-set-lang") === lang;
            if (active) buttons[i].setAttribute("aria-pressed", "true");
            else buttons[i].removeAttribute("aria-pressed");
        }
    }

    function applyLang(lang, persist) {
        if (lang !== "fr" && lang !== "en") lang = resolveLang();
        if (persist !== false) {
            try { localStorage.setItem(KEY, lang); } catch (e) { /* ignore */ }
        }
        document.documentElement.lang = lang;
        applyToAttributes(lang);
        applySwitcher(lang);
        for (var i = 0; i < listeners.length; i++) {
            try { listeners[i](lang); } catch (e) { /* ignore */ }
        }
    }

    function t(en, fr) {
        return currentLang() === "fr" ? fr : en;
    }

    function onLang(callback) {
        if (typeof callback === "function") listeners.push(callback);
    }

    /* Set <html lang> as early as possible so CSS shows the right
     * language before the body is parsed; full application follows. */
    try {
        document.documentElement.lang = resolveLang();
    } catch (e) { /* ignore */ }

    function init() {
        applyLang(currentLang(), false);
        document.addEventListener("click", function (event) {
            var button = event.target.closest ? event.target.closest("[data-set-lang]") : null;
            if (!button) return;
            event.preventDefault();
            applyLang(button.getAttribute("data-set-lang"));
        });
    }

    window.PyroeisI18n = {
        resolveLang: resolveLang,
        currentLang: currentLang,
        applyLang: applyLang,
        onLang: onLang,
        t: t
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
