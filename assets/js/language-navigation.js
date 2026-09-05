(function () {
  "use strict";

  const SUPPORTED = new Set(["en", "fr", "es"]);
  const LEGAL_PAGES = new Set(["terms-of-service-wires.html", "refund-policy-wires.html"]);
  const pageCache = new Map();
  let switching = false;

  function absoluteUrl(href) {
    return new URL(href, window.location.href);
  }

  function fetchPage(url) {
    const key = url.href;
    if (!pageCache.has(key)) {
      pageCache.set(key, fetch(key, { headers: { "X-Requested-With": "Wires-Language" } })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.text();
        })
        .then((html) => new DOMParser().parseFromString(html, "text/html"))
        .catch((error) => {
          pageCache.delete(key);
          throw error;
        }));
    }
    return pageCache.get(key);
  }

  function pathFrom(root, element) {
    const path = [];
    let current = element;
    while (current && current !== root) {
      const parent = current.parentElement;
      if (!parent) return null;
      path.unshift(Array.prototype.indexOf.call(parent.children, current));
      current = parent;
    }
    return current === root ? path : null;
  }

  function elementFromPath(root, path) {
    let current = root;
    for (const index of path || []) {
      current = current?.children?.[index];
      if (!current) return null;
    }
    return current;
  }

  function readingMarker() {
    const root = document.querySelector("main");
    if (!root) return null;
    const y = Math.min(window.innerHeight - 1, Math.max(1, Math.round(window.innerHeight * 0.36)));
    if (LEGAL_PAGES.has(location.pathname.split("/").pop())) {
      const headings = Array.from(root.querySelectorAll("article.lang-page.active h2[id]"));
      const headerBottom = document.querySelector("header.site-header")?.getBoundingClientRect().bottom || 0;
      const section = headings.find((heading) => {
        const top = heading.getBoundingClientRect().top;
        return top >= headerBottom && top <= y;
      }) || headings.filter((heading) => heading.getBoundingClientRect().top <= y).pop();
      if (section) return {
        id: section.id,
        path: pathFrom(root, section),
        top: section.getBoundingClientRect().top,
        scrollY: window.scrollY
      };
    }
    let element = document.elementFromPoint(Math.round(window.innerWidth * 0.5), y);
    if (!element || !root.contains(element)) {
      element = Array.from(root.querySelectorAll("h1,h2,h3,p,li,article,section"))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.bottom > 0 && rect.top < window.innerHeight;
        });
    }
    if (!element) return { scrollY: window.scrollY };
    return {
      id: element.id || "",
      path: pathFrom(root, element),
      top: element.getBoundingClientRect().top,
      scrollY: window.scrollY
    };
  }

  function restoreReadingMarker(marker) {
    if (!marker) return;
    if ((marker.scrollY || 0) <= 1) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    const root = document.querySelector("main");
    const element = (marker.id && document.getElementById(marker.id)) || elementFromPath(root, marker.path);
    if (!element || typeof marker.top !== "number") {
      window.scrollTo({ top: marker.scrollY || 0, behavior: "auto" });
      return;
    }
    const delta = element.getBoundingClientRect().top - marker.top;
    if (Math.abs(delta) > 0.5) window.scrollBy({ top: delta, behavior: "auto" });
  }

  function sameStaticNode(current, next) {
    return current?.nodeType === next?.nodeType &&
      (current.nodeType !== Node.ELEMENT_NODE || current.tagName === next.tagName);
  }

  function syncAttributes(current, next) {
    const copied = ["href", "src", "alt", "title", "aria-label", "placeholder", "data-video-src"];
    copied.forEach((name) => {
      if (next.hasAttribute(name)) current.setAttribute(name, next.getAttribute(name));
      else current.removeAttribute(name);
    });
  }

  function morphChildren(current, next) {
    syncAttributes(current, next);

    const currentChildren = Array.from(current.childNodes);
    const nextChildren = Array.from(next.childNodes);
    if (currentChildren.length !== nextChildren.length ||
        currentChildren.some((child, index) => !sameStaticNode(child, nextChildren[index]))) {
      current.replaceChildren(...nextChildren.map((child) => child.cloneNode(true)));
      return;
    }

    currentChildren.forEach((child, index) => {
      const nextChild = nextChildren[index];
      if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.COMMENT_NODE) {
        if (child.nodeValue !== nextChild.nodeValue) child.nodeValue = nextChild.nodeValue;
        return;
      }
      if (child.nodeType === Node.ELEMENT_NODE) morphChildren(child, nextChild);
    });
  }

  function syncHead(nextDoc) {
    document.title = nextDoc.title;
    const selectors = [
      'meta[name="description"]',
      'meta[name="robots"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="og:type"]',
      'meta[property="og:url"]',
      'meta[property="og:site_name"]',
      'meta[property="og:locale"]',
      'meta[property="og:image"]',
      'meta[property="og:image:alt"]',
      'meta[name="twitter:card"]',
      'meta[name="twitter:title"]',
      'meta[name="twitter:description"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:alt"]'
    ];
    selectors.forEach((selector) => {
      const current = document.querySelector(selector);
      const next = nextDoc.querySelector(selector);
      if (current && next) current.setAttribute("content", next.getAttribute("content") || "");
    });

    document.querySelectorAll('link[rel="canonical"], link[rel="alternate"][hreflang]').forEach((node) => node.remove());
    nextDoc.querySelectorAll('link[rel="canonical"], link[rel="alternate"][hreflang]').forEach((node) => {
      document.head.appendChild(node.cloneNode(true));
    });

    const currentJson = document.querySelector('script[type="application/ld+json"]');
    const nextJson = nextDoc.querySelector('script[type="application/ld+json"]');
    if (currentJson && nextJson) currentJson.textContent = nextJson.textContent;
    else if (currentJson && !nextJson) currentJson.remove();
    else if (!currentJson && nextJson) document.head.appendChild(nextJson.cloneNode(true));

    const resourceSelectors = [
      'link[rel="icon"]',
      'link[rel="apple-touch-icon"]',
      'link[rel="manifest"]',
      'link[rel="stylesheet"][href*="assets/css/"]'
    ];
    resourceSelectors.forEach((selector) => {
      const currentNodes = Array.from(document.querySelectorAll(selector));
      const nextNodes = Array.from(nextDoc.querySelectorAll(selector));
      currentNodes.forEach((node, index) => {
        if (nextNodes[index]) node.setAttribute("href", nextNodes[index].getAttribute("href") || "");
      });
    });
  }

  function syncVisiblePage(nextDoc) {
    const pairs = [
      [document.querySelector("header.site-header"), nextDoc.querySelector("header.site-header")],
      [document.querySelector(".help-mobile-tools"), nextDoc.querySelector(".help-mobile-tools")],
      [document.querySelector("aside.sidebar"), nextDoc.querySelector("aside.sidebar")],
      [document.querySelector("main"), nextDoc.querySelector("main")],
      [document.querySelector("footer.site-footer"), nextDoc.querySelector("footer.site-footer")]
    ];
    pairs.forEach(([current, next]) => {
      if (current && next) morphChildren(current, next);
    });
  }

  function snapshotHelpState() {
    const visibleChapter = Array.from(document.querySelectorAll(".ch-section"))
      .find((section) => !section.hidden);
    return {
      chapter: visibleChapter?.id || "",
      panelScroll: document.getElementById("ch-panel")?.scrollTop || 0,
      search: document.getElementById("srch")?.value || ""
    };
  }

  function legalSectionMap(nextDoc, url) {
    const file = location.pathname.split("/").pop();
    if (!LEGAL_PAGES.has(file) || url.pathname.split("/").pop() !== file) return null;
    const current = document.querySelector("main article.lang-page.active");
    const next = nextDoc.querySelector("main article.lang-page.active");
    if (!current || !next) return null;
    const from = document.documentElement.lang;
    const to = nextDoc.documentElement.lang;
    const ids = new Map();
    current.querySelectorAll("[id]").forEach((element) => {
      if (!element.id.endsWith(`-${from}`)) return;
      const targetId = element.id.slice(0, -from.length) + to;
      const target = nextDoc.getElementById(targetId);
      if (target && next.contains(target)) ids.set(element.id, targetId);
    });
    return { current, next, ids };
  }

  function restoreHelpState(state) {
    if (!state?.chapter) return;
    document.querySelectorAll(".ch-section").forEach((section) => {
      section.hidden = section.id !== state.chapter;
    });
    const panel = document.getElementById("ch-panel");
    if (panel) panel.scrollTop = state.panelScroll;
  }

  async function switchLanguage(url, addHistory) {
    if (switching) return;
    switching = true;
    const marker = readingMarker();
    const helpState = snapshotHelpState();
    const previousOverflowAnchor = document.documentElement.style.overflowAnchor;
    document.documentElement.style.overflowAnchor = "none";
    try {
      const nextDoc = await fetchPage(url);
      const nextLang = nextDoc.documentElement.lang;
      if (!SUPPORTED.has(nextLang)) throw new Error("Unsupported page language");
      if (!nextDoc.querySelector("main") || !nextDoc.querySelector("header.site-header")) {
        throw new Error("Incomplete localized page");
      }

      const legal = legalSectionMap(nextDoc, url);
      if (legal) {
        if (marker && legal.ids.has(marker.id)) marker.id = legal.ids.get(marker.id);
        const hashId = decodeURIComponent((url.hash || location.hash).slice(1));
        if (addHistory && legal.ids.has(hashId)) url.hash = legal.ids.get(hashId);
        legal.current.querySelectorAll("[id]").forEach((element) => {
          if (legal.ids.has(element.id)) element.id = legal.ids.get(element.id);
        });
        legal.current.dataset.langPage = legal.next.dataset.langPage;
      }

      window.WiresHelpRuntime?.beforeLanguageSwap?.();
      if (addHistory) history.pushState({ wiresLanguage: true }, "", url.href);
      syncHead(nextDoc);
      syncVisiblePage(nextDoc);
      document.documentElement.lang = nextLang;
      try { localStorage.setItem("wires_lang", nextLang); } catch (error) {}

      restoreHelpState(helpState);
      window.WiresSiteRuntime?.refreshLanguage?.(nextLang);
      window.WiresHelpRuntime?.afterLanguageSwap?.(nextLang);
      const restore = () => restoreReadingMarker(marker);
      requestAnimationFrame(() => requestAnimationFrame(restore));
      window.setTimeout(restore, 80);
      window.setTimeout(() => {
        restore();
        document.documentElement.style.overflowAnchor = previousOverflowAnchor;
      }, 280);
      document.dispatchEvent(new CustomEvent("wires:languagechange", { detail: { lang: nextLang } }));
      preloadAlternates();
    } catch (error) {
      document.documentElement.style.overflowAnchor = previousOverflowAnchor;
      window.location.assign(url.href);
    } finally {
      switching = false;
    }
  }

  function preloadAlternates() {
    document.querySelectorAll(".lang-opt[href]").forEach((link) => {
      if (link.dataset.lang === document.documentElement.lang) return;
      const url = absoluteUrl(link.getAttribute("href"));
      if (url.origin === location.origin) fetchPage(url).catch(() => {});
    });
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a.lang-opt[data-lang][href]");
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = absoluteUrl(link.getAttribute("href"));
    if (url.origin !== location.origin || !SUPPORTED.has(link.dataset.lang)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    switchLanguage(url, true);
  }, true);

  window.addEventListener("popstate", () => {
    const expectedLang = location.pathname.startsWith("/fr/") ? "fr" :
      location.pathname.startsWith("/es/") ? "es" : "en";
    if (expectedLang !== document.documentElement.lang) {
      switchLanguage(new URL(location.href), false);
    }
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", preloadAlternates, { once: true });
  } else {
    preloadAlternates();
  }
})();
