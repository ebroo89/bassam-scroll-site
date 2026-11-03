/* Site script: config fill, hero tape, footprint, program peek, nav, reveal, application form.
   Shared by index.html and apply.html; each part runs only if its markup is on the page. */
(function () {
  const C = window.MB || {};
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
  const meta = [award.competition, award.year].filter(Boolean).join(" · ");
  fill("[data-award-meta]", meta);
  fill("[data-award-note]", text(award.note) || (award.confirmed === false ? "النتيجة بانتظار التدقيق النهائي." : ""));
  fill("[data-award-caption]", text(award.caption));
  fill("[data-group-status]", text(C.groupStatus));
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
    $$("[data-portrait-fallback]").forEach((element) => { element.hidden = !!photo; });
  }
  const prices = C.prices || {};
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

  // Hero tape: time & sales style rows (illustrative), duplicated for a seamless loop
  $$("[data-tape]").forEach((el) => {
    let p = 21450.25, rows = "";
    for (let i = 0; i < 60; i++) {
      p += Math.round((rnd() - 0.5) * 4) * 0.25;
      const size = Math.ceil(rnd() * rnd() * 60), big = size > 32 && el.dataset.tape === "red";
      rows += `<span class="${big ? "b" : ""}">${p.toFixed(2)}  ${String(size).padStart(3, " ")}</span><br>`;
    }
    el.innerHTML = rows + rows;
  });

  // Footprint: bid × ask per price over 5 bars; imbalance = one side ≥ 3× the diagonal other side
  const fp = $("[data-fp]");
  if (fp) {
    const levels = 11, top = 21462.0;
    let html = `<span></span>` + [1, 2, 3, 4, 5].map((b) => `<span class="fp-head">BAR ${b}</span>`).join("");
    const grid = [];
    for (let b = 0; b < 5; b++) {
      const center = 3 + b + Math.floor(rnd() * 2);
      grid[b] = Array.from({ length: levels }, (_, i) => {
        const w = Math.max(0, 1 - Math.abs(i - center) / 5);
        return [Math.round(w * (20 + rnd() * 160)), Math.round(w * (20 + rnd() * 160))];
      });
    }
    for (let i = 0; i < levels; i++) {
      html += `<span class="px">${(top - i * 0.25).toFixed(2)}</span>`;
      for (let b = 0; b < 5; b++) {
        const [bid, ask] = grid[b][i];
        if (!bid && !ask) { html += `<span class="c" style="background:transparent"></span>`; continue; }
        const below = grid[b][i + 1] ? grid[b][i + 1][0] : 0;
        const imb = (ask >= 3 * Math.max(below, 8)) || (bid >= 3 * Math.max(grid[b][i - 1] ? grid[b][i - 1][1] : 0, 8));
        const peak = Math.max(...grid[b].map(([x, y]) => x + y));
        html += `<span class="c ${imb ? "imb" : bid + ask === peak ? "poc" : ""}">${bid} × ${ask}</span>`;
      }
    }
    fp.innerHTML = html;
  }

  // Programs: grayscale photo follows the cursor on hover (desktop)
  const peek = $("[data-peek]");
  if (peek) $$("[data-list] a").forEach((a) => {
    a.addEventListener("mouseenter", () => { peek.style.backgroundImage = `url(${a.dataset.img})`; peek.style.opacity = 1; });
    a.addEventListener("mouseleave", () => (peek.style.opacity = 0));
    a.addEventListener("mousemove", (e) => { peek.style.left = e.clientX - 130 + "px"; peek.style.top = e.clientY - 220 + "px"; });
  });

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

  // ── Application: 3 steps ─────────────────────────────────
  const form = $("#applyForm");
  if (!form) return;
  const PROGRAMS = {
    private: { k: "تدريب فردي", title: "دورة خاصة", img: "assets/img/mentor.jpg", price: "private", text: "جلسات فردية لقراءة تدفّق الأوامر ومراجعة طريقة تعاملك مع السوق." },
    group: { k: "قائمة الانتظار", title: "الدورة الجماعية", img: "assets/img/group.jpg", price: "group", text: "تعلّم قراءة الشريط والبصمة وتدفّق الأوبشن ضمن مجموعة." },
    consult: { k: "جلسة فردية", title: "استشارة", img: "assets/img/consult.jpg", price: "consult", text: "جلسة لمناقشة سؤال محدد حول قراءة السوق أو استخدام أداة." },
    indicator: { k: "TradingView", title: "مؤشرات TradingView", img: "assets/img/indicator.jpg", price: "indicators", text: "اطلب تفاصيل المؤشرات المتاحة ومتطلبات استخدامها على TradingView." },
  };
  const steps = $$(".step", form);
  const prog = $$("[data-progress] li");
  const back = $("[data-back]"), nextBtn = $("[data-next]"), submit = $("[data-submit]");
  const msg = $(".form-msg", form);
  const done = $("#applyDone"), doneTitle = $("[data-done-title]");
  const rawEndpoint = text(C.webhookUrl);
  const endpoint = httpUrl(rawEndpoint);
  // Relative PHP endpoints remain a preview on the simple local static server.
  const localPreview = /^(localhost|127\.0\.0\.1|\[?::1\]?)$/.test(location.hostname) && !/^https?:/i.test(rawEndpoint);
  const preview = !rawEndpoint || localPreview;
  const notice = $("[data-preview-notice]");
  if (notice) notice.hidden = !preview;
  const submitLabel = preview ? "جرّب النموذج" : "إرسال الطلب";
  submit.textContent = submitLabel;
  let step = 1;
  let sending = false;
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
    const r = form.querySelector(`input[name=program][value="${v}"]`);
    if (!r) return;
    r.checked = true;
    $$("[data-for]", form).forEach((el) => {
      el.hidden = !el.dataset.for.split(" ").includes(v);
      $$("input, select, textarea", el).forEach((field) => { field.disabled = el.hidden; });
    });
    const p = PROGRAMS[v];
    $("[data-sum-img]").style.backgroundImage = `url(${p.img})`;
    $("[data-sum-k]").textContent = p.k;
    $("[data-sum-title]").textContent = p.title;
    $("[data-sum-text]").textContent = p.text;
    $("[data-sum-price]").textContent = prices[p.price] || "السعر حسب الطلب";
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
      if (d.program === "indicator" && !text(d.tv_user)) errors.push(["tv_user", "اكتب اسم المستخدم على TradingView."]);
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
    if (Object.hasOwn(PROGRAMS, v)) { setProgram(v); goStep(2, focus); } else { setProgram("private"); goStep(1, focus); }
  };
  addEventListener("hashchange", () => { if (!form.hidden && !sending) fromHash(true); });
  fromHash();

  const DONE = {
    private: "سنراجع طلبك ونتواصل معك لتحديد أول جلسة.",
    group: "استلمنا طلب انضمامك إلى قائمة الانتظار. سنتواصل معك بشأن الدفعة المقبلة.",
    consult: "سنراجع موضوع الاستشارة ونتواصل معك لتحديد الموعد.",
    indicator: "سنراجع طلبك ونتواصل معك بتفاصيل المؤشرات المتاحة.",
  };

  const setSending = (value) => {
    sending = value;
    submit.disabled = value;
    back.disabled = value;
    nextBtn.disabled = value;
    submit.textContent = value ? "جارٍ الإرسال…" : submitLabel;
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

    const payload = {
      source: "mohammad-bassam-site",
      program: d.program,
      name: text(d.name), phone: normalizePhone(d.phone), email: text(d.email),
      country: d.country || "", level: d.level, market: d.market,
      goal: ["private", "group"].includes(d.program) ? text(d.goal) : "",
      topic: d.program === "consult" ? text(d.topic) : "", slot: d.program === "consult" ? d.slot : "",
      tv_user: d.program === "indicator" ? text(d.tv_user) : "",
      page: location.href, submitted_at: new Date().toISOString(),
    };

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
      $("[data-done-text]").textContent = preview ? "هذه معاينة على هذا الجهاز فقط. لم نرسل بياناتك أو نسجّل طلبًا." : DONE[d.program];
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
