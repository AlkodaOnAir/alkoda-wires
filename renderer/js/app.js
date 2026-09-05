/* ═══════════════════════════════════════════════════════════════
   app.js — État global, constantes, bootstrap
   Wires by Alkoda © 2026
═══════════════════════════════════════════════════════════════ */

// ── Constantes canvas ────────────────────────────────────────
const CW = 6008;
const CH = 3172;
const OBS_MARGIN = 50;
const STUB_LEN   = 80;
const MAX_UNDO   = 10;
const NUDGE      = 14;
const EPS        = 4;

// ── Métadonnées câbles ───────────────────────────────────────
const CABLE_META = {
  'Audio'      : { color: '#ff4444', dashed: false },  // legacy compat
  'Dante'      : { color: '#ff4444', dashed: false },
  'DC'         : { color: '#c05000', dashed: false },
  'DisplayPort': { color: '#6644cc', dashed: false },
  'HDMI'       : { color: '#00b0f0', dashed: false },
  'Jack 3.5'   : { color: '#ff4444', dashed: false },
  'Jack 6.35'  : { color: '#ff4444', dashed: false },
  'MADI'       : { color: '#ff4444', dashed: false },
  'Optical'    : { color: '#00d4d4', dashed: false },
  'RCA/Cinch'  : { color: '#ff4444', dashed: false },
  'RJ45'       : { color: '#bfbfbf', dashed: false },
  'SDI'        : { color: '#00b050', dashed: false },
  'SDI-F'      : { color: '#00ff88', dashed: false },
  'Speakon'    : { color: '#ff4444', dashed: false },
  'Thunderbolt': { color: '#d4a000', dashed: false },
  'USB'        : { color: '#ffc000', dashed: false },  // legacy compat
  'USB-A'      : { color: '#ffc000', dashed: false },
  'USB-C'      : { color: '#ffc000', dashed: false },
  'USB-DC'     : { color: '#888888', dashed: true  },
  'XLR'        : { color: '#ff4444', dashed: false },
  'WiFi'       : { color: '#ffffff', dashed: false },
  'Bluetooth'  : { color: '#0082fc', dashed: false },
  'HF'         : { color: '#8bc34a', dashed: false },
};

// Types de port sans fil : pas de câble physique à dessiner, port affiché en
// permanence sur le canevas (voir nodes.js::_placeDots et main.css .port-wireless).
const WIRELESS_TYPES = new Set(['WiFi', 'Bluetooth', 'HF']);

// ── Types de câbles personnalisés (persistants) ──────────────
let USER_CABLE_TYPES = [];           // { id, color, dash? }[]

// ── Types de route/signal (persistants, entièrement gérés par l'utilisateur) ──
// Pré-rempli une seule fois avec SIGNAL_TYPES_LIST (_routeTypesSeeded), puis
// laissé libre : aucune distinction prédéfini/personnalisé ensuite, tout type
// peut être supprimé via le crayon de la fenêtre d'édition de route.
let USER_ROUTE_TYPES = [];           // { id }[]
let _routeTypesSeeded = false;

// ── Couleurs de route (persistantes, même principe que les types ci-dessus) ──
let USER_ROUTE_COLORS = [];          // hex[]
let _routeColorsSeeded = false;
let USER_CABLE_COLOR_OVERRIDES = {};  // { [nativeType]: color }
let USER_CABLE_DASH_OVERRIDES  = {};  // { [type]: 'solid'|'short'|'long' }
let NATIVE_CAT_COLOR_OVERRIDES = {};  // { [catId]: color }

// Normalise la valeur dashed (legacy boolean → string)
function _normDash(d) {
  if (!d || d === false || d === 'solid') return 'solid';
  if (d === true || d === 'short') return 'short';
  return 'long';
}

function getCableMeta(type) {
  if (CABLE_META[type]) {
    const colorOv = USER_CABLE_COLOR_OVERRIDES[type];
    const dashOv  = USER_CABLE_DASH_OVERRIDES[type];
    const dashed  = dashOv !== undefined ? dashOv : _normDash(CABLE_META[type].dashed);
    return { color: colorOv || CABLE_META[type].color, dashed };
  }
  const uc = USER_CABLE_TYPES.find(t => t.id === type);
  if (uc) return { color: uc.color, dashed: uc.dash || 'solid' };
  return { color: '#888', dashed: 'solid' };
}

function isKnownCableType(type) {
  return !!CABLE_META[type] ||
         !!USER_CABLE_TYPES.find(t => t.id === type) ||
         (typeof PORT_CONNECTOR_TYPES !== 'undefined' && PORT_CONNECTOR_TYPES.includes(type));
}

// ── Catégories par défaut ────────────────────────────────────
// label_key → clé dans STRINGS (ex: 'cat_switcher')
// Pour ajouter une catégorie custom, lui donner un label_key = null
// et mettre label = nom fixe.
const DEFAULT_CATS = [
  // Corbeille par défaut de tout appareil dont la catégorie n'est pas encore
  // choisie. Deux drapeaux à ne pas confondre :
  //   • `pinned: true`  → épinglée en TÊTE des listes au lieu d'être triée
  //     alphabétiquement, où elle tomberait à une place différente selon la
  //     langue (entre « Mélangeur » et « Rack » en français, entre « Network »
  //     et « Rack » en anglais).
  //   • `locked: true`  → non supprimable. Indispensable : supprimer une
  //     catégorie supprime TOUS ses appareils (library.js, delBtn), et c'est
  //     ici que s'accumulent ceux qui ne sont pas encore rangés.
  // Surtout PAS `virtual: true` : ce drapeau (celui d'`internet`) l'exclurait
  // du sélecteur et du filtre latéral, alors que tout l'intérêt est justement
  // qu'elle y soit cochable comme les autres.
  { id: 'unsorted',   label_key: 'cat_unsorted',   color: '#888888', pinned: true, locked: true },
  { id: 'switcher',   label_key: 'cat_switcher',   color: '#ff6b35' },
  { id: 'capture',    label_key: 'cat_capture',    color: '#00bcd4' },
  { id: 'conversion', label_key: 'cat_conversion', color: '#ab47bc' },
  { id: 'video',      label_key: 'cat_video',      color: '#42a5f5' },
  { id: 'audio',      label_key: 'cat_audio',      color: '#ec407a' },
  { id: 'network',    label_key: 'cat_network',    color: '#66bb6a' },
  { id: 'rack',       label_key: 'cat_rack',       color: '#78909c' },
  { id: 'external',   label_key: 'cat_external',   color: '#ffa726' },
  { id: 'usb',        label_key: 'cat_usb',        color: '#ffca28' },
  { id: 'power',      label_key: 'cat_power',      color: '#a1887f' },
  { id: 'storage',    label_key: 'cat_storage',    color: '#bdbdbd' },
  { id: 'camera',     label_key: 'cat_camera',     color: '#ef5350' },
  { id: 'display',    label_key: 'cat_display',    color: '#26c6da' },
  { id: 'computer',   label_key: 'cat_computer',   color: '#7e57c2' },
  { id: 'internet',   label_key: null, label: 'Internet', color: '#00aaff', virtual: true },
];

// ── État global ──────────────────────────────────────────────
const APP = {
  nodes:       {},   // { [id]: NodeState }
  cables:      [],   // CableState[]
  sel:         null, // id nœud sélectionné
  selCable:    null, // id câble sélectionné
  selMulti:    new Set(), // ids nœuds sélectionnés (marquee)
  textLabels:  {},   // { [id]: TextLabelState }
  selTextLabel: null, // id text label sélectionné
  zones:       {},   // { [id]: ZoneState }
  selZone:     null, // id zone sélectionnée
  chains:   [],   // RouteChain[]
  categories: DEFAULT_CATS.map(c => ({...c})),
  drag: {
    active: false,
    type:   null,   // 'node' | 'anchor' | 'canvas'
    id:     null,
    ox: 0, oy: 0,
    segIdx: 0,
    moved:  false,
  },
  view:  { zoom: 1, panX: 0, panY: 0 },
  undo:  [],
  redo:  [],
  meta:  { title: 'Untitled', created: Date.now(), modified: Date.now() },
};

// ── Variables globales ───────────────────────────────────────
let cableOverrides = {};  // { [cid]: [x,y][] }
let selCableId     = null;
let anchorMode     = false;
let resizeNodeId   = null;
let dirty          = false;
let currentFilePath = null;
let _nextCableId   = 1;
let _cableFilter   = new Set();
let CM = {};  // Connection Map: { [nodeId]: [{sid, cid, type, color, ...}] }

// ── Bibliothèque d'équipements ────────────────────────────────
// Vide par défaut — l'utilisateur ajoute ses propres appareils
const EQUIPMENT_LIBRARY = [];

// ── escapeHtml — échappe du texte avant toute insertion via innerHTML ──
// Un projet .wires peut venir de n'importe qui (échangé entre personnes) et contenir
// des chaînes arbitraires (nom d'appareil/câble/zone, titre de route...) : jamais du
// HTML de confiance, donc jamais inséré tel quel dans le DOM.
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ── sanitizeRichText — nettoie le HTML riche d'une étiquette de texte (tl.html) ──
// Ce champ contient VRAIMENT du HTML voulu (gras/italique/police posés par l'éditeur
// riche, voir textlabels.js) : un simple échappement casserait la mise en forme des
// étiquettes existantes. Liste blanche de balises/attributs à la place — tout le
// reste est retiré (balises dangereuses avec leur contenu ; balises inconnues juste
// "dépliées", en gardant leur texte). Parsé dans un <template>, dont le contenu est
// inerte par spec HTML (aucune image ne charge, aucun script ne s'exécute pendant
// qu'on l'examine) — sûr même avant tout nettoyage.
const RICH_TEXT_ALLOWED_TAGS = new Set(['B', 'I', 'U', 'STRONG', 'EM', 'FONT', 'BR', 'DIV', 'SPAN']);
const RICH_TEXT_DROP_ENTIRELY = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'META', 'FORM', 'SVG']);
const RICH_TEXT_SAFE_STYLE_PROPS = new Set(['color', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'background-color']);

function _sanitizeStyleValue(styleText) {
  const out = [];
  (styleText || '').split(';').forEach(decl => {
    const idx = decl.indexOf(':');
    if (idx < 0) return;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const val  = decl.slice(idx + 1).trim();
    if (!RICH_TEXT_SAFE_STYLE_PROPS.has(prop)) return;
    if (/url\(|expression\(|javascript:/i.test(val)) return;
    out.push(`${prop}:${val}`);
  });
  return out.join(';');
}

function sanitizeRichText(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html ?? '');
  const walk = node => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.COMMENT_NODE) { child.remove(); return; }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const tag = child.tagName;
      if (RICH_TEXT_DROP_ENTIRELY.has(tag)) { child.remove(); return; }
      if (!RICH_TEXT_ALLOWED_TAGS.has(tag)) {
        // Pas dans la liste blanche : "déplie" (garde le contenu, retire juste
        // l'enveloppe) plutôt que de perdre le texte de la personne.
        walk(child);
        while (child.firstChild) node.insertBefore(child.firstChild, child);
        child.remove();
        return;
      }
      [...child.attributes].forEach(attr => {
        const name = attr.name.toLowerCase();
        if (tag === 'FONT' && ['face', 'color', 'size'].includes(name)) return;
        if ((tag === 'SPAN' || tag === 'DIV') && name === 'style') {
          child.setAttribute('style', _sanitizeStyleValue(attr.value));
          return;
        }
        child.removeAttribute(attr.name);
      });
      walk(child);
    });
  };
  walk(tpl.content);
  return tpl.innerHTML;
}

// ── UUID helper ──────────────────────────────────────────────
function uuid() {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

// ── sortCats — ordre d'affichage commun à toutes les listes ──
// Les catégories épinglées (`pinned`) passent devant, le reste suit par ordre
// alphabétique du libellé traduit. Une seule source pour les quatre endroits
// qui listent des catégories (sélecteur d'ajout, sélecteur d'édition, menu du
// panneau, barre latérale) — sans quoi « Non classé » se retrouverait en tête
// à un endroit et au milieu à un autre.
function sortCats(cats) {
  return cats.slice().sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return getCat(a.id).label.localeCompare(getCat(b.id).label);
  });
}

// ── getCat — retourne la catégorie avec label traduit ────────
function getCat(id) {
  const cat = APP.categories.find(c => c.id === id);
  if (!cat) return { id, color: '#888', label: id };
  const lang = getLang();
  let label;
  if (cat.label_key) {
    label = cat.nativeOverride?.[lang] || t(cat.label_key);
  } else if (cat.labels) {
    label = cat.labels[lang] || cat.labels['fr'] || cat.labels['en'] || Object.values(cat.labels)[0] || cat.id;
  } else {
    label = cat.label || cat.id;
  }
  return { ...cat, label };
}

// ── saveUserCats — persiste custom cats + overrides natifs ───
async function saveUserCats() {
  if (!window.electronAPI) return;
  const customCats = APP.categories.filter(c => !c.label_key && !c.virtual);
  const nativeOverrides = {};
  for (const cat of APP.categories) {
    if (cat.nativeOverride && Object.keys(cat.nativeOverride).length) {
      nativeOverrides[cat.id] = cat.nativeOverride;
    }
  }
  await window.electronAPI.userCatsWrite({
    customCats,
    nativeOverrides,
    customCableTypes: USER_CABLE_TYPES,
    customRouteTypes: USER_ROUTE_TYPES,
    routeTypesSeeded: _routeTypesSeeded,
    customRouteColors: USER_ROUTE_COLORS,
    routeColorsSeeded: _routeColorsSeeded,
    cableColorOverrides: USER_CABLE_COLOR_OVERRIDES,
    cableDashOverrides:  USER_CABLE_DASH_OVERRIDES,
    nativeCatColors: NATIVE_CAT_COLOR_OVERRIDES,
  });
}

// ── Rebuild CM (Connection Map) ───────────────────────────────
function rebuildCM() {
  CM = {};
  for (const id of Object.keys(APP.nodes)) CM[id] = [];
  for (const c of APP.cables) {
    if (!CM[c.from]) CM[c.from] = [];
    if (!CM[c.to])   CM[c.to]   = [];
    const meta = CABLE_META[c.type] || { color: '#888', dashed: false };
    CM[c.from].push({ sid: c.to,   cid: c.id, type: c.type, color: c.color || meta.color });
    CM[c.to  ].push({ sid: c.from, cid: c.id, type: c.type, color: c.color || meta.color });
  }
  if (typeof _updateInternetNodes === 'function') _updateInternetNodes();
}

// ── setDirty ─────────────────────────────────────────────────
function setDirty(v = true) {
  dirty = v;
  const btn = document.getElementById('fsa-btn');
  if (btn) btn.classList.toggle('dirty', v);
  if (window.electronAPI) window.electronAPI.setSaveEnabled(v);
  // Étoile « non enregistré » : en-tête + titre de la fenêtre, cf. ui.js
  if (typeof refreshDirtyMark === 'function') refreshDirtyMark();
  if (v && typeof _scheduleAutosave === 'function') _scheduleAutosave();
}

// ── Bootstrap ────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await LICENSE.init();
  LICENSE.initUI();
  ABOUT.init();

  initI18n();
  initCanvas();
  initHistory();
  initUI();
  initLibrary();
  initNewCableModal();
  initRoutes();
  initFileIO();
  _checkForUpdate(); // en tâche de fond — jamais d'attente, voir update.js
  initTextLabels();
  initZones();
  initExportDialog();
  if (typeof initExportMenu === 'function') initExportMenu();

  // Suivi état fullscreen
  if (window.electronAPI?.onFullscreenChange) {
    window.electronAPI.onFullscreenChange(isFs => document.body.classList.toggle('is-fullscreen', isFs));
  }

  // Menu actions depuis main process
  if (window.electronAPI) {
    window.electronAPI.onMenuAction(ev => {
      switch (ev) {
        case 'menu-new':        newProject(); break;
        case 'menu-open':       openFile();   break;
        case 'menu-save':       saveFile();   break;
        case 'menu-save-as':    saveFileAs(); break;
        case 'menu-export':           openExportModal();  break;
        case 'menu-undo':            undo();             break;
        case 'menu-redo':            redo();             break;
        case 'menu-cut':             _cutNodes();        break;
        case 'menu-copy':            _copyNodes();       break;
        case 'menu-paste':           _pasteNodes();      break;
        case 'menu-shortcuts':       _showShortcuts();   break;
        case 'menu-colors':          openColorsPopup();  break;
        case 'menu-fit':             fitView();          break;
        case 'menu-import-project':  importSubproject(); break;
        case 'menu-close-project':   closeProject();     break;
        case 'menu-reactivate-tour': if (typeof reactivateTourPopup === 'function') reactivateTourPopup(); break;
      }
    });
  }

  // Raccourcis clavier globaux
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    const editable = document.activeElement?.isContentEditable;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || editable) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      handleEscape();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (e.key === 'z' &&  e.shiftKey) { e.preventDefault(); redo(); return; }
      if (e.key === 'y')                { e.preventDefault(); redo(); return; }
      if (e.key === 's') { e.preventDefault(); saveFile(); return; }
      if (e.key === 'o') { e.preventDefault(); openFile(); return; }
      if (e.key === 'n') { e.preventDefault(); newProject(); return; }
      // Copier/Couper agissent sur ce qui est sélectionné ; Coller relit
      // _clipboardType (posé par le dernier copier/couper), jamais la sélection en
      // cours — comme partout, coller ne dépend pas de ce qui est sélectionné au moment
      // du Ctrl+V.
      if (e.key === 'c') {
        if (APP.selZone) _copyZone();
        else if (APP.selTextLabel) _copyTextLabel();
        else _copyNodes();
        return;
      }
      if (e.key === 'x') {
        e.preventDefault();
        if (APP.selZone) _cutZone();
        else if (APP.selTextLabel) _cutTextLabel();
        else _cutNodes();
        return;
      }
      if (e.key === 'v') {
        e.preventDefault();
        if (_clipboardType === 'zone') _pasteZone();
        else if (_clipboardType === 'textLabel') _pasteTextLabel();
        else _pasteNodes();
        return;
      }
    }
    if (e.key === 'f' || e.key === 'F') { fitView(); return; }
    if (e.key === '+' || e.key === '=') { dz(+0.15); return; }
    if (e.key === '-')                  { dz(-0.15); return; }
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
      const dir = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down' }[e.key];
      if (typeof _stubBendState !== 'undefined' && _stubBendState) {
        if (typeof _bendKeyIsLive === 'function' && _bendKeyIsLive(dir)) {
          e.preventDefault();
          setStubBend(dir);
        }
        return;
      }
      if (typeof _stubSelState !== 'undefined' && _stubSelState) {
        e.preventDefault();
        setStubDir(dir);
        return;
      }
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (APP.selTextLabel) { deleteTextLabel(APP.selTextLabel); return; }
      if (APP.selZone)      { deleteZone(APP.selZone); return; }
      if (APP.selMulti && APP.selMulti.size > 1) {
        const internetId = [...APP.selMulti].find(id => APP.nodes[id]?.cat === 'internet');
        if (internetId) {
          // Internet dans la sélection : le traiter séparément
          APP.selMulti.delete(internetId);
          deleteInternetNode(internetId);
          return;
        }
        const names = [...APP.selMulti].map(id => APP.nodes[id]?.name).filter(Boolean);
        const label = names.length <= 3 ? names.join(', ') : `${names.slice(0,3).join(', ')} + ${names.length - 3} more`;
        showConfirm(t('delete_multi_devices').replace('$n', APP.selMulti.size).replace('$names', label), { danger: true }).then(ok => {
          if (!ok) return;
          const toDelete = [...APP.selMulti];
          clearSelMulti();
          for (const id of toDelete) deleteNode(id);
        });
        return;
      }
      if (APP.sel) {
        const selNode = APP.nodes[APP.sel];
        if (selNode?.cat === 'internet') { deleteInternetNode(APP.sel); return; }
        deleteNode(APP.sel); return;
      }
      if (selCableId != null) { deleteConn(selCableId); return; }
    }
    if (e.key === 'b' || e.key === 'B') {
      document.getElementById('sidebar-left').classList.toggle('pinned');
      return;
    }
  });

  // Nouveau projet vide par défaut (seulement si pas d'autosave — _restoreAutosave s'en charge)
  // newProject() est appelé par _restoreAutosave si aucune session n'existe

});

function handleEscape() {
  if (document.body.classList.contains('is-fullscreen')) { window.electronAPI?.exitFullscreen(); return; }
  if (typeof _zPlace !== 'undefined' && _zPlace) { exitZonePlaceMode(); return; }
  if (typeof _zoneInEditMode !== 'undefined' && _zoneInEditMode) { exitZoneEditMode(_zoneInEditMode); return; }
  if (APP.selZone) { clearSelZone(); closePanel(); return; }
  if (typeof _tlPlace !== 'undefined' && _tlPlace) { exitTextLabelPlaceMode(); return; }
  if (APP.selTextLabel) { clearSelTextLabel(); closePanel(); return; }
  if (APP.selMulti && APP.selMulti.size > 0) { clearSelMulti(); closePanel(); return; }
  if (typeof _cableAddMode !== 'undefined' && _cableAddMode) {
    exitCableAddMode(); return;
  }
  const stubMenu = document.getElementById('_stub-menu');
  if (stubMenu) { stubMenu._stubMenuCleanup?.(); stubMenu.remove(); return; }
  if (document.querySelector('.modal-overlay.open')) {
    document.querySelector('.modal-overlay.open')?.classList.remove('open');
    return;
  }
  if (resizeNodeId) { exitResizeMode(); return; }
  if (anchorMode)   { clearAnchorMode(); return; }
  if (typeof _stubBendState !== 'undefined' && _stubBendState) { exitStubBend(); return; }
  if (typeof _stubSelState  !== 'undefined' && _stubSelState)  { exitStubSel();  return; }
  clearSel();
  clearSelCable();
  closePanel();
}

// ── Copier / Couper / Coller ──────────────────────────────────
// _clipboardType distingue quel presse-papiers coller (Ctrl+V) doit utiliser — copier
// un type efface les 2 autres, un seul presse-papiers actif à la fois, comme partout.
let _clipboardType  = null; // 'node' | 'zone' | 'textLabel' | null
let _nodeClipboard  = null; // [{ nodeData, relX, relY }]
let _zoneClipboard  = null; // objet zone unique (pas de multi-sélection de zones)
let _tlClipboard    = null; // objet étiquette de texte unique (idem)

function _getSelectedIds() {
  if (APP.selMulti && APP.selMulti.size > 0) return [...APP.selMulti];
  if (APP.sel) return [APP.sel];
  return [];
}

function _copyNodes() {
  const ids = _getSelectedIds();
  if (!ids.length) return;
  const nodes = ids.map(id => APP.nodes[id]).filter(Boolean);
  const cx = nodes.reduce((s, n) => s + n.x + n.w / 2, 0) / nodes.length;
  const cy = nodes.reduce((s, n) => s + n.y + n.h / 2, 0) / nodes.length;
  _nodeClipboard = nodes.map(n => ({
    data: JSON.parse(JSON.stringify(n)),
    relX: n.x - cx,
    relY: n.y - cy,
  }));
  _clipboardType = 'node';
}

function _cutNodes() {
  const ids = _getSelectedIds();
  if (!ids.length) return;
  _copyNodes();
  pushUndo();
  ids.forEach(id => deleteNode(id));
}

function _pasteNodes() {
  if (!_nodeClipboard || !_nodeClipboard.length) return;
  pushUndo();
  const { x: vx, y: vy } = screenToCanvas(window.innerWidth / 2, window.innerHeight / 2);
  const offset = 24;
  clearSel();
  if (typeof clearSelMulti === 'function') clearSelMulti();
  const newIds = _nodeClipboard.map(({ data, relX, relY }) => {
    const eq = { ...data };
    const nid = createNode(eq, vx + relX + offset, vy + relY + offset);
    return nid;
  });
  // Numérotation auto au collage — voir _assignPasteNumbering (library.js).
  newIds.forEach(nid => { if (typeof _assignPasteNumbering === 'function') _assignPasteNumbering(nid); });
  if (newIds.length === 1) {
    selectNode(newIds[0]);
  } else if (newIds.length > 1 && typeof selectMulti === 'function') {
    newIds.forEach(id => APP.selMulti.add(id));
    openMultiPanel();
  }
  setDirty();
}

// ── Copier / Couper / Coller — Zones (sélection simple, pas de multi) ──
function _copyZone() {
  if (!APP.selZone) return;
  const z = APP.zones[APP.selZone];
  if (!z) return;
  _zoneClipboard = JSON.parse(JSON.stringify(z));
  _clipboardType = 'zone';
}

function _cutZone() {
  if (!APP.selZone) return;
  _copyZone();
  pushUndo();
  deleteZone(APP.selZone);
}

function _pasteZone() {
  if (!_zoneClipboard) return;
  pushUndo();
  const { x: vx, y: vy } = screenToCanvas(window.innerWidth / 2, window.innerHeight / 2);
  const offset = 24;
  const id = _newZoneId();
  const z = { ..._zoneClipboard, id };
  z.x = Math.round(vx - z.width / 2) + offset;
  z.y = Math.round(vy - z.height / 2) + offset;
  // Recalculée (comme addZone) plutôt que copiée de l'original : sinon la copie peut se
  // retrouver au même niveau qu'une autre zone existante, ordre d'empilement ambigu.
  z.zIndex = Object.values(APP.zones).reduce((m, o) => Math.max(m, o.zIndex || 1), 0) + 1;
  APP.zones[id] = z;
  _buildZoneEl(id);
  selectZone(id);
  setDirty();
}

// ── Copier / Couper / Coller — Étiquettes de texte (sélection simple) ──
function _copyTextLabel() {
  if (!APP.selTextLabel) return;
  const tl = APP.textLabels[APP.selTextLabel];
  if (!tl) return;
  _tlClipboard = JSON.parse(JSON.stringify(tl));
  _clipboardType = 'textLabel';
}

function _cutTextLabel() {
  if (!APP.selTextLabel) return;
  _copyTextLabel();
  pushUndo();
  deleteTextLabel(APP.selTextLabel);
}

function _pasteTextLabel() {
  if (!_tlClipboard) return;
  pushUndo();
  const { x: vx, y: vy } = screenToCanvas(window.innerWidth / 2, window.innerHeight / 2);
  const offset = 24;
  const id = _newTlId();
  const tl = { ..._tlClipboard, id };
  // Taille de repli si l'étiquette d'origine n'a jamais été redimensionnée à la main
  // (width/height restent null, auto-dimensionnée) — mêmes valeurs que addTextLabel().
  const w = tl.width || 80, h = tl.height || 24;
  tl.x = Math.round(vx - w / 2) + offset;
  tl.y = Math.round(vy - h / 2) + offset;
  APP.textLabels[id] = tl;
  _buildTlEl(id);
  selectTextLabel(id);
  setDirty();
}

// ── Popup raccourcis clavier ──────────────────────────────────
function _showShortcuts() {
  const overlay = document.getElementById('shortcuts-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('shortcuts-overlay');
  if (!overlay) return;
  const close = () => overlay.classList.remove('open');
  document.getElementById('shortcuts-close')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) { e.stopPropagation(); close(); }
  }, true);
});
