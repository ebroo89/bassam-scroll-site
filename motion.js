/* Scroll scenes use native scrolling. Geometry is measured after input changes,
   then interpolation runs only until the visible state has settled. */
(function () {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const body = document.body;
  if (!body || !body.classList.contains("motion")) return;

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const narrowViewport = matchMedia("(max-width: 1024px)");
  const shortViewport = matchMedia("(max-height: 740px)");
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const segment = (progress, start, end) => clamp((progress - start) / (end - start));
  const ease = (value) => 1 - Math.pow(1 - value, 3);

  const bar = $("[data-progress-bar]");
  const heroPin = $('[data-pin="hero"]');
  const heroInner = $("[data-hero-in]");
  const heroName = $("[data-hero-name]");
  const heroRule = $("[data-hero-rule]");
  const heroFades = $$("[data-hero-fade]");
  const heroSaying = $("[data-hero-say]");
  const portrait = $("[data-hero-portrait] img");
  const tapes = $$(".pin-hero .tape");
  const marquee = $(".marquee");
  const marqueeRows = $$("[data-mq]");
  const readsPin = $('[data-pin="reads"]');
  const panels = $$("[data-panel]");
  const readSegments = $$(".steps-bar i");
  const footprint = $("[data-fp-scrub]");
  const footprintCells = footprint ? $$(".c", footprint) : [];
  const programPin = $('[data-pin="progs"]');
  const programs = $$("[data-prog]");
  const programImages = programs.map((card) => $(".prog-img i", card));
  const programNumber = $("[data-prog-now]");
  const programSegments = $$(".progs-bar i");
  const previousProgram = $("[data-program-prev]");
  const nextProgram = $("[data-program-next]");
  const programLinks = $$("[data-program-go]");
  const awardPin = $('[data-pin="award"]');
  const awardPhoto = $("[data-aw-photo]");
  const awardImage = $("[data-aw-photo] i");
  const awardOne = $("[data-aw-one]");
  const awardCopy = $$("[data-aw-copy] > *");
  const awardRanking = $("[data-aw-rank]");
  const rulesSection = $("[data-rules]");
  const rulesLine = $("[data-rules-line]");
  const rules = $$("[data-rule]");
  const band = $("[data-band] i");
  const end = $("[data-end]");
  const endRule = $("[data-end-rule]");
  const revealElements = $$(".words, .up");

  // Keep Arabic words intact and create text nodes rather than parsing their text as HTML.
  $$(".words").forEach((heading) => {
    const fragment = document.createDocumentFragment();
    heading.textContent.trim().split(/\s+/).forEach((word, index) => {
      const wrapper = document.createElement("span");
      const text = document.createElement("span");
      wrapper.className = "wd";
      text.style.setProperty("--i", index);
      text.textContent = word;
      wrapper.append(text);
      fragment.append(wrapper, document.createTextNode(" "));
    });
    heading.replaceChildren(fragment);
  });

  const writtenStyles = new Map();
  const values = {};
  let flowing = false;
  let frameId = null;
  let needsMeasure = true;
  let measurements;
  let settling = false;
  let currentProgram = -1;

  function paint(element, property, value) {
    if (!element) return;
    const next = String(value);
    if (element.style[property] === next) return;
    element.style[property] = next;
    if (!writtenStyles.has(element)) writtenStyles.set(element, new Set());
    writtenStyles.get(element).add(property);
  }

  function interpolate(key, target, speed = 0.14) {
    const previous = values[key] ?? target;
    const next = previous + (target - previous) * speed;
    if (Math.abs(target - next) > 0.0005) {
      settling = true;
      values[key] = next;
    } else {
      values[key] = target;
    }
    return values[key];
  }

  function progress(element, type = "pin", factor = 0.85) {
    if (!element) return 0;
    const rect = element.getBoundingClientRect();
    if (type === "pass") return clamp((innerHeight - rect.top) / (innerHeight + rect.height));
    if (type === "enter") return clamp((innerHeight - rect.top) / (innerHeight * factor));
    return rect.height > innerHeight ? clamp(-rect.top / (rect.height - innerHeight)) : 0;
  }

  function measure() {
    const distance = document.documentElement.scrollHeight - innerHeight;
    const snapshot = { width: innerWidth, page: distance > 0 ? clamp(scrollY / distance) : 0 };
    if (flowing) return snapshot;
    return Object.assign(snapshot, {
      hero: progress(heroPin),
      marquee: progress(marquee, "pass"),
      reads: progress(readsPin),
      footprint: progress(footprint, "enter", 0.9),
      programs: progress(programPin),
      award: progress(awardPin),
      rules: progress(rulesSection, "enter", 1.1),
      band: progress(band?.parentElement, "pass"),
      end: progress(end, "enter", 0.8),
    });
  }

  function updateProgramAccess(index, force = false) {
    if (index === currentProgram && !force) return;
    const selected = programs[index];
    const focusedCard = programs.find((card) => card.contains(document.activeElement));
    programs.forEach((card, cardIndex) => {
      const available = flowing || cardIndex === index;
      card.inert = !available;
      card.setAttribute("aria-hidden", String(!available));
      card.classList.toggle("active", cardIndex === index);
    });
    if (!flowing && focusedCard && focusedCard !== selected) {
      selected?.querySelector("a, button, input, select, textarea, [tabindex]")?.focus({ preventScroll: true });
    }
    currentProgram = index;
    if (programNumber) programNumber.textContent = String(index + 1).padStart(2, "0");
    if (previousProgram) previousProgram.disabled = index <= 0;
    if (nextProgram) nextProgram.disabled = index >= programs.length - 1;
    programSegments.forEach((item, itemIndex) => item.classList.toggle("on", itemIndex <= index));
    programLinks.forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.programGo) === index)));
  }

  function render(snapshot) {
    paint(bar, "transform", `scaleX(${flowing ? snapshot.page : interpolate("page", snapshot.page, 0.2)})`);
    if (flowing) return;

    const hero = interpolate("hero", snapshot.hero);
    const opening = ease(segment(hero, 0, 0.55));
    paint(heroName, "letterSpacing", (0.16 + opening * (snapshot.width > 980 ? 0.06 : 0.5)).toFixed(3) + "em");
    paint(heroName, "opacity", 1 - segment(hero, 0.15, 0.55));
    paint(heroName, "filter", `blur(${(segment(hero, 0.2, 0.55) * 8).toFixed(1)}px)`);
    paint(portrait, "transform", `translateY(${(-opening * 30).toFixed(1)}px) scale(${(1 + opening * 0.06).toFixed(3)})`);
    paint(portrait, "opacity", (1 - segment(hero, 0.35, 0.7) * 0.85).toFixed(3));
    paint(heroInner, "transform", `translateY(${(-opening * 60).toFixed(1)}px) scale(${(1 - opening * 0.08).toFixed(3)})`);
    if (heroInner) heroInner.inert = hero >= 0.7;
    paint(heroRule, "width", (56 + ease(segment(hero, 0, 0.45)) * (snapshot.width - 56)).toFixed(0) + "px");
    paint(heroRule, "opacity", 1 - segment(hero, 0.5, 0.7));
    heroFades.forEach((element, index) => {
      const offset = index / Math.max(heroFades.length - 1, 1) * 0.36;
      const amount = segment(hero, 0.02 + offset, 0.3 + offset);
      paint(element, "opacity", 1 - amount);
      paint(element, "transform", `translateY(${(-amount * 30).toFixed(1)}px)`);
    });
    const saying = segment(hero, 0.5, 0.8);
    paint(heroSaying, "opacity", saying * (1 - segment(hero, 0.92, 1)));
    paint(heroSaying, "transform", `scale(${(0.92 + ease(saying) * 0.08).toFixed(3)})`);
    tapes.forEach((tape, index) => paint(tape, "transform", `translateX(${((index ? 1 : -1) * opening * 120).toFixed(1)}px)`));

    const marqueeProgress = interpolate("marquee", snapshot.marquee);
    marqueeRows.forEach((row) => paint(row, "transform", `translateX(${(Number(row.dataset.mq) * (marqueeProgress * 40 - 20)).toFixed(2)}%)`));

    const reads = interpolate("reads", snapshot.reads, 0.2);
    const panelIndex = Math.min(panels.length - 1, Math.floor(reads * panels.length));
    panels.forEach((panel, index) => {
      panel.classList.toggle("on", index === panelIndex);
      panel.classList.toggle("past", index < panelIndex);
    });
    readSegments.forEach((item, index) => item.style.setProperty("--f", (clamp(reads * panels.length - index) * 100).toFixed(1) + "%"));
    footprintCells.forEach((cell, index) => cell.classList.toggle("lit", snapshot.footprint * 6 > index % 5 + 0.6));

    const slot = clamp((interpolate("programs", snapshot.programs, 0.16) - 0.04) / 0.9) * Math.max(programs.length - 1, 0);
    programs.forEach((card, index) => {
      const reveal = index ? ease(clamp((slot - (index - 1)) / 0.75)) : 1;
      const covered = index < programs.length - 1 ? ease(clamp((slot - index) / 0.75)) : 0;
      if (index) paint(card, "clipPath", `inset(${((1 - reveal) * 100).toFixed(2)}% 0 0 0)`);
      paint(card, "transform", `scale(${(1 - covered * 0.06).toFixed(3)})`);
      paint(card, "filter", `brightness(${(1 - covered * 0.65).toFixed(3)})`);
      paint(programImages[index], "transform", `scale(${(1.25 - reveal * 0.25).toFixed(3)}) translateY(${(covered * 6).toFixed(2)}%)`);
      card.classList.toggle("on", slot > index - 0.6);
    });
    if (programs.length) updateProgramAccess(Math.min(programs.length - 1, Math.floor(slot + 0.5)));

    const award = interpolate("award", snapshot.award);
    const photoOpening = ease(segment(award, 0, 0.45));
    paint(awardPhoto, "clipPath", `inset(${((1 - photoOpening) * 46).toFixed(2)}% 0 ${((1 - photoOpening) * 46).toFixed(2)}% 0)`);
    paint(awardImage, "transform", `scale(${(1.35 - photoOpening * 0.35 + segment(award, 0.6, 1) * 0.06).toFixed(3)})`);
    const number = ease(segment(award, 0.2, 0.6));
    paint(awardOne, "transform", `scale(${(2.4 - number * 1.4).toFixed(3)})`);
    paint(awardOne, "opacity", number);
    const ranking = ease(segment(award, 0.3, 0.6));
    paint(awardRanking, "opacity", ranking);
    paint(awardRanking, "transform", `translateY(${((1 - ranking) * 60).toFixed(1)}px)`);
    awardCopy.forEach((element, index) => {
      if (element === awardOne) return;
      const amount = ease(segment(award, 0.35 + index * 0.06, 0.6 + index * 0.06));
      paint(element, "opacity", amount);
      paint(element, "transform", `translateY(${((1 - amount) * 40).toFixed(1)}px)`);
    });

    const rulesProgress = interpolate("rules", snapshot.rules);
    paint(rulesLine, "width", (ease(rulesProgress) * 100).toFixed(1) + "%");
    rules.forEach((rule, index) => rule.classList.toggle("on", rulesProgress > 0.25 + index * 0.25));
    const bandProgress = interpolate("band", snapshot.band);
    paint(band, "transform", `translateY(${((bandProgress - 0.5) * 16).toFixed(2)}%) scale(${(1.3 - bandProgress * 0.3).toFixed(3)})`);
    paint(endRule, "width", (ease(interpolate("end", snapshot.end)) * 220).toFixed(0) + "px");
  }

  function frame() {
    frameId = null;
    if (needsMeasure) {
      measurements = measure();
      needsMeasure = false;
    }
    settling = false;
    render(measurements);
    if (settling) schedule();
  }

  function schedule() {
    if (frameId === null && !document.hidden) frameId = requestAnimationFrame(frame);
  }

  function requestMeasure() {
    needsMeasure = true;
    schedule();
  }

  function updateMode() {
    flowing = reducedMotion.matches || narrowViewport.matches || shortViewport.matches;
    body.classList.toggle("motion-reduced", reducedMotion.matches);
    body.classList.toggle("motion-flow", flowing);
    for (const [element, properties] of writtenStyles) {
      for (const property of properties) element.style[property] = "";
    }
    writtenStyles.clear();
    for (const key of Object.keys(values)) delete values[key];
    if (heroInner) heroInner.inert = false;
    if (flowing) {
      revealElements.forEach((element) => element.classList.add("in"));
      panels.forEach((panel) => { panel.classList.add("on"); panel.classList.remove("past"); });
      programs.forEach((card) => card.classList.add("on"));
      footprintCells.forEach((cell) => cell.classList.add("lit"));
      rules.forEach((rule) => rule.classList.add("on"));
      readSegments.forEach((item) => item.style.setProperty("--f", "100%"));
    }
    if (programs.length) updateProgramAccess(0, true);
    requestMeasure();
  }

  function goToProgram(index) {
    const target = clamp(index, 0, programs.length - 1);
    if (!programs[target]) return;
    if (flowing || !programPin) {
      programs[target].scrollIntoView({ block: "start", behavior: reducedMotion.matches ? "auto" : "smooth" });
      updateProgramAccess(target);
      return;
    }
    const rect = programPin.getBoundingClientRect();
    const progress = 0.04 + target / Math.max(programs.length - 1, 1) * 0.9;
    const top = scrollY + rect.top + Math.max(rect.height - innerHeight, 0) * progress;
    scrollTo({ top, behavior: "smooth" });
  }

  previousProgram?.addEventListener("click", () => goToProgram(currentProgram - 1));
  nextProgram?.addEventListener("click", () => goToProgram(currentProgram + 1));
  programLinks.forEach((button) => button.addEventListener("click", () => goToProgram(Number(button.dataset.programGo))));

  if (typeof IntersectionObserver === "function") {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    revealElements.forEach((element) => observer.observe(element));
  } else {
    revealElements.forEach((element) => element.classList.add("in"));
  }

  [reducedMotion, narrowViewport, shortViewport].forEach((query) => query.addEventListener("change", updateMode));
  addEventListener("scroll", requestMeasure, { passive: true });
  addEventListener("resize", requestMeasure, { passive: true });
  addEventListener("load", requestMeasure, { once: true });
  addEventListener("pageshow", requestMeasure);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    } else if (!document.hidden) {
      requestMeasure();
    }
  });
  document.fonts?.ready.then(requestMeasure);
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(requestMeasure);
    [heroPin, readsPin, programPin, awardPin, rulesSection, end].filter(Boolean).forEach((element) => observer.observe(element));
  }

  body.classList.add("motion-ready");
  updateMode();
})();
