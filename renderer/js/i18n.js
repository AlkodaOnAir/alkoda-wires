/* ═══════════════════════════════════════════════════════════════
   i18n.js — Internationalisation extensible
   Pour ajouter une langue :
     1. Ajouter une entrée dans LANGUAGES
     2. Ajouter un bloc dans STRINGS avec le même id
   Toutes les clés UI, catégories et messages sont ici.
═══════════════════════════════════════════════════════════════ */

// ── Registre des langues disponibles ────────────────────────
const LANGUAGES = [
  { id: 'en', name: 'English',  nativeName: 'English',  flag: '🇬🇧' },
  { id: 'fr', name: 'French',   nativeName: 'Français', flag: '🇫🇷' },
  { id: 'es', name: 'Spanish',  nativeName: 'Español',  flag: '🇪🇸' },
];

// ── Chaînes UI — source : locales.js (chargé avant ce script) ──
const STRINGS = WIRES_LOCALES.renderer;


// ── Détection de la langue OS ────────────────────────────────
function _detectOSLang() {
  const nav = (navigator.language || navigator.userLanguage || 'en').split('-')[0].toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

// ── SVG drapeaux (Windows ne supporte pas les emoji de drapeaux) ──
function _flagSvg(id) {
  const svgs = {
    fr: '<svg width="22" height="15" viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg" style="border-radius:2px;vertical-align:middle;display:inline-block;pointer-events:none"><rect width="1" height="2" fill="#002395"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ED2939"/></svg>',
    en: '<svg width="22" height="15" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg" style="border-radius:2px;vertical-align:middle;display:inline-block;pointer-events:none"><rect width="60" height="30" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><line x1="0" y1="0" x2="30" y2="15" stroke="#C8102E" stroke-width="4"/><line x1="30" y1="15" x2="60" y2="30" stroke="#C8102E" stroke-width="4"/><line x1="60" y1="0" x2="30" y2="15" stroke="#C8102E" stroke-width="4"/><line x1="30" y1="15" x2="0" y2="30" stroke="#C8102E" stroke-width="4"/><path d="M30,0 V30 M0,15 H60" stroke="#fff" stroke-width="10"/><path d="M30,0 V30 M0,15 H60" stroke="#C8102E" stroke-width="6"/></svg>',
    es: '<svg width="22" height="15" viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg" style="border-radius:2px;vertical-align:middle;display:inline-block;pointer-events:none"><rect width="3" height="2" fill="#c60b1e"/><rect y=".5" width="3" height="1" fill="#ffc400"/></svg>',
  };
  return svgs[id] || `<span style="font-family:monospace;font-size:11px;letter-spacing:1px;pointer-events:none">${id.toUpperCase()}</span>`;
}

// ── État courant — seulement le choix MANUEL persiste ────────
// Le choix automatique (OS) n'est PAS stocké, pour ne pas bloquer
// la détection OS si la valeur stockée vient d'un ancien lancement.
const _storedLang = localStorage.getItem('wires-lang-manual') === '1'
  ? localStorage.getItem('wires-lang-v2') : null;
let _lang = (_storedLang && STRINGS[_storedLang]) ? _storedLang : _detectOSLang();

// ── Fonctions publiques ──────────────────────────────────────

function t(key) {
  const dict = STRINGS[_lang];
  if (dict && dict[key] !== undefined) return dict[key];
  return (STRINGS.en && STRINGS.en[key] !== undefined) ? STRINGS.en[key] : key;
}

function tType(type) {
  const names = (STRINGS[_lang] || {}).cable_type_names;
  return (names && names[type]) || type;
}

function getLang() { return _lang; }

function setLang(lang) {
  if (!STRINGS[lang]) { console.warn(`Language "${lang}" not found`); return; }
  _lang = lang;
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  // Images dont le visuel lui-même est traduit (texte incrusté dans le PNG) :
  // la clé i18n donne le chemin du fichier, pas un libellé.
  document.querySelectorAll('[data-i18n-src]').forEach(el => {
    el.src = t(el.dataset.i18nSrc);
  });

  const toggle = document.getElementById('lang-toggle');
  if (toggle) {
    const lo = LANGUAGES.find(l => l.id === lang);
    toggle.innerHTML = _flagSvg(lang);
    toggle.title = lo?.nativeName || lang;
  }

  if (typeof refreshSidebar === 'function') refreshSidebar();
  if (typeof _refreshCableAddBanner === 'function') _refreshCableAddBanner();
  if (typeof _refreshZonePlaceBanner === 'function') _refreshZonePlaceBanner();
  if (typeof _refreshTextLabelPlaceBanner === 'function') _refreshTextLabelPlaceBanner();
  if (typeof _refreshCablePanelLang === 'function') _refreshCablePanelLang();
  if (typeof _refreshMultiPanelLang === 'function') _refreshMultiPanelLang();
  if (typeof _refreshExportModalLang === 'function') _refreshExportModalLang();
  if (window.electronAPI?.setMenuLang) window.electronAPI.setMenuLang(lang);
}

function initI18n() {
  const toggle = document.getElementById('lang-toggle');
  if (toggle) {
    toggle.addEventListener('click', _showLangPicker);
  }
  setLang(_lang);
}

// ── Lang picker (drapeaux uniquement) ───────────────────────
function _showLangPicker(e) {
  e.stopPropagation();

  document.getElementById('_lang-picker')?.remove();

  const picker = document.createElement('div');
  picker.id = '_lang-picker';
  picker.style.cssText = `
    position:fixed; z-index:99999;
    background:#0f1422; border:1px solid #212d45; border-radius:6px;
    box-shadow:0 8px 32px rgba(0,0,0,.7); overflow:hidden;
    display:flex; flex-direction:column; align-items:center; gap:2px; padding:6px;
  `;

  LANGUAGES.forEach(lang => {
    const item = document.createElement('button');
    item.style.cssText = `
      display:flex; align-items:center; justify-content:center;
      width:36px; height:36px;
      background:${lang.id === _lang ? 'rgba(0,212,255,.15)' : 'transparent'};
      border:${lang.id === _lang ? '1px solid rgba(0,212,255,.4)' : '1px solid transparent'};
      border-radius:4px; cursor:pointer;
      line-height:1; padding:0;
      transition:background .1s;
    `;
    item.title = lang.nativeName;
    item.dataset.lang = lang.id; // identifie le bouton sans dépendre de l'ordre (voir tour.js)
    item.innerHTML = _flagSvg(lang.id);
    item.addEventListener('mouseenter', () => { if (lang.id !== _lang) item.style.background = 'rgba(255,255,255,.06)'; });
    item.addEventListener('mouseleave', () => { if (lang.id !== _lang) item.style.background = 'transparent'; });
    item.addEventListener('click', () => {
      localStorage.setItem('wires-lang-v2', lang.id);
      localStorage.setItem('wires-lang-manual', '1');
      setLang(lang.id);
      picker.remove();
    });
    picker.appendChild(item);
  });

  const rect = e.target.getBoundingClientRect();
  picker.style.top  = (rect.bottom + 4) + 'px';
  picker.style.left = rect.left + 'px';
  document.body.appendChild(picker);

  const close = ev => { if (!picker.contains(ev.target)) { picker.remove(); document.removeEventListener('click', close); } };
  setTimeout(() => document.addEventListener('click', close), 0);
}
