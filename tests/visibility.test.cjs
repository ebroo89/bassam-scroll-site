const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { defaults, normalize, create } = require('../visibility.js');

const configContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8'), configContext);
const allCourses = JSON.parse(JSON.stringify(configContext.window.MB.courses));

test('default visibility keeps every site section and service while offering only Champ among courses', () => {
  const before = JSON.stringify(allCourses);
  assert.equal(Object.values(create(undefined, allCourses).state.sections).every(Boolean), true);
  const visible = create(undefined, allCourses);
  assert.deepEqual(visible.programs, ['group', 'private', 'consult', 'indicator']);
  assert.deepEqual(visible.courses.map(course => course.id), ['champ']);
  assert.equal(visible.isProgramVisible('private'), true);
  assert.equal(visible.isProgramVisible('indicator'), true);
  assert.equal(visible.isCourseVisible('foundations'), false);
  assert.equal(visible.isCourseVisible('missing'), false);
  assert.equal(JSON.stringify(allCourses), before);
  assert.deepEqual(Array.from(visible.courses[0].includes), ['foundations', 'order-flow', 'options-flow', 'psychology', 'edge']);
  for (const id of visible.courses[0].includes) assert.ok(allCourses.find(course => course.id === id));
});

test('visibility accepts only known boolean settings and keeps its defaults unchanged', () => {
  const before = JSON.stringify(defaults);
  const state = normalize({
    sections: { hero: false, programs: 'false', injected: true },
    programs: { private: true, consult: 0 },
    courses: { champ: false, foundations: true, invented: true },
  });
  assert.equal(state.sections.hero, false);
  assert.equal(state.sections.programs, true);
  assert.equal(state.programs.private, true);
  assert.equal(state.programs.consult, true);
  assert.equal(state.courses.champ, false);
  assert.equal(state.courses.foundations, true);
  assert.equal(Object.hasOwn(state.sections, 'injected'), false);
  assert.equal(Object.hasOwn(state.courses, 'invented'), false);
  assert.equal(JSON.stringify(defaults), before);
});

test('turning off the parent programs section overrides enabled individual offers', () => {
  const visible = create({ sections: { programs: false }, programs: { private: true, indicator: true } }, allCourses);
  assert.deepEqual(visible.programs, []);
  assert.deepEqual(visible.courses, []);
  for (const id of ['private', 'group', 'consult', 'indicator']) assert.equal(visible.isProgramVisible(id), false);
});

test('the group category disappears when all its individual courses are hidden', () => {
  const visible = create({ courses: { champ: false } }, allCourses);
  assert.deepEqual(visible.courses, []);
  assert.deepEqual(visible.programs, ['private', 'consult', 'indicator']);
  assert.equal(visible.isProgramVisible('group'), false);
});

test('visibility can restore all retained programs and courses', () => {
  const enabled = Object.fromEntries(['sections', 'programs', 'courses'].map(group =>
    [group, Object.fromEntries(Object.keys(defaults[group]).map(key => [key, true]))]));
  const visible = create(enabled, allCourses);
  assert.equal(visible.courses.length, 9);
  assert.deepEqual(visible.programs, ['group', 'private', 'consult', 'indicator']);
});

test('applying visibility hides navigation, private controls and the guide while keeping available panels', () => {
  const nodes = new Map();
  const doc = {
    querySelectorAll(selector) { return nodes.get(selector) || []; },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
  };
  const element = (dataset = {}, input = null) => ({
    dataset, hidden: false, textContent: '',
    querySelector() { return input; },
    setAttribute() {},
  });
  const section = element({ siteSection: 'edge' });
  const nav = { hidden: false, getAttribute() { return '#edge'; } };
  const tabs = ['group', 'private', 'consult', 'indicator'].map(id => element({ programTab: id }));
  const choices = ['group', 'private', 'consult', 'indicator'].map(id => element({ programChoice: id }, { disabled: false }));
  const panels = ['group', 'private', 'consult', 'indicator'].map(id => element({ programPanel: id }));
  const noOffers = element();
  const guide = element();
  nodes.set('[data-site-section]', [section]);
  nodes.set('a[href]', [nav]);
  nodes.set('[data-program-tab]', tabs);
  nodes.set('[data-program-choice]', choices);
  nodes.set('[data-program-panel]', panels);
  nodes.set('[data-no-offers]', [noOffers]);
  nodes.set('[data-learning-guide]', [guide]);
  create({ sections: { edge: false }, programs: { private: false, indicator: false } }, allCourses).apply(doc);
  assert.equal(section.hidden, true);
  assert.equal(nav.hidden, true);
  assert.deepEqual(tabs.filter(tab => !tab.hidden).map(tab => tab.dataset.programTab), ['group', 'consult']);
  assert.equal(choices.find(choice => choice.dataset.programChoice === 'private').querySelector().disabled, true);
  assert.deepEqual(panels.filter(panel => !panel.hidden).map(panel => panel.dataset.programPanel), ['group']);
  assert.equal(guide.hidden, true);
  assert.equal(noOffers.hidden, true);
});

for (const baseURI of [
  'https://example.invalid/site/apply.html?lang=en',
  'https://example.invalid/site/course.html?course=champ',
  'file:///C:/preview/apply.html',
]) {
  test(`section visibility follows home-page links from ${baseURI}`, () => {
    const cases = [
      ['#reads', true],
      ['index.html#reads', true],
      ['index.html?lang=en#reads', true],
      ['./index.html?lang=ar#reads', true],
      [new URL('index.html#reads', baseURI).href, true],
      ['#programs', false],
      ['index.html#programs', false],
      ['#main-content', false],
      ['https://external.invalid/site/index.html#reads', false],
      ['//external.invalid/site/index.html#reads', false],
      ['http://example.invalid/site/index.html#reads', false],
      ['../other/index.html#reads', false],
      ['apply.html#reads', false],
      ['mailto:contact@example.invalid#reads', false],
      ['https://[invalid', false],
    ];
    const links = cases.map(([href]) => ({ hidden: false, getAttribute() { return href; } }));
    const doc = {
      baseURI,
      querySelectorAll(selector) {
        if (selector === 'a[href]') return links;
        if (selector === 'a[href^="#"]') return links.filter(link => link.getAttribute('href').startsWith('#'));
        return [];
      },
      querySelector() { return null; },
    };
    create({ sections: { reads: false } }, allCourses).apply(doc);
    cases.forEach(([href, hidden], index) => assert.equal(links[index].hidden, hidden, href));
    create({ sections: { reads: true } }, allCourses).apply(doc);
    links.forEach(link => assert.equal(link.hidden, false, link.getAttribute('href')));
  });
}