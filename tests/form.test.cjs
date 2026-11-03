const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

// These tests exercise app.js through its DOM events. The small DOM adapter
// models only the elements used by the site; browser layout is checked separately.
function createPage(options = {}) {
  let document;
  class Element {
    constructor(text = '') {
      this.textContent = text;
      this.hidden = false;
      this.disabled = false;
      this.dataset = {};
      this.attributes = new Map();
      this.queries = new Map();
      this.selections = new Map();
      this.listeners = new Map();
      this.children = [];
      this.style = { setProperty() {} };
      const classes = new Set();
      this.classList = {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        contains: (name) => classes.has(name),
        toggle(name, value = !classes.has(name)) {
          if (value) classes.add(name); else classes.delete(name);
          return value;
        },
      };
    }
    querySelector(selector) { return this.queries.get(selector) || this.querySelectorAll(selector)[0] || null; }
    querySelectorAll(selector) {
      const found = this.selections.get(selector);
      return typeof found === 'function' ? found() : found || [];
    }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
    addEventListener(name, handler) {
      const handlers = this.listeners.get(name) || [];
      handlers.push(handler);
      this.listeners.set(name, handlers);
    }
    async dispatch(name, properties = {}) {
      const event = { target: this, preventDefault() {}, ...properties };
      for (const handler of this.listeners.get(name) || []) await handler(event);
    }
    focus() { document.activeElement = this; }
    replaceChildren(...children) { this.children = children; }
    appendChild(child) { this.children.push(child); return child; }
    closest(selector) { return selector === 'a' && this.tagName === 'A' ? this : null; }
    scrollIntoView() {}
  }

  document = new Element();
  document.createElement = (tagName) => Object.assign(new Element(), { tagName: tagName.toUpperCase() });
  const form = new Element();
  const defaultFields = {
    name: 'Test Applicant', phone: '+971 50 123 4567', email: 'test@example.invalid',
    country: '', level: 'beginner', market: 'indices', goal: '', topic: '',
    slot: 'الصبح', tv_user: '', company: '',
  };
  const fields = Object.fromEntries(Object.entries(defaultFields).map(([name, value]) => [name, Object.assign(new Element(), { name, value })]));
  fields.consent = Object.assign(new Element(), { name: 'consent', type: 'checkbox', checked: true, value: 'on' });
  form.elements = fields;
  const programs = ['private', 'group', 'consult', 'indicator'].map((value) => {
    const input = Object.assign(new Element(), { name: 'program', value, type: 'radio' });
    let checked = value === 'private';
    Object.defineProperty(input, 'checked', {
      get: () => checked,
      set(value) {
        if (value) programs.forEach((other) => { if (other !== input) other.checked = false; });
        checked = value;
      },
    });
    form.queries.set(`input[name=program][value="${value}"]`, input);
    return input;
  });
  const errors = Object.fromEntries(['name', 'phone', 'email', 'tv_user', 'consent'].map((name) => {
    const error = Object.assign(new Element(), { id: `${name}-error`, hidden: true, dataset: { errorFor: name } });
    fields[name].setAttribute('aria-describedby', error.id);
    form.queries.set(`[data-error-for="${name}"]`, error);
    return [name, error];
  }));
  const headings = [1, 2, 3].map(() => new Element());
  const steps = headings.map((heading, index) => {
    const step = new Element();
    step.dataset.step = String(index + 1);
    step.hidden = index !== 0;
    step.queries.set('legend', heading);
    return step;
  });
  const conditional = [
    ['consult', [fields.topic, fields.slot]], ['indicator', [fields.tv_user]],
    ['private group', [fields.goal]], ['group', []],
  ].map(([forPrograms, controls]) => {
    const wrapper = new Element();
    wrapper.dataset.for = forPrograms;
    wrapper.selections.set('input, select, textarea', controls);
    return wrapper;
  });
  form.selections.set('.step', steps);
  form.selections.set('[data-for]', conditional);
  form.selections.set('[data-error-for]', Object.values(errors));
  form.selections.set('.bad', () => Object.values(fields).filter((field) => field.classList.contains('bad')));
  const progress = [new Element(), new Element(), new Element()];
  document.selections.set('[data-progress] li', progress);

  const nodes = {};
  for (const selector of [
    '#nav', '[data-back]', '[data-next]', '[data-submit]', '.form-msg',
    '[data-sum-img]', '[data-sum-k]', '[data-sum-title]', '[data-sum-text]', '[data-sum-price]',
    '[data-done-text]', '[data-done-title]', '[data-preview-notice]', '[data-nav-toggle]', '[data-nav-links]',
  ]) {
    nodes[selector] = new Element();
    document.queries.set(selector, nodes[selector]);
  }
  form.queries.set('.form-msg', nodes['.form-msg']);
  const done = Object.assign(new Element(), { hidden: true });
  nodes['[data-done-title]'].textContent = 'وصل طلبك، شكرًا.';
  nodes['[data-preview-notice]'].hidden = true;
  document.queries.set('#applyDone', done);
  if (options.withForm !== false) document.queries.set('#applyForm', form);
  const contactList = new Element();
  document.selections.set('[data-contact-list]', [contactList]);
  const globals = new Element();
  const media = new Map();
  const calls = [];
  const pageUrl = new URL(options.url || 'https://example.invalid/apply.html');
  const context = {
    window: { MB: { webhookUrl: options.endpoint ?? '', ...options.config } },
    document, URL, Date, AbortController, console: { info() {} },
    location: { hash: options.hash ?? '#private', hostname: options.hostname ?? pageUrl.hostname, href: pageUrl.href, protocol: pageUrl.protocol },
    scrollY: 0, innerHeight: 800,
    setTimeout: options.setTimeout || setTimeout,
    clearTimeout: options.clearTimeout || clearTimeout,
    scrollTo() {},
    addEventListener: globals.addEventListener.bind(globals),
    matchMedia(query) {
      if (!media.has(query)) {
        media.set(query, Object.assign(new Element(), {
          matches: query.includes('max-width') ? !!options.mobile : !!options.reducedMotion,
        }));
      }
      return media.get(query);
    },
    FormData: class {
      *[Symbol.iterator]() {
        const selected = programs.find((radio) => radio.checked);
        if (selected) yield ['program', selected.value];
        for (const field of Object.values(fields)) {
          if (!field.disabled && (field.type !== 'checkbox' || field.checked)) yield [field.name, field.value];
        }
      }
    },
    async fetch(url, request) {
      calls.push({ url, request });
      if (options.fetch) return options.fetch(url, request);
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    },
  };
  const page = { context, document, form, fields, programs, errors, headings, steps, progress, nodes, done, contactList, globals, calls };
  page.start = () => vm.runInNewContext(appSource, context, { filename: 'app.js' });
  page.next = () => nodes['[data-next]'].dispatch('click');
  page.submit = () => form.dispatch('submit');
  return page;
}

test('an empty endpoint visibly labels the form as a preview', () => {
  const page = createPage();
  page.start();
  assert.equal(page.nodes['[data-preview-notice]'].hidden, false);
  assert.match(page.nodes['[data-submit]'].textContent, /جرّب|تجربة/);
});

test('preview completion differs from an acknowledged application and sends no data', async () => {
  const page = createPage();
  page.start();
  await page.next();
  await page.submit();
  assert.equal(page.calls.length, 0);
  assert.equal(page.done.hidden, false);
  assert.match(page.nodes['[data-done-title]'].textContent, /معاينة|تجربة/);
  assert.equal(page.document.activeElement, page.nodes['[data-done-title]']);
});

test('a relative endpoint on localhost remains a labelled preview', () => {
  const page = createPage({ endpoint: '/api/apply.php', hostname: 'localhost' });
  page.start();
  assert.equal(page.nodes['[data-preview-notice]'].hidden, false);
});

test('HTTP 200 HTML is rejected instead of displaying receipt', async () => {
  const page = createPage({ endpoint: '/api/apply.php', fetch: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('HTML'); } }) });
  page.start();
  await page.next();
  await page.submit();
  assert.equal(page.done.hidden, true);
  assert.equal(page.form.hidden, false);
  assert.ok(page.nodes['.form-msg'].textContent);
  assert.equal(page.nodes['[data-submit]'].disabled, false);
});

for (const responseBody of [{}, { ok: false }, { ok: 'true' }]) {
  test(`backend acknowledgment requires the boolean true, got ${JSON.stringify(responseBody)}`, async () => {
    const page = createPage({ endpoint: '/api/apply.php', fetch: async () => ({ ok: true, status: 200, json: async () => responseBody }) });
    page.start();
    await page.next();
    await page.submit();
    assert.equal(page.done.hidden, true);
    assert.equal(page.form.hidden, false);
  });
}

test('a successful backend acknowledgment shows and focuses the receipt', async () => {
  const page = createPage({ endpoint: '/api/apply.php' });
  page.start();
  await page.next();
  await page.submit();
  assert.equal(page.calls.length, 1);
  assert.equal(page.done.hidden, false);
  assert.equal(page.document.activeElement, page.nodes['[data-done-title]']);
});

test('rate limiting offers retry guidance without claiming the request arrived', async () => {
  const page = createPage({ endpoint: '/api/apply.php', fetch: async () => ({ ok: false, status: 429, json: async () => ({}) }) });
  page.start();
  await page.next();
  await page.submit();
  assert.equal(page.done.hidden, true);
  assert.match(page.nodes['.form-msg'].textContent, /انتظر/);
  assert.doesNotMatch(page.nodes['.form-msg'].textContent, /وصل طلبك/);
});

test('a phone containing only dashes is rejected beside its field', async () => {
  const page = createPage();
  page.fields.phone.value = '--------';
  page.start();
  await page.next();
  assert.equal(page.steps[1].hidden, false);
  assert.equal(page.fields.phone.getAttribute('aria-invalid'), 'true');
  assert.equal(page.fields.phone.getAttribute('aria-describedby'), 'phone-error');
  assert.ok(page.errors.phone.textContent);
  assert.equal(page.document.activeElement, page.fields.phone);
});

for (const phone of ['+٩٧١ ٥٠ ١٢٣ ٤٥٦٧', '+۹۷۱ ۵۰ ۱۲۳ ۴۵۶۷', '+971 (50) 123-4567']) {
  test(`normalizes a supported phone format before sending: ${phone}`, async () => {
    const page = createPage({ endpoint: '/api/apply.php' });
    page.fields.phone.value = phone;
    page.start();
    await page.next();
    await page.submit();
    assert.equal(page.calls.length, 1);
    assert.equal(JSON.parse(page.calls[0].request.body).phone, '+971501234567');
  });
}

test('invalid fields have separate errors and the first receives focus', async () => {
  const page = createPage();
  page.fields.name.value = '';
  page.fields.email.value = 'invalid';
  page.start();
  await page.next();
  for (const name of ['name', 'email']) {
    assert.equal(page.fields[name].getAttribute('aria-invalid'), 'true');
    assert.equal(page.errors[name].hidden, false);
    assert.ok(page.errors[name].textContent);
  }
  assert.equal(page.document.activeElement, page.fields.name);
});

test('editing an invalid field clears its stale error', async () => {
  const page = createPage();
  page.fields.email.value = 'invalid';
  page.start();
  await page.next();
  assert.equal(page.fields.email.getAttribute('aria-invalid'), 'true');
  page.fields.email.value = 'corrected@example.invalid';
  await page.form.dispatch('input', { target: page.fields.email });
  assert.notEqual(page.fields.email.getAttribute('aria-invalid'), 'true');
  assert.equal(page.errors.email.hidden, true);
});

test('next moves focus into the revealed step and updates accessible progress', async () => {
  const page = createPage();
  page.start();
  await page.next();
  assert.equal(page.document.activeElement, page.headings[2]);
  assert.equal(page.progress[2].getAttribute('aria-current'), 'step');
  assert.equal(page.progress[1].getAttribute('aria-current'), null);
});

test('missing consent is identified and focused', async () => {
  const page = createPage();
  page.fields.consent.checked = false;
  page.start();
  await page.next();
  await page.submit();
  assert.equal(page.fields.consent.getAttribute('aria-invalid'), 'true');
  assert.ok(page.errors.consent.textContent);
  assert.equal(page.document.activeElement, page.fields.consent);
});

test('an indicator request requires its TradingView username', async () => {
  const page = createPage({ hash: '#indicator' });
  page.start();
  await page.next();
  await page.submit();
  assert.equal(page.fields.tv_user.getAttribute('aria-invalid'), 'true');
  assert.equal(page.document.activeElement, page.fields.tv_user);
});

test('an in-flight submission cannot send the same application twice', async () => {
  let resolveFetch;
  const response = new Promise((resolve) => { resolveFetch = resolve; });
  const page = createPage({ endpoint: '/api/apply.php', fetch: () => response });
  page.start();
  await page.next();
  const first = page.submit();
  const second = page.submit();
  try {
    assert.equal(page.calls.length, 1);
  } finally {
    resolveFetch({ ok: true, status: 200, json: async () => ({ ok: true }) });
    await Promise.all([first, second]);
  }
});

test('hidden program-specific answers are excluded from another program request', async () => {
  const page = createPage({ endpoint: '/api/apply.php', hash: '#consult' });
  page.fields.goal.value = 'Old training answer';
  page.fields.tv_user.value = 'old_username';
  page.fields.topic.value = 'Current consultation question';
  page.start();
  await page.next();
  await page.submit();
  const payload = JSON.parse(page.calls[0].request.body);
  assert.equal(payload.goal, '');
  assert.equal(payload.tv_user, '');
  assert.equal(payload.topic, 'Current consultation question');
});

test('configured contact links are rendered while unsafe destinations are omitted', () => {
  const page = createPage({ withForm: false, config: {
    whatsapp: '971501234567', telegram: 'javascript:alert(1)',
    instagram: 'https://instagram.com/test.account', email: 'contact@example.invalid',
  } });
  page.start();
  assert.equal(page.contactList.children.length, 3);
  assert.equal(page.contactList.children[0].href, 'https://wa.me/971501234567');
  assert.equal(page.contactList.children[1].href, 'https://instagram.com/test.account');
  assert.equal(page.contactList.children[2].href, 'mailto:contact@example.invalid');
});

test('an empty contact configuration hides the contact container', () => {
  const page = createPage({ withForm: false });
  page.start();
  assert.equal(page.contactList.hidden, true);
});

test('the mobile navigation exposes links and Escape restores the toggle focus', async () => {
  const page = createPage({ withForm: false, mobile: true });
  page.start();
  assert.equal(page.nodes['[data-nav-links]'].hidden, true);
  await page.nodes['[data-nav-toggle]'].dispatch('click');
  assert.equal(page.nodes['[data-nav-links]'].hidden, false);
  assert.equal(page.nodes['[data-nav-toggle]'].getAttribute('aria-expanded'), 'true');
  await page.nodes['#nav'].dispatch('keydown', { key: 'Escape' });
  assert.equal(page.nodes['[data-nav-links]'].hidden, true);
  assert.equal(page.document.activeElement, page.nodes['[data-nav-toggle]']);
});

test('a configured pending award keeps its title and shows its qualification', () => {
  const page = createPage({ withForm: false, config: { award: {
    title: 'المركز الأول في بطولة أكتوبر', confirmed: false,
    note: 'بانتظار التدقيق النهائي', proofUrl: 'https://example.invalid/results',
  } } });
  const title = page.document.createElement('h2');
  const note = page.document.createElement('p');
  const proof = page.document.createElement('a');
  page.document.selections.set('[data-award-title]', [title]);
  page.document.selections.set('[data-award-note]', [note]);
  page.document.selections.set('[data-award-proof]', [proof]);
  page.start();
  assert.equal(title.textContent, 'المركز الأول في بطولة أكتوبر');
  assert.equal(note.textContent, 'بانتظار التدقيق النهائي');
  assert.equal(note.hidden, false);
  assert.equal(proof.href, 'https://example.invalid/results');
});

test('a compact configured brand label is used independently of the full name', () => {
  const page = createPage({ withForm: false, config: { nameEn: 'Muhammad Bassam', brandName: 'M · Bassam' } });
  const brand = page.document.createElement('a');
  page.document.selections.set('[data-brand-name]', [brand]);
  page.start();
  assert.equal(brand.textContent, 'M · Bassam');
});

test('a stalled request times out and restores the form for a retry', async () => {
  let expire;
  const page = createPage({
    endpoint: '/api/apply.php',
    setTimeout(callback) { expire = callback; return 1; },
    clearTimeout() {},
    fetch: async (url, request) => {
      if (!request.signal) throw new Error('No request deadline');
      return new Promise((resolve, reject) => {
        request.signal.addEventListener('abort', () => reject(new Error('Timed out')));
      });
    },
  });
  page.start();
  await page.next();
  const submission = page.submit();
  assert.equal(typeof expire, 'function');
  expire();
  await submission;
  assert.equal(page.form.hidden, false);
  assert.equal(page.done.hidden, true);
  assert.equal(page.nodes['[data-submit]'].disabled, false);
  assert.equal(page.fields.name.value, 'Test Applicant');
  assert.ok(page.nodes['.form-msg'].textContent);
});

for (const [url, expectedImage] of [
  ['https://example.invalid/index.html', 'https://example.invalid/assets/img/bassam.jpg'],
  ['file:///C:/Users/MBT/Documents/ChatGPT/WEBSITE/bassam-scroll-site/index.html', 'file:///C:/Users/MBT/Documents/ChatGPT/WEBSITE/bassam-scroll-site/assets/img/bassam.jpg'],
]) {
  test(`the existing relative portrait remains visible when opened from ${new URL(url).protocol}`, () => {
    assert.equal(fs.existsSync(path.join(__dirname, '..', 'assets', 'img', 'bassam.jpg')), true);
    const page = createPage({ withForm: false, url, config: { photo: 'assets/img/bassam.jpg' } });
    const image = page.document.createElement('img');
    page.document.selections.set('[data-hero-portrait] img, img[data-portrait]', [image]);
    page.start();
    assert.equal(image.hidden, false);
    assert.equal(image.src, expectedImage);
  });
}

test('opening a local document does not permit file URLs for the endpoint, proof or contacts', async () => {
  const page = createPage({
    url: 'file:///C:/Users/MBT/Documents/ChatGPT/WEBSITE/bassam-scroll-site/apply.html',
    endpoint: 'file:///C:/requests.json',
    config: { award: { proofUrl: 'file:///C:/result.html' }, telegram: 'file:///C:/contact.html' },
  });
  const proof = page.document.createElement('a');
  page.document.selections.set('[data-award-proof]', [proof]);
  page.start();
  await page.next();
  await page.submit();
  assert.equal(page.calls.length, 0);
  assert.equal(page.done.hidden, true);
  assert.equal(proof.hidden, true);
  assert.equal(page.contactList.hidden, true);
});
