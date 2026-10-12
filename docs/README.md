# Project documentation

Technical documentation is kept in this directory, in Markdown format.

## Migration to Lua 5.5.1

The [Lua 5.5.1 folder](lua-5.5.1/README.md) contains the frozen official
references, the state of the repository, the conformance requirements, the
proposed architecture, the implementation plan and the validation strategy.

The current implementation is not conformant to Lua 5.5.1 as a whole. The
documents separate observations, requirements and decisions still open.

## Lua to JavaScript translation

`lua2js` (`src/lua2js.js`, `PyroeisVm.toJs`) translates Lua source to readable
JavaScript for projects leaving Lua. Usage, the mapping choices and the known
differences are described in the "Offline Lua to JavaScript translation"
section of the [main README](../README.md).

## GitHub Pages

The [JavaScript ↔ Lua exchange guide](https://datamoc.github.io/pyroeis/interop/)
explains why Pyroeis uses data conversion and host-selected functions instead
of `fengari-interop`, with examples, compatibility considerations and the
limits of the model. Its source is [interop/index.html](interop/index.html).

`index.html` is the site entry point. `security/` compares pinned upstream Fengari 0.1.5 with Pyroeis under resource limits; `benchmark/` compares upstream, interpreted Pyroeis, compiled Lua and JavaScript; `lua2js/` translates Lua; `mwg/` runs a Lua-controlled robot using MWG 0.35.1.

Every page is bilingual English/French. Static text uses paired
`<span data-l="en">…</span><span data-l="fr">…</span>` blocks (toggled by
`assets/site.css` from `<html lang>`), while `title`, `meta`, `aria-label`
and `<option>` strings use `data-en`/`data-fr` attributes swapped by
`assets/i18n.js`. Keep both versions in sync when editing copy.
`assets/i18n.js` defaults to English and switches to French only when the
browser lists French before English (`navigator.languages`); visitors can
override with the EN/FR switcher (`?lang=` works too). Dynamic demo strings
live in each page’s scripts (and the `lua2js` workers, which take `lang` in
their first message) via `PyroeisI18n.t(en, fr)`.

Build with `npm run pages:build`, then serve this directory over HTTP. Generated bundles, dependency licenses and the integrity manifest live in `assets/` and are excluded from Git. `.github/workflows/deploy-pages.yml` rebuilds these assets and deploys this directory. Scripts run locally in the browser; the security examples and editable game scripts run in terminable workers.
