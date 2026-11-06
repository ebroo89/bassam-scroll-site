/* Synthetic skew and term-structure geometry. The host owns animation timing. */
(function () {
  const columns = 24;
  const rows = 16;
  const format = (value) => value.toFixed(2);

  function volatility(strike, days, time) {
    const shortSkew = -5.2 * strike * Math.exp(-days / 200);
    const smile = 2.8 * strike * strike;
    const eventDays = 32 + 20 * Math.sin(time * 0.42);
    const eventStrike = -0.1 + 0.16 * Math.sin(time * 0.38);
    const event = (4.8 + 1.5 * Math.sin(time * 0.49))
      * Math.exp(-Math.pow((days - eventDays) / 21, 2) - Math.pow((strike - eventStrike) / 0.75, 2));
    const movingStrike = -0.25 + 0.5 * Math.sin(time * 0.46);
    const movingDays = 65 + 44 * Math.sin(time * 0.36);
    const localized = (3.4 + 3.4 * Math.sin(time * 0.72))
      * Math.exp(-Math.pow((strike - movingStrike) / 0.3, 2) - Math.pow((days - movingDays) / 27, 2));
    const pressureBand = 1.65 * Math.sin(time * 1.05 - strike * 3.2 - days * 0.045)
      * Math.exp(-Math.pow((days - 90) / 85, 2));
    return 16 + 3.5 * Math.sqrt(days / 180) + shortSkew + smile + event + localized + pressureBand;
  }

  function project(strike, days, value) {
    const x = strike * 220;
    const depth = ((days - 7) / 173 - 0.5) * 190;
    return {
      x: 360 + x * 0.94 + depth * 0.52,
      y: 315 + x * 0.19 - depth * 0.42 - (value - 8) * 7.5,
    };
  }

  function path(points, closed = false) {
    const geometry = points.map((point, index) => `${index ? "L" : "M"}${format(point.x)},${format(point.y)}`).join(" ");
    return closed ? `${geometry} Z` : geometry;
  }

  function contour(grid, target) {
    const segments = [];
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const corners = [grid[row][column], grid[row][column + 1], grid[row + 1][column + 1], grid[row + 1][column]];
        const intersections = [];
        for (let edge = 0; edge < 4; edge++) {
          const start = corners[edge];
          const end = corners[(edge + 1) % 4];
          if ((start.value < target) === (end.value < target)) continue;
          const weight = (target - start.value) / (end.value - start.value);
          intersections.push(project(
            start.strike + (end.strike - start.strike) * weight,
            start.days + (end.days - start.days) * weight,
            target,
          ));
        }
        for (let index = 0; index + 1 < intersections.length; index += 2) {
          segments.push(path([intersections[index], intersections[index + 1]]));
        }
      }
    }
    return segments.join(" ");
  }

  function frame(time) {
    const grid = [];
    for (let row = 0; row <= rows; row++) {
      const days = 7 + row / rows * 173;
      const points = [];
      for (let column = 0; column <= columns; column++) {
        const strike = -1 + column / columns * 2;
        const value = volatility(strike, days, time);
        points.push({strike, days, value, ...project(strike, days, value)});
      }
      grid.push(points);
    }

    const ribbons = [];
    for (let row = rows - 1; row >= 0; row--) {
      ribbons.push(path([...grid[row], ...grid[row + 1].slice().reverse()], true));
    }
    const mesh = grid.map((points) => path(points));
    for (let column = 0; column <= columns; column++) {
      mesh.push(path(grid.map((points) => points[column])));
    }

    const front = grid[0];
    const skirt = path([
      ...front,
      project(1, 7, 8),
      project(-1, 7, 8),
    ], true);
    const selectedDays = 90 + 76 * Math.sin(time * 0.38);
    const selected = [];
    for (let column = 0; column <= columns; column++) {
      const strike = -1 + column / columns * 2;
      selected.push(project(strike, selectedDays, volatility(strike, selectedDays, time)));
    }
    const nodes = [-0.64, -0.15, 0.45].map((strike, index) => ({
      ...project(strike, selectedDays, volatility(strike, selectedDays, time)),
      radius: 3.2 + 0.9 * Math.sin(time * 1.6 + index),
    }));
    const spot = project(-0.25 + 0.5 * Math.sin(time * 0.46), 65 + 44 * Math.sin(time * 0.36), 8);
    return {ribbons, mesh, skirt, selected: path(selected), contours: [20, 24, 28].map((value) => contour(grid, value)), nodes, spot};
  }

  function numericTicks() {
    const ticks = [];
    function add(value, point, dx = 0, dy = 0, anchor = "middle") {
      ticks.push(`<text x="${format(point.x + dx)}" y="${format(point.y + dy)}" text-anchor="${anchor}">${value}</text>`);
    }
    [-1, 0, 1].forEach((strike) => add(String(18500 + strike * 400), project(strike, 7, 8), 0, 22));
    [7, 60, 180].forEach((days) => add(String(days), project(1, days, 8), 16, 4, "start"));
    [10, 20, 30].forEach((value) => add(String(value), project(-1, 7, value), -12, 4, "end"));
    return ticks.join("");
  }

  window.marketSurfaceMarkup = function () {
    const first = frame(0);
    const floor = [];
    for (let column = 0; column <= 8; column++) {
      const strike = -1 + column / 4;
      floor.push(path([project(strike, 7, 8), project(strike, 180, 8)]));
    }
    [7, 35, 60, 90, 120, 150, 180].forEach((days) => floor.push(path([project(-1, days, 8), project(1, days, 8)])));
    const boundaries = [
      path([project(-1, 7, 8), project(1, 7, 8), project(1, 180, 8)]),
      path([project(-1, 7, 8), project(-1, 7, 34)]),
    ];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 430" data-market-surface aria-hidden="true">
      <defs>
        <radialGradient id="mvs-floor-light"><stop stop-color="#079a7f" stop-opacity=".23"/><stop offset="1" stop-color="#079a7f" stop-opacity="0"/></radialGradient>
        <linearGradient id="mvs-front-shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#079a7f" stop-opacity=".12"/><stop offset="1" stop-color="#079a7f" stop-opacity=".01"/></linearGradient>
        <filter id="mvs-node-glow" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="3"/></filter>
      </defs>
      <g fill="none" stroke="#3c494c" stroke-width=".7" opacity=".62">${floor.map((d) => `<path d="${d}"/>`).join("")}</g>
      <ellipse data-surface-spot cx="${format(first.spot.x)}" cy="${format(first.spot.y)}" rx="110" ry="32" fill="url(#mvs-floor-light)"/>
      <path data-surface-skirt d="${first.skirt}" fill="url(#mvs-front-shade)"/>
      <g>${first.ribbons.map((d, index) => `<path data-surface-ribbon d="${d}" fill="#079a7f" fill-opacity="${(0.035 + index / rows * 0.06).toFixed(3)}"/>`).join("")}</g>
      <g fill="none" stroke="#079a7f" stroke-width="1.02" stroke-opacity=".86">${first.mesh.map((d) => `<path data-surface-mesh d="${d}"/>`).join("")}</g>
      <g fill="none" stroke="#b4d1c8" stroke-width="1.2" stroke-opacity=".4">${first.contours.map((d) => `<path data-surface-contour d="${d}"/>`).join("")}</g>
      <path data-surface-selected d="${first.selected}" fill="none" stroke="#c88285" stroke-width="2.2" stroke-opacity=".96"/>
      <g fill="none" stroke="#828c96" stroke-width=".9">${boundaries.map((d) => `<path d="${d}"/>`).join("")}</g>
      <g fill="#b0b9c1" font-family="monospace" font-size="11">${numericTicks()}</g>
      <g fill="#eee9e3">${first.nodes.map((node) => `<circle data-surface-node cx="${format(node.x)}" cy="${format(node.y)}" r="${format(node.radius)}"/>`).join("")}</g>
    </svg>`;
  };

  window.mountMarketSurface = function (host) {
    const svg = host.matches?.("[data-market-surface]") ? host : host.querySelector("[data-market-surface]");
    const ribbons = [...svg.querySelectorAll("[data-surface-ribbon]")];
    const mesh = [...svg.querySelectorAll("[data-surface-mesh]")];
    const contours = [...svg.querySelectorAll("[data-surface-contour]")];
    const nodes = [...svg.querySelectorAll("[data-surface-node]")];
    const skirt = svg.querySelector("[data-surface-skirt]");
    const selected = svg.querySelector("[data-surface-selected]");
    const spot = svg.querySelector("[data-surface-spot]");
    let lastTime = -Infinity;

    function update(elapsedSeconds) {
      const time = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
      if (time === lastTime) return;
      lastTime = time;
      const next = frame(time);
      ribbons.forEach((node, index) => node.setAttribute("d", next.ribbons[index]));
      mesh.forEach((node, index) => node.setAttribute("d", next.mesh[index]));
      contours.forEach((node, index) => node.setAttribute("d", next.contours[index]));
      skirt.setAttribute("d", next.skirt);
      selected.setAttribute("d", next.selected);
      spot.setAttribute("cx", format(next.spot.x));
      spot.setAttribute("cy", format(next.spot.y));
      nodes.forEach((node, index) => {
        node.setAttribute("cx", format(next.nodes[index].x));
        node.setAttribute("cy", format(next.nodes[index].y));
        node.setAttribute("r", format(next.nodes[index].radius));
      });
    }

    update(0);
    return {update};
  };
})();
