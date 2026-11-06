const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const pay = require('../pay.js');
const visibilityApi = require('../visibility.js');

const root = path.join(__dirname, '..');
function siteConfig(overrides = {}) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context);
  return { ...context.window.MB, ...overrides };
}
const LIVE = { href: 'https://ebroo89.github.io/bassam-scroll-site/pay.html', hostname: 'ebroo89.github.io' };

test('USD prices become amounts; open prices do not', () => {
  assert.equal(pay.usdAmount('$7,990'), 7990);
  assert.equal(pay.usdAmount(2490), 2490);
  assert.equal(pay.usdAmount(''), 0);
  assert.equal(pay.usdAmount('السعر حسب الطلب'), 0);
  assert.equal(pay.usdAmount(-5), 0);
});

test('the current offers resolve to their configured amounts', () => {
  const config = siteConfig();
  const visibility = visibilityApi.create(undefined, config.courses);
  assert.equal(pay.payOffer('champ', config, visibility).amount, 2490);
  assert.equal(pay.payOffer('champ', config, visibility).program, 'group');
  assert.equal(pay.payOffer('private', config, visibility).amount, 7990);
  assert.equal(pay.payOffer('consult', config, visibility).amount, 200);
  assert.equal(pay.payOffer('indicator', config, visibility), null);
  assert.equal(pay.payOffer('foundations', config, visibility), null);
  assert.equal(pay.payOffer('constructor', config, visibility), null);
});

test('hidden, unpriced or waitlist offers cannot be enrolled in here', () => {
  const config = siteConfig();
  const hidden = visibilityApi.create({ programs: { consult: false } }, config.courses);
  assert.equal(pay.payOffer('consult', config, hidden), null);
  assert.equal(pay.payOffer('consult', { ...config, prices: { consult: '' } }, null), null);
  const waitlist = { ...config, courses: config.courses.map((c) => c.id === 'champ' ? { ...c, availability: 'waitlist' } : c) };
  assert.equal(pay.payOffer('champ', waitlist, null), null);
});

test('the request is sent only to a reachable applications endpoint', () => {
  assert.equal(pay.payMode(siteConfig({ webhookUrl: '' }), LIVE).live, false);
  assert.equal(pay.payMode(siteConfig({ webhookUrl: 'api/apply.php' }), LIVE).live, true);
  assert.equal(pay.payMode(siteConfig({ webhookUrl: 'api/apply.php' }), { href: 'http://127.0.0.1:4180/pay.html', hostname: '127.0.0.1' }).live, false);
  assert.equal(pay.payMode(siteConfig({ webhookUrl: 'http://173.212.244.120:5678/webhook/bassam-apply' }), LIVE).live, false);
  assert.equal(pay.payMode(siteConfig({ webhookUrl: 'javascript:alert(1)' }), LIVE).live, false);
});

test('details need a name, an email and a phone', () => {
  assert.deepEqual(pay.requestErrors({ name: 'Sara Ali', email: 'sara@example.com', phone: '+971 50 123 4567' }), []);
  assert.deepEqual(pay.requestErrors({}).map(([name]) => name), ['name', 'email', 'phone']);
});

test('the request has the same shape as the application form, so n8n files it the same way', () => {
  const config = siteConfig();
  const champ = pay.payOffer('champ', config, null);
  const fields = { name: ' Sara Ali ', email: 'sara@example.com', phone: '+971 50 123 4567', company: '' };
  const body = pay.requestPayload(fields, champ, 'p', '');
  assert.equal(body.program, 'group');
  assert.equal(body.course, 'champ');
  assert.equal(body.enrollment_intent, 'enroll');
  assert.equal(body.name, 'Sara Ali');
  assert.equal(body.phone, '+971501234567');
  const priv = pay.payOffer('private', config, null);
  assert.equal(pay.requestPayload(fields, priv, 'p', '2026-12').preferred_month, '2026-12');
  assert.equal('preferred_month' in pay.requestPayload(fields, priv, 'p', '2026-13'), false);
  assert.equal('course' in pay.requestPayload(fields, priv, 'p', ''), false);
  assert.equal(pay.validMonth('december'), '');
});

test('the payment step points to the WhatsApp number in config.js', () => {
  const config = siteConfig();
  const digits = pay.whatsappDigits(config);
  assert.equal(digits, '971547836322');
  assert.equal(pay.whatsappDisplay(digits), '+971 54 783 6322');
  assert.equal(pay.whatsappDigits({ supportWhatsapp: '+971 50 000 0000', whatsapp: '971547836322' }), '971500000000');
  assert.equal(pay.whatsappDigits({}), '');
  const link = new URL(pay.whatsappLink(digits, { title: 'تدريب خاص' }, 'ar'));
  assert.equal(link.origin + link.pathname, 'https://wa.me/971547836322');
  assert.match(link.searchParams.get('text'), /تدريب خاص/);
});

test('a consultation reaches the WhatsApp step only with a slot still in the future', () => {
  const store = (value) => ({ getItem: () => value });
  const future = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16);
  assert.equal(pay.savedBooking(store(null)), null);
  assert.equal(pay.savedBooking(store('not json')), null);
  assert.equal(pay.savedBooking(store(JSON.stringify({ slot: '2020-01-01T10:00' }))), null);
  assert.equal(pay.savedBooking(store(JSON.stringify({ slot: future }))).slot, future);
});

test('no crypto, wallet or receipt upload is left anywhere on the public site', () => {
  const pages = ['index.html', 'course.html', 'apply.html', 'book.html', 'pay.html', 'pay.js', 'book.js', 'app.js', 'config.js', 'pay.css', 'accents.css'];
  for (const file of pages) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(source, /USDT|TRC20|بالكريبتو|cryptoPayment|TGfvW2PFG4GQoypQX4ofuAWD2oXaVbNjag|type="file"|receipt|txid|pay-coin|محفظة/i, file);
  }
});

test('every Arabic string on the enrolment page has an English translation', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'translations.js'), 'utf8'), context);
  const dictionary = context.window.MB_TRANSLATIONS;
  const html = fs.readFileSync(path.join(root, 'pay.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  const strings = new Set();
  for (const match of html.matchAll(/>([^<>]*[؀-ۿ][^<>]*)</g)) strings.add(match[1].trim());
  for (const match of html.matchAll(/(?:content|aria-label|title|placeholder)="([^"]*[؀-ۿ][^"]*)"/g)) strings.add(match[1].trim());
  const source = fs.readFileSync(path.join(root, 'pay.js'), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of source.matchAll(/"([^"\n]*[؀-ۿ][^"\n]*)"/g)) strings.add(match[1].trim());
  const missing = [...strings].filter((value) => value && !Object.hasOwn(dictionary, value));
  assert.deepEqual(missing, []);
});
