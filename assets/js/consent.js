(function () {
  "use strict";

  const MEASUREMENT_ID = "G-QZ4D2DV0YX";
  const STORAGE_KEY = "wires_analytics_consent";
  const CONSENT_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
  const GOOGLE_SCRIPT_ID = "wires-google-analytics";
  const COPY = {
    en: {
      title: "Statistical cookies",
      text: "Wires uses Google Analytics only with your permission to measure visits and improve the site.",
      accept: "Accept statistics",
      refuse: "Refuse",
      settings: "Cookie settings",
      privacy: "Privacy & cookies"
    },
    fr: {
      title: "Cookies statistiques",
      text: "Wires utilise Google Analytics uniquement avec votre accord pour mesurer les visites et améliorer le site.",
      accept: "Accepter les statistiques",
      refuse: "Refuser",
      settings: "Gérer les cookies",
      privacy: "Confidentialité et cookies"
    },
    es: {
      title: "Cookies estadísticos",
      text: "Wires utiliza Google Analytics solo con tu permiso para medir las visitas y mejorar el sitio.",
      accept: "Aceptar estadísticas",
      refuse: "Rechazar",
      settings: "Configurar cookies",
      privacy: "Privacidad y cookies"
    }
  };

  let banner;
  let settingsButton;
  let privacyLink;
  let analyticsLoaded = false;

  function currentLanguage() {
    const lang = document.documentElement.lang.toLowerCase().split("-")[0];
    return COPY[lang] ? lang : "en";
  }

  function readConsent() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !["accepted", "refused"].includes(saved.value) || Date.now() >= saved.expiresAt) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return saved.value;
    } catch (error) {
      return null;
    }
  }

  function saveConsent(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        value,
        expiresAt: Date.now() + CONSENT_LIFETIME_MS
      }));
    } catch (error) {}
  }

  function removeAnalyticsCookies() {
    const host = location.hostname;
    const domains = ["", host, `.${host}`];
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) return;
      domains.forEach((domain) => {
        const domainPart = domain ? `; Domain=${domain}` : "";
        document.cookie = `${name}=; Max-Age=0; Path=/${domainPart}; SameSite=Lax`;
      });
    });
  }

  function disableAnalytics() {
    window[`ga-disable-${MEASUREMENT_ID}`] = true;
    analyticsLoaded = false;
    document.getElementById(GOOGLE_SCRIPT_ID)?.remove();
    removeAnalyticsCookies();
  }

  function enableAnalytics() {
    if (analyticsLoaded || document.getElementById(GOOGLE_SCRIPT_ID)) return;
    analyticsLoaded = true;
    window[`ga-disable-${MEASUREMENT_ID}`] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("consent", "default", { analytics_storage: "granted" });
    window.gtag("config", MEASUREMENT_ID, { send_page_view: true });

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }

  function updateCopy() {
    const copy = COPY[currentLanguage()];
    if (banner) {
      banner.querySelector("[data-cookie-title]").textContent = copy.title;
      banner.querySelector("[data-cookie-text]").textContent = copy.text;
      banner.querySelector("[data-cookie-accept]").textContent = copy.accept;
      banner.querySelector("[data-cookie-refuse]").textContent = copy.refuse;
    }
    if (settingsButton) settingsButton.textContent = copy.settings;
    if (privacyLink) privacyLink.textContent = copy.privacy;
  }

  function openBanner() {
    banner.hidden = false;
    banner.querySelector("[data-cookie-accept]").focus();
  }

  function closeBanner() {
    banner.hidden = true;
  }

  function choose(value) {
    saveConsent(value);
    if (value === "accepted") enableAnalytics();
    else disableAnalytics();
    closeBanner();
    settingsButton.focus();
  }

  function addStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .cookie-consent{position:fixed;z-index:10000;left:16px;right:16px;bottom:16px;max-width:720px;margin:auto;padding:18px;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:#0b1526;color:#e8eefb;box-shadow:0 18px 60px rgba(0,0,0,.55);font:14px/1.5 Inter,system-ui,sans-serif}
      .cookie-consent[hidden]{display:none}
      .cookie-consent strong{display:block;margin-bottom:5px;color:#fff;font-size:16px}
      .cookie-consent p{margin:0;color:#b6c4dc}
      .cookie-consent-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
      .cookie-choice,.cookie-settings{font:700 13px Inter,system-ui,sans-serif;cursor:pointer}
      .cookie-choice{min-height:44px;padding:10px 14px;border:1px solid #00d2ff;border-radius:9px;background:transparent;color:#e8eefb}
      .cookie-choice:hover,.cookie-choice:focus-visible{background:rgba(0,210,255,.12);outline:2px solid #fff;outline-offset:2px}
      .cookie-settings{padding:0;border:0;background:none;color:inherit;text-decoration:underline;text-underline-offset:3px}
      .cookie-settings:hover,.cookie-settings:focus-visible{color:#00d2ff;outline:2px solid #00d2ff;outline-offset:3px}
      .cookie-standalone-footer{padding:18px;text-align:center;color:#9db0d0;font:13px Inter,system-ui,sans-serif}
      .cookie-standalone-footer a{margin-right:16px;text-decoration:underline;text-underline-offset:3px}
      @media(max-width:560px){.cookie-consent{left:10px;right:10px;bottom:10px;padding:15px}.cookie-consent-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function addFooterControls() {
    let container = document.querySelector(".footer-links, .site-footer nav");
    if (!container) {
      const footer = document.createElement("footer");
      footer.className = "cookie-standalone-footer";
      document.body.appendChild(footer);
      container = footer;
    }

    if (!privacyLink) {
      privacyLink = document.createElement("a");
      privacyLink.href = "privacy-cookies.html";
      privacyLink.dataset.cookiePrivacy = "";
    }

    if (!settingsButton) {
      settingsButton = document.createElement("button");
      settingsButton.type = "button";
      settingsButton.className = "cookie-settings";
      settingsButton.dataset.cookieSettings = "";
      settingsButton.addEventListener("click", openBanner);
    }

    container.append(privacyLink, settingsButton);
    updateCopy();
  }

  function addBanner() {
    banner = document.createElement("section");
    banner.className = "cookie-consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.setAttribute("aria-labelledby", "cookie-consent-title");
    banner.innerHTML = `
      <strong id="cookie-consent-title" data-cookie-title></strong>
      <p data-cookie-text></p>
      <div class="cookie-consent-actions">
        <button type="button" class="cookie-choice" data-cookie-accept></button>
        <button type="button" class="cookie-choice" data-cookie-refuse></button>
      </div>
    `;
    banner.querySelector("[data-cookie-accept]").addEventListener("click", () => choose("accepted"));
    banner.querySelector("[data-cookie-refuse]").addEventListener("click", () => choose("refused"));
    document.body.appendChild(banner);
  }

  function init() {
    addStyles();
    addFooterControls();
    addBanner();
    updateCopy();

    new MutationObserver(updateCopy).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"]
    });
    new MutationObserver(() => {
      const footerContainer = document.querySelector(".footer-links, .site-footer nav");
      if (footerContainer && settingsButton.parentElement !== footerContainer) addFooterControls();
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("wires:pageview", () => {
      if (readConsent() !== "accepted" || typeof window.gtag !== "function") return;
      window.gtag("event", "page_view", {
        page_location: location.href,
        page_title: document.title
      });
    });

    const consent = readConsent();
    if (consent === "accepted") {
      closeBanner();
      enableAnalytics();
    } else if (consent === "refused") {
      closeBanner();
      disableAnalytics();
    } else {
      disableAnalytics();
      openBanner();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
