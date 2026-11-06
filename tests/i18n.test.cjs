const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'i18n.js'), 'utf8');
const dictionary = fs.readFileSync(path.join(__dirname, '..', 'translations.js'), 'utf8');

// A presentation-only DOM adapter. Browser rendering is verified separately.
function createPage({ url = 'https://example.invalid/index.html', saved = 'ar', storageUnavailable = false, linkHref = 'apply.html#consult' } = {}) {
  function text(value, parentElement) {
    return { nodeType: 3, nodeValue: value, parentElement };
  }
  function element(tagName, value = '', attributes = {}) {
    const node = {
      nodeType: 1,
      tagName,
      attributes: new Map(Object.entries(attributes)),
      childNodes: [],
      parentElement: null,
      handlers: new Map(),
      get textContent() {
        return this.childNodes.map(child => child.nodeType === 3 ? child.nodeValue : child.textContent).join('');
      },
      set textContent(next) { this.childNodes = [text(next, this)]; },
      hasAttribute(name) { return this.attributes.has(name); },
      getAttribute(name) { return this.attributes.get(name) ?? null; },
      setAttribute(name, next) { this.attributes.set(name, next); },
      addEventListener(name, handler) { this.handlers.set(name, handler); },
      querySelectorAll() {
        return descendants(this).filter(child => ['aria-label', 'placeholder', 'title', 'content', 'alt'].some(name => child.hasAttribute(name)));
      },
      closest(selector) {
        if (selector === '.words' && this.hasAttribute('data-words')) return this;
        if (selector !== '.words' && (['script', 'style', 'textarea', 'code'].includes(this.tagName) || this.getAttribute('translate') === 'no')) return this;
        return this.parentElement?.closest(selector) ?? null;
      },
      append(child) { child.parentElement = this; this.childNodes.push(child); },
    };
    node.textContent = value;
    return node;
  }
  function descendants(root) {
    return root.childNodes.flatMap(child => child.nodeType === 1 ? [child, ...descendants(child)] : []);
  }
  function textNodes(root) {
    return root.childNodes.flatMap(child => child.nodeType === 3 ? [child] : textNodes(child));
  }
  const html = element('html');
  const heading = element('h2', 'قراءة السوق تبدأ بفهم بيئته.', { 'data-words': '' });
  const copy = element('p', 'سبع سنوات من الخبرة في التداول');
  const summary = element('h3', 'تدريب خاص');
  const error = element('p');
  const toggle = element('button', 'EN', { 'data-language-toggle': '', translate: 'no' });
  const link = element('a', 'اختر برنامجك', { href: linkHref });
  const input = element('input', '', { placeholder: 'الاسم الكامل (مطلوب)', 'aria-label': 'الاسم الكامل (مطلوب)' });
  input.value = 'اسم المستخدم لا يترجم';
  const notes = element('textarea', 'نص شخصي');
  notes.value = 'نص شخصي';
  const slot = element('option', 'الصبح', { value: 'الصبح' });
  const title = element('title', 'محمد بسام | قراءة تدفّق الأوامر والأوبشن');
  const meta = element('meta', '', { content: 'التنقل الرئيسي' });
  const photo = element('img', '', { alt: 'نتيجة محمد بسام في بطولة أكتوبر الشهرية للفوركس 2026' });
  for (const node of [heading, copy, summary, error, toggle, link, input, notes, slot, title, meta, photo]) html.append(node);
  const documentHandlers = new Map();
  const document = {
    nodeType: 9,
    documentElement: html,
    querySelectorAll(selector) {
      const all = descendants(html);
      if (selector === '.words') return all.filter(node => node.hasAttribute('data-words'));
      if (selector === '[data-language-toggle]') return all.filter(node => node.hasAttribute('data-language-toggle'));
      if (selector === 'a[href]') return all.filter(node => node.tagName === 'a' && node.hasAttribute('href'));
      return html.querySelectorAll(selector);
    },
    createTreeWalker(root) {
      const nodes = textNodes(root === document ? html : root);
      let index = -1;
      return { currentNode: null, nextNode() { this.currentNode = nodes[++index]; return !!this.currentNode; } };
    },
    addEventListener(name, handler) { documentHandlers.set(name, handler); },
    dispatchEvent(event) { documentHandlers.get(event.type)?.(event); },
  };
  const location = { href: url, origin: new URL(url).origin };
  let observer;
  const window = { MB: {}, addEventListener() {}, dispatchEvent() {} };
  const context = vm.createContext({
    window, document, location, URL,
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
    NodeFilter: { SHOW_TEXT: 4 },
    localStorage: {
      getItem() { if (storageUnavailable) throw new Error('Storage blocked'); return saved; },
      setItem(key, value) { if (storageUnavailable) throw new Error('Storage blocked'); saved = value; },
    },
    history: { replaceState(state, unused, next) { location.href = String(next); } },
    Event: class { constructor(type) { this.type = type; } },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    MutationObserver: class { constructor(callback) { observer = callback; } observe() {} },
  });
  vm.runInContext(dictionary, context);
  vm.runInContext(source, context);
  return {
    document, location, heading, copy, summary, error, input, notes, slot, title, meta, photo, link, toggle,
    click() { toggle.handlers.get('click')(); },
    mutate(node) { observer([{ type: 'childList', addedNodes: node.childNodes }]); },
    wrapHeading() {
      const words = heading.textContent.trim().split(/\s+/);
      heading.childNodes = [];
      for (const word of words) {
        const wrapper = element('span', word + ' ');
        heading.append(wrapper);
      }
    },
  };
}

test('URL language takes priority and translates document text and accessible attributes', () => {
  const page = createPage({ url: 'https://example.invalid/index.html?lang=en', saved: 'ar' });
  assert.equal(page.document.documentElement.lang, 'en');
  assert.equal(page.document.documentElement.dir, 'ltr');
  assert.equal(page.copy.textContent, 'Seven years of trading experience');
  assert.equal(page.input.getAttribute('placeholder'), 'Full name (required)');
  assert.equal(page.input.getAttribute('aria-label'), 'Full name (required)');
  assert.equal(page.meta.getAttribute('content'), 'Main navigation');
  assert.equal(page.title.textContent, 'Muhammad Bassam | Order Flow & Options Flow');
});

test('language round trip preserves form values, slot values, and linked program hash', () => {
  const page = createPage({ url: 'https://example.invalid/index.html?v=first#programs' });
  page.click();
  assert.equal(page.slot.textContent, 'Morning');
  assert.equal(page.slot.getAttribute('value'), 'الصبح');
  assert.equal(page.input.value, 'اسم المستخدم لا يترجم');
  assert.equal(page.notes.value, 'نص شخصي');
  assert.equal(page.notes.textContent, 'نص شخصي');
  assert.equal(page.link.getAttribute('href'), 'apply.html?lang=en#consult');
  assert.equal(new URL(page.location.href).hash, '#programs');
  assert.equal(new URL(page.location.href).searchParams.get('v'), 'first');
  page.click();
  assert.equal(page.document.documentElement.dir, 'rtl');
  assert.equal(page.copy.textContent, 'سبع سنوات من الخبرة في التداول');
  assert.equal(page.slot.textContent, 'الصبح');
  assert.equal(page.input.value, 'اسم المستخدم لا يترجم');
  assert.equal(page.link.getAttribute('href'), 'apply.html?lang=ar#consult');
});

test('language changes rewrite standalone course links without dropping the course identifier', () => {
  const page = createPage({ linkHref: 'course.html?course=champ&lang=ar' });
  page.click();
  let link = new URL(page.link.getAttribute('href'), page.location.href);
  assert.equal(link.pathname, '/course.html');
  assert.equal(link.searchParams.get('course'), 'champ');
  assert.equal(link.searchParams.get('lang'), 'en');
  page.click();
  link = new URL(page.link.getAttribute('href'), page.location.href);
  assert.equal(link.searchParams.get('course'), 'champ');
  assert.equal(link.searchParams.get('lang'), 'ar');
});

test('switching language on a standalone course page preserves its course and enrollment link', () => {
  const page = createPage({
    url: 'https://example.invalid/course.html?course=champ&lang=ar',
    linkHref: 'apply.html?course=champ&lang=ar#group',
  });
  page.click();
  const location = new URL(page.location.href);
  const enrollment = new URL(page.link.getAttribute('href'), location);
  assert.equal(location.pathname, '/course.html');
  assert.equal(location.searchParams.get('course'), 'champ');
  assert.equal(location.searchParams.get('lang'), 'en');
  assert.equal(enrollment.pathname, '/apply.html');
  assert.equal(enrollment.searchParams.get('course'), 'champ');
  assert.equal(enrollment.searchParams.get('lang'), 'en');
  assert.equal(enrollment.hash, '#group');
});

test('new form errors and summary text translate and restore their current Arabic source', () => {
  const page = createPage({ saved: 'en' });
  page.error.textContent = 'اكتب اسمك الكامل.';
  page.summary.textContent = 'مسار تدريبي متكامل';
  page.mutate(page.error);
  page.mutate(page.summary);
  assert.equal(page.error.textContent, 'Enter your full name.');
  assert.equal(page.summary.textContent, 'A comprehensive learning programme');
  page.mutate(page.error);
  assert.equal(page.error.textContent, 'Enter your full name.');
  page.click();
  assert.equal(page.error.textContent, 'اكتب اسمك الكامل.');
  assert.equal(page.summary.textContent, 'مسار تدريبي متكامل');
});

test('word-split headings retain full phrase translation across language changes', () => {
  const page = createPage();
  page.wrapHeading();
  page.document.addEventListener('site:languagechange', () => page.wrapHeading());
  page.click();
  assert.equal(page.heading.textContent.trim(), 'Reading the market starts with understanding its environment.');
  assert.equal(page.heading.childNodes.every(node => node.tagName === 'span'), true);
  page.click();
  assert.equal(page.heading.textContent.trim(), 'قراءة السوق تبدأ بفهم بيئته.');
});

test('blocked local storage keeps the language toggle usable', () => {
  const page = createPage({ storageUnavailable: true });
  assert.equal(page.document.documentElement.lang, 'ar');
  assert.doesNotThrow(() => page.click());
  assert.equal(page.document.documentElement.lang, 'en');
  assert.equal(page.toggle.textContent, 'عربي');
});

test('competition image descriptions follow the selected language', () => {
  const page = createPage();
  page.click();
  assert.equal(page.photo.getAttribute('alt'), 'Muhammad Bassam’s result in the October 2026 Monthly Forex Trading Championship');
  page.click();
  assert.equal(page.photo.getAttribute('alt'), 'نتيجة محمد بسام في بطولة أكتوبر الشهرية للفوركس 2026');
});
