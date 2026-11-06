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
- Consultation booking: http://127.0.0.1:8766/book.html?lang=ar
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
| Consultation booking (pick a slot, then WhatsApp) | `book.html`, `book.js`, `book.css`; settings in `config.js` → `booking` |
| Enrolment step (details, then «للدفع تواصل معنا على واتساب») | `pay.html`, `pay.js`, `pay.css` |
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

**Go-live steps (hosting with PHP, relays, config): [`docs/GO_LIVE.md`](docs/GO_LIVE.md).** The PHP relays are in `api/`; the n8n address goes in `api/relay-config.php` on the host only (git-ignored).

- `webhookUrl` is empty: the form is a clearly labelled local preview and **sends no application**. A production endpoint must validate submitted fields, apply appropriate abuse controls, and acknowledge success with JSON `{ "ok": true }`. Never put provider secrets in `config.js`. HTTP errors, unacknowledged responses and timeouts must not show success.
- Help band under the programmes («لست متأكدًا أي برنامج يناسبك؟», `index.html`, `[data-help]`): a button that opens a WhatsApp chat with the support team, with a first message in the page language. It uses `config.js` → `supportWhatsapp` (international format without `+`), else `whatsapp`, and the section stays hidden until one of them is a valid number.
- Private training is a request: the programmes panel's button opens the application form (with the month chosen there as `month`).
- Consultation booking (`book.html`) shows generated sample slots and sends nothing until `booking.endpoint` is set (https; on PHP hosting use the relay `api/book.php`, which forwards `GET ?days=N` for the free slots and `POST` JSON `{name,email,phone,slot}` to n8n). After the booking the page shows the held time and a WhatsApp button (number from `config.js`); the team confirms there. Only the consultation (and only while `visibility` allows it) can be booked. GHL holds the booking as «Consultation Booked» (appointment status new); when the team drags the card to «Consultation Confirmed», a GHL workflow confirms the appointment (see `n8n/SETUP-BOOKING.md`).
- Nothing is paid on the site: crypto payment was removed (not allowed for this business). The design and flow stay as built: the course end box («سجّل الآن»), the private-training button (carries the chosen month) and the consultation (after `book.html`) lead to `pay.html`. There the visitor leaves name/email/phone (sent as the same JSON as the application form to `config.js` → `webhookUrl`, so n8n/GHL file it with the same tag, note and stage; preview while it is empty), then sees «للدفع، تواصل معنا على واتساب» with the WhatsApp button (`whatsapp`, `supportWhatsapp` overrides). Consultations skip the form (the booking already sent the details). No wallet, no receipt upload. Indicators stay on the application form (`applicationPrograms`). The old payment pieces are archived outside the repo (`_archive-crypto-payment/`).
- The WhatsApp number is set (+971 54 783 6322). Telegram, Instagram and email are still blank: add only owner-approved channels.
- Public pages retain `noindex, nofollow` during review. Decide when to remove this at launch.
- Private training availability is explicit dated data (`fullyBookedMonth`), not an automatic claim of scarcity. Review it before launch.
- The owner-confirmed hero claim and dated official award metadata have distinct provenance. Verify any updated award status before changing it. This technical review does not verify financial results or marketing claims.
- No payment checkout, student account system or public admin backend is implemented.

Source control and public deployment are separate steps. The reviewed delivery branch is `codex/reviewed-site-handoff-2026-11-06`; opening its pull request does not merge `main` or deploy the website. See [the collaborator prompt](docs/COLLABORATOR_PROMPT.ar.md) for the next developer.
