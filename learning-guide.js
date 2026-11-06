/* Optional, rule-based guidance. Answers remain in this page. */
(function () {
  const recommendations = {
    foundations: {
      course: "foundations",
      title: "التأسيس",
      reason: "تريد فهم بنية السوق وقراءة الشموع، وبناء بداية عملية قبل التعمّق في أدوات القراءة.",
    },
    orderflow: {
      course: "order-flow",
      title: "السيولة وتدفّق الأوامر",
      reason: "لديك أساس في التداول، وتريد فهم منطق المزاد وربط أدوات تدفّق الأوامر والسيولة بخطة تنفيذ.",
    },
    options: {
      course: "options-flow",
      title: "تدفّق الأوبشن",
      reason: "تريد فهم بيئة السوق والمناطق الرئيسية وتحولات المشاركة، وبناء سيناريوهات أوضح للحركة.",
    },
    quant: {
      course: "quant",
      title: "التداول الكمي والأتمتة",
      reason: "هدفك التعمّق في الأفضلية واختبار النماذج وأتمتتها. راجع المتطلبات البرمجية قبل اختيار هذا المسار.",
    },
    private: {
      program: "private",
      title: "التدريب الخاص",
      reason: "تفضّل تعلّمًا فرديًا يركّز على مستواك والأسئلة التي تواجهها في التطبيق.",
    },
    consult: {
      program: "consult",
      title: "استشارات",
      reason: "لديك سؤال محدّد أو مثال تريد مراجعته في نقاش مركّز.",
    },
  };

  function recommend(experience, goal) {
    if (!["new", "basic", "experienced"].includes(experience)) return null;
    if (!Object.hasOwn(recommendations, goal)) return null;
    if (experience === "new" && goal === "orderflow") {
      return {
        course: "zero-intermediate",
        title: "من الفهم إلى القرار",
        reason: "ابدأ بفهم السوق، ثم اربط قراءة السعر والسيولة بقواعد واضحة لاتخاذ القرار.",
      };
    }
    if (experience === "new" && goal === "options") {
      return {
        course: "foundations",
        title: "التأسيس",
        reason: "ابدأ بفهم بنية السوق وحركة السعر والشموع، ثم راجع جاهزيتك لدراسة تدفّق الأوبشن.",
      };
    }
    return { ...recommendations[goal] };
  }

  // A hidden bundle can be replaced only by an offer covering all its content.
  function findVisibleOffer(courseId, courses, visibility) {
    const available = courses.filter(course => visibility.isCourseVisible(course.id));
    const direct = available.find(course => course.id === courseId);
    if (direct) return direct;
    const byId = new Map(courses.map(course => [course.id, course]));
    const partsOf = (id, visited = new Set()) => {
      const course = byId.get(id);
      if (visited.has(id) || !course?.includes?.length) return [id];
      const trail = new Set(visited).add(id);
      return course.includes.flatMap(part => partsOf(part, trail));
    };
    const required = partsOf(courseId);
    return available.find(course => {
      const included = new Set(partsOf(course.id));
      return required.every(id => included.has(id));
    });
  }

  function resolveRecommendation(recommendation, courses, visibility) {
    if (!recommendation || !visibility) return recommendation;
    if (recommendation.program) return visibility.isProgramVisible(recommendation.program) ? recommendation : null;
    const offer = findVisibleOffer(recommendation.course, courses, visibility);
    if (!offer) return null;
    return offer.id === recommendation.course ? recommendation
      : { course: offer.id, title: offer.title, reason: offer.summary };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { recommend, resolveRecommendation };
  if (typeof document === "undefined") return;

  const guide = document.querySelector("[data-learning-guide]");
  if (!guide || guide.hidden) return;
  const visibility = typeof window !== "undefined" ? window.MB_VISIBILITY : null;
  const courses = typeof window !== "undefined" ? window.MB?.courses || [] : [];
  const form = guide.querySelector("form");
  const questions = [...guide.querySelectorAll("[data-guide-question]")];
  const result = guide.querySelector("[data-guide-result]");
  const next = guide.querySelector("[data-guide-next]");
  const back = guide.querySelector("[data-guide-back]");
  const open = guide.querySelector("[data-guide-open]");
  let step = 0;
  let recommendation = null;

  function answer(name) {
    return form.querySelector(`input[name="${name}"]:checked`)?.value || "";
  }

  function updateAvailableGoals() {
    if (!visibility) return;
    guide.querySelectorAll('input[name="guide-goal"]').forEach(input => {
      const available = !!resolveRecommendation(
        recommend(answer("guide-experience"), input.value), courses, visibility,
      );
      input.closest("label").hidden = !available;
      input.disabled = !available;
      if (!available) input.checked = false;
    });
  }

  function showStep(nextStep) {
    step = nextStep;
    if (step === 1) updateAvailableGoals();
    questions.forEach((question, index) => { question.hidden = index !== step; });
    result.hidden = step !== 2;
    back.hidden = step === 0;
    next.hidden = step === 2;
    next.disabled = !answer(step === 0 ? "guide-experience" : "guide-goal");
    const heading = step === 2 ? result.querySelector("[data-guide-title]") : questions[step].querySelector("legend");
    heading.focus({ preventScroll: true });
  }

  form.addEventListener("change", () => {
    next.disabled = !answer(step === 0 ? "guide-experience" : "guide-goal");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (step === 0 && answer("guide-experience")) {
      showStep(1);
      return;
    }
    if (step !== 1) return;
    recommendation = resolveRecommendation(
      recommend(answer("guide-experience"), answer("guide-goal")), courses, visibility,
    );
    if (!recommendation) return;
    result.querySelector("[data-guide-title]").textContent = recommendation.title;
    result.querySelector("[data-guide-reason]").textContent = recommendation.reason;
    showStep(2);
  });

  back.addEventListener("click", () => showStep(Math.max(0, step - 1)));
  open.addEventListener("click", () => {
    if (!recommendation) return;
    const choice = recommendation.course
      ? { course: recommendation.course }
      : { program: recommendation.program };
    guide.open = false;
    document.dispatchEvent(new CustomEvent("site:learningchoice", { detail: choice }));
  });
})();
