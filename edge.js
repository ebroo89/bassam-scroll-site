/* Let the page translate static copy while this section manages its state. */
(function () {
  const section = document.querySelector("[data-edge]");
  if (!section) return;

  const loop = section.querySelector("[data-edge-loop]");
  const routes = section.querySelector("[data-edge-routes]");
  const nodes = [...section.querySelectorAll("[data-edge-stage]")].sort(
    (a, b) => Number(a.dataset.edgeStage) - Number(b.dataset.edgeStage),
  );
  const paths = [...section.querySelectorAll("[data-edge-path]")].sort(
    (a, b) => Number(a.dataset.edgePath) - Number(b.dataset.edgePath),
  );
  const arrows = [...section.querySelectorAll("[data-edge-arrow]")].sort(
    (a, b) => Number(a.dataset.edgeArrow) - Number(b.dataset.edgeArrow),
  );
  const packet = section.querySelector("[data-edge-packet]");
  const trail = section.querySelector("[data-edge-trail]");
  const detail = section.querySelector("[data-edge-detail]");
  const detailStages = [...detail.querySelectorAll("[data-edge-detail-stage]")];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = matchMedia("(max-width: 650px)");
  const duration = 3400;

  let stage = 0;
  let elapsed = 0;
  let previousTime = 0;
  let frame = 0;
  let visible = false;
  let ready = false;
  let lengths = [];

  function showStage() {
    nodes.forEach((node, index) => {
      node.setAttribute("aria-pressed", String(index === stage));
    });
    detailStages.forEach((description) => {
      description.hidden = Number(description.dataset.edgeDetailStage) !== stage;
    });
  }

  function paint() {
    if (!ready) return;
    const progress = Math.max(0, Math.min(1, (elapsed / duration - 0.18) / 0.72));
    const eased = (1 - Math.cos(Math.PI * progress)) / 2;
    const distance = eased * lengths[stage];
    const point = paths[stage].getPointAtLength(distance);
    packet.setAttribute("cx", point.x);
    packet.setAttribute("cy", point.y);
    trail.setAttribute("d", paths[stage].getAttribute("d"));
    const tail = Math.min(22, distance);
    trail.setAttribute("stroke-dasharray", `${tail} ${lengths[stage] + 22}`);
    trail.setAttribute("stroke-dashoffset", String(-Math.max(0, distance - tail)));
  }

  function layout() {
    const bounds = loop.getBoundingClientRect();
    if (!bounds.width || !bounds.height) {
      ready = false;
      return;
    }

    routes.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
    const points = nodes.map((node) => {
      const rect = node.querySelector(".edge-symbol").getBoundingClientRect();
      return {
        x: rect.left - bounds.left + rect.width / 2,
        y: rect.top - bounds.top + rect.height / 2,
      };
    });

    paths.forEach((path, index) => {
      const start = points[index];
      const end = points[(index + 1) % nodes.length];
      let geometry;

      if (mobile.matches) {
        const horizontal = index % 2 === 0;
        const offset = index === 0 ? -13 : index === 2 ? 13 : 0;
        const side = start.x < bounds.width / 2 ? -28 : 28;
        geometry = horizontal
          ? `M ${start.x} ${start.y} C ${start.x} ${start.y + offset} ${end.x} ${end.y + offset} ${end.x} ${end.y}`
          : `M ${start.x} ${start.y} C ${start.x + side} ${start.y} ${end.x + side} ${end.y} ${end.x} ${end.y}`;
      } else if (index < nodes.length - 1) {
        geometry = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
      } else {
        const direction = start.x < end.x ? 1 : -1;
        const bottom = bounds.height - 60;
        const middle = bounds.width / 2;
        geometry = `M ${start.x} ${start.y} C ${start.x - direction * 60} ${start.y} ${start.x - direction * 60} ${bottom} ${middle} ${bottom} C ${end.x + direction * 60} ${bottom} ${end.x + direction * 60} ${end.y} ${end.x} ${end.y}`;
      }

      path.setAttribute("d", geometry);
      const length = path.getTotalLength();
      const middle = path.getPointAtLength(length / 2);
      const before = path.getPointAtLength(Math.max(0, length / 2 - 3));
      const angle = Math.atan2(middle.y - before.y, middle.x - before.x);
      arrows[index].setAttribute(
        "d",
        `M ${middle.x - 4 * Math.cos(angle - 0.6)} ${middle.y - 4 * Math.sin(angle - 0.6)} L ${middle.x} ${middle.y} L ${middle.x - 4 * Math.cos(angle + 0.6)} ${middle.y - 4 * Math.sin(angle + 0.6)}`,
      );
    });

    lengths = paths.map((path) => path.getTotalLength());
    ready = true;
    paint();
  }

  function canAnimate() {
    return ready && visible && !document.hidden && !reducedMotion.matches;
  }

  function schedule() {
    const active = canAnimate();
    loop.classList.toggle("is-running", active);
    packet.style.visibility = active ? "visible" : "hidden";
    trail.style.visibility = active ? "visible" : "hidden";

    if (!active) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      return;
    }
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function tick(time) {
    frame = 0;
    if (!canAnimate()) {
      schedule();
      return;
    }
    if (previousTime) elapsed += Math.min(time - previousTime, 80);
    previousTime = time;
    if (elapsed >= duration) {
      elapsed %= duration;
      stage = (stage + 1) % nodes.length;
      detail.setAttribute("aria-live", "off");
      showStage();
    }
    paint();
    schedule();
  }

  nodes.forEach((node, index) => {
    node.addEventListener("click", () => {
      stage = index;
      elapsed = 0;
      previousTime = 0;
      detail.setAttribute("aria-live", "polite");
      showStage();
      paint();
      schedule();
    });
  });

  document.addEventListener("site:languagechange", () => {
    showStage();
    layout();
    schedule();
  });
  document.addEventListener("visibilitychange", schedule);

  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      schedule();
    },
    { threshold: 0.2 },
  ).observe(loop);

  new ResizeObserver(() => {
    layout();
    schedule();
  }).observe(loop);

  mobile.addEventListener("change", () => {
    layout();
    schedule();
  });
  reducedMotion.addEventListener("change", () => {
    showStage();
    schedule();
  });

  showStage();
  layout();
  schedule();
  document.fonts.ready.then(() => {
    layout();
    schedule();
  });
})();
