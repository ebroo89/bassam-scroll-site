/* Site script: config fill, hero tape, footprint, program peek, nav, reveal, application form.
   Shared by index.html and apply.html; each part runs only if its markup is on the page. */
(function () {
  const C = window.MB || {};
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let seed = 9;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // ── Content from config ──────────────────────────────────
  const award = C.award || {};
  if (award.title) $$("[data-award-title]").forEach((el) => (el.textContent = award.title));
  const meta = [award.competition, award.year].filter(Boolean).join(" · ");
  $$("[data-award-meta]").forEach((el) => { el.textContent = meta; el.hidden = !meta; });
  const prices = C.prices || {};
  $$("[data-price]").forEach((el) => {
    const v = prices[el.dataset.price];
    el.textContent = v || "السعر حسب الطلب";
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
  const onScroll = () => nav.classList.toggle("solid", !hasHero || scrollY > innerHeight * 0.6);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

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
    private: { k: "Private 1:1", title: "دورة خاصة", img: "assets/img/mentor.jpg", price: "private", text: "تدريب فردي على قراءة تدفّق الأوامر، على مستواك ووقتك." },
    group: { k: "Group · Waitlist", title: "الدورة الجماعية", img: "assets/img/group.jpg", price: "group", text: "دفعة صغيرة بمنهج كامل. التسجيل بقائمة الانتظار." },
    consult: { k: "Consultation", title: "استشارة", img: "assets/img/consult.jpg", price: "consult", text: "جلسة مركّزة على سؤالك: صفقة، أداة، أو طريقة قراءة." },
    indicator: { k: "TradingView", title: "مؤشرات TradingView", img: "assets/img/indicator.jpg", price: "indicators", text: "أدوات مبنية على نفس طريقة القراءة، بتتفعّل على حسابك." },
  };
  const steps = $$(".step", form);
  const prog = $$("[data-progress] li");
  const back = $("[data-back]"), nextBtn = $("[data-next]"), submit = $("[data-submit]");
  const msg = $(".form-msg", form);
  let step = 1;

  const setProgram = (v) => {
    const r = form.querySelector(`input[name=program][value="${v}"]`);
    if (!r) return;
    r.checked = true;
    $$("[data-for]", form).forEach((el) => (el.hidden = !el.dataset.for.split(" ").includes(v)));
    const p = PROGRAMS[v];
    $("[data-sum-img]").style.backgroundImage = `url(${p.img})`;
    $("[data-sum-k]").textContent = p.k;
    $("[data-sum-title]").textContent = p.title;
    $("[data-sum-text]").textContent = p.text;
    $("[data-sum-price]").textContent = prices[p.price] || "السعر حسب الطلب";
  };
  const goStep = (n) => {
    step = n;
    steps.forEach((s) => (s.hidden = +s.dataset.step !== n));
    prog.forEach((li, i) => { li.classList.toggle("on", i + 1 === n); li.classList.toggle("done", i + 1 < n); });
    back.hidden = n === 1; nextBtn.hidden = n === 3; submit.hidden = n !== 3;
    msg.textContent = "";
  };
  form.addEventListener("change", (e) => { if (e.target.name === "program") setProgram(e.target.value); });

  const mark = (names, text) => {
    $$(".bad", form).forEach((el) => el.classList.remove("bad"));
    if (!names.length) return true;
    names.forEach((n) => form.elements[n].classList.add("bad"));
    form.elements[names[0]].focus();
    msg.textContent = text;
    return false;
  };
  const checkStep = (n) => {
    const d = Object.fromEntries(new FormData(form));
    if (n === 2) {
      const bad = [];
      if (!d.name || d.name.trim().length < 2) bad.push("name");
      if (!/^\+?[\d\s-]{8,18}$/.test((d.phone || "").trim())) bad.push("phone");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((d.email || "").trim())) bad.push("email");
      return mark(bad, "في معلومات ناقصة أو مش صحيحة. راجع الحقول المعلّمة.");
    }
    if (n === 3) {
      if (!mark(d.program === "indicator" && !(d.tv_user || "").trim() ? ["tv_user"] : [], "اكتب اسم المستخدم على TradingView.")) return false;
      if (!d.consent) { msg.textContent = "لازم توافق على تنويه المخاطرة."; return false; }
    }
    return true;
  };
  nextBtn.addEventListener("click", () => { if (checkStep(step)) goStep(step + 1); });
  back.addEventListener("click", () => goStep(step - 1));

  // apply.html#<program> preselects the program and jumps to the details step
  const fromHash = () => {
    const v = location.hash.slice(1);
    if (PROGRAMS[v]) { setProgram(v); goStep(2); } else { setProgram("private"); goStep(1); }
  };
  addEventListener("hashchange", () => { if (!form.hidden) fromHash(); });
  fromHash();

  const DONE = {
    private: "منراجع طلبك ومنتواصل معك على واتساب لتحديد أول جلسة.",
    group: "انضفت لقائمة الانتظار. أول ما تفتح الدفعة الجاية منبعتلك.",
    consult: "منتواصل معك على واتساب لتثبيت موعد الاستشارة.",
    indicator: "منتواصل معك على واتساب لتفعيل المؤشر على حسابك.",
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (step < 3) { if (checkStep(step)) goStep(step + 1); return; } // Enter key on steps 1–2
    if (!checkStep(2)) { goStep(2); checkStep(2); return; }
    if (!checkStep(3)) return;
    const d = Object.fromEntries(new FormData(form));
    if (d.company) return; // honeypot

    const payload = {
      source: "mohammad-bassam-site",
      program: d.program,
      name: d.name.trim(), phone: d.phone.trim(), email: d.email.trim(),
      country: d.country || "", level: d.level, market: d.market,
      goal: d.goal || "", topic: d.topic || "", slot: d.program === "consult" ? d.slot : "",
      tv_user: d.tv_user || "",
      page: location.href, submitted_at: new Date().toISOString(),
    };

    submit.disabled = true; submit.textContent = "SENDING…";
    const reset = () => { submit.disabled = false; submit.textContent = "SEND APPLICATION"; };
    // The PHP relay doesn't run on the local preview server
    const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !/^https?:/.test(C.webhookUrl || "");
    try {
      if (C.webhookUrl && !local) {
        const r = await fetch(C.webhookUrl, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        const res = await r.json().catch(() => ({}));
        if (r.status === 429) { msg.textContent = "وصل طلبك قبل شوي. إذا بدك تعدّل شي تواصل معنا على واتساب."; reset(); return; }
        if (!r.ok || res.ok === false) throw new Error(res.error || r.status);
      } else {
        console.info("[preview mode] not sent:", payload);
      }
      $("[data-done-text]").textContent = DONE[d.program];
      form.hidden = true;
      $("#applyDone").hidden = false;
      prog.forEach((li) => { li.classList.remove("on"); li.classList.add("done"); });
      scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      msg.textContent = "ما زبط الإرسال. جرّب كمان مرة أو تواصل معنا على واتساب.";
      reset();
    }
  });
})();
