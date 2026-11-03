# Muhammad Bassam: scroll website

A static RTL Arabic site with no build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Files
- `index.html`: the page. Each section has a numbered comment (1 · Hero, 2 · Award, …).
- `motion.css`: the layout of the scroll scenes, on top of `style.css`, which holds the base styles shared with the apply page.
- `motion.js`: event-driven scroll effects. Compact screens, short viewports and reduced-motion settings use a readable document flow.
- `app.js`: fills in the text from `config.js`, plus the hero tape, the footprint grid, the nav and the application form.
- `config.js`: **edit this first**. It holds the award name and year, prices, contacts and the form endpoint.
- `apply.html`: the 3-step application form. `apply.html#private`, `#group`, `#consult` and `#indicator` preselect a program.
- `assets/img/`: supplied photos and the archived ranking image. The page links to the official standings.

## Notes
- Brand: near-black `#050607`, one red accent `#d91414`, Cormorant Garamond and Jost for the Latin text, Cairo for the Arabic.
- An empty `webhookUrl`, or a relative endpoint on localhost, enables a labelled form preview with a separate demonstration result.
- A live endpoint must validate the submitted JSON and acknowledge receipt with JSON containing `{"ok":true}`. The browser times out after 15 seconds and keeps entered values if delivery cannot be confirmed.
- Empty prices show «السعر حسب الطلب».
- The October 2026 monthly Forex placing is linked to the official standings and labelled pending final audit as checked on 2026-11-03. Review the source before changing that status.
- The pages carry `noindex`, so search engines skip them while this is a draft.

## Checks

Run the regression tests with Node.js.

```bash
node --test
```

The tests cover form validation, preview and delivery states, keyboard access and the scroll scheduler. Also review the home and application pages in a browser at desktop and mobile sizes before publishing.
