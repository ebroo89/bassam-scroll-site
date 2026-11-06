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
  const band = $("[data-band] i");
  const end = $("[data-end]");
  const endRule = $("[data-end-rule]");
  const revealElements = $$(".words, .up");

  // Keep Arabic words intact and create text nodes rather than parsing their text as HTML.
  function wrapWords() {
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
  }
  wrapWords();

  const writtenStyles = new Map();
  const values = {};
  let flowing = false;
  let frameId = null;
  let needsMeasure = true;
  let measurements;
  let settling = false;

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
      band: progress(band?.parentElement, "pass"),
      end: progress(end, "enter", 0.8),
    });
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
    // The divider recedes with the identity; it never sweeps across the page.
    paint(heroRule, "transform", `scaleX(${(1 - opening * 0.45).toFixed(3)})`);
    paint(heroRule, "opacity", 1 - ease(segment(hero, 0.02, 0.24)));
    heroFades.forEach((element, index) => {
      const offset = index / Math.max(heroFades.length - 1, 1) * 0.36;
      const amount = segment(hero, 0.02 + offset, 0.3 + offset);
      paint(element, "opacity", 1 - amount);
      paint(element, "transform", `translateY(${(-amount * 30).toFixed(1)}px)`);
    });
    const saying = ease(segment(hero, 0.46, 0.72));
    paint(heroSaying, "opacity", saying * (1 - ease(segment(hero, 0.92, 1))));
    paint(heroSaying, "transform", `translateY(${((1 - saying) * 16).toFixed(1)}px)`);
    paint(heroSaying, "filter", `blur(${((1 - saying) * 3).toFixed(1)}px)`);
    tapes.forEach((tape, index) => paint(tape, "transform", `translateX(${((index ? 1 : -1) * opening * 120).toFixed(1)}px)`));

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
    }
    requestMeasure();
  }

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
  document.addEventListener("site:languagechange", () => {
    wrapWords();
    requestMeasure();
  });
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
    [heroPin, end].filter(Boolean).forEach((element) => observer.observe(element));
  }

  body.classList.add("motion-ready");
  updateMode();
})();
