const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(path.join(root, 'translations.js'), 'utf8'), context);
const courses = context.window.MB.courses;
const translations = context.window.MB_TRANSLATIONS;
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8').replace(/\r\n/g, '\n');

// Exercise the shared course renderer and page selection with a minimal DOM.
function createCoursePage({ query = 'course=champ', lang = 'ar', visibleIds = ['champ'] } = {}) {
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.dataset = {};
      this.attributes = new Map();
      this.textContent = '';
      this.hidden = false;
      this.style = { setProperty() {} };
    }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    querySelector(selector) { return nodes.get(selector) || null; }
  }
  const nodes = new Map();
  for (const selector of ['[data-course-page]', '[data-course-unavailable]', '[data-course-image]',
    '[data-course-inclusions]', '[data-course-included-list]', '[data-course-topics]', '[data-course-apply]',
    '[data-course-detail]', '[data-champ-curriculum]', '[data-curriculum-modules]', '[data-course-list]', '.course-tabs']) {
    nodes.set(selector, new Element());
  }
  nodes.get('[data-course-detail]').hidden = true;
  nodes.get('[data-champ-curriculum]').hidden = true;
  const document = {
    documentElement: { lang },
    createElement: tag => new Element(tag),
    querySelector: selector => nodes.get(selector) || null,
  };
  const pageContext = vm.createContext({
    C: { nameEn: 'Muhammad Bassam' },
    allCourses: courses, courses: courses.filter(course => visibleIds.includes(course.id)),
    window: { MB: { courses } }, document, URL,
    location: { href: `https://example.invalid/course.html${query ? `?${query}` : ''}` },
    $: selector => nodes.get(selector) || null,
    $$: () => [],
    fill(selector, value) {
      if (!nodes.has(selector)) nodes.set(selector, new Element());
      const node = nodes.get(selector);
      node.textContent = value;
      node.hidden = !value;
    },
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'course-curriculum.js'), 'utf8'), pageContext);
  const start = appSource.indexOf('  const coursePrice =');
  const end = appSource.indexOf('  const catalogue =');
  assert.ok(start >= 0 && end > start, 'Shared course renderer block is missing');
  vm.runInContext(appSource.slice(start, end) + '\nglobalThis.courseRoute = courseLink;', pageContext);
  return { nodes, context: pageContext, document, Element };
}
const expectedPrices = {
  foundations: 499,
  psychology: 300,
  edge: 400,
  'order-flow': 899,
  'options-flow': 1199,
  quant: 1490,
  'zero-intermediate': 1490,
  'order-options': 1790,
  champ: 2490,
};

test('the catalogue has six courses and three bundles with the current configured prices', () => {
  assert.equal(courses.filter(course => course.type === 'course').length, 6);
  assert.equal(courses.filter(course => course.type === 'bundle').length, 3);
  assert.equal(new Set(courses.map(course => course.id)).size, 9);
  for (const course of courses) assert.equal(course.price, expectedPrices[course.id]);
});

test('Champ does not advertise hidden Quant and retains unresolved support duration', () => {
  const champ = courses.find(course => course.id === 'champ');
  assert.equal(champ.note, undefined);
  assert.match(champ.support, /تُحدّد مدة المتابعة قبل التسجيل/);
});

test('all course copy has an English translation', () => {
  for (const course of courses) {
    const strings = [course.title, course.level, course.summary, ...course.topics, course.fit, course.note, course.priceLabel].filter(Boolean);
    if (course.support) strings.push(course.support);
    for (const value of strings.filter(value => /[\u0600-\u06ff]/u.test(value))) {
      assert.equal(typeof translations[value], 'string', value);
      assert.ok(translations[value].trim(), value);
    }
  }
});

test('each course references an existing nonempty raster image', () => {
  const images = courses.filter(course => course.type === 'course')
    .map(course => path.join(root, course.image || `assets/img/courses-${course.id}.jpg`));
  assert.equal(images.length, 6);
  assert.equal(new Set(images).size, 6, "Each course needs a dedicated image");
  for (const filename of images) {
    assert.ok(fs.existsSync(filename), `Missing course artwork: ${path.basename(filename)}`);
    const content = fs.readFileSync(filename);
    assert.ok(content.length > 3000, `Truncated course artwork: ${path.basename(filename)}`);
    const jpeg = content[0] === 0xff && content[1] === 0xd8;
    const png = content[0] === 0x89 && content.subarray(1, 4).toString() === 'PNG';
    assert.ok(jpeg || png, `Non-raster course artwork: ${path.basename(filename)}`);
  }
});

test('bundle covers combine exactly the included course images', () => {
  const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8').replace(/\r\n/g, '\n');
  const declaration = source.match(/const bundleCourseImages = (\{[\s\S]*?\n  \});/);
  assert.ok(declaration, 'Bundle cover mapping is missing');
  const mapping = vm.runInNewContext(`(${declaration[1]})`);
  assert.deepEqual(JSON.parse(JSON.stringify(mapping)), {
    'zero-intermediate': ['foundations', 'order-flow'],
    'order-options': ['order-flow', 'options-flow'],
    champ: ['foundations', 'order-flow', 'options-flow'],
  });
  for (const ids of Object.values(mapping)) {
    for (const id of ids) {
      assert.ok(fs.existsSync(path.join(root, 'assets', 'img', `courses-${id}.jpg`)));
    }
  }
});

for (const lang of ['ar', 'en']) {
  test(`course details use a standalone ${lang} URL and preserve the enrollment destination`, () => {
    const page = createCoursePage({ lang });
    const route = new URL(page.context.courseRoute('champ'));
    assert.equal(route.pathname, '/course.html');
    assert.equal(route.searchParams.get('course'), 'champ');
    assert.equal(route.searchParams.get('lang'), lang);
    assert.equal(page.nodes.get('[data-course-page]').hidden, false);
    assert.equal(page.nodes.get('[data-course-unavailable]').hidden, true);
    assert.equal(page.nodes.get('[data-course-title]').textContent, 'From Zero to Champ');
    assert.equal(page.document.title, 'From Zero to Champ | Muhammad Bassam');
    assert.equal(page.nodes.get('[data-course-price]').textContent, '$2,490');
    assert.equal(page.nodes.get('[data-course-original]').textContent, '$4,500');
    // Enrolment happens in the pay box at the end of the page, after the curriculum.
    assert.equal(page.nodes.get('[data-course-apply]').href, '#course-enroll');
    assert.equal(page.nodes.get('[data-champ-curriculum]').hidden, false);
    assert.deepEqual(Array.from(page.nodes.get('[data-curriculum-modules]').children, card => card.dataset.curriculumModule),
      ['foundations', 'order-flow', 'options-flow', 'psychology', 'edge']);
    assert.equal(page.nodes.get('[data-course-included-list]').children.length, 5);
    assert.doesNotMatch(page.nodes.get('[data-course-benefits]').textContent, /مجان|free/i);
    assert.equal(page.nodes.get('[data-course-note]').hidden, true);
  });
}

for (const query of ['', 'course=missing', ...courses.filter(course => course.id !== 'champ').map(course => `course=${course.id}`)]) {
  test(`a missing, unknown or hidden course URL cannot expose enrollment: ${query || '(no query)'}`, () => {
    const page = createCoursePage({ query });
    assert.equal(page.nodes.get('[data-course-page]').hidden, true);
    assert.equal(page.nodes.get('[data-course-unavailable]').hidden, false);
    assert.equal(page.nodes.get('[data-course-detail]').hidden, true);
    assert.equal(page.nodes.get('[data-champ-curriculum]').hidden, true);
    assert.equal(page.nodes.get('[data-course-apply]').href, undefined);
    assert.equal(page.nodes.has('[data-course-price]'), false);
  });
}

test('catalogue cards provide native details anchors and leave modified clicks to the browser', () => {
  const page = createCoursePage();
  const show = appSource.match(/const showList = \(\) => \{([\s\S]*?)\n    \};\n\n    catalogue\.addEventListener/);
  assert.ok(show, 'Catalogue renderer is missing');
  page.context.list = page.nodes.get('[data-course-list]');
  page.context.catalogue = {};
  page.context.courseType = 'bundle';
  vm.runInContext(`(function () {${show[1]}\n})()`, page.context);
  const card = page.context.list.children[0];
  const link = card.children.find(child => child.dataset.courseOpen === 'champ');
  assert.equal(link.tagName, 'A');
  assert.equal(new URL(link.href).pathname, '/course.html');
  assert.equal(new URL(link.href).searchParams.get('course'), 'champ');
  const handler = appSource.match(/catalogue\.addEventListener\("click", \(event\) => \{([\s\S]*?)\n    \}\);\n    document\.addEventListener/);
  assert.ok(handler, 'Catalogue click handler is missing');
  const callback = vm.runInContext(`(event) => {${handler[1]}\n}`, page.context);
  for (const modifier of [{}, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
    callback({ ...modifier, target: { closest() { return null; } }, preventDefault() { assert.fail('Details anchor navigation must remain native'); } });
  }
});

test('the main document does not contain an inline course detail or Champ curriculum', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /data-course-detail|data-champ-curriculum/);
  const coursePage = fs.readFileSync(path.join(root, 'course.html'), 'utf8');
  assert.match(coursePage, /data-course-page/);
  assert.match(coursePage, /data-course-unavailable/);
  assert.match(coursePage, /<h1[^>]+data-course-title/);
});

test('the initial document only advertises Champ before scripts run', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const cards = html.match(/<article class="course-card[^"]*">[\s\S]*?<\/article>/g) || [];
  assert.equal(cards.length, 1);
  assert.match(cards[0], /From Zero to Champ/);
  assert.doesNotMatch(html, /course=(?:zero-intermediate|order-options)|course-bonus-note|edge-offer/);
  for (const card of cards) {
    assert.match(card, /<img[^>]+src="assets\/img\//);
    assert.match(card, /href="apply\.html\?course=/);
  }
});


test('bundle contents are explicit and separate from the learning outcomes', () => {
  const expected = {
    'zero-intermediate': ['foundations', 'order-flow'],
    'order-options': ['order-flow', 'options-flow'],
    champ: ['foundations', 'order-flow', 'options-flow', 'psychology', 'edge'],
  };
  for (const [id, includes] of Object.entries(expected)) {
    assert.deepEqual(Array.from(courses.find(course => course.id === id).includes || []), includes);
  }
  assert.equal(courses.find(course => course.id === 'zero-intermediate').title, 'من الفهم إلى القرار');
});

test('the public copy contains no obsolete free-course offers or hidden registration options', () => {
  for (const course of courses) assert.equal(course.freeWith, undefined);
  const application = fs.readFileSync(path.join(root, 'apply.html'), 'utf8');
  const options = application.match(/<select name="course">([\s\S]*?)<\/select>/)[1];
  assert.equal((options.match(/<option /g) || []).length, 1);
  assert.match(options, /value="champ"/);
  for (const key of Object.keys(translations)) {
    assert.doesNotMatch(key, /مجانًا مع|مشمول.+مجانًا|دورة بناء الأفضلية،/);
  }
});

test('all standalone courses and the combined flow bundle are waitlisted', () => {
  for (const id of ['foundations', 'order-flow', 'options-flow', 'quant', 'psychology', 'edge', 'order-options']) {
    assert.equal(courses.find(course => course.id === id).availability, 'waitlist', id);
  }
});

test('open bundles carry the requested current and original prices', () => {
  const starter = courses.find(course => course.id === 'zero-intermediate');
  const champ = courses.find(course => course.id === 'champ');
  assert.deepEqual([starter.availability, starter.originalPrice, starter.price], ['open', 2099, 1490]);
  assert.deepEqual([champ.availability, champ.originalPrice, champ.price], ['open', 4500, 2490]);
});

test('Champ contains five curriculum cards including psychology and statistical edge, with Quant kept separate', () => {
  const champ = courses.find(course => course.id === 'champ');
  assert.deepEqual(Array.from(champ.curriculum), ['foundations', 'order-flow', 'options-flow', 'psychology', 'edge']);
  assert.equal(new Set(champ.curriculum).size, 5);
  assert.ok(champ.curriculum.every(id => courses.some(course => course.id === id)));
  assert.equal(champ.curriculum.includes('quant'), false);
});
