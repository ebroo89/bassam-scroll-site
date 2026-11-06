(() => {
  const section = document.querySelector('[data-market-section]');
  if (!section || section.dataset.marketReady === 'true') return;

  const pin = section.querySelector('[data-market-pin]');
  const panels = [...section.querySelectorAll('[data-market-panel]')];
  const graphics = panels.map(panel => panel.querySelector('.market-graphic'));
  const steps = [...section.querySelectorAll('[data-market-step]')];
  const progress = [...section.querySelectorAll('[data-market-progress]')];
  const nav = document.getElementById('nav');
  const markup = [window.marketSurfaceMarkup, window.marketStrikeMarkup, window.marketFootprintMarkup];
  const mount = [window.mountMarketSurface, window.mountMarketStrike, window.mountMarketFootprint];
  if (!pin || panels.length !== 3 || graphics.some(graphic => !graphic)) return;
  if ([...markup, ...mount].some(factory => typeof factory !== 'function')) return;

  section.dataset.marketReady = 'true';
  graphics.forEach((graphic, index) => {
    graphic.innerHTML = markup[index]();
    graphic.querySelector('svg')?.setAttribute('aria-hidden', 'true');
  });
  const renderers = graphics.map((graphic, index) => mount[index](graphic));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 760px)');
  const elapsed = [0, 0, 0];
  const speeds = [2.8, 3.2, 2.5];
  const staticTimes = [2, 12, 6];
  const frameInterval = 1000 / 30;
  let current = 0;
  let visible = false;
  let intersecting = true;
  let animationFrame = null;
  let layoutFrame = null;
  let previousFrame = null;
  let needsMeasure = true;
  let travel = 700;
  let navHeight = 0;
  const initialAnchor = location.hash.slice(1);
  let userNavigated = false;

  function setAttribute(node, name, value) {
    if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
  }

  function select(index) {
    if (index !== current) previousFrame = null;
    current = index;
    panels.forEach((panel, panelIndex) => {
      const hidden = !reduced.matches && panelIndex !== current;
      setAttribute(panel, 'aria-hidden', String(hidden));
      if (panel.inert !== hidden) panel.inert = hidden;
    });
    steps.forEach((button, index) => setAttribute(button, 'aria-pressed', String(index === current)));
    progress.forEach((marker, index) => setAttribute(marker, 'aria-current', String(index === current)));
  }

  function canAnimate() {
    return visible && intersecting && !reduced.matches && !document.hidden;
  }

  function animate(now) {
    animationFrame = null;
    if (!canAnimate()) {
      previousFrame = null;
      return;
    }
    if (previousFrame === null) previousFrame = now;
    const delta = now - previousFrame;
    if (delta >= frameInterval) {
      elapsed[current] += Math.min(delta, 100) / 1000 * speeds[current];
      renderers[current].update(elapsed[current]);
      previousFrame = now;
    }
    if (canAnimate()) animationFrame = requestAnimationFrame(animate);
  }

  function syncMotion() {
    if (canAnimate()) {
      if (animationFrame === null) {
        previousFrame = null;
        animationFrame = requestAnimationFrame(animate);
      }
    } else {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      previousFrame = null;
    }
  }

  function geometry() {
    const sectionBounds = section.getBoundingClientRect();
    const pinBounds = pin.getBoundingClientRect();
    const headerBounds = nav?.getBoundingClientRect();
    return {
      top: sectionBounds.top + window.scrollY,
      pinTop: pinBounds.top,
      pinBottom: pinBounds.bottom,
      nav: Math.max(0, Math.ceil(headerBounds?.height || 0)),
      scrollPadding: parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0,
      viewport: window.innerHeight,
      scroll: window.scrollY
    };
  }

  function refresh() {
    layoutFrame = null;
    const bounds = geometry();
    navHeight = bounds.nav;
    const availableHeight = Math.max(1, bounds.viewport - navHeight);
    const nextTravel = Math.min(850, Math.max(480, bounds.viewport * 0.9));
    const value = Math.max(0, Math.min(1, (bounds.scroll + navHeight - bounds.top) / nextTravel));
    const index = reduced.matches ? current : Math.min(2, Math.floor(value * 3));
    visible = bounds.pinBottom > navHeight && bounds.pinTop < bounds.viewport;

    if (needsMeasure) {
      needsMeasure = false;
      travel = nextTravel;
      const offset = `${navHeight}px`;
      const pinHeight = reduced.matches ? 'auto' : `${availableHeight}px`;
      const sectionHeight = reduced.matches ? 'auto' : `${availableHeight + travel}px`;
      if (section.style.getPropertyValue('--market-nav-offset') !== offset) section.style.setProperty('--market-nav-offset', offset);
      const anchorOffset = `${navHeight - bounds.scrollPadding}px`;
      if (section.style.getPropertyValue('--market-anchor-offset') !== anchorOffset) section.style.setProperty('--market-anchor-offset', anchorOffset);
      if (pin.style.height !== pinHeight) pin.style.height = pinHeight;
      if (section.style.height !== sectionHeight) section.style.height = sectionHeight;
      const footprint = graphics[2].querySelector('svg');
      footprint?.classList.toggle('footprint-closeup', compact.matches);
    }
    select(index);
    syncMotion();
  }

  function queueRefresh(measure = false) {
    needsMeasure = needsMeasure || measure;
    if (layoutFrame === null) layoutFrame = requestAnimationFrame(refresh);
  }

  function renderStatic() {
    renderers.forEach((renderer, index) => renderer.update(reduced.matches ? staticTimes[index] : elapsed[index]));
  }

  function alignInitialAnchor() {
    if (!['reads', 'programs'].includes(initialAnchor) || userNavigated) return;
    Promise.resolve(document.fonts?.ready).then(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (userNavigated || location.hash.slice(1) !== initialAnchor) return;
        const target = document.getElementById(initialAnchor);
        if (!target) return;
        const targetTop = target.getBoundingClientRect().top + window.scrollY;
        const headerHeight = nav?.getBoundingClientRect().height || 0;
        window.scrollTo({ top: Math.max(0, targetTop - headerHeight), behavior: 'instant' });
        queueRefresh(true);
      }));
    });
  }

  steps.forEach((button, fallbackIndex) => {
    button.addEventListener('click', () => {
      const requested = Number(button.dataset.marketStep || button.dataset.index || fallbackIndex);
      const index = Number.isInteger(requested) ? Math.max(0, Math.min(2, requested)) : fallbackIndex;
      const bounds = geometry();
      const nextTravel = Math.min(850, Math.max(480, bounds.viewport * 0.9));
      const target = reduced.matches
        ? panels[index].getBoundingClientRect().top + bounds.scroll - bounds.nav
        : bounds.top - bounds.nav + nextTravel * index / 3 + 2;
      window.scrollTo({ top: Math.max(0, target), behavior: 'instant' });
      select(index);
      queueRefresh();
    });
  });
  window.addEventListener('scroll', () => queueRefresh(), { passive: true });
  window.addEventListener('resize', () => queueRefresh(true), { passive: true });
  window.addEventListener('load', () => queueRefresh(true), { once: true });
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(type => {
    window.addEventListener(type, () => { userNavigated = true; }, { once: true, passive: true });
  });
  if (document.readyState === 'complete') alignInitialAnchor();
  else window.addEventListener('load', alignInitialAnchor, { once: true });
  document.addEventListener('load', () => queueRefresh(true), true);
  document.addEventListener('visibilitychange', syncMotion);
  document.addEventListener('site:languagechange', () => queueRefresh(true));
  window.addEventListener('site:languagechange', () => queueRefresh(true));
  reduced.addEventListener('change', () => {
    renderStatic();
    select(current);
    syncMotion();
    queueRefresh(true);
  });
  compact.addEventListener('change', () => queueRefresh(true));
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver(entries => {
      intersecting = entries[0].isIntersecting;
      queueRefresh();
      syncMotion();
    }, { threshold: 0 }).observe(pin);
  }
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(() => queueRefresh(true));
    if (section.parentElement) observer.observe(section.parentElement);
    if (nav) observer.observe(nav);
  }
  document.fonts?.ready.then(() => queueRefresh(true));
  renderStatic();
  refresh();
})();
