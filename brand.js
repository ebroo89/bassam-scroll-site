/* Runs after app.js and i18n.js. It never changes navigation destinations. */
(function () {
  "use strict";
  const arName = window.MB?.name || "محمد بسام";
  const enName = window.MB?.nameEn || "Muhammad Bassam";
  const namespace = "http://www.w3.org/2000/svg";

  function makeSign() {
    const svg = document.createElementNS(namespace, "svg");
    svg.setAttribute("viewBox", "0 0 28 34");
    svg.setAttribute("class", "brand-sign");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const frame = document.createElementNS(namespace, "path");
    frame.setAttribute("d", "M3 26V8h8M25 8v18h-8");
    frame.setAttribute("fill", "none");
    frame.setAttribute("stroke", "currentColor");
    frame.setAttribute("stroke-width", "2");
    const line = document.createElementNS(namespace, "path");
    line.setAttribute("d", "M9 17h10");
    line.setAttribute("class", "brand-sign-accent");
    line.setAttribute("stroke-width", "2");
    svg.append(frame, line);
    return svg;
  }

  function updateAccessibleName(element) {
    const english = document.documentElement.lang === "en";
    const name = english ? enName : arName;
    element.setAttribute("aria-label", element.tagName === "A"
      ? `${name} — ${english ? "Home" : "الصفحة الرئيسية"}` : name);
    if (element.tagName === "A") element.setAttribute("title", english ? "Home" : "الصفحة الرئيسية");
  }

  function render() {
    document.querySelectorAll("[data-brand-name], footer [data-name-en]").forEach((element) => {
      element.classList.add("brand-wordmark");
      element.setAttribute("translate", "no");
      element.removeAttribute("lang");
      const type = document.createElement("span");
      type.className = "brand-type";
      type.setAttribute("aria-hidden", "true");
      const arabic = document.createElement("span");
      arabic.className = "brand-ar";
      arabic.lang = "ar";
      arabic.dir = "rtl";
      arabic.textContent = arName;
      const english = document.createElement("span");
      english.className = "brand-en";
      english.lang = "en";
      english.dir = "ltr";
      english.textContent = enName;
      type.append(arabic, english);
      element.replaceChildren(makeSign(), type);
      updateAccessibleName(element);
    });
  }
  render();
  document.addEventListener("site:languagechange", () => {
    document.querySelectorAll(".brand-wordmark").forEach(updateAccessibleName);
  });
})();

/* Retire old theme preferences and links; the public site has one dark appearance. */
(function () {
  try { localStorage.removeItem("bassam-theme"); } catch {}
  const url = new URL(location.href);
  if (url.searchParams.has("theme")) {
    url.searchParams.delete("theme");
    history.replaceState(history.state, "", url);
  }
  const menu = document.querySelector("[data-nav-links]");
  const action = document.querySelector("#nav .w > .apply-link");
  if (menu && action && !menu.querySelector(".mobile-nav-action")) {
    const mobileAction = action.cloneNode(true);
    mobileAction.classList.add("mobile-nav-action");
    mobileAction.textContent = location.pathname.endsWith("apply.html") ? "العودة للموقع" : "اختر برنامجك";
    menu.append(mobileAction);
  }
})();
