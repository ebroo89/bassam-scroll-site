/* Synthetic volume prints. The parent owns animation timing and visibility. */
(function () {
  function marketFootprintMarkup() {
    if (typeof window.footprintVisualSVG !== "function") {
      throw new Error("Load footprint-visual.js before market-footprint-motion.js.");
    }

    return window.footprintVisualSVG()
      .replace(/<g\b[^>]*>\s*<text\b[^>]*>BID × ASK<\/text>\s*<\/g>/, "")
      .replace(/<g\b[^>]*class="footprint-footer"[^>]*>[\s\S]*?<\/g>/, "")
      .replace(/<g\b[^>]*>\s*<text\b[^>]*>VOL [^<]*<\/text>\s*<\/g>/g, "")
      .replace(/\sfootprint-pulse\b/g, "")
      .replace(/<desc id="footprint-description">[\s\S]*?<\/desc>/,
        '<desc id="footprint-description">Three illustrative footprint candles with synthetic bid and ask volumes. Volume numbers accumulate as simulated trades print. This is an educational animation.</desc>');
  }

  function mountMarketFootprint(host) {
    let svg = host.matches?.("svg.footprint-visual")
      ? host
      : host.querySelector("svg.footprint-visual");

    if (!svg) {
      host.innerHTML = marketFootprintMarkup();
      svg = host.querySelector("svg.footprint-visual");
    }

    svg.querySelectorAll(".footprint-footer").forEach((footer) => footer.remove());
    svg.querySelectorAll("text").forEach((label) => {
      if (label.textContent.trim() === "BID × ASK" || /^VOL\s/.test(label.textContent)) {
        label.remove();
      } else {
        label.setAttribute("fill", "#b8bec5");
      }
    });
    const description = svg.querySelector("desc");
    if (description) {
      description.textContent = "Illustrative footprint candles with accumulating synthetic bid and ask volumes.";
    }

    const columns = new Map();
    const levels = [...svg.querySelectorAll(".footprint-level")];
    const cells = levels.map((level) => {
      const rectangles = [...level.querySelectorAll("rect")];
      const labels = [...level.querySelectorAll("text")];
      const candle = level.closest(".footprint-focus, .footprint-flank");
      const pair = [0, 1].map((side) => ({
        cell: rectangles[side],
        label: labels[side === 0 ? 0 : 2],
        volume: Number(labels[side === 0 ? 0 : 2].textContent),
        baseOpacity: 0.12,
        lastOpacity: -1,
        flashedAt: null,
      }));

      // The white selection border in the source is static. Volume now evolves.
      rectangles.slice(2).forEach((rectangle) => rectangle.remove());
      pair.forEach((record, side) => {
        record.cell.setAttribute("fill", side === 0 ? "#c88285" : "#079a7f");
        record.cell.setAttribute("stroke", "#e4e7eb");
        record.cell.setAttribute("stroke-width", "1.2");
        record.cell.setAttribute("stroke-opacity", "0");
        record.cell.setAttribute("vector-effect", "non-scaling-stroke");
        record.cell.classList.remove("footprint-pulse");
        record.label.setAttribute("fill", "#e4e7eb");
        record.label.setAttribute("paint-order", "stroke");
        record.label.setAttribute("stroke", "#08090b");
        record.label.setAttribute("stroke-width", "0.65");
        record.label.setAttribute("stroke-opacity", "0.8");
      });
      if (!columns.has(candle)) columns.set(candle, []);
      columns.get(candle).push(...pair);
      return pair;
    });

    const focusedLevels = levels
      .map((level, index) => level.closest(".footprint-focus") ? index : -1)
      .filter((index) => index >= 0);
    const preferredLevels = focusedLevels.length ? focusedLevels : levels.map((_, index) => index);
    const rowSequence = [2, 3, 4, 3, 5, 2, 4, 6, 3, 1, 5, 4];
    const activeFlashes = new Set();
    let previousInput = null;
    let clock = 0;
    let nextPrintAt = 0.38;
    let printCount = 0;

    function opacity(record, value) {
      if (Math.abs(record.lastOpacity - value) < 0.01) return;
      record.cell.setAttribute("fill-opacity", value.toFixed(3));
      record.lastOpacity = value;
    }

    function refreshVolumes() {
      columns.forEach((column) => {
        const maximum = Math.max(1, ...column.map((record) => record.volume));
        column.forEach((record) => {
          record.baseOpacity = 0.09 + 0.24 * record.volume / maximum;
          if (!activeFlashes.has(record)) opacity(record, record.baseOpacity);
        });
      });
    }

    function print() {
      const row = rowSequence[printCount % rowSequence.length] % preferredLevels.length;
      const level = preferredLevels[row];
      const side = printCount % 5 === 3 || printCount % 7 === 5 ? 0 : 1;
      const record = cells[level][side];
      record.volume += 1 + (printCount * 7 + 4) % 17;
      record.label.textContent = String(record.volume);
      record.label.setAttribute("fill", "#ffffff");
      record.label.setAttribute("font-weight", "600");
      record.flashedAt = clock;
      activeFlashes.add(record);
      printCount += 1;
      refreshVolumes();
    }

    function update(elapsedSeconds) {
      if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) return;
      if (previousInput === null) previousInput = elapsedSeconds;
      const difference = Math.max(0, elapsedSeconds - previousInput);
      previousInput = elapsedSeconds;
      // An inactive interval cannot cause a long catch-up burst on the next frame.
      clock += Math.min(difference, 2);

      let processed = 0;
      while (clock >= nextPrintAt && processed < 4 && cells.length) {
        print();
        processed += 1;
        nextPrintAt += 0.32 + (printCount % 5) * 0.055;
      }
      if (processed === 4 && clock >= nextPrintAt) nextPrintAt = clock + 0.43;

      activeFlashes.forEach((record) => {
        const age = clock - record.flashedAt;
        if (age >= 0.62) {
          opacity(record, record.baseOpacity);
          record.cell.setAttribute("stroke-opacity", "0");
          record.label.setAttribute("fill", "#e4e7eb");
          record.label.setAttribute("font-weight", "400");
          record.flashedAt = null;
          activeFlashes.delete(record);
        } else {
          const remaining = 1 - age / 0.62;
          const strength = remaining * remaining;
          opacity(record, record.baseOpacity + (0.9 - record.baseOpacity) * strength);
          record.cell.setAttribute("stroke-opacity", (0.95 * strength).toFixed(3));
        }
      });
    }

    refreshVolumes();
    return { update };
  }

  window.marketFootprintMarkup = marketFootprintMarkup;
  window.mountMarketFootprint = mountMarketFootprint;
})();
