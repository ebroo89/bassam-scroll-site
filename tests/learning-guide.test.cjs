const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { recommend, resolveRecommendation } = require('../learning-guide.js');

test('new learners seeking order flow start with the foundation bundle', () => {
  assert.equal(recommend('new', 'orderflow').course, 'zero-intermediate');
  assert.equal(recommend('basic', 'orderflow').course, 'order-flow');
});

test('new learners seeking options start with foundations and an explained prerequisite', () => {
  const result = recommend('new', 'options');
  assert.equal(result.course, 'foundations');
  assert.match(result.reason, /بنية السوق/);
  assert.match(result.reason, /الشموع/);
  assert.equal(recommend('experienced', 'options').course, 'options-flow');
});

test('technical and focused service goals keep their independent destinations', () => {
  assert.equal(recommend('new', 'quant').course, 'quant');
  assert.match(recommend('new', 'quant').reason, /برمجية/);
  assert.equal(recommend('basic', 'private').program, 'private');
  assert.equal(recommend('experienced', 'consult').program, 'consult');
});

test('all supported combinations produce one destination and never default to Champ', () => {
  for (const experience of ['new', 'basic', 'experienced']) {
    for (const goal of ['foundations', 'orderflow', 'options', 'quant', 'private', 'consult']) {
      const result = recommend(experience, goal);
      assert.ok(result.title && result.reason);
      assert.equal(Number(Boolean(result.course)) + Number(Boolean(result.program)), 1);
      assert.notEqual(result.course, 'champ');
    }
  }
});

test('missing or unsupported answers do not create a recommendation', () => {
  assert.equal(recommend('', 'options'), null);
  assert.equal(recommend('experienced', ''), null);
  assert.equal(recommend('unrecognised', 'private'), null);
  assert.equal(recommend('new', 'unrecognised'), null);
});

function createGuide(options = {}) {
  const element = () => ({
    hidden: false,
    disabled: false,
    textContent: '',
    events: {},
    addEventListener(name, handler) { this.events[name] = handler; },
    querySelector(selector) { return this.nodes?.[selector] || null; },
    focus() { this.focused = true; },
  });
  const title = element();
  const reason = element();
  const result = Object.assign(element(), {
    hidden: true,
    nodes: { h4: title, '[data-guide-title]': title, '[data-guide-reason]': reason },
  });
  const questions = [element(), element()];
  questions.forEach(question => { question.nodes = { legend: element() }; });
  const next = element(), back = element(), open = element();
  const answers = {};
  const form = element();
  form.querySelector = selector => {
    const name = selector.match(/name="([^"]+)"/)?.[1];
    return answers[name] ? { value: answers[name] } : null;
  };
  const goals = ['foundations', 'orderflow', 'options', 'quant', 'private', 'consult'].map(value => {
    const label = element();
    return Object.assign(element(), { value, label, closest: () => label });
  });
  const guide = Object.assign(element(), {
    open: true,
    nodes: {
      form,
      '[data-guide-result]': result,
      '[data-guide-next]': next,
      '[data-guide-back]': back,
      '[data-guide-open]': open,
    },
    querySelectorAll(selector) {
      return selector === 'input[name="guide-goal"]' ? goals : questions;
    },
  });
  const emitted = [];
  const document = {
    querySelector() { return guide; },
    dispatchEvent(event) { emitted.push(event); },
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'learning-guide.js'), 'utf8');
  vm.runInNewContext(source, {
    document,
    ...(options.visibility ? { window: { MB_VISIBILITY: options.visibility, MB: { courses: options.courses || [] } } } : {}),
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
  });
  const submit = () => form.events.submit({ preventDefault() {} });
  return { guide, goals, answers, next, back, open, title, reason, result, questions, emitted, submit };
}

test('the two-step helper keeps answers while moving back and emits the selected course', () => {
  const page = createGuide();
  page.answers['guide-experience'] = 'new';
  page.submit();
  assert.equal(page.questions[0].hidden, true);
  assert.equal(page.questions[1].hidden, false);
  page.answers['guide-goal'] = 'orderflow';
  page.submit();
  assert.equal(page.result.hidden, false);
  assert.equal(page.title.textContent, 'من الفهم إلى القرار');
  page.back.events.click();
  assert.equal(page.questions[1].hidden, false);
  assert.equal(page.answers['guide-goal'], 'orderflow');
  page.submit();
  page.open.events.click();
  assert.equal(page.guide.open, false);
  assert.equal(page.emitted[0].type, 'site:learningchoice');
  assert.equal(page.emitted[0].detail.course, 'zero-intermediate');
  assert.equal(Object.hasOwn(page.emitted[0].detail, 'program'), false);
});

test('service recommendations emit the existing program identity', () => {
  const page = createGuide();
  page.answers['guide-experience'] = 'experienced';
  page.submit();
  page.answers['guide-goal'] = 'consult';
  page.submit();
  page.open.events.click();
  assert.equal(page.emitted[0].detail.program, 'consult');
  assert.equal(Object.hasOwn(page.emitted[0].detail, 'course'), false);
});

test('every recommendation and helper label is covered by the supplied dictionary', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'translations.js'), 'utf8'), context);
  const dictionary = context.window.MB_TRANSLATIONS;
  for (const experience of ['new', 'basic', 'experienced']) {
    for (const goal of ['foundations', 'orderflow', 'options', 'quant', 'private', 'consult']) {
      const result = recommend(experience, goal);
      for (const value of [result.title, result.reason]) {
        if (/[\u0600-\u06ff]/u.test(value)) assert.ok(dictionary[value], value);
      }
    }
  }
});


const configured = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8'), configured);
const currentCourses = configured.window.MB.courses;
const visibleOnly = (...ids) => ({
  isCourseVisible: id => ids.includes(id),
  isProgramVisible: () => true,
});

test('a new learner seeking order flow reaches Champ when it is the only visible course', () => {
  const page = createGuide({ courses: currentCourses, visibility: visibleOnly('champ') });
  const orderflow = page.goals.find(goal => goal.value === 'orderflow');
  assert.equal(orderflow.disabled, false);
  assert.equal(orderflow.label.hidden, false);
  page.answers['guide-experience'] = 'new';
  page.submit();
  page.answers['guide-goal'] = 'orderflow';
  page.submit();
  assert.equal(page.result.hidden, false);
  assert.equal(page.title.textContent, 'From Zero to Champ');
  page.open.events.click();
  assert.equal(page.emitted[0].detail.course, 'champ');
});

test('a hidden combined bundle resolves to a visible bundle containing all of its courses', () => {
  const result = resolveRecommendation({ course: 'order-options' }, currentCourses, visibleOnly('champ'));
  assert.equal(result.course, 'champ');
  assert.equal(result.reason, currentCourses.find(course => course.id === 'champ').summary);
});

test('a partial course cannot replace the foundation-and-order-flow bundle', () => {
  const result = resolveRecommendation(recommend('new', 'orderflow'), currentCourses, visibleOnly('order-flow'));
  assert.equal(result, null);
});

test('an already visible recommendation preserves its explanation', () => {
  const original = recommend('new', 'orderflow');
  assert.equal(resolveRecommendation(original, currentCourses, visibleOnly('zero-intermediate', 'champ')), original);
});


test('goal visibility uses the chosen experience and omits an incomplete replacement', () => {
  const page = createGuide({ courses: currentCourses, visibility: visibleOnly('order-flow') });
  page.answers['guide-experience'] = 'new';
  page.submit();
  const orderflow = page.goals.find(goal => goal.value === 'orderflow');
  assert.equal(orderflow.disabled, true);
  assert.equal(orderflow.label.hidden, true);
  page.back.events.click();
  page.answers['guide-experience'] = 'basic';
  page.submit();
  assert.equal(orderflow.disabled, false);
  assert.equal(orderflow.label.hidden, false);
});
