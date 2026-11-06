/* Enrolment step (pay.html) and the enrol links on other pages. Nothing is paid on the site: the visitor leaves
   their details (sent to the same applications webhook as apply.html), then is told to contact us on WhatsApp to pay.
   Consultations arrive here after book.js has already held the slot, so they go straight to the WhatsApp step. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && root.document) api.mount(root);
})(typeof window === "undefined" ? null : window, function () {
  const OFFERS = {
    champ: { program: "group", k: "مسار تدريبي متكامل", img: "assets/img/group.jpg" },
    private: { program: "private", k: "فردي ومباشر", title: "تدريب خاص", img: "assets/img/private-training-v1.jpg" },
    consult: { program: "consult", k: "جلسة لمدة 90 دقيقة", title: "استشارات", img: "assets/img/consult-review.jpg" },
  };

  const BOOKING_KEY = "mb-consult-booking"; // written by book.js
  const text = (value) => typeof value === "string" ? value.trim() : "";
  // "2026-12": the month chosen for private training (empty when missing or malformed).
  const validMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(text(value)) ? text(value) : "";
  // The slot held on book.html, while it is still in the future; consultations come here only after choosing one.
  const savedBooking = (storage) => {
    try {
      const booking = JSON.parse(storage.getItem(BOOKING_KEY) || "null");
      return booking && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text(booking.slot)) && Date.parse(booking.slot) > Date.now() ? booking : null;
    } catch { return null; }
  };
  const normalizePhone = (value) => text(value)
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/[\s().-]/g, "");
  // "$7,990" → 7990; numbers pass through. Anything else (e.g. «حسب الطلب») has no fixed amount.
  const usdAmount = (value) => {
    if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : 0;
    const match = /^\s*\$?\s*([\d,]+(?:\.\d{1,2})?)\s*$/.exec(text(value));
    const amount = match ? Number(match[1].replace(/,/g, "")) : 0;
    return amount > 0 ? amount : 0;
  };
  const formatAmount = (amount) => `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  const httpUrl = (value, base) => {
    if (!text(value)) return "";
    try {
      const url = new URL(value, base);
      return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : "";
    } catch { return ""; }
  };
  // WhatsApp number for the payment step: supportWhatsapp, else whatsapp (digits only, international format).
  const whatsappDigits = (config = {}) => [config.supportWhatsapp, config.whatsapp]
    .map((value) => normalizePhone(value).replace(/^\+/, "")).find((value) => /^[1-9]\d{7,14}$/.test(value)) || "";
  const whatsappDisplay = (digits) => /^971\d{9}$/.test(digits) ? `+971 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}` : `+${digits}`;

  // Resolves an offer from config + visibility, or null when it is not open for enrolment.
  function payOffer(id, config = {}, visibility = null) {
    const base = Object.hasOwn(OFFERS, id) ? OFFERS[id] : null;
    if (!base) return null;
    if (visibility && !visibility.isProgramVisible(base.program)) return null;
    if (id === "champ") {
      const course = (config.courses || []).find((item) => item.id === "champ");
      if (!course || course.availability !== "open" || (visibility && !visibility.isCourseVisible("champ"))) return null;
      const amount = usdAmount(course.price);
      return amount ? { id, ...base, title: course.title, text: course.summary || "", amount } : null;
    }
    const amount = usdAmount((config.prices || {})[id]);
    return amount ? { id, ...base, amount } : null;
  }

  // Live when the applications endpoint (config.webhookUrl, the same one apply.html uses) is reachable;
  // otherwise a labelled preview that sends nothing.
  function payMode(config = {}, location = { href: "http://localhost/", hostname: "localhost" }) {
    const rawEndpoint = text(config.webhookUrl);
    const endpoint = httpUrl(rawEndpoint, location.href);
    const localPreview = /^(localhost|127\.0\.0\.1|\[?::1\]?)$/.test(location.hostname) && !/^https?:/i.test(rawEndpoint);
    // An https page cannot post to a plain-http endpoint (mixed content), so the request would never arrive.
    const blocked = /^https:/i.test(location.href) && /^http:/i.test(endpoint);
    return { live: !!(endpoint && !localPreview && !blocked), endpoint };
  }

  function requestErrors(fields) {
    const errors = [];
    if (text(fields.name).length < 2) errors.push(["name", "اكتب اسمك الكامل."]);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(fields.email))) errors.push(["email", "اكتب بريدًا إلكترونيًا صحيحًا."]);
    if (!/^\+?\d{8,15}$/.test(normalizePhone(fields.phone))) errors.push(["phone", "اكتب رقمًا صحيحًا من 8 إلى 15 رقمًا، مع رمز الدولة عند الحاجة."]);
    return errors;
  }

  // The same JSON the application form sends, so n8n/GoHighLevel file it the same way (tag, note, stage).
  function requestPayload(fields, offer, page, month) {
    return {
      source: "mohammad-bassam-site",
      program: offer.program,
      ...(offer.id === "champ" ? { course: "champ", enrollment_intent: "enroll" } : {}),
      ...(offer.id === "private" && validMonth(month) ? { preferred_month: validMonth(month) } : {}),
      name: text(fields.name), email: text(fields.email), phone: normalizePhone(fields.phone),
      company: text(fields.company), page, submitted_at: new Date().toISOString(),
    };
  }

  function whatsappLink(digits, offer, lang) {
    const url = new URL(`https://wa.me/${digits}`);
    url.searchParams.set("text", lang === "en"
      ? `Hello, I would like to pay for: ${offer.title}`
      : `مرحبًا، أريد إتمام الدفع لـ: ${offer.title}`);
    return url.href;
  }

  function mount(window) {
    const document = window.document;
    const C = window.MB || {};
    const visibility = window.MB_VISIBILITY || null;
    const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const lang = () => document.documentElement.lang || "ar";
    const payHref = (id, month) => {
      const url = new URL("pay.html", window.location.href);
      url.searchParams.set("offer", id);
      url.searchParams.set("lang", lang());
      if (month) url.searchParams.set("month", month);
      return url.href;
    };

    // Enrol links elsewhere: data-pay-offer is an offer id or "course" (the course page's own course).
    const offerFor = (link) => link.dataset.payOffer === "course"
      ? new URL(window.location.href).searchParams.get("course") : link.dataset.payOffer;
    // data-pay-target="book": the consultation button leads to the slot picker first.
    const bookHref = () => {
      const url = new URL("book.html", window.location.href);
      url.searchParams.set("lang", lang());
      return url.href;
    };
    const updateLinks = () => $$("[data-pay-link]").forEach((link) => {
      const offer = payOffer(offerFor(link), C, visibility);
      link.hidden = !offer;
      // Private training: the month chosen on the programmes page (data-pay-month) goes along.
      const month = offer && offer.id === "private" ? validMonth(link.dataset.payMonth) : "";
      if (offer) link.href = link.dataset.payTarget === "book" ? bookHref() : payHref(offer.id, month); else link.removeAttribute("href");
    });
    updateLinks();
    document.addEventListener("site:languagechange", updateLinks);
    window.MB_PAY_LINKS = updateLinks; // app.js re-renders course cards and calls this afterwards

    const page = $("[data-pay-page]");
    if (!page) return;
    const offer = payOffer(new URL(window.location.href).searchParams.get("offer"), C, visibility);
    // A consultation comes here after holding its slot; without one, go and choose.
    let booking = null;
    if (offer && offer.id === "consult") {
      booking = savedBooking(window.sessionStorage);
      if (!booking) { window.location.replace(bookHref()); return; }
    }
    const mode = payMode(C, window.location);
    $("[data-pay-unavailable]").hidden = !!offer;
    $("[data-pay-flow]").hidden = !offer;
    // The preview notice matters only where this page would send something (the course and private training).
    $("[data-pay-preview]").hidden = !offer || mode.live || offer.id === "consult";
    if (!offer) return;

    const backLink = $("[data-pay-back]");
    if (backLink && offer.id === "consult") {
      backLink.href = bookHref();
      backLink.textContent = "رجوع لتغيير الموعد";
    }
    if (backLink && offer.id === "champ") {
      const course = new URL("course.html", window.location.href);
      course.searchParams.set("course", offer.id);
      course.searchParams.set("lang", lang());
      backLink.href = course.href;
      backLink.textContent = "رجوع للدورة";
    }

    $("[data-sum-img]").style.backgroundImage = `url(${offer.img})`;
    $("[data-sum-k]").textContent = offer.k;
    $("[data-sum-title]").textContent = offer.title;
    $("[data-sum-text]").textContent = offer.text || "";
    $("[data-sum-text]").hidden = !offer.text;
    $$("[data-pay-amount]").forEach((el) => { el.textContent = formatAmount(offer.amount); });

    // Private training: the month asked for on the programmes page is shown and sent with the request.
    const trainingMonth = offer.id === "private" ? validMonth(new URL(window.location.href).searchParams.get("month")) : "";
    const monthBox = $("[data-pay-month]");
    if (trainingMonth && monthBox) {
      const renderMonth = () => {
        $("[data-pay-month-text]").textContent = new Date(`${trainingMonth}-15T12:00:00Z`).toLocaleDateString(
          lang() === "en" ? "en-GB" : "ar-AE-u-nu-latn", { timeZone: "UTC", month: "long", year: "numeric" });
      };
      renderMonth();
      document.addEventListener("site:languagechange", renderMonth);
      monthBox.hidden = false;
    }
    const bookingBox = $("[data-pay-booking]");
    if (booking && bookingBox) {
      const render = () => {
        const when = new Date(booking.slot).toLocaleDateString(lang() === "en" ? "en-GB" : "ar-AE-u-nu-latn",
          { timeZone: "Asia/Dubai", weekday: "long", day: "numeric", month: "long" });
        $("[data-pay-booking-text]").textContent = `${when} · ${booking.slot.slice(11, 16)}`;
      };
      render();
      document.addEventListener("site:languagechange", render);
      bookingBox.hidden = false;
    }

    const form = $("#payForm"), contact = $("[data-pay-contact]");
    const prog = $$("[data-progress] li");
    const msg = $(".form-msg", form), submit = $("[data-submit]", form);
    const submitLabel = "أرسل طلبي وأكمل";
    const digits = whatsappDigits(C);
    const waLink = $("[data-pay-whatsapp]", contact);
    const renderWhatsapp = () => {
      if (!digits) { waLink.hidden = true; return; }
      waLink.href = whatsappLink(digits, offer, lang());
      waLink.target = "_blank";
      $("[data-pay-whatsapp-number]", contact).textContent = whatsappDisplay(digits);
    };

    // Step 2: the WhatsApp payment panel. `sent` says whether a request reached us (false in the preview).
    const showContact = (sent) => {
      form.hidden = true;
      contact.hidden = false;
      $("[data-pay-sent]", contact).hidden = !sent;
      $("[data-pay-sent-preview]", contact).hidden = sent || offer.id === "consult";
      renderWhatsapp();
      document.addEventListener("site:languagechange", renderWhatsapp);
      prog.forEach((li, i) => {
        li.classList.toggle("on", i === 1);
        li.classList.toggle("done", i === 0);
        if (i === 1) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      });
      try { window.sessionStorage.removeItem(BOOKING_KEY); } catch { /* nothing to clear */ }
      $("h2", contact).focus();
    };

    // The consultation's details were sent with the booking already.
    if (booking) { showContact(!booking.demo); return; }

    const fieldNames = ["name", "email", "phone"];
    let sending = false;
    const fieldError = (name, message) => {
      const field = form.elements[name];
      const error = $(`[data-error-for="${name}"]`, form);
      field.classList.toggle("bad", !!message);
      field.setAttribute("aria-invalid", String(!!message));
      if (error) { error.textContent = message; error.hidden = !message; }
    };
    form.addEventListener("input", (event) => {
      if (fieldNames.includes(event.target.name)) { fieldError(event.target.name, ""); msg.textContent = ""; }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (sending) return;
      const fields = Object.fromEntries([...new window.FormData(form)].filter(([, value]) => typeof value === "string"));
      if (fields.company) return; // honeypot
      const errors = requestErrors(fields);
      fieldNames.forEach((name) => fieldError(name, ""));
      errors.forEach(([name, message]) => fieldError(name, message));
      if (errors.length) { msg.textContent = "راجع الحقول الموضّحة."; form.elements[errors[0][0]].focus(); return; }

      sending = true;
      submit.disabled = true;
      submit.textContent = "جارٍ الإرسال…";
      form.setAttribute("aria-busy", "true");
      let deadline;
      try {
        if (mode.live) {
          const controller = new window.AbortController();
          deadline = setTimeout(() => controller.abort(), 15000);
          const response = await window.fetch(mode.endpoint, {
            method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(requestPayload(fields, offer, window.location.href, trainingMonth)), signal: controller.signal,
          });
          if (response.status === 429) { msg.textContent = "انتظر قليلًا ثم جرّب الإرسال مرة أخرى."; return; }
          const result = await response.json();
          if (!response.ok || !result || result.ok !== true) throw new Error("Request not acknowledged");
        }
        showContact(mode.live);
      } catch {
        msg.textContent = "تعذّر تأكيد استلام طلبك. معلوماتك باقية في النموذج، ويمكنك المحاولة مرة أخرى.";
      } finally {
        if (deadline !== undefined) clearTimeout(deadline);
        sending = false;
        submit.disabled = false;
        submit.textContent = submitLabel;
        form.setAttribute("aria-busy", "false");
      }
    });
  }

  return { usdAmount, validMonth, payOffer, payMode, savedBooking, requestErrors, requestPayload, whatsappDigits, whatsappDisplay, whatsappLink, mount };
});
