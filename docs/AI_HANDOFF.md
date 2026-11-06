# AI handoff: Muhammad Bassam website

Prepared 2026-11-06. Read this with `AGENTS.md`, `README.md`, and `docs/CHANGE_REPORT.ar.md` before changing behaviour. Preserve the approved dark design, Arabic/English presentation, images, layout and motion unless the owner requests a design change.

## Repository state and comparison

The prior GitHub `main` baseline is **`11084ef5909769881a771dc251ce19fba9e9b92c`**. The coordinating agent verified that remote reference with `git ls-remote` on 2026-11-06. At the pre-publish audit, the local branch was `codex/restore-first-version`, with committed HEAD `f41f49267729148e59dcf42c3328c7f4d049ebb5`; the final implementation and cleanup also include modified and untracked files. That HEAD alone is not the complete handoff.

Recheck `git status --short`, `git log`, and the diff against the full baseline SHA before committing. Inspect untracked files separately: ordinary `git diff` does not include them. Local edits, commits, remote pushes and deployment are separate statuses. The delivery branch is `codex/reviewed-site-handoff-2026-11-06`. It includes the reviewed site and these documents; the commit above is historical context, not its final tip. Check the live PR state before choosing a base for further work. No merge or public deployment is implied. Use `docs/COLLABORATOR_PROMPT.ar.md` to onboard another developer.

## Current product contract

The only publicly listed course is **From Zero to Champ**: $2,490, with $4,500 shown as the original price. Its five learning areas are foundations, liquidity/order flow, options flow, trading psychology/discipline, and statistical edge. Psychology and statistical edge are included curriculum, not a free standalone-course promotion. Quant is not included. Support is group support; do not invent an individual-session promise or an unspecified support duration.

Private training ($7,990 from $10,000), consultations ($200 / 90 minutes), and upcoming indicator tools remain separate visible services. All six site sections and all four service choices are currently enabled. Other catalogue records remain deliberately hidden and must be retained for the dashboard, recommendations and curriculum. Presentation visibility is not access control: client-side configuration remains downloadable.

## Runtime and loading

This is a static HTML/CSS/JavaScript site, with no framework or build dependency. Python 3.10+ supports local management/export; Node.js 20+ supports tests. Google Fonts is an external presentation dependency.

- `index.html`: hero, statistical-edge loop, three market illustrations, catalogue/services, guide, FAQ and contact area.
- `course.html?course=champ&lang=ar`: separate course page and curriculum. Hidden or unknown course IDs produce an unavailable view; do not restore inline home-page course details.
- `apply.html`: three-step application. Hashes select `group`, `private`, `consult` or `indicator`; query parameters can carry `course`, `month`, `tool`, and `lang`.
- `dashboard.html`: local visibility editor, not a production management service.

Public pages load `config.js` -> `site-visibility.js` -> `visibility.js` -> `app.js` -> `translations.js` -> `i18n.js` -> `brand.js`. The course page inserts `course-curriculum.js` before `app.js`. The home page inserts guide/motion modules before the final brand script. Its market dependencies must precede `market-section.js`: `market-surface-motion.js`, `market-strike-motion.js`, `footprint-visual.js`, then `market-footprint-motion.js`.

`app.js` handles shared configuration, cards, service choices and forms. `motion.*` handles hero/end transitions; `edge.*` the process loop; `market-section.*` the three illustration panels. Market values are synthetic educational illustrations, with no live feed connection. `learning-guide.js` uses local deterministic recommendations and can substitute a visible bundle only when it covers the required content.

## Crypto payment

`pay.html?offer=champ|private|consult` shows the USDT (TRC20) amount and wallet, then a proof-of-payment form (name, email, phone, optional TxID, receipt upload, confirmation). Amounts come from the existing prices: the `champ` course price and `prices.private` / `prices.consult`. An offer is payable only when it is listed in `cryptoPayment.offers`, visible, open and has a fixed price. `pay.js` also sets the "pay with crypto" links (`data-pay-link`) on the home, course and application pages and hides them for offers that cannot be paid.

The wallet is shown only when both the address and the proof endpoint are configured, so nobody can pay without being able to send the proof. Success requires a JSON `{ "ok": true }` acknowledgement; the page never says the payment is confirmed. The endpoint (an n8n webhook to GoHighLevel, kept outside this repository) must store the receipt and re-validate every field.

## Editing content and visibility

Edit identity, prices, course records, dated availability, contacts and the submission URL in `config.js`. Some marketing and interface copy lives directly in HTML/JS. Add the matching English entry in `translations.js` whenever Arabic source text changes, including dynamic states and accessibility labels. `i18n.js` performs exact-source translation, observes inserted content, maintains RTL/LTR, and preserves language through `?lang=` and the optional `bassam-language` local-storage preference. Check both directions and switch languages after interacting with controls.

Run `python -B serve.py --port 8766`; open `http://127.0.0.1:8766/dashboard.html`. `site-visibility.json` is authoritative. Server startup and dashboard saves regenerate `site-visibility.js`, which static pages consume. Keep both files together in source control. Saving changes requires this server; refresh public pages to apply them. A plain static host cannot persist dashboard edits.

The server binds to loopback. `/api/visibility` accepts GET/HEAD and a complete PUT schema with version 1 and known boolean section/program/course keys. PUT requires JSON and `X-Site-Admin: 1`, checks Host and any supplied Origin, and limits the body to 16 KiB. Persistence stages both files and attempts rollback on replacement failure. These local boundaries are not a substitute for production authentication. New course IDs require coordinated config, visibility defaults, server schema, assets, translations and tests.

## Form delivery contract

`webhookUrl` is currently empty: the labelled preview sends nothing and never registers an application. An empty URL, or a relative URL on localhost, uses preview mode. A production endpoint must be a permitted HTTP(S) URL; no provider credentials belong in this public configuration.

Live delivery is a JSON POST. The payload includes `source`, `program`, normalized contact fields, `country`, `level`, `market`, relevant goal/topic/slot/TradingView fields, `page`, and `submitted_at`. Conditional fields are `course`, `preferred_month`, `indicator_interest`, and `enrollment_intent` (`enroll` or `waitlist`). Consent is checked by the browser but is not currently included in the payload; implement any required server-side consent record deliberately.

The server must validate all input and availability independently and acknowledge success with a successful HTTP response containing JSON `{ "ok": true }`. Configure CORS if cross-origin. The browser aborts after 15 seconds, handles HTTP 429 separately, and preserves entered values on unconfirmed delivery. Do not treat a plain 200 response, redirect, or arbitrary JSON as success. Client checks and the honeypot do not replace backend abuse controls.

## Verification and release artifacts

Run from the repository root:

```sh
node --test
python -B -m unittest discover -s tests -p "test_*.py"
python -B scripts/export_site.py
```

Node tests exercise form, language, course, guide, visibility and motion logic with a small DOM adapter. Python tests exercise local HTTP/persistence and export boundaries. These commands are instructions, not a claim that a future working tree passes. Also verify actual browsers at desktop/mobile sizes in Arabic/English, reduced motion, keyboard navigation, hidden/unknown course routes, and form preview/error/success states. Record the exact tested revision and outcome in the change report.

`scripts/export_site.py` uses the explicit `PUBLIC_FILES` allowlist plus approved asset extensions beneath `assets/`. It creates `dist/`, rewrites local JS/CSS references to content-hash query URLs, and rejects unsafe source/output relationships, symlinks in selected files and non-empty output directories. Use `--output PATH` for a fresh destination. When adding a public module, update the allowlist and verify export tests. Keep unrelated images out of `assets/`: approved extensions are copied even if unused.

The source repository includes tests, documentation, dashboard, server, exporter, authoritative JSON and browser mirror. The public artifact includes the three public pages, their modules and assets, but excludes dashboard files, server, tests, docs, Git metadata and authoritative JSON. Publish the **exported folder contents**, not the source root. Export does not publish, enable delivery, or remove `noindex`. Never bundle sibling projects, account screenshots, local backups or a worktree `.git` pointer.

## Concrete launch prerequisites

1. Implement and verify real application delivery; contacts are also still blank.
2. Review the dated private availability (`fullyBookedMonth` currently November 2026) and confirm prices, enrolment terms and support duration.
3. Review `noindex, nofollow` deliberately when public launch is approved.
4. Preserve the distinction between owner-confirmed hero claims and dated award metadata. The configuration records an October result checked on 2026-11-03 and still pending final audit; this technical handoff does not independently verify the claims.
5. Payment checkout, student accounts and public administration are not implemented. Do not present them as available.
6. Review/test the exported artifact and obtain the required authorization for the actual push/deployment action.
