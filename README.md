# Muhammad Bassam: scroll website

A static RTL Arabic site with no build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Files
- `index.html`: the page. Each section has a numbered comment (1 · Hero, 2 · Award, …).
- `motion.css`: the layout of the scroll scenes, on top of `style.css`, which holds the base styles shared with the apply page.
- `motion.js`: the scroll effects. Each scene reads a 0→1 progress from the scroll position.
- `app.js`: fills in the text from `config.js`, plus the hero tape, the footprint grid, the nav and the application form.
- `config.js`: **edit this first**. It holds the award name and year, prices, contacts and the form endpoint.
- `apply.html`: the 3-step application form. `apply.html#private`, `#group`, `#consult` and `#indicator` preselect a program.
- `assets/img/`: photos. `bassam.jpg` is his portrait and `ranking.png` is the official ranking.

## Notes
- Brand: near-black `#050607`, one red accent `#d91414`, Cormorant Garamond and Jost for the Latin text, Cairo for the Arabic.
- The form is in preview mode while `webhookUrl` in `config.js` is empty: it shows the done screen and sends nothing.
- Empty prices show «السعر حسب الطلب».
- If the user's system asks for reduced motion, every scene shows its final state.
- The pages carry `noindex`, so search engines skip them while this is a draft.
