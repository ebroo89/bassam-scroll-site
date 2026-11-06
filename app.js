/* Shared public-page behavior: content, hero tape, navigation, course catalogue,
   course detail, service choices and application form. Each feature checks its markup. */
(function () {
  const C = window.MB || {};
  const visibility = window.MB_VISIBILITY;
  const programVisible = (id) => !visibility || visibility.isProgramVisible(id);
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const text = (value) => typeof value === "string" ? value.trim() : "";
  const normalizePhone = (value) => text(value)
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/[\s().-]/g, "");
  const httpUrl = (value) => {
    if (!text(value)) return "";
    try {
      const url = new URL(value, location.href);
      return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : "";
    } catch { return ""; }
  };
  const assetUrl = (value) => {
    const address = httpUrl(value);
    if (address) return address;
    const relative = text(value);
    if (!relative || /^(?:[a-z][a-z0-9+.-]*:|[\\/])/i.test(relative)) return "";
    try {
      const base = new URL(location.href);
      const asset = new URL(relative, base);
      return base.protocol === "file:" && asset.protocol === "file:" && asset.host === base.host ? asset.href : "";
    } catch { return ""; }
  };
  const fill = (selector, value) => {
    $$(selector).forEach((element) => {
      element.textContent = value;
      element.hidden = !value;
    });
  };
  let seed = 9;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // ── Content from config ──────────────────────────────────
  const award = C.award || {};
  if (C.name !== undefined) fill("[data-name]", text(C.name));
  if (C.nameEn !== undefined) {
    fill("[data-name-en]", text(C.nameEn));
  }
  if (C.brandName !== undefined || C.nameEn !== undefined) fill("[data-brand-name]", text(C.brandName) || text(C.nameEn));
  if (award.title !== undefined) fill("[data-award-title]", text(award.title));
  fill("[data-award-note]", text(award.note) || (award.confirmed === false ? "النتيجة بانتظار التدقيق النهائي." : ""));
  fill("[data-award-caption]", text(award.caption));
  fill("[data-group-note]", text(C.groupNote));
  const proof = httpUrl(award.proofUrl);
  $$("[data-award-proof]").forEach((link) => {
    link.hidden = !proof;
    if (proof) link.href = proof; else link.removeAttribute("href");
  });
  if (C.photo !== undefined) {
    const photo = assetUrl(C.photo);
    $$("[data-hero-portrait] img, img[data-portrait]").forEach((image) => {
      image.hidden = !photo;
      if (photo) image.src = photo; else image.removeAttribute("src");
    });
  }
  const prices = C.prices || {};
  const privateTraining = C.privateTraining || {};
  fill("[data-private-original]", privateTraining.originalPrice || "");
  fill("[data-private-discount]", privateTraining.discountLabel || "");
  fill("[data-private-status]", privateTraining.status || "");
  fill("[data-private-note]", privateTraining.note || "");
  fill("[data-private-action]", privateTraining.action || "ناقش هدفك من التدريب");
  // The booked month is explicit business data; future months are requests, not confirmed slots.
  const bookedMonth = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(privateTraining.fullyBookedMonth || "");
  const privateMonths = bookedMonth ? Array.from({ length: 3 }, (_, offset) => {
    const date = new Date(Date.UTC(+bookedMonth[1], +bookedMonth[2] - 1 + offset, 1));
    return { id: date.toISOString().slice(0, 7), date, booked: offset === 0 };
  }) : [];
  const privateMonthLabel = (month) => new Intl.DateTimeFormat(
    document.documentElement?.lang === "en" ? "en" : "ar-u-nu-latn",
    { month: "long", year: "numeric", timeZone: "UTC" }
  ).format(month.date);
  const validPrivateMonth = (id) => privateMonths.some((month) => month.id === id && !month.booked);
  const privateCalendar = $("[data-private-months]");
  let selectedPrivateMonth = "";
  const renderPrivateMonths = () => {
    if (!privateCalendar) return;
    privateCalendar.replaceChildren(...privateMonths.map((month) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "private-month";
      button.dataset.privateMonth = month.id;
      button.disabled = month.booked;
      button.setAttribute("aria-pressed", String(selectedPrivateMonth === month.id));
      const name = document.createElement("span");
      name.className = "private-month-name";
      name.setAttribute("translate", "no");
      name.textContent = privateMonthLabel(month);
      const state = document.createElement("span");
      state.className = "private-month-state";
      state.setAttribute("translate", "no");
      state.textContent = document.documentElement?.lang === "en"
        ? (month.booked ? "Fully booked" : "Request a date")
        : (month.booked ? "مكتمل الحجز" : "طلب موعد");
      const track = document.createElement("span");
      track.className = "private-month-track";
      track.setAttribute("aria-hidden", "true");
      button.append(name, state, track);
      return button;
    }));
    const selected = privateMonths.find((month) => month.id === selectedPrivateMonth);
    const selection = $("[data-private-selection]");
    if (selection) selection.hidden = !selected;
    fill("[data-private-selected-month]", selected ? privateMonthLabel(selected) : "");
    const link = $("[data-private-apply]");
    if (link) {
      const url = new URL("apply.html", location.href);
      url.searchParams.set("lang", document.documentElement?.lang || "ar");
      if (selected) url.searchParams.set("month", selected.id);
      url.hash = "private";
      link.href = url.href;
    }
  };
  if (privateCalendar) {
    privateCalendar.addEventListener("click", (event) => {
      const button = event.target.closest("[data-private-month]");
      if (!button || !validPrivateMonth(button.dataset.privateMonth)) return;
      selectedPrivateMonth = button.dataset.privateMonth;
      renderPrivateMonths();
    });
    document.addEventListener("site:languagechange", renderPrivateMonths);
    renderPrivateMonths();
  }
  $$("[data-price]").forEach((el) => {
    const v = prices[el.dataset.price];
    el.textContent = v || "السعر حسب الطلب";
  });

  const contacts = [];
  const whatsapp = normalizePhone(C.whatsapp).replace(/^\+/, "");
  if (/^[1-9]\d{7,14}$/.test(whatsapp)) contacts.push(["واتساب", `https://wa.me/${whatsapp}`]);
  [["تيليغرام", C.telegram, ["t.me", "telegram.me"]], ["إنستغرام", C.instagram, ["instagram.com", "www.instagram.com"]]].forEach(([label, value, hosts]) => {
    const address = httpUrl(value);
    if (!address) return;
    const url = new URL(address);
    if (url.protocol === "https:" && hosts.includes(url.hostname) && /^\/[a-z0-9_.]+\/?$/i.test(url.pathname)) {
      url.search = "";
      url.hash = "";
      contacts.push([label, url.href]);
    }
  });
  const email = text(C.email);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) contacts.push(["البريد الإلكتروني", `mailto:${encodeURIComponent(email).replace("%40", "@")}`]);
  $$("[data-contact-list]").forEach((container) => {
    container.replaceChildren(...contacts.map(([label, href]) => {
      const link = document.createElement("a");
      link.textContent = label;
      link.href = href;
      if (href.startsWith("https:")) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
      return link;
    }));
    container.hidden = contacts.length === 0;
  });

  // Decorative footprint levels, duplicated with matching pulse phases.
  const heroTapes = $$("[data-tape]");
  heroTapes.forEach((el, streamIndex) => {
    let rows = "";
    for (let i = 0; i < 60; i++) {
      const variation = rnd(), bidWeight = rnd(), askWeight = rnd();
      const level = i % 12, candle = Math.floor(i / 12);
      const concentration = Math.max(0.12, 1 - Math.abs(level - (4 + candle % 3)) / 7);
      const bid = level === 0 ? 0 : Math.round((10 + bidWeight * 130) * concentration);
      const ask = level === 11 ? 0 : Math.round((10 + askWeight * 150) * concentration);
      const price = (21453 + candle * 0.5 - level * 0.25).toFixed(2);
      const delay = -(candle * 1.3 + level * 0.18 + streamIndex * 2.4);
      const duration = 7 + variation * 2;
      const classes = level === 0 ? "tape-row candle-start" : "tape-row";
      rows += `<span class="${classes}" style="--pulse-delay:${delay.toFixed(2)}s;--pulse-duration:${duration.toFixed(2)}s"><span class="tape-price">${price}</span><span class="tape-volume tape-bid">${bid}</span><span class="tape-cross">×</span><span class="tape-volume tape-ask">${ask}</span></span>`;
    }
    el.innerHTML = rows + rows;
  });

  if (heroTapes.length) {
    let tapesInView = true;
    const updateTapePlayback = () => heroTapes.forEach((el) => {
      el.parentElement.classList.toggle("tape-paused", document.hidden || !tapesInView);
    });
    document.addEventListener("visibilitychange", updateTapePlayback);
    const hero = $(".hero");
    if (hero && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(([entry]) => {
        tapesInView = entry.isIntersecting;
        updateTapePlayback();
      });
      observer.observe(hero);
    }
    updateTapePlayback();
  }

  // Nav turns solid after the hero (always solid on pages without one)
  const nav = $("#nav");
  const hasHero = !!$(".hero");
  if (nav) {
    const onScroll = () => nav.classList.toggle("solid", !hasHero || scrollY > innerHeight * 0.6);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const toggle = $("[data-nav-toggle]"), links = $("[data-nav-links]");
    if (toggle && links) {
      const mobile = matchMedia("(max-width: 860px)");
      let open = false;
      const updateNav = () => {
        const expanded = mobile.matches && open;
        toggle.hidden = !mobile.matches;
        toggle.setAttribute("aria-expanded", String(expanded));
        links.hidden = mobile.matches && !expanded;
        links.inert = links.hidden;
        nav.classList.toggle("nav-open", expanded);
      };
      toggle.addEventListener("click", () => { open = !open; updateNav(); });
      links.addEventListener("click", (event) => {
        if (event.target.closest("a")) { open = false; updateNav(); }
      });
      nav.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && open) {
          open = false;
          updateNav();
          toggle.focus();
        }
      });
      mobile.addEventListener("change", () => { open = false; updateNav(); });
      updateNav();
      nav.classList.add("nav-ready");
    }
  }

  // Reveal on scroll
  const els = $$(".rv");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
  } else els.forEach((el) => el.classList.add("in"));

  // The course category uses natural-height panels so every card stays reachable.
  const programmeTabs = $$("[data-program-tab]").filter(button => programVisible(button.dataset.programTab));
  programmeTabs.forEach((button) => button.addEventListener("click", () => {
    const selected = button.dataset.programTab;
    if (!programVisible(selected)) return;
    programmeTabs.forEach((tab) => tab.setAttribute("aria-pressed", String(tab === button)));
    $$("[data-program-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.programPanel !== selected;
    });
  }));

  // Course choices share their data and pricing with the application summary.
  const allCourses = Array.isArray(C.courses) ? C.courses : [];
  const courses = visibility ? allCourses.filter(course => visibility.isCourseVisible(course.id)) : allCourses;
  const coursePrice = (course) => course.availability === "waitlist"
    ? "قائمة الانتظار"
    : `$${course.price.toLocaleString("en-US")}`;
  const courseOffer = (course) => {
    const waiting = course.availability === "waitlist";
    const open = course.availability === "open";
    const discounted = !waiting && course.originalPrice > course.price;
    return {
      status: waiting ? "قائمة الانتظار" : open ? "التسجيل مفتوح" : "",
      original: discounted ? `$${course.originalPrice.toLocaleString("en-US")}` : "",
      discount: discounted ? `${Math.round((1 - course.price / course.originalPrice) * 100)}%` : "",
      label: waiting ? "الحالة" : discounted ? "سعر المسار" : course.priceLabel || "السعر المقترح",
      action: waiting ? "انضم لقائمة الانتظار" : open ? "سجّل الآن" : "سجّل اهتمامك",
      note: waiting ? "سجّل اهتمامك لنبلغك عند فتح التسجيل." : open
        ? "أرسل بياناتك للتواصل معك واستكمال التسجيل في المسار." : "تعرّف إلى محتوى المسار وتفاصيل التسجيل.",
    };
  };
  const courseBenefits = (course) => {
    if (course.id === "champ") return "الانضباط النفسي وبناء الأفضلية الإحصائية جزء من محتوى المسار.";
    return "";
  };
  const bundleCourseImages = {
    "zero-intermediate": ["foundations", "order-flow"],
    "order-options": ["order-flow", "options-flow"],
    champ: ["foundations", "order-flow", "options-flow"],
  };
  const fillCourseCover = (cover, course) => {
    const imageIds = bundleCourseImages[course.id] || [course.id];
    cover.style.setProperty("--cover-count", imageIds.length);
    cover.replaceChildren(...imageIds.map((id) => {
      const image = document.createElement("img");
      image.src = course.image || `assets/img/courses-${id}.jpg`;
      image.alt = "";
      image.loading = "lazy";
      image.width = 1200;
      image.height = 800;
      return image;
    }));
  };
  const courseLink = (id) => {
    const link = new URL("course.html", location.href);
    link.searchParams.set("course", id);
    link.searchParams.set("lang", document.documentElement?.lang || "ar");
    return link.href;
  };
  const renderCourse = (course, page) => {
    const offer = courseOffer(course);
    fillCourseCover($("[data-course-image]", page), course);
    fill("[data-course-title]", course.title);
    fill("[data-course-level]", course.level);
    fill("[data-course-fit]", course.fit || "");
    fill("[data-course-description]", course.summary);
    fill("[data-course-price]", coursePrice(course));
    fill("[data-course-price-label]", offer.label);
    fill("[data-course-status]", offer.status);
    fill("[data-course-original]", offer.original);
    fill("[data-course-discount]", offer.discount ? `−${offer.discount}` : "");
    fill("[data-course-action]", offer.action);
    fill("[data-course-benefits]", courseBenefits(course));
    fill("[data-course-support]", course.support || "");
    fill("[data-course-note]", course.note || "");
    const inclusions = $("[data-course-inclusions]", page);
    if (inclusions) {
      const includedCourses = (course.includes || [])
        .map((id) => allCourses.find((item) => item.id === id))
        .filter(Boolean);
      inclusions.hidden = includedCourses.length === 0;
      $("[data-course-included-list]", page).replaceChildren(...includedCourses.map((included) => {
        const item = document.createElement("li");
        item.textContent = included.title;
        return item;
      }));
    }
    $("[data-course-topics]", page).replaceChildren(...course.topics.map((topic) => {
      const item = document.createElement("li");
      item.textContent = topic;
      return item;
    }));
    const link = new URL("apply.html", location.href);
    link.searchParams.set("course", course.id);
    link.searchParams.set("lang", document.documentElement.lang || "ar");
    link.hash = "group";
    $("[data-course-apply]", page).href = link.href;
    $("[data-course-detail]", page).hidden = false;
    if (typeof window !== "undefined") window.MB_CURRICULUM?.show(course.id);
  };
  const coursePage = $("[data-course-page]");
  if (coursePage) {
    const pageCourseId = new URL(location.href).searchParams.get("course");
    const pageCourse = courses.find(course => course.id === pageCourseId);
    const unavailable = $("[data-course-unavailable]");
    coursePage.hidden = !pageCourse;
    if (unavailable) unavailable.hidden = !!pageCourse;
    if (pageCourse) {
      document.title = `${pageCourse.title} | ${C.nameEn || "Muhammad Bassam"}`;
      renderCourse(pageCourse, coursePage);
    }
  }
  const catalogue = $("[data-course-catalog]");
  if (catalogue) {
    const list = $("[data-course-list]", catalogue);
    let courseType = courses.some(course => course.type === "bundle") ? "bundle" : "course";

    const showList = () => {
      list.dataset.courseType = courseType;
      list.dataset.count = String(courses.filter(course => course.type === courseType).length);
      const categories = [...new Set(courses.map(course => course.type))];
      $(".course-tabs", catalogue).hidden = categories.length < 2;
      $$("[data-course-type]", catalogue).forEach(button => { button.hidden = !categories.includes(button.dataset.courseType); });
      list.replaceChildren(...courses.filter((course) => course.type === courseType).map((course) => {
        const offer = courseOffer(course);
        const card = document.createElement("article");
        card.className = "course-card";
        const image = document.createElement("div");
        image.className = "course-cover course-card-image";
        fillCourseCover(image, course);
        if (offer.status) {
          const status = document.createElement("span");
          status.className = "course-availability";
          status.textContent = offer.status;
          image.append(status);
        }
        const copy = document.createElement("div");
        copy.className = "course-card-copy";
        const level = document.createElement("p");
        level.className = "course-card-level";
        level.textContent = course.level;
        const title = document.createElement("h4");
        title.id = `course-${course.id}-title`;
        title.textContent = course.title;
        const summary = document.createElement("p");
        summary.className = "course-card-summary";
        summary.textContent = course.summary;
        const footer = document.createElement("div");
        footer.className = "course-card-footer";
        const price = document.createElement("strong");
        price.dir = "ltr";
        price.textContent = coursePrice(course);
        if (course.availability === "waitlist") price.className = "course-waitlist-price";
        const button = document.createElement("a");
        button.href = courseLink(course.id);
        button.className = "course-card-open";
        button.dataset.courseOpen = course.id;
        const label = document.createElement("span");
        label.id = `course-${course.id}-details`;
        label.textContent = "عرض التفاصيل";
        label.className = "course-visually-hidden";
        button.setAttribute("aria-labelledby", `${title.id} ${label.id}`);
        button.append(label);
        const pricing = document.createElement("div");
        pricing.className = "course-card-pricing";
        if (offer.original) {
          const original = document.createElement("s");
          original.textContent = offer.original;
          original.dir = "ltr";
          original.title = "السعر قبل الخصم";
          pricing.append(original);
        }
        pricing.append(price);
        if (offer.discount) {
          const discount = document.createElement("span");
          discount.className = "course-discount";
          discount.dir = "ltr";
          discount.title = "خصم";
          discount.textContent = `−${offer.discount}`;
          pricing.append(discount);
        }
        const action = document.createElement("a");
        action.className = "course-card-action";
        action.id = `course-${course.id}-action`;
        action.setAttribute("aria-labelledby", `${title.id} ${action.id}`);
        const application = new URL("apply.html", location.href);
        application.searchParams.set("course", course.id);
        application.searchParams.set("lang", document.documentElement?.lang || "ar");
        application.hash = "group";
        action.href = application.href;
        action.textContent = offer.action;
        footer.append(pricing, action);
        copy.append(level, title, summary);
        copy.append(footer);
        // pay.js shows this only for offers that can be paid with crypto.
        const payment = document.createElement("a");
        payment.className = "pay-button course-card-pay";
        payment.dataset.payLink = "";
        payment.dataset.payOffer = course.id;
        payment.hidden = true;
        const coin = document.createElement("span");
        coin.className = "pay-coin";
        coin.setAttribute("aria-hidden", "true");
        const payLabel = document.createElement("span");
        payLabel.textContent = "ادفع بالكريبتو (USDT)";
        payment.append(coin, payLabel);
        copy.append(payment);
        card.append(button, image, copy);
        return card;
      }));
      $$("[data-course-type]", catalogue).forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.courseType === courseType));
      });
      if (typeof window !== "undefined") window.MB_PAY_LINKS?.();
    };

    catalogue.addEventListener("click", (event) => {
      const tab = event.target.closest("button[data-course-type]");
      if (tab) {
        courseType = tab.dataset.courseType;
        showList();
        return;
      }
    });
    document.addEventListener("site:learningchoice", (event) => {
      const course = courses.find((item) => item.id === event.detail?.course);
      if (!course) return;
      location.assign(courseLink(course.id));
    });
    $("[data-program-tab='group']")?.addEventListener("click", () => {
      courseType = courses.some(course => course.type === "bundle") ? "bundle" : "course";
      showList();
    });
    showList();
  }

  document.addEventListener("site:learningchoice", (event) => {
    const program = event.detail?.program;
    if ((program !== "private" && program !== "consult") || !programVisible(program)) return;
    $(`[data-program-tab="${program}"]`)?.click();
    $(`[data-program-panel="${program}"]`)?.scrollIntoView({ block: "start", behavior: "auto" });
  });

  const indicatorTypes = {"signals": {"label": "إشارات مبنية على قواعد", "description": "راقب نماذج تداول بقواعد محدّدة للتفعيل وإلغاء الفكرة، واربط الإشارات بخطتك ومخاطرتك قبل التنفيذ."}, "options": {"label": "أدوات الأوبشن فلو", "description": "اقرأ نشاط الأوبشن وتقديرات التمركز في عرض يساعدك على متابعة المناطق المهمة وتغيّر سياق السوق."}, "context": {"label": "أدوات قراءة السوق", "description": "رتّب مناطق المتابعة، واجمع الإشارات التي تهمّك، وراجع مدى توافقها مع شروطك بدل التنقّل بين قراءات متفرّقة."}};
  const indicatorLink = $("[data-indicator-apply]");
  $$("[data-indicator-type]").forEach((button) => button.addEventListener("click", () => {
    const type = button.dataset.indicatorType;
    $$("[data-indicator-type]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    fill("[data-indicator-preview]", indicatorTypes[type].description);
    const link = new URL("apply.html", location.href);
    link.searchParams.set("tool", type);
    link.searchParams.set("lang", document.documentElement.lang || "ar");
    link.hash = "indicator";
    indicatorLink.href = link.href;
  }));

  // ── Application: 3 steps ─────────────────────────────────
  const form = $("#applyForm");
  if (!form) return;
  const availablePrograms = ["group", "private", "consult", "indicator"].filter(programVisible);
  if (!availablePrograms.length) {
    form.hidden = true;
    $(".ap-sum")?.setAttribute("hidden", "");
    fill("[data-visibility-notice]", "لا توجد برامج متاحة للتسجيل حاليًا.");
    return;
  }
  const PROGRAMS = {
    private: { k: "تدريب فردي", action: privateTraining.action, title: "تدريب خاص", img: "assets/img/private-training-v1.jpg", price: "private", text: "تدريب فردي لتطوير قراءتك للسوق وقواعدك، ومراجعة تطبيقك وقراراتك مع محمد بسام." },
    group: { k: "مسار تدريبي متكامل", title: "From Zero to Champ", img: "assets/img/group.jpg", price: "group", text: "تعرّف إلى محتوى المسار وتفاصيل التسجيل." },
    consult: { k: "جلسة فردية", title: "استشارات", img: "assets/img/consult-review.jpg", price: "consult", text: "جلسة خاصة لمدة 90 دقيقة لمناقشة سؤالك أو الموضوع الذي تريد طرحه. جهّز سؤالك وأي مثال يساعد على توضيحه. يتواصل معك الفريق لتنسيق الموعد." },
    indicator: { k: "إصدارات قادمة", title: "مؤشرات وأدوات التداول", img: "assets/img/indicator-tools-v1.jpg", price: "indicators", availability: "قريبًا", text: "سجّل اهتمامك بأدوات الإشارات أو الأوبشن فلو أو قراءة السوق لتصلك تفاصيل الإصدارات القادمة." },
  };
  const steps = $$(".step", form);
  const prog = $$("[data-progress] li");
  const back = $("[data-back]"), nextBtn = $("[data-next]"), submit = $("[data-submit]");
  const msg = $(".form-msg", form);
  const done = $("#applyDone"), doneTitle = $("[data-done-title]");
  const rawEndpoint = text(C.webhookUrl);
  const endpoint = httpUrl(rawEndpoint);
  // Relative endpoints remain a preview on the local static server.
  const localPreview = /^(localhost|127\.0\.0\.1|\[?::1\]?)$/.test(location.hostname) && !/^https?:/i.test(rawEndpoint);
  const preview = !rawEndpoint || localPreview;
  const notice = $("[data-preview-notice]");
  if (notice) notice.hidden = !preview;
  const submitLabel = preview ? "جرّب النموذج" : "إرسال الطلب";
  let currentSubmitLabel = submitLabel;
  submit.textContent = submitLabel;
  let step = 1;
  let sending = false;
  const indicatorField = form.elements.indicator_interest;
  const requestedTool = new URL(location.href).searchParams.get("tool");
  if (indicatorField && Object.hasOwn(indicatorTypes, requestedTool)) indicatorField.value = requestedTool;
  const preferredMonthField = form.elements.preferred_month;
  const requestedMonth = new URL(location.href).searchParams.get("month");
  if (preferredMonthField) {
    const renderMonthOptions = () => {
      const current = preferredMonthField.value;
      const blank = document.createElement("option");
      blank.value = "";
      blank.setAttribute("translate", "no");
      blank.textContent = document.documentElement?.lang === "en" ? "Arrange the month later" : "ننسّق الشهر لاحقًا";
      preferredMonthField.replaceChildren(blank, ...privateMonths.map((month) => {
        const option = document.createElement("option");
        option.value = month.id;
        option.disabled = month.booked;
        option.setAttribute("translate", "no");
        const booked = document.documentElement?.lang === "en" ? "Fully booked" : "مكتمل الحجز";
        option.textContent = `${privateMonthLabel(month)}${month.booked ? ` — ${booked}` : ""}`;
        return option;
      }));
      preferredMonthField.value = validPrivateMonth(current) ? current : "";
    };
    renderMonthOptions();
    if (validPrivateMonth(requestedMonth)) preferredMonthField.value = requestedMonth;
    document.addEventListener("site:languagechange", renderMonthOptions);
  }
  const courseField = form.elements.course;
  const requestedCourse = new URL(location.href).searchParams.get("course");
  if (visibility && courseField) {
    const options = courses.map(course => {
      const option = document.createElement("option");
      option.value = course.id;
      option.textContent = course.title;
      return option;
    });
    if (courses.length !== 1) {
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "أريد المساعدة في الاختيار";
      options.unshift(blank);
    }
    courseField.replaceChildren(...options);
    courseField.value = courses.length === 1 ? courses[0].id : "";
  }
  if (courseField && courses.some((course) => course.id === requestedCourse)) {
    courseField.value = requestedCourse;
  }
  const errorFields = ["name", "phone", "email", "tv_user", "consent"];

  const fieldError = (name, message) => {
    const field = form.elements[name];
    const error = $(`[data-error-for="${name}"]`, form);
    field.classList.toggle("bad", !!message);
    field.setAttribute("aria-invalid", String(!!message));
    if (error) {
      error.textContent = message;
      error.hidden = !message;
      const descriptions = new Set((field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
      descriptions.add(error.id);
      field.setAttribute("aria-describedby", [...descriptions].join(" "));
    }
  };
  const clearErrors = () => {
    errorFields.forEach((name) => fieldError(name, ""));
    msg.textContent = "";
  };

  const setProgram = (v) => {
    if (!programVisible(v)) return;
    const r = form.querySelector(`input[name=program][value="${v}"]`);
    if (!r) return;
    r.checked = true;
    $$("[data-for]", form).forEach((el) => {
      el.hidden = !el.dataset.for.split(" ").includes(v);
      $$("input, select, textarea", el).forEach((field) => { field.disabled = el.hidden; });
    });
    const p = PROGRAMS[v];
    const course = v === "group" ? courses.find((item) => item.id === courseField?.value) : null;
    const tool = v === "indicator" ? indicatorTypes[indicatorField?.value] : null;
    const offer = course ? courseOffer(course) : null;
    $("[data-sum-img]").style.backgroundImage = `url(${course?.image || p.img})`;
    $("[data-sum-k]").textContent = course ? offer.status || offer.label : p.k;
    $("[data-sum-title]").textContent = course?.title || p.title;
    $("[data-sum-text]").textContent = course?.summary || tool?.description || p.text;
    $("[data-sum-price]").textContent = course ? coursePrice(course) : p.availability || prices[p.price] || "السعر حسب الطلب";
    fill("[data-sum-course-benefits]", course ? courseBenefits(course) : "");
    fill("[data-sum-price-label]", offer ? offer.label : p.availability ? "الإتاحة" : "السعر");
    fill("[data-sum-course-original]", v === "private" ? privateTraining.originalPrice || "" : offer?.original || "");
    fill("[data-sum-course-discount]", v === "private" ? privateTraining.discountLabel || "" : offer?.discount ? `−${offer.discount}` : "");
    const privateAvailability = $("[data-sum-private-availability]");
    if (privateAvailability) privateAvailability.hidden = v !== "private";
    if (v === "group") fill("[data-group-note]", offer?.note || "تعرّف إلى محتوى المسار وتفاصيل التسجيل.");
    currentSubmitLabel = preview ? submitLabel : offer?.action || p.action || submitLabel;
    submit.textContent = currentSubmitLabel;
  };
  const goStep = (n, focus = true) => {
    step = n;
    steps.forEach((s) => (s.hidden = +s.dataset.step !== n));
    prog.forEach((li, i) => {
      li.classList.toggle("on", i + 1 === n);
      li.classList.toggle("done", i + 1 < n);
      if (i + 1 === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    back.hidden = n === 1; nextBtn.hidden = n === 3; submit.hidden = n !== 3;
    clearErrors();
    if (focus) $("legend", steps[n - 1]).focus();
  };
  form.addEventListener("change", (event) => {
    if (event.target.name === "program" && !sending) { setProgram(event.target.value); clearErrors(); }
    if (event.target.name === "course" && !sending) setProgram("group");
    if (event.target.name === "indicator_interest" && !sending) setProgram("indicator");
    if (errorFields.includes(event.target.name)) fieldError(event.target.name, "");
  });
  form.addEventListener("input", (event) => {
    if (errorFields.includes(event.target.name)) { fieldError(event.target.name, ""); msg.textContent = ""; }
  });

  const errorsForStep = (n) => {
    const d = Object.fromEntries(new FormData(form));
    const errors = [];
    if (n === 2) {
      if (text(d.name).length < 2) errors.push(["name", "اكتب اسمك الكامل."]);
      if (!/^\+?\d{8,15}$/.test(normalizePhone(d.phone))) errors.push(["phone", "اكتب رقمًا صحيحًا من 8 إلى 15 رقمًا، مع رمز الدولة عند الحاجة."]);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(d.email))) errors.push(["email", "اكتب بريدًا إلكترونيًا صحيحًا."]);
    }
    if (n === 3) {
      if (!d.consent) errors.push(["consent", "أكد أنك قرأت تنويه المخاطرة قبل المتابعة."]);
    }
    return errors;
  };
  const showErrors = (errors) => {
    clearErrors();
    errors.forEach(([name, message]) => fieldError(name, message));
    if (!errors.length) return true;
    msg.textContent = "راجع الحقول الموضّحة.";
    form.elements[errors[0][0]].focus();
    return false;
  };
  nextBtn.addEventListener("click", () => {
    if (!sending && showErrors(errorsForStep(step))) goStep(step + 1);
  });
  back.addEventListener("click", () => { if (!sending) goStep(step - 1); });

  // apply.html#<program> preselects the program and jumps to the details step
  const fromHash = (focus = false) => {
    const v = location.hash.slice(1);
    const hiddenChoice = visibility && ((v && !programVisible(v)) || (requestedCourse && !visibility.isCourseVisible(requestedCourse)));
    if (hiddenChoice) fill("[data-visibility-notice]", "هذا الخيار غير متاح حاليًا. اختر من البرامج المتاحة أدناه.");
    const selected = Object.hasOwn(PROGRAMS, v) && programVisible(v) ? v : (visibility ? availablePrograms[0] : "private");
    setProgram(selected);
    goStep(Object.hasOwn(PROGRAMS, v) && !hiddenChoice ? 2 : 1, focus);
  };
  addEventListener("hashchange", () => { if (!form.hidden && !sending) fromHash(true); });
  fromHash();

  const DONE = {
    private: "سنراجع طلبك ونتواصل معك لتنسيق موعد تدريب قادم.",
    group: "استلمنا طلب التسجيل. سنتواصل معك لاستكمال الخطوات.",
    consult: "سيتواصل معك أحد أفراد الفريق لجمع المعلومات اللازمة وتنسيق موعد استشارتك لمدة 90 دقيقة.",
    indicator: "سنراجع اهتمامك ونتواصل معك بتفاصيل الأدوات عند توفرها.",
  };

  const setSending = (value) => {
    sending = value;
    submit.disabled = value;
    back.disabled = value;
    nextBtn.disabled = value;
    submit.textContent = value ? "جارٍ الإرسال…" : currentSubmitLabel;
    form.setAttribute("aria-busy", String(value));
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sending) return;
    if (step < 3) { if (showErrors(errorsForStep(step))) goStep(step + 1); return; }
    const detailsErrors = errorsForStep(2);
    if (detailsErrors.length) { goStep(2); showErrors(detailsErrors); return; }
    if (!showErrors(errorsForStep(3))) return;
    const d = Object.fromEntries(new FormData(form));
    if (d.company) return; // honeypot
    if (!programVisible(d.program) || (visibility && d.program === "group" && d.course && !visibility.isCourseVisible(d.course))) {
      msg.textContent = "هذا الخيار غير متاح حاليًا. اختر من البرامج المتاحة أدناه.";
      return;
    }

    const payload = {
      source: "mohammad-bassam-site",
      program: d.program,
      ...(d.program === "group" && courses.some((course) => course.id === d.course) ? { course: d.course } : {}),
      name: text(d.name), phone: normalizePhone(d.phone), email: text(d.email),
      country: d.country || "", level: d.level, market: d.market,
      goal: ["private", "group"].includes(d.program) ? text(d.goal) : "",
      topic: d.program === "consult" ? text(d.topic) : "", slot: d.program === "consult" ? d.slot : "",
      tv_user: d.program === "indicator" ? text(d.tv_user) : "",
      page: location.href, submitted_at: new Date().toISOString(),
    };

    if (d.program === "private" && validPrivateMonth(d.preferred_month)) {
      payload.preferred_month = d.preferred_month;
    }
    if (d.program === "indicator" && Object.hasOwn(indicatorTypes, d.indicator_interest)) {
      payload.indicator_interest = d.indicator_interest;
    }
    const selectedCourse = d.program === "group" ? courses.find((course) => course.id === d.course) : null;
    if (selectedCourse?.availability) {
      payload.enrollment_intent = selectedCourse.availability === "waitlist" ? "waitlist" : "enroll";
    }
    setSending(true);
    let deadline;
    try {
      if (!preview) {
        if (!endpoint) throw new Error("Invalid application endpoint");
        const controller = new AbortController();
        deadline = setTimeout(() => controller.abort(), 15000);
        const r = await fetch(endpoint, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
          signal: controller.signal,
        });
        if (r.status === 429) { msg.textContent = "انتظر قليلًا ثم جرّب إرسال الطلب مرة أخرى."; return; }
        const res = await r.json();
        if (!r.ok || !res || res.ok !== true) throw new Error("Application not acknowledged");
      }
      if (doneTitle) doneTitle.textContent = preview ? "اكتملت تجربة النموذج" : "استلمنا طلبك، شكرًا.";
      $("[data-done-text]").textContent = preview ? "هذه معاينة على هذا الجهاز فقط. لم نرسل بياناتك أو نسجّل طلبًا." : payload.enrollment_intent === "waitlist"
        ? "استلمنا طلب الانضمام لقائمة الانتظار. سنتواصل معك عند فتح التسجيل."
        : DONE[d.program];
      form.hidden = true;
      done.hidden = false;
      prog.forEach((li) => { li.classList.remove("on"); li.classList.add("done"); li.removeAttribute("aria-current"); });
      if (doneTitle) doneTitle.focus();
    } catch (err) {
      msg.textContent = "تعذر تأكيد استلام الطلب. معلوماتك باقية في النموذج، ويمكنك المحاولة مرة أخرى.";
    } finally {
      if (deadline !== undefined) clearTimeout(deadline);
      setSending(false);
    }
  });
})();
