# Muhammad Bassam website

A dark Arabic/English education website built with HTML, CSS and browser JavaScript. No framework, package installation or application build step is required. Python 3.10+ runs the local dashboard and static exporter; Node.js 20+ runs the JavaScript tests.

## Run locally

From this repository root:

```sh
python -B serve.py --port 8766
```

- Website: http://127.0.0.1:8766/index.html?lang=ar
- English: http://127.0.0.1:8766/index.html?lang=en
- Course: http://127.0.0.1:8766/course.html?course=champ&lang=ar
- Crypto payment: http://127.0.0.1:8766/pay.html?offer=champ&lang=ar (`champ`, `private` or `consult`)
- Local dashboard: http://127.0.0.1:8766/dashboard.html

`serve.py` listens only on loopback. It is a development server, not a production backend. A plain static server can display the public website but cannot save dashboard changes.

## Current offer

`From Zero to Champ` is the only publicly listed course. Its current price is **$2,490**, with **$4,500** displayed as the original price. It covers Foundations, Liquidity & Order Flow, Options Flow, Trading Psychology & Discipline, and Building a Statistical Edge. The last two are parts of the programme, not free standalone offers. Quant is not included. The course has group support, with no individual-session promise.

Private training, consultations and indicators remain separate visible services. Private training is $7,990 from $10,000, with the configured month marked booked. Consultations are $200 for 90 minutes. Indicators accept expressions of interest for an upcoming release.

Hidden courses and bundles remain in `config.js` so the dashboard can restore them and the course page can use their learning content. Do not delete these records or advertise them unless the owner changes the offer.

## Where to edit

| Concern | Files |
| --- | --- |
| Public pages | `index.html`, `course.html`, `apply.html` |
| Identity, prices, course content, contact details, delivery URL | `config.js` |
| Course cards, service choices, form behaviour | `app.js` |
| Crypto payment page, pay links, proof-of-payment upload | `pay.html`, `pay.js`, `pay.css`; settings in `config.js` → `cryptoPayment` |
| Course modules | `course-curriculum.js`, `course-curriculum.css` |
| Saved visibility | `site-visibility.json`; mirrored into `site-visibility.js` by the dashboard server |
| Visibility filtering | `visibility.js` |
| Arabic source / English display text | Source HTML/JS + `translations.js`; behaviour in `i18n.js` |
| Brand and shared appearance | `brand.*`, `style.css`, `courses.css`, `course-page.css` |
| Hero / end transitions | `motion.js`, `motion.css` |
| Statistical-edge loop | `edge.js`, `edge.css` |
| Market illustrations | `market-section.*`, `market-*-motion.js`, `footprint-visual.js` |
| Local recommendation helper | `learning-guide.*` |
| Local management | `dashboard.*`, `serve.py` |

The market illustrations use synthetic data and have no live market-feed connection. They are visual teaching illustrations, not trading signals.

## Test and export

```sh
node --test
python -B -m unittest discover -s tests -p "test_*.py"
python -B scripts/export_site.py
```

The exporter creates `dist/` with only public files and content-hashed JS/CSS URLs. It excludes the dashboard, local server, tests, documentation and Git metadata. It refuses to overwrite a non-empty output directory; use `--output PATH` for a new destination. It does not deploy anything. Publish the contents of the exported folder, not the repository root.

JavaScript tests exercise logic with a small DOM adapter. Python tests exercise the actual local HTTP handler, persistence and export boundaries. Also verify actual browser behaviour in both languages and at desktop/mobile widths before release. See [the handoff](docs/AI_HANDOFF.md) and [the change report](docs/CHANGE_REPORT.ar.md).

## Before public launch

- `webhookUrl` is empty: the form is a clearly labelled local preview and **sends no application**. A production endpoint must validate submitted fields, apply appropriate abuse controls, and acknowledge success with JSON `{ "ok": true }`. Never put provider secrets in `config.js`. HTTP errors, unacknowledged responses and timeouts must not show success.
- Crypto payment (`pay.html`) is a labelled preview until **both** `cryptoPayment.address` (a TRC20 USDT address) and `cryptoPayment.webhookUrl` are set; until then no wallet is shown and nothing is sent. The page sends the name, email, phone, optional TxID and the receipt image (JPG/PNG/WEBP/PDF, 5 MB) as `multipart/form-data`, and shows success only on JSON `{ "ok": true }`. The endpoint must re-validate the file and fields. The site never confirms a payment: the team verifies each transfer on-chain before confirming enrolment.
- Contact values are blank. Add only owner-approved channels.
- Public pages retain `noindex, nofollow` during review. Decide when to remove this at launch.
- Private training availability is explicit dated data (`fullyBookedMonth`), not an automatic claim of scarcity. Review it before launch.
- The owner-confirmed hero claim and dated official award metadata have distinct provenance. Verify any updated award status before changing it. This technical review does not verify financial results or marketing claims.
- No payment checkout, student account system or public admin backend is implemented.

Source control and public deployment are separate steps. The reviewed delivery branch is `codex/reviewed-site-handoff-2026-11-06`; opening its pull request does not merge `main` or deploy the website. See [the collaborator prompt](docs/COLLABORATOR_PROMPT.ar.md) for the next developer.
