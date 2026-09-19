/* ═══════════════════════════════════════════════════════════════
   nodes.js — Rendu DOM nœuds, drag, resize, labels
═══════════════════════════════════════════════════════════════ */

const MIN_W = 40, MIN_H = 30;

// Doit rester synchro avec le scale(1.7) de .cab-clickable:hover/.cab-free:hover
// (main.css) — le nom du type de port (.port-dot-type-lbl) n'est jamais visible en
// dehors du survol de son point (voir main.css :has(+ .cab-free:hover)), donc son
// décalage vertical doit dégager le point dans sa taille AGRANDIE par ce survol,
// jamais sa taille de repos (dotSize seul), sous peine de le faire chevaucher le
// point une fois réellement affiché.
const PORT_LBL_HOVER_SCALE = 1.7;

// ── Taille des points de connexion ───────────────────────────────────────────
// Un point est une CIBLE À CLIQUER : il vise donc un diamètre constant À L'ÉCRAN,
// quel que soit le zoom — d'abord le zoom, les limites ensuite (règle posée par
// l'utilisateur le 2026-09-18). L'ancienne formule (9 % du plus petit côté de
// l'image rendue) donnait des tailles incohérentes d'un appareil à l'autre, non
// pas selon ses prises mais selon la PROPORTION de sa photo : 48 px sur un
// moniteur presque carré, 10 px sur un ATEM dont l'image fait 866 × 111, 5 px sur
// un switch. Recadrer la même photo avec plus de marge changeait la taille.
//
// Limite unique, valable pour TOUT le projet (les points doivent rester de la même
// taille d'un appareil à l'autre) : 70 % du plus petit écart entre deux prises d'un
// même appareil, toutes faces confondues — deux points ne peuvent donc jamais se
// toucher, sur aucun appareil. Ce plafond ne joue qu'en dézoomant fort.
// Sécurité anti-régression : window._xPortDotFixedScreen = false → ancienne formule.
const PORT_DOT_SCREEN     = 14;    // diamètre visé à l'écran, en pixels
const PORT_DOT_SCREEN_MIN = 8;     // en dessous, un point devient invisible en dézoomant
const PORT_DOT_WL_RATIO   = 1.27;  // port sans fil : cible plus généreuse (voir _placeDots)
const PORT_DOT_GAP_RATIO  = 0.7;   // part de l'écart entre deux prises qu'un point peut occuper
let _portDotCap = Infinity;        // plafond du projet, en unités canevas

// Diamètres à utiliser pour le zoom courant, en unités canevas.
// Ordre voulu par l'utilisateur : le zoom d'abord, les limites ensuite — d'abord la
// taille à l'écran, puis le plafond « ne jamais se toucher », puis le plancher « rester
// visible ». Le plancher l'emporte volontairement sur le plafond : en dessous d'environ
// 57 % de zoom on ne vise plus une prise, on veut seulement voir qu'il y en a — mieux
// vaut des points qui se frôlent que des points invisibles (décision du 2026-09-18).
function portDotSizes(zoom) {
  const z    = zoom || 1;
  const base = PORT_DOT_SCREEN / z;
  const floor = PORT_DOT_SCREEN_MIN / z;
  return {
    normal:   Math.max(Math.min(base, _portDotCap), floor),
    wireless: Math.max(Math.min(base * PORT_DOT_WL_RATIO, _portDotCap), floor),
  };
}

// Recalcule le plafond du projet. À rappeler dès que des ports changent (chargement,
// ajout/suppression d'appareil, modification des points, import).
function refreshPortDotCap() {
  let minGap = Infinity;
  for (const s of Object.values(APP.nodes || {})) {
    for (const [key, side] of [['ports', 'front'], ['portsRear', 'rear']]) {
      const ps = s[key];
      if (!ps || ps.length < 2) continue;
      const r = _nodeImgRect(s, side);
      const rW = r ? r.rW : s.w, rH = r ? r.rH : s.h;
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = (ps[i].nx - ps[j].nx) * rW, dy = (ps[i].ny - ps[j].ny) * rH;
          const d = Math.hypot(dx, dy);
          if (d > 0 && d < minGap) minGap = d;
        }
      }
    }
  }
  _portDotCap = minGap === Infinity ? Infinity : minGap * PORT_DOT_GAP_RATIO;
  if (typeof applyT === 'function') applyT();   // réécrit les variables CSS
}

// Sécurité anti-régression du correctif de redimensionnement (patch en place des câbles
// connectés plutôt que réinitialisation totale du cache de tracé, voir setupResizeHandle) :
// window._resizePatchCables = false dans la console repasse instantanément à l'ancien
// comportement (recalcul complet de TOUS les câbles du projet à chaque redimensionnement).
window._resizePatchCables = window._resizePatchCables !== false;

// ── Icônes des ports sans fil (WiFi/Bluetooth/HF) ─────────────
// Purement décoratif — voir _placeDots(). Couleur du trait choisie pour contraster
// avec le fond du dot (couleur du type, voir CABLE_META dans app.js).
// pointer-events:none sur l'icône elle-même : un SVG en traits seuls (fill="none")
// ne capte nativement les clics que sur les traits peints eux-mêmes (comportement
// par défaut des SVG), pas sur toute sa zone visuelle — sans ça, la zone cliquable
// réelle se limite aux quelques pixels du trait au lieu de tout le point de connexion.
function _wirelessIconHTML(type) {
  if (type === 'WiFi') {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0a0f1e" stroke-width="2.2" stroke-linecap="round" style="pointer-events:none">
      <path d="M2 9a14.14 14.14 0 0 1 20 0"/>
      <path d="M6 13a8.5 8.5 0 0 1 12 0"/>
      <path d="M10 17a3 3 0 0 1 4 0"/>
      <circle cx="12" cy="20" r="1.4" fill="#0a0f1e" stroke="none"/>
    </svg>`;
  }
  if (type === 'Bluetooth') {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" style="pointer-events:none">
      <path d="M6.5 6.5L17.5 17.5L12 23V1L17.5 6.5L6.5 17.5"/>
    </svg>`;
  }
  // HF : pas de logo universel pour cette catégorie — badge texte.
  return `<span style="font-size:10px;font-weight:700;color:#ffffff;font-family:var(--mono,monospace);letter-spacing:.3px;pointer-events:none">HF</span>`;
}

// ── Internet node — icône SVG globe embarquée ─────────────────
const _INTERNET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><circle cx="80" cy="80" r="64" fill="#001a2e" stroke="#00aaff" stroke-width="3.5"/><ellipse cx="80" cy="80" rx="28" ry="64" fill="none" stroke="#00aaff" stroke-width="2.5" opacity="0.75"/><line x1="16" y1="80" x2="144" y2="80" stroke="#00aaff" stroke-width="2.5" opacity="0.75"/><path d="M20 54 Q80 38 140 54" fill="none" stroke="#00aaff" stroke-width="2" opacity="0.65"/><path d="M20 106 Q80 122 140 106" fill="none" stroke="#00aaff" stroke-width="2" opacity="0.65"/></svg>`;
const _INTERNET_IMG = `data:image/svg+xml,${encodeURIComponent(_INTERNET_SVG)}`;

// ── Ajouter le nœud Internet s'il n'existe pas encore ─────────
function _ensureInternetNode() {
  const hasInternet = Object.values(APP.nodes).some(n => n.cat === 'internet');
  if (hasInternet) return;
  const id = uuid();
  APP.nodes[id] = {
    id,
    name: 'Internet', short: 'Internet',
    cat: 'internet', virtual: true,
    img: _INTERNET_IMG, img_original: _INTERNET_IMG,
    desc: '', desc_en: '',
    x: 230, y: 520, w: 60, h: 50,
    cx: 260, cy: 545,
    bb: { left: 0, right: 1, top: 0, bottom: 1 },
    stub: null,
    ports: [{ id: 'rj45', type: 'RJ45', nx: 0.5, ny: 0.02, dual: true }],
    zindex: 1,
  };
  CM[id] = [];
}

// ── Mettre à jour l'apparence grisée des nœuds Internet ───────
function _updateInternetNodes() {
  for (const [id, n] of Object.entries(APP.nodes)) {
    if (n.cat !== 'internet') continue;
    const el = document.getElementById(`n-${id}`);
    if (!el) continue;
    const connected = CM[id] && CM[id].length > 0;
    el.classList.toggle('internet-disconnected', !connected);
  }
}

// ── Créer un nouveau nœud depuis un équipement de la lib ──────
function createNode(equipment, canvasX, canvasY) {
  pushUndo();
  const id = uuid();
  const w = equipment.w || 240;
  const h = equipment.h || 120;
  const node = {
    id,
    name:    equipment.name,
    short:   equipment.short || equipment.name,
    _nameEd: false,
    _shortEd: false,
    cat:     equipment.cat || 'video',
    img:          equipment.img || null,
    img_original: equipment.img_original || null,
    // Tolérance de détourage : la bibliothèque la mémorise depuis toujours, mais
    // elle n'était jamais reportée sur l'appareil placé. Deux effets, tous deux
    // constatés : Configuration image rouvrait sur la valeur par défaut au lieu
    // de celle réglée pour cet appareil, et l'appareil n'ayant aucune tolérance
    // enregistrée, la fenêtre ne détectait plus qu'on y touchait.
    // `?? null` et non `|| null` : une tolérance de 0 est une valeur légitime.
    rmbg_tol:     equipment.rmbg_tol ?? null,
    // Recadrage ajusté à la main, en fractions (0..1). Même raison : sans lui,
    // rouvrir Configuration image recalcule le cadre automatique et écrase
    // l'ajustement.
    rmbg_crop:    equipment.rmbg_crop || null,
    desc:    equipment.desc || '',
    desc_en: equipment.desc_en || '',
    x: Math.round(canvasX - w / 2),
    y: Math.round(canvasY - h / 2),
    w, h,
    cx: 0, cy: 0,
    bb:         equipment.bb || { left: 0, right: 1, top: 0, bottom: 1 },
    bbAuto:     !!equipment.bbAuto, // sinon recalculé au chargement de l'image (voir renderOneNode)
    stub:       equipment.stub || null,
    ports:      equipment.ports ? equipment.ports.map(p => ({ ...p })) : [],
    shape:      equipment.shape || null,
    shapeColor: equipment.shapeColor || null,
    zindex: 1,
  };
  // Vue Arrière, si l'équipement en a une (configurée pendant sa création — voir
  // _anFinalizeConfirm, library.js) — jamais forcée à null pour les appareils qui
  // n'en ont pas, mêmes conventions que les champs Avant ci-dessus.
  if (equipment.imgRear) {
    node.imgRear          = equipment.imgRear;
    node.imgRear_original = equipment.imgRear_original || null;
    node.rmbg_tolRear      = equipment.rmbg_tolRear ?? null;
    node.rmbg_cropRear     = equipment.rmbg_cropRear || null;
    node.portsRear         = equipment.portsRear ? equipment.portsRear.map(p => ({ ...p })) : [];
    node.shapeRear         = equipment.shapeRear || null;
    node.shapeColorRear    = equipment.shapeColorRear || null;
  }
  // Produit trouvé par la recherche d'images (voir _searchProductOfNode, library.js) : sert à
  // pré-remplir la recherche d'une image ajoutée ou remplacée plus tard.
  if (equipment.searchBrand || equipment.searchModel) {
    node.searchBrand = equipment.searchBrand || '';
    node.searchModel = equipment.searchModel || '';
  }
  node.cx = node.x + node.w / 2;
  node.cy = node.y + node.h / 2;

  APP.nodes[id] = node;
  CM[id] = [];

  renderOneNode(id);
  rebuildCM();
  renderCables(); // recalcul complet (nouveau obstacle)
  if (typeof refreshSidebar === 'function') refreshSidebar();
  setDirty();
  return id;
}

// ── Rendu de TOUS les nœuds ───────────────────────────────────
function renderNodes() {
  const nodesLayer  = document.getElementById('nodes-layer');
  const labelsLayer = document.getElementById('node-labels-layer');
  nodesLayer .innerHTML = '';
  labelsLayer.innerHTML = '';
  for (const id of Object.keys(APP.nodes)) {
    renderOneNode(id);
  }
  refreshPortDotCap();   // les prises du projet ont pu changer (ouverture, import, annulation)
}

// ── Bascule Avant/Arrière (aperçu d'affichage, PAS un état de projet) ──
// Volontairement PAS sur le nœud (jamais s.activeView) : un simple aperçu,
// jamais enregistré dans le .wires, jamais dans l'historique Annuler/Refaire,
// remis à zéro à chaque (ré)ouverture de projet (voir loadState/fileIO.js et
// newProject/ui.js). Changer quelle image est affichée ne doit pas demander
// à l'utilisateur de sauvegarder — ports/câbles restent basés sur l'Avant
// (voir le commentaire sur _rearActive dans renderOneNode).
let _previewView = {}; // { [nodeId]: 'front'|'rear' }, absent = 'front'

function toggleNodeActiveView(sid) {
  const s = APP.nodes[sid];
  if (!s || !s.imgRear) return; // rien à basculer
  _previewView[sid] = (_previewView[sid] === 'rear') ? 'front' : 'rear';
  renderOneNode(sid);
  // L'occlusion dépend de la vue active : redessiner les câbles AVANT la resélection, qui pose leur mise en évidence.
  if (typeof redrawOnlyCables === 'function') redrawOnlyCables();
  // renderOneNode reconstruit le DOM du nœud à neuf (perd la classe .sel) —
  // même technique que _applyEditToNode (library.js) pour la réappliquer :
  // reselectNode (select.js) vide APP.sel puis rappelle selectNode(), sans le fondu des câbles.
  if (APP.sel === sid && typeof reselectNode === 'function') reselectNode(sid);
  if (APP.sel === sid && typeof openInfoPanel === 'function') openInfoPanel(sid);
  // Idem pour l'état interactif des points en mode ajout de câble : renderOneNode
  // recrée les points à neuf, sans leurs classes cab-* (disponible/utilisé/
  // incompatible) — ils restent visibles (opacity:1 de .cable-add-mode) mais non
  // cliquables et non survolables tant que ce calcul n'est pas rappelé (bug relevé
  // le 2026-09-12).
  if (typeof _cableAddMode !== 'undefined' && _cableAddMode && typeof _refreshPortDotState === 'function') {
    _refreshPortDotState();
    _refreshFlipBtnMarks(); // la marque du ↻ est aussi perdue à la reconstruction
  }
}

// Câbles connectés à ce nœud dont le tracé en cache dépend d'une mesure/d'un
// scan qui vient de changer (dimensions Arrière, pixels alpha) : invalidé sans
// distinction (peu coûteux, ne se produit qu'une fois par image distincte) puis
// re-rendu pour qu'ils se replacent avec les nouvelles données.
function _invalidateCablesForNode(sid) {
  let needRedraw = false;
  for (const c of (APP?.cables || [])) {
    if (c.from !== sid && c.to !== sid) continue;
    delete cableOverrides[c.id];
    needRedraw = true;
  }
  if (needRedraw && typeof renderCables === 'function') renderCables();
}

// Pixels relus ou taille Arrière remesurée : redessine les câbles du nœud sans effacer leur tracé enregistré.
// Sécu de régression : window._xRearImageSync = false (console) → ancien comportement (tracés effacés puis retracés, taille Arrière jamais remesurée).
function _refreshCablesAfterImageRead(sid) {
  if (window._xRearImageSync === false) { _invalidateCablesForNode(sid); return; }
  if ((APP?.cables || []).some(c => c.from === sid || c.to === sid) && typeof renderCables === 'function') renderCables();
}

// Mesure les dimensions naturelles de l'image Arrière (s._imgWRear/HRear) via
// une image HORS DOM, jamais affichée — indépendamment de la vue cosmétique
// actuellement active (voir l'appel dans renderOneNode). Sans ça, un port
// Arrière ne serait positionné correctement (_nodeImgRect(s,'rear')) qu'APRÈS
// qu'un humain ait cliqué ↻ au moins une fois cette session, alors qu'un câble
// peut très bien être ancré côté Arrière sans que personne n'ait jamais prévisualisé
// cette vue (ex: après un échange ⇄ Avant/Arrière). Mesurée une seule fois,
// jamais réinitialisée tant que l'image Arrière ne change pas (comme s._imgW
// pour l'Avant, mesuré au premier rendu réel). Profite du même chargement hors
// DOM pour mettre en cache les pixels alpha de l'Arrière (voir _alphaPixelsCache
// plus bas) — sert à l'occlusion précise dans cables.js.
function _ensureRearDims(sid, s) {
  if (!s.imgRear) return;
  if (window._xRearImageSync === false) {
    if (s._imgWRear && s._imgHRear) return;
    const img = new Image();
    img.onload = () => {
      if (s._imgWRear && s._imgHRear) return; // déjà mesuré entre-temps
      s._imgWRear = img.naturalWidth;
      s._imgHRear = img.naturalHeight;
      if (_cacheAlphaPixels(sid, 'rear', s.imgRear, img)) _invalidateCablesForNode(sid);
    };
    img.src = s.imgRear;
    return;
  }
  // Relue dès que l'image Arrière n'est plus celle déjà lue (⇄, nouvelle image, recadrage) ou pas encore lue depuis le lancement.
  const src = s.imgRear;
  const cached = _alphaPixelsCache[sid]?.rear;
  if (cached && cached.src === src) {
    // Déjà lue : vérifier seulement la taille retenue (ex. projet rouvert avec une taille fausse enregistrée).
    if (s._imgWRear !== cached.data.width || s._imgHRear !== cached.data.height) {
      Promise.resolve().then(() => { if (_applyRearSize(sid, src, cached.data.width, cached.data.height)) _refreshCablesAfterImageRead(sid); });
    }
    return;
  }
  if (_rearReadPending[sid] === src) return;
  _rearReadPending[sid] = src;
  const img = new Image();
  img.onload = () => {
    if (_rearReadPending[sid] === src) delete _rearReadPending[sid];
    if (APP.nodes[sid]?.imgRear !== src) return; // image remplacée entre-temps : le rendu suivant relance la lecture
    const sizeChanged = _applyRearSize(sid, src, img.naturalWidth, img.naturalHeight);
    if (_cacheAlphaPixels(sid, 'rear', src, img) || sizeChanged) _refreshCablesAfterImageRead(sid);
  };
  img.onerror = () => { if (_rearReadPending[sid] === src) delete _rearReadPending[sid]; };
  img.src = src;
}

// Applique la taille réelle de l'image Arrière. Si elle a changé, recale seulement les bouts de câble
// branchés sur l'appareil (comme un port déplacé), sans retracer. Renvoie true si la taille a changé.
function _applyRearSize(sid, src, w, h) {
  const node = APP.nodes[sid];
  if (!node || node.imgRear !== src) return false;
  if (node._imgWRear === w && node._imgHRear === h) return false;
  node._imgWRear = w;
  node._imgHRear = h;
  if (typeof _patchCablesForPortMove === 'function') _patchCablesForPortMove(sid);
  return true;
}

// ── Occlusion Avant/Arrière — pixels alpha mis en cache ────────
// Jamais sur le nœud, jamais sauvegardé (comme _previewView/_ensureRearDims) :
// juste les pixels décodés d'une image, par appareil+côté, pour que cables.js
// sache "combien de pixels transparents avant un pixel opaque" le long de
// l'axe d'un câble (voir cables.js::_occlusionEraseLength). Ne sert qu'aux
// appareils ayant une Arrière — jamais construit sinon.
let _alphaPixelsCache = {}; // { [sid]: { front: {src, data}, rear: {src, data} } }
let _rearReadPending = {}; // { [sid]: src } — lecture hors DOM de l'image Arrière en cours (voir _ensureRearDims)

// Renvoie true si le cache vient d'être construit : à l'appelant de redessiner les câbles.
function _cacheAlphaPixels(sid, side, src, imgEl) {
  const slot = (_alphaPixelsCache[sid] || (_alphaPixelsCache[sid] = {}));
  if (slot[side] && slot[side].src === src) return false; // déjà à jour pour CETTE image
  try {
    const cv = document.createElement('canvas');
    cv.width  = imgEl.naturalWidth;
    cv.height = imgEl.naturalHeight;
    const ctx = cv.getContext('2d');
    ctx.drawImage(imgEl, 0, 0);
    slot[side] = { src, data: ctx.getImageData(0, 0, cv.width, cv.height) };
    // Nouveau cache prêt : un câble a pu essayer de l'utiliser avant qu'il
    // n'existe (retourné 0, voir _occlusionEraseLength dans cables.js) — sans le
    // réveil fait par l'appelant, il ne serait jamais redessiné avec la bonne donnée.
    return true;
  } catch (e) {
    // Pixels illisibles : pas de cache, le câble reste simplement entier (aucune occlusion).
    return false;
  }
}

// Assure que les pixels Avant sont en cache pour l'occlusion — seulement utile
// si cet appareil a une Arrière (sinon aucun câble n'a jamais besoin d'être
// masqué contre l'Avant). Réutilise l'<img> DÉJÀ chargée par renderOneNode
// (imgEl), aucun chargement supplémentaire.
function _ensureFrontAlphaPixels(sid, s, imgEl) {
  if (!s.imgRear || !s.img) return;
  if (_cacheAlphaPixels(sid, 'front', s.img, imgEl)) _refreshCablesAfterImageRead(sid);
}

// ── Rendu d'UN nœud ──────────────────────────────────────────
function renderOneNode(sid) {
  const s = APP.nodes[sid];
  if (!s) return;
  s.id = sid;
  s.cx = s.x + s.w / 2;
  s.cy = s.y + s.h / 2;

  const cat = getCat(s.cat);

  // Vue active (Avant/Arrière) — l'image ET les ports affichés suivent la vue
  // active ; le cadre d'obstacle (s.bb/s.bbAuto) et l'ajustement automatique de
  // hauteur, eux, restent volontairement basés sur l'Avant SEUL (voir le "if
  // (!_rearActive)" dans le callback de chargement d'image plus bas) — la boîte
  // du nœud ne doit pas changer de taille selon la vue affichée. Chaque vue a
  // son propre couple de dimensions naturelles (s._imgW/H pour l'Avant,
  // s._imgWRear/HRear pour l'Arrière, voir _nodeImgRect dans routing.js) : les
  // ports Arrière sont donc positionnés par rapport à LEUR rect, jamais celui
  // de l'Avant, même si le ratio des deux images diffère.
  const _rearActive = _previewView[sid] === 'rear' && !!s.imgRear;
  const _dispImg   = _rearActive ? s.imgRear : s.img;
  const _dispPorts = _rearActive ? (s.portsRear || []) : (s.ports || []);

  // Un câble peut être ancré sur un port Arrière (portsRear) alors que l'Avant
  // est la vue affichée — ex. après un échange ⇄ (nodes.js/library.js). Ses
  // dimensions naturelles doivent donc être connues MÊME si personne n'a jamais
  // cliqué ↻ pour prévisualiser l'Arrière cette session, sinon _nodeImgRect(s,
  // 'rear') retombe sur un calcul sans letterboxing tant que ce n'est pas fait —
  // câble mal positionné/masque d'occlusion faux. Mesure indépendante de la vue
  // cosmétique active (voir _ensureRearDims plus bas).
  _ensureRearDims(sid, s);

  // Supprimer ancien DOM si existe
  document.getElementById(`n-${sid}`)?.remove();
  document.getElementById(`nl-${sid}`)?.remove();

  // ── Nœud ────────────────────────────────────────────────
  const el = document.createElement('div');
  el.className = 'node';
  el.id = `n-${sid}`;
  el.style.cssText = `left:${s.x}px;top:${s.y}px;width:${s.w}px;height:${s.h + 40}px;z-index:${s.zindex || 1}`;

  const box = document.createElement('div');
  box.className = 'node-box';
  box.style.cssText = `width:${s.w}px;height:${s.h}px`;

  const catbar = document.createElement('div');
  catbar.className = 'node-catbar';
  catbar.style.background = cat.color;

  const imgWrap = document.createElement('div');
  imgWrap.className = 'node-img-wrap';
  imgWrap.style.cssText = `width:${s.w}px;height:${s.h - 3}px`;

  if (_dispImg) {
    const img = document.createElement('img');
    img.src = _dispImg;
    img.alt = s.name;
    img.draggable = false;
    imgWrap.appendChild(img);
  } else {
    // Placeholder visuel quand pas d'image
    imgWrap.style.background = cat.color + '22';
    imgWrap.style.display = 'flex';
    imgWrap.style.alignItems = 'center';
    imgWrap.style.justifyContent = 'center';
    imgWrap.style.flexDirection = 'column';
    imgWrap.style.gap = '6px';

    const icon = document.createElement('div');
    icon.style.cssText = `
      width:48px;height:48px;border-radius:8px;
      background:${cat.color}33;border:1px solid ${cat.color}55;
      display:flex;align-items:center;justify-content:center;
      font-size:22px;
    `;
    icon.textContent = _catIcon(s.cat);

    const nameEl = document.createElement('div');
    nameEl.style.cssText = `
      font-family:var(--mono);font-size:11px;color:${cat.color};
      letter-spacing:1px;text-align:center;padding:0 8px;max-width:${s.w - 16}px;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    `;
    nameEl.textContent = s.short || s.name;

    imgWrap.appendChild(icon);
    imgWrap.appendChild(nameEl);
  }

  box.appendChild(catbar);
  box.appendChild(imgWrap);

  // ── Dots de port ──────────────────────────────────────────
  // Couche dédiée, SŒUR de .node-box et non enfant : .node-box rogne son contenu
  // (overflow:hidden, pour les coins arrondis de l'image), ce qui coupait la moitié
  // d'un point de connexion posé au bord de l'image. Placée aux mêmes coordonnées,
  // elle suit le léger soulèvement au survol via sa propre règle CSS (.node-ports).
  const portsLayer = document.createElement('div');
  portsLayer.className = 'node-ports';
  portsLayer.style.cssText = `position:absolute;left:0;top:0;width:${s.w}px;height:${s.h}px;pointer-events:none`;

  // Placement différé après chargement image (pour connaître les dimensions naturelles)
  function _placeDots() {
    portsLayer.querySelectorAll('.port-dot-node').forEach(d => d.remove());
    if (!_dispPorts || !_dispPorts.length) return;
    const r = _nodeImgRect(s, _rearActive ? 'rear' : 'front');
    // Référence pour la taille des points : le côté rendu le plus petit de l'image,
    // pas une constante — sinon un point de 30px reste minuscule sur un appareil
    // agrandi (bug relevé le 2026-09-11) alors que sa POSITION, elle, suit déjà r.rW/rH.
    const refDim = r ? Math.min(r.rW, r.rH) : Math.min(s.w, s.h);
    _dispPorts.forEach(p => {
      const _orphan  = !isKnownCableType(p.type);
      const _wireless = !_orphan && WIRELESS_TYPES.has(p.type);
      const color = _orphan ? '#1e2535' : (getCableMeta(p.type).color || '#00d4ff');
      const dot = document.createElement('div');
      dot.className = 'port-dot-node' + (_wireless ? ' port-wireless' : '');
      dot.dataset.portId   = p.id;
      dot.dataset.portType = p.type;
      dot.dataset.nodeId   = sid;
      dot.dataset.dual     = p.dual ? 'true' : '';
      const lx = r ? r.offX + p.nx * r.rW : p.nx * s.w;
      const ly = r ? r.offY + p.ny * r.rH : p.ny * s.h + 3;
      // Pas d'anneau IN/OUT sur un port sans fil pour l'instant : sa logique de
      // connexion (double occupant, IN/OUT) n'est pas encore branchée (tâche séparée).
      const dualRing = (_orphan || _wireless) ? 'box-shadow:none;' : (p.dual ? `box-shadow:0 0 0 2px #0a0f1e,0 0 0 4px ${color};` : `box-shadow:0 0 6px ${color}99;`);
      // Taille à l'échelle de l'appareil (refDim, voir plus haut), jamais fixe — volontairement
      // sans minimum (un plancher casserait la proportion sur un appareil très réduit,
      // voir régression relevée le 2026-09-11), juste un plafond pour un très grand appareil.
      // Zone cliquable un peu plus large que les ports physiques : un port sans fil est
      // le SEUL élément interactif de sa connexion (pas de tracé de câble en secours à
      // cliquer à côté), une cible plus généreuse est donc justifiée ici (+27% env.).
      // Taille : variable CSS réécrite à chaque zoom (voir portDotSizes ci-dessus).
      // L'ancienne formule reste derrière la sécurité, pour comparaison.
      const _oldSize = Math.min(60, refDim * (_wireless ? 0.114 : 0.09));
      const dotSize  = window._xPortDotFixedScreen === false
        ? `${_oldSize}px`
        : `var(${_wireless ? '--z-port-dot-w' : '--z-port-dot'})`;
      dot.style.cssText = `
        position:absolute;
        left:${lx}px;
        top:${ly}px;
        width:${dotSize};height:${dotSize};
        background:${color};border:${_orphan ? '1px dashed #555' : 'none'};border-radius:50%;
        transform:translate(-50%,-50%);
        display:flex;align-items:center;justify-content:center;
        ${dualRing}
        z-index:5;
      `;
      if (_orphan) {
        dot.innerHTML = `<span style="font-size:13px;color:#555;line-height:1">✕</span>`;
      } else if (_wireless) {
        dot.innerHTML = _wirelessIconHTML(p.type);
      }
      // Nom du type de port : frère du point dans portsLayer, PAS enfant du point —
      // .port-dot-node.cab-clickable/cab-free applique clip-path:circle() (cercle de
      // hit-test précis, voir main.css) qui rogne aussi tout contenu enfant, donc un
      // nom imbriqué dans le point est invisible même avec display:block. Toujours
      // créé ; sa visibilité réelle est pilotée en pur CSS (main.css) via
      // :has(+ .port-dot-node.cab-free:hover) — ne s'affiche qu'au survol du point
      // LUI-MÊME, jamais sur un port utilisé/incompatible (pointer-events:none dessus,
      // le survol ne peut même pas s'y déclencher). Taille fixe à l'écran quel que
      // soit le zoom (var(--z-port-lbl), posée dans canvas.js::applyT, même principe
      // que --z-border). Positionné AU-DESSUS du point (translateY(-100%) : le `top`
      // calculé ancre le bas du bloc de texte, pas son haut), dégagé de sa taille
      // AGRANDIE au survol (PORT_LBL_HOVER_SCALE, voir le haut du fichier) — pas
      // dotSize seul, sous peine de chevauchement une fois le point réellement
      // grossi par :hover. Décalage plus grand pour un port double, pour dégager
      // aussi son anneau (box-shadow, hors gabarit du point).
      if (!_orphan) {
        const lbl = document.createElement('div');
        lbl.className = 'port-dot-type-lbl';
        lbl.dataset.portId = p.id;
        lbl.textContent = tType(p.type);
        lbl.style.cssText = `
          position:absolute;left:${lx}px;top:calc(${ly}px - ${dotSize} * ${PORT_LBL_HOVER_SCALE / 2} - ${p.dual ? 8 : 3}px);
          transform:translate(-50%,-100%);
          white-space:nowrap;pointer-events:none;
          font-family:var(--mono);color:${color};
          z-index:6;
        `;
        portsLayer.appendChild(lbl);
      }
      // Lien sans fil : aucun tracé n'est dessiné, ce symbole est donc le seul point
      // d'entrée de la connexion. Il porte les deux gestes qu'un câble physique porte
      // sur son tracé — simple clic pour ouvrir le panneau, double-clic pour animer
      // les routes qui l'utilisent. D'où le délai sur le simple clic, repris du câble :
      // sans lui, le panneau s'ouvrirait avant que le second clic n'arrive.
      let _dotClickTimer = null;
      dot.addEventListener('click', e => {
        const debounce = _wireless && !_cableAddMode;
        if (!debounce) {
          if (typeof _onPortDotClick === 'function') _onPortDotClick(e, sid, p.id, p.type, p.nx, p.ny, !!p.dual);
          return;
        }
        e.stopPropagation();
        clearTimeout(_dotClickTimer);
        _dotClickTimer = setTimeout(() => {
          if (typeof _onPortDotClick === 'function') _onPortDotClick(e, sid, p.id, p.type, p.nx, p.ny, !!p.dual);
        }, 220);
      });
      if (_wireless) {
        dot.addEventListener('dblclick', e => {
          // stopPropagation sinon le double-clic remonte à l'appareil, dont le
          // gestionnaire ouvre la fenêtre de configuration d'image.
          e.stopPropagation();
          clearTimeout(_dotClickTimer);
          if (_cableAddMode) return;
          const cab = APP.cables.find(c =>
            (c.from === sid && c.from_port === p.id) ||
            (c.to   === sid && c.to_port   === p.id)
          );
          if (cab && typeof toggleRoutesUsingCable === 'function') toggleRoutesUsingCable(cab.id);
        });
      }
      portsLayer.appendChild(dot);
    });
  }

  if (_dispImg) {
    // L'image est déjà dans le DOM (imgWrap) — attendre qu'elle soit chargée
    const imgEl = imgWrap.querySelector('img');
    const _onLoad = () => {
      let _rearSizeChanged = false; // taille Arrière changée à l'affichage : bouts de câble déjà recalés par _applyRearSize
      if (_rearActive) {
        // Vue Arrière : mesurer SES propres dimensions naturelles (pour que ses
        // ports/câbles soient positionnés via _nodeImgRect(s,'rear'), jamais le
        // rect de l'Avant) — mais ne jamais toucher au cadre d'obstacle (bb) ni à
        // l'ajustement de hauteur, qui restent basés sur l'Avant (voir plus haut) :
        // la boîte du nœud ne doit pas changer de taille selon la vue affichée.
        if (window._xRearImageSync !== false) _rearSizeChanged = _applyRearSize(sid, s.imgRear, imgEl.naturalWidth, imgEl.naturalHeight);
        else { s._imgWRear = imgEl.naturalWidth; s._imgHRear = imgEl.naturalHeight; }
      } else {
      s._imgW = imgEl.naturalWidth;
      s._imgH = imgEl.naturalHeight;
      _ensureFrontAlphaPixels(sid, s, imgEl);

      // Migration ponctuelle du cadre de contenu (bb) : historiquement il valait une
      // constante (PNG entier, ou 2 % de marge) au lieu du contour réellement opaque,
      // ce qui faisait contourner les câbles au ras du cadre d'image plutôt qu'au ras
      // de l'appareil visible. Recalculé ici une seule fois par appareil, au chargement
      // de son image (déjà décodée à cet instant, donc quasi gratuit), puis marqué
      // bbAuto pour ne plus jamais y revenir — y compris après enregistrement, la
      // propriété étant sauvegardée dans le .wires. Volontairement SANS setDirty :
      // ouvrir un projet ne doit pas le marquer comme modifié.
      if (!s.bbAuto) {
        s.bb = s.shape
          ? { left: 0, right: 1, top: 0, bottom: 1 } // une forme remplit son PNG
          : (typeof _alphaBBFromImage === 'function' ? _alphaBBFromImage(imgEl) : s.bb);
        s.bbAuto = true;
      }
      // Auto-fit height to image aspect ratio unless user manually resized
      if (!s.hManual && s._imgW && s._imgH) {
        const naturalH = Math.max(MIN_H, Math.round(s.w * s._imgH / s._imgW));
        if (naturalH !== s.h) {
          s.h = naturalH;
          s.cy = s.y + s.h / 2;
          el.style.height         = (s.h + 40) + 'px';
          box.style.height        = s.h + 'px';
          imgWrap.style.height    = (s.h - 3) + 'px';
          portsLayer.style.height = s.h + 'px';
          _updateLblPos(sid);
          // Ports have moved → invalidate all overrides for connected cables
          for (const c of (APP?.cables || [])) {
            if (c.from === sid || c.to === sid) delete cableOverrides[c.id];
          }
          setDirty();
        }
      }
      } // fin if/else _rearActive
      _placeDots();
      // Points créés seulement maintenant (image chargée après coup) : réappliquer leur état cliquable en mode câble.
      if (typeof _cableAddMode !== 'undefined' && _cableAddMode && typeof _refreshPortDotState === 'function') _refreshPortDotState();
      // Recalculate cables whose endpoints have drifted from the now-correct port positions.
      // Delete the whole override (not just snap endpoints) so BFS recomputes a clean path.
      // Le côté (Avant/Arrière) de CHAQUE câble est résolu individuellement via
      // _findPortById (cables.js) — ce nœud peut avoir des câbles sur les deux
      // vues à la fois, indépendamment de laquelle est actuellement affichée.
      let needRedraw = _rearSizeChanged; // bouts déjà recalés par _applyRearSize : il reste à redessiner
      for (const c of (APP?.cables || [])) {
        if (c.from !== sid && c.to !== sid) continue;
        // Câble dont une extrémité est en cours de glissement (voir _endDragInProgress, cables.js) : jamais
        // recalculé ici. Son bout est volontairement sous le curseur, loin de son port, et passait pour décalé :
        // basculer l'appareil Avant/Arrière au survol du ↻ le rebranchait un instant sur son ancien port (2026-09-15).
        // Sécurité anti-régression : window._xDragKeepHeldCable = false → recalculé comme avant.
        if (window._xDragKeepHeldCable !== false && typeof _endDragInProgress !== 'undefined'
            && _endDragInProgress && _endDragInProgress.cid === c.id) continue;
        const pts = cableOverrides[c.id];
        if (!pts || pts.length < 2) {
          if ((c.from === sid && c.from_nx != null) || (c.to === sid && c.to_nx != null)) {
            delete cableOverrides[c.id];
            needRedraw = true;
          }
          continue;
        }
        let stale = false;
        if (c.from === sid && c.from_nx != null) {
          const fromSide = c.from_port && typeof _findPortById === 'function' ? _findPortById(s, c.from_port)?.side : undefined;
          const ep = edgePtFixed(s, c.from_nx, c.from_ny, fromSide);
          if (Math.abs(pts[0][0] - ep[0]) > 1 || Math.abs(pts[0][1] - ep[1]) > 1) stale = true;
        }
        if (c.to === sid && c.to_nx != null) {
          const toSide = c.to_port && typeof _findPortById === 'function' ? _findPortById(s, c.to_port)?.side : undefined;
          const ep = edgePtFixed(s, c.to_nx, c.to_ny, toSide);
          const last = pts.length - 1;
          if (Math.abs(pts[last][0] - ep[0]) > 1 || Math.abs(pts[last][1] - ep[1]) > 1) stale = true;
        }
        if (stale) { delete cableOverrides[c.id]; needRedraw = true; }
      }
      if (needRedraw && typeof renderCables === 'function') renderCables();
    };
    if (imgEl && imgEl.complete && imgEl.naturalWidth) {
      _onLoad();
    } else if (imgEl) {
      imgEl.addEventListener('load', _onLoad, { once: true });
      // Fallback si déjà chargée avant le listener
      if (imgEl.complete && imgEl.naturalWidth) _onLoad();
    }
  } else {
    _placeDots(); // pas d'image → fallback immédiat
    if (typeof _cableAddMode !== 'undefined' && _cableAddMode && typeof _refreshPortDotState === 'function') _refreshPortDotState();
  }

  // Bouton de bascule Avant/Arrière — seulement si une Arrière est configurée.
  // Sœur de box (pas enfant) comme portsLayer : .node-box coupe son contenu
  // au bord (overflow:hidden pour les coins arrondis). Toujours dans le DOM ;
  // sa visibilité (nœud sélectionné) est gérée en CSS via .node.sel.
  if (s.imgRear) {
    const flipBtn = document.createElement('button');
    flipBtn.className = 'node-flip-btn';
    flipBtn.title = typeof t === 'function' ? t('toggle_view') : 'Toggle front/rear';
    flipBtn.textContent = '↻';
    flipBtn.addEventListener('pointerdown', e => e.stopPropagation());
    flipBtn.addEventListener('click', e => { e.stopPropagation(); toggleNodeActiveView(sid); });
    el.appendChild(flipBtn);
  }

  el.appendChild(box);
  el.appendChild(portsLayer); // après box : les ports passent au-dessus de l'image

  document.getElementById('nodes-layer').appendChild(el);

  // ── Label (dans node-labels-layer) ──────────────────────
  const lbl = document.createElement('div');
  lbl.className = 'node-lbl';
  lbl.id = `nl-${sid}`;
  lbl.contentEditable = 'true';
  lbl.spellcheck = false;
  lbl.textContent = s.short || s.name;
  lbl.style.color = cat.color;
  lbl.style.fontSize = (s.lblSize || 48) + 'px';
  _applyNodeIpLine(sid, lbl);
  _updateLblPos(sid, lbl);

  let _lblOld = lbl.textContent;
  lbl.addEventListener('focus', () => {
    _lblOld = lbl.textContent.trim();
    window._activeNodeLbl = lbl;
  });
  lbl.addEventListener('input', () => {
    s.short = lbl.textContent.trim();
    s._shortEd = true;
    setDirty();
  });
  lbl.addEventListener('blur', () => {
    if (window._activeNodeLbl === lbl) window._activeNodeLbl = null;
    window.getSelection()?.removeAllRanges();
    const nv = lbl.textContent.trim();
    if (nv !== _lblOld) wLog('NODE_RENAME', { id: sid, from: _lblOld, to: nv });
    _lblOld = nv;
  });
  lbl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); lbl.blur(); }
  });

  // ── Resize handle ────────────────────────────────────────
  const nlRh = document.createElement('div');
  nlRh.className = 'node-lbl-rh';
  lbl.appendChild(nlRh);
  let _lblResz = null;
  nlRh.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    pushUndo();
    _lblResz = { startX: e.clientX, startY: e.clientY, startSize: s.lblSize || 48 };
    nlRh.setPointerCapture(e.pointerId);
  });
  nlRh.addEventListener('pointermove', e => {
    if (!_lblResz) return;
    const delta = (_lblResz.startX - e.clientX + _lblResz.startY - e.clientY) / APP.view.zoom;
    const sz = Math.max(8, Math.min(200, Math.round(_lblResz.startSize + delta * 0.5)));
    s.lblSize = sz;
    lbl.style.fontSize = sz + 'px';
  });
  nlRh.addEventListener('pointerup', () => {
    if (_lblResz) { setDirty(); _lblResz = null; }
  });

  // ── Exit édition au clic hors du label (une seule fois globale) ──
  if (!window._nodeLblBlurInit) {
    window._nodeLblBlurInit = true;
    document.addEventListener('pointerdown', e => {
      const lbl = window._activeNodeLbl;
      if (lbl && !lbl.contains(e.target)) lbl.blur();
    }, true);
  }

  document.getElementById('node-labels-layer').appendChild(lbl);

  // Sync classes label ↔ nœud via MutationObserver
  const obs = new MutationObserver(() => {
    const node = document.getElementById(`n-${sid}`);
    if (!node || !lbl) return;
    ['sel','lit','dim','route-dim'].forEach(cls => {
      lbl.classList.toggle(cls, node.classList.contains(cls));
    });
    // Le nom garde la couleur de sa catégorie, sélectionné ou non : la sélection se voit au cadre de l'appareil.
    // window._xLblWhiteOnSel = true en console : ancien comportement (nom en blanc tant que l'appareil est sélectionné).
    if (window._xLblWhiteOnSel === true && node.classList.contains('sel')) lbl.style.color = '#fff';
    else lbl.style.color = getCat(APP.nodes[sid]?.cat).color;
  });
  obs.observe(el, { attributes: true, attributeFilter: ['class'] });

  // ── Drag nœud ────────────────────────────────────────────
  setupNodeDrag(el, sid);

  // ── Click : sélection (débounce pour ne pas déclencher sur dblclick) ──
  let _clickTimer = null;
  el.addEventListener('click', e => {
    // Ignore si c'était un drag
    if (APP.drag.moved) { APP.drag.moved = false; e.stopPropagation(); return; }
    if (e.target.classList.contains('port-dot-node') && (_cableAddMode || e.target.classList.contains('port-wireless'))) return;
    e.stopPropagation();
    if (e.shiftKey) {
      pushUndo();
      const maxZ = Math.max(1, ...Object.values(APP.nodes).map(n => n.zindex || 1));
      APP.nodes[sid].zindex = maxZ + 1;
      el.style.zIndex = maxZ + 1;
      wLog('NODE_FRONT', { id: sid, name: APP.nodes[sid]?.name });
      setDirty();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Click : toggle dans la multi-sélection
      // Si un nœud unique était sélectionné, le faire entrer dans selMulti d'abord
      if (APP.sel && !APP.selMulti.size) {
        const prev = APP.sel;
        APP.sel = null;
        exitResizeMode();
        closePanel();
        document.getElementById(`n-${prev}`)?.classList.remove('sel', 'lit', 'dim', 'route-dim');
        document.getElementById(`nl-${prev}`)?.classList.remove('dim', 'route-dim');
        document.getElementById(`n-${prev}`)?.classList.add('sel-multi');
        APP.selMulti.add(prev);
        // Restaurer opacité des autres nœuds (et de leurs étiquettes nl-*)
        for (const nid of Object.keys(APP.nodes)) {
          if (nid !== prev) {
            document.getElementById(`n-${nid}`)?.classList.remove('sel', 'lit', 'dim', 'route-dim');
            document.getElementById(`nl-${nid}`)?.classList.remove('dim', 'route-dim');
          }
        }
        document.querySelectorAll('#cables-svg .cable-visual').forEach(p => {
          delete p.dataset.selected; p.removeAttribute('filter');
          p.setAttribute('stroke-width', '3.5'); p.setAttribute('opacity', '0.85');
        });
        // Remet TOUS les câbles à l'opacité de repos ci-dessus, sans jamais consulter
        // le filtre catégorie/câble/zone actif — même défaut que _applyCanvasDim(∅,∅,∅)
        // (routes.js), corrigé de la même façon : réappliquer le filtre juste après.
        if (typeof applyCanvasFilters === 'function') applyCanvasFilters();
      }
      if (APP.selMulti.has(sid)) {
        APP.selMulti.delete(sid);
        el.classList.remove('sel-multi');
      } else {
        APP.selMulti.add(sid);
        el.classList.add('sel-multi');
      }
      if (APP.selMulti.size > 0) {
        if (typeof openMultiPanel === 'function') openMultiPanel();
      } else {
        closePanel();
      }
      return;
    }
    // Clic sur un nœud déjà dans selMulti → le retirer (comportement Explorateur Windows)
    if (APP.selMulti && APP.selMulti.has(sid)) {
      APP.selMulti.delete(sid);
      el.classList.remove('sel-multi');
      if (APP.selMulti.size > 1) {
        openMultiPanel();
      } else if (APP.selMulti.size === 1) {
        const remaining = [...APP.selMulti][0];
        clearSelMulti();
        selectNode(remaining);
      } else {
        closePanel();
      }
      return;
    }
    clearSelMulti();
    clearTimeout(_clickTimer);
    _clickTimer = setTimeout(() => { selectNode(sid); }, 220);
  });

  // ── Double-clic : éditer les ports (Image Setup) ────────
  el.addEventListener('dblclick', e => {
    e.stopPropagation();
    clearTimeout(_clickTimer); // annule la sélection du premier click
    if (typeof openNodePortsEditor === 'function') openNodePortsEditor(sid);
  });
}

function _catIcon(cat) {
  const icons = {
    switcher: '🎬', capture: '📹', conversion: '🔄',
    video: '📺', audio: '🔊', network: '🌐',
    rack: '🗄️', external: '📡', usb: '🔌',
    power: '⚡', storage: '💾', camera: '📷',
    display: '🖥️', computer: '💻',
    // Même symbole que le repli ci-dessous, et c'est voulu : « Non classé »
    // EST le cas « catégorie inconnue », rendu explicite et cochable dans les
    // filtres au lieu d'être un état fantôme.
    unsorted: '📦',
  };
  return icons[cat] || '📦';
}

// Ligne « adresse IP » sous le nom : deuxième ligne de l'étiquette via ::after (main.css), donc jamais
// dans le texte éditable du nom. Texte, visibilité, taille et couleur réglés dans le panneau de droite (panel.js).
function _applyNodeIpLine(sid, lblEl) {
  const s   = APP.nodes[sid];
  const lbl = lblEl || document.getElementById(`nl-${sid}`);
  if (!s || !lbl) return;
  const ip = _nodeIpText(s);
  if (!ip) { delete lbl.dataset.ip; return; }
  lbl.dataset.ip = ip;
  lbl.style.setProperty('--ip-fs', (s.ipSize || _defaultIpSize(s)) + 'px');
  lbl.style.setProperty('--ip-color', s.ipColor || _defaultIpColor());
}

// Taille de départ de l'adresse IP : dernière taille choisie dans le panneau (gardée en mémoire,
// y compris après redémarrage), sinon 2/3 du nom.
function _defaultIpSize(node) {
  const v = parseInt(localStorage.getItem('wires-ip-size'), 10);
  return v >= 6 && v <= 400 ? v : Math.round(((node && node.lblSize) || 48) * 2 / 3);
}

// Couleur de départ de l'adresse IP : dernière couleur choisie dans le panneau (même mémoire), sinon blanc.
function _defaultIpColor() {
  const c = localStorage.getItem('wires-ip-color');
  return /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#ffffff';
}

// Adresse IP à afficher (canevas et exports) : seulement si complète (4 nombres) et « Visible » cochée, sinon ''.
function _nodeIpText(node) {
  const ip = ((node && node.ip) || '').trim();
  return node && node.ipVisible !== false && /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) ? ip : '';
}

// Position du nom autour de l'appareil : 'bottom' (défaut historique), 'top', 'left',
// 'right'. Choisie appareil par appareil dans le panneau de droite, jamais mémorisée
// comme valeur de départ des suivants (décision de l'utilisateur, 2026-09-19).
// L'adresse IP est la deuxième ligne de cette même étiquette : elle suit sans rien faire.
const LBL_GAP = 14;   // écart entre l'appareil et son nom, identique aux 4 positions

function nodeLblPos(s) {
  const p = s && s.lblPos;
  return (p === 'top' || p === 'left' || p === 'right') ? p : 'bottom';
}

function _updateLblPos(sid, lblEl) {
  const s = APP.nodes[sid];
  if (!s) return;
  const lbl = lblEl || document.getElementById(`nl-${sid}`);
  if (!lbl) return;
  lbl.style.position = 'absolute';

  switch (nodeLblPos(s)) {
    case 'top':
      // Ancré par le BAS du texte, pour que l'écart reste le même quel que soit le
      // nombre de lignes (nom seul ou nom + adresse IP).
      lbl.style.left      = (s.x + s.w / 2) + 'px';
      lbl.style.top       = (s.y - LBL_GAP) + 'px';
      lbl.style.transform = 'translate(-50%, -100%)';
      lbl.style.textAlign = 'center';
      break;
    case 'left':
      lbl.style.left      = (s.x - LBL_GAP) + 'px';
      lbl.style.top       = (s.y + s.h / 2) + 'px';
      lbl.style.transform = 'translate(-100%, -50%)';
      lbl.style.textAlign = 'right';
      break;
    case 'right':
      lbl.style.left      = (s.x + s.w + LBL_GAP) + 'px';
      lbl.style.top       = (s.y + s.h / 2) + 'px';
      lbl.style.transform = 'translateY(-50%)';
      lbl.style.textAlign = 'left';
      break;
    default:
      lbl.style.left      = (s.x + s.w / 2) + 'px';
      lbl.style.top       = (s.y + s.h + LBL_GAP) + 'px';
      lbl.style.transform = 'translateX(-50%)';
      lbl.style.textAlign = 'center';
  }
}

// ── Drag nœud ────────────────────────────────────────────────
function setupNodeDrag(el, sid) {
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    if (APP.drag.active) return;
    // Ne pas démarrer le drag si on clique sur un label, une poignée resize,
    // ou un dot de port en mode ajout de câble
    if (e.target.classList.contains('node-lbl') ||
        e.target.classList.contains('rh') ||
        e.target.isContentEditable) return;
    if (e.target.classList.contains('port-dot-node') && (_cableAddMode || e.target.classList.contains('port-wireless'))) return;
    // Une route/chemin/segment est en cours d'animation (voir _isDimmingActive,
    // routes.js) : déplacer un appareil est verrouillé, y compris s'il n'est pas
    // concerné par la route active — le clic-glisser panoramique le canevas à la
    // place (comportement attendu par défaut sur un clic hors appareil).
    if (typeof _isDimmingActive === 'function' && _isDimmingActive()) {
      e.stopPropagation();
      e.preventDefault();
      if (typeof startCanvasPanFromEvent === 'function') startCanvasPanFromEvent(e);
      return;
    }

    e.stopPropagation();
    e.preventDefault();

    const s = APP.nodes[sid];
    APP.drag.active = true;
    APP.drag.type   = 'node';
    APP.drag.id     = sid;
    APP.drag.moved  = false;
    APP.drag.ox     = screenToCanvas(e.clientX, e.clientY).x - s.x;
    APP.drag.oy     = screenToCanvas(e.clientX, e.clientY).y - s.y;

    // Snapshot des overrides câbles pour patcher depuis l'état initial à chaque frame —
    // TOUS les câbles, pas seulement ceux connectés à ce nœud : un câble tiers a lui
    // aussi besoin de son tracé d'origine pour être dévié en direct s'il se retrouve
    // chevauché (voir redrawCablesMovingNode), et pour y revenir si l'appareil s'éloigne.
    APP.drag.cableSnapshot = {};
    for (const c of APP.cables) {
      if (cableOverrides[c.id]) {
        APP.drag.cableSnapshot[c.id] = cableOverrides[c.id].map(p => [...p]);
      }
    }
    APP.drag._bypassedCables = new Set();

    // Multi-drag : enregistrer la position initiale de chaque nœud sélectionné
    APP.drag._multiSnap = null;
    if (APP.selMulti && APP.selMulti.size > 1 && APP.selMulti.has(sid)) {
      APP.drag._multiSnap = {};
      for (const mid of APP.selMulti) {
        const ms = APP.nodes[mid];
        APP.drag._multiSnap[mid] = { x: ms.x, y: ms.y };
      }
    }

    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener('pointermove', e => {
    if (!APP.drag.active || APP.drag.type !== 'node' || APP.drag.id !== sid) return;
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const s = APP.nodes[sid];

    if (!APP.drag.moved) {
      pushUndo();
      APP.drag.moved = true;
    }

    s.x = Math.round(x - APP.drag.ox);
    s.y = Math.round(y - APP.drag.oy);
    s.cx = s.x + s.w / 2;
    s.cy = s.y + s.h / 2;

    el.style.left = s.x + 'px';
    el.style.top  = s.y + 'px';
    _updateLblPos(sid);

    // Multi-drag : déplacer tous les autres nœuds sélectionnés du même delta
    if (APP.drag._multiSnap) {
      const dx = s.x - APP.drag._multiSnap[sid].x;
      const dy = s.y - APP.drag._multiSnap[sid].y;
      for (const [mid, snap] of Object.entries(APP.drag._multiSnap)) {
        if (mid === sid) continue;
        const ms = APP.nodes[mid];
        ms.x = snap.x + dx; ms.y = snap.y + dy;
        ms.cx = ms.x + ms.w / 2; ms.cy = ms.y + ms.h / 2;
        const mel = document.getElementById(`n-${mid}`);
        if (mel) { mel.style.left = ms.x + 'px'; mel.style.top = ms.y + 'px'; }
        _updateLblPos(mid);
      }
    }

    // Redessiner câbles connectés en live (extrémités suivent le nœud).
    // Multi-déplacement : UN SEUL redessin pour tout le groupe. Appeler
    // redrawCablesMovingNode une fois par appareil déplacé faisait repartir chaque
    // appel de l'instantané de début de geste et défaisait le précédent — les câbles
    // se détachaient. Le redessin de groupe translate le tracé des câbles dont les
    // deux bouts bougent et ne reprend que l'extrémité concernée pour les autres.
    // Sécurité anti-régression : window._xGroupCablePaths = false → ancien
    // comportement (un appel par appareil, puis tracés effacés au relâchement).
    if (APP.drag._multiSnap && window._xGroupCablePaths !== false
        && typeof redrawCablesMovingGroup === 'function') {
      const gdx = s.x - APP.drag._multiSnap[sid].x;
      const gdy = s.y - APP.drag._multiSnap[sid].y;
      redrawCablesMovingGroup(Object.keys(APP.drag._multiSnap), gdx, gdy);
    } else {
      if (APP.drag._multiSnap) {
        for (const mid of Object.keys(APP.drag._multiSnap)) {
          if (mid !== sid) redrawCablesMovingNode(mid);
        }
      }
      redrawCablesMovingNode(sid);
    }
  });

  el.addEventListener('pointerup', e => {
    if (!APP.drag.active || APP.drag.id !== sid) return;
    APP.drag.active = false;
    APP.drag.type   = null;
    el.releasePointerCapture(e.pointerId);

    if (APP.drag.moved && APP.drag._multiSnap) {
      // Multi-move : les tracés sont CONSERVÉS. Ils étaient effacés ici, ce qui
      // faisait perdre tout cheminement fait à la main dès qu'on déplaçait une
      // sélection — corrigé le 2026-09-19 avec le redessin de groupe (cables.js).
      if (window._xGroupCablePaths !== false && typeof redrawCablesMovingGroup === 'function') {
        const _s = APP.nodes[sid];
        const gdx = _s ? _s.x - APP.drag._multiSnap[sid].x : 0;
        const gdy = _s ? _s.y - APP.drag._multiSnap[sid].y : 0;
        redrawCablesMovingGroup(Object.keys(APP.drag._multiSnap), gdx, gdy);
        for (const c of APP.cables) {
          const pts = cableOverrides[c.id];
          if (!pts || pts.length < 2) continue;
          cableOverrides[c.id] = simplify(normalizePts(pts));
        }
      } else {
        for (const mid of Object.keys(APP.drag._multiSnap)) {
          for (const c of APP.cables) {
            if (c.from === mid || c.to === mid) delete cableOverrides[c.id];
          }
        }
      }
      APP.drag._multiSnap = null;
      renderCables();
      setDirty();
      wLog('MULTI_MOVE', { count: APP.selMulti.size });
    } else if (APP.drag.moved) {
      // Le tracé lui-même (ancrage + contournement d'un appareil tiers éventuel) est
      // déjà correct à ce stade — calculé en direct à chaque frame par
      // redrawCablesMovingNode, y compris pour le câble connecté au nœud déplacé —
      // donc jamais recalculé ici. On se contente de nettoyer : normalizePts insère le
      // bon coin, simplify supprime les points redondants.
      // Avant ce correctif, ce bloc redérivait l'ancre/le stub depuis zéro avec sa
      // PROPRE logique (touchant elle aussi un 3e point pour éviter une diagonale,
      // comme l'ancienne _patchCablesForPortMove) — un second calcul, différent et
      // moins bon que celui du glissé live, qui écrasait silencieusement le bon tracé
      // sur CHAQUE relâchement, même après un déplacement minime ou un simple clic mal
      // détecté comme "moved" (régression relevée le 2026-09-11).
      for (const c of APP.cables) {
        const pts = cableOverrides[c.id];
        if (!pts || pts.length < 2) continue;
        cableOverrides[c.id] = simplify(normalizePts(pts));
      }
      APP.drag.cableSnapshot = {};
      renderCables();
      setDirty();
      const _ms = APP.nodes[sid];
      wLog('NODE_MOVE', { id: sid, x: _ms.x, y: _ms.y });
    }
    APP.drag._multiSnap = null;
    APP.drag._bypassedCables = null;
    // Reset moved au prochain pointerdown (pas de setTimeout — évite le faux click)
  });
}

// ── Resize mode ───────────────────────────────────────────────
// Coins (nw/ne/sw/se) = proportionnel | Côtés (n/s/e/w) = libre
function enterResizeMode(sid) {
  if (resizeNodeId && resizeNodeId !== sid) exitResizeMode();
  resizeNodeId = sid;

  const el = document.getElementById(`n-${sid}`);
  if (!el) return;

  el.querySelectorAll('.rh').forEach(h => h.remove());

  const handles = ['nw'];
  handles.forEach(dir => {
    const h = document.createElement('div');
    h.className = `rh rh-${dir}`;
    h.dataset.dir = dir;
    el.appendChild(h);
    setupResizeHandle(h, sid, dir);
  });
}

function exitResizeMode() {
  if (!resizeNodeId) return;
  const el = document.getElementById(`n-${resizeNodeId}`);
  el?.querySelectorAll('.rh').forEach(h => h.remove());
  resizeNodeId = null;
}

function setupResizeHandle(handle, sid, dir) {
  let startX, startY, startState, startCableSnapshot;
  const isCorner = dir.length === 2; // nw/ne/sw/se = proportionnel

  handle.addEventListener('pointerdown', e => {
    e.stopPropagation();
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    const s = APP.nodes[sid];
    startState = { x: s.x, y: s.y, w: s.w, h: s.h, ratio: s.w / s.h };
    startX = e.clientX;
    startY = e.clientY;
    // Figé une seule fois ici, jamais remis à jour pendant le glissé — voir le
    // commentaire de _patchCablesForResize (cables.js) pour le pourquoi.
    startCableSnapshot = {};
    for (const c of APP.cables) {
      if (c.from === sid || c.to === sid) {
        const pts = cableOverrides[c.id];
        if (pts) startCableSnapshot[c.id] = pts.map(p => [...p]);
      }
    }
    pushUndo();
  });

  handle.addEventListener('pointermove', e => {
    // Sans cette garde, un simple survol de la poignée (sans clic) déclenchait ce
    // handler et réappliquait un redimensionnement basé sur startX/startY/startState
    // du DERNIER vrai glissé — l'appareil sautait donc à une taille périmée juste en
    // passant la souris dessus, aucun clic requis (bug relevé le 2026-09-11).
    if (!handle.hasPointerCapture(e.pointerId)) return;
    const s = APP.nodes[sid];
    const dx = (e.clientX - startX) / APP.view.zoom;
    const dy = (e.clientY - startY) / APP.view.zoom;
    let { x, y, w, h, ratio } = startState;

    if (isCorner) {
      // Proportionnel : utiliser le delta dominant
      const d = (Math.abs(dx) + Math.abs(dy)) / 2;
      const sign = (dir.includes('e') ? dx : -dx) > 0 ? 1 : -1;
      const delta = sign * d;
      const nw = Math.max(MIN_W, w + delta);
      const nh = Math.max(MIN_H, nw / ratio);
      if (dir.includes('w')) x = x + w - nw;
      if (dir.includes('n')) y = y + h - nh;
      w = nw; h = nh;
    } else {
      // Libre : un seul axe
      if (dir === 'e') w = Math.max(MIN_W, w + dx);
      if (dir === 's') h = Math.max(MIN_H, h + dy);
      if (dir === 'w') { const nw = Math.max(MIN_W, w - dx); x = x + w - nw; w = nw; }
      if (dir === 'n') { const nh = Math.max(MIN_H, h - dy); y = y + h - nh; h = nh; }
    }

    s.x = Math.round(x); s.y = Math.round(y);
    s.w = Math.round(w); s.h = Math.round(h);
    // Un redimensionnement PROPORTIONNEL (coin) ne modifie jamais le ratio w/h — il
    // n'y a donc aucune raison de désactiver l'auto-ajustement à l'image (voir plus
    // bas, au chargement) à cause de lui. Verrouillé en "manuel" seulement par un
    // redimensionnement LIBRE (un seul côté), le seul qui puisse réellement introduire
    // un ratio différent de celui de l'image. Avant ce correctif, tout redimensionnement
    // — même un simple agrandissement proportionnel — bloquait pour toujours le
    // réajustement automatique lors d'un futur remplacement d'image, laissant la
    // hauteur figée sur l'ancien ratio (câble contourné trop large/haut, sélection
    // débordant visiblement de l'image réellement affichée).
    if (!isCorner) s.hManual = true;
    s.cx = s.x + s.w / 2; s.cy = s.y + s.h / 2;
    applyNodeResize(sid, startCableSnapshot);
  });

  handle.addEventListener('pointerup', e => {
    handle.releasePointerCapture(e.pointerId);
    // cableOverrides = {} effaçait TOUT le cache de tracé du projet (tous les câbles,
    // pas seulement ceux du nœud redimensionné), forçant un nouveau calcul BFS complet
    // qui pouvait reprendre une route différente pour des câbles sans aucun rapport —
    // voir _patchCablesForResize (cables.js), qui ne patche que l'ancre + le stub
    // adjacent des câbles réellement connectés à ce nœud. Même fonction (et même
    // snapshot figé au pointerdown) que pendant le glissé live juste au-dessus, pour
    // qu'il n'y ait aucun "saut" final vers un calcul différent.
    if (window._resizePatchCables && typeof _patchCablesForResize === 'function') {
      _patchCablesForResize(sid, startCableSnapshot);
    } else {
      cableOverrides = {};
    }
    renderCables();
    setDirty();
    const _rs = APP.nodes[sid];
    wLog('NODE_RESIZE', { id: sid, w: _rs.w, h: _rs.h });
  });
}

function applyNodeResize(sid, cableSnapshot) {
  const s = APP.nodes[sid];
  const el = document.getElementById(`n-${sid}`);
  if (!el) return;

  // Même vue effective que renderOneNode — les dots déjà dans le DOM à ce stade
  // sont ceux de la vue affichée au dernier rendu, il faut donc bouger les MÊMES.
  const _rearActive = _previewView[sid] === 'rear' && !!s.imgRear;
  const _dispPorts  = _rearActive ? (s.portsRear || []) : (s.ports || []);

  el.style.left   = s.x + 'px';
  el.style.top    = s.y + 'px';
  el.style.width  = s.w + 'px';
  el.style.height = (s.h + 40) + 'px';

  const box = el.querySelector('.node-box');
  if (box) { box.style.width = s.w + 'px'; box.style.height = s.h + 'px'; }

  const imgWrap = el.querySelector('.node-img-wrap');
  if (imgWrap) { imgWrap.style.width = s.w + 'px'; imgWrap.style.height = (s.h - 3) + 'px'; }

  const img = el.querySelector('.node-img-wrap img');
  if (img) { img.style.width = s.w + 'px'; img.style.height = (s.h - 3) + 'px'; }

  const portsLayer = el.querySelector('.node-ports');
  if (portsLayer) { portsLayer.style.width = s.w + 'px'; portsLayer.style.height = s.h + 'px'; }

  // Mettre à jour la position des port dots ET de leurs étiquettes de type — les deux
  // doivent utiliser la même formule que _placeDots() (offset image via _nodeImgRect,
  // pas juste nx*s.w) sous peine de décalage sur un appareil dont l'image ne remplit pas
  // exactement son cadre. Avant ce correctif, seul le dot était repositionné ici : les
  // étiquettes restaient figées à leur ancienne position pendant un redimensionnement
  // (bug relevé le 2026-09-11).
  if (_dispPorts && _dispPorts.length) {
    const r = _nodeImgRect(s, _rearActive ? 'rear' : 'front');
    const refDim = r ? Math.min(r.rW, r.rH) : Math.min(s.w, s.h);
    _dispPorts.forEach(p => {
      const lx = r ? r.offX + p.nx * r.rW : p.nx * s.w;
      const ly = r ? r.offY + p.ny * r.rH : p.ny * s.h + 3;
      // Recalculé à chaque resize, comme dans _placeDots() — sinon le dot garde sa taille
      // de création pendant tout le glissé (position déjà corrigée, mais pas la taille :
      // régression relevée le 2026-09-11, visible seulement après reload/undo).
      const _wl = WIRELESS_TYPES.has(p.type);
      const dotSize = window._xPortDotFixedScreen === false
        ? `${Math.min(60, refDim * (_wl ? 0.114 : 0.09))}px`
        : `var(${_wl ? '--z-port-dot-w' : '--z-port-dot'})`;
      const dot = el.querySelector(`.port-dot-node[data-port-id="${p.id}"]`);
      if (dot) {
        dot.style.left   = lx + 'px';
        dot.style.top    = ly + 'px';
        dot.style.width  = dotSize;
        dot.style.height = dotSize;
      }
      const lbl = el.querySelector(`.port-dot-type-lbl[data-port-id="${p.id}"]`);
      if (lbl) {
        lbl.style.left = lx + 'px';
        lbl.style.top  = `calc(${ly}px - ${dotSize} * ${PORT_LBL_HOVER_SCALE / 2} - ${p.dual ? 8 : 3}px)`;
      }
    });
  }

  _updateLblPos(sid);
  // Patch live des câbles pendant le glissé, pas seulement au relâchement (pointerup,
  // voir plus bas) — sinon le câble reste figé sur son ancien tracé tout le long du
  // redimensionnement puis saute d'un coup à la fin, incohérent avec les points/
  // étiquettes qui suivent déjà en direct (régression relevée le 2026-09-11).
  // _patchCablesForResize (pas _patchCablesForPortMove, réservée à des ajustements
  // ponctuels ailleurs) : ne bouge que le strict minimum de segments, toujours depuis
  // le snapshot figé au pointerdown, jamais depuis le résultat du tick précédent.
  if (window._resizePatchCables && typeof _patchCablesForResize === 'function') {
    _patchCablesForResize(sid, cableSnapshot);
  }
  redrawOnlyCables();
}

// ── Centrer la vue sur un nœud ────────────────────────────────
function centerOnNode(sid) {
  const s = APP.nodes[sid];
  if (!s) return;
  updateAreaRect();
  const aW = _areaRect?.width  || 800;
  const aH = _areaRect?.height || 600;
  const z  = APP.view.zoom;
  APP.view.panX = aW / 2 - (s.x + s.w / 2) * z;
  APP.view.panY = aH / 2 - (s.y + s.h / 2) * z;
  applyT();
}

// ── Trouver une position libre sur le canvas ──────────────────
function findFreePosition(w, h) {
  updateAreaRect();
  const aW = _areaRect?.width  || 800;
  const aH = _areaRect?.height || 600;
  // Position centrale visible
  const cx = (aW / 2 - APP.view.panX) / APP.view.zoom;
  const cy = (aH / 2 - APP.view.panY) / APP.view.zoom;

  const PAD = 20;
  const nodes = Object.values(APP.nodes);

  function overlaps(x, y) {
    return nodes.some(n =>
      x < n.x + n.w + PAD && x + w + PAD > n.x &&
      y < n.y + n.h + PAD && y + h + PAD > n.y
    );
  }

  // Spirale : centre, puis décale progressivement
  const step = Math.max(w, h) + PAD;
  for (let ring = 0; ring <= 10; ring++) {
    if (ring === 0) {
      const x = Math.round(cx - w / 2);
      const y = Math.round(cy - h / 2);
      if (!overlaps(x, y)) return { x, y };
    } else {
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dy = -ring; dy <= ring; dy++) {
          if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
          const x = Math.round(cx - w / 2 + dx * step);
          const y = Math.round(cy - h / 2 + dy * step);
          if (!overlaps(x, y)) return { x, y };
        }
      }
    }
  }
  return { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2) };
}

// ── Supprimer le nœud Internet (câbles supprimés, routes nettoyées) ──
function deleteInternetNode(id) {
  showConfirm(t('delete_internet_confirm'), { danger: true }).then(ok => {
    if (!ok) return;
    pushUndo();

    // Supprimer tous les câbles connectés + les retirer des routes
    const cids = APP.cables.filter(c => c.from === id || c.to === id).map(c => c.id);
    cids.forEach(cid => {
      if (typeof _removeCableFromAllRoutes === 'function') _removeCableFromAllRoutes(cid);
      APP.cables = APP.cables.filter(c => c.id !== cid);
      delete cableOverrides[cid];
    });

    delete APP.nodes[id];
    document.getElementById(`n-${id}`)?.remove();
    document.getElementById(`nl-${id}`)?.remove();

    rebuildCM();
    renderCables();
    if (typeof renderRoutesList === 'function') renderRoutesList();
    clearSel();
    closePanel();
    if (typeof refreshSidebar === 'function') refreshSidebar();
    setDirty();
  });
}

// ── Restaurer le nœud Internet — bas-gauche de la vue courante ──
function restoreInternetNode() {
  pushUndo();
  updateAreaRect();
  const aW = _areaRect?.width  || 800;
  const aH = _areaRect?.height || 600;
  const W = 180, H = 140, PAD = 20, PAD_X = 60;
  // Coin bas-gauche du viewport en coordonnées canevas (PAD_X > PAD pour dégager le sidebar)
  const startX = (PAD_X - APP.view.panX) / APP.view.zoom;
  const startY = ((aH - H - PAD) - APP.view.panY) / APP.view.zoom;
  const nodes = Object.values(APP.nodes);
  function overlaps(ox, oy) {
    return nodes.some(n =>
      ox < n.x + n.w + PAD && ox + W + PAD > n.x &&
      oy < n.y + n.h + PAD && oy + H + PAD > n.y
    );
  }
  let fx = Math.round(startX), fy = Math.round(startY);
  const step = Math.max(W, H) + PAD;
  outer: for (let ring = 0; ring <= 10; ring++) {
    if (ring === 0) {
      if (!overlaps(fx, fy)) break outer;
    } else {
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dy = -ring; dy <= ring; dy++) {
          if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
          const tx = Math.round(startX + dx * step);
          const ty = Math.round(startY + dy * step);
          if (!overlaps(tx, ty)) { fx = tx; fy = ty; break outer; }
        }
      }
    }
  }
  const id = uuid();
  APP.nodes[id] = {
    id,
    name: 'Internet', short: 'Internet',
    cat: 'internet', virtual: true,
    img: _INTERNET_IMG, img_original: _INTERNET_IMG,
    desc: '', desc_en: '',
    x: fx, y: fy, w: W, h: H,
    cx: fx + W / 2, cy: fy + H / 2,
    bb: { left: 0, right: 1, top: 0, bottom: 1 },
    stub: null,
    ports: [{ id: 'rj45', type: 'RJ45', nx: 0.5, ny: 0.02, dual: true }],
    zindex: 1,
  };
  CM[id] = [];
  renderNodes();
  rebuildCM();
  renderCables();
  if (typeof refreshSidebar === 'function') refreshSidebar();
  setDirty();
}

// ── Supprimer un nœud ─────────────────────────────────────────
function deleteNode(id) {
  pushUndo();
  wLog('NODE_DEL', { id, name: APP.nodes[id]?.name, cat: APP.nodes[id]?.cat });

  // Supprime entièrement (jamais orphelin) tout câble connecté à l'appareil supprimé
  // — physique ou sans fil, conforme à ce qu'annonce la confirmation ("... et tous
  // ses câbles ?", voir locales.js delete_node_confirm). Un câble peut être référencé
  // par une ou plusieurs routes (segments du tronc, d'un chemin/sous-chemin, ou de la
  // fin de route — potentiellement dans plusieurs routes à la fois via copier/coller
  // ou "+ Ajouter à une autre route") : ces références sont retirées AVANT la
  // suppression du câble lui-même, sinon la route garderait un segment pointant vers
  // un cableId inexistant (jamais rendu, ni nettoyé automatiquement).
  APP.cables
    .filter(c => c.from === id || c.to === id)
    .map(c => c.id)
    .forEach(cid => {
      if (typeof _purgeCableFromRoutes === 'function') _purgeCableFromRoutes(cid);
      deleteConn(cid, { skipRouteCheck: true, skipUndo: true });
    });

  delete APP.nodes[id];

  document.getElementById(`n-${id}`)?.remove();
  document.getElementById(`nl-${id}`)?.remove();

  rebuildCM();
  renderCables();
  clearSel();
  closePanel();
  if (typeof refreshSidebar === 'function') refreshSidebar();
  if (document.getElementById('routes-panel')?.classList.contains('open')) renderRoutesList();
  setDirty();
}
