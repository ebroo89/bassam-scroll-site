const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'motion.js'), 'utf8');

function createPage({ width = 1200, height = 800, reduced = false, empty = false } = {}) {
  const events = [];
  const frames = new Map();
  const listeners = new Map();
  let nextFrame = 1;
  let context;

  function eventTarget() {
    const handlers = new Map();
    return {
      addEventListener(type, handler) {
        const list = handlers.get(type) || [];
        list.push(handler);
        handlers.set(type, list);
      },
      dispatch(type) {
        for (const handler of handlers.get(type) || []) handler({ type });
      },
    };
  }

  function element(name, top = 0, height = 500) {
    const classes = new Set();
    const attributes = new Map();
    const customProperties = new Map();
    const children = new Map();
    const target = eventTarget();
    const style = new Proxy({
      setProperty(property, value) {
        events.push({ type: 'write', name, property });
        customProperties.set(property, String(value));
      },
      getPropertyValue(property) { return customProperties.get(property) || ''; },
    }, {
      set(object, property, value) {
        events.push({ type: 'write', name, property });
        object[property] = value;
        return true;
      },
      get(object, property) { return property in object ? object[property] : ''; },
    });
    return Object.assign(target, {
      name, top, height, style, dataset: {}, textContent: '', innerHTML: '',
      inert: false, disabled: false, parentElement: null,
      classList: {
        contains(value) { return classes.has(value); },
        add(...values) { values.forEach(value => classes.add(value)); },
        remove(...values) { values.forEach(value => classes.delete(value)); },
        toggle(value, force) {
          const enabled = force === undefined ? !classes.has(value) : force;
          enabled ? classes.add(value) : classes.delete(value);
          return enabled;
        },
      },
      setAttribute(name, value) { attributes.set(name, String(value)); },
      getAttribute(name) { return attributes.get(name) ?? null; },
      removeAttribute(name) { attributes.delete(name); },
      querySelector(selector) { return (children.get(selector) || [])[0] || null; },
      querySelectorAll(selector) { return children.get(selector) || []; },
      contains(node) { return node === this || [...children.values()].flat().includes(node); },
      focus() {
        if (!this.inert && !this.parentElement?.inert) document.activeElement = this;
      },
      scrollIntoView(options) { context.scrollTo({ top: this.top, ...options }); },
      getBoundingClientRect() {
        events.push({ type: 'read', name });
        return { top: this.top - context.scrollY, height: this.height, bottom: this.top - context.scrollY + this.height };
      },
      childrenMap: children,
    });
  }

  const body = element('body');
  body.classList.add('motion');
  const selectors = new Map();
  const document = Object.assign(eventTarget(), {
    body, documentElement: { scrollHeight: 9000 }, hidden: false, activeElement: body,
    querySelector(selector) { return (selectors.get(selector) || [])[0] || null; },
    querySelectorAll(selector) { return selectors.get(selector) || []; },
  });
  const add = (selector, name, top, height) => {
    const node = element(name, top, height);
    selectors.set(selector, [...(selectors.get(selector) || []), node]);
    return node;
  };
  const programs = [];
  let programSection;
  let previous;
  let next;
  if (!empty) {
    add('[data-progress-bar]', 'progress');
    add('[data-pin="hero"]', 'hero', 0, 1600);
    add('[data-hero-in]', 'hero-inner');
    add('[data-hero-name]', 'name');
    add('[data-hero-rule]', 'hero-rule');
    add('[data-hero-say]', 'saying');
    add('[data-hero-portrait] img', 'portrait');
    add('.marquee', 'marquee', 1800);
    add('[data-pin="reads"]', 'reads', 2200, 2200);
    add('[data-panel]', 'panel-1');
    add('[data-panel]', 'panel-2');
    add('[data-panel]', 'panel-3');
    add('.steps-bar i', 'read-progress-1');
    add('.steps-bar i', 'read-progress-2');
    add('.steps-bar i', 'read-progress-3');
    programSection = add('[data-pin="progs"]', 'programs', 4500, 3200);
    for (let index = 0; index < 4; index++) {
      const card = add('[data-prog]', `program-${index}`);
      const image = add('[data-prog] .prog-img i', `program-image-${index}`);
      const link = element(`program-link-${index}`);
      link.parentElement = card;
      card.childrenMap.set('.prog-img i', [image]);
      card.childrenMap.set('a, button, input, select, textarea, [tabindex]', [link]);
      programs.push(card);
    }
    add('[data-prog-now]', 'program-number');
    previous = add('[data-program-prev]', 'previous');
    next = add('[data-program-next]', 'next');
    for (let index = 0; index < 4; index++) {
      const jump = add('[data-program-go]', `jump-${index}`);
      jump.dataset.programGo = String(index);
    }
    add('[data-pin="award"]', 'award', 1500, 2000);
    add('[data-aw-photo]', 'award-photo');
    add('[data-aw-photo] i', 'award-image');
    add('[data-aw-one]', 'award-one');
    add('[data-aw-rank]', 'award-rank');
    add('[data-rules]', 'rules', 7600);
    add('[data-rules-line]', 'rules-line');
    const band = add('[data-band] i', 'band');
    band.parentElement = element('band-wrapper', 7900);
    add('[data-end]', 'end', 8500);
    add('[data-end-rule]', 'end-rule');
  }
  const media = new Map();
  for (const [query, matches] of [['(prefers-reduced-motion: reduce)', reduced], ['(max-width: 860px)', width <= 860], ['(max-height: 680px)', height <= 680]]) {
    media.set(query, Object.assign(eventTarget(), { matches }));
  }
  context = {
    document, innerWidth: width, innerHeight: height, scrollY: 0,
    matchMedia(query) {
      if (!media.has(query)) {
        const boundary = query.match(/max-(width|height): (\d+)px/);
        const dimension = boundary?.[1] === 'width' ? width : height;
        media.set(query, Object.assign(eventTarget(), { matches: Boolean(boundary) && dimension <= Number(boundary[2]) }));
      }
      return media.get(query);
    },
    requestAnimationFrame(callback) { const id = nextFrame++; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    addEventListener(type, callback) { listeners.set(type, [...(listeners.get(type) || []), callback]); },
    scrollTo(options) { context.scrollY = options.top; context.lastScroll = options; dispatch('scroll'); },
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    console,
  };
  context.window = context;
  function dispatch(type) { for (const callback of listeners.get(type) || []) callback(); }
  function frame() {
    const item = frames.entries().next().value;
    if (!item) return false;
    frames.delete(item[0]);
    item[1](0);
    return true;
  }
  function settle(limit = 250) { let count = 0; while (count < limit && frame()) count++; return count; }
  function setReduced(matches) { const query = media.get('(prefers-reduced-motion: reduce)'); query.matches = matches; query.dispatch('change'); }
  vm.runInNewContext(source, context, { filename: 'motion.js' });
  return { context, document, programs, programSection, previous, next, events, frames, frame, settle, dispatch, setReduced, find: selector => document.querySelector(selector) };
}

test('animation settles without requesting frames while the page is idle', () => {
  const page = createPage();
  page.settle();
  assert.equal(page.frames.size, 0);
  page.context.scrollY = 100;
  page.dispatch('scroll');
  assert.equal(page.frames.size, 1);
  page.settle();
  assert.equal(page.frames.size, 0);
});

test('all geometry is measured before animation styles are written', () => {
  const page = createPage();
  page.events.length = 0;
  page.frame();
  const firstWrite = page.events.findIndex(event => event.type === 'write');
  assert.ok(firstWrite >= 0);
  assert.equal(page.events.slice(firstWrite).some(event => event.type === 'read'), false);
});

test('only the visible desktop program is available to focus and assistive technology', () => {
  const page = createPage();
  page.settle();
  assert.deepEqual(page.programs.map(card => card.inert), [false, true, true, true]);
  assert.equal(page.programs[1].getAttribute('aria-hidden'), 'true');
  page.next.dispatch('click');
  page.settle();
  assert.deepEqual(page.programs.map(card => card.inert), [true, false, true, true]);
  assert.ok(page.context.lastScroll.top > page.programSection.top);
  page.previous.dispatch('click');
  page.settle();
  assert.deepEqual(page.programs.map(card => card.inert), [false, true, true, true]);
});

test('mobile flow leaves every program available without scroll animation transforms', () => {
  const page = createPage({ width: 390 });
  page.settle();
  assert.equal(page.document.body.classList.contains('motion-flow'), true);
  assert.deepEqual(page.programs.map(card => card.inert), [false, false, false, false]);
  assert.equal(page.programs[1].style.transform, '');
});

test('changing reduced motion clears animation styles and re-enables every program', () => {
  const page = createPage();
  page.settle();
  assert.notEqual(page.programs[1].style.transform, '');
  page.setReduced(true);
  page.settle();
  assert.equal(page.document.body.classList.contains('motion-reduced'), true);
  assert.deepEqual(page.programs.map(card => card.inert), [false, false, false, false]);
  assert.equal(page.programs[1].style.transform, '');
  page.setReduced(false);
  page.settle();
  assert.equal(page.document.body.classList.contains('motion-reduced'), false);
  assert.deepEqual(page.programs.map(card => card.inert), [false, true, true, true]);
});

test('partial pages gracefully skip missing animation elements', () => {
  const page = createPage({ empty: true });
  assert.doesNotThrow(() => page.settle());
});

test('short viewports use the readable program flow', () => {
  const page = createPage({ height: 740 });
  page.settle();
  assert.equal(page.document.body.classList.contains('motion-flow'), true);
  assert.deepEqual(page.programs.map(card => card.inert), [false, false, false, false]);
});

test('tablet-width screens use the readable program flow at 1024 by 768', () => {
  const page = createPage({ width: 1024, height: 768 });
  page.settle();
  assert.equal(page.document.body.classList.contains('motion-flow'), true);
  assert.deepEqual(page.programs.map(card => card.inert), [false, false, false, false]);
});

test('desktop scenes remain pinned when the viewport has enough space', () => {
  const page = createPage({ width: 1280, height: 800 });
  page.settle();
  assert.equal(page.document.body.classList.contains('motion-flow'), false);
  assert.deepEqual(page.programs.map(card => card.inert), [false, true, true, true]);
});

test('hero controls become inert after the hero content has faded', () => {
  const page = createPage();
  page.context.scrollY = 760;
  page.dispatch('scroll');
  page.settle();
  assert.equal(page.find('[data-hero-in]').inert, true);
  page.context.scrollY = 0;
  page.dispatch('scroll');
  page.settle();
  assert.equal(page.find('[data-hero-in]').inert, false);
});

test('reading progress writes CSS custom properties through the style API', () => {
  const page = createPage();
  page.context.scrollY = 2900;
  page.dispatch('scroll');
  page.settle();
  assert.equal(page.find('.steps-bar i').style.getPropertyValue('--f'), '100.0%');
});

test('scrolling forward moves focus only after the next program becomes available', () => {
  const page = createPage();
  page.settle();
  const firstLink = page.programs[0].querySelector('a, button, input, select, textarea, [tabindex]');
  const secondLink = page.programs[1].querySelector('a, button, input, select, textarea, [tabindex]');
  firstLink.focus();
  page.context.scrollY = 5400;
  page.dispatch('scroll');
  page.settle();
  assert.equal(page.document.activeElement, secondLink);
  assert.equal(secondLink.parentElement.inert, false);
});

test('direct program navigation marks the selected program for assistive technology', () => {
  const page = createPage();
  page.settle();
  const jumpButtons = page.document.querySelectorAll('[data-program-go]');
  jumpButtons[2].dispatch('click');
  page.settle();
  assert.deepEqual(jumpButtons.map(button => button.getAttribute('aria-pressed')), ['false', 'false', 'true', 'false']);
  assert.equal(page.programs[2].getAttribute('aria-hidden'), 'false');
});
