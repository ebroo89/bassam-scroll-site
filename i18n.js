/* Translate presentation text while preserving controls, field values and IDs. */
(function () {
  const translations = window.MB_TRANSLATIONS || {};
  const textSources = new WeakMap();
  const attributeSources = new WeakMap();
  const headingSources = new Map();
  const attributes = ["aria-label", "placeholder", "title", "content", "alt"];
  const ignored = "script, style, textarea, code, [translate='no']";
  const storageKey = "bassam-language";
  let language = "ar";

  if (window.MB?.name && window.MB?.nameEn) {
    translations[window.MB.name] = window.MB.nameEn;
  }

  function preferredLanguage() {
    const requested = new URL(location.href).searchParams.get("lang");
    if (requested === "ar" || requested === "en") return requested;
    try {
      return localStorage.getItem(storageKey) === "en" ? "en" : "ar";
    } catch {
      return "ar";
    }
  }

  function translated(source) {
    if (language !== "en") return source;
    const key = source.trim();
    if (!Object.hasOwn(translations, key)) return source;
    return source.replace(key, translations[key]);
  }

  document.querySelectorAll(".words").forEach((heading) => {
    headingSources.set(heading, {
      original: heading.textContent,
      rendered: null,
    });
  });

  function translateText(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest(ignored) || parent.closest(".words")) return;
    let source = textSources.get(node);
    if (!source || source.rendered !== node.nodeValue) {
      source = { original: node.nodeValue, rendered: node.nodeValue };
      textSources.set(node, source);
    }
    const output = translated(source.original);
    if (node.nodeValue !== output) node.nodeValue = output;
    source.rendered = output;
  }

  function translateAttributes(element) {
    if (element.closest(ignored)) return;
    let sources = attributeSources.get(element);
    if (!sources) {
      sources = new Map();
      attributeSources.set(element, sources);
    }
    attributes.forEach((name) => {
      if (!element.hasAttribute(name)) return;
      const current = element.getAttribute(name);
      let source = sources.get(name);
      if (!source || source.rendered !== current) {
        source = { original: current, rendered: current };
        sources.set(name, source);
      }
      const output = translated(source.original);
      if (current !== output) element.setAttribute(name, output);
      source.rendered = output;
    });
  }

  function translateTree(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      translateText(root);
      return;
    }
    if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) translateText(walker.currentNode);
    root
      .querySelectorAll?.(
        "[aria-label], [placeholder], [title], meta[content], [alt]",
      )
      .forEach(translateAttributes);
  }

  function updateLinks() {
    document.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const target = new URL(href, location.href);
      if (
        target.origin !== location.origin ||
        !/\/(?:index|apply)\.html$/.test(target.pathname)
      )
        return;
      target.searchParams.set("lang", language);
      link.setAttribute(
        "href",
        `${target.pathname.split("/").pop()}${target.search}${target.hash}`,
      );
    });
  }

  function setLanguage(next, remember = true) {
    language = next === "en" ? "en" : "ar";
    document.documentElement.lang = language;
    document.documentElement.dir = language === "en" ? "ltr" : "rtl";
    headingSources.forEach((source, heading) => {
      const output = translated(source.original);
      if (output !== source.rendered) heading.textContent = output;
      source.rendered = output;
    });
    translateTree(document);
    document.querySelectorAll("[data-language-toggle]").forEach((button) => {
      button.textContent = language === "ar" ? "EN" : "عربي";
      button.lang = language === "ar" ? "en" : "ar";
      button.setAttribute(
        "aria-label",
        language === "ar" ? "Switch to English" : "التبديل إلى العربية",
      );
    });
    updateLinks();
    if (remember) {
      try {
        localStorage.setItem(storageKey, language);
      } catch {
        /* Storage is optional. */
      }
      const url = new URL(location.href);
      url.searchParams.set("lang", language);
      history.replaceState(null, "", url);
    }
    document.dispatchEvent(
      new CustomEvent("site:languagechange", { detail: { language } }),
    );
    window.dispatchEvent(new Event("resize"));
  }

  document.querySelectorAll("[data-language-toggle]").forEach((button) => {
    button.addEventListener("click", () =>
      setLanguage(language === "ar" ? "en" : "ar"),
    );
  });
  window.addEventListener("popstate", () =>
    setLanguage(preferredLanguage(), false),
  );
  setLanguage(preferredLanguage(), false);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes") translateAttributes(mutation.target);
      else if (mutation.type === "characterData")
        translateText(mutation.target);
      else mutation.addedNodes.forEach(translateTree);
    });
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: attributes,
  });
})();
