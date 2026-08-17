# HepBet LESS (`hep-static`)

Override stylesheets layered on top of the BetConstruct platform. The selectors
and class names are theirs, not ours, which is why `!important` is everywhere
and why most conventional CSS advice does not apply here.

Two LESS entries produce two CSS files. Everything else is a partial.

## Compile

```bash
npm install     # once
npm run build   # both stylesheets
npm run watch   # rebuild on save
npm run lint    # stylelint
```

`npm run build` is the only way to produce CSS. There are no `main:` comments
anymore — `lessc` follows the `@import` graph, so any partial reaches its entry
automatically no matter how deep it sits.

If you use the Easy LESS extension, **disable it for this workspace**. It
compiles on save from first-line comments that no longer exist, and would write
stale output over the build.

### Checking a refactor did not change the output

```bash
npm run baseline   # snapshot current CSS into .baseline/
# ...edit...
npm run diff       # fails loudly if the output moved
```

`.baseline/` is git-ignored. Use this whenever you restructure sources and
expect the compiled result to stay put.

## Layout

```
hep-static/
├── desktop-custom.css          ← desktop output (committed, deployed)
├── mobile-custom.css           ← mobile output (committed, deployed)
├── package.json                build scripts
├── stylelint.config.js         lint rules
└── styles/
    ├── core/                   Shared, produces no page selectors
    ├── desktop/custom.less     Desktop entry
    └── mobile/custom.less      Mobile entry
```

| Folder | Role |
|--------|------|
| `styles/core/` | Palette, tokens, data lists, typography, fonts, shared mixins |
| `styles/desktop/layout/` | Header, nav, footer, body chrome |
| `styles/desktop/components/` | Site-wide UI (buttons, …) |
| `styles/desktop/pages/` | Page shells scoped by `#root.<class>` |
| `styles/mobile/` | Mobile stylesheet producer |

### `core/` split

| File | Holds | Rule |
|------|-------|------|
| `palette.less` | Raw hex values, RGB triplets | The only place a hex is written. Never referenced from page styles. |
| `tokens.less` | Semantic names + `.theme-vars()` | The vocabulary page styles are written in. |
| `data.less` | CDN roots, record lists | Content, not design. |

## Tokens

Page styles name **meaning**, not colour. A palette change then lands in one
place and every surface that means the same thing moves together.

| Group | Names |
|-------|-------|
| Surfaces | `@surface-sunken` `@surface-header` `@surface-base` `@surface-raised` `@surface-elevated` `@surface-control` |
| Borders | `@border-subtle` `@border-medium` `@border-strong` `@border-soft` |
| Text | `@text-strong` `@text-body` `@text-soft` `@text-muted` `@text-dim` |
| Meaning | `@accent` `@highlight` `@positive` `@negative` `@warning` |
| Scale | `@hb-radius` `@hb-space-*` `@hb-control-sm|md|lg` |

Writing `@shade-6` in a page file is a bug — use `@surface-raised`. If a value
is genuinely used by one page only, give it a page token in that page's
`_tokens.less` rather than inventing a core name nobody else would mean.

Custom properties the platform itself reads are emitted by `.theme-vars()`,
which runs on both `:root` and `body`. Both are needed: custom properties
resolve from the nearest ancestor that declares them, so a platform rule on
`body` would otherwise beat ours on `:root`.

## Nesting

**Hard limit: 5 levels, enforced as a lint error.** This is a ratchet — the
worst file used to sit at 12 and emit 325-character selectors.

Mirror the DOM only where an ancestor actually distinguishes something. Drop
pass-through wrappers (`-scroll`, `-holder`, `.swiper .swiper-wrapper`, …), and
anchor on an id where one exists, since an id is unique per document.

Where the chain genuinely is load-bearing, name it once instead of re-nesting
to rebuild it. `sportsbook/_left-menu.less` is the reference case: that tree
reuses `.sp-sub-list-bc` at both the sport and the league level, so the chain is
what tells them apart.

```less
@sport-item: ~".pp-sport-list-holder-bc .left-menu-scroll > .sp-sub-list-bc";
@league-item: ~"@{sport-item} .sp-s-l-b-content-bc > .sp-sub-list-bc";

@{sport-item} { … }
@{league-item} { … }
```

## Rules

1. **`core/` does not produce page CSS.** Only `@font-face` and the theme vars
   are exceptions.
2. **Each platform has its own entry** (`desktop/custom.less`,
   `mobile/custom.less`).
3. **Orchestrator files are `index.less`.** Partials that depend on being
   imported inside a parent selector take a `_` prefix (e.g. `_left-menu.less`).
4. **File names are kebab-case.**
5. **A mixin lives next to its module** by default; promote to `core/` only when
   mobile also needs it.

## Add a desktop page

1. Create `styles/desktop/pages/<root-class>/index.less` wrapping
   `#root.<root-class>`.
2. Import it from `styles/desktop/pages/index.less`.
3. Put row maps under `rows/` when the page has ordered lobby rows.

### Page scopes

| Page | Scope |
|------|-------|
| `home/` | `#root.is-home-page` |
| `casino-slots/` | `#root.casino-slots` and `#root.live-casino-games` (chips + filters; rows are slots-only) |
| `tournament/` | `#root.tournament` |
| `sportsbook/` | `#root.sportsbook` + `.prematch` / `.live` |

Both sports pages carry `sportsbook` plus a variant class, so shared surfaces
are written once under `#root.sportsbook` and `prematch.less` / `live.less` hold
only the differences.

## Add mobile styles

1. Mirror desktop folders under `styles/mobile/` as needed.
2. Import from `styles/mobile/custom.less`.
3. Reuse `../core/*` — do not duplicate tokens.

## Data lists

Icons and labels that map to DOM order live as record lists in
`styles/core/data.less` (`@hb-buttons`, `@hb-nav-items`, `@hb-casino-cats`,
`@hb-mobile-user-buttons`). Row title icons use `@hb-*-row-icons` next to each
page's `rows/index.less`. Never hand-write a CDN URL — compose it from
`@hb-cdn`.

## Git and Cloudflare

Two different jobs, two different files. Do not conflate them.

| File | Controls | Contents |
|------|----------|----------|
| `.gitignore` | What git tracks | Ignores `node_modules/`, `.baseline/`. **Everything else is tracked, including `styles/`.** |
| `.assetsignore` | What Cloudflare serves | Allowlist: the two CSS files, `images/`, `webfonts/`, `_headers`. |

So the full source lives in git as the backup, while Cloudflare only ever
receives compiled CSS and assets.

Cloudflare does **not** build anything. It deploys the `desktop-custom.css` and
`mobile-custom.css` already committed to the repo, which is why the build time
stays flat. Because a `package.json` now exists at the root, Cloudflare would
otherwise start running `npm install` on every deploy — set
`SKIP_DEPENDENCY_INSTALL = 1` in the dashboard under Build variables to prevent
that.

**Commit the compiled CSS with the source change that produced it.** A source
edit that is not rebuilt and committed does not reach production.

Served as `/styles/betco/v1/hepbet/desktop/custom.css`.
