(() => {
  const rows = [18502, 18501.75, 18501.5, 18501.25, 18501, 18500.75, 18500.5, 18500.25, 18500];
  const firstRowY = 108;
  const rowHeight = 27;
  const candles = [
    {
      x: 170,
      time: '09:30',
      open: 18500.5,
      close: 18501.25,
      high: 18502,
      low: 18500,
      bids: [4, 9, 12, 25, 71, 92, 38, 11, 3],
      asks: [10, 27, 48, 35, 24, 17, 16, 7, 2],
      bidImbalances: [5],
      askImbalances: [],
      focus: false
    },
    {
      x: 360,
      time: '09:33',
      open: 18501,
      close: 18501.75,
      high: 18502,
      low: 18500,
      bids: [7, 15, 22, 41, 37, 30, 19, 13, 6],
      asks: [20, 47, 138, 201, 58, 24, 16, 9, 3],
      bidImbalances: [],
      askImbalances: [2, 3],
      focus: true
    },
    {
      x: 550,
      time: '09:36',
      open: 18501.75,
      close: 18501,
      high: 18502,
      low: 18500,
      bids: [5, 11, 44, 148, 120, 55, 31, 16, 7],
      asks: [13, 27, 36, 42, 22, 18, 15, 8, 3],
      bidImbalances: [3],
      askImbalances: [],
      focus: false
    }
  ];

  function priceY(price) {
    return firstRowY + (rows[0] - price) / 0.25 * rowHeight;
  }

  function number(value) {
    return value.toFixed(2);
  }

  function candleSVG(candle) {
    const focus = candle.focus;
    const halfWidth = focus ? 72 : 62;
    const fontSize = focus ? 21 : 17;
    const bidX = candle.x - (focus ? 31 : 27);
    const askX = candle.x + (focus ? 31 : 27);
    const bodyX = candle.x + halfWidth + 17;
    const bodyTop = Math.min(priceY(candle.open), priceY(candle.close));
    const bodyHeight = Math.max(3, Math.abs(priceY(candle.open) - priceY(candle.close)));
    const rising = candle.close > candle.open;
    const volume = candle.bids.reduce((sum, value, index) => sum + value + candle.asks[index], 0);
    const delta = candle.asks.reduce((sum, value, index) => sum + value - candle.bids[index], 0);
    const maxVolume = Math.max(...candle.bids, ...candle.asks);
    const maxRow = candle.bids.map((value, index) => value + candle.asks[index]).indexOf(
      Math.max(...candle.bids.map((value, index) => value + candle.asks[index]))
    );
    const cells = rows.map((price, index) => {
      const y = firstRowY + index * rowHeight;
      const bidImbalance = candle.bidImbalances.includes(index);
      const askImbalance = candle.askImbalances.includes(index);
      const bidOpacity = bidImbalance ? 0.48 : 0.08 + candle.bids[index] / maxVolume * 0.14;
      const askOpacity = askImbalance ? 0.52 : 0.08 + candle.asks[index] / maxVolume * 0.14;
      return `
        <g class="footprint-level" data-price="${price}">
          <rect class="footprint-cell${bidImbalance ? ' footprint-pulse' : ''}" x="${candle.x - halfWidth}" y="${y - 12}" width="${halfWidth - 4}" height="24" rx="2" fill="${bidImbalance ? '#c88285' : '#83928c'}" fill-opacity="${bidOpacity.toFixed(3)}"/>
          <rect class="footprint-cell${askImbalance ? ' footprint-pulse' : ''}" x="${candle.x + 4}" y="${y - 12}" width="${halfWidth - 4}" height="24" rx="2" fill="${askImbalance ? '#079a7f' : '#83928c'}" fill-opacity="${askOpacity.toFixed(3)}"/>
          ${focus && index === maxRow ? `<rect x="${candle.x - halfWidth - 1}" y="${y - 13}" width="${halfWidth * 2 + 2}" height="26" rx="3" fill="none" stroke="#f1efe8" stroke-opacity=".45" stroke-width=".8"/>` : ''}
          <text x="${bidX}" y="${y + 7}" text-anchor="middle" font-size="${fontSize}" fill="#f1efe8">${candle.bids[index]}</text>
          <text x="${candle.x}" y="${y + 5}" text-anchor="middle" font-size="11" fill="#9ba7a0">×</text>
          <text x="${askX}" y="${y + 7}" text-anchor="middle" font-size="${fontSize}" fill="#f1efe8">${candle.asks[index]}</text>
        </g>`;
    }).join('');
    const focusScale = focus ? `
      <g class="footprint-focus-scale" text-anchor="end" font-size="12" fill="#aeb8b0">
        ${rows.map((price, index) => `<text x="${candle.x - halfWidth - 15}" y="${firstRowY + index * rowHeight + 4}">${number(price)}</text>`).join('')}
      </g>` : '';
    return `
      <g class="${focus ? 'footprint-focus' : 'footprint-flank'}" opacity="${focus ? 1 : 0.48}">
        <g class="footprint-column-label" text-anchor="middle">
          <text x="${candle.x}" y="61" font-size="12" fill="${focus ? '#edece5' : '#a7b0aa'}">${candle.time}</text>
          <text x="${bidX}" y="82" font-size="10" fill="#aeb8b0">BID</text>
          <text x="${askX}" y="82" font-size="10" fill="#aeb8b0">ASK</text>
        </g>
        <path d="M ${bodyX} ${priceY(candle.high)} V ${priceY(candle.low)}" fill="none" stroke="#b9c3bb" stroke-opacity=".75" stroke-width="1"/>
        <rect x="${bodyX - 4}" y="${bodyTop}" width="8" height="${bodyHeight}" rx="1" fill="${rising ? '#079a7f' : '#c88285'}" fill-opacity=".65" stroke="#d7ded7" stroke-opacity=".65" stroke-width=".7"/>
        <path d="M ${bodyX - 8} ${priceY(candle.open)} h 4 M ${bodyX + 4} ${priceY(candle.close)} h 4" fill="none" stroke="#d7ded7" stroke-width="1"/>
        ${cells}
        ${focusScale}
        <g class="footprint-column-label" text-anchor="middle" font-size="10" fill="#aeb8b0">
          <text x="${candle.x}" y="359">VOL ${volume} · Δ ${delta > 0 ? '+' : ''}${delta}</text>
        </g>
      </g>`;
  }

  window.footprintVisualSVG = () => `
    <svg xmlns="http://www.w3.org/2000/svg" class="footprint-visual" viewBox="0 0 720 430" role="img" aria-labelledby="footprint-title footprint-description">
      <title id="footprint-title">Three illustrative bid-by-ask footprint candles</title>
      <desc id="footprint-description">Nine shared price levels in quarter-point increments. Teal cells mark selected ask imbalances and muted red cells mark selected bid imbalances. Every number remains off-white. Candle wicks and bodies match each candle's stated trading range. All volumes are synthetic.</desc>
      <style>
        .footprint-visual { display: block; width: 100%; height: auto; }
        .footprint-visual text { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-variant-numeric: tabular-nums; }
        .footprint-visual .footprint-focus-scale { display: none; }
        .footprint-visual.footprint-closeup .footprint-flank,
        .footprint-visual.footprint-closeup .footprint-scale,
        .footprint-visual.footprint-closeup .footprint-footer,
        .footprint-visual.footprint-closeup .footprint-focus .footprint-column-label { display: none; }
        .footprint-visual.footprint-closeup .footprint-focus { transform-origin: 360px 216px; transform: scale(1.6); }
        .footprint-visual.footprint-closeup .footprint-focus-scale { display: block; }
      </style>
      <rect width="720" height="430" fill="#090b0c"/>
      <g text-anchor="middle" font-size="11" fill="#bec6bf">
        <text x="360" y="27" letter-spacing="2">BID × ASK</text>
      </g>
      <g fill="none" stroke="#6d7a71" stroke-opacity=".12" stroke-width=".7">
        ${rows.map((_, index) => `<path d="M 83 ${firstRowY + index * rowHeight} H 677"/>`).join('')}
      </g>
      <path d="M 82 ${priceY(18501)} H 681" stroke="#aab7ac" stroke-opacity=".32" stroke-width=".8" stroke-dasharray="3 5"/>
      <g class="footprint-scale" text-anchor="end" font-size="11" fill="#9daaa1">
        ${rows.map((price, index) => `<text x="73" y="${firstRowY + index * rowHeight + 4}">${number(price)}</text>`).join('')}
      </g>
      ${candles.map(candleSVG).join('')}
      <g class="footprint-footer" text-anchor="middle" font-size="9" fill="#7f8c82">
        <text x="360" y="396" letter-spacing="1.2">ILLUSTRATIVE DATA · 0.25 PRICE INCREMENTS</text>
      </g>
    </svg>`;
})();
