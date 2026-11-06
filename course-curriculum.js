/* Course cards within Champ. The main website sections stay in place. */
(function () {
  "use strict";
  const curriculum = document.querySelector("[data-champ-curriculum]");
  const modules = curriculum?.querySelector("[data-curriculum-modules]");
  if (!curriculum || !modules) return;
  const courses = Array.isArray(window.MB?.courses) ? window.MB.courses : [];
  const champ = courses.find(course => course.id === "champ");
  const ids = champ?.curriculum || [];
  modules.replaceChildren(...ids.flatMap(id => {
    const course = courses.find(item => item.id === id);
    if (!course) return [];
    const card = document.createElement("article");
    card.className = "curriculum-module";
    card.dataset.curriculumModule = id;
    const image = document.createElement("img");
    image.src = course.image || `assets/img/courses-${id}.jpg`;
    image.alt = "";
    image.width = 1200;
    image.height = 800;
    image.loading = "lazy";
    const content = document.createElement("div");
    content.className = "curriculum-module-copy";
    const title = document.createElement("h3");
    title.textContent = course.title;
    const summary = document.createElement("p");
    summary.textContent = course.summary;
    const outcomes = document.createElement("ul");
    (course.topics || []).slice(0, course.curriculumTopicCount || 3).forEach(topic => {
      const item = document.createElement("li");
      item.textContent = topic;
      outcomes.append(item);
    });
    content.append(title, summary, outcomes);
    card.append(image, content);
    return [card];
  }));
  window.MB_CURRICULUM = {
    show(id) { curriculum.hidden = id !== "champ"; },
    hide() { curriculum.hidden = true; }
  };
})();
