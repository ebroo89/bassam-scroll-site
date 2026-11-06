/* Shared presentation visibility. Course content stays intact in config.js. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && root.document) {
    root.MB_VISIBILITY = api.create(root.MB_VISIBILITY_STATE, root.MB?.courses || []);
    root.MB_VISIBILITY.apply(root.document);
  }
})(typeof window === "undefined" ? null : window, function () {
  const defaults = {
    version: 1,
    sections: { hero: true, edge: true, reads: true, programs: true, rules: true, contact: true },
    programs: { group: true, private: true, consult: true, indicator: true },
    courses: { foundations: false, "order-flow": false, "options-flow": false, quant: false,
      psychology: false, edge: false, "zero-intermediate": false, "order-options": false, champ: true },
  };
  function normalize(raw) {
    const result = { version: 1 };
    for (const group of ["sections", "programs", "courses"]) {
      result[group] = Object.fromEntries(Object.entries(defaults[group]).map(([key, value]) =>
        [key, typeof raw?.[group]?.[key] === "boolean" ? raw[group][key] : value]));
    }
    return result;
  }
  function create(raw, allCourses) {
    const state = normalize(raw);
    const isSectionVisible = (id) => state.sections[id] === true;
    const isCourseVisible = (id) => isSectionVisible("programs") && state.programs.group && state.courses[id] === true;
    const courses = allCourses.filter(course => isCourseVisible(course.id));
    const isProgramVisible = (id) => isSectionVisible("programs") && state.programs[id] === true && (id !== "group" || courses.length > 0);
    const programs = Object.keys(state.programs).filter(isProgramVisible);
    function apply(doc) {
      const first = programs[0];
      doc.querySelectorAll("[data-site-section]").forEach(el => { el.hidden = !isSectionVisible(el.dataset.siteSection); });
      doc.querySelectorAll("a[href]").forEach(link => {
        const href = link.getAttribute("href");
        let id = href.slice(1);
        if (!href.startsWith("#")) {
          try {
            const home = new URL("index.html", doc.baseURI);
            const target = new URL(href, doc.baseURI);
            if (target.protocol !== home.protocol || target.origin !== home.origin || target.pathname !== home.pathname) return;
            id = target.hash.slice(1);
          } catch { return; }
        }
        if (Object.hasOwn(state.sections, id)) link.hidden = !isSectionVisible(id);
      });
      doc.querySelectorAll("[data-program-tab]").forEach(el => {
        el.hidden = !isProgramVisible(el.dataset.programTab);
        el.setAttribute("aria-pressed", String(el.dataset.programTab === first));
      });
      doc.querySelectorAll("[data-program-choice]").forEach(el => {
        el.hidden = !isProgramVisible(el.dataset.programChoice);
        const input = el.querySelector("input");
        if (input) input.disabled = el.hidden;
      });
      doc.querySelectorAll("[data-program-panel]").forEach(el => { el.hidden = el.dataset.programPanel !== first; });
      doc.querySelectorAll("[data-no-offers]").forEach(el => { el.hidden = programs.length > 0; });
      const guide = doc.querySelector("[data-learning-guide]");
      if (guide) guide.hidden = !isProgramVisible("private") || !isProgramVisible("consult");
      if (courses.length === 1) {
        doc.querySelectorAll('[data-program-tab="group"], [data-program-choice="group"] b').forEach(el => { el.textContent = courses[0].title; });
        doc.querySelectorAll("[data-course-heading], [data-course-intro]").forEach(el => { el.hidden = true; });
      }
      const intro = doc.querySelector("[data-programs-intro]");
      if (intro && !isProgramVisible("private")) intro.textContent = "اختر المسار التدريبي أو الاستشارة المناسبة لهدفك.";
    }
    return { state, courses, programs, isSectionVisible, isProgramVisible, isCourseVisible, apply };
  }
  return { defaults, normalize, create };
});
