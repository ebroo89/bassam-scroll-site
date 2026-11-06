const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const book = require('../book.js');
const pay = require('../pay.js');
const visibilityApi = require('../visibility.js');

const config = () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8'), context);
  return context.window.MB;
};
const LIVE = { href: 'https://ebroo89.github.io/bassam-scroll-site/book.html', hostname: 'ebroo89.github.io' };
const future = (days, time = '10:30') => `${new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)}T${time}:00+04:00`;

test('booking is live only with a reachable endpoint, demo only while test is on', () => {
  assert.deepEqual(book.bookMode({ booking: {} }, LIVE), { live: false, demo: false, endpoint: '' });
  assert.equal(book.bookMode(config(), LIVE).demo, true);
  const live = book.bookMode({ booking: { endpoint: 'api/book.php', test: true } }, LIVE);
  assert.deepEqual([live.live, live.demo], [true, false]);
  const local = { href: 'http://127.0.0.1:4180/book.html', hostname: '127.0.0.1' };
  assert.equal(book.bookMode({ booking: { endpoint: 'api/book.php' } }, local).live, false);
  assert.equal(book.bookMode({ booking: { endpoint: 'http://173.212.244.120:5678/webhook/bassam-slots' } }, LIVE).live, false);
  assert.equal(book.bookMode({ booking: { endpoint: 'javascript:alert(1)' } }, LIVE).live, false);
});

test('the slots url keeps the endpoint and sets the number of days', () => {
  assert.equal(book.slotsUrl('api/book.php', 14), 'api/book.php?days=14');
  assert.equal(book.slotsUrl('https://x.test/api/book.php?v=1', 7), 'https://x.test/api/book.php?days=7');
});

test('a booking needs a future slot, a name, an email and a phone', () => {
  const good = { name: 'Sara Ali', email: 'sara@example.com', phone: '+971 50 123 4567' };
  assert.deepEqual(book.bookErrors(good, future(2)), []);
  assert.deepEqual(book.bookErrors({ ...good, phone: '٠٥٠١٢٣٤٥٦٧' }, future(2)), []);
  assert.deepEqual(book.bookErrors({}, '').map(([name]) => name), ['slot', 'name', 'email', 'phone']);
  assert.deepEqual(book.bookErrors(good, 'tomorrow').map(([name]) => name), ['slot']);
});

test('demo slots are weekday, 90 minutes apart, inside 09:00-19:00 and never in the next hour', () => {
  const now = new Date('2026-11-06T13:00:00+04:00'); // a Friday
  const days = book.demoDays(now, 14);
  assert.ok(days.length >= 5);
  for (const day of days) {
    const weekday = new Date(`${day.date}T12:00:00+04:00`).getUTCDay();
    assert.ok(weekday >= 1 && weekday <= 5, day.date);
    for (const slot of day.slots) {
      assert.ok(Date.parse(slot.iso) > now.getTime() + 3600000);
      const [h, m] = slot.time.split(':').map(Number);
      assert.ok(h >= 9 && h * 60 + m + 90 <= 19 * 60, slot.time);
    }
  }
  assert.deepEqual(days[0].slots.map((s) => s.time), ['15:00', '16:30']);
});

test('the pay page accepts only a chosen slot that is still in the future', () => {
  const store = (value) => ({ getItem: () => value });
  assert.equal(pay.savedBooking(store(null)), null);
  assert.equal(pay.savedBooking(store('not json')), null);
  assert.equal(pay.savedBooking(store(JSON.stringify({ slot: '2020-01-01T10:00:00+04:00' }))), null);
  assert.equal(pay.savedBooking(store(JSON.stringify({ slot: future(2) }))).slot, future(2));
  assert.equal(book.validBooking({ slot: future(2) }), true);
  assert.equal(book.validBooking({ slot: '2020-01-01T10:00:00+04:00' }), false);
});

test('a hidden consultation program cannot be booked', () => {
  const c = config();
  const visibility = visibilityApi.create({ programs: { consult: false } }, c.courses);
  assert.equal(visibility.isProgramVisible('consult'), false);
});

test('every Arabic string on the booking page has an English translation', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'translations.js'), 'utf8'), context);
  const dictionary = context.window.MB_TRANSLATIONS;
  const html = fs.readFileSync(path.join(__dirname, '..', 'book.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  const strings = new Set();
  for (const match of html.matchAll(/>([^<>]*[؀-ۿ][^<>]*)</g)) strings.add(match[1].trim());
  for (const match of html.matchAll(/(?:content|aria-label|title|placeholder)="([^"]*[؀-ۿ][^"]*)"/g)) strings.add(match[1].trim());
  const source = fs.readFileSync(path.join(__dirname, '..', 'book.js'), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of source.matchAll(/"([^"\n]*[؀-ۿ][^"\n]*)"/g)) {
    if (!/[٠-٩۰-۹]-/.test(match[1])) strings.add(match[1].trim());
  }
  const missing = [...strings].filter((value) => !Object.hasOwn(dictionary, value));
  assert.deepEqual(missing, []);
});
