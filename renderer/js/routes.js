/* ═══════════════════════════════════════════════════════════════
   routes.js — Signal routes : chains, paths/splits, animation flux
   chain.segments = [{cableId, dir, junction}]   ← tronc
   chain.paths    = [{id, title, segments, paths}]  ← branches
   Signal : source → tronc → paths → destinations (simultané)
═══════════════════════════════════════════════════════════════ */

const ROUTE_COLORS = ['#00d4ff','#ff6b35','#a8ff3e','#ff3ea8','#ffd93d','#c77dff','#06ffa5'];
const SIGNAL_TYPES_LIST = ['AUDIO','DATA','DMX','LAN','MIDI','NETWORK','POWER','USB','VIDEO','WIRELESS'];

const CABLE_TO_ROUTE_TYPE = {
  'HDMI': 'VIDEO',   'SDI': 'VIDEO',   'SDI-F': 'VIDEO',   'DisplayPort': 'VIDEO',
  'Audio': 'AUDIO',  'Dante': 'AUDIO', 'Jack 3.5': 'AUDIO', 'Jack 6.35': 'AUDIO',
  'MADI': 'AUDIO',   'RCA/Cinch': 'AUDIO',   'Speakon': 'AUDIO',  'XLR': 'AUDIO',
  'RJ45': 'NETWORK',
  'USB': 'USB',      'USB-A': 'USB',   'USB-C': 'USB',
  'USB-DC': 'POWER', 'DC': 'POWER',
  'Thunderbolt': 'DATA',
  'WiFi': 'WIRELESS', 'Bluetooth': 'WIRELESS', 'HF': 'WIRELESS',
};
function _routeTypeForCable(cableType) { return CABLE_TO_ROUTE_TYPE[cableType] || null; }

// Repli synchrone, avant même le chargement de user-cats.json (async, non attendu
// au démarrage — voir app.js::initApp) : sans ça, une route créée assez vite après
// le lancement de Wires ouvrait sa fenêtre d'édition avec des listes de couleurs
// et de types encore vides. _loadUserCats() (library.js) écrase ce repli dès que
// les vraies données persistées sont disponibles.
if (!USER_ROUTE_TYPES.length)  USER_ROUTE_TYPES.push(...SIGNAL_TYPES_LIST.map(id => ({ id })));
if (!USER_ROUTE_COLORS.length) USER_ROUTE_COLORS.push(...ROUTE_COLORS);

// Une route peut avoir plusieurs types de signal à la fois (chain.types, array).
// Repli sur l'ancien champ singulier chain.type pour les routes non encore rouvertes
// depuis l'ajout de la sélection multiple.
function _chainTypes(chain) {
  return chain.types || (chain.type ? [chain.type] : []);
}

function _routeTypeLabel(type) {
  return SIGNAL_TYPES_LIST.includes(type) ? (t('route_type_'+type) || type) : type;
}

// Un chip par type, affiché côte à côte sous le nom de la route (panneau Routes
// de signal live comme onglet Routes de la modale Exporter, voir exportmenu.js).
function _typeChipsHtml(chain) {
  const types = _chainTypes(chain);
  if (!types.length) return `<span class="route-type-chip">${t('route_type_undefined')}</span>`;
  return types.map(ty => `<span class="route-type-chip">${escapeHtml(_routeTypeLabel(ty))}</span>`).join(' ');
}

// Retire un type de route personnalisé de la liste persistante et de toutes les
// routes du projet courant qui l'utilisaient (jamais la route elle-même).
function _deleteUserRouteType(typeId) {
  pushUndo();
  USER_ROUTE_TYPES = USER_ROUTE_TYPES.filter(t => t.id !== typeId);
  saveUserCats();
  APP.chains.forEach(chain => {
    const types = _chainTypes(chain);
    if (types.includes(typeId)) chain.types = types.filter(t => t !== typeId);
  });
}

const _activeRoutes    = new Set();
const _expandedRoutes  = new Set();
const _expandedPaths   = new Set(); // chemins individuellement dépliés/repliés (même principe qu'une route)
let _maxRenderedPathDepth = 0; // profondeur de chemin la plus profonde affichée au dernier rendu — voir renderRoutesList (largeur du panneau)
const _routeClickTimers = {};
const _segClickTimers   = {}; // même principe que _routeClickTimers, par cableId
const _pathClickTimers  = {}; // même principe, par pathId
let _tracedPathId    = null; // chemin (ou sous-chemin) actuellement animé isolément — un seul à la fois
let _animPaused      = false; // Espace pendant une animation (route/chemin/segment) → gèle la progression
let _routeAnimRAF    = null;
let _highlightCid    = null;
let _pendingCableId  = null;  // cable en attente d'assignation (supprimé si Cancel)
let _segClipboard    = null;  // {cableId, dir, junction} copié via le menu clic droit d'un segment
// seg (objet) → ligne DOM correspondante, reconstruite à chaque renderRoutesList().
// Un même cableId peut apparaître dans plusieurs segments (copier/coller) : le
// surlignage jaune pendant l'animation d'une route doit viser CETTE instance précise,
// pas "une ligne quelconque partageant ce cableId" (voir le tick de startFlowAnimation).
const _segRowMap = new WeakMap();

// Glisser une route entière (wires/chain) sur une route/chemin repliés : dépliage
// automatique après 1s de survol pour viser plus profond (routes ET chemins, même
// mécanisme), replié si on abandonne le glisser sans y déposer.
const _autoExpandedRoutes = new Set();
const _autoExpandedPaths  = new Set();
let _chainDragHoverTimer  = null;
let _chainDragHoverKey    = null; // "route:<id>" ou "path:<id>"

function _armChainHoverExpand(kind, id, alreadyExpanded) {
  const key = kind + ':' + id;
  if (alreadyExpanded) {
    if (_chainDragHoverKey && _chainDragHoverKey !== key) {
      clearTimeout(_chainDragHoverTimer);
      _chainDragHoverTimer = null; _chainDragHoverKey = null;
    }
    return;
  }
  if (_chainDragHoverKey === key) return;
  clearTimeout(_chainDragHoverTimer);
  _chainDragHoverKey = key;
  _chainDragHoverTimer = setTimeout(() => {
    _chainDragHoverTimer = null; _chainDragHoverKey = null;
    const set     = kind === 'route' ? _expandedRoutes     : _expandedPaths;
    const autoSet = kind === 'route' ? _autoExpandedRoutes : _autoExpandedPaths;
    if (!set.has(id)) {
      set.add(id);
      autoSet.add(id);
      renderRoutesList();
    }
  }, 1000);
}

function _collapseAutoExpanded() {
  clearTimeout(_chainDragHoverTimer);
  _chainDragHoverTimer = null; _chainDragHoverKey = null;
  if (!_autoExpandedRoutes.size && !_autoExpandedPaths.size) return;
  _autoExpandedRoutes.forEach(id => _expandedRoutes.delete(id));
  _autoExpandedPaths.forEach(id => _expandedPaths.delete(id));
  _autoExpandedRoutes.clear();
  _autoExpandedPaths.clear();
  renderRoutesList();
}

// Replie UN SEUL élément ouvert automatiquement par survol (pas tout, contrairement
// à _collapseAutoExpanded) — utilisé quand le pointeur quitte réellement CET élément
// pendant un glisser toujours en cours (voir dragleave plus bas), pour ne pas replier
// un parent encore pertinent (ex: quitter un chemin pour un autre chemin de la même
// route ne doit pas replier la route). _collapseAutoExpanded reste réservé à la fin
// du geste entier (dragend), où tout doit redevenir comme avant, sans distinction.
function _collapseAutoExpandedOne(kind, id) {
  // Un minuteur pas encore déclenché pour CET élément ne doit pas survivre à son
  // survol : sinon il s'ouvrirait 1s plus tard même si le pointeur ne le survole
  // plus (et n'est allé nulle part où _armChainHoverExpand l'aurait annulé lui-même).
  if (_chainDragHoverKey === kind + ':' + id) {
    clearTimeout(_chainDragHoverTimer);
    _chainDragHoverTimer = null; _chainDragHoverKey = null;
  }
  const set     = kind === 'route' ? _expandedRoutes     : _expandedPaths;
  const autoSet = kind === 'route' ? _autoExpandedRoutes : _autoExpandedPaths;
  if (!autoSet.has(id)) return;
  autoSet.delete(id);
  set.delete(id);
  renderRoutesList();
}

function _cancelPendingCable() {
  if (_pendingCableId == null) return;
  const cid = _pendingCableId;
  _pendingCableId = null;
  APP.cables = APP.cables.filter(c => c.id !== cid);
  if (APP.undo.length) APP.undo.pop();
  renderCables();
  updateUndoRedoBtns();
  setDirty();
}

const N_RELAY     = 3;
const RELAY_SPEED = 0.585; // px/ms

// ── Helpers ───────────────────────────────────────────────────

function _nextRouteColor() {
  const used = new Set(APP.chains.map(c => c.color));
  return USER_ROUTE_COLORS.find(c => !used.has(c)) || USER_ROUTE_COLORS[APP.chains.length % USER_ROUTE_COLORS.length];
}

// Retire une couleur de route de la liste persistante, et réassigne (comme
// pour une nouvelle route) toute route du projet courant qui l'utilisait —
// contrairement à un type, une route ne peut pas se retrouver sans couleur.
function _deleteUserRouteColor(color) {
  pushUndo();
  USER_ROUTE_COLORS = USER_ROUTE_COLORS.filter(c => c !== color);
  saveUserCats();
  APP.chains.forEach(chain => {
    if (chain.color === color) chain.color = _nextRouteColor();
  });
}

function _nodePortLabel(node, portId, side) {
  const name = node?.short || node?.name || '?';
  if (!portId || !node) return name;
  const ports = node.ports || [];
  const idx = ports.findIndex(p => p.id === portId);
  if (idx === -1) return name;
  // Le numéro de port n'a d'intérêt que si l'appareil en a plusieurs — sur un
  // appareil à port unique (ex: récepteur sans fil), "(1)" n'apporte rien.
  const numStr  = ports.length > 1 ? String(idx + 1) : '';
  const sideStr = side ? side.toUpperCase() : '';
  const inner   = [numStr, sideStr].filter(Boolean).join(' ');
  return inner ? `${name} (${inner})` : name;
}

function _segLabel(seg) {
  const c = APP.cables.find(x => x.id === seg.cableId);
  if (!c) return `Cable #${seg.cableId}`;
  const isFwd  = seg.dir === 'fwd';
  const src     = APP.nodes[isFwd ? c.from : c.to];
  const dst     = APP.nodes[isFwd ? c.to   : c.from];
  const srcPort = isFwd ? c.from_port : c.to_port;
  const dstPort = isFwd ? c.to_port   : c.from_port;
  const srcSide = isFwd ? c.from_side : c.to_side;
  const dstSide = isFwd ? c.to_side   : c.from_side;
  return `${_nodePortLabel(src, srcPort, srcSide)} ──▶ ${_nodePortLabel(dst, dstPort, dstSide)}`;
}

function _guessDirFromSegs(segs, cableId) {
  const c = APP.cables.find(x => x.id === cableId);
  if (!c || !segs.length) return 'fwd';
  const last  = segs[segs.length - 1];
  const lastC = APP.cables.find(x => x.id === last.cableId);
  if (!lastC) return 'fwd';
  const tail = last.dir === 'fwd' ? lastC.to : lastC.from;
  if (c.from === tail) return 'fwd';
  if (c.to   === tail) return 'rev';
  return 'fwd';
}

function _getSegsForPath(chainId, pathId) {
  const chain = APP.chains.find(c => c.id === chainId);
  if (!chain) return null;
  if (pathId === '__epilogue__') return chain.epilogueSegments;
  if (!pathId) return chain.segments;
  return _findPathById(chain, pathId)?.segments || null;
}

function _findPathById(chain, pathId) {
  function _s(paths) {
    for (const p of (paths || [])) {
      if (p.id === pathId) return p;
      const f = _s(p.paths);
      if (f) return f;
    }
    return null;
  }
  return _s(chain.paths || []);
}

// Un câble n'est effacé que si TOUTES les routes qui l'utilisent sont masquées —
// tant qu'il appartient encore à une route restée visible, il reste affiché
// normalement (règle explicite de l'utilisateur, 2026-08-22 : "tant qu'un câble
// appartient à une route visible, il reste" — pas "pire état gagne" comme les
// filtres catégorie/zone, où un seul état masquant suffit).
function _cableMaskedByRoutes(cableId) {
  const owners = APP.chains.filter(ch => _allChainSegments(ch).some(s => s.cableId === cableId));
  return owners.length > 0 && owners.every(ch => ch.hidden);
}

// Même règle que _cableMaskedByRoutes ci-dessus, appliquée à un appareil : effacé
// seulement si TOUTES les routes qui le touchent (via un câble dont il est from/to)
// sont masquées. Un appareil qui n'appartient à aucune route n'est jamais concerné.
function _nodeMaskedByRoutes(nodeId) {
  const touching = APP.chains.filter(ch => _allChainSegments(ch).some(s => {
    const cable = APP.cables.find(c => c.id === s.cableId);
    return cable && (cable.from === nodeId || cable.to === nodeId);
  }));
  return touching.length > 0 && touching.every(ch => ch.hidden);
}

function _allChainSegments(chain) {
  const r = [...(chain.segments || [])];
  function _c(paths) {
    for (const p of (paths || [])) { r.push(...(p.segments || [])); _c(p.paths); }
  }
  _c(chain.paths || []);
  r.push(...(chain.epilogueSegments || []));
  return r;
}

// ── Menu contextuel clic droit : copier/coller un segment ──────
// Même habillage que _showStubMenu (cables.js, menu clic droit sur un stub de
// câble) — cohérence visuelle entre les deux menus contextuels de l'app, sans
// les fusionner (ports/stubs et segments de route sont deux notions distinctes).
// showCopy=false sur un en-tête (chemin/sous-chemin/route) : on n'y copie pas
// "le chemin" comme un segment, seul un segment précis a un contenu copiable.
function _showSegCtxMenu(e, { showCopy, onCopy, onPaste }) {
  document.getElementById('_seg-ctx-menu')?.remove();

  const menu = document.createElement('div');
  menu.id = '_seg-ctx-menu';
  menu.style.cssText = `
    position:fixed; z-index:99999;
    background:#0a0f1e; border:1px solid #1e2d45; border-radius:6px;
    box-shadow:0 4px 16px rgba(0,0,0,.6); overflow:hidden;
    display:flex; flex-direction:column; min-width:160px;
  `;

  const items = [];
  const addItem = (label, enabled, onClick) => {
    const item = document.createElement('div');
    item.textContent = label;
    item.style.cssText = `
      padding:10px 14px; text-align:left;
      font-family:var(--mono); font-size:13px; font-weight:500; letter-spacing:1px;
      color:#b8ccec; cursor:${enabled ? 'pointer' : 'default'}; opacity:${enabled ? '1' : '.35'};
      transition:color .1s, background .1s;
      ${items.length > 0 ? 'border-top:1px solid #1e2d45;' : ''}
    `;
    if (enabled) {
      item.addEventListener('mouseenter', () => { item.style.background = 'rgba(0,212,255,.18)'; item.style.color = '#00d4ff'; });
      item.addEventListener('mouseleave', () => { item.style.background = ''; item.style.color = '#b8ccec'; });
      item.addEventListener('click', ev => {
        ev.stopPropagation();
        onClick();
        menu.remove();
      });
    }
    items.push(item);
    menu.appendChild(item);
  };

  if (showCopy) addItem(t('seg_menu_copy'), true, onCopy);
  addItem(t('seg_menu_paste'), !!_segClipboard, onPaste);

  document.body.appendChild(menu);

  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  menu.style.left = Math.max(4, Math.min(e.clientX, window.innerWidth  - mw - 8)) + 'px';
  menu.style.top  = Math.max(4, Math.min(e.clientY, window.innerHeight - mh - 8)) + 'px';

  // Voir _showStubMenu (cables.js) pour l'explication du choix pointerdown plutôt
  // que click/contextmenu : évite que le relâchement du clic droit qui ouvre CE
  // menu ne le referme aussitôt.
  const close = ev => {
    if (!menu.contains(ev.target)) {
      menu.remove();
      document.removeEventListener('pointerdown', close);
    }
  };
  setTimeout(() => document.addEventListener('pointerdown', close), 0);
}

// Aplatit l'arbre en trains : 1 séquence source→destination par feuille.
// Les segments du tronc précèdent toujours les segments de path —
// l'animation suit donc l'ordre logique du signal.
// Sur le tronc partagé, plusieurs trains se superposent (correct).
function _flattenToTrains(baseSegs, paths) {
  if (!paths?.length) return [baseSegs];
  const trains = [];
  for (const path of paths) {
    const sub = _flattenToTrains([...(path.segments || [])], path.paths || []);
    sub.forEach(st => trains.push([...baseSegs, ...st]));
  }
  return trains;
}

function _migrateChain(chain) {
  if (!chain.segments && chain.cables) {
    chain.segments = (chain.cables || []).map(e => ({
      cableId:  typeof e === 'object' ? e.id : e,
      dir:      typeof e === 'object' && e.rev ? 'rev' : 'fwd',
      junction: 'passthrough',
    }));
  }
  if (!chain.segments) chain.segments = [];
  if (!chain.cables)   chain.cables   = [];
  if (!chain.paths)    chain.paths    = [];
  if (!chain.epilogueSegments) chain.epilogueSegments = [];
  if (chain.hidden === undefined) chain.hidden = false;
}

// ── Mutation paths ────────────────────────────────────────────

function _removePath(chain, pathId) {
  function _rm(paths) {
    const idx = (paths || []).findIndex(p => p.id === pathId);
    if (idx >= 0) return paths.splice(idx, 1)[0];
    for (const p of (paths || [])) { const r = _rm(p.paths); if (r) return r; }
    return null;
  }
  return _rm(chain.paths);
}

function _insertPathBefore(chain, targetPathId, pathObj) {
  if (!targetPathId) { chain.paths.push(pathObj); return true; }
  function _ins(paths) {
    const idx = (paths || []).findIndex(p => p.id === targetPathId);
    if (idx >= 0) { paths.splice(idx, 0, pathObj); return true; }
    return (paths || []).some(p => _ins(p.paths));
  }
  return _ins(chain.paths);
}

function _movePath(fromChainId, pathId, toChainId, insertBeforePathId) {
  if (pathId === insertBeforePathId) return;
  const fromChain = APP.chains.find(c => c.id === fromChainId);
  const toChain   = APP.chains.find(c => c.id === toChainId);
  if (!fromChain || !toChain) return;
  pushUndo(); // avant toute mutation — sinon l'annulation restaure un état déjà déplacé
  const extracted = _removePath(fromChain, pathId);
  if (!extracted) return;
  _insertPathBefore(toChain, insertBeforePathId, extracted);
  _pruneEmptyPaths(fromChain);
  setDirty(); renderRoutesList();
  _scrollRouteIntoView(toChainId);
  if (_activeRoutes.has(fromChainId) || _activeRoutes.has(toChainId)) _restartAnimation();
}

// Vrai si `targetId` est le chemin lui-même ou l'un de ses propres sous-chemins,
// à n'importe quelle profondeur — empêche d'imbriquer un chemin dans l'un de ses
// propres descendants (cycle impossible).
function _isPathOrDescendant(path, targetId) {
  if (!path) return false;
  if (path.id === targetId) return true;
  return (path.paths || []).some(p => _isPathOrDescendant(p, targetId));
}

// Imbrique un chemin existant (pathId) comme sous-chemin d'un autre (targetPathId) —
// « dossier dans un dossier » : le chemin déplacé garde tout son contenu (segments +
// ses propres sous-chemins) tel quel, juste un niveau plus profond. Distinct de
// _movePath, qui réordonne comme frère (zone haute de l'en-tête, ligne rouge).
function _nestPathIntoPath(fromChainId, pathId, toChainId, targetPathId) {
  if (pathId === targetPathId) return;
  const fromChain = APP.chains.find(c => c.id === fromChainId);
  const toChain   = APP.chains.find(c => c.id === toChainId);
  if (!fromChain || !toChain) return;
  const srcPath = _findPathById(fromChain, pathId);
  if (!srcPath) return;
  if (_isPathOrDescendant(srcPath, targetPathId)) return; // cible = soi-même ou un de ses propres descendants
  const target = _findPathById(toChain, targetPathId);
  if (!target) return;

  pushUndo();
  const extracted = _removePath(fromChain, pathId);
  if (!extracted) return;
  (target.paths = target.paths || []).push(extracted);
  _pruneEmptyPaths(fromChain);
  _expandedPaths.add(targetPathId); // révèle immédiatement le résultat

  setDirty(); renderRoutesList();
  _scrollRouteIntoView(toChainId);
  if (_activeRoutes.has(fromChainId) || _activeRoutes.has(toChainId)) _restartAnimation();
}

// Un déplacement de segment (ou de chemin) peut changer le nom auto de la route (premier/dernier
// appareil), donc sa position dans le tri alphabétique de la liste — la route
// ouverte peut se retrouver ailleurs, hors de vue. No-op si déjà visible.
function _scrollRouteIntoView(chainId) {
  document.querySelector(`.route-item[data-chain-id="${chainId}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Après le retrait d'un segment (ou d'un chemin) de sa position d'origine, supprime
// en cascade tout chemin devenu totalement vide (0 segment ET 0 sous-chemin), puis
// la route elle-même si elle n'a plus rien du tout (tronc + chemins + fin de route).
function _pruneEmptyPaths(chain) {
  if (!chain) return;
  function _prune(paths) {
    if (!paths) return;
    for (let i = paths.length - 1; i >= 0; i--) {
      const p = paths[i];
      _prune(p.paths);
      if ((!p.segments || !p.segments.length) && (!p.paths || !p.paths.length)) {
        paths.splice(i, 1);
        _expandedPaths.delete(p.id);
        _autoExpandedPaths.delete(p.id);
      }
    }
  }
  _prune(chain.paths);
  if (_allChainSegments(chain).length === 0) {
    APP.chains = APP.chains.filter(c => c.id !== chain.id);
    _activeRoutes.delete(chain.id);
    _expandedRoutes.delete(chain.id);
    _autoExpandedRoutes.delete(chain.id);
  }
}

// Retire toute référence à ce câble dans TOUTES les routes (tronc, chemins, sous-
// chemins, fin de route), sur TOUTES les chaînes — pas seulement la première trouvée,
// un même câble pouvant apparaître dans plusieurs routes/chemins à la fois (copier/
// coller, "+ Ajouter à une autre route"). À appeler AVANT une suppression définitive
// du câble (deleteNode) : sans ça, une route garderait un segment pointant vers un
// cableId qui n'existe plus (jamais rendu, ni nettoyé automatiquement).
function _purgeCableFromRoutes(cid) {
  APP.chains.forEach(chain => {
    const _rm = segs => {
      if (!segs) return;
      for (let i = segs.length - 1; i >= 0; i--) if (segs[i].cableId === cid) segs.splice(i, 1);
    };
    _rm(chain.segments);
    _rm(chain.epilogueSegments);
    (function walk(paths) { (paths || []).forEach(p => { _rm(p.segments); walk(p.paths); }); })(chain.paths);
    _pruneEmptyPaths(chain);
  });
}

// Fusionne une route entière (sourceChainId) dans une autre route, comme nouveau
// chemin — à l'endroit exact où "+Chemin" en créerait un (fin de destChain.paths,
// ou fin de path.paths si destPathId précise un chemin cible). La route source
// disparaît (déplacé, pas copié). Son tronc + son éventuel segment de fin de route
// (qui n'est structurellement qu'un bout de tronc déplacé à l'écran) sont concaténés
// dans l'ordre où ils apparaissaient et deviennent les `segments` du nouveau chemin ;
// ses chemins deviennent ses sous-chemins, inchangés — exactement comme déplacer un
// dossier dans un dossier.
function _mergeChainIntoPath(sourceChainId, destChainId, destPathId) {
  if (sourceChainId === destChainId) return;
  const srcChain  = APP.chains.find(c => c.id === sourceChainId);
  const destChain = APP.chains.find(c => c.id === destChainId);
  if (!srcChain || !destChain) return;
  _migrateChain(srcChain); _migrateChain(destChain);

  pushUndo();

  const newPath = {
    id: uuid(),
    title: srcChain.title,
    segments: [...(srcChain.segments || []), ...(srcChain.epilogueSegments || [])],
    paths: srcChain.paths || [],
  };
  const parent    = destPathId ? _findPathById(destChain, destPathId) : null;
  const container = parent ? (parent.paths = parent.paths || []) : (destChain.paths = destChain.paths || []);
  container.push(newPath);
  _expandedPaths.add(newPath.id); // visible immédiatement pour montrer le résultat de la fusion

  APP.chains = APP.chains.filter(c => c.id !== sourceChainId);
  _activeRoutes.delete(sourceChainId);
  _expandedRoutes.delete(sourceChainId);
  _autoExpandedRoutes.delete(sourceChainId);
  // La route (et le chemin cible s'il y en a un) receveuse reste dépliée pour
  // montrer le résultat, et n'est plus considérée "ouverte temporairement"
  // même si le survol l'avait dépliée.
  _autoExpandedRoutes.delete(destChainId);
  _expandedRoutes.add(destChainId);
  if (destPathId) {
    _autoExpandedPaths.delete(destPathId);
    _expandedPaths.add(destPathId);
  }

  destChain.title = _autoTitleFromChain(destChain);
  wLog('ROUTE_MERGE', { from: sourceChainId, into: destChainId, path: destPathId || null });

  setDirty(); renderRoutesList();
  _updateTrace();
  if (_activeRoutes.size) _restartAnimation(); else stopFlowAnimation();
}

// ── CRUD routes / paths ───────────────────────────────────────

function _createPath(chainId, parentPathId) {
  const chain  = APP.chains.find(c => c.id === chainId);
  if (!chain) return;
  const parent = parentPathId ? _findPathById(chain, parentPathId) : null;
  const arr    = parent ? (parent.paths || (parent.paths = [])) : chain.paths;
  const p      = { id: uuid(), title: t('path_label') + ' ' + (arr.length + 1), segments: [], paths: [] };
  pushUndo();
  arr.push(p);
  _expandedPaths.add(p.id); // visible immédiatement, comme un chemin qu'on vient de créer
  setDirty(); renderRoutesList();
  if (!_activeRoutes.has(chainId)) traceRoute(chainId);
}

function _deletePath(chainId, pathId) {
  const chain = APP.chains.find(c => c.id === chainId);
  if (!chain) return;
  pushUndo();
  _removePath(chain, pathId);
  _pruneEmptyPaths(chain); // le parent (ou la route) peut se retrouver vide à son tour
  setDirty(); renderRoutesList();
  if (_activeRoutes.has(chainId)) _restartAnimation();
}

function _removeCableFromAllRoutes(cableId) {
  function _fromPaths(paths) {
    for (const p of (paths || [])) {
      p.segments = (p.segments || []).filter(s => s.cableId !== cableId);
      _fromPaths(p.paths);
    }
  }
  const chainsSnapshot = [...APP.chains];
  chainsSnapshot.forEach(chain => {
    _migrateChain(chain);
    chain.segments = chain.segments.filter(s => s.cableId !== cableId);
    chain.epilogueSegments = (chain.epilogueSegments || []).filter(s => s.cableId !== cableId);
    _fromPaths(chain.paths);
  });
  // Supprimer les chemins devenus vides en cascade, puis la route elle-même si elle
  // n'a plus rien du tout — pas seulement vérifier la route entière comme avant,
  // qui laissait un chemin intermédiaire vide traîner tant que la route avait
  // encore un contenu ailleurs (tronc, autre chemin...).
  const idsBefore = new Set(APP.chains.map(c => c.id));
  chainsSnapshot.forEach(chain => _pruneEmptyPaths(chain));
  const removedIds = [...idsBefore].filter(id => !APP.chains.some(c => c.id === id));
  if (removedIds.length) {
    _updateTrace();
    if (!_activeRoutes.size) stopFlowAnimation(); else _restartAnimation();
  }
}


// ── Render : liste de segments ────────────────────────────────
// Drag wires/seg → cross-path (drop sur une autre ligne ou header de path)

function _renderSegList(container, segs, chain, pathId) {
  if (!segs.length) return;

  const segList = document.createElement('div');
  segList.className = 'route-cables-list';

  segs.forEach((seg, idx) => {
    const c = APP.cables.find(x => x.id === seg.cableId);
    if (!c) return;
    const isNew = _highlightCid === seg.cableId;
    const isRev = seg.dir === 'rev';

    const row = document.createElement('div');
    row.className = 'route-cable-row' + (isNew ? ' rcc-new' : '');
    row.setAttribute('draggable', 'true');
    row.dataset.segIdx = idx;
    row.dataset.cableId = seg.cableId;
    row.dataset.chainId = chain.id;
    _segRowMap.set(seg, row);
    row.innerHTML = `
      <span style="cursor:grab;color:var(--textdim);margin-right:2px;font-size:13px;user-select:none">≡</span>
      <span style="width:7px;height:7px;border-radius:50%;background:${escapeHtml(c.color)};flex-shrink:0;display:inline-block"></span>
      <span class="route-cable-label" style="${_isSegAnimating(seg.cableId) ? 'color:#ffd700' : ''}" title="${escapeHtml(_segLabel(seg))}">${escapeHtml(_segLabel(seg))}</span>
      <button class="tb-btn rcc-btn" data-action="rev" title="${t('reverse_dir')}">⇄</button>
      <button class="tb-btn rcc-btn" data-action="rm" style="opacity:.35">✕</button>
    `;

    row.addEventListener('dragstart', e => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('wires/seg', JSON.stringify({ chainId: chain.id, segIdx: idx, pathId: pathId || null }));
      row.style.opacity = '0.4';
    });
    row.addEventListener('dragend', () => { row.style.opacity = ''; });

    // Double-clic → anime ce seul segment en boucle (même principe que déclencher
    // l'animation d'une route entière, mais ciblé) ; re-double-cliquer l'arrête.
    // Simple clic pendant l'animation → l'arrête aussi (même principe qu'un simple
    // clic sur une route active), avec le même délai anti-conflit avec le double-clic
    // qu'utilise l'en-tête de route.
    row.addEventListener('click', e => {
      if (e.target.closest('.rcc-btn')) return;
      clearTimeout(_segClickTimers[seg.cableId]);
      _segClickTimers[seg.cableId] = setTimeout(() => {
        if (_isSegAnimating(seg.cableId)) _toggleSegAnimation(seg, chain);
      }, 250);
    });
    row.addEventListener('dblclick', e => {
      if (e.target.closest('.rcc-btn')) return;
      e.stopPropagation();
      clearTimeout(_segClickTimers[seg.cableId]);
      _toggleSegAnimation(seg, chain);
    });

    // Clic droit → copier ce segment, ou coller le segment déjà copié juste après
    // lui dans SA PROPRE liste (tronc, ce chemin ou ce sous-chemin — `segs` est déjà
    // le bon tableau, celui passé à ce rendu). Pure copie de {cableId,dir,junction},
    // jamais un nouveau câble — le même cableId peut donc apparaître dans plusieurs
    // segments à la fois (déjà le cas via "+ Add to another route", voir _doAddToChain).
    row.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      _showSegCtxMenu(e, {
        showCopy: true,
        onCopy: () => { _segClipboard = { cableId: seg.cableId, dir: seg.dir, junction: seg.junction }; },
        onPaste: () => {
          if (!_segClipboard) return;
          pushUndo();
          segs.splice(idx + 1, 0, { ..._segClipboard });
          _highlightCid = _segClipboard.cableId;
          setDirty(); renderRoutesList();
          _scrollRouteIntoView(chain.id);
          if (_activeRoutes.has(chain.id)) _restartAnimation();
        }
      });
    });

    row.addEventListener('dragover', e => {
      if (!e.dataTransfer.types.includes('wires/seg')) return;
      e.preventDefault();
      const mid = row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
      row.style.borderTop    = e.clientY < mid  ? '2px solid ' + chain.color : '';
      row.style.borderBottom = e.clientY >= mid ? '2px solid ' + chain.color : '';
    });
    row.addEventListener('dragleave', () => { row.style.borderTop = row.style.borderBottom = ''; });

    row.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      row.style.borderTop = row.style.borderBottom = '';
      const d = e.dataTransfer.getData('wires/seg');
      if (!d) return;
      const src     = JSON.parse(d);
      const srcSegs = _getSegsForPath(src.chainId, src.pathId);
      if (!srcSegs) return;
      const toIdx = +row.dataset.segIdx;
      const mid   = row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
      pushUndo(); // avant le splice — sinon l'instantané perd le segment (déjà retiré, pas encore réinséré)
      const moved = srcSegs.splice(src.segIdx, 1)[0];
      let ins = e.clientY < mid ? toIdx : toIdx + 1;
      if (srcSegs === segs && src.segIdx < toIdx) ins--;
      segs.splice(Math.max(0, Math.min(ins, segs.length)), 0, moved);
      _pruneEmptyPaths(APP.chains.find(c => c.id === src.chainId));
      setDirty(); renderRoutesList();
      _scrollRouteIntoView(chain.id);
      if (_activeRoutes.has(chain.id)) _restartAnimation();
    });

    row.querySelectorAll('.rcc-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (btn.dataset.action === 'rev') {
          const cid = seg.cableId;
          pushUndo();
          seg.dir = seg.dir === 'fwd' ? 'rev' : 'fwd';
          chain.title = _autoTitleFromChain(chain);
          setDirty(); renderRoutesList();
          if (_activeRoutes.has(chain.id)) _restartAnimation();
          // Inverser peut changer le nom (donc la position triée) de la route :
          // la ligne peut se retrouver ailleurs dans la liste, hors de vue.
          document.querySelector(`.route-cable-row[data-cable-id="${cid}"][data-chain-id="${chain.id}"]`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        if (btn.dataset.action === 'rm') {
          const cid = seg.cableId;
          // Compte TOUTES les occurrences de ce câble, dans TOUTES les routes — y compris
          // d'autres chemins de CETTE MÊME route. L'ancienne version ne cherchait que dans
          // les autres routes (ch.id !== chain.id) : un câble dupliqué sur plusieurs chemins
          // d'une seule et même route étatit donc à tort considéré comme orphelin dès la
          // première suppression, alors qu'il restait utilisé ailleurs dans cette route.
          const totalUses = APP.chains.reduce(
            (n, ch) => n + _allChainSegments(ch).filter(s => s.cableId === cid).length, 0
          );
          const isOrphaned = totalUses <= 1;
          if (isOrphaned) {
            const svg = document.getElementById('cables-svg');
            svg.classList.add('cables-route-hovering');
            const cableEl = svg.querySelector(`.cable-visual[data-cid="${cid}"]`);
            if (cableEl) cableEl.classList.add('route-hover-highlight');
            const clearHL = () => {
              svg.classList.remove('cables-route-hovering');
              svg.querySelectorAll('.route-hover-highlight').forEach(el => el.classList.remove('route-hover-highlight'));
            };
            const fromName = APP.nodes[c.from]?.short || APP.nodes[c.from]?.name || '?';
            const toName   = APP.nodes[c.to]?.short   || APP.nodes[c.to]?.name   || '?';
            const msg = t('orphan_cable_confirm').replace('$from', fromName).replace('$to', toName);
            showConfirm(msg, { ok: t('delete_cable_btn'), danger: true, cancel: t('cancel') })
            .then(ok => {
              clearHL();
              if (!ok) return;
              deleteConn(cid, { skipRouteCheck: true });
            });
          } else {
            pushUndo();
            segs.splice(idx, 1);
            _pruneEmptyPaths(chain);
            if (APP.chains.includes(chain)) chain.title = _autoTitleFromChain(chain);
            setDirty(); renderRoutesList();
            if (_activeRoutes.has(chain.id)) _restartAnimation();
          }
        }
      });
    });

    if (idx > 0) {
      const prevSeg = segs[idx - 1];
      const cPrev = APP.cables.find(x => x.id === prevSeg.cableId);
      if (cPrev) {
        const exitNode  = prevSeg.dir === 'fwd' ? cPrev.to   : cPrev.from;
        const entryNode = seg.dir     === 'fwd' ? c.from      : c.to;
        if (exitNode !== entryNode) {
          row.style.position = 'relative';
          const brkSign = document.createElement('span');
          brkSign.textContent = '≠';
          brkSign.style.cssText = 'position:absolute;top:-2px;left:16px;transform:translateY(-50%);font-size:9px;color:#ff5555;font-weight:bold;line-height:1;pointer-events:none;user-select:none';
          row.appendChild(brkSign);
        }
      }
    }

    segList.appendChild(row);
  });

  container.appendChild(segList);
}

// ── Render : arbre de paths (récursif) ────────────────────────
// wires/path → réordonner ou déplacer vers autre route
// wires/seg  → déposer un câble dans ce path

function _renderPathTree(container, paths, chain, depth) {
  (paths || []).forEach((path, idx) => {
    _maxRenderedPathDepth = Math.max(_maxRenderedPathDepth, depth);
    const pathBlock = document.createElement('div');
    pathBlock.dataset.pathId = path.id;
    // Fond légèrement plus marqué à chaque niveau d'imbrication (couleur de la route,
    // opacité croissante, plafonnée au 3e palier) — pour distinguer chemin/sous-chemin/
    // sous-sous-chemin au premier coup d'œil, sans compter les indentations.
    const _pathBgAlpha = depth >= 3 ? '26' : depth === 2 ? '1C' : '12';
    // 33px, constant à chaque niveau (pas proportionnel à depth) : c'est la valeur qui,
    // une fois cumulée par l'imbrication naturelle des marges CSS, aligne la flèche "↳"
    // de ce chemin sur le point de couleur des segments du niveau parent (tronc pour un
    // chemin, chemin pour un sous-chemin, etc.) — voir le calcul détaillé dans la
    // discussion qui a précédé ce changement, pas une valeur arbitraire.
    pathBlock.style.cssText = `margin-left:33px;border-left:2px solid ${chain.color}44;margin-bottom:2px;background:${chain.color}${_pathBgAlpha}`;

    const isPathExpanded  = _expandedPaths.has(path.id);
    const isPathAnimating = _isPathAnimating(path.id);

    const pathHeader = document.createElement('div');
    pathHeader.setAttribute('draggable', 'true');
    pathHeader.style.cssText = `
      display:flex;align-items:center;gap:5px;padding:4px 8px;cursor:grab;user-select:none;
      ${isPathAnimating ? 'background:rgba(255,217,61,.1);box-shadow:inset 3px 0 0 #ffd93d;' : ''}
    `;
    // Titre = premier appareil → dernier appareil (même principe qu'une route,
    // voir _refreshPathTitles) ; repli sur le libellé numéroté (position réelle
    // dans la liste) tant que le chemin est vide.
    pathHeader.innerHTML = `
      <span style="font-family:var(--mono);font-size:12px;color:${escapeHtml(chain.color)};opacity:.8;flex-shrink:0">↳</span>
      <span style="font-family:var(--mono);font-size:12px;${isPathAnimating ? 'color:#ffd93d;font-weight:700' : 'color:var(--text)'};flex:1">${escapeHtml(path.title || (t('path_label') + ' ' + (idx + 1)))}</span>
      <span style="font-family:var(--mono);font-size:11px;color:var(--textdim)">${path.segments?.length || 0} seg</span>
    `;

    const delBtn = document.createElement('button');
    delBtn.className = 'tb-btn';
    delBtn.textContent = '✕';
    delBtn.title = t('delete_path');
    delBtn.style.cssText = 'font-size:11px;padding:2px 6px;opacity:.3';
    delBtn.addEventListener('click', e => { e.stopPropagation(); _deletePath(chain.id, path.id); });
    pathHeader.appendChild(delBtn);

    // Clic → replier/déplier ce chemin ; s'il anime, l'arrête (même principe qu'une
    // route) — délai anti-conflit avec le double-clic (anime tout son sous-arbre).
    pathHeader.addEventListener('click', e => {
      e.stopPropagation();
      clearTimeout(_pathClickTimers[path.id]);
      _pathClickTimers[path.id] = setTimeout(() => {
        const wasExpanded = isPathExpanded;
        if (isPathAnimating) {
          _clearPathAnimation();
          _expandedPaths.add(path.id);
          if (_activeRoutes.size) _restartAnimation();
        } else if (isPathExpanded) {
          _expandedPaths.delete(path.id);
        } else {
          _expandedPaths.add(path.id);
        }
        renderRoutesList();
        // Même correctif que pour une route (voir plus haut) : 'start' plutôt que
        // 'nearest', pour amener l'en-tête en haut de la zone visible même si le
        // chemin déplié (ou son sous-arbre entier, double-clic) est plus haut qu'un écran.
        if (!wasExpanded) {
          document.querySelector(`[data-path-id="${path.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 250);
    });
    pathHeader.addEventListener('dblclick', e => {
      e.stopPropagation();
      clearTimeout(_pathClickTimers[path.id]);
      _expandPathSubtree(path);
      if (!isPathAnimating) _tracePathAnimation(chain, path);
      renderRoutesList();
      document.querySelector(`[data-path-id="${path.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });

    // Clic droit → coller le segment copié à la fin de CE chemin/sous-chemin
    // (même effet que déposer un segment glissé ici, voir le drop wires/seg plus bas).
    pathHeader.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      _showSegCtxMenu(e, {
        showCopy: false,
        onPaste: () => {
          if (!_segClipboard) return;
          pushUndo();
          (path.segments = path.segments || []).push({ ..._segClipboard });
          _highlightCid = _segClipboard.cableId;
          setDirty(); renderRoutesList();
          _scrollRouteIntoView(chain.id);
          if (_activeRoutes.has(chain.id)) _restartAnimation();
        }
      });
    });

    // Drag du path
    pathHeader.addEventListener('dragstart', e => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('wires/path', JSON.stringify({ chainId: chain.id, pathId: path.id }));
      pathBlock.style.opacity = '0.4';
    });
    pathHeader.addEventListener('dragend', () => { pathBlock.style.opacity = ''; });

    // Drop : wires/seg → ajoute câble dans ce path | wires/chain → imbrique la route
    // wires/path → deux zones sur le MÊME en-tête : survol du corps = imbriquer comme
    // sous-chemin (dossier dans un dossier) ; survol du bord haut (ligne rouge) =
    // réordonner comme frère avant ce chemin (comportement historique, inchangé).
    const _hi = on => {
      pathHeader.style.outline       = on ? `2px solid ${chain.color}` : '';
      pathHeader.style.outlineOffset = on ? '-2px' : '';
    };
    const _TOP_ZONE_RATIO = 0.35;
    let _pathDropMode = 'nest'; // 'nest' | 'before' — pertinent seulement pour wires/path
    pathHeader.addEventListener('dragover', e => {
      if (!e.dataTransfer.types.includes('wires/seg') && !e.dataTransfer.types.includes('wires/path') && !e.dataTransfer.types.includes('wires/chain')) return;
      e.preventDefault(); e.stopPropagation();
      if (e.dataTransfer.types.includes('wires/path')) {
        const rect = pathHeader.getBoundingClientRect();
        _pathDropMode = (e.clientY - rect.top) < rect.height * _TOP_ZONE_RATIO ? 'before' : 'nest';
        pathHeader.style.borderTop = _pathDropMode === 'before' ? '2px solid #ff5555' : '';
        _hi(_pathDropMode === 'nest');
      } else {
        pathHeader.style.borderTop = '';
        _hi(true);
      }
      // Même principe pour glisser une route, un chemin ou un simple segment :
      // survoler 1s un chemin replié le déplie pour pouvoir viser plus profond.
      _armChainHoverExpand('path', path.id, isPathExpanded);
    });
    pathHeader.addEventListener('dragleave', e => {
      _hi(false); pathHeader.style.borderTop = '';
      // Ignorer un "leave" causé par le passage vers le propre contenu de ce chemin
      // (segments, sous-chemins... révélés par ce survol) — replier seulement si le
      // pointeur quitte VRAIMENT ce chemin, pas seulement son en-tête.
      if (e.relatedTarget && pathBlock.contains(e.relatedTarget)) return;
      _collapseAutoExpandedOne('path', path.id);
    });
    pathHeader.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      _hi(false); pathHeader.style.borderTop = '';
      if (e.dataTransfer.types.includes('wires/chain')) {
        const { chainId: srcCid } = JSON.parse(e.dataTransfer.getData('wires/chain'));
        _mergeChainIntoPath(srcCid, chain.id, path.id);
      } else if (e.dataTransfer.types.includes('wires/seg')) {
        const d       = JSON.parse(e.dataTransfer.getData('wires/seg'));
        const srcSegs = _getSegsForPath(d.chainId, d.pathId);
        if (!srcSegs) return;
        pushUndo();
        const seg = srcSegs.splice(d.segIdx, 1)[0];
        (path.segments = path.segments || []).push(seg);
        _pruneEmptyPaths(APP.chains.find(c => c.id === d.chainId));
        setDirty(); renderRoutesList();
        _scrollRouteIntoView(chain.id);
        if (_activeRoutes.has(chain.id)) _restartAnimation();
      } else if (e.dataTransfer.types.includes('wires/path')) {
        const d = JSON.parse(e.dataTransfer.getData('wires/path'));
        if (d.pathId === path.id) return;
        if (_pathDropMode === 'before') {
          _movePath(d.chainId, d.pathId, chain.id, path.id);
        } else {
          _nestPathIntoPath(d.chainId, d.pathId, chain.id, path.id);
        }
      }
    });

    pathBlock.appendChild(pathHeader);

    if (isPathExpanded) {
      _renderSegList(pathBlock, path.segments || [], chain, path.id);
      _renderPathTree(pathBlock, path.paths || [], chain, depth + 1);

      const addBtn = document.createElement('button');
      addBtn.style.cssText = `
        margin:4px 8px 4px 28px;display:block;padding:3px 10px;
        background:${chain.color}1a;border:1px dashed ${chain.color}55;border-radius:4px;
        color:${chain.color};font-family:var(--mono);font-size:11px;cursor:pointer;opacity:.6;
      `;
      addBtn.textContent = t('add_path');
      addBtn.addEventListener('click', e => { e.stopPropagation(); _createPath(chain.id, path.id); });
      pathBlock.appendChild(addBtn);
    }

    container.appendChild(pathBlock);
  });
}

// ── renderRoutesList ──────────────────────────────────────────

function renderRoutesList() {
  const list = document.getElementById('routes-list');
  // Vider/reconstruire toute la liste à chaque action (tri, renommage, dépliage...)
  // remettait le défilement en haut à chaque fois — préservé ici par défaut ; les
  // rares cas où une ligne doit être ramenée en vue (dépliage, réordonnancement)
  // le font explicitement après coup, via scrollIntoView (no-op si déjà visible).
  const _prevScrollTop = list.scrollTop;
  _maxRenderedPathDepth = 0; // recalculé par _renderPathTree pendant ce rendu

  // Remove all children EXCEPT the create-form (preserves its event listeners)
  Array.from(list.children).forEach(child => {
    if (!child.classList.contains('route-create-form')) child.remove();
  });

  const hasForm = !!list.querySelector('.route-create-form');
  APP.chains.forEach(_migrateChain);
  APP.chains.forEach(chain => {
    if (_allChainSegments(chain).length) chain.title = _autoTitleFromChain(chain);
    _refreshPathTitles(chain.paths);
  });

  // Tri alphabétique par nom de route, départagé par le nom de fin de route
  // puis par id en cas d'égalité totale — ordre canonique partagé (voir
  // _routeCanonicalCompare), recalculé à chaque rendu donc toujours à jour.
  const _sortedChains = [...APP.chains].sort(_routeCanonicalCompare);

  if (!APP.chains.length) {
    if (hasForm) return;
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:20px;font-family:var(--mono);font-size:11px;color:var(--textdim);text-align:center';
    empty.innerHTML = `${t('no_routes')}<br><br>${t('routes_hint')}`;
    list.appendChild(empty);
    return;
  }

  _sortedChains.forEach(chain => {
    const isActive   = _activeRoutes.has(chain.id);
    const isExpanded = _expandedRoutes.has(chain.id);
    const totalSegs  = _allChainSegments(chain).length;
    const pathCount  = chain.paths?.length || 0;

    const item = document.createElement('div');
    item.className = 'route-item' + (isActive ? ' active' : '');
    item.dataset.chainId = chain.id;

    const header = document.createElement('div');
    header.className = 'route-item-header';
    header.setAttribute('draggable', 'true');
    if (isActive) {
      header.style.cssText = `
        background:rgba(255,217,61,.1);
        box-shadow:inset 3px 0 0 #ffd93d, 0 0 18px rgba(255,217,61,.08);
      `;
    }
    header.innerHTML = `
      <span class="route-eye-wrap" draggable="false" style="display:inline-flex;flex-shrink:0;opacity:.55;color:var(--text)">${_eyeSVG(!chain.hidden)}</span>
      <div class="route-color" style="background:${escapeHtml(chain.color || '#00d4ff')}"></div>
      <div class="route-info" style="flex:1;min-width:0">
        <div class="route-title" style="${isActive ? 'color:#ffd93d;font-weight:700' : ''}">${escapeHtml(_routeDisplayTitle(chain))}</div>
        <div class="route-badge">${_typeChipsHtml(chain)} · ${totalSegs} ${t('seg')}${pathCount ? ` · ${pathCount} ${pathCount > 1 ? t('paths') : t('path')}` : ''}</div>
      </div>
      <button class="tb-btn" data-action="edit"
        style="font-size:13px;padding:3px 7px;opacity:.35" title="${t('edit_signal_type')}">✎</button>
      <button class="tb-btn" data-action="del"
        style="font-size:11px;padding:3px 7px;opacity:.35" title="${t('delete')}">✕</button>
    `;

    header.querySelector('.route-eye-wrap').addEventListener('click', e => {
      e.stopPropagation();
      chain.hidden = !chain.hidden;
      setDirty();
      renderRoutesList();
      renderCables();
      applyCanvasFilters();
    });

    header.querySelector('[data-action=edit]').addEventListener('click', e => {
      e.stopPropagation();
      _openCreateRouteModal(null, chain);
    });

    header.querySelector('[data-action=del]').addEventListener('click', e => {
      e.stopPropagation();
      const orphanedCids = [...new Set(_allChainSegments(chain).map(s => s.cableId))]
        .filter(cid => !APP.chains.some(ch =>
          ch.id !== chain.id && _allChainSegments(ch).some(s => s.cableId === cid)
        ));
      const doDelete = () => {
        pushUndo();
        wLog('ROUTE_DEL', { id: chain.id, title: chain.title });
        APP.chains = APP.chains.filter(c => c.id !== chain.id);
        if (_activeRoutes.has(chain.id)) clearRouteTrace(chain.id);
        orphanedCids.forEach(cid => deleteConn(cid, { skipRouteCheck: true, skipUndo: true }));
        renderRoutesList(); setDirty();
      };
      if (orphanedCids.length) {
        const msg = orphanedCids.length === 1
          ? t('delete_route_cable_1')
          : t('delete_route_cables_n').replace('$n', orphanedCids.length);
        showConfirm(msg, { ok: t('delete_route_cables_btn'), danger: true }).then(ok => { if (ok) doDelete(); });
      } else {
        doDelete();
      }
    });
    header.addEventListener('click', () => {
      clearTimeout(_routeClickTimers[chain.id]);
      _routeClickTimers[chain.id] = setTimeout(() => {
        const wasExpanded = isExpanded;
        if (isActive) {
          clearRouteTrace(chain.id);
          _expandedRoutes.add(chain.id);
        } else if (isExpanded) {
          _expandedRoutes.delete(chain.id);
        } else {
          _expandedRoutes.add(chain.id);
        }
        renderRoutesList();
        // Une route dépliée peut révéler bien plus de contenu qu'un écran (plusieurs
        // chemins) — 'nearest' ne bougeait quasiment pas si le haut de la route était
        // déjà à peine sous la zone visible, laissant tout son contenu déplié hors
        // champ, et 'start' pouvait couper la fin du contenu déplié si la route est
        // plus haute que l'écran. 'end' amène le bas du bloc déplié en bas de la zone
        // visible (donc tout en bas de la liste si c'est la dernière route).
        if (!wasExpanded) {
          document.querySelector(`.route-item[data-chain-id="${chain.id}"]`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 250);
    });
    header.addEventListener('dblclick', () => {
      clearTimeout(_routeClickTimers[chain.id]);
      if (isActive) {
        // Route déjà en cours d'animation : le double-clic l'arrête ET la replie
        // (contrairement au simple clic, qui l'arrête mais la laisse dépliée).
        _expandedRoutes.delete(chain.id);
        clearRouteTrace(chain.id);
        return;
      }
      _expandedRoutes.add(chain.id);
      // Déplie tout l'arbre de chemins de la route (pas seulement leurs en-têtes) —
      // chaque chemin a son propre repli individuel depuis peu, donc l'ouvrir devait
      // aussi être fait explicitement ici, comme pour le double-clic sur un chemin.
      (chain.paths || []).forEach(_expandPathSubtree);
      traceRoute(chain.id);
      renderRoutesList();
    });

    // Clic droit → coller le segment copié à la fin du tronc de cette route.
    header.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      _showSegCtxMenu(e, {
        showCopy: false,
        onPaste: () => {
          if (!_segClipboard) return;
          pushUndo();
          chain.segments.push({ ..._segClipboard });
          _highlightCid = _segClipboard.cableId;
          setDirty(); renderRoutesList();
          _scrollRouteIntoView(chain.id);
          if (_activeRoutes.has(chain.id)) _restartAnimation();
        }
      });
    });

    // Drag de la route entière (wires/chain) → la fusionner ailleurs
    header.addEventListener('dragstart', e => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('wires/chain', JSON.stringify({ chainId: chain.id }));
      item.style.opacity = '0.4';
    });
    header.addEventListener('dragend', () => { item.style.opacity = ''; _collapseAutoExpanded(); });

    // Drop wires/path depuis une autre route → adopter le path
    // Drop wires/chain → fusionner la route glissée comme nouveau chemin de premier niveau
    // wires/seg n'a pas de dépôt direct valide ici (pas de zone tronc au niveau de
    // l'en-tête replié) mais doit quand même armer le dépliage au survol, pour
    // pouvoir viser la zone tronc/un chemin une fois la route dépliée.
    header.addEventListener('dragover', e => {
      const isChain = e.dataTransfer.types.includes('wires/chain');
      const isPath  = e.dataTransfer.types.includes('wires/path');
      const isSeg   = e.dataTransfer.types.includes('wires/seg');
      if (!isChain && !isPath && !isSeg) return;
      if (isChain || isPath) {
        e.preventDefault(); e.dataTransfer.dropEffect = 'move';
        header.style.boxShadow = `inset 0 -3px 0 ${chain.color}`;
      }
      _armChainHoverExpand('route', chain.id, isExpanded);
    });
    header.addEventListener('dragleave', e => {
      header.style.boxShadow = '';
      // Ignorer un "leave" causé par le passage vers le propre contenu de cette route
      // (tronc, chemins... révélés par ce survol) — replier seulement si le pointeur
      // quitte VRAIMENT cette route, pas seulement son en-tête.
      if (e.relatedTarget && item.contains(e.relatedTarget)) return;
      _collapseAutoExpandedOne('route', chain.id);
    });
    header.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      header.style.boxShadow = '';
      if (e.dataTransfer.types.includes('wires/chain')) {
        const { chainId: srcCid } = JSON.parse(e.dataTransfer.getData('wires/chain'));
        _mergeChainIntoPath(srcCid, chain.id, null);
        return;
      }
      const d = e.dataTransfer.getData('wires/path');
      if (!d) return;
      const { chainId: fromCid, pathId } = JSON.parse(d);
      if (fromCid === chain.id) return;
      _movePath(fromCid, pathId, chain.id, null);
    });

    item.appendChild(header);

    if (isExpanded) {
      if (chain.paths?.length) {
        const trunkLbl = document.createElement('div');
        trunkLbl.style.cssText = `
          padding:4px 16px 2px;font-family:var(--mono);font-size:11px;letter-spacing:.05em;
          color:var(--textdim);opacity:.5;
        `;
        trunkLbl.textContent = t('trunk');

        // Drop zone : câble → tronc
        trunkLbl.addEventListener('dragover', e => {
          if (!e.dataTransfer.types.includes('wires/seg')) return;
          e.preventDefault();
          trunkLbl.style.outline = `2px solid ${chain.color}`;
          trunkLbl.style.outlineOffset = '-2px';
        });
        trunkLbl.addEventListener('dragleave', () => { trunkLbl.style.outline = ''; });
        trunkLbl.addEventListener('drop', e => {
          e.preventDefault();
          trunkLbl.style.outline = '';
          const d = e.dataTransfer.getData('wires/seg');
          if (!d) return;
          const src = JSON.parse(d);
          const srcSegs = _getSegsForPath(src.chainId, src.pathId);
          if (!srcSegs) return;
          pushUndo();
          const seg = srcSegs.splice(src.segIdx, 1)[0];
          chain.segments.push(seg);
          _pruneEmptyPaths(APP.chains.find(c => c.id === src.chainId));
          setDirty(); renderRoutesList();
          _scrollRouteIntoView(chain.id);
          if (_activeRoutes.has(chain.id)) _restartAnimation();
        });

        item.appendChild(trunkLbl);
      }

      _renderSegList(item, chain.segments || [], chain, null);
      _renderPathTree(item, chain.paths || [], chain, 1);

      if (chain.paths?.length) {
        const epilogueLbl = document.createElement('div');
        epilogueLbl.style.cssText = `
          padding:6px 16px 2px;font-family:var(--mono);font-size:11px;letter-spacing:.05em;
          color:var(--textdim);opacity:.5;border-top:1px dashed ${chain.color}33;margin-top:6px;
        `;
        epilogueLbl.textContent = t('epilogue');

        // Drop zone : câble → segment de fin de route (joué après tous les chemins)
        epilogueLbl.addEventListener('dragover', e => {
          if (!e.dataTransfer.types.includes('wires/seg')) return;
          e.preventDefault();
          epilogueLbl.style.outline = `2px solid ${chain.color}`;
          epilogueLbl.style.outlineOffset = '-2px';
        });
        epilogueLbl.addEventListener('dragleave', () => { epilogueLbl.style.outline = ''; });
        epilogueLbl.addEventListener('drop', e => {
          e.preventDefault();
          epilogueLbl.style.outline = '';
          const d = e.dataTransfer.getData('wires/seg');
          if (!d) return;
          const src = JSON.parse(d);
          const srcSegs = _getSegsForPath(src.chainId, src.pathId);
          if (!srcSegs) return;
          pushUndo();
          const seg = srcSegs.splice(src.segIdx, 1)[0];
          chain.epilogueSegments.push(seg);
          _pruneEmptyPaths(APP.chains.find(c => c.id === src.chainId));
          setDirty(); renderRoutesList();
          _scrollRouteIntoView(chain.id);
          if (_activeRoutes.has(chain.id)) _restartAnimation();
        });

        item.appendChild(epilogueLbl);
        _renderSegList(item, chain.epilogueSegments || [], chain, '__epilogue__');
      }

      const addPathBtn = document.createElement('button');
      addPathBtn.style.cssText = `
        margin:6px 12px 8px;display:block;padding:4px 12px;
        background:${chain.color}1a;border:1px dashed ${chain.color}66;border-radius:4px;
        color:${chain.color};font-family:var(--mono);font-size:11px;
        cursor:pointer;opacity:.75;width:calc(100% - 24px);box-sizing:border-box;
      `;
      addPathBtn.textContent = t('add_path');
      addPathBtn.addEventListener('click', e => { e.stopPropagation(); _createPath(chain.id, null); });
      item.appendChild(addPathBtn);
    }

    list.appendChild(item);
  });

  list.scrollTop = _prevScrollTop;

  // Panneau élargi seulement quand un chemin (voire un sous-chemin) est affiché —
  // inutile de garder la largeur "chemin" une fois tout replié. Largeur posée en
  // style inline, PAS via une classe : #routes-panel est surveillé par un
  // MutationObserver sur son attribut class (voir plus bas, pour rafraîchir la
  // liste à l'ouverture/fermeture du panneau) — y toucher ici relançait
  // renderRoutesList() une seconde fois juste après celui-ci, détruisant l'élément
  // qu'un scrollIntoView en cours essayait justement d'atteindre.
  const panel = document.getElementById('routes-panel');
  if (panel) {
    panel.style.width = (_maxRenderedPathDepth >= 2 ? 420 : _maxRenderedPathDepth === 1 ? 400 : 350) + 'px';
  }
}

// ── Trace ─────────────────────────────────────────────────────

function traceRoute(chainId) {
  // Une seule route active à la fois : en lancer une remplace toute autre route déjà
  // en cours d'animation, au lieu de s'y ajouter (même principe que "le dernier
  // déclenchement l'emporte" déjà appliqué entre route/chemin/segment isolés).
  _activeRoutes.clear();
  _activeRoutes.add(chainId);
  _updateTrace(); _restartAnimation();
}

// Exception assumée à la règle "une seule route animée à la fois" (voir traceRoute) :
// le double-clic sur le titre du panneau lance TOUTES les routes ensemble, pour avoir
// une vue d'ensemble du flux sur tout le canevas. Re-double-cliquer arrête tout.
// L'infrastructure d'animation gère déjà nativement plusieurs routes en parallèle
// (startFlowAnimation prend un tableau) — seul traceRoute imposait la limite.
function traceAllRoutes() {
  const allIds = APP.chains.map(c => c.id);
  if (!allIds.length) return;
  const allActive = allIds.every(id => _activeRoutes.has(id));
  _activeRoutes.clear();
  if (!allActive) allIds.forEach(id => _activeRoutes.add(id));
  _updateTrace();
  if (_activeRoutes.size) _restartAnimation(); else stopFlowAnimation();
  renderRoutesList();
}

function clearRouteTrace(chainId) {
  if (chainId) _activeRoutes.delete(chainId);
  else         _activeRoutes.clear();
  _updateTrace();
  if (!_activeRoutes.size) stopFlowAnimation();
  else _restartAnimation();
  if (document.getElementById('routes-panel')?.classList.contains('open')) renderRoutesList();
}

// Câbles/appareils impliqués dans une liste de segments (tronc, chemin, sous-arbre
// entier...) — même calcul que celui utilisé par _updateTrace pour les routes,
// factorisé ici pour être réutilisable pour un segment ou un chemin isolés.
function _segsToIds(segs) {
  const cabIds = new Set(), nodeIds = new Set(), portIds = new Set();
  (segs || []).forEach(seg => {
    cabIds.add(seg.cableId);
    const c = APP.cables.find(x => x.id === seg.cableId);
    if (c) {
      nodeIds.add(c.from); nodeIds.add(c.to);
      // "nodeId:portId" — un appareil à plusieurs ports doubles ne doit montrer que
      // le triangle du port réellement emprunté, pas tous ceux de l'appareil.
      if (c.from_port) portIds.add(`${c.from}:${c.from_port}`);
      if (c.to_port)   portIds.add(`${c.to}:${c.to_port}`);
    }
  });
  return { cabIds, nodeIds, portIds };
}

// Vrai si un estompage de canevas est actuellement actif — route, segment ou
// chemin isolés — peu importe lequel. cables.js (survol) s'en sert pour savoir
// s'il doit laisser un câble estompé tranquille plutôt que de le raviver/afficher
// son info-bulle ; ne vérifiait jusqu'ici que _activeRoutes, donc ignorait les
// deux nouvelles animations isolées (elles ne touchent pas _activeRoutes).
function _isDimmingActive() {
  return _activeRoutes.size > 0 || _segAnim.cableId != null || _tracedPathId != null;
}

// Applique l'estompage du canevas pour un ensemble donné de câbles/appareils
// « actifs » — le reste (câbles, triangles de jonction, nœuds, étiquettes) passe
// en retrait. cabIds vide = tout remettre à l'opacité normale (aucune route/segment/
// chemin en cours). Utilisé par _updateTrace (route entière) et par les animations
// de segment/chemin isolés, pour le même effet de mise en avant.
function _applyCanvasDim(cabIds, nodeIds, portIds = new Set()) {
  if (!cabIds.size) {
    document.querySelectorAll('#cables-svg .cable-visual').forEach(p => {
      p.removeAttribute('filter'); p.setAttribute('stroke-width', '3.5'); p.setAttribute('opacity', '0.85');
      // Fin de route : ne pas laisser un câble protégé du survol pour toujours
      // (voir plus bas — ce marqueur sert aussi à ignorer le survol pendant une route active).
      delete p.dataset.selected;
    });
    document.querySelectorAll('#cables-svg .junction-marker').forEach(g => g.removeAttribute('opacity'));
    Object.keys(APP.nodes).forEach(nid => {
      document.getElementById(`n-${nid}`)?.classList.remove('dim', 'route-dim');
      document.getElementById(`nl-${nid}`)?.classList.remove('dim', 'route-dim');
    });
    // Remet TOUS les câbles à l'opacité de repos ci-dessus, sans jamais consulter le
    // filtre catégorie/câble/zone actif — contrairement à clearSel() (select.js), qui
    // fait le même genre de remise à zéro mais rappelle applyCanvasFilters() ensuite.
    // Sans cet appel, ouvrir la modale d'export (n'importe quel onglet, voir
    // _eroUpdateModalMode dans exportmenu.js) réaffichait tous les câbles masqués par
    // un filtre actif, jusqu'au prochain clic sur le canevas.
    if (typeof applyCanvasFilters === 'function') applyCanvasFilters();
    return;
  }

  // Halo (filter url(#glow)) désactivé par défaut sur les câbles actifs : ce flou SVG doit
  // être recomposé à chaque changement d'échelle (zoom), coût qui grandit avec le nombre de
  // câbles actifs en même temps — mesuré à ~85% d'amélioration sur "toutes les routes" +
  // zoom une fois retiré. L'épaisseur/opacité suffit à distinguer un câble actif à l'œil.
  // Pas supprimé : réactivable via window._xCableGlow = true dans la console (décision pas
  // définitive, cf. le compromis "coupé seulement pendant le zoom" jamais rendu fiable).
  const _cableGlow = window._xCableGlow === true;
  const _differerHalo = _cableGlow && window._xAnimPrewarm !== false;
  clearTimeout(_dimGlowTimer);
  document.querySelectorAll('#cables-svg .cable-visual').forEach(p => {
    const cid = +p.dataset.cid;
    const hit = _svg?.querySelector(`.cable-hit[data-cid="${cid}"]`);
    if (cabIds.has(cid)) {
      p.setAttribute('stroke-width', '4.5'); p.setAttribute('opacity', '0.97');
      if (_cableGlow && !_differerHalo) p.setAttribute('filter', 'url(#glow)');
      // Même marqueur que la sélection de câble/nœud (cables.js, select.js) : le survol
      // (mouseenter dans cables.js) l'ignore déjà pour ne pas raviver un câble mis en avant.
      // Sans ça, survoler un câble HORS route pendant l'animation le ramenait à pleine opacité.
      p.dataset.selected = '1';
      if (hit) hit.style.pointerEvents = '';
    } else {
      p.removeAttribute('filter'); p.setAttribute('stroke-width', '3.5'); p.setAttribute('opacity', '0.03');
      delete p.dataset.selected;
      // Sans ça, le curseur changeait encore et le câble restait cliquable au survol,
      // même hors route pendant l'animation — la bande de capture est un tracé séparé
      // du trait visible, sa propre visibilité ne suit jamais l'opacity toute seule.
      if (hit) hit.style.pointerEvents = 'none';
    }
  });
  if (_differerHalo) {
    _dimGlowTimer = setTimeout(() => {
      document.querySelectorAll('#cables-svg .cable-visual[data-selected="1"]')
        .forEach(p => p.setAttribute('filter', 'url(#glow)'));
    }, 220);
  }
  // Triangles de jonction (ports doubles) : estompés/rallumés au niveau du PORT
  // précis, pas juste de l'appareil — un appareil à plusieurs ports doubles ne doit
  // montrer que le triangle du port réellement emprunté par l'animation en cours,
  // pas tous ceux de l'appareil (nodeIds ne suffit pas à cette granularité).
  document.querySelectorAll('#cables-svg .junction-marker').forEach(g => {
    const nid = g.dataset.nodeId, pid = g.dataset.portId;
    const key = (nid && pid) ? `${nid}:${pid}` : null;
    g.setAttribute('opacity', (key && portIds.has(key)) ? '1' : '0.03');
  });
  Object.keys(APP.nodes).forEach(nid => {
    const el = document.getElementById(`n-${nid}`);
    if (!el) return;
    // L'étiquette (nl-*) vit dans node-labels-layer, hors de .node : elle doit
    // recevoir les mêmes classes, sinon elle reste lumineuse quand le nœud s'estompe.
    const lbl = document.getElementById(`nl-${nid}`);
    el.classList.remove('dim', 'route-dim');
    lbl?.classList.remove('dim', 'route-dim');
    if (!nodeIds.has(nid)) {
      el.classList.add('route-dim');
      lbl?.classList.add('route-dim');
    }
  });
}

function _updateTrace() {
  const allSegs = [];
  _activeRoutes.forEach(cid => {
    const ch = APP.chains.find(c => c.id === cid);
    if (ch) allSegs.push(..._allChainSegments(ch));
  });
  const { cabIds, nodeIds, portIds } = _segsToIds(allSegs);
  _applyCanvasDim(cabIds, nodeIds, portIds);
}

function _restartAnimation() {
  stopFlowAnimation();
  // Symétrique de _toggleSegAnimation/_tracePathAnimation : (re)lancer l'animation
  // de route reprend la main sur une éventuelle animation de segment ou de chemin
  // isolé laissée en cours.
  _stopSegAnimation();
  _tracedPathId = null;
  if (!_activeRoutes.size) return;
  const chains = [..._activeRoutes].map(id => APP.chains.find(c => c.id === id)).filter(Boolean);
  startFlowAnimation(chains);
}

function _isPathAnimating(pathId) { return _tracedPathId === pathId; }

// Déplie un chemin ET tout son sous-arbre — utilisé au double-clic, pour que
// l'intégralité de ce qui anime (tout le sous-arbre, voir _tracePathAnimation)
// soit visible d'un coup, pas seulement le chemin cliqué lui-même.
function _expandPathSubtree(path) {
  _expandedPaths.add(path.id);
  (path.paths || []).forEach(_expandPathSubtree);
}

// Anime tout le sous-arbre d'UN chemin (ou sous-chemin) en isolation — mêmes
// mécaniques que l'animation d'une route (particules multiples si sous-chemins,
// surlignage jaune, clignotement sans fil), juste réutilisées via un objet
// « chaîne synthétique » ne portant que ce sous-arbre. startFlowAnimation() coupe
// déjà toute animation de route/chemin précédente (RAF partagé) ; le segment isolé
// est coupé explicitement, comme pour une route.
function _tracePathAnimation(chain, path) {
  _stopSegAnimation();
  const synthetic = { id: chain.id, color: chain.color, segments: path.segments || [], paths: path.paths || [] };
  startFlowAnimation([synthetic]);
  _tracedPathId = path.id;
  // Isole visuellement tout le sous-arbre de ce chemin sur le canevas, comme une
  // route active le fait pour elle-même — _allChainSegments fonctionne tel quel
  // sur un chemin (mêmes champs segments/paths qu'une route).
  const { cabIds, nodeIds, portIds } = _segsToIds(_allChainSegments(path));
  _applyCanvasDim(cabIds, nodeIds, portIds);
}

function _clearPathAnimation() {
  stopFlowAnimation();
  _tracedPathId = null;
  _updateTrace(); // restaure l'estompage normal (route active, ou rien)
}

// ── Animation flux ────────────────────────────────────────────
// 1 train par feuille (tronc + branch).
// Les particules partent de la source et arrivent à la destination,
// dans l'ordre des segments (logique de signal).
// Sur le tronc partagé plusieurs trains se superposent : correct.

// Pose différée du halo sur les câbles mis en avant (voir _applyCanvasDim).
let _dimGlowTimer = null;

function _hexRgba(hex, a) {
  const v = parseInt((hex || '#ffffff').replace('#', ''), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}

// Durée programmée de la lueur d'un appareil traversé.
const GLOW_MS = 2000;
// Durée réellement PERÇUE : l'atténuation est en ease-out, la fin du fondu est
// invisible bien avant la fin de l'animation. C'est cette valeur, et non GLOW_MS, que
// la boucle attend avant de relancer un tour — sinon la pause paraît deux fois trop
// longue, l'écran restant figé sur une lueur qu'on ne voit déjà plus.
const GLOW_VISIBLE_MS = 1000;

// Calque de lueur : une copie de la boîte de l'appareil, glissée DERRIÈRE lui. Elle ne
// sert que de source à l'ombre portée — étant identique et parfaitement alignée, elle
// reste invisible et seul son halo dépasse. L'ombre ne peut pas être portée par la boîte
// elle-même : il faudrait alors animer l'opacité de celle-ci, donc faire disparaître
// l'appareil en même temps que le halo.
// La copie est faite à la première lueur puis conservée sur le nœud : une route rallume
// toujours les mêmes appareils, elle n'est donc construite qu'une fois. Elle est refaite
// si la boîte a changé de taille ou d'image entre-temps (redimensionnement, appareil
// modifié) — sinon le halo garderait l'ancienne silhouette.
function _glowLayer(el, box) {
  const img = box.querySelector('img');
  const sig = `${box.style.width}|${box.style.height}|${img ? img.src.length : 0}`;
  let g = el._glowLayer;
  if (g && g.isConnected && g._sig === sig && g._srcImg === img) return g;
  g?.remove();
  g = box.cloneNode(true);
  g.className = 'node-glow';           // perd les styles de .node-box, voir .node-glow en CSS
  g._sig = sig;
  g._srcImg = img;
  // Ajoutée EN DERNIER, jamais en premier : la copie contient elle aussi un
  // `.node-img-wrap`, et le redimensionnement d'un appareil va chercher le sien par
  // `el.querySelector('.node-img-wrap')` (voir nodes.js). Placée devant, la copie serait
  // trouvée à sa place et la vraie image ne serait plus jamais retaillée.
  // L'ordre du DOM n'a aucune incidence sur l'affichage : c'est le z-index négatif de
  // .node-glow qui la maintient derrière l'appareil.
  el.appendChild(g);
  el._glowLayer = g;
  return g;
}

// Le PREMIER allumage d'un appareil coûte bien plus cher que les suivants : il faut
// construire son calque, puis peindre son halo pour la première fois. Payé en pleine
// animation, ce coût tombe à un endroit fixe du parcours, une fois par appareil, et se
// voit. Payé ici, à l'arrêt, juste avant que le mouvement démarre, il ne se voit pas.
// window._xAnimPrewarm = false rétablit la construction au fil de l'eau.
function _prewarmGlowLayers(trains) {
  if (window._xAnimPrewarm === false || window._xGlowComposite === false) return;
  const faits = new Set();
  (trains || []).forEach(tr => (tr.resolved || []).forEach(r => {
    [r.fromId, r.toId].forEach(nid => {
      if (!nid || faits.has(nid)) return;
      faits.add(nid);
      const el  = document.getElementById(`n-${nid}`);
      const box = el?.querySelector('.node-box');
      if (!box) return;
      const g = _glowLayer(el, box);
      if (!g) return;
      const c = _hexRgba(r.color, 0.9);
      g.style.filter = `drop-shadow(0 0 24px ${c}) drop-shadow(0 0 8px ${c})`;
      // Assez pour que le navigateur peigne réellement le halo — une opacité nulle ne
      // peint rien du tout — et bien trop peu pour que l'œil le distingue.
      g.style.opacity = '0.004';
    });
  }));
  // Le halo est peint : le calque peut retomber à l'opacité nulle de sa règle CSS.
  requestAnimationFrame(() => faits.forEach(nid => {
    const g = document.getElementById(`n-${nid}`)?._glowLayer;
    if (g) g.style.opacity = '';
  }));
}

// Sécurité anti-régression : window._xGlowComposite = false depuis la console rétablit
// l'ancienne animation (interpolation du filtre sur la boîte), sans relancer l'application.
function _glowNode(nid, color) {
  const el = document.getElementById(`n-${nid}`);
  if (!el) return;
  const box = el.querySelector('.node-box');
  if (!box) return;
  const c0 = _hexRgba(color, 0);
  const c1 = _hexRgba(color, 0.9);
  if (window._xFlowLog) _flowLogMark(1);

  if (window._xGlowComposite === false) {
    if (box._glowAnim) { try { box._glowAnim.cancel(); } catch {} }
    box._glowAnim = box.animate([
      { filter: `drop-shadow(0 0 0px ${c0})`,                                             offset: 0    },
      { filter: `drop-shadow(0 0 24px ${c1}) drop-shadow(0 0 8px ${c1})`,                offset: 0.15 },
      { filter: `drop-shadow(0 0 0px ${c0})`,                                             offset: 1    },
    ], { duration: GLOW_MS, easing: 'ease-out' });
    box._glowAnim.onfinish = () => { box._glowAnim = null; };
    return;
  }

  // L'ancienne version faisait varier le rayon du flou (0 → 24px → 0) EN MÊME TEMPS que
  // l'opacité. Or `filter` est une des rares propriétés que le compositeur ne sait pas
  // prendre en charge : chaque image obligeait le thread principal à recalculer le style,
  // recréer la surface de rendu de l'appareil et reconstruire la liste des couches
  // graphiques — l'outil Performance attribuait un tiers de tout le temps de l'animation
  // à cette seule reconstruction (« Layerize »).
  // Ici le flou est posé une fois pour toutes et seule l'OPACITÉ est animée : elle part
  // sur le GPU et ne coûte plus rien à chaque image. Contrepartie assumée : le halo
  // n'enfle plus, il apparaît à son rayon maximum et se contente de s'allumer et de
  // s'éteindre. Même couleur, même durée, même courbe.
  const g = _glowLayer(el, box);
  if (!g) return;
  if (g._glowAnim) { try { g._glowAnim.cancel(); } catch {} }
  g.style.filter = `drop-shadow(0 0 24px ${c1}) drop-shadow(0 0 8px ${c1})`;
  // Pas de `onfinish` à nettoyer : l'animation ne remplit pas son état final (`fill` par
  // défaut), le calque revient donc seul à l'opacité nulle de sa règle CSS.
  g._glowAnim = g.animate([
    { opacity: 0, offset: 0    },
    { opacity: 1, offset: 0.15 },
    { opacity: 0, offset: 1    },
  ], { duration: GLOW_MS, easing: 'ease-out' });
}

// Équivalent de _glowNode() pour un segment sans fil (pas de tracé à faire voyager
// une particule dessus) : les DEUX ports (émetteur + récepteur) clignotent en boucle
// en ALTERNANCE (l'un ON pendant que l'autre est OFF, et inversement) tant que le
// signal est dans ce segment — démarré à l'entrée (voir startFlowAnimation), arrêté
// par _stopBlinkWirelessPorts à la sortie du segment (changement de segment ou fin
// du train).
function _blinkWirelessPorts(fromNodeId, fromPortId, toNodeId, toPortId) {
  if (window._xFlowLog) _flowLogMark(8);
  [
    [fromNodeId, fromPortId, false], // émetteur : ON en premier
    [toNodeId,   toPortId,   true ], // récepteur : OFF en premier (phase inversée)
  ].forEach(([nid, pid, inverted]) => {
    if (!nid || !pid) return;
    const dot = document.querySelector(`.port-dot-node[data-node-id="${nid}"][data-port-id="${pid}"]`);
    if (!dot) return;
    if (dot._blinkAnim) { try { dot._blinkAnim.cancel(); } catch {} }
    // Allumé/éteint franc (pas de fondu) : deux repères par palier pour forcer un saut
    // net d'opacité plutôt que l'interpolation lissée par défaut entre repères.
    const onV = inverted ? 0 : 1, offV = inverted ? 1 : 0;
    dot._blinkAnim = dot.animate(
      [
        { opacity: onV,  offset: 0    },
        { opacity: onV,  offset: 0.49 },
        { opacity: offV, offset: 0.5  },
        { opacity: offV, offset: 0.99 },
        { opacity: onV,  offset: 1    },
      ],
      { duration: 600, iterations: Infinity }
    );
  });
}

function _stopBlinkWirelessPorts(fromNodeId, fromPortId, toNodeId, toPortId) {
  if (window._xFlowLog) _flowLogMark(16);
  [[fromNodeId, fromPortId], [toNodeId, toPortId]].forEach(([nid, pid]) => {
    if (!nid || !pid) return;
    const dot = document.querySelector(`.port-dot-node[data-node-id="${nid}"][data-port-id="${pid}"]`);
    if (!dot || !dot._blinkAnim) return;
    try { dot._blinkAnim.cancel(); } catch {}
    dot._blinkAnim = null;
  });
}

// Simule visuellement une onde WiFi (3 arcs concentriques, sans point central,
// orientés dans le sens du trajet) qui parcourt la ligne droite entre les 2 ports
// d'un lien sans fil, en plus du clignotement des ports (_blinkWirelessPorts) —
// pas à sa place. Clignote elle aussi (même principe WAAPI, allumé/éteint franc).
function _makeWaveEl(svg, color) {
  if (window._xFlowLog) _flowLogMark(2);
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.classList.add('wireless-wave');
  g.style.pointerEvents = 'none';
  [6, 11, 16].forEach(r => {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', `M 0,${-r} A ${r},${r} 0 0 1 0,${r}`);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', color);
    p.setAttribute('stroke-width', '2.5');
    p.setAttribute('stroke-linecap', 'round');
    g.appendChild(p);
  });
  svg.appendChild(g);
  g._blinkAnim = g.animate(
    [
      { opacity: 1, offset: 0    },
      { opacity: 1, offset: 0.49 },
      { opacity: 0, offset: 0.5  },
      { opacity: 0, offset: 0.99 },
      { opacity: 1, offset: 1    },
    ],
    { duration: 600, iterations: Infinity }
  );
  return g;
}

// frac: 0 (au port source de ce segment) → 1 (au port destination), déjà orienté
// selon r.dir (voir appelants) — l'onde suit donc le sens réel du signal.
function _updateWavePos(g, srcX, srcY, dstX, dstY, frac) {
  if (!g) return;
  const x = srcX + (dstX - srcX) * frac;
  const y = srcY + (dstY - srcY) * frac;
  const angleDeg = Math.atan2(dstY - srcY, dstX - srcX) * 180 / Math.PI;
  g.setAttribute('transform', `translate(${x},${y}) rotate(${angleDeg})`);
}

function _removeWaveEl(g) {
  if (!g) return;
  if (window._xFlowLog) _flowLogMark(4);
  try { g._blinkAnim?.cancel(); } catch {}
  g.remove();
}

// Résout une liste de segments (tronc, path, ou épilogue) en tronçons animables
// (tracé SVG ou longueur virtuelle sans fil) + longueur cumulée. Partagé entre
// les trains de chemins et le train d'épilogue (voir startFlowAnimation).
function _resolveSegsForAnim(chain, segs, svg) {
  const resolved = segs.map(seg => {
    const cable = APP.cables.find(c => c.id === seg.cableId);
    const color = cable?.color || chain.color;
    // Segment sans fil : pas de tracé SVG à suivre — longueur virtuelle = distance
    // à vol d'oiseau entre les deux ports, injectée dans le même calcul de vitesse
    // partagée que les segments physiques (un lien entre appareils éloignés dure
    // donc plus longtemps qu'entre appareils proches, comme un câble long vs court).
    if (cable && typeof WIRELESS_TYPES !== 'undefined' && WIRELESS_TYPES.has(cable.type)) {
      const fromNode = APP.nodes[cable.from], toNode = APP.nodes[cable.to];
      const fromPort = fromNode?.ports?.find(p => p.id === cable.from_port);
      const toPort   = toNode?.ports?.find(p => p.id === cable.to_port);
      if (!fromNode || !toNode || !fromPort || !toPort) return null;
      const [fx, fy] = edgePtFixed(fromNode, fromPort.nx, fromPort.ny);
      const [tx, ty] = edgePtFixed(toNode, toPort.nx, toPort.ny);
      const length = Math.max(1, Math.hypot(tx - fx, ty - fy));
      return {
        seg, path: null, cableId: cable.id, length, dir: seg.dir, color,
        fromId: cable.from, toId: cable.to, wireless: true,
        fromPortId: cable.from_port, toPortId: cable.to_port,
        fx, fy, tx, ty, // position des 2 ports — pour l'onde qui parcourt la ligne droite entre eux
      };
    }
    const path = svg.querySelector(`.cable-visual[data-cid="${seg.cableId}"]`);
    let length = 0;
    try { if (path) length = path.getTotalLength(); } catch {}
    return {
      seg, path, cableId: seg.cableId, length, dir: seg.dir, color,
      fromId: cable?.from ?? null, toId: cable?.to ?? null, wireless: false,
      fromPortId: cable?.from_port ?? null, toPortId: cable?.to_port ?? null,
    };
  }).filter(r => r && ((r.wireless && r.length > 0) || (r.path && r.length > 0)));

  if (!resolved.length) return null;
  const total = resolved.reduce((a, r) => a + r.length, 0);
  if (!total) return null;

  let cumul = 0;
  const cumuls = resolved.map(r => { const c = cumul; cumul += r.length; return c; });
  return { resolved, cumuls, total };
}

// Calque qui ACCUEILLE les points lumineux et les ondes — à ne pas confondre avec
// #cables-svg, qui reste celui où on LIT les tracés des câbles (_resolveSegsForAnim).
// Les deux ont la même géométrie, les coordonnées passent donc de l'un à l'autre sans
// conversion.
// Sécurité anti-régression : window._xFlowOverlay = false remet les points dans le SVG
// des câbles, comme avant, et rend au calque inutilisé sa transparence de couche.
function _flowSvg() {
  const overlay = document.getElementById('flow-svg');
  const on = window._xFlowOverlay !== false;
  overlay?.classList.toggle('off', !on);
  return (on && overlay) || document.getElementById('cables-svg');
}

// Déplacer un point lumineux. Changer ses coordonnées (cx/cy) revient à dire au
// navigateur que la forme n'est plus la même : il la redessine, et recalcule son halo,
// à chaque image. Un DÉCALAGE ne redessine rien — la forme et son halo, calculés une
// fois, sont simplement replacés par la carte graphique. C'est le même principe que pour
// la lueur des appareils : remplacer ce que la carte ne sait pas prendre en charge par
// ce qu'elle sait faire.
// Sécurité anti-régression : window._xFlowTransform = false rétablit le déplacement par
// coordonnées. Le basculement est propre dans les deux sens, même en pleine animation.
function _moveParticle(el, x, y) {
  const parDecalage = window._xFlowTransform !== false;
  if (el._parDecalage !== parDecalage) {
    el._parDecalage = parDecalage;
    if (parDecalage) { el.setAttribute('cx', '0'); el.setAttribute('cy', '0'); }
    else if (el.style.transform) el.style.transform = '';   // rien à effacer s'il n'y en a pas
  }
  if (parDecalage) el.style.transform = `translate(${x}px,${y}px)`;
  else { el.setAttribute('cx', x); el.setAttribute('cy', y); }
}

function _makeParticleEl(svg) {
  // Un seul point lumineux par train
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  el.classList.add('flow-particle');
  el.setAttribute('r', '8');   // rayon +30% (6 → 8)
  el.setAttribute('opacity', '1');
  if (window._xFlowTransform !== false) {
    el.setAttribute('cx', '0');
    el.setAttribute('cy', '0');
    el._parDecalage = true;
    // Sa propre couche graphique : le décalage devient alors l'affaire de la carte
    // graphique seule, sans repasser par le navigateur.
    el.style.willChange = 'transform';
  }
  // Le halo suit le calque : chaque SVG a sa propre copie du filtre, aucun des deux ne
  // dépend de l'autre (voir index.html).
  el.setAttribute('filter', svg?.id === 'flow-svg' ? 'url(#glow-flow)' : 'url(#glow)');
  el.style.pointerEvents = 'none';
  svg.appendChild(el);
  return el;
}

// Animation isolée d'un seul segment (double-clic dans le panneau Routes) — même
// mécanique visuelle que le train d'une route (particule le long du tracé, ou
// clignotement des ports pour du sans-fil), mais bouclée indéfiniment sur ce seul
// segment, indépendamment de toute route active. Un seul segment isolé à la fois.
const _segAnim = { cableId: null, rafId: null, el: null, waveEl: null, r: null, total: 0, startTs: null, lastD: 0 };

function _isSegAnimating(cableId) { return _segAnim.cableId === cableId; }

function _stopSegAnimation() {
  if (_segAnim.cableId == null) return;
  cancelAnimationFrame(_segAnim.rafId);
  _segAnim.el?.remove();
  _removeWaveEl(_segAnim.waveEl);
  if (_segAnim.r?.wireless) {
    _stopBlinkWirelessPorts(_segAnim.r.fromId, _segAnim.r.fromPortId, _segAnim.r.toId, _segAnim.r.toPortId);
  }
  _segAnim.cableId = null; _segAnim.rafId = null; _segAnim.el = null; _segAnim.waveEl = null; _segAnim.r = null;
  _segAnim._pauseRef = null;
  _animPaused = false; // ne pas hériter de la pause sur la prochaine animation lancée
}

function _toggleSegAnimation(seg, chain) {
  if (_isSegAnimating(seg.cableId)) {
    _stopSegAnimation();
    _updateTrace(); // restaure l'estompage normal (route active, ou rien)
    // Reprend l'animation de route mise en pause (si une route est toujours active).
    if (_activeRoutes.size) _restartAnimation();
    renderRoutesList(); // efface le surlignage jaune de ce segment
    return;
  }
  // Le dernier double-clic l'emporte : coupe la particule de route/chemin en cours
  // (sans désactiver la route — _activeRoutes reste inchangé) et isole ce seul
  // segment visuellement sur le canevas, comme une route active le fait pour elle.
  stopFlowAnimation();
  _tracedPathId = null;
  _stopSegAnimation(); // un seul segment isolé animé à la fois
  const svg  = document.getElementById('cables-svg'); // où on LIT les tracés
  const flow = _flowSvg();                            // où on POSE le point lumineux
  const rt  = _resolveSegsForAnim(chain, [seg], svg);
  if (!rt || !rt.resolved.length) return;
  const r  = rt.resolved[0];
  const { cabIds, nodeIds, portIds } = _segsToIds([seg]);
  _applyCanvasDim(cabIds, nodeIds, portIds);
  const el = _makeParticleEl(flow);
  _segAnim.cableId = seg.cableId;
  _segAnim.el      = el;
  _segAnim.r       = r;
  _segAnim.total   = rt.total;
  _segAnim.startTs = null;
  _segAnim.lastD   = 0;

  const srcNid = r.dir === 'fwd' ? r.fromId : r.toId;
  const dstNid = r.dir === 'fwd' ? r.toId   : r.fromId;
  if (srcNid) _glowNode(srcNid, r.color);
  if (r.wireless) {
    _blinkWirelessPorts(r.fromId, r.fromPortId, r.toId, r.toPortId);
    _segAnim.waveEl = _makeWaveEl(flow, r.color);
  }
  const srcPt = r.dir === 'fwd' ? [r.fx, r.fy] : [r.tx, r.ty];
  const dstPt = r.dir === 'fwd' ? [r.tx, r.ty] : [r.fx, r.fy];

  function tick(ts) {
    if (_segAnim.cableId !== seg.cableId) return; // arrêté entre-temps
    // Pause (Espace) : ce calcul se fait en temps absolu (ts - startTs), contrairement
    // au tick de route (delta accumulé) — sans compensation, la reprise ferait un bond
    // en avant de toute la durée de la pause. _pauseRef suit le dernier ts vu pendant
    // le gel ; à la reprise, on décale startTs d'autant pour annuler l'écart.
    if (_animPaused) {
      _segAnim._pauseRef = ts;
      _segAnim.rafId = requestAnimationFrame(tick);
      return;
    }
    if (_segAnim._pauseRef != null) {
      _segAnim.startTs += ts - _segAnim._pauseRef;
      _segAnim._pauseRef = null;
    }
    if (_segAnim.startTs == null) _segAnim.startTs = ts;
    const d = ((ts - _segAnim.startTs) * RELAY_SPEED) % _segAnim.total;
    if (d < _segAnim.lastD && dstNid) _glowNode(dstNid, r.color); // boucle terminée : arrivée
    _segAnim.lastD = d;
    if (r.wireless) {
      _moveParticle(el, -9999, -9999);
      _updateWavePos(_segAnim.waveEl, srcPt[0], srcPt[1], dstPt[0], dstPt[1], _segAnim.total > 0 ? d / _segAnim.total : 0);
    } else {
      const dOnPath = r.dir === 'fwd' ? d : r.length - d;
      try {
        const pt = r.path.getPointAtLength(Math.max(0, Math.min(r.length, dOnPath)));
        _moveParticle(el, pt.x, pt.y);
        // La couleur ne change qu'au passage d'un câble à l'autre : la réécrire à chaque
        // image redemanderait un redessin pour rien.
        if (el._fill !== r.color) { el._fill = r.color; el.setAttribute('fill', r.color); }
      } catch {}
    }
    _segAnim.rafId = requestAnimationFrame(tick);
  }
  _segAnim.rafId = requestAnimationFrame(tick);
  renderRoutesList(); // surligne ce segment en jaune dans le panneau
}

// ── Journal des images (mode debug) ───────────────────────────
// window._xFlowLog = true, puis relancer l'animation : chaque image est horodatée avec
// la distance parcourue par les points. _flowLogDump() rend le rapport et le copie dans
// le presse-papier.
// Ce que ça départage : une machine qui plafonne donne des intervalles LONGS mais
// RÉGULIERS (33 ms partout = 30 images/s tenues) ; un programme qui hoquette donne des
// intervalles courts entrecoupés de PICS (16 ms, 16 ms, 90 ms, 16 ms...). Deux causes
// différentes, deux correctifs différents — et l'œil ne sait pas les distinguer.
const FLOW_LOG_MAX = 4000;                    // ~66 s à 60 images/s
const _flowLogTs = new Float64Array(FLOW_LOG_MAX);
const _flowLogD  = new Float64Array(FLOW_LOG_MAX);
const _flowLogE  = new Uint8Array(FLOW_LOG_MAX);   // ce qui s'est passé sur l'image
const _flowLogDu = new Float32Array(FLOW_LOG_MAX); // temps passé DANS l'animation
// Où se trouvait le point lumineux sur le canevas, et sur quel câble. Les blocages
// tombent toujours aux mêmes endroits du parcours : reste à savoir ce qu'il y a à ces
// endroits-là. Ces trois colonnes le disent.
const _flowLogX = new Float32Array(FLOW_LOG_MAX);
const _flowLogY = new Float32Array(FLOW_LOG_MAX);
const _flowLogC = new Float64Array(FLOW_LOG_MAX);
let _flowLogN = 0;

// Un bit par événement de l'animation. Savoir QUAND ça bloque ne suffit pas : il faut
// savoir ce qui se jouait sur l'image qui a bloqué. Le rapport compare ensuite la
// fréquence de chaque événement sur les images normales et sur les blocages — un écart
// franc désigne le coupable sans qu'on ait à le deviner.
const FLOW_EV = [
  [1,   'lueur d appareil'],
  [2,   'onde sans fil creee'],
  [4,   'onde sans fil retiree'],
  [8,   'clignotement demarre'],
  [16,  'clignotement arrete'],
  [32,  'train arrive'],
  [64,  'fin de cycle'],
  [128, 'changement de segment'],
];

// Deux écritures dans un tableau typé par image : rien qui puisse fausser la mesure.
// d < 0 marque une image jouée pendant la pause de fin de cycle, où rien n'avance —
// ces images-là ne comptent pas dans les intervalles, elles ne représentent pas la charge.
function _flowLogFrame(ts, d) {
  if (_flowLogN >= FLOW_LOG_MAX) return;
  _flowLogTs[_flowLogN] = ts;
  _flowLogD[_flowLogN]  = d;
  _flowLogE[_flowLogN]  = 0;
  _flowLogDu[_flowLogN] = 0;
  // Remis à zéro aussi : les tableaux sont réutilisés d'un enregistrement à l'autre, et
  // une image sans position réelle (tous les trains hors parcours) hériterait sinon de
  // la position d'une image de la série précédente.
  _flowLogX[_flowLogN] = 0;
  _flowLogY[_flowLogN] = 0;
  _flowLogC[_flowLogN] = -1;
  _flowLogN++;
}

// Temps réellement passé dans la boucle d'animation sur cette image. C'est la mesure
// qui départage les deux dernières causes possibles : si l'animation ne prend que
// deux millisecondes alors que l'image suivante arrive 80 ms plus tard, le retard s'est
// produit AILLEURS — thread principal occupé par autre chose, ou étage graphique en
// retard. Si au contraire elle prend 80 ms, le coupable est ici.
function _flowLogDurMs(ms) {
  if (_flowLogN > 0) _flowLogDu[_flowLogN - 1] = ms;
}

function _flowLogPos(x, y, cableId) {
  if (_flowLogN === 0) return;
  _flowLogX[_flowLogN - 1] = x;
  _flowLogY[_flowLogN - 1] = y;
  _flowLogC[_flowLogN - 1] = typeof cableId === 'number' ? cableId : -1;
}

// Appelé APRÈS _flowLogFrame dans la même image : la marque atterrit donc bien sur
// l'image en cours.
function _flowLogMark(bit) {
  if (_flowLogN > 0) _flowLogE[_flowLogN - 1] |= bit;
}

function _flowLogReset() { _flowLogN = 0; }

function _flowLogDump() {
  if (_flowLogN < 3) {
    return "Journal vide. Fais : window._xFlowLog = true, relance l'animation, attends 15 s, puis _flowLogDump()";
  }
  // Intervalles entre deux images CONSÉCUTIVES et toutes deux actives.
  const gaps = [], at = [], ev = [], du = [], di = [], xs = [], ys = [], cs = [];
  let holds = 0;
  for (let i = 1; i < _flowLogN; i++) {
    if (_flowLogD[i] < 0 || _flowLogD[i - 1] < 0) { holds++; continue; }
    gaps.push(_flowLogTs[i] - _flowLogTs[i - 1]);
    at.push(_flowLogTs[i] - _flowLogTs[0]);
    // Un retard est produit par le travail de l'image PRÉCÉDENTE, pas par celle qui
    // arrive en retard : c'est donc ses événements à elle qu'on retient.
    ev.push(_flowLogE[i - 1]);
    du.push(_flowLogDu[i - 1]);
    // Où en était le signal sur son parcours. C'est la SEULE référence comparable d'un
    // enregistrement à l'autre : l'horloge repart de zéro à chaque lancement, le parcours
    // non. Des blocages toujours au même endroit désigneraient une cause locale (un tracé,
    // un appareil) ; des positions dispersées, du bruit de fond sans rapport avec le projet.
    di.push(_flowLogD[i - 1]);
    xs.push(_flowLogX[i - 1]);
    ys.push(_flowLogY[i - 1]);
    cs.push(_flowLogC[i - 1]);
  }
  if (!gaps.length) return 'Journal sans image active — animation en pause tout du long ?';
  const sorted = [...gaps].sort((a, b) => a - b);
  const q   = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  const som = gaps.reduce((s, g) => s + g, 0);
  const pct = n => (100 * n / gaps.length).toFixed(1).padStart(5) + ' %';
  const buck = (lo, hi) => gaps.filter(g => g > lo && g <= hi).length;
  const over = ms => gaps.filter(g => g > ms).length;
  // La plus grande distance observée vaut la longueur d'un cycle, dès lors qu'un cycle
  // entier a été enregistré. Les positions sont donc données en pourcentage du parcours.
  const dMax = Math.max(1, ...di);
  const pos  = i => (100 * di[i] / dMax).toFixed(1).padStart(5) + ' %';
  const evNoms = m => FLOW_EV.filter(([b]) => m & b).map(([, n]) => n).join(' + ');
  // Combien d'images se sont écoulées depuis le dernier événement, quel qu'il soit.
  // Si les blocages tombent tous au même recul, la cause est différée, pas simultanée —
  // et c'est précisément ce qu'une transition CSS de 200 ms produirait.
  const depuis = i => {
    for (let k = i; k >= Math.max(0, i - 60); k--) if (ev[k]) return i - k;
    return -1;
  };
  const reculNom = i => {
    const n = depuis(i);
    return n < 0  ? 'aucun evenement dans les 60 images precedentes'
         : n === 0 ? `${evNoms(ev[i])} (sur cette image)`
         : `${evNoms(ev[i - n])} il y a ${n} img`;
  };
  const worst = gaps.map((g, i) => [g, i]).sort((a, b) => b[0] - a[0]).slice(0, 10)
    .map(([g, i]) => `    ${g.toFixed(1).padStart(7)} ms  a ${(at[i] / 1000).toFixed(2).padStart(6)} s`
                   + `   parcours ${pos(i)}`
                   + `   x=${xs[i].toFixed(0).padStart(5)} y=${ys[i].toFixed(0).padStart(5)}`
                   + `   cable ${String(cs[i]).padStart(4)}   ${reculNom(i)}`);
  // Fréquence de chaque événement sur les images normales et sur les blocages. Un écart
  // franc entre les deux colonnes désigne le coupable ; deux colonnes identiques
  // l'innocentent.
  const iLent = [], iNorm = [];
  gaps.forEach((g, i) => { if (g > 50) iLent.push(i); else if (g <= 20) iNorm.push(i); });
  const taux = (idx, bit) => idx.length ? 100 * idx.filter(i => ev[i] & bit).length / idx.length : 0;
  const correl = FLOW_EV.map(([bit, nom]) =>
    `  ${nom.padEnd(24)}${taux(iNorm, bit).toFixed(1).padStart(7)} %${taux(iLent, bit).toFixed(1).padStart(11)} %`);
  // Un événement déclenché sur une image peut coûter pendant les SUIVANTES : une
  // transition CSS de 200 ms s'étale sur douze images à 60 Hz, et c'est le navigateur,
  // pas l'animation, qui la joue. Corréler un blocage avec la seule image qui l'a
  // produit passe donc entièrement à côté de toute cause différée.
  const FENETRE = 12;
  const dansFenetre = (i, bit) => {
    for (let k = i; k >= Math.max(0, i - FENETRE); k--) if (ev[k] & bit) return true;
    return false;
  };
  const tauxF = (idx, bit) => idx.length
    ? 100 * idx.filter(i => dansFenetre(i, bit)).length / idx.length : 0;
  const correlF = FLOW_EV.map(([bit, nom]) =>
    `  ${nom.padEnd(24)}${tauxF(iNorm, bit).toFixed(1).padStart(7)} %${tauxF(iLent, bit).toFixed(1).padStart(11)} %`);
  // Temps passé dans la boucle contre temps total de l'image : ce qui reste s'est
  // produit hors de l'animation, et aucun correctif dans routes.js n'y changerait rien.
  const med = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
  const duNorm = iNorm.map(i => du[i]), duLent = iLent.map(i => du[i]);
  const gLent  = iLent.map(i => gaps[i]);
  // Un câble sur lequel le point passe peu mais bloque souvent est bien plus suspect
  // qu'un câble long sur lequel il bloque autant : on rapporte donc les blocages au
  // nombre d'images réellement passées dessus.
  const parCable = new Map();
  gaps.forEach((g, i) => {
    const e = parCable.get(cs[i]) || { n: 0, bloc: 0 };
    e.n++; if (g > 50) e.bloc++;
    parCable.set(cs[i], e);
  });
  const cables = [...parCable.entries()].filter(([, e]) => e.bloc)
    .sort((a, b) => (b[1].bloc / b[1].n) - (a[1].bloc / a[1].n))
    .map(([c, e]) => `  cable ${String(c).padStart(5)} : ${String(e.bloc).padStart(2)} blocage(s)`
                   + ` sur ${String(e.n).padStart(4)} images passees dessus`
                   + `   ${(100 * e.bloc / e.n).toFixed(1).padStart(5)} %`);
  const dedans = [
    'Temps passe DANS la boucle d animation',
    `  image normale  : mediane ${med(duNorm).toFixed(2)} ms   maxi ${(duNorm.length ? Math.max(...duNorm) : 0).toFixed(2)} ms`,
    ...(iLent.length ? [
      `  image bloquee  : mediane ${med(duLent).toFixed(2)} ms   maxi ${Math.max(...duLent).toFixed(2)} ms`,
      `  -> blocage median de ${med(gLent).toFixed(1)} ms dont ${med(duLent).toFixed(2)} ms d animation :`,
      `     ${(med(gLent) - med(duLent)).toFixed(1)} ms se sont passes HORS de l animation`,
    ] : []),
  ];
  const txt = [
    '=== Journal des images de l animation ===',
    `Images actives   : ${gaps.length + 1}   (+ ${holds} pendant les pauses de fin de cycle)`,
    `Duree            : ${(som / 1000).toFixed(2)} s`,
    `Cadence moyenne  : ${(1000 * gaps.length / som).toFixed(1)} images/s`,
    '',
    'Intervalle entre deux images  (16,7 ms = plein regime sur un ecran 60 Hz)',
    `  minimum        : ${sorted[0].toFixed(1)} ms`,
    `  mediane        : ${q(0.50).toFixed(1)} ms`,
    `  9 sur 10 sous  : ${q(0.90).toFixed(1)} ms`,
    `  99 sur 100 sous: ${q(0.99).toFixed(1)} ms`,
    `  maximum        : ${sorted[sorted.length - 1].toFixed(1)} ms`,
    '',
    'Repartition',
    `  <= 18 ms       : ${String(buck(0, 18)).padStart(5)}  ${pct(buck(0, 18))}   plein regime`,
    `  18 - 25 ms     : ${String(buck(18, 25)).padStart(5)}  ${pct(buck(18, 25))}   leger retard`,
    `  25 - 40 ms     : ${String(buck(25, 40)).padStart(5)}  ${pct(buck(25, 40))}   demi-cadence`,
    `  40 - 70 ms     : ${String(buck(40, 70)).padStart(5)}  ${pct(buck(40, 70))}   perceptible`,
    `  > 70 ms        : ${String(buck(70, 1e9)).padStart(5)}  ${pct(buck(70, 1e9))}   a-coup franc`,
    '',
    `Images en retard (> 20 ms) : ${over(20)}  ${pct(over(20))}`,
    `A-coups francs   (> 50 ms) : ${over(50)}  ${pct(over(50))}`,
    '',
    ...dedans,
    '',
    `Ce qui se jouait sur l image qui a produit le retard   (${iNorm.length} normales, ${iLent.length} blocages)`,
    '                            images normales   blocages',
    ...correl,
    ...(iLent.length ? [] : ['  (aucun blocage sur cet enregistrement : colonne de droite vide)']),
    '',
    `Le meme evenement, survenu dans les ${FENETRE} images PRECEDENTES`,
    '  (une transition CSS de 200 ms coute pendant 12 images, pas sur celle qui la declenche)',
    '                            images normales   blocages',
    ...correlF,
    '',
    'Cables sur lesquels le point se trouvait au moment des blocages',
    ...(cables.length ? cables : ['  (aucun blocage)']),
    '',
    'Position des blocages sur le parcours du signal',
    '  (a comparer d un enregistrement a l autre : l horloge repart de zero, pas le parcours)',
    '  ' + (iLent.length
      ? iLent.map(i => (100 * di[i] / dMax)).sort((a, b) => a - b)
             .map(p => p.toFixed(1) + ' %').join('   ')
      : '(aucun blocage)'),
    '',
    'Les 10 plus longs arrets',
    ...worst,
  ].join('\n');
  try { window.electronAPI?.copyToClipboard(txt); } catch {}
  return txt;
}

function startFlowAnimation(chains) {
  stopFlowAnimation();
  if (window._xFlowLog) _flowLogReset();
  if (!chains?.length) return;
  wLog('ROUTE_START', { chains: chains.length });
  const svg  = document.getElementById('cables-svg'); // où on LIT les tracés
  const flow = _flowSvg();                            // où on POSE points et ondes

  const trains = chains.flatMap(chain => {
    const flatSegs = _flattenToTrains(chain.segments || [], chain.paths || []);
    return flatSegs.map(segs => {
      const rt = _resolveSegsForAnim(chain, segs, svg);
      if (!rt) return null;
      return { ...rt, el: _makeParticleEl(flow), chainId: chain.id, startOffset: 0, _segIdx: -1, _litSeg: null, _litRow: null, _waveEl: null };
    }).filter(Boolean);
  });

  // Segment de fin de route (épilogue) : un train à part par route, qui ne démarre
  // qu'une fois que TOUS les chemins de cette route sont arrivés — son startOffset
  // est donc la durée du plus long chemin de la route (les chemins partent ensemble,
  // l'épilogue joue en dernier, une seule fois, cf. design "trunk-plays-last").
  const chainMaxTotal = {};
  trains.forEach(tr => { chainMaxTotal[tr.chainId] = Math.max(chainMaxTotal[tr.chainId] || 0, tr.total); });
  chains.forEach(chain => {
    const epiSegs = chain.epilogueSegments || [];
    if (!epiSegs.length) return;
    const rt = _resolveSegsForAnim(chain, epiSegs, svg);
    if (!rt) return;
    // skipStartGlow : ce train repart d'un appareil qu'un chemin vient d'allumer, il ne
    // doit donc pas rejouer la lueur de départ par-dessus (elle écraserait la couleur du
    // câble entrant par celle du sortant). Uniquement s'il y a bien quelque chose avant
    // lui : une route réduite à sa seule fin de route n'a personne pour allumer son
    // premier appareil, elle doit le faire elle-même comme n'importe quel train.
    const before = chainMaxTotal[chain.id] || 0;
    trains.push({ ...rt, el: _makeParticleEl(flow), chainId: chain.id, startOffset: before, skipStartGlow: before > 0, _segIdx: -1, _litSeg: null, _litRow: null, _waveEl: null });
  });

  if (!trains.length) return;

  // Tous les coûts « première fois » sont payés ici, avant le premier mouvement.
  _prewarmGlowLayers(trains);

  const SPEED  = RELAY_SPEED; // vitesse originale
  // Restart quand le train le plus long (épilogue inclus, décalé par son startOffset) est terminé
  const doneAt = Math.max(...trains.map(t => (t.startOffset || 0) + t.total));

  let globalD = 0;
  let last    = 0;

  // Arrivée d'un train : allume son nœud de sortie et referme ce qu'un segment sans fil
  // laisse en cours. Appelée depuis la boucle quand un train dépasse sa longueur, ET
  // juste avant de reboucler pour ceux qui n'y arriveront jamais (voir plus bas).
  function _finishTrain(train) {
    if (!train || train._segIdx < 0) return;
    if (window._xFlowLog) _flowLogMark(32);
    const lastSeg = train.resolved[train.resolved.length - 1];
    if (lastSeg) {
      const nid = lastSeg.dir === 'fwd' ? lastSeg.toId : lastSeg.fromId;
      if (nid) _glowNode(nid, lastSeg.color);
      if (lastSeg.wireless) {
        _stopBlinkWirelessPorts(lastSeg.fromId, lastSeg.fromPortId, lastSeg.toId, lastSeg.toPortId);
        _removeWaveEl(train._waveEl); train._waveEl = null;
      }
    }
    train._segIdx = -1;
  }

  // Fin de cycle : on laisse la lueur du dernier appareil s'éteindre avant de repartir,
  // sinon la particule redémarre par-dessus une arrivée encore allumée et on ne voit
  // plus où la route se termine. Pendant cette attente, aucun train n'avance.
  let holdUntil = 0;

  function tick(ts) {
    const _t0 = window._xFlowLog ? performance.now() : 0;
    const dt = Math.min(ts - last, 50);
    last = ts;

    // Pause (Espace) : `last` reste à jour à chaque image (ci-dessus), donc aucun
    // saut à la reprise — seule la suite (avance de globalD) est sautée tant que gelé.
    if (_animPaused) { _routeAnimRAF = requestAnimationFrame(tick); return; }

    if (holdUntil) {
      if (ts < holdUntil) {
        if (window._xFlowLog) _flowLogFrame(ts, -1);   // image de pause, hors mesure
        _routeAnimRAF = requestAnimationFrame(tick);
        return;
      }
      holdUntil = 0;
      globalD   = 0;
    }

    globalD += SPEED * dt;
    if (window._xFlowLog) _flowLogFrame(ts, globalD);
    if (globalD >= doneAt) {
      if (window._xFlowLog) _flowLogMark(64);
      // Le train qui définit doneAt — l'épilogue « fin de route » quand il y en a un,
      // sinon le plus long chemin — n'atteint JAMAIS un tick où d dépasse sa longueur :
      // la remise à zéro le devance d'une image, son d repasse négatif, et son arrivée
      // n'était donc jamais jouée. L'appareil final d'une fin de route ne s'allumait
      // pour cette seule raison jamais. On la déclenche ici avant de reboucler.
      trains.forEach(_finishTrain);
      // Particules masquées et boucle en attente : le tour suivant ne repart qu'une fois
      // la lueur de ce dernier appareil éteinte (globalD est remis à zéro à ce
      // moment-là, en sortie d'attente).
      trains.forEach(t => _moveParticle(t.el, -9999, -9999));
      holdUntil = ts + GLOW_VISIBLE_MS;
      if (window._xFlowLog) _flowLogDurMs(performance.now() - _t0);
      _routeAnimRAF = requestAnimationFrame(tick);
      return;
    }

    // ── Phase 1 : LECTURES seulement ────────────────────────────────────────
    // getPointAtLength() interroge la géométrie du tracé. Le navigateur ne peut y
    // répondre qu'après avoir appliqué tout ce qui est en attente dans la page — donc
    // toute écriture faite juste avant l'oblige à recalculer la mise en page sur-le-champ.
    // L'ancienne boucle alternait écriture et lecture pour chaque train : autant de
    // recalculs forcés par image que de trains, soixante fois par seconde. C'est ce que
    // l'outil Performance signalait sous « Forced reflow », attribué à cette boucle.
    // En regroupant toutes les lectures ici, il n'en reste qu'un seul par image.
    const frame = [];
    for (const train of trains) {
      const d = globalD - (train.startOffset || 0);
      if (d < 0 || d > train.total) { frame.push({ train, d, out: true }); continue; }
      let segIdx = train.resolved.length - 1;
      for (let i = 0; i < train.resolved.length; i++) {
        if (d < train.cumuls[i] + train.resolved[i].length) { segIdx = i; break; }
      }
      const r      = train.resolved[segIdx];
      const dSeg   = d - train.cumuls[segIdx];
      const dOnPth = r.dir === 'fwd' ? dSeg : r.length - dSeg;
      let pt = null;
      if (!r.wireless) {
        try { pt = r.path.getPointAtLength(Math.max(0, Math.min(r.length, dOnPth))); } catch {}
      }
      frame.push({ train, d, segIdx, r, dSeg, pt });
    }

    // Relevé de position : lecture pure de ce que la phase 1 vient de calculer, aucune
    // interrogation supplémentaire du navigateur. On retient le premier train qui a une
    // position réelle — tous les trains découlent de la même distance globale, celui-là
    // suffit donc à identifier le moment.
    if (window._xFlowLog) {
      const f0 = frame.find(f => f.pt);
      if (f0) _flowLogPos(f0.pt.x, f0.pt.y, f0.r.cableId);
    }

    // ── Phase 2 : ÉCRITURES seulement ───────────────────────────────────────
    frame.forEach(({ train, d, segIdx, r, dSeg, pt, out }) => {
      const { el } = train;
      if (out) {
        _moveParticle(el, -9999, -9999);
        if (d > train.total) {
          _finishTrain(train);
        }
        // Un train hors parcours n'éclaire plus aucun câble : sa ligne du panneau Routes
        // doit s'éteindre avec lui. Ce `return` sautait par-dessus le code d'extinction
        // plus bas, si bien que la DERNIÈRE ligne de chaque train restait allumée après
        // son arrivée. Invisible pour un chemin (la pause de fin de cycle dure une
        // seconde), permanent pour une fin de route, qui reste hors parcours pendant tout
        // le début de chaque cycle — sa ligne ne s'éteignait donc jamais.
        if (train._litRow) {
          train._litRow.querySelector('.route-cable-label').style.color = '';
          train._litRow = null;
        }
        train._litSeg = null;
        return;
      }
      if (r.wireless) {
        // Pas de tracé à suivre : le point lumineux disparaît le temps de ce segment,
        // remplacé par le clignotement des deux ports et l'onde qui parcourt la
        // ligne droite entre eux (voir plus bas).
        _moveParticle(el, -9999, -9999);
        const srcPt = r.dir === 'fwd' ? [r.fx, r.fy] : [r.tx, r.ty];
        const dstPt = r.dir === 'fwd' ? [r.tx, r.ty] : [r.fx, r.fy];
        _updateWavePos(train._waveEl, srcPt[0], srcPt[1], dstPt[0], dstPt[1], r.length > 0 ? dSeg / r.length : 0);
      } else if (pt) {
        _moveParticle(el, pt.x, pt.y);
        // Réécrite seulement quand elle change réellement, c'est-à-dire au passage d'un
        // câble à l'autre : une couleur réécrite à l'identique fait redessiner pour rien.
        if (el._fill !== r.color) { el._fill = r.color; el.setAttribute('fill', r.color); }
      }

      // Glow du nœud traversé
      if (train._segIdx !== segIdx) {
        if (window._xFlowLog) _flowLogMark(128);
        if (train._segIdx === -1) {
          // Premier tick : forcer le nœud source, allumé faute de câble entrant — c'est
          // le tout premier appareil de la route. Une fin de route, elle, ne démarre pas
          // sur un appareil neuf : elle repart de celui où les chemins viennent
          // d'arriver, déjà allumé à la couleur du câble ENTRANT. Rejouer ici son départ
          // écrasait cette lueur une milliseconde plus tard, avec la couleur du câble
          // sortant — le signal rouge qui vient d'arriver repassait en bleu.
          const nid = r.dir === 'fwd' ? r.fromId : r.toId;
          if (nid && !train.skipStartGlow) _glowNode(nid, r.color);
        } else {
          // Arrivée : glow sur le nœud de sortie du câble précédent
          const prev = train.resolved[train._segIdx];
          if (prev) {
            const nid = prev.dir === 'fwd' ? prev.toId : prev.fromId;
            if (nid) _glowNode(nid, prev.color);
            if (prev.wireless) {
              _stopBlinkWirelessPorts(prev.fromId, prev.fromPortId, prev.toId, prev.toPortId);
              _removeWaveEl(train._waveEl); train._waveEl = null;
            }
          }
        }
        if (r.wireless) {
          _blinkWirelessPorts(r.fromId, r.fromPortId, r.toId, r.toPortId);
          train._waveEl = _makeWaveEl(flow, r.color);
        }
        train._segIdx = segIdx;
      }

      // Allumer le texte de la ligne correspondante dans le panneau Routes — par
      // IDENTITÉ du segment (r.seg), pas par cableId : un câble copié/collé (voir
      // menu clic droit) peut apparaître dans plusieurs segments à la fois, un
      // repérage par cableId seul allumerait alors une ligne au hasard parmi les
      // doublons plutôt que celle réellement traversée par CE train. _segRowMap est
      // reconstruite à chaque renderRoutesList() (voir _renderSegList).
      if (train._litSeg !== r.seg) {
        if (train._litRow) { train._litRow.querySelector('.route-cable-label').style.color = ''; train._litRow = null; }
        train._litSeg = r.seg;
        const row = r.seg ? _segRowMap.get(r.seg) : null;
        if (row) { row.querySelector('.route-cable-label').style.color = '#ffd700'; train._litRow = row; }
      }
    });
    if (window._xFlowLog) _flowLogDurMs(performance.now() - _t0);
    _routeAnimRAF = requestAnimationFrame(tick);
  }
  _routeAnimRAF = requestAnimationFrame(tick);
}

function stopFlowAnimation() {
  if (!_routeAnimRAF) return;
  cancelAnimationFrame(_routeAnimRAF); _routeAnimRAF = null;
  _animPaused = false; // ne pas hériter de la pause sur la prochaine animation lancée
  wLog('ROUTE_STOP', {});
  // Les DEUX calques sont balayés, jamais seulement celui en vigueur : basculer
  // _xFlowOverlay en cours de session laisserait sinon des points orphelins dans l'autre.
  document.querySelectorAll('#cables-svg circle.flow-particle, #flow-svg circle.flow-particle')
    .forEach(c => c.remove());
  document.querySelectorAll('.route-cable-row .route-cable-label').forEach(el => el.style.color = '');
  // Un port sans fil en plein clignotement (boucle infinie) au moment de l'arrêt
  // continuerait sinon indéfiniment — voir _blinkWirelessPorts/_stopBlinkWirelessPorts.
  document.querySelectorAll('.port-dot-node.port-wireless').forEach(dot => {
    if (dot._blinkAnim) { try { dot._blinkAnim.cancel(); } catch {} dot._blinkAnim = null; }
  });
  // Idem pour une onde sans fil en plein trajet (voir _makeWaveEl/_removeWaveEl).
  document.querySelectorAll('#cables-svg .wireless-wave, #flow-svg .wireless-wave')
    .forEach(g => _removeWaveEl(g));
}

// ── Init ──────────────────────────────────────────────────────

function initRoutes() {
  // Filet de sécurité : si un glisser de route (wires/chain) se termine sans dépôt
  // valide (abandonné, touche Echap...), replier toute route ouverte temporairement
  // par le survol — le dragend de l'en-tête lui-même le fait déjà, ceci couvre aussi
  // le cas où le drop a lieu hors de tout en-tête/chemin.
  document.addEventListener('dragend', () => _collapseAutoExpanded());

  // Espace → pause/reprend l'animation en cours (route, chemin ou segment isolé).
  // Écouteur indépendant de celui de canvas.js (Espace+glisser = pan) : les deux
  // coexistent sans conflit, un keydown déclenche les deux normalement — celui-ci
  // ne fait rien de plus que basculer _animPaused si une animation tourne réellement.
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space' || e.repeat) return;
    if (e.target.closest('input, textarea, [contenteditable]')) return;
    if (!_isDimmingActive()) return; // rien n'anime, rien à mettre en pause
    e.preventDefault();
    _animPaused = !_animPaused;
  });

  document.addEventListener('mousedown', e => {
    // En mode tuto, la seule sortie autorisée est la croix du tuto lui-même
    // (tour.js/_tourStop) — un clic hors du prompt/panneau ne doit ni
    // annuler le câble en attente ni refermer le panneau Routes tout seul.
    if (typeof APP !== 'undefined' && APP.meta?.tourInProgress) return;
    const prompt = document.getElementById('route-assign-prompt');
    if (prompt && !prompt.contains(e.target)) {
      prompt.remove();
      _cancelPendingCable();
    }
    const panel = document.getElementById('routes-panel');
    if (!panel.classList.contains('open')) return;
    if (panel.contains(e.target)) return;
    // Annuler/Rétablir et la sidebar gauche (filtre de câbles, catégories...) doivent
    // rester utilisables à travers le panneau Routes ouvert — ne pas le fermer sur ce clic.
    if (e.target.closest('#btn-routes, [data-action="routes"], .route-assign-prompt, #route-assign-prompt, #route-insert-picker, #_seg-ctx-menu, #btn-undo, #btn-redo, #sidebar-left')) return;
    panel.classList.remove('open');
    window._routesPanelJustClosed = true;
  }, true);

  // Double-clic sur le titre du panneau → animer toutes les routes à la fois
  // (voir traceAllRoutes pour l'exception à la règle "une seule route à la fois").
  document.querySelector('#routes-panel .rp-title')?.addEventListener('dblclick', e => {
    e.stopPropagation();
    traceAllRoutes();
  });

  new MutationObserver(() => {
    const panel = document.getElementById('routes-panel');
    if (panel.classList.contains('open')) {
      renderRoutesList();
    } else {
      _highlightCid = null;
    }
  }).observe(document.getElementById('routes-panel'), { attributes: true, attributeFilter: ['class'] });

  APP.chains.forEach(_migrateChain);

  const _origCreate = window.createCable;
  window.createCable = function(...args) {
    const cid = _origCreate.apply(this, args);
    setTimeout(() => _showRouteAssignPrompt(cid), 80);
    return cid;
  };

  const _origDelete = window.deleteConn;
  window.deleteConn = async function(cid, opts = {}) {
    if (!opts.skipRouteCheck) {
      APP.chains.forEach(_migrateChain);
      const toDelete = APP.chains.filter(ch =>
        _allChainSegments(ch).length > 0 &&
        _allChainSegments(ch).filter(s => s.cableId !== cid).length === 0
      );
      if (toDelete.length) {
        const names = toDelete.map(ch => `"${_routeDisplayTitle(ch)}"`).join(', ');
        const msg = toDelete.length === 1
          ? t('delete_cable_orphan_route').replace('$names', names)
          : t('delete_cable_orphan_routes').replace('$n', toDelete.length).replace('$names', names);
        const ok = await showConfirm(msg, { ok: t('delete'), danger: true });
        if (!ok) return;
      }
    }
    // pushUndo AVANT _removeCableFromAllRoutes (qui mutate déjà segments/chemins/routes) —
    // sinon l'instantané undo, pris plus tard à l'intérieur de _origDelete (cables.js),
    // capture un état où le câble est déjà retiré des routes : un undo ultérieur ne
    // restaurerait le câble que dans APP.cables, orphelin, sans le remettre à sa place
    // dans sa route. skipUndo:true empêche _origDelete de pousser un second instantané
    // redondant (ou, pour les appelants qui ont déjà fait leur propre pushUndo avant
    // d'appeler deleteConn en boucle — suppression de route/nœud —, un second inutile).
    if (!opts.skipUndo) pushUndo();
    _removeCableFromAllRoutes(cid);
    return _origDelete.call(this, cid, { skipUndo: true });
  };

  let _cableSelectTimer = null;
  let _lastSelectCid    = null;
  const _origSelectCable = window.selectCable;
  window.selectCable = function(cid, openPanel = true) {
    _lastSelectCid = cid;
    clearTimeout(_cableSelectTimer);
    _cableSelectTimer = setTimeout(() => {
      _origSelectCable.call(window, cid, openPanel);
      _showEndpointDots(cid);
    }, 220);
  };
  window._cancelCableSelect = () => { clearTimeout(_cableSelectTimer); _cableSelectTimer = null; };
  window._getLastSelectCid  = () => _lastSelectCid;

  const _origClearSelCable = window.clearSelCable;
  window.clearSelCable = function() {
    _removeEndpointDots();
    return _origClearSelCable.apply(this, arguments);
  };

  document.getElementById('cables-svg').addEventListener('dblclick', e => {
    if (!e.target.closest('.cable-visual, .cable-hit')) return;
    e.stopImmediatePropagation();
    window._cancelCableSelect?.();
    closePanel?.();
    toggleRoutesUsingCable(window._getLastSelectCid?.());
  }, true);
}

// Bascule l'animation de toutes les routes qui utilisent ce câble : un second appel
// les arrête. Partagé entre le double-clic sur le tracé d'un câble physique et celui
// sur le symbole d'un lien sans fil — ce dernier n'ayant aucun tracé à cliquer, son
// point de connexion est son seul point d'entrée (voir nodes.js).
function toggleRoutesUsingCable(cid) {
  if (cid == null) return;
  const routes = APP.chains.filter(ch => _allChainSegments(ch).some(s => s.cableId === cid));
  if (!routes.length) return;
  const allActive = routes.every(ch => _activeRoutes.has(ch.id));
  if (allActive) routes.forEach(ch => _activeRoutes.delete(ch.id));
  else           routes.forEach(ch => _activeRoutes.add(ch.id));
  _updateTrace(); _restartAnimation(); renderRoutesList();
}

// ── Modal création route ──────────────────────────────────────

function _autoRouteName(prefillCid) {
  if (!prefillCid) return 'Route ' + (APP.chains.length + 1);
  const c = APP.cables.find(x => x.id === prefillCid);
  if (!c) return 'Route ' + (APP.chains.length + 1);
  const from = APP.nodes[c.from], to = APP.nodes[c.to];
  return `${from?.short || from?.name || c.from} → ${to?.short || to?.name || c.to}`;
}

function _chainEndpoints(chain) {
  // Un chemin totalement vide (0 segment, 0 sous-chemin — ex: juste vidé par un
  // glisser-déposer) produit un train dégénéré (tableau vide) dans _flattenToTrains.
  // Sans ce filtre, si ce train dégénéré tombe en dernière position, lastSeg vaut
  // undefined et lastSeg.cableId plante juste en dessous — ce qui interrompait
  // tout renderRoutesList() (donc la liste entière des routes) et _autoTitleFromChain
  // (donc le bouton « inverser le sens », qui l'appelle aussi).
  const trains = _flattenToTrains(chain.segments || [], chain.paths || []).filter(tr => tr.length > 0);
  const epi    = chain.epilogueSegments || [];
  // Plus de tronc ni de chemin, mais une fin de route : c'est elle qui reste, donc
  // c'est elle qui donne les DEUX bouts du nom. Sans ça le calcul abandonnait et la
  // route gardait indéfiniment un nom qui ne décrivait plus rien de ce qu'elle contient.
  if (!trains.length && !epi.length) return null;
  const firstSeg = trains.length ? trains[0][0] : epi[0];
  // Segment de fin de route (épilogue) : joué après tous les chemins, donc c'est
  // lui qui détermine la fin du nom — pas le dernier chemin — s'il en existe un.
  const lastSeg = epi.length ? epi[epi.length - 1]
    : trains[trains.length - 1][trains[trains.length - 1].length - 1];
  const firstCable = APP.cables.find(c => c.id === firstSeg.cableId);
  const lastCable  = APP.cables.find(c => c.id === lastSeg.cableId);
  if (!firstCable || !lastCable) return null;
  const fromNode = APP.nodes[firstSeg.dir === 'fwd' ? firstCable.from : firstCable.to];
  const toNode   = APP.nodes[lastSeg.dir  === 'fwd' ? lastCable.to   : lastCable.from];
  return { fromNode, toNode };
}

function _autoTitleFromChain(chain) {
  const ep = _chainEndpoints(chain);
  if (!ep) return chain.title;
  return `${ep.fromNode?.short || ep.fromNode?.name || '?'} → ${ep.toNode?.short || ep.toNode?.name || '?'}`;
}

// Nom du dernier appareil de la route — utilisé comme départage alphabétique
// secondaire dans renderRoutesList quand deux titres de route sont identiques.
function _routeEndName(chain) {
  const ep = _chainEndpoints(chain);
  return ep?.toNode?.short || ep?.toNode?.name || '';
}

// Ordre canonique unique pour comparer deux routes — réutilisé PARTOUT où
// l'app liste des routes (panneau principal, export PDF, visualiseur HTML,
// etc.), pour que ce soit toujours le même ordre, donc les mêmes lettres
// (voir _routeDisplayTitle) quel que soit l'écran. Titre, puis nom du
// dernier appareil si égalité, puis id en tout dernier recours pour un
// résultat toujours stable même entre deux routes strictement identiques.
function _routeCanonicalCompare(a, b) {
  const t = (_autoTitleFromChain(a) || '').localeCompare(_autoTitleFromChain(b) || '', undefined, { sensitivity: 'base' });
  if (t !== 0) return t;
  const e = _routeEndName(a).localeCompare(_routeEndName(b), undefined, { sensitivity: 'base' });
  if (e !== 0) return e;
  return (a.id || '').localeCompare(b.id || '');
}

// Titre à AFFICHER pour une route : son titre normal, sauf si une ou
// plusieurs autres routes du projet partagent exactement le même titre —
// alors chacune reçoit une lettre (a), (b)... selon l'ordre canonique
// ci-dessus. Jamais écrit sur chain.title lui-même (le vrai nom de la route
// ne change jamais) — recalculé entièrement à chaque appel à partir de
// APP.chains, donc toujours à jour, y compris juste après un renommage,
// une suppression, ou une annulation — mais sans mémoire d'un calcul
// précédent : si une route sort d'un groupe de doublons, les lettres des
// routes restantes peuvent se décaler (accepté, pas un bug).
function _routeDisplayTitle(chain) {
  const base = _autoTitleFromChain(chain);
  const group = APP.chains.filter(c => (_autoTitleFromChain(c) || '') === (base || ''));
  if (group.length < 2) return base;
  group.sort(_routeCanonicalCompare);
  const idx = group.findIndex(c => c.id === chain.id);
  const letter = idx >= 0 && idx < 26 ? String.fromCharCode(97 + idx) : String(idx + 1);
  return `${base} (${letter})`;
}

// Même principe qu'une route pour le titre d'un chemin : premier appareil → dernier
// appareil (_chainEndpoints fonctionne tel quel sur un chemin, qui a les mêmes
// champs segments/paths qu'une route, juste sans épilogue — epi.length y vaut
// toujours 0, donc la fin du nom vient naturellement du dernier sous-chemin).
// Recalculé à chaque rendu ; repli sur le libellé numéroté pour un chemin encore vide.
function _refreshPathTitles(paths) {
  (paths || []).forEach(p => {
    const ep = _chainEndpoints(p);
    // Vidé (pas laissé à une ancienne valeur) quand le chemin est vide, pour que
    // l'affichage retombe fiablement sur le libellé numéroté (voir _renderPathTree).
    p.title = ep ? `${ep.fromNode?.short || ep.fromNode?.name || '?'} → ${ep.toNode?.short || ep.toNode?.name || '?'}` : '';
    _refreshPathTitles(p.paths);
  });
}

function _openCreateRouteModal(prefillCid, editChain = null) {
  const list = document.getElementById('routes-list');
  if (list.querySelector('.route-create-form')) return;
  const isEdit = editChain != null;
  const defaultName = isEdit ? editChain.title : _autoRouteName(prefillCid);

  const form = document.createElement('div');
  form.className = 'route-create-form';
  if (isEdit) form.dataset.chainId = editChain.id;
  form.innerHTML = `
    <div style="padding:14px 16px;background:rgba(0,212,255,.06);border-bottom:1px solid rgba(255,255,255,.06)">
      <div style="font-family:var(--mono);font-size:11px;color:var(--textdim);letter-spacing:.06em;margin-bottom:10px">${isEdit ? t('edit_route') : t('new_route_label')}</div>
      ${isEdit ? '' : `<input id="rc-name" class="prop-input" value="${escapeHtml(defaultName)}" readonly style="width:100%;margin-bottom:8px;box-sizing:border-box;cursor:default">`}
      <div style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <div style="font-family:var(--mono);font-size:11px;color:var(--textdim);letter-spacing:.04em">${t('route_color_label')}</div>
          <span id="rc-colors-edit" style="cursor:pointer;font-size:11px;color:var(--textdim);user-select:none">✎</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap" id="rc-colors"></div>
        <input id="rc-custom-color" type="color" style="display:none">
      </div>
      <div style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <div style="font-family:var(--mono);font-size:11px;color:var(--textdim);letter-spacing:.04em">${t('signal_type_label')}</div>
          <span id="rc-types-edit" style="cursor:pointer;font-size:11px;color:var(--textdim);user-select:none">✎</span>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap" id="rc-types"></div>
        <input id="rc-custom-input" class="prop-input" placeholder="Custom type..."
          style="width:100%;margin-top:6px;box-sizing:border-box;display:none;font-size:11px">
      </div>
      <div style="display:flex;gap:6px">
        <button class="ip-btn" id="rc-ok" style="flex:1">${isEdit ? t('save') : t('create')}</button>
        <button class="ip-btn" id="rc-cancel" style="opacity:.5">${t('cancel')}</button>
      </div>
    </div>
  `;

  // Réassignée par _resync ci-dessous si un undo/redo restaure APP.chains
  // pendant que cette fenêtre reste ouverte (voir history.js::applyState) —
  // editChain lui-même resterait sinon une copie fantôme, détachée des
  // vraies données. Seul son id ne change jamais.
  let liveChain = editChain;
  let selectedColor = isEdit ? editChain.color : _nextRouteColor();
  const _prefillCable = prefillCid != null ? APP.cables.find(x => x.id === prefillCid) : null;
  const selectedTypes = new Set(isEdit ? _chainTypes(editChain) : [_routeTypeForCable(_prefillCable?.type) || 'VIDEO']);

  const colorsDiv = form.querySelector('#rc-colors');
  const colorsEditBtn = form.querySelector('#rc-colors-edit');
  const customColorInput = form.querySelector('#rc-custom-color');
  let colorDeleteMode = false;

  // Même principe que les types de route (USER_ROUTE_TYPES) : une seule liste
  // persistante et entièrement gérée par l'utilisateur (USER_ROUTE_COLORS,
  // pré-remplie une fois avec ROUTE_COLORS), plus de distinction prédéfini/
  // personnalisé, tout supprimable via le crayon — sauf la toute dernière
  // couleur restante, qu'une route ne peut pas se retrouver sans.
  function _renderColorDots() {
    colorsDiv.innerHTML = '';
    colorsEditBtn.style.color = colorDeleteMode ? 'var(--accent)' : 'var(--textdim)';
    USER_ROUTE_COLORS.forEach(col => {
      const dot = document.createElement('div');
      dot.style.cssText = `position:relative;width:18px;height:18px;border-radius:50%;background:${col};cursor:pointer;
        border:2px solid ${col === selectedColor ? '#fff' : 'transparent'};flex-shrink:0`;
      dot.addEventListener('click', () => {
        selectedColor = col;
        _renderColorDots();
      });
      if (colorDeleteMode && USER_ROUTE_COLORS.length > 1) {
        const del = document.createElement('span');
        del.className = 'route-type-del';
        del.textContent = '×';
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          _deleteUserRouteColor(col);
          if (selectedColor === col) selectedColor = _nextRouteColor();
          _renderColorDots();
        });
        dot.appendChild(del);
      }
      colorsDiv.appendChild(dot);
    });
    // L'input color natif est superposé (invisible) exactement sur le rond
    // "+", plutôt que caché en display:none ailleurs sur la page : sans
    // position réelle à l'écran, le sélecteur natif s'ouvrait dans un coin
    // par défaut au lieu de s'ancrer là où l'utilisateur vient de cliquer.
    const addWrap = document.createElement('div');
    addWrap.style.cssText = 'position:relative;width:18px;height:18px;flex-shrink:0';
    addWrap.innerHTML = `<div style="width:18px;height:18px;border-radius:50%;cursor:pointer;
      border:1px dashed rgba(255,255,255,.4);display:flex;align-items:center;justify-content:center;
      font-size:11px;color:var(--textdim);pointer-events:none">+</div>`;
    customColorInput.style.cssText = 'position:absolute;top:0;left:0;width:18px;height:18px;opacity:0;cursor:pointer;padding:0;border:none';
    addWrap.appendChild(customColorInput);
    colorsDiv.appendChild(addWrap);
  }
  _renderColorDots();

  colorsEditBtn.addEventListener('click', () => {
    colorDeleteMode = !colorDeleteMode;
    _renderColorDots();
  });

  customColorInput.addEventListener('input', () => {
    const col = customColorInput.value;
    if (!USER_ROUTE_COLORS.includes(col)) {
      pushUndo();
      USER_ROUTE_COLORS.push(col);
      saveUserCats();
    }
    selectedColor = col;
    _renderColorDots();
  });

  const typesDiv = form.querySelector('#rc-types');
  const customInput = form.querySelector('#rc-custom-input');
  const typesEditBtn = form.querySelector('#rc-types-edit');
  let deleteMode = false;

  const _typeBtnStyle = (sel) => `position:relative;padding:3px 8px;border-radius:4px;font-family:var(--mono);font-size:11px;cursor:pointer;
      border:1px solid rgba(255,255,255,.2);
      background:${sel ? 'rgba(255,255,255,.15)' : 'none'};
      color:${sel ? '#fff' : 'var(--textdim)'}`;

  // Une seule liste, entièrement gérée par l'utilisateur (USER_ROUTE_TYPES,
  // pré-remplie une fois avec SIGNAL_TYPES_LIST — voir library.js::_loadUserCats) :
  // aucune distinction prédéfini/personnalisé, tout est cochable et, en mode
  // suppression (crayon ✎), tout est supprimable. Suivi du bouton "+" qui crée
  // un nouveau type.
  function _renderTypeButtons() {
    typesDiv.innerHTML = '';
    typesEditBtn.style.color = deleteMode ? 'var(--accent)' : 'var(--textdim)';
    USER_ROUTE_TYPES.forEach(ut => {
      const btn = document.createElement('button');
      btn.style.cssText = _typeBtnStyle(selectedTypes.has(ut.id));
      btn.textContent = _routeTypeLabel(ut.id);
      btn.addEventListener('click', () => {
        if (selectedTypes.has(ut.id)) selectedTypes.delete(ut.id); else selectedTypes.add(ut.id);
        _renderTypeButtons();
      });
      if (deleteMode) {
        const del = document.createElement('span');
        del.className = 'route-type-del';
        del.textContent = '×';
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          selectedTypes.delete(ut.id);
          _deleteUserRouteType(ut.id);
          _renderTypeButtons();
        });
        btn.appendChild(del);
      }
      typesDiv.appendChild(btn);
    });
    const addBtn = document.createElement('button');
    addBtn.style.cssText = _typeBtnStyle(false);
    addBtn.textContent = '+ ' + (t('route_type_CUSTOM') || '');
    addBtn.addEventListener('click', () => {
      customInput.style.display = 'block';
      customInput.value = '';
      customInput.focus();
    });
    typesDiv.appendChild(addBtn);
  }
  _renderTypeButtons();

  typesEditBtn.addEventListener('click', () => {
    deleteMode = !deleteMode;
    _renderTypeButtons();
  });

  customInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const val = customInput.value.trim().toUpperCase();
    if (val && !USER_ROUTE_TYPES.find(t => t.id === val)) {
      pushUndo();
      USER_ROUTE_TYPES.push({ id: val });
      saveUserCats();
    }
    if (val) selectedTypes.add(val);
    customInput.value = '';
    customInput.style.display = 'none';
    _renderTypeButtons();
  });
  customInput.addEventListener('blur', () => { customInput.style.display = 'none'; customInput.value = ''; });

  // Appelée par history.js::applyState() quand un undo/redo restaure APP.chains
  // pendant que cette fenêtre reste ouverte : re-pointe vers la vraie chain et
  // réaffiche couleur/types tels qu'ils sont redevenus, plutôt que de fermer
  // la fenêtre ou de laisser Enregistrer écraser une copie fantôme.
  if (isEdit) {
    form._wiresResync = (fresh) => {
      liveChain = fresh;
      selectedColor = fresh.color;
      selectedTypes.clear();
      _chainTypes(fresh).forEach(ty => selectedTypes.add(ty));
      _renderColorDots();
      _renderTypeButtons();
    };
  }

  form.querySelector('#rc-ok').addEventListener('click', () => {
    if (isEdit) {
      liveChain.color = selectedColor;
      liveChain.types = Array.from(selectedTypes);
      delete liveChain.type;
      setDirty(); form.remove();
      renderRoutesList();
      _scrollRouteIntoView(liveChain.id);
    } else {
      const name  = defaultName;
      const chain = {
        id: uuid(), title: name, color: selectedColor, types: Array.from(selectedTypes),
        segments: prefillCid != null ? [{ cableId: prefillCid, dir: 'fwd', junction: 'passthrough' }] : [],
        cables: [], paths: [], hidden: false,
      };
      _pendingCableId = null;
      pushUndo();
      APP.chains.push(chain);
      wLog('ROUTE_CREATE', { id: chain.id, title: chain.title, types: chain.types });
      setDirty(); form.remove();
      document.getElementById('routes-panel').classList.add('open');
      _expandedRoutes.add(chain.id); renderRoutesList();
    }
  });
  form.querySelector('#rc-cancel').addEventListener('click', () => {
    form.remove();
    if (isEdit) _scrollRouteIntoView(editChain.id); else _cancelPendingCable();
  });
  list.prepend(form);
  document.getElementById('routes-panel').classList.add('open');
  requestAnimationFrame(() => form.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
}

// ── Endpoint dots ─────────────────────────────────────────────

function _showEndpointDots(cid) {
  _removeEndpointDots();
  const cable = APP.cables.find(x => x.id === cid);
  const pts   = cableOverrides[cid];
  if (!cable || !pts || pts.length < 2) return;
  const svg = document.getElementById('cables-svg');
  const g   = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.id = 'cable-endpoint-dots';
  [pts[0], pts[pts.length - 1]].forEach(pt => {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', pt[0]); c.setAttribute('cy', pt[1]); c.setAttribute('r', '5');
    c.setAttribute('fill', cable.color || '#fff'); c.setAttribute('filter', 'url(#glow)');
    c.style.pointerEvents = 'none';
    g.appendChild(c);
  });
  svg.appendChild(g);
}
function _removeEndpointDots() { document.getElementById('cable-endpoint-dots')?.remove(); }

// ── Prompt assignation câble → route ──────────────────────────

function _showRouteAssignPrompt(cid) {
  document.getElementById('route-assign-prompt')?.remove();
  const c = APP.cables.find(x => x.id === cid);
  if (!c) return;
  _pendingCableId = cid;
  const fromN = APP.nodes[c.from], toN = APP.nodes[c.to];
  const label = `${fromN?.short || fromN?.name || c.from} → ${toN?.short || toN?.name || c.to}`;

  const overlay = document.createElement('div');
  overlay.id = 'route-assign-prompt';
  overlay.innerHTML = `
    <div style="font-family:var(--mono);font-size:11px;color:var(--textdim);margin-bottom:6px;letter-spacing:.04em">${t('assign_to_route')}</div>
    <div style="font-family:var(--body);font-size:12px;color:var(--text);margin-bottom:12px">${escapeHtml(label)}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="ip-btn" id="rap-new" style="flex:1">${t('create_new_route')}</button>
      ${APP.chains.length ? `<button class="ip-btn" id="rap-add" style="flex:1">${t('add_to_existing')}</button>` : ''}
    </div>
    <button id="rap-skip" style="position:absolute;top:10px;right:10px;background:none;border:none;color:var(--textdim);cursor:pointer;font-size:14px;padding:2px 6px">✕</button>
  `;
  overlay.querySelector('#rap-new')?.addEventListener('click', () => { overlay.remove(); _openCreateRouteModal(cid); });
  overlay.querySelector('#rap-add')?.addEventListener('click', () => { overlay.remove(); _openInsertMode(cid); });
  overlay.querySelector('#rap-skip').addEventListener('click', () => { overlay.remove(); _cancelPendingCable(); });
  document.body.appendChild(overlay);
}

function _openInsertMode(cid) {
  document.getElementById('route-insert-picker')?.remove();
  const c     = APP.cables.find(x => x.id === cid);
  // Repli sur le nom complet quand le nom court est vide, comme partout ailleurs —
  // sans ça, un appareil sans nom court s'affichait « ? » ici.
  const _nn = n => n?.short || n?.name || '?';
  const label = c ? `${_nn(APP.nodes[c.from])} → ${_nn(APP.nodes[c.to])}` : `Cable #${cid}`;

  const el = document.createElement('div');
  el.id = 'route-insert-picker';
  el.style.cssText = `
    position:fixed;top:56px;left:50%;transform:translateX(-50%);
    background:#0d1526ee;border:1px solid rgba(255,217,61,.4);border-radius:10px;
    padding:14px 18px;z-index:9999;min-width:260px;max-width:380px;
    box-shadow:0 8px 32px rgba(0,0,0,.6);
  `;
  const expectedType = _routeTypeForCable(c?.type);
  APP.chains.forEach(ch => { if (_allChainSegments(ch).length) ch.title = _autoTitleFromChain(ch); });
  const routeBtns = APP.chains.length
    ? APP.chains.map(chain => {
        const chainTypes = _chainTypes(chain);
        // Un câble sans fil (WiFi/Bluetooth/HF) n'a pas UN signal fixe comme un
        // connecteur filaire (HDMI = toujours vidéo, XLR = toujours audio) — c'est
        // un support générique qui peut transporter à peu près n'importe quoi selon
        // le matériel réel. Jamais d'avertissement de type pour lui, quelle que soit
        // la route ciblée.
        const mismatch = expectedType && expectedType !== 'WIRELESS' && chainTypes.length && !chainTypes.includes(expectedType);
        return `<button class="ip-btn rip-route-btn" data-chain-id="${chain.id}" data-mismatch="${mismatch}"
          style="width:100%;text-align:left;margin-bottom:4px;display:flex;align-items:center;gap:8px;padding:7px 10px;
          ${mismatch ? 'opacity:.55' : ''}">
          <span style="width:8px;height:8px;border-radius:50%;background:${escapeHtml(chain.color)};flex-shrink:0;display:inline-block"></span>
          <span style="flex:1">${escapeHtml(_routeDisplayTitle(chain))}</span>
          <span style="font-family:var(--mono);font-size:11px;opacity:.5">${escapeHtml(chainTypes.map(_routeTypeLabel).join(', '))}</span>
          ${mismatch ? `<span style="font-family:var(--mono);font-size:9px;color:#ffd93d;opacity:.8">⚠</span>` : ''}
        </button>`;
      }).join('')
    : `<div style="font-family:var(--mono);font-size:11px;color:var(--textdim);text-align:center;padding:8px">${t('no_routes_yet')}</div>`;

  el.innerHTML = `
    <div style="font-family:var(--mono);font-size:11px;color:#ffd93d;letter-spacing:.06em;margin-bottom:6px">${t('add_to_route')}</div>
    <div style="font-family:var(--body);font-size:12px;color:var(--text);margin-bottom:10px">${escapeHtml(label)}</div>
    ${routeBtns}
    <button class="ip-btn" id="rip-cancel" style="width:100%;margin-top:4px;opacity:.5;font-size:11px">${t('cancel')}</button>
  `;
  document.body.appendChild(el);

  const _highlightPickerRoute = (chain) => {
    const svg = document.getElementById('cables-svg');
    svg.classList.add('cables-route-hovering');
    _allChainSegments(chain).forEach(seg => {
      const el = svg.querySelector(`.cable-visual[data-cid="${seg.cableId}"]`);
      if (el) el.classList.add('route-hover-highlight');
    });
  };
  const _clearPickerHighlight = () => {
    const svg = document.getElementById('cables-svg');
    svg.classList.remove('cables-route-hovering');
    svg.querySelectorAll('.route-hover-highlight').forEach(el => el.classList.remove('route-hover-highlight'));
  };

  const _doAddToChain = (chain) => {
    _clearPickerHighlight();
    _pendingCableId = null;
    chain.segments.push({ cableId: cid, dir: _guessDirFromSegs(chain.segments, cid), junction: 'passthrough' });
    chain.title = _autoTitleFromChain(chain);
    _highlightCid = cid;
    setDirty();
    document.getElementById('routes-panel').classList.add('open');
    _expandedRoutes.add(chain.id); renderRoutesList();
  };

  el.querySelectorAll('.rip-route-btn').forEach(btn => {
    const chain = APP.chains.find(x => x.id === btn.dataset.chainId);
    if (chain) {
      btn.addEventListener('mouseenter', () => _highlightPickerRoute(chain));
      btn.addEventListener('mouseleave', () => _clearPickerHighlight());
    }
    btn.addEventListener('click', () => {
      const chain = APP.chains.find(x => x.id === btn.dataset.chainId);
      if (!chain) return;
      el.remove();
      if (btn.dataset.mismatch === 'true') {
        const cableTypeLbl = c?.type || '?';
        showConfirm(
          t('type_mismatch').replace('$ctype', cableTypeLbl).replace('$rname', _routeDisplayTitle(chain)).replace('$rtype', _chainTypes(chain).map(_routeTypeLabel).join(', ')),
          { ok: t('add_anyway') }
        ).then(ok => { if (ok) _doAddToChain(chain); else _openInsertMode(cid); });
      } else {
        _doAddToChain(chain);
      }
    });
  });
  el.querySelector('#rip-cancel').addEventListener('click', () => { _clearPickerHighlight(); el.remove(); _cancelPendingCable(); });
}

function getCableRoutes(cid) {
  return APP.chains.filter(ch => _allChainSegments(ch).some(s => s.cableId === cid));
}

function toggleRoutesPanel() {
  document.getElementById('routes-panel').classList.toggle('open');
  renderRoutesList();
}

function closeRoutesPanel() {
  document.getElementById('routes-panel').classList.remove('open');
}
