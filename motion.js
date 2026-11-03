/* Scroll scenes for motion.html. Every scene reads a 0→1 progress from the scroll position;
   values are eased toward their target each frame so the motion feels smooth, never jumpy.
   The page scrolls natively — nothing here hijacks the wheel. */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));           // sub-range of a progress
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  // Split headings into words (Arabic letters must stay joined, so words, not letters)
  $$(".words").forEach((h) => {
    let i = 0;
    h.innerHTML = h.textContent.trim().split(/\s+/).map((w) => `<span class="wd"><span style="--i:${i++}">${w}</span></span>`).join(" ");
  });

  // One-shot reveals
  const io = new IntersectionObserver((ents) => ents.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }), { rootMargin: "0px 0px -12% 0px" });
  $$(".words, .up").forEach((el) => (calm ? el.classList.add("in") : io.observe(el)));
  if (calm) { $$("[data-panel], [data-prog]").forEach((p) => p.classList.add("on")); return; }

  // Progress helpers
  const pinP = (el) => { const r = el.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight)); };
  const passP = (el) => { const r = el.getBoundingClientRect(); return clamp((innerHeight - r.top) / (innerHeight + r.height)); };
  const enterP = (el, k = 0.85) => { const r = el.getBoundingClientRect(); return clamp((innerHeight - r.top) / (innerHeight * k)); };

  const S = {};                                                  // smoothed values
  const lerp = (key, target, f = 0.14) => (S[key] = S[key] === undefined ? target : S[key] + (target - S[key]) * f);

  const bar = $("[data-progress-bar]");
  const heroPin = $('[data-pin="hero"]'), heroIn = $("[data-hero-in]"), name = $("[data-hero-name]"),
    rule = $("[data-hero-rule]"), fades = $$("[data-hero-fade]"), say = $("[data-hero-say]"), tapes = $$(".pin-hero .tape");
  const mq = $$("[data-mq]"), marquee = $(".marquee");
  const readsPin = $('[data-pin="reads"]'), panels = $$("[data-panel]"), segs = $$(".steps-bar i");
  const fp = $("[data-fp-scrub]");
  const progPin = $('[data-pin="progs"]'), progs = $$("[data-prog]"), progImgs = $$("[data-prog] .prog-img i"),
    progNow = $("[data-prog-now]"), progSegs = $$(".progs-bar i");
  const awPin = $('[data-pin="award"]'), awPhoto = $("[data-aw-photo]"), awImg = $("[data-aw-photo] i"),
    awOne = $("[data-aw-one]"), awCopy = $$("[data-aw-copy] > *"), awRank = $("[data-aw-rank]");
  const portrait = $("[data-hero-portrait] img");
  const rulesSec = $("[data-rules]"), rulesLine = $("[data-rules-line]"), rules = $$("[data-rule]");
  const band = $("[data-band] i"), endRule = $("[data-end-rule]"), end = $("[data-end]");

  let fpCells = [];
  const frame = () => {
    // Page progress bar
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (lerp("page", scrollY / max, 0.2) * 100).toFixed(2) + "%";

    // 1 · Hero: name opens up and fades, rule runs edge to edge, statement takes over
    const h = lerp("hero", pinP(heroPin));
    const a = ease(seg(h, 0, 0.55));
    name.style.letterSpacing = (0.16 + a * (innerWidth > 980 ? 0.06 : 0.5)).toFixed(3) + "em";   // desktop: small, so the name never spreads over his face
    name.style.opacity = 1 - seg(h, 0.15, 0.55);
    name.style.filter = `blur(${(seg(h, 0.2, 0.55) * 8).toFixed(1)}px)`;
    portrait.style.transform = `translateY(${(-a * 30).toFixed(1)}px) scale(${(1 + a * 0.06).toFixed(3)})`;
    portrait.style.opacity = (1 - seg(h, 0.35, 0.7) * 0.85).toFixed(3);
    heroIn.style.transform = `translateY(${(-a * 60).toFixed(1)}px) scale(${(1 - a * 0.08).toFixed(3)})`;
    rule.style.width = (56 + ease(seg(h, 0, 0.45)) * (innerWidth - 56)).toFixed(0) + "px";
    rule.style.opacity = 1 - seg(h, 0.5, 0.7);
    // the award plaque is the last fade, so it stays on screen longest
    fades.forEach((f, i) => { const t = seg(h, 0.02 + i * 0.12, 0.22 + i * 0.15); f.style.opacity = 1 - t; f.style.transform = `translateY(${(-t * 30).toFixed(1)}px)`; });
    const s = seg(h, 0.5, 0.8);
    say.style.opacity = s * (1 - seg(h, 0.92, 1));
    say.style.transform = `scale(${(0.92 + ease(s) * 0.08).toFixed(3)})`;
    tapes.forEach((t, i) => (t.style.transform = `translateX(${((i ? 1 : -1) * a * 120).toFixed(1)}px)`));

    // 2 · Marquee rows move opposite ways with the scroll
    const m = lerp("mq", passP(marquee));
    mq.forEach((r) => (r.style.transform = `translateX(${(+r.dataset.mq * (m * 40 - 20)).toFixed(2)}%)`));

    // 3 · Reads: three panels, one per third of the pinned scroll
    const rp = lerp("reads", pinP(readsPin), 0.2);
    const idx = Math.min(2, Math.floor(rp * 3));
    panels.forEach((p, i) => { p.classList.toggle("on", i === idx); p.classList.toggle("past", i < idx); });
    segs.forEach((g, i) => g.style.setProperty("--f", (clamp(rp * 3 - i) * 100).toFixed(1) + "%"));

    // 4 · Footprint: light the bars one by one as the grid enters
    if (fp) {
      if (!fpCells.length) fpCells = $$(".c", fp);
      const fpp = enterP(fp, 0.9);
      fpCells.forEach((c, i) => c.classList.toggle("lit", fpp * 6 > (i % 5) + 0.6));
    }

    // 5 · Programs: each one wipes up over the last; the one underneath sinks back
    const slot = clamp((lerp("progs", pinP(progPin), 0.16) - 0.04) / 0.9) * (progs.length - 1);
    progs.forEach((pr, i) => {
      const r = i ? ease(clamp((slot - (i - 1)) / 0.75)) : 1;                  // how far this one has come in
      const next = i < progs.length - 1 ? ease(clamp((slot - i) / 0.75)) : 0; // how far the next one covers it
      if (i) pr.style.clipPath = `inset(${((1 - r) * 100).toFixed(2)}% 0 0 0)`;
      pr.style.transform = `scale(${(1 - next * 0.06).toFixed(3)})`;
      pr.style.filter = `brightness(${(1 - next * 0.65).toFixed(3)})`;
      progImgs[i].style.transform = `scale(${(1.25 - r * 0.25).toFixed(3)}) translateY(${(next * 6).toFixed(2)}%)`;
      pr.classList.toggle("on", slot > i - 0.6);
    });
    const cur = Math.min(progs.length - 1, Math.floor(slot + 0.4));
    progNow.textContent = "0" + (cur + 1);
    progSegs.forEach((g, i) => g.classList.toggle("on", i <= cur));

    // 6 · Award: photo opens from a slit, image settles, the "1" lands, copy rises
    const w = lerp("aw", pinP(awPin));
    const open = ease(seg(w, 0, 0.45));
    awPhoto.style.clipPath = `inset(${((1 - open) * 46).toFixed(2)}% 0 ${((1 - open) * 46).toFixed(2)}% 0)`;
    awImg.style.transform = `scale(${(1.35 - open * 0.35 + seg(w, 0.6, 1) * 0.06).toFixed(3)})`;
    const one = ease(seg(w, 0.2, 0.6));
    awOne.style.transform = `scale(${(2.4 - one * 1.4).toFixed(3)})`;
    awOne.style.opacity = one;
    const rk = ease(seg(w, 0.3, 0.6));
    awRank.style.opacity = rk; awRank.style.transform = `translateY(${((1 - rk) * 60).toFixed(1)}px)`;
    awCopy.forEach((c, i) => {
      if (c === awOne) return;
      const t = ease(seg(w, 0.35 + i * 0.06, 0.6 + i * 0.06));
      c.style.opacity = t; c.style.transform = `translateY(${((1 - t) * 40).toFixed(1)}px)`;
    });

    // 7 · Rules: the red line runs across and switches each rule on
    const rl = lerp("rules", enterP(rulesSec, 1.1));
    rulesLine.style.width = (ease(rl) * 100).toFixed(1) + "%";
    rules.forEach((r, i) => r.classList.toggle("on", rl > 0.25 + i * 0.25));

    // 8 · Band: zoom out + drift
    const b = lerp("band", passP(band.parentElement));
    band.style.transform = `translateY(${((b - 0.5) * 16).toFixed(2)}%) scale(${(1.3 - b * 0.3).toFixed(3)})`;

    // 9 · End rule grows
    endRule.style.width = (ease(lerp("end", enterP(end, 0.8))) * 220).toFixed(0) + "px";

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
