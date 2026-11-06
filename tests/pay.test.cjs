const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const pay = require('../pay.js');
const visibilityApi = require('../visibility.js');

function siteConfig(overrides = {}) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8'), context);
  const config = context.window.MB;
  return { ...config, cryptoPayment: { ...config.cryptoPayment, ...overrides } };
}
const ADDRESS = 'TQ5NmLqNqYzdgjYbRMP8ixtcQSyXvWXK9e';
const LIVE_LOCATION = { href: 'https://ebroo89.github.io/bassam-scroll-site/pay.html', hostname: 'ebroo89.github.io' };

test('USD prices become payable amounts; open prices do not', () => {
  assert.equal(pay.usdAmount('$7,990'), 7990);
  assert.equal(pay.usdAmount('$200'), 200);
  assert.equal(pay.usdAmount(2490), 2490);
  assert.equal(pay.usdAmount(''), 0);
  assert.equal(pay.usdAmount('السعر حسب الطلب'), 0);
  assert.equal(pay.usdAmount(-5), 0);
});

test('only TRON base58 addresses are accepted', () => {
  assert.equal(pay.validTronAddress(ADDRESS), true);
  assert.equal(pay.validTronAddress(''), false);
  assert.equal(pay.validTronAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e'), false);
  assert.equal(pay.validTronAddress(ADDRESS.replace('Q', '0')), false);
  assert.equal(pay.validTronAddress(ADDRESS.slice(0, -1)), false);
});

test('the current offers resolve to their configured amounts', () => {
  const config = siteConfig();
  const visibility = visibilityApi.create(undefined, config.courses);
  assert.equal(pay.payOffer('champ', config, visibility).amount, 2490);
  assert.equal(pay.payOffer('champ', config, visibility).title, 'From Zero to Champ');
  assert.equal(pay.payOffer('private', config, visibility).amount, 7990);
  assert.equal(pay.payOffer('consult', config, visibility).amount, 200);
  assert.equal(pay.payOffer('indicator', config, visibility), null);
  assert.equal(pay.payOffer('foundations', config, visibility), null);
  assert.equal(pay.payOffer('constructor', config, visibility), null);
});

test('hidden, unlisted or unpriced offers cannot be paid for', () => {
  const config = siteConfig({ offers: ['champ', 'consult'] });
  const hidden = visibilityApi.create({ programs: { consult: false } }, config.courses);
  assert.equal(pay.payOffer('consult', config, hidden), null);
  assert.equal(pay.payOffer('private', config, hidden), null);
  assert.equal(pay.payOffer('consult', { ...config, prices: { consult: '' } }, null), null);
  const waitlist = { ...config, courses: config.courses.map((c) => c.id === 'champ' ? { ...c, availability: 'waitlist' } : c) };
  assert.equal(pay.payOffer('champ', waitlist, null), null);
});

test('the wallet is shown only when both address and endpoint are configured', () => {
  assert.equal(pay.payMode(siteConfig(), LIVE_LOCATION).live, false);
  assert.equal(pay.payMode(siteConfig({ address: ADDRESS }), LIVE_LOCATION).live, false);
  assert.equal(pay.payMode(siteConfig({ webhookUrl: 'https://n8n.example.com/webhook/pay' }), LIVE_LOCATION).live, false);
  assert.equal(pay.payMode(siteConfig({ address: 'not-an-address', webhookUrl: 'https://n8n.example.com/webhook/pay' }), LIVE_LOCATION).live, false);
  const live = pay.payMode(siteConfig({ address: ADDRESS, webhookUrl: 'https://n8n.example.com/webhook/pay' }), LIVE_LOCATION);
  assert.deepEqual(live, { live: true, address: ADDRESS, endpoint: 'https://n8n.example.com/webhook/pay' });
  assert.equal(pay.payMode(siteConfig({ address: ADDRESS, webhookUrl: 'javascript:alert(1)' }), LIVE_LOCATION).live, false);
  assert.equal(pay.payMode(siteConfig({ address: ADDRESS, webhookUrl: 'api/pay.php' }), { href: 'http://127.0.0.1:8766/pay.html', hostname: '127.0.0.1' }).live, false);
});

test('proof of payment requires contact details, a receipt and confirmation', () => {
  const good = { name: 'Sara Ali', email: 'sara@example.com', phone: '+971 50 123 4567', txid: '', consent: 'on' };
  const receipt = { size: 120000, type: 'image/png' };
  assert.deepEqual(pay.proofErrors(good, receipt), []);
  assert.deepEqual(pay.proofErrors({ ...good, phone: '٠٥٠١٢٣٤٥٦٧' }, receipt), []);
  const fields = (errors) => errors.map(([name]) => name);
  assert.deepEqual(fields(pay.proofErrors({}, null)), ['name', 'email', 'phone', 'receipt', 'consent']);
  assert.deepEqual(fields(pay.proofErrors({ ...good, txid: 'abc' }, receipt)), ['txid']);
  assert.deepEqual(pay.proofErrors({ ...good, txid: 'a'.repeat(64) }, receipt), []);
  assert.deepEqual(fields(pay.proofErrors(good, { size: 1000, type: 'text/html' })), ['receipt']);
  assert.deepEqual(fields(pay.proofErrors(good, { size: pay.RECEIPT_MAX_BYTES + 1, type: 'image/jpeg' })), ['receipt']);
  assert.deepEqual(pay.proofErrors(good, { size: 1000, type: 'application/pdf' }), []);
});

test('sent fields carry the offer, amount and normalised contact details', () => {
  const config = siteConfig({ address: ADDRESS });
  const offer = pay.payOffer('champ', config, null);
  const sent = pay.proofFields({ name: ' Sara ', email: 'sara@example.com', phone: '+971 (50) 123-4567', txid: '' }, offer, config, 'https://x/pay.html');
  assert.equal(sent.type, 'crypto-payment');
  assert.equal(sent.offer, 'champ');
  assert.equal(sent.amount, '2490');
  assert.equal(sent.asset, 'USDT');
  assert.equal(sent.wallet, ADDRESS);
  assert.equal(sent.name, 'Sara');
  assert.equal(sent.phone, '+971501234567');
  assert.ok(!Number.isNaN(Date.parse(sent.submitted_at)));
});

test('every Arabic string on the payment page has an English translation', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'translations.js'), 'utf8'), context);
  const dictionary = context.window.MB_TRANSLATIONS;
  const html = fs.readFileSync(path.join(__dirname, '..', 'pay.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  const strings = new Set();
  for (const match of html.matchAll(/>([^<>]*[؀-ۿ][^<>]*)</g)) strings.add(match[1].trim());
  for (const match of html.matchAll(/(?:content|aria-label|title|placeholder)="([^"]*[؀-ۿ][^"]*)"/g)) strings.add(match[1].trim());
  const source = fs.readFileSync(path.join(__dirname, '..', 'pay.js'), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of source.matchAll(/"([^"\n]*[؀-ۿ][^"\n]*)"/g)) {
    if (!/[٠-٩۰-۹]-/.test(match[1])) strings.add(match[1].trim());
  }
  const missing = [...strings].filter((value) => !Object.hasOwn(dictionary, value));
  assert.deepEqual(missing, []);
});
