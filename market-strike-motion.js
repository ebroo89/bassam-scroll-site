/* Visual reference: SpotGamma's official price-and-level chart.
   https://support.spotgamma.com/hc/en-us/articles/14356952534291
   Every price and intensity below is a deterministic illustrative fixture. */
(() => {
  const width = 720;
  const height = 430;
  const left = 32;
  const right = 617;
  const top = 40;
  const bottom = 373;
  const duration = 18;
  const cycleDuration = 22;
  const prices = [18475, 18500, 18525, 18550, 18575, 18600, 18625];
  const teal = '#079a7f';
  const red = '#c88285';
  const knots = [
    [0, 18505], [1.2, 18513], [2.3, 18496], [3.1, 18508],
    [4.1, 18522], [5.2, 18539], [6.1, 18517], [7, 18531],
    [8.2, 18545], [9, 18563], [10.1, 18546], [11.3, 18572],
    [12.2, 18587], [13.1, 18562], [14.3, 18579], [15.1, 18606],
    [16.1, 18588], [17.2, 18614], [18, 18609]
  ];

  const yFor = price => bottom - (price - prices[0]) / (prices.at(-1) - prices[0]) * (bottom - top);
  const xFor = seconds => left + seconds / duration * (right - left);

  function priceAt(seconds) {
    let index = 0;
    while (index < knots.length - 2 && seconds > knots[index + 1][0]) index++;
    const start = knots[index];
    const end = knots[index + 1];
    const fraction = Math.max(0, Math.min(1, (seconds - start[0]) / (end[0] - start[0])));
    const microstructure = Math.sin(fraction * Math.PI) * Math.sin(fraction * 27 + index * 1.7) * 1.25;
    return start[1] + (end[1] - start[1]) * fraction + microstructure;
  }

  const samples = Array.from({ length: 361 }, (_, index) => {
    const seconds = index / 360 * duration;
    const price = priceAt(seconds);
    return { seconds, price, x: xFor(seconds), y: yFor(price) };
  });
  const distances = [0];
  for (let index = 1; index < samples.length; index++) {
    distances.push(distances[index - 1] + Math.hypot(samples[index].x - samples[index - 1].x, samples[index].y - samples[index - 1].y));
  }
  const totalLength = distances.at(-1);
  const path = samples.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(3)} ${point.y.toFixed(3)}`).join(' ');
  const crossings = [];
  samples.slice(1).forEach((end, index) => {
    const start = samples[index];
    prices.forEach((price, row) => {
      if ((start.price - price) * (end.price - price) >= 0) return;
      const fraction = (price - start.price) / (end.price - start.price);
      const seconds = start.seconds + (end.seconds - start.seconds) * fraction;
      const previous = crossings.findLast(event => event.row === row);
      if (previous && seconds - previous.seconds < 0.15) return;
      crossings.push({ seconds, row, price, x: xFor(seconds), y: yFor(price), color: end.price > start.price ? teal : red });
    });
  });

  function heatCell(row, column) {
    const x = left + column * 23;
    const y = yFor(prices[row]);
    const band = [0.2, 0.54, 0.84, 0.36, 0.92, 0.71, 0.25][row];
    const center = [16, 6, 13, 18, 8, 19, 11][row];
    const cluster = Math.exp(-Math.pow((column - center) / 5.8, 2));
    const second = Math.exp(-Math.pow((column - ((center + 11) % 25)) / 3.4, 2)) * 0.52;
    const texture = 0.06 + ((column * 7 + row * 11) % 13) / 13 * 0.13;
    const strength = Math.min(0.84, texture + band * (cluster + second) * 0.66);
    const color = row < 3 || row === 4 ? teal : red;
    const cellHeight = 10 + strength * 9;
    return `<rect class="market-strike-cell" x="${x}" y="${(y - cellHeight / 2).toFixed(2)}" width="20" height="${cellHeight.toFixed(2)}" rx="1" fill="${color}" fill-opacity="${strength.toFixed(3)}"/>`;
  }

  function numericLabel(value, x, y, extra = '') {
    return `<text x="${x}" y="${y}" ${extra}>${value}</text>`;
  }

  window.marketStrikeMarkup = () => `
    <svg class="market-strike-visual" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Illustrative price crossing discrete levels. All data are synthetic.">
      <style>
        .market-strike-visual { display: block; width: 100%; height: auto; }
        .market-strike-visual text { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-variant-numeric: tabular-nums; fill: #d3d9d3; font-size: 14px; }
        .market-strike-visual .market-strike-time { fill: #8b9990; font-size: 11px; }
        .market-strike-visual .market-strike-value { fill: #f1f2e9; font-size: 13px; }
      </style>
      <rect width="720" height="430" fill="#090d0d"/>
      <g fill="none" stroke="#9bafa2" stroke-opacity=".08" stroke-width=".8">
        ${Array.from({ length: 6 }, (_, index) => `<path d="M${left + index * 117} ${top - 14}V${bottom + 13}"/>`).join('')}
        ${prices.map(price => `<path d="M${left} ${yFor(price)}H${right + 8}"/>`).join('')}
      </g>
      <g class="market-strike-heat">
        ${prices.map((_, row) => Array.from({ length: 26 }, (_, column) => heatCell(row, column)).join('')).join('')}
      </g>
      <path d="M${right + 14} ${top - 15}V${bottom + 15}" stroke="#8b9c91" stroke-opacity=".19" stroke-width="1"/>
      <g text-anchor="end">
        ${prices.map(price => numericLabel(price, 697, yFor(price) + 5)).join('')}
      </g>
      <g class="market-strike-time" text-anchor="middle">
        ${[0, 1, 2, 3, 4].map(index => numericLabel(`09:${String(30 + index).padStart(2, '0')}`, left + index * (right - left) / 4, 407, 'class="market-strike-time"')).join('')}
      </g>
      <g class="market-strike-crossings" pointer-events="none">
        ${crossings.map(event => `
          <g class="market-strike-crossing" opacity="0">
            <rect x="${Math.max(left, event.x - 25).toFixed(3)}" y="${(event.y - 10).toFixed(3)}" width="50" height="20" rx="2" fill="${event.color}" fill-opacity=".9"/>
            <path d="M${(event.x - 31).toFixed(3)} ${event.y.toFixed(3)}H${(event.x + 31).toFixed(3)}" stroke="${event.color}" stroke-width="3" stroke-linecap="round"/>
            <circle class="market-strike-glow" cx="${event.x.toFixed(3)}" cy="${event.y.toFixed(3)}" r="10" fill="${event.color}" fill-opacity=".29"/>
            <circle class="market-strike-outer-ring" cx="${event.x.toFixed(3)}" cy="${event.y.toFixed(3)}" r="8" fill="none" stroke="${event.color}" stroke-opacity=".45" stroke-width="1"/>
            <circle class="market-strike-ring" cx="${event.x.toFixed(3)}" cy="${event.y.toFixed(3)}" r="4" fill="none" stroke="${event.color}" stroke-opacity=".95" stroke-width="2"/>
            <circle cx="${event.x.toFixed(3)}" cy="${event.y.toFixed(3)}" r="2.5" fill="#f2f5e9"/>
          </g>`).join('')}
      </g>
      <g class="market-strike-price">
        <path class="market-strike-trace" d="${path}" fill="none" stroke="#d2ddd2" stroke-width="1.55" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="${totalLength.toFixed(3)} ${totalLength.toFixed(3)}" stroke-dashoffset="0"/>
        <path class="market-strike-tail-glow" d="${path}" fill="none" stroke="${teal}" stroke-opacity=".24" stroke-width="8" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="0 ${totalLength.toFixed(3)}"/>
        <path class="market-strike-tail" d="${path}" fill="none" stroke="#f3f5e9" stroke-width="2.7" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="0 ${totalLength.toFixed(3)}"/>
        <path class="market-strike-current" d="M${right} ${samples.at(-1).y}H${right + 10}" fill="none" stroke="#e1e6d8" stroke-opacity=".22" stroke-width=".8" stroke-dasharray="3 4"/>
        <circle class="market-strike-halo" cx="${right}" cy="${samples.at(-1).y}" r="10" fill="${teal}" fill-opacity=".19"/>
        <circle class="market-strike-point" cx="${right}" cy="${samples.at(-1).y}" r="4.2" fill="#f5f7ed"/>
        ${numericLabel(samples.at(-1).price.toFixed(2), right - 10, samples.at(-1).y - 12, 'class="market-strike-value" text-anchor="end"')}
      </g>
    </svg>`;

  window.mountMarketStrike = host => {
    const svg = host.matches?.('svg.market-strike-visual') ? host : host.querySelector('svg.market-strike-visual');
    if (!svg) throw new Error('marketStrikeMarkup must be inserted before mounting.');
    const trace = svg.querySelector('.market-strike-trace');
    const tail = svg.querySelector('.market-strike-tail');
    const tailGlow = svg.querySelector('.market-strike-tail-glow');
    const current = svg.querySelector('.market-strike-current');
    const point = svg.querySelector('.market-strike-point');
    const halo = svg.querySelector('.market-strike-halo');
    const label = svg.querySelector('.market-strike-value');
    const priceGroup = svg.querySelector('.market-strike-price');
    const flareNodes = [...svg.querySelectorAll('.market-strike-crossing')].map(node => ({
      node,
      ring: node.querySelector('.market-strike-ring'),
      outerRing: node.querySelector('.market-strike-outer-ring'),
      glow: node.querySelector('.market-strike-glow')
    }));

    function update(elapsedSeconds) {
      const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
      const cycle = elapsed % cycleDuration;
      const time = Math.min(duration, cycle);
      const position = time / duration * (samples.length - 1);
      const index = Math.min(samples.length - 2, Math.floor(position));
      const fraction = Math.min(1, position - index);
      const start = samples[index];
      const end = samples[index + 1];
      const x = start.x + (end.x - start.x) * fraction;
      const y = start.y + (end.y - start.y) * fraction;
      const price = start.price + (end.price - start.price) * fraction;
      const distance = distances[index] + (distances[index + 1] - distances[index]) * fraction;
      const tailLength = Math.min(76, distance);
      trace.setAttribute('stroke-dashoffset', String(totalLength - distance));
      [tail, tailGlow].forEach(node => {
        node.setAttribute('stroke-dasharray', `${tailLength} ${totalLength + 1}`);
        node.setAttribute('stroke-dashoffset', String(-Math.max(0, distance - tailLength)));
      });
      const directionColor = end.price >= start.price ? teal : red;
      tailGlow.setAttribute('stroke', directionColor);
      halo.setAttribute('fill', directionColor);
      current.setAttribute('d', `M${x} ${y}H${right + 10}`);
      [point, halo].forEach(node => {
        node.setAttribute('cx', x.toFixed(3));
        node.setAttribute('cy', y.toFixed(3));
      });
      halo.setAttribute('r', (9.5 + Math.sin(elapsed * 1.7) * 0.7).toFixed(3));
      label.setAttribute('x', (x + (x > 520 ? -10 : 10)).toFixed(3));
      label.setAttribute('y', (y - 16).toFixed(3));
      label.setAttribute('text-anchor', x > 520 ? 'end' : 'start');
      label.textContent = price.toFixed(2);
      const fade = cycle > 21.4 ? (22 - cycle) / 0.6 : cycle < 0.4 ? cycle / 0.4 : 1;
      priceGroup.setAttribute('opacity', fade.toFixed(3));
      flareNodes.forEach(({ node, ring, outerRing, glow }, eventIndex) => {
        const age = time - crossings[eventIndex].seconds;
        const active = age >= 0 && age < 1.45 && cycle <= duration + 1.45;
        const progress = active ? age / 1.45 : 1;
        const intensity = active ? Math.pow(1 - progress, 0.7) * 0.95 : 0;
        node.setAttribute('opacity', intensity.toFixed(3));
        ring.setAttribute('r', (4 + progress * 22).toFixed(3));
        outerRing.setAttribute('r', (8 + progress * 25).toFixed(3));
        glow.setAttribute('r', (10 + progress * 14).toFixed(3));
      });
    }

    return { update };
  };
})();
