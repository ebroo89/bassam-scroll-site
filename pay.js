/* Crypto payment: USDT transfer instructions, proof-of-payment form, and the pay links on other pages.
   The site never confirms a payment itself; the team verifies each transfer after receiving the proof. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && root.document) api.mount(root);
})(typeof window === "undefined" ? null : window, function () {
  const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
  const OFFERS = {
    champ: { program: "group", k: "مسار تدريبي متكامل", img: "assets/img/group.jpg" },
    private: { program: "private", k: "فردي ومباشر", title: "تدريب خاص", img: "assets/img/private-training-v1.jpg" },
    consult: { program: "consult", k: "جلسة لمدة 90 دقيقة", title: "استشارات", img: "assets/img/consult-review.jpg" },
  };

  const BOOKING_KEY = "mb-consult-booking"; // written by book.js
  const text = (value) => typeof value === "string" ? value.trim() : "";
  // "2026-12": the month chosen for private training (empty when missing or malformed).
  const validMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(text(value)) ? text(value) : "";
  // The slot chosen on book.html, while it is still in the future; consultations are paid only after choosing one.
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
  // "$7,990" → 7990; numbers pass through. Anything else (e.g. empty «حسب الطلب») has no fixed amount.
  const usdAmount = (value) => {
    if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : 0;
    const match = /^\s*\$?\s*([\d,]+(?:\.\d{1,2})?)\s*$/.exec(text(value));
    const amount = match ? Number(match[1].replace(/,/g, "")) : 0;
    return amount > 0 ? amount : 0;
  };
  const formatAmount = (amount) => amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
  // TRON base58 address: T + 33 characters, without 0, O, I or l.
  const validTronAddress = (value) => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(text(value));
  const validTxid = (value) => !text(value) || /^(?:0x)?[0-9a-fA-F]{64}$/.test(text(value));
  const httpUrl = (value, base) => {
    if (!text(value)) return "";
    try {
      const url = new URL(value, base);
      return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : "";
    } catch { return ""; }
  };

  // Resolves a payable offer from config + visibility, or null when it cannot be paid for.
  function payOffer(id, config = {}, visibility = null) {
    const pay = config.cryptoPayment || {};
    const base = Object.hasOwn(OFFERS, id) ? OFFERS[id] : null;
    if (!base || !(pay.offers || []).includes(id)) return null;
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

  // Live only when both the wallet and the proof endpoint are configured; otherwise a labelled preview
  // that shows no address, so nobody can pay without being able to send the proof.
  function payMode(config = {}, location = { href: "http://localhost/", hostname: "localhost" }) {
    const pay = config.cryptoPayment || {};
    const rawEndpoint = text(pay.webhookUrl);
    const endpoint = httpUrl(rawEndpoint, location.href);
    const localPreview = /^(localhost|127\.0\.0\.1|\[?::1\]?)$/.test(location.hostname) && !/^https?:/i.test(rawEndpoint);
    const address = validTronAddress(pay.address) ? text(pay.address) : "";
    // An https page cannot post to a plain-http endpoint (mixed content), so the proof would never arrive.
    const blocked = /^https:/i.test(location.href) && /^http:/i.test(endpoint);
    const live = !!(address && endpoint && !localPreview && !blocked);
    // Demo mode: shows a placeholder address so the page can be reviewed. It never sends anything, and it is
    // ignored once a real address is set. Placeholders must not be valid base58 so no wallet accepts them.
    const testAddress = !live && pay.test === true && !validTronAddress(pay.testAddress) ? text(pay.testAddress) : "";
    return { live, test: !!testAddress, address: live ? address : testAddress, endpoint };
  }

  function proofErrors(fields, file) {
    const errors = [];
    if (text(fields.name).length < 2) errors.push(["name", "اكتب اسمك الكامل."]);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(fields.email))) errors.push(["email", "اكتب بريدًا إلكترونيًا صحيحًا."]);
    if (!/^\+?\d{8,15}$/.test(normalizePhone(fields.phone))) errors.push(["phone", "اكتب رقمًا صحيحًا من 8 إلى 15 رقمًا، مع رمز الدولة عند الحاجة."]);
    if (!validTxid(fields.txid)) errors.push(["txid", "رقم العملية يتكوّن من 64 حرفًا ورقمًا. اتركه فارغًا إذا لم يتوفر."]);
    if (!file || !file.size) errors.push(["receipt", "ارفع صورة إيصال التحويل."]);
    else if (!RECEIPT_TYPES.includes(file.type)) errors.push(["receipt", "ارفع صورة JPG أو PNG أو WEBP، أو ملف PDF."]);
    else if (file.size > RECEIPT_MAX_BYTES) errors.push(["receipt", "حجم الملف أكبر من 5 ميغابايت. ارفع صورة أصغر."]);
    if (!fields.consent) errors.push(["consent", "أكّد أنك حوّلت المبلغ قبل الإرسال."]);
    return errors;
  }

  // Text fields sent with the receipt; the endpoint re-validates all of them.
  function proofFields(fields, offer, config, page, month) {
    const pay = config.cryptoPayment || {};
    return {
      ...(validMonth(month) ? { month: validMonth(month) } : {}),
      source: "mohammad-bassam-site", type: "crypto-payment", offer: offer.id, offer_title: offer.title,
      amount: String(offer.amount), asset: text(pay.asset) || "USDT", network: text(pay.network) || "TRC20",
      wallet: text(pay.address), name: text(fields.name), email: text(fields.email),
      phone: normalizePhone(fields.phone), txid: text(fields.txid), page, submitted_at: new Date().toISOString(),
    };
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

    // Pay links elsewhere: data-pay-offer is an offer id, "course" (course page) or "form" (apply form choice).
    const offerFor = (link) => {
      const kind = link.dataset.payOffer;
      if (kind === "course") return new URL(window.location.href).searchParams.get("course");
      if (kind === "form") {
        const form = $("#applyForm");
        const program = form?.querySelector("input[name=program]:checked")?.value;
        return program === "group" ? form.elements.course?.value : program;
      }
      return kind;
    };
    // data-pay-target="book": the consultation button leads to the slot picker first, and from there to payment.
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
    $("#applyForm")?.addEventListener("change", updateLinks);
    document.addEventListener("site:languagechange", updateLinks);
    window.MB_PAY_LINKS = updateLinks; // app.js re-renders course cards and calls this afterwards

    const page = $("[data-pay-page]");
    if (!page) return;
    const offer = payOffer(new URL(window.location.href).searchParams.get("offer"), C, visibility);
    // A consultation is paid for after choosing its slot; without one, go and choose.
    let booking = null;
    if (offer && offer.id === "consult") {
      booking = savedBooking(window.sessionStorage);
      if (!booking) { window.location.replace(bookHref()); return; }
    }
    const mode = payMode(C, window.location);
    $("[data-pay-preview]").hidden = mode.live || mode.test;
    $("[data-pay-test]").hidden = !mode.test;
    $("[data-pay-unavailable]").hidden = !!offer;
    $("[data-pay-flow]").hidden = !offer;
    if (!offer) return;

    // The only way out of the page leads back to where the visitor came from: the course page or the programmes.
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

    const pay = C.cryptoPayment || {};
    const asset = text(pay.asset) || "USDT", network = text(pay.network) || "TRC20";
    $("[data-sum-img]").style.backgroundImage = `url(${offer.img})`;
    $("[data-sum-k]").textContent = offer.k;
    $("[data-sum-title]").textContent = offer.title;
    $("[data-sum-text]").textContent = offer.text || "";
    $("[data-sum-text]").hidden = !offer.text;
    $$("[data-pay-amount]").forEach((el) => { el.textContent = `${formatAmount(offer.amount)} ${asset}`; });
    $$("[data-pay-network]").forEach((el) => { el.textContent = `${asset} · ${network}`; });
    const address = $("[data-pay-address]");
    const shown = mode.live || mode.test;
    address.textContent = shown ? mode.address : "";
    address.hidden = !shown;
    $("[data-pay-address-missing]").hidden = shown;
    $("[data-pay-test-tag]").hidden = !mode.test;
    const copy = $("[data-pay-copy]"), copied = $("[data-pay-copied]");
    copy.hidden = !shown;
    copy.addEventListener("click", async () => {
      try {
        await window.navigator.clipboard.writeText(mode.address);
        copied.textContent = "نُسخ العنوان.";
      } catch {
        // Clipboard can be blocked; select the address so it can be copied by hand.
        const range = document.createRange();
        range.selectNodeContents(address);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        copied.textContent = "حدّد العنوان وانسخه يدويًا.";
      }
    });

    const transfer = $("[data-pay-step='1']"), form = $("#payForm"), done = $("#payDone");
    const prog = $$("[data-progress] li");
    const msg = $(".form-msg", form), submit = $("[data-submit]", form), back = $("[data-back]", form);
    // Same label in every mode; the test/preview notice and the result screen say that nothing was sent.
    const submitLabel = "أرسل إثبات الدفع";
    // The booked consultation: shown in the summary, and the contact details are carried over.
    // Private training: the month asked for on the programmes page is shown and sent with the proof.
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
      ["name", "email", "phone"].forEach((key) => { if (form.elements[key] && booking[key]) form.elements[key].value = booking[key]; });
    }
    submit.textContent = submitLabel;
    const fieldNames = ["name", "email", "phone", "txid", "receipt", "consent"];
    let sending = false;

    const goStep = (n) => {
      transfer.hidden = n !== 1;
      form.hidden = n !== 2;
      prog.forEach((li, i) => {
        li.classList.toggle("on", i + 1 === n);
        li.classList.toggle("done", i + 1 < n);
        if (i + 1 === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      });
      $("h2, legend", n === 1 ? transfer : form).focus();
    };
    $("[data-pay-next]").addEventListener("click", () => goStep(2));
    back.addEventListener("click", () => { if (!sending) goStep(1); });

    const fieldError = (name, message) => {
      const field = form.elements[name];
      const error = $(`[data-error-for="${name}"]`, form);
      field.classList.toggle("bad", !!message);
      field.setAttribute("aria-invalid", String(!!message));
      if (error) { error.textContent = message; error.hidden = !message; }
    };
    const receipt = form.elements.receipt, receiptName = $("[data-receipt-name]", form);
    receipt.addEventListener("change", () => {
      receiptName.textContent = receipt.files[0]?.name || "";
      receiptName.hidden = !receipt.files[0];
    });
    form.addEventListener("input", (event) => {
      if (fieldNames.includes(event.target.name)) { fieldError(event.target.name, ""); msg.textContent = ""; }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (sending) return;
      const fields = Object.fromEntries([...new window.FormData(form)].filter(([, value]) => typeof value === "string"));
      if (fields.company) return; // honeypot
      const file = receipt.files[0];
      const errors = proofErrors(fields, file);
      fieldNames.forEach((name) => fieldError(name, ""));
      errors.forEach(([name, message]) => fieldError(name, message));
      if (errors.length) { msg.textContent = "راجع الحقول الموضّحة."; form.elements[errors[0][0]].focus(); return; }

      sending = true;
      submit.disabled = back.disabled = true;
      submit.textContent = "جارٍ الإرسال…";
      form.setAttribute("aria-busy", "true");
      let deadline;
      try {
        if (mode.live) {
          const body = new window.FormData();
          Object.entries(proofFields(fields, offer, C, window.location.href, trainingMonth)).forEach(([key, value]) => body.append(key, value));
          body.append("receipt", file, file.name);
          const controller = new window.AbortController();
          deadline = setTimeout(() => controller.abort(), 45000);
          const response = await window.fetch(mode.endpoint, { method: "POST", body, signal: controller.signal });
          if (response.status === 429) { msg.textContent = "انتظر قليلًا ثم جرّب الإرسال مرة أخرى."; return; }
          if (response.status === 413) { fieldError("receipt", "حجم الملف أكبر من 5 ميغابايت. ارفع صورة أصغر."); msg.textContent = "راجع الحقول الموضّحة."; return; }
          const result = await response.json();
          if (!response.ok || !result || result.ok !== true) throw new Error("Payment proof not acknowledged");
        }
        $("[data-pay-done-title]").textContent = mode.live ? "استلمنا إثبات الدفع، شكرًا." : "اكتملت تجربة النموذج";
        $("[data-pay-done-text]").textContent = mode.live
          ? "سيتحقّق الفريق من وصول التحويل، ثم يتواصل معك عبر البريد أو الهاتف لتأكيد تسجيلك."
          : "هذه معاينة فقط. لم نرسل بياناتك أو صورة الإيصال، ولم نسجّل أي دفعة.";
        form.hidden = true;
        done.hidden = false;
        try { window.sessionStorage.removeItem(BOOKING_KEY); } catch { /* nothing to clear */ }
        prog.forEach((li) => { li.classList.remove("on"); li.classList.add("done"); li.removeAttribute("aria-current"); });
        $("[data-pay-done-title]").focus();
      } catch {
        msg.textContent = "تعذّر تأكيد استلام إثبات الدفع. معلوماتك باقية في النموذج، ويمكنك المحاولة مرة أخرى.";
      } finally {
        if (deadline !== undefined) clearTimeout(deadline);
        sending = false;
        submit.disabled = back.disabled = false;
        submit.textContent = submitLabel;
        form.setAttribute("aria-busy", "false");
      }
    });
  }

  return { RECEIPT_TYPES, RECEIPT_MAX_BYTES, usdAmount, validTronAddress, validTxid, validMonth, payOffer, payMode, savedBooking, proofErrors, proofFields, mount };
});
