/* Local, persisted visibility controls. Course content and prices stay in config.js. */
(function () {
  "use strict";
  const sections = {
    hero: ["الواجهة الرئيسية", "الصورة والتعريف والإنجاز"],
    edge: ["بناء الأفضلية", "منهج بناء نظام التداول واختباره"],
    reads: ["قراءة السوق", "بيئة السوق وخريطة السياق والتنفيذ"],
    programs: ["البرامج", "الدورات والتدريب والاستشارات والمؤشرات"],
    rules: ["الأسئلة الشائعة", "الدورات المشمولة وطريقة الدراسة والتسجيل"],
    contact: ["الدعوة للتواصل", "القسم الأخير لاختيار البرنامج"],
  };
  const programs = {
    group: ["الدورات الجماعية", "الدورات والباقات المختارة أدناه"],
    private: ["التدريب الخاص", "التدريب الفردي ومواعيد الأشهر القادمة"],
    consult: ["الاستشارات", `جلسة لمدة 90 دقيقة${window.MB?.prices?.consult ? ` — ${window.MB.prices.consult}` : ""}`],
    indicator: ["المؤشرات", "الأدوات القادمة وتسجيل الاهتمام"],
  };
  const courses = Array.isArray(window.MB?.courses) ? window.MB.courses : [];
  const form = document.querySelector("#visibility-form");
  const fields = document.querySelector("#settings-fields");
  const save = document.querySelector("#save-visibility");
  const status = document.querySelector("#save-status");
  const error = document.querySelector("#save-error");
  const retry = document.querySelector("#retry-load");
  const preset = document.querySelector("#champ-preset");
  const summary = document.querySelector("#visible-summary");
  let draft = null;
  let saved = "";
  let busy = false;

  function row(group, id, title, note, image) {
    const label = document.createElement("label");
    label.className = image ? "setting-row course-row" : "setting-row";
    if (image) {
      const thumb = document.createElement("img");
      thumb.className = "course-thumb";
      thumb.src = image;
      thumb.alt = "";
      thumb.width = 70;
      thumb.height = 47;
      thumb.loading = "lazy";
      label.append(thumb);
    }
    const copy = document.createElement("span");
    copy.className = "setting-text";
    const heading = document.createElement("span");
    heading.className = "setting-title";
    heading.textContent = title;
    const detail = document.createElement("span");
    detail.className = "setting-note";
    detail.textContent = note;
    copy.append(heading, detail);
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "visibility-switch";
    input.setAttribute("role", "switch");
    input.dataset.group = group;
    input.dataset.id = id;
    input.setAttribute("aria-label", `إظهار ${title}`);
    label.append(copy, input);
    return label;
  }

  Object.entries(sections).forEach(([id, [title, note]]) => {
    document.querySelector("#section-options").append(row("sections", id, title, note));
  });
  Object.entries(programs).forEach(([id, [title, note]]) => {
    document.querySelector("#program-options").append(row("programs", id, title, note));
  });
  courses.forEach((course) => {
    const kind = course.type === "bundle" ? "باقة" : "دورة";
    const price = course.availability === "waitlist" ? "قائمة الانتظار" : `$${Number(course.price).toLocaleString("en-US")}`;
    const cover = course.image || `assets/img/courses-${course.includes?.[0] || course.id}.jpg`;
    document.querySelector("#course-options").append(row("courses", course.id, course.title, `${kind} · ${price}`, cover));
  });

  function validState(value) {
    if (!value || value.version !== 1) return false;
    const keys = { sections: Object.keys(sections), programs: Object.keys(programs), courses: courses.map(course => course.id) };
    return Object.entries(keys).every(([group, ids]) => value[group] && ids.every(id => typeof value[group][id] === "boolean"));
  }

  function displayState() {
    const dirty = draft !== null && JSON.stringify(draft) !== saved;
    save.disabled = busy || !dirty;
    fields.disabled = busy || !draft;
    preset.disabled = busy || !draft;
    save.textContent = busy && draft ? "جارٍ الحفظ…" : "حفظ التغييرات";
    if (!draft) return;
    form.querySelectorAll("input[data-group]").forEach(input => {
      input.checked = draft[input.dataset.group][input.dataset.id];
    });
    status.textContent = dirty ? "لديك تغييرات لم تُحفظ بعد." : "الإعدادات محفوظة. المعاينة تعرض آخر نسخة محفوظة.";
    if (!draft.sections.programs) {
      summary.textContent = "قسم البرامج مخفي حاليًا، مع الاحتفاظ باختيارات الدورات والخدمات.";
      return;
    }
    const shown = [];
    if (draft.programs.group) shown.push(...courses.filter(course => draft.courses[course.id]).map(course => course.title));
    Object.entries(programs).forEach(([id, [title]]) => {
      if (id !== "group" && draft.programs[id]) shown.push(title);
    });
    summary.textContent = shown.length ? `خيارات التعلّم الظاهرة: ${shown.join("، ")}.` : "لا توجد خيارات تعلّم ظاهرة. فعّل دورة أو خدمة لعرضها.";
  }

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
  }

  async function load() {
    busy = true;
    error.hidden = true;
    retry.hidden = true;
    displayState();
    status.textContent = "جارٍ تحميل إعدادات الموقع…";
    try {
      const response = await fetch("/api/visibility", { cache: "no-store", headers: { "Accept": "application/json" } });
      if (!response.ok) throw new Error("load");
      const value = await response.json();
      if (!validState(value)) throw new Error("schema");
      draft = value;
      saved = JSON.stringify(value);
    } catch {
      showError("تعذّر تحميل الإعدادات. تأكد أن خادم الموقع المحلي يعمل ثم أعد المحاولة.");
      status.textContent = "الإعدادات غير محمّلة.";
      retry.hidden = false;
    } finally {
      busy = false;
      displayState();
    }
  }

  form.addEventListener("change", (event) => {
    const input = event.target;
    if (busy || !draft || !input.matches("input[data-group]")) return;
    draft[input.dataset.group][input.dataset.id] = input.checked;
    error.hidden = true;
    displayState();
  });

  preset.addEventListener("click", () => {
    if (busy || !draft) return;
    draft.sections.programs = true;
    draft.programs.group = true;
    Object.keys(draft.courses).forEach(id => { draft.courses[id] = id === "champ"; });
    error.hidden = true;
    displayState();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !draft || JSON.stringify(draft) === saved) return;
    busy = true;
    error.hidden = true;
    displayState();
    status.textContent = "جارٍ حفظ التغييرات…";
    try {
      const response = await fetch("/api/visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-Site-Admin": "1" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) throw new Error("save");
      const value = await response.json();
      if (!validState(value)) throw new Error("schema");
      draft = value;
      saved = JSON.stringify(value);
    } catch {
      showError("تعذّر حفظ التغييرات. اختياراتك محفوظة في هذه الصفحة؛ حاول الحفظ مجددًا.");
    } finally {
      busy = false;
      displayState();
    }
  });
  retry.addEventListener("click", load);
  load();
})();
