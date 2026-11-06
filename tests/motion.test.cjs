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
  if (!empty) {
    add('[data-progress-bar]', 'progress');
    add('[data-pin="hero"]', 'hero', 0, 1600);
    add('[data-hero-in]', 'hero-inner');
    add('[data-hero-name]', 'name');
    add('[data-hero-rule]', 'hero-rule');
    add('[data-hero-say]', 'saying');
    add('[data-hero-portrait] img', 'portrait');
    add('[data-hero-fade]', 'hero-copy');
    add('.pin-hero .tape', 'left-tape');
    add('.pin-hero .tape', 'right-tape');
    const band = add('[data-band] i', 'band');
    band.parentElement = element('band-wrapper', 7900);
    add('[data-end]', 'end', 8500);
    add('[data-end-rule]', 'end-rule');
    add('.words, .up', 'closing-copy');
  }
  const media = new Map();
  for (const [query, matches] of [['(prefers-reduced-motion: reduce)', reduced], ['(max-width: 1024px)', width <= 1024], ['(max-height: 740px)', height <= 740]]) {
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
  return { context, document, events, frames, frame, settle, dispatch, setReduced, find: selector => document.querySelector(selector) };
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

test('mobile flow leaves the hero readable without scroll transforms', () => {
  const page = createPage({ width: 390 });
  page.settle();
  assert.equal(page.document.body.classList.contains('motion-flow'), true);
  assert.equal(page.find('[data-hero-in]').inert, false);
  assert.equal(page.find('[data-hero-name]').style.transform, '');
  assert.equal(page.find('[data-hero-name]').style.opacity, '');
  assert.equal(page.find('.words, .up').classList.contains('in'), true);
});

test('changing reduced motion clears hero styles and restores access', () => {
  const page = createPage();
  page.context.scrollY = 760;
  page.dispatch('scroll');
  page.settle();
  assert.equal(page.find('[data-hero-in]').inert, true);
  assert.notEqual(page.find('[data-hero-name]').style.opacity, '');
  page.setReduced(true);
  page.settle();
  assert.equal(page.document.body.classList.contains('motion-reduced'), true);
  assert.equal(page.find('[data-hero-in]').inert, false);
  assert.equal(page.find('[data-hero-name]').style.opacity, '');
  assert.equal(page.find('[data-band] i').style.transform, '');
  page.setReduced(false);
  page.settle();
  assert.equal(page.document.body.classList.contains('motion-reduced'), false);
  assert.equal(page.find('[data-hero-in]').inert, true);
});

test('partial pages gracefully skip missing animation elements', () => {
  const page = createPage({ empty: true });
  assert.doesNotThrow(() => page.settle());
});

for (const viewport of [{ width: 1200, height: 740 }, { width: 1024, height: 768 }]) {
  test(`compact ${viewport.width} by ${viewport.height} viewport uses readable flow`, () => {
    const page = createPage(viewport);
    page.settle();
    assert.equal(page.document.body.classList.contains('motion-flow'), true);
    assert.equal(page.find('[data-hero-in]').inert, false);
    assert.equal(page.find('[data-hero-name]').style.opacity, '');
  });
}

test('desktop hero remains animated when the viewport has enough space', () => {
  const page = createPage({ width: 1280, height: 800 });
  page.settle();
  assert.equal(page.document.body.classList.contains('motion-flow'), false);
  assert.equal(page.find('[data-hero-name]').style.opacity, '1');
});

test('hero controls become inert after fading and recover when scrolling back', () => {
  const page = createPage();
  page.context.scrollY = 760;
  page.dispatch('scroll');
  page.settle();
  assert.equal(page.find('[data-hero-in]').inert, true);
  assert.equal(page.find('[data-hero-name]').style.opacity, '0');
  assert.equal(page.find('[data-hero-fade]').style.opacity, '0');
  page.context.scrollY = 0;
  page.dispatch('scroll');
  page.settle();
  assert.equal(page.find('[data-hero-in]').inert, false);
  assert.equal(page.find('[data-hero-name]').style.opacity, '1');
});

test('the photo band and closing divider advance with their visible sections', () => {
  const page = createPage();
  page.settle();
  assert.match(page.find('[data-band] i').style.transform, /scale\(1\.300\)/);
  assert.equal(page.find('[data-end-rule]').style.width, '0px');
  page.context.scrollY = 8500;
  page.dispatch('scroll');
  page.settle();
  assert.match(page.find('[data-band] i').style.transform, /scale\(1\.000\)/);
  assert.equal(page.find('[data-end-rule]').style.width, '220px');
});

test('page progress reaches the end in both animated and reduced-motion modes', () => {
  for (const reduced of [false, true]) {
    const page = createPage({ reduced });
    page.context.scrollY = page.document.documentElement.scrollHeight - page.context.innerHeight;
    page.dispatch('scroll');
    page.settle();
    assert.equal(page.find('[data-progress-bar]').style.transform, 'scaleX(1)');
  }
});

test('hidden tabs stop requesting animation frames and resume when visible', () => {
  const page = createPage();
  page.settle();
  page.context.scrollY = 300;
  page.dispatch('scroll');
  assert.equal(page.frames.size, 1);
  page.document.hidden = true;
  page.document.dispatch('visibilitychange');
  assert.equal(page.frames.size, 0);
  page.dispatch('scroll');
  assert.equal(page.frames.size, 0);
  page.document.hidden = false;
  page.document.dispatch('visibilitychange');
  assert.equal(page.frames.size, 1);
  page.settle();
  assert.equal(page.frames.size, 0);
});
