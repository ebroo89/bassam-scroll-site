const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function renderBackground({ hidden = false } = {}) {
  const listeners = new Map();
  const tracks = ['red', 'grey'].map((tape) => ({
    dataset: { tape },
    innerHTML: '',
    parentElement: {
      classList: {
        classes: new Set(),
        toggle(name, enabled) {
          if (enabled) this.classes.add(name);
          else this.classes.delete(name);
        },
        contains(name) { return this.classes.has(name); },
      },
    },
  }));
  const hero = {};
  const document = {
    hidden,
    addEventListener(name, handler) { listeners.set(name, handler); },
    querySelector(selector) {
      if (selector === '.hero') return hero;
      return null;
    },
    querySelectorAll(selector) {
      return selector === '[data-tape]' ? tracks : [];
    },
  };
  vm.runInNewContext(source, {
    window: { MB: {} },
    document,
    location: { href: 'http://127.0.0.1/index.html' },
    URL,
    addEventListener() {},
  });
  return {
    tracks,
    setHidden(value) {
      document.hidden = value;
      listeners.get('visibilitychange')();
    },
  };
}

function rowsFrom(html) {
  const row = /<span class="([^\"]*\btape-row\b[^\"]*)"([^>]*)>\s*<span class="tape-price"[^>]*>([\d.]+)<\/span>\s*<span class="([^\"]*\btape-volume\b[^\"]*)"[^>]*>(\d+)<\/span>\s*<span class="tape-cross"[^>]*>×<\/span>\s*<span class="([^\"]*\btape-volume\b[^\"]*)"[^>]*>(\d+)<\/span>\s*<\/span>/g;
  return [...html.matchAll(row)].map((match) => ({
    html: match[0],
    classes: match[1].split(/\s+/),
    price: Number(match[3]),
    bid: Number(match[5]),
    ask: Number(match[7]),
  }));
}

test('both background tracks contain two identical 60-row sequences', () => {
  const { tracks } = renderBackground();
  assert.equal(tracks.length, 2);
  for (const track of tracks) {
    const rows = rowsFrom(track.innerHTML);
    assert.equal(rows.length, 120);
    assert.deepEqual(rows.slice(0, 60), rows.slice(60));
  }
});

test('each footprint group has twelve descending quarter-point price levels', () => {
  const { tracks } = renderBackground();
  for (const track of tracks) {
    const rows = rowsFrom(track.innerHTML).slice(0, 60);
    assert.equal(rows.length, 60);
    for (let index = 0; index < rows.length; index++) {
      assert.equal(rows[index].classes.includes('candle-start'), index % 12 === 0);
      assert.equal(Number.isInteger(rows[index].price * 4), true);
      if (index % 12 !== 0) {
        assert.equal(rows[index - 1].price - rows[index].price, 0.25);
      }
    }
  }
});

test('each price row carries varied, nonnegative integer bid and ask volumes', () => {
  const { tracks } = renderBackground();
  for (const track of tracks) {
    const rows = rowsFrom(track.innerHTML).slice(0, 60);
    assert.equal(rows.length, 60);
    for (const row of rows) {
      assert.equal(Number.isInteger(row.bid) && row.bid >= 0, true);
      assert.equal(Number.isInteger(row.ask) && row.ask >= 0, true);
    }
    assert.ok(new Set(rows.map((row) => row.bid)).size > 4);
    assert.ok(new Set(rows.map((row) => row.ask)).size > 4);
  }
});

test('document visibility pauses both tracks and resumes them when visible', () => {
  const page = renderBackground({ hidden: true });
  const paused = () => page.tracks.map((track) => track.parentElement.classList.contains('tape-paused'));
  assert.deepEqual(paused(), [true, true]);
  page.setHidden(false);
  assert.deepEqual(paused(), [false, false]);
  page.setHidden(true);
  assert.deepEqual(paused(), [true, true]);
});
