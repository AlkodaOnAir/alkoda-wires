const FLAGS = {
  en: '<svg width="22" height="15" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="30" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="4"/><path d="M30,0 V30 M0,15 H60" stroke="#fff" stroke-width="10"/><path d="M30,0 V30 M0,15 H60" stroke="#C8102E" stroke-width="6"/></svg>',
  fr: '<svg width="22" height="15" viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg"><rect width="1" height="2" fill="#002395"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ED2939"/></svg>',
  es: '<svg width="22" height="15" viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg"><rect width="3" height="2" fill="#AA151B"/><rect y=".5" width="3" height="1" fill="#F1BF00"/></svg>'
};

const LANG_NAMES = { en: "English", fr: "Français", es: "Español" };
const LANG_SHORT = { en: "EN", fr: "FR", es: "ES" };
let currentLang = ["en", "fr", "es"].includes(document.documentElement.lang)
  ? document.documentElement.lang
  : "en";

function setLang(lang) {
  currentLang = ["en", "fr", "es"].includes(lang) ? lang : "en";
  try { localStorage.setItem("wires_lang", currentLang); } catch (error) {}
  document.documentElement.lang = currentLang;

  const flag = document.getElementById("lang-flag");
  const name = document.getElementById("lang-name");
  if (flag) flag.innerHTML = FLAGS[currentLang];
  if (name) name.textContent = LANG_SHORT[currentLang];

  Object.keys(FLAGS).forEach((code) => {
    const dropFlag = document.getElementById(`drop-flag-${code}`);
    const option = document.getElementById(`lang-opt-${code}`);
    if (dropFlag) dropFlag.innerHTML = FLAGS[code];
    if (option) {
      option.classList.toggle("active", code === currentLang);
      option.style.display = code === currentLang ? "none" : "flex";
    }
  });

  const toggle = document.getElementById("lang-toggle");
  if (toggle) toggle.setAttribute("aria-label", `Language: ${LANG_NAMES[currentLang]}`);
  updateDemoFullscreenButtons();
}

function closeLangDrop() {
  const drop = document.getElementById("lang-drop");
  const toggle = document.getElementById("lang-toggle");
  if (drop) drop.classList.remove("open");
  if (toggle) toggle.setAttribute("aria-expanded", "false");
}

const PARTIAL_PAGES = new Set([
  "index.html",
  "try-it.html"
]);
let isNavigating = false;
let videoModal = null;
let videoModalPlayer = null;
let managedVideoObserver = null;
let managedVideoResizeTimer = 0;

function getPageName(pathname = location.pathname) {
  const cleanPath = pathname.replace(/\\/g, "/");
  const lastSegment = cleanPath.split("/").filter(Boolean).pop();
  return lastSegment && lastSegment.includes(".") ? lastSegment : "index.html";
}

function isPartialPage(url) {
  return url.origin === location.origin && PARTIAL_PAGES.has(getPageName(url.pathname));
}

function closeMobileMenu() {
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".site-nav");
  nav?.classList.remove("open");
  menuButton?.setAttribute("aria-expanded", "false");
}

function updateDownloadLinks() {
  // The generated HTML already contains the correct root or language-relative URL.
}

function setActiveNavigation(url = new URL(location.href)) {
  const currentPage = getPageName(url.pathname);
  const activeHref = url.hash === "#contact" ? "#contact" : currentPage;

  document.querySelectorAll(".site-nav a").forEach((link) => {
    if (link.classList.contains("nav-cta")) return;

    const href = link.getAttribute("href") || "";
    const linkUrl = new URL(href, location.href);
    const linkPage = getPageName(linkUrl.pathname);
    const linkKey = href === "#contact" || linkUrl.hash === "#contact" ? "#contact" : linkPage;
    const active = linkKey === activeHref;

    link.classList.toggle("active", active);
    if (active) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function scrollToPageTarget(hash) {
  if (!hash) {
    window.scrollTo({ top: 0, behavior: "auto" });
    return;
  }

  const target = document.querySelector(hash);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

function updateDocumentMeta(nextDoc) {
  if (nextDoc.title) document.title = nextDoc.title;

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
    const currentMeta = document.querySelector(selector);
    const nextMeta = nextDoc.querySelector(selector);
    if (currentMeta && nextMeta) currentMeta.setAttribute("content", nextMeta.getAttribute("content") || "");
  });

  const currentCanonical = document.querySelector('link[rel="canonical"]');
  const nextCanonical = nextDoc.querySelector('link[rel="canonical"]');
  if (currentCanonical && nextCanonical) currentCanonical.setAttribute("href", nextCanonical.getAttribute("href") || "");
}

function initDemoLoaders() {
  document.querySelectorAll("[data-demo-loader]").forEach((wrapper) => {
    if (wrapper.dataset.loaderBound === "1") return;

    const iframe = wrapper.querySelector("iframe");
    if (!iframe) return;

    const mobileBlocked = window.matchMedia("(max-width: 760px)").matches;
    const demoSrc = iframe.dataset.demoSrc || iframe.getAttribute("src");
    wrapper.dataset.loaderBound = "1";

    if (mobileBlocked) {
      iframe.removeAttribute("src");
      wrapper.classList.remove("is-loading");
      wrapper.classList.add("is-mobile-blocked");
      return;
    }

    let isReady = false;
    let pollTimer = 0;

    function onDemoReadyMessage(event) {
      if (event.source !== iframe.contentWindow) return;
      if (event.data?.type !== "wires-demo-ready") return;
      window.requestAnimationFrame(() => window.requestAnimationFrame(markReady));
    }

    const cleanup = () => {
      if (pollTimer) window.clearTimeout(pollTimer);
      window.removeEventListener("message", onDemoReadyMessage);
    };

    const markReady = () => {
      if (isReady) return;
      isReady = true;
      cleanup();
      wrapper.classList.remove("is-loading");
      wrapper.classList.add("is-ready");
    };

    const hasRenderedDemo = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc || doc.readyState === "loading") return false;
        if (doc.body?.dataset.demoReady === "1") return true;

        const canvasRoot = doc.getElementById("canvas-root");
        const renderedNodes = doc.querySelectorAll("#nodes-layer .node").length;
        const renderedCables = doc.querySelectorAll("#cables-svg .cable-visual").length;
        const images = [...doc.querySelectorAll("#nodes-layer .node img")];
        const imagesReady = images.every((img) => img.complete && img.naturalWidth > 0);

        return Boolean(canvasRoot && renderedNodes > 0 && renderedCables > 0 && imagesReady);
      } catch (error) {
        return false;
      }
    };

    const startedAt = Date.now();
    const maxWaitMs = 15000;

    const waitForDemo = () => {
      if (hasRenderedDemo()) {
        window.requestAnimationFrame(() => window.requestAnimationFrame(markReady));
        return;
      }

      if (Date.now() - startedAt > maxWaitMs) {
        markReady();
        return;
      }

      pollTimer = window.setTimeout(waitForDemo, 160);
    };

    window.addEventListener("message", onDemoReadyMessage);
    iframe.addEventListener("load", waitForDemo, { once: true });
    if (!iframe.getAttribute("src") && demoSrc) iframe.setAttribute("src", demoSrc);
    waitForDemo();
  });
}

function updateDemoFullscreenButtons() {
  const labels = {
    en: { open: "Open demo in full screen", close: "Exit full screen" },
    fr: { open: "Ouvrir la démo en plein écran", close: "Quitter le plein écran" },
    es: { open: "Abrir la demo en pantalla completa", close: "Salir de pantalla completa" }
  };
  const languageLabels = labels[currentLang] || labels.en;

  document.querySelectorAll("[data-demo-fullscreen]").forEach((button) => {
    const wrapper = button.closest("[data-demo-loader]");
    const isFullscreen = document.fullscreenElement === wrapper;
    const label = isFullscreen ? languageLabels.close : languageLabels.open;
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.setAttribute("aria-pressed", String(isFullscreen));
  });
}

function initDemoFullscreen() {
  document.querySelectorAll("[data-demo-fullscreen]").forEach((button) => {
    if (button.dataset.fullscreenBound === "1") return;
    const wrapper = button.closest("[data-demo-loader]");
    if (!wrapper || !document.fullscreenEnabled || !wrapper.requestFullscreen) {
      button.hidden = true;
      return;
    }

    button.dataset.fullscreenBound = "1";
    button.addEventListener("click", async () => {
      try {
        if (document.fullscreenElement === wrapper) await document.exitFullscreen();
        else await wrapper.requestFullscreen();
      } catch (error) {
        console.warn("Wires demo full screen unavailable", error);
      }
    });
  });

  if (document.documentElement.dataset.demoFullscreenBound !== "1") {
    document.documentElement.dataset.demoFullscreenBound = "1";
    document.addEventListener("fullscreenchange", updateDemoFullscreenButtons);
  }
  updateDemoFullscreenButtons();
}

function initManagedFeatureVideos() {
  const videos = [...document.querySelectorAll(".feature-story video, .video-examples-section .video-link video")];
  if (managedVideoObserver) {
    managedVideoObserver.disconnect();
    managedVideoObserver = null;
  }
  if (!videos.length) return;

  const shouldManage = window.matchMedia("(max-width: 760px), (hover: none) and (pointer: coarse)").matches;
  videos.forEach((video) => {
    video.muted = true;
    video.playsInline = true;
  });

  if (!shouldManage) {
    videos.forEach((video) => {
      video.setAttribute("autoplay", "");
      video.play().catch(() => {});
    });
    return;
  }

  videos.forEach((video) => {
    video.removeAttribute("autoplay");
    video.pause();
  });

  managedVideoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
        videos.forEach((otherVideo) => {
          if (otherVideo !== video) otherVideo.pause();
        });
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { rootMargin: "120px 0px", threshold: [0, 0.35, 0.65] });

  videos.forEach((video) => managedVideoObserver.observe(video));
}

function refreshPageContent() {
  updateDownloadLinks();
  setActiveNavigation();
  setLang(currentLang);
  initDemoLoaders();
  initDemoFullscreen();
  initManagedFeatureVideos();
}

async function navigatePartial(url, addHistory = true) {
  if (isNavigating) return;

  const currentUrl = new URL(location.href);
  const sameDocument = currentUrl.pathname === url.pathname && currentUrl.search === url.search;
  if (sameDocument) {
    if (addHistory && url.href !== currentUrl.href) history.pushState({ partial: true }, "", url.href);
    setActiveNavigation(url);
    scrollToPageTarget(url.hash);
    return;
  }

  const currentMain = document.querySelector("main");
  if (!currentMain) {
    location.href = url.href;
    return;
  }

  isNavigating = true;
  closeVideoModal();
  closeMobileMenu();
  closeLangDrop();
  currentMain.classList.add("is-leaving");

  try {
    const response = await fetch(url.href, { headers: { "X-Requested-With": "Wires-Partial" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const nextDoc = new DOMParser().parseFromString(html, "text/html");
    const nextMain = nextDoc.querySelector("main");
    const nextFooter = nextDoc.querySelector(".site-footer");
    if (!nextMain) throw new Error("Missing main element");

    updateDocumentMeta(nextDoc);
    currentMain.replaceWith(nextMain);

    const currentFooter = document.querySelector(".site-footer");
    if (currentFooter && nextFooter) currentFooter.replaceWith(nextFooter);

    if (addHistory) history.pushState({ partial: true }, "", url.href);
    refreshPageContent();
    window.dispatchEvent(new CustomEvent("wires:pageview"));
    requestAnimationFrame(() => scrollToPageTarget(url.hash));
  } catch (error) {
    location.href = url.href;
  } finally {
    isNavigating = false;
  }
}

function sizeVideoModal() {
  if (!videoModal || !videoModalPlayer) return;

  const naturalWidth = videoModalPlayer.videoWidth || 1280;
  const naturalHeight = videoModalPlayer.videoHeight || 720;
  const desiredScale = 0.75;
  const desiredWidth = naturalWidth * desiredScale;
  const desiredHeight = naturalHeight * desiredScale;
  const availableWidth = window.innerWidth - 48;
  const availableHeight = window.innerHeight - 48;
  const fitScale = Math.min(1, availableWidth / desiredWidth, availableHeight / desiredHeight);

  videoModal.style.setProperty("--video-modal-width", `${Math.round(desiredWidth * fitScale)}px`);
  videoModal.style.setProperty("--video-modal-height", `${Math.round(desiredHeight * fitScale)}px`);
}

function closeVideoModal() {
  if (!videoModal || !videoModalPlayer) return;
  videoModal.classList.remove("open");
  videoModal.setAttribute("aria-hidden", "true");
  videoModalPlayer.pause();
  videoModalPlayer.removeAttribute("src");
  videoModalPlayer.load();
}

function bindVideoModalPlayer() {
  if (!videoModalPlayer || videoModalPlayer.dataset.modalBound === "true") return;
  videoModalPlayer.addEventListener("loadedmetadata", sizeVideoModal);
  videoModalPlayer.dataset.modalBound = "true";
}

function ensureVideoModal() {
  videoModal = document.getElementById("video-modal");
  videoModalPlayer = document.getElementById("video-modal-player");

  if (videoModal && videoModalPlayer) {
    bindVideoModalPlayer();
    return true;
  }

  videoModal = document.createElement("div");
  videoModal.className = "video-modal";
  videoModal.id = "video-modal";
  videoModal.setAttribute("aria-hidden", "true");
  videoModal.innerHTML = `
    <div class="video-modal-backdrop" data-video-close></div>
    <div class="video-modal-dialog" role="dialog" aria-modal="true" aria-label="Video player">
      <button class="video-modal-close" type="button" data-video-close aria-label="Close video">x</button>
      <video id="video-modal-player" controls autoplay loop playsinline></video>
    </div>
  `;
  document.body.appendChild(videoModal);
  videoModalPlayer = document.getElementById("video-modal-player");
  bindVideoModalPlayer();
  return Boolean(videoModal && videoModalPlayer);
}

ensureVideoModal();

document.addEventListener("click", (event) => {
  const videoButton = event.target.closest("[data-video-src]");
  if (!videoButton) return;
  if (!ensureVideoModal()) return;

  sizeVideoModal();
  videoModalPlayer.src = videoButton.dataset.videoSrc;
  videoModal.classList.add("open");
  videoModal.setAttribute("aria-hidden", "false");
  videoModalPlayer.play().catch(() => {});
});

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-video-close]")) closeVideoModal();
});

window.addEventListener("resize", () => {
  if (videoModal?.classList.contains("open")) sizeVideoModal();
  if (managedVideoResizeTimer) window.clearTimeout(managedVideoResizeTimer);
  managedVideoResizeTimer = window.setTimeout(initManagedFeatureVideos, 180);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeVideoModal();
});

const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");

menuButton?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});

nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    closeMobileMenu();
  });
});

document.getElementById("lang-toggle")?.addEventListener("click", (event) => {
  event.stopPropagation();
  const drop = document.getElementById("lang-drop");
  const open = drop?.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});

document.addEventListener("click", (event) => {
  if (!event.target.closest("#lang-selector")) closeLangDrop();
});

document.addEventListener("click", (event) => {
  const summary = event.target.closest(".try-guide-group > summary");
  if (!summary) return;

  const currentGroup = summary.parentElement;
  currentGroup
    .closest(".try-guide-menu-list")
    ?.querySelectorAll(".try-guide-group[open]")
    .forEach((group) => {
      if (group !== currentGroup) group.removeAttribute("open");
    });
});

function trackFileDownload(link, linkUrl) {
  if (typeof window.gtag !== "function") return;

  const resolvedUrl = new URL(linkUrl, location.href);
  const fileName = link.dataset.downloadFilename || link.getAttribute("download") || resolvedUrl.pathname.split("/").pop() || "";
  const extensionIndex = fileName.lastIndexOf(".");
  const fileExtension = extensionIndex >= 0 ? fileName.slice(extensionIndex + 1).toLowerCase() : "";

  window.gtag("event", "file_download", {
    file_name: fileName,
    file_extension: fileExtension,
    link_url: resolvedUrl.href,
    link_domain: resolvedUrl.hostname || location.hostname,
    link_text: link.textContent.trim(),
    download_platform: link.dataset.downloadPlatform || "unknown",
    download_type: link.dataset.downloadType || "unknown",
    app_version: link.dataset.downloadVersion || ""
  });
}

document.addEventListener("click", (event) => {
  const directDownload = event.target.closest("a[data-direct-download]");
  if (!directDownload) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  event.preventDefault();
  trackFileDownload(directDownload, directDownload.href);

  fetch(directDownload.href)
    .then((response) => {
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      return response.blob();
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const fileLink = document.createElement("a");
      fileLink.href = objectUrl;
      fileLink.download = directDownload.getAttribute("download") || "test-project.wires";
      fileLink.hidden = true;
      document.body.appendChild(fileLink);
      fileLink.click();
      fileLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    })
    .catch(() => {
      window.location.assign(directDownload.href);
    });
});

document.addEventListener("click", (event) => {
  const downloadButton = event.target.closest("a[data-download-url]");
  if (!downloadButton) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const guideHref = downloadButton.dataset.guideTarget || "";
  const downloadUrl = downloadButton.getAttribute("href") || downloadButton.dataset.downloadUrl;
  if (!downloadUrl) return;

  event.preventDefault();
  trackFileDownload(downloadButton, downloadUrl);

  if (guideHref.startsWith("#")) {
    const guideUrl = new URL(guideHref, location.href);
    if (guideUrl.href !== location.href) {
      history.pushState({ partial: true }, "", guideUrl.href);
    }
    scrollToPageTarget(guideUrl.hash);
  }

  const fileLink = document.createElement("a");
  fileLink.href = downloadUrl;
  fileLink.download = downloadButton.dataset.downloadFilename || "";
  fileLink.hidden = true;
  document.body.appendChild(fileLink);
  fileLink.click();
  fileLink.remove();
});

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link) return;
  const rawHref = link.getAttribute("href").trim();
  if (!rawHref || rawHref === "#") return;
  if (location.protocol === "file:") return;
  if (link.target || link.hasAttribute("download")) return;
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const url = new URL(rawHref, location.href);
  if (!isPartialPage(url)) return;

  event.preventDefault();
  navigatePartial(url);
});

window.addEventListener("popstate", () => {
  const url = new URL(location.href);
  if (location.protocol === "file:" || !isPartialPage(url)) return;
  navigatePartial(url, false);
});

(function initStaticPage() {
  setLang(currentLang);
  refreshPageContent();
})();

window.WiresSiteRuntime = {
  refreshLanguage(lang = document.documentElement.lang) {
    setLang(lang);
    closeLangDrop();
  },
  refreshPageContent
};

