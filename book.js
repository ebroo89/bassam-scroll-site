/* Consultation booking: the visitor picks a slot of the consultation calendar and leaves contact details. The booking is
   held in GoHighLevel as "Consultation Booked"; the page then points to WhatsApp so the team can confirm the details. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && root.document) api.mount(root);
})(typeof window === "undefined" ? null : window, function () {
  const TZ = "Asia/Dubai";
  const DEMO_TIMES = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30"]; // 90 min each, inside 09:00–19:00

  const text = (value) => typeof value === "string" ? value.trim() : "";
  const normalizePhone = (value) => text(value)
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/[\s().-]/g, "");
  const httpUrl = (value, base) => {
    if (!text(value)) return "";
    try {
      const url = new URL(value, base);
      return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : "";
    } catch { return ""; }
  };

  // Live only with a reachable endpoint; otherwise a labelled demo (generated slots, nothing is sent).
  function bookMode(config = {}, location = { href: "http://localhost/", hostname: "localhost" }) {
    const booking = config.booking || {};
    const rawEndpoint = text(booking.endpoint);
    const endpoint = httpUrl(rawEndpoint, location.href);
    const localPreview = /^(localhost|127\.0\.0\.1|\[?::1\]?)$/.test(location.hostname) && !/^https?:/i.test(rawEndpoint);
    // An https page cannot post to a plain-http endpoint (mixed content), so the booking would never arrive.
    const blocked = /^https:/i.test(location.href) && /^http:/i.test(endpoint);
    const live = !!(endpoint && !localPreview && !blocked);
    return { live, demo: !live && booking.test === true, endpoint };
  }

  const slotsUrl = (endpoint, days) => {
    return endpoint.replace(/\?.*$/, "") + "?days=" + days;
  };

  function bookErrors(fields, slot) {
    const errors = [];
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text(slot))) errors.push(["slot", "اختر يومًا ووقتًا للموعد."]);
    if (text(fields.name).length < 2) errors.push(["name", "اكتب اسمك الكامل."]);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(fields.email))) errors.push(["email", "اكتب بريدًا إلكترونيًا صحيحًا."]);
    if (!/^\+?\d{8,15}$/.test(normalizePhone(fields.phone))) errors.push(["phone", "اكتب رقمًا صحيحًا من 8 إلى 15 رقمًا، مع رمز الدولة عند الحاجة."]);
    return errors;
  }

  const dubaiDate = (date) => date.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
  // Generated slots for the demo: Monday to Friday, six 90-minute sessions, nothing in the next hour.
  function demoDays(now = new Date(), count = 14) {
    const days = [];
    for (let i = 0; days.length < count && i < count + 7; i += 1) {
      const date = dubaiDate(new Date(now.getTime() + i * 86400000));
      const weekday = new Date(`${date}T12:00:00+04:00`).getUTCDay(); // noon Dubai = 08:00 UTC, same date
      if (weekday === 0 || weekday === 6) continue;
      const slots = DEMO_TIMES.map((time) => ({ time, iso: `${date}T${time}:00+04:00` }))
        .filter((slot) => Date.parse(slot.iso) > now.getTime() + 3600000);
      if (slots.length) days.push({ date, slots });
    }
    return days.slice(0, Math.min(count, 10));
  }

  // The WhatsApp number of the support team (supportWhatsapp, else whatsapp), digits only; "" when none is valid.
  const whatsappDigits = (config = {}) => [config.supportWhatsapp, config.whatsapp]
    .map((value) => normalizePhone(value).replace(/^\+/, "")).find((value) => /^[1-9]\d{7,14}$/.test(value)) || "";
  const whatsappDisplay = (digits) => /^971\d{9}$/.test(digits)
    ? `+971 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}` : `+${digits}`;
  const whatsappLink = (digits, message) => `https://wa.me/${digits}?text=${encodeURIComponent(message).replace(/%20/g, "+")}`;

  function mount(window) {
    const document = window.document;
    const page = document.querySelector("[data-book-page]");
    if (!page) return;
    const C = window.MB || {};
    const visibility = window.MB_VISIBILITY || null;
    const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const lang = () => document.documentElement.lang || "ar";
    const locale = () => lang() === "en" ? "en-GB" : "ar-AE-u-nu-latn";
    const fmt = (iso, options) => new Date(iso).toLocaleDateString(locale(), { timeZone: TZ, ...options });

    const mode = bookMode(C, window.location);
    const open = !visibility || visibility.isProgramVisible("consult");
    $("[data-book-unavailable]").hidden = open;
    $("[data-book-flow]").hidden = !open;
    $("[data-book-demo]").hidden = !mode.demo;
    if (!open) return;
    if (!mode.live && !mode.demo) {
      $("[data-book-flow]").hidden = true;
      $("[data-book-unavailable]").hidden = false;
      return;
    }
    $("[data-sum-img]").style.backgroundImage = "url(assets/img/consult-review.jpg)";

    const form = $("#bookForm"), msg = $(".form-msg", form), submit = $("[data-submit]", form);
    const daysEl = $("[data-book-days]"), timesEl = $("[data-book-times]"), emptyEl = $("[data-book-empty]");
    const chosenText = $("[data-book-chosen-text]");
    const fieldNames = ["name", "email", "phone"];
    let days = [], date = "", slot = "", sending = false;

    const fieldError = (name, message) => {
      const el = $(`[data-error-for="${name}"]`, page), input = form.elements[name];
      if (el) { el.textContent = message || ""; el.hidden = !message; }
      if (input && input.setAttribute) input.setAttribute("aria-invalid", message ? "true" : "false");
    };
    const clearErrors = () => { ["slot", ...fieldNames].forEach((name) => fieldError(name, "")); msg.textContent = ""; };

    function renderChosen() {
      chosenText.textContent = slot
        ? `${fmt(slot, { weekday: "long", day: "numeric", month: "long" })} · ${slot.slice(11, 16)}`
        : "لم تختر موعدًا بعد";
    }
    function renderTimes() {
      const day = days.find((item) => item.date === date);
      timesEl.replaceChildren(...(day ? day.slots : []).map((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "book-time";
        button.textContent = item.time;
        button.setAttribute("dir", "ltr");
        button.setAttribute("aria-pressed", String(item.iso === slot));
        button.addEventListener("click", () => { slot = item.iso; fieldError("slot", ""); renderTimes(); renderChosen(); });
        return button;
      }));
    }
    function renderDays() {
      daysEl.replaceChildren(...days.map((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "book-day";
        const small = document.createElement("small");
        small.textContent = fmt(`${item.date}T12:00:00+04:00`, { weekday: "long" });
        const number = document.createElement("b");
        number.textContent = fmt(`${item.date}T12:00:00+04:00`, { day: "numeric" });
        const month = document.createElement("small");
        month.textContent = fmt(`${item.date}T12:00:00+04:00`, { month: "long" });
        button.append(small, number, month);
        button.setAttribute("aria-pressed", String(item.date === date));
        button.addEventListener("click", () => {
          date = item.date;
          if (!slot.startsWith(date)) slot = "";
          renderDays(); renderTimes(); renderChosen();
        });
        return button;
      }));
      emptyEl.hidden = days.length > 0;
      timesEl.hidden = days.length === 0;
    }
    const render = () => { renderDays(); renderTimes(); renderChosen(); };

    async function loadSlots() {
      if (mode.demo) {
        days = demoDays(new Date(), C.booking?.days || 14);
      } else {
        try {
          const response = await window.fetch(slotsUrl(mode.endpoint, C.booking?.days || 14), { headers: { Accept: "application/json" } });
          const data = await response.json();
          days = response.ok && data.ok && Array.isArray(data.days) ? data.days : [];
          if (!days.length && !(response.ok && data.ok)) msg.textContent = "تعذّر تحميل المواعيد. أعد المحاولة بعد قليل.";
        } catch {
          days = [];
          msg.textContent = "تعذّر تحميل المواعيد. أعد المحاولة بعد قليل.";
        }
      }
      if (!days.some((item) => item.date === date)) { date = days[0] ? days[0].date : ""; slot = ""; }
      render();
    }

    document.addEventListener("site:languagechange", render);

    // After the booking: the held time, and a WhatsApp button so the team can confirm quickly.
    const doneBox = $("[data-book-done]");
    const showDone = (booking) => {
      $("[data-book-done-time]").textContent = `${fmt(booking.slot, { weekday: "long", day: "numeric", month: "long" })} · ${booking.time}`;
      $("[data-book-done-demo]").hidden = !booking.demo;
      const digits = whatsappDigits(C);
      const contact = $("[data-book-done-contact]");
      if (digits && contact) {
        const when = `${booking.date} ${booking.time}`;
        const link = $("[data-book-done-whatsapp]", contact);
        link.href = whatsappLink(digits, lang() === "en"
          ? `Hello, I booked a consultation on ${when} through the website.`
          : `مرحبًا، حجزت موعد استشارة بتاريخ ${when} عبر الموقع.`);
        link.target = "_blank";
        $("[data-book-done-whatsapp-number]", contact).textContent = whatsappDisplay(digits);
        contact.hidden = false;
      }
      form.hidden = true;
      doneBox.hidden = false;
      $$("[data-book-step]").forEach((li) => { li.classList.remove("on"); li.classList.add("done"); li.removeAttribute("aria-current"); });
      $("[data-book-done-title]").focus();
    };

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (sending) return;
      clearErrors();
      const data = new window.FormData(form);
      const fields = Object.fromEntries(fieldNames.map((name) => [name, data.get(name) || ""]));
      const errors = bookErrors(fields, slot);
      if (errors.length) {
        errors.forEach(([name, message]) => fieldError(name, message));
        msg.textContent = "راجع الحقول الموضّحة.";
        const first = errors[0][0];
        (first === "slot" ? daysEl.querySelector("button") : form.elements[first])?.focus();
        return;
      }
      const booking = { slot, date: slot.slice(0, 10), time: slot.slice(11, 16), name: text(fields.name), email: text(fields.email), phone: normalizePhone(fields.phone), demo: !mode.live };
      sending = true;
      submit.disabled = true;
      try {
        if (mode.live) {
          const body = { ...booking, page: window.location.href, submitted_at: new Date().toISOString(), company: text(data.get("company")) };
          delete body.demo;
          const response = await window.fetch(mode.endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
          let result = {};
          try { result = await response.json(); } catch { /* handled below */ }
          if (response.status === 429) { msg.textContent = "انتظر قليلًا ثم جرّب مرة أخرى."; return; }
          if (result.error === "invalid" && Array.isArray(result.fields)) {
            result.fields.forEach((name) => fieldError(name, name === "slot" ? "اختر يومًا ووقتًا للموعد." : "راجع هذا الحقل."));
            msg.textContent = "راجع الحقول الموضّحة.";
            return;
          }
          if (result.error === "slot_taken") {
            slot = "";
            await loadSlots();
            fieldError("slot", "هذا الموعد لم يعد متاحًا. اختر موعدًا آخر.");
            msg.textContent = "حُجز هذا الموعد قبل لحظات.";
            return;
          }
          if (!response.ok || result.ok !== true) throw new Error("not_saved");
        }
        showDone(booking);
      } catch {
        msg.textContent = "تعذّر تثبيت الموعد. بياناتك باقية في النموذج، ويمكنك المحاولة مرة أخرى.";
      } finally {
        sending = false;
        submit.disabled = false;
      }
    });

    loadSlots();
  }

  return { bookMode, bookErrors, demoDays, slotsUrl, whatsappDigits, whatsappDisplay, whatsappLink, mount };
});
