/* ═══════════════════════════════════════════════════════════════
   zones.js — Zone areas on the canvas
═══════════════════════════════════════════════════════════════ */

let _zNextId        = 1;
let _zPlace         = false;
let _zPlaceStart    = null;
let _zPlaceEl       = null;
let _zoneInEditMode = null;   // id de la zone en mode édition, ou null
let _onDocDown      = null;   // référence au listener actif pour le supprimer
let _zDrag          = null;   // { id, startX, startY, ox, oy, moved }
let _zLabelDrag     = null;   // glisser du NOM : déplace la zone ET son contenu
let _zResize        = null;   // { id, dir, startX, startY, ox, oy, ow, oh, undoPushed }

const ZONE_COLORS = [
  '#00d4ff', '#ff6b35', '#39ff14', '#ffc000',
  '#ff4444', '#ab47bc', '#66bb6a',
];
let _zColorIdx = 0;

function _zLayer() { return document.getElementById('zones-layer'); }
function _zEl(id)  { return document.getElementById(`zone-${id}`); }

function _newZoneId() {
  while (APP.zones[`z-${_zNextId}`]) _zNextId++;
  return `z-${_zNextId++}`;
}

function _hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function _isLight(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

// ── Create ────────────────────────────────────────────────────
function addZone(x, y, width, height) {
  const id    = _newZoneId();
  const color = ZONE_COLORS[_zColorIdx++ % ZONE_COLORS.length];
  const maxZ  = Object.values(APP.zones).reduce((m, z) => Math.max(m, z.zIndex || 1), 0);
  APP.zones[id] = {
    id, x, y, width, height,
    name: 'Zone',
    color,
    opacity: 0.5,
    labelSize: 96,
    hidden: false,
    zIndex: maxZ + 1,
  };
  _buildZoneEl(id);
  selectZone(id);
  setDirty();
}

// ── Build DOM element ─────────────────────────────────────────
function _buildZoneEl(id) {
  const layer = _zLayer();
  if (!layer) return;

  let el = _zEl(id);
  if (!el) {
    el = document.createElement('div');
    el.id = `zone-${id}`;
    el.className = 'zone';
    el.dataset.zoneId = id;

    const body = document.createElement('div');
    body.className = 'zone-body';
    el.appendChild(body);

    const label = document.createElement('div');
    label.className = 'zone-label';
    el.appendChild(label);

    ['n', 's', 'e', 'w'].forEach(dir => {
      const h = document.createElement('div');
      h.className = `zone-rh zone-rh-${dir}`;
      h.dataset.dir = dir;
      el.appendChild(h);
    });

    layer.appendChild(el);
    _bindZoneEvents(id, el);
  }

  _applyZoneStyles(id, el);
}

function _applyZoneStyles(id, el) {
  const z = APP.zones[id];
  if (!z || !el) return;

  el.style.left   = z.x + 'px';
  el.style.top    = z.y + 'px';
  el.style.width  = z.width + 'px';
  el.style.height = z.height + 'px';
  el.style.zIndex = z.zIndex || 1;

  const body = el.querySelector('.zone-body');
  if (body) {
    body.style.display = z.hidden ? 'none' : 'block';
    if (z.isSubproject) {
      const hex = z.color || '#00b0f0';
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      body.style.background = `repeating-conic-gradient(rgba(${r},${g},${b},0.15) 0% 25%, transparent 0% 50%) 0 0 / 20px 20px`;
    } else {
      body.style.background = _hexToRgba(z.color, z.opacity * 0.4);
    }
    const borderCol = _hexToRgba(z.borderColor || z.color, 0.7);
    body.style.borderColor = borderCol;

    // ── Bordure : solid CSS ou SVG tirets ────────────────────
    body.querySelector('.zone-dash-svg')?.remove();
    const dash = z.dash || 'solid';
    if (dash !== 'solid') {
      body.style.borderStyle = 'none';
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg  = document.createElementNS(svgNS, 'svg');
      svg.classList.add('zone-dash-svg');
      svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none;';
      const rect = document.createElementNS(svgNS, 'rect');
      const rw = Math.max((z.width  || 100) - 2, 2);
      const rh = Math.max((z.height || 100) - 2, 2);
      rect.setAttribute('x', '1');
      rect.setAttribute('y', '1');
      rect.setAttribute('width',  String(rw));
      rect.setAttribute('height', String(rh));
      rect.setAttribute('rx', '9');
      rect.setAttribute('ry', '9');
      rect.setAttribute('fill', 'none');
      rect.setAttribute('stroke', borderCol);
      rect.setAttribute('stroke-width', '2');
      rect.setAttribute('stroke-dasharray', dash === 'long' ? '16,10' : '6,4');
      svg.appendChild(rect);
      body.appendChild(svg);
    } else {
      body.style.borderStyle = 'solid';
    }
  }

  el.querySelectorAll('.zone-rh').forEach(h => {
    h.style.display = z.hidden ? 'none' : (APP.selZone === id ? 'block' : '');
  });

  const label = el.querySelector('.zone-label');
  if (label) {
    label.style.fontSize = (z.labelSize || 96) + 'px';
    label.style.opacity  = z.hidden ? '0.5' : '1';
    if (label.contentEditable !== 'true') {
      label.textContent      = z.name;
      label.style.background = z.color;
      label.style.color      = _isLight(z.color) ? '#000' : '#fff';
    }
  }
}

// Contenu d'une zone, figé au début d'un glisser du nom : appareils, étiquettes de
// texte et zones imbriquées dont le CENTRE est dans le rectangle. Le centre plutôt que
// l'englobement complet, pour qu'un appareil à cheval sur le bord suive quand même —
// et pour que la règle reste prévisible quelle que soit sa taille.
function _zoneMembers(zid) {
  const z = APP.zones[zid];
  const out = { nodes: [], labels: [], zones: [] };
  if (!z) return out;
  const inside = (cx, cy) => cx >= z.x && cx <= z.x + z.width && cy >= z.y && cy <= z.y + z.height;

  for (const [id, n] of Object.entries(APP.nodes)) {
    if (inside(n.x + n.w / 2, n.y + n.h / 2)) out.nodes.push({ id, x: n.x, y: n.y });
  }
  for (const [id, tl] of Object.entries(APP.textLabels || {})) {
    if (inside(tl.x, tl.y)) out.labels.push({ id, x: tl.x, y: tl.y });
  }
  for (const [id, zz] of Object.entries(APP.zones || {})) {
    if (id === zid) continue;
    if (inside(zz.x + zz.width / 2, zz.y + zz.height / 2)) out.zones.push({ id, x: zz.x, y: zz.y });
  }
  return out;
}

// ── Bind events ───────────────────────────────────────────────
function _bindZoneEvents(id, el) {
  const body  = el.querySelector('.zone-body');
  const label = el.querySelector('.zone-label');

  // ── Zone body ──────────────────────────────────────────────
  body.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (APP.selZone !== id) selectZone(id);
    const z = APP.zones[id];
    if (!z) return;
    _zDrag = { id, startX: e.clientX, startY: e.clientY, ox: z.x, oy: z.y, moved: false };
    body.setPointerCapture(e.pointerId);
  });

  body.addEventListener('pointermove', e => {
    if (!_zDrag || _zDrag.id !== id) return;
    const z  = APP.zones[id];
    const dx = (e.clientX - _zDrag.startX) / APP.view.zoom;
    const dy = (e.clientY - _zDrag.startY) / APP.view.zoom;
    if (!_zDrag.moved && Math.hypot(dx, dy) < 3) return;
    if (!_zDrag.moved) pushUndo();
    _zDrag.moved = true;
    z.x = _zDrag.ox + dx;
    z.y = _zDrag.oy + dy;
    el.style.left = z.x + 'px';
    el.style.top  = z.y + 'px';
    if (APP.selZone === id) _updateZoneNodesPanel(id);
  });

  body.addEventListener('pointerup', () => {
    if (_zDrag?.moved) setDirty();
    _zDrag = null;
  });

  body.addEventListener('dblclick', e => {
    e.stopPropagation();
    _editZoneLabelInline(id);
  });

  // ── Zone label ─────────────────────────────────────────────
  // Glisser le NOM déplace la zone AVEC son contenu — comme la barre de titre d'une
  // fenêtre (demande de l'utilisateur, 2026-09-17). Glisser le FOND ne déplace que le
  // rectangle, comportement historique inchangé. Le double-clic renomme, inchangé.
  // Sécurité anti-régression : window._xZoneLabelMovesContent = false → le nom ne fait
  // que sélectionner, comme avant.
  // La sélection (et donc l'ouverture du panneau de droite) se fait au RELÂCHEMENT,
  // et seulement si la zone n'a pas bougé : sinon le panneau s'ouvrait dès le premier
  // pixel d'un déplacement, et venait recouvrir le canevas pendant le geste
  // (demande du 2026-09-17).
  label.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (zoneLabelDragStart(id, e)) label.setPointerCapture(e.pointerId);
  });

  // stopPropagation : l'etiquette garde la capture du pointeur, mais l'evenement
  // remonte quand meme au canevas, qui traite lui aussi ce geste (voir canvas.js).
  // Sans cela, chaque deplacement serait calcule deux fois par image.
  label.addEventListener('pointermove', e => { if (zoneLabelDragMove(e)) e.stopPropagation(); });

  label.addEventListener('pointerup', e => { if (zoneLabelDragEnd()) e.stopPropagation(); });

  label.addEventListener('click', e => e.stopPropagation());

  label.addEventListener('dblclick', e => {
    e.stopPropagation();
    _editZoneLabelInline(id);
  });

  // ── Resize handles ─────────────────────────────────────────
  el.querySelectorAll('.zone-rh').forEach(h => {
    const dir = h.dataset.dir;

    h.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const z = APP.zones[id];
      _zResize = {
        id, dir,
        startX: e.clientX, startY: e.clientY,
        ox: z.x, oy: z.y, ow: z.width, oh: z.height,
        undoPushed: false,
      };
      h.setPointerCapture(e.pointerId);
    });

    h.addEventListener('pointermove', e => {
      if (!_zResize || _zResize.id !== id || _zResize.dir !== dir) return;
      if (!_zResize.undoPushed) { pushUndo(); _zResize.undoPushed = true; }
      const z  = APP.zones[id];
      const dx = (e.clientX - _zResize.startX) / APP.view.zoom;
      const dy = (e.clientY - _zResize.startY) / APP.view.zoom;
      let nx = _zResize.ox, ny = _zResize.oy, nw = _zResize.ow, nh = _zResize.oh;
      if (dir === 'e') nw = Math.max(60, _zResize.ow + dx);
      if (dir === 's') nh = Math.max(40, _zResize.oh + dy);
      if (dir === 'w') { nw = Math.max(60, _zResize.ow - dx); nx = _zResize.ox + _zResize.ow - nw; }
      if (dir === 'n') { nh = Math.max(40, _zResize.oh - dy); ny = _zResize.oy + _zResize.oh - nh; }
      z.x = nx; z.y = ny; z.width = nw; z.height = nh;
      el.style.left   = nx + 'px'; el.style.top    = ny + 'px';
      el.style.width  = nw + 'px'; el.style.height = nh + 'px';
      if (APP.selZone === id) _updateZoneNodesPanel(id);
    });

    h.addEventListener('pointerup', () => {
      if (_zResize) { setDirty(); _zResize = null; }
    });
  });
}

// Regle d'appui posee par l'utilisateur (2026-09-19) : au-dessus d'un cable c'est le
// cable ; dans une partie vide du rectangle c'est la zone ; sur le nom c'est la zone
// ET son contenu. Hors edition rien n'est a faire : main.css place deja les cables
// (15) au-dessus des zones (5). Mais une zone SELECTIONNEE passe dans
// #zone-edit-overlay (calque 50) pour rester attrapable la ou elle recouvre un
// appareil — et son rectangle avalait alors tout appui sur un cable. On fait donc
// monter les cables juste au-dessus d'elle le temps de l'edition seulement.
// Effet de bord assume, limite a la duree de la selection : un cable qui croise un
// appareil sans lui etre branche passe par-dessus son image. Les cables caches par la
// face affichee ne sont pas concernes, leur trace est efface et non recouvert.
// Securite anti-regression : window._xCablesAboveZones = false -> rien n'est touche.
function _zoneEditCableStacking(actif) {
  if (window._xCablesAboveZones === false) return;
  const cab = document.getElementById('cables-svg');
  const flo = document.getElementById('flow-svg');
  // En sortie on EFFACE le style en ligne : main.css reprend la main (#cables-svg
  // et #flow-svg y sont a 15, deja au-dessus des zones et des appareils), et le
  // mecanisme du cable selectionne qui monte a 30 refonctionne.
  if (cab) cab.style.zIndex = actif ? '51' : '';
  if (flo) flo.style.zIndex = actif ? '52' : '';
}

// ── Zone edit mode ────────────────────────────────────────────
function enterZoneEditMode(id) {
  if (_zoneInEditMode === id) return;
  if (_zoneInEditMode) exitZoneEditMode(_zoneInEditMode);
  _zoneInEditMode = id;
  const el = _zEl(id);
  el?.classList.add('zone-editing');
  // Move zone into overlay (z-index:50) so zone-body receives pointer events above nodes
  const overlay = document.getElementById('zone-edit-overlay');
  if (overlay && el) overlay.appendChild(el);
  _zoneEditCableStacking(true);

  _onDocDown = e => {
    const elCheck = _zEl(id);
    if (elCheck && elCheck.contains(e.target)) return;
    const panel = document.getElementById('info-panel');
    if (panel && panel.contains(e.target)) return;
    document.removeEventListener('pointerdown', _onDocDown, true);
    _onDocDown = null;
    clearSelZone();
    if (typeof closePanel === 'function') closePanel();
  };
  setTimeout(() => {
    if (_onDocDown) document.addEventListener('pointerdown', _onDocDown, true);
  }, 0);
}

function exitZoneEditMode(id) {
  if (_zoneInEditMode !== id) return;
  if (_onDocDown) {
    document.removeEventListener('pointerdown', _onDocDown, true);
    _onDocDown = null;
  }
  _zoneInEditMode = null;
  _zDrag   = null;
  _zResize = null;
  const el = _zEl(id);
  el?.classList.remove('zone-editing');
  // Move zone back to zones-layer
  const layer = _zLayer();
  if (layer && el) layer.appendChild(el);
  _zoneEditCableStacking(false);
}

// ── Deplacement d'une zone par son NOM (zone + contenu) ───────
// Extrait des gestionnaires de l'etiquette : le canevas doit pouvoir demarrer
// EXACTEMENT le meme geste. L'etiquette est en effet recouverte par le calque des
// appareils tant que la zone n'est pas selectionnee, et l'appui arrive alors au
// canevas, jamais a l'etiquette (constate le 2026-09-19 : le canevas se deplacait).
// Securite anti-regression : window._xZoneLabelMovesContent = false -> le nom
// selectionne seulement, comme avant l'ajout du deplacement avec le contenu.
function zoneLabelDragStart(id, e) {
  if (window._xZoneLabelMovesContent === false) {
    if (APP.selZone !== id) selectZone(id);
    return false;
  }
  const z = APP.zones[id];
  if (!z) return false;
  _zLabelDrag = {
    id, startX: e.clientX, startY: e.clientY,
    ox: z.x, oy: z.y, moved: false,
    locked: !!z.hidden,                 // zone masquee : selectionnable, pas deplacable
    members: z.hidden ? { nodes: [], labels: [], zones: [] } : _zoneMembers(id),
    dx: 0, dy: 0,
  };
  // Instantane des traces faits a la main, comme pour un glisser d'appareil : le
  // deplacement les TRANSLATE (redrawCablesMovingGroup, cables.js) au lieu de les
  // effacer. Seuls les cables touchant un appareil emporte sont concernes.
  // Securite anti-regression : window._xGroupCablePaths = false -> traces effaces
  // et recalcules, comportement du 2026-09-17.
  if (window._xGroupCablePaths !== false) {
    const ids = new Set(_zLabelDrag.members.nodes.map(s => s.id));
    APP.drag = APP.drag || {};
    APP.drag.cableSnapshot = {};
    for (const c of APP.cables) {
      if ((ids.has(c.from) || ids.has(c.to)) && cableOverrides[c.id]) {
        APP.drag.cableSnapshot[c.id] = cableOverrides[c.id].map(p => [...p]);
      }
    }
    _zLabelDrag.movedIds = ids;
  }
  return true;
}

// Renvoie true quand le geste a ete pris en charge, pour que l'appelant s'arrete la.
function zoneLabelDragMove(e) {
  if (!_zLabelDrag) return false;
  if (_zLabelDrag.locked) return true;
  const id = _zLabelDrag.id;
  const el = _zEl(id);
  const dx = (e.clientX - _zLabelDrag.startX) / APP.view.zoom;
  const dy = (e.clientY - _zLabelDrag.startY) / APP.view.zoom;
  if (!_zLabelDrag.moved && Math.hypot(dx, dy) < 3) return true;
  if (!_zLabelDrag.moved) { pushUndo(); _zLabelDrag.moved = true; }

  const z = APP.zones[id];
  if (!z) return true;
  z.x = _zLabelDrag.ox + dx;
  z.y = _zLabelDrag.oy + dy;
  if (el) { el.style.left = z.x + 'px'; el.style.top = z.y + 'px'; }

  const m = _zLabelDrag.members;
  for (const s of m.nodes) {
    const n = APP.nodes[s.id];
    if (!n) continue;
    n.x = s.x + dx; n.y = s.y + dy;
    n.cx = n.x + n.w / 2; n.cy = n.y + n.h / 2;
    const nel = document.getElementById(`n-${s.id}`);
    if (nel) { nel.style.left = n.x + 'px'; nel.style.top = n.y + 'px'; }
    if (typeof _updateLblPos === 'function') _updateLblPos(s.id);
  }
  for (const s of m.labels) {
    const tl = APP.textLabels[s.id];
    if (!tl) continue;
    tl.x = s.x + dx; tl.y = s.y + dy;
    const tel = document.getElementById(`tl-${s.id}`);
    if (tel) { tel.style.left = tl.x + 'px'; tel.style.top = tl.y + 'px'; }
  }
  for (const s of m.zones) {
    const zz = APP.zones[s.id];
    if (!zz) continue;
    zz.x = s.x + dx; zz.y = s.y + dy;
    const zel = document.getElementById(`zone-${s.id}`);
    if (zel) { zel.style.left = zz.x + 'px'; zel.style.top = zz.y + 'px'; }
  }
  // Cables : recalcul COMPLET, au plus une fois par image. redrawCablesMovingNode()
  // ne convient pas ici : elle repart de l'instantane de debut de geste pour TOUS les
  // cables a chaque appel, puis ne corrige que l'appareil qu'on lui passe — appelee
  // une fois par appareil deplace, chaque appel defait le precedent et les cables se
  // detachent (constate le 2026-09-17).
  _zLabelDrag.dx = dx;
  _zLabelDrag.dy = dy;
  if (!_zLabelDrag.rafId) {
    _zLabelDrag.rafId = requestAnimationFrame(() => {
      if (!_zLabelDrag) return;
      _zLabelDrag.rafId = null;
      if (_zLabelDrag.movedIds && typeof redrawCablesMovingGroup === 'function') {
        redrawCablesMovingGroup(_zLabelDrag.movedIds, _zLabelDrag.dx, _zLabelDrag.dy);
        return;
      }
      for (const s of _zLabelDrag.members.nodes) {
        for (const c of APP.cables) {
          if (c.from === s.id || c.to === s.id) delete cableOverrides[c.id];
        }
      }
      if (typeof renderCables === 'function') renderCables();
    });
  }
  if (APP.selZone === id) _updateZoneNodesPanel(id);
  return true;
}

function zoneLabelDragEnd() {
  if (!_zLabelDrag) return false;
  const id = _zLabelDrag.id;
  if (_zLabelDrag.rafId) cancelAnimationFrame(_zLabelDrag.rafId);
  if (_zLabelDrag.moved) {
    if (_zLabelDrag.movedIds && typeof redrawCablesMovingGroup === 'function') {
      // Dernier calage sur la position finale, puis nettoyage du trace : normalizePts
      // insere le bon coin, simplify supprime les points redondants. Aucun trace n'est
      // efface — c'est tout l'objet du correctif.
      redrawCablesMovingGroup(_zLabelDrag.movedIds, _zLabelDrag.dx, _zLabelDrag.dy);
      for (const c of APP.cables) {
        const pts = cableOverrides[c.id];
        if (!pts || pts.length < 2) continue;
        cableOverrides[c.id] = simplify(normalizePts(pts));
      }
      if (APP.drag) APP.drag.cableSnapshot = {};
    } else {
      for (const s of _zLabelDrag.members.nodes) {
        for (const c of APP.cables) {
          if (c.from === s.id || c.to === s.id) delete cableOverrides[c.id];
        }
      }
    }
    if (typeof renderCables === 'function') renderCables();
    setDirty();
    wLog('ZONE_MOVE_WITH_CONTENT', { id, nodes: _zLabelDrag.members.nodes.length });
  } else if (APP.selZone !== id) {
    selectZone(id);   // simple clic sur le nom : on selectionne, le panneau s'ouvre
  }
  _zLabelDrag = null;
  return true;
}

// Boite de l'etiquette d'une zone, en coordonnees canevas. Mesuree sur l'element
// quand il existe (sa taille depend du nom et de labelSize), sinon estimee.
function _zoneLabelBox(id) {
  const z = APP.zones[id];
  if (!z) return null;
  const el  = _zEl(id);
  const lab = el && el.querySelector('.zone-label');
  const h = lab ? lab.offsetHeight : Math.round((z.labelSize || 96) * 1.35 + 8);
  const w = lab ? lab.offsetWidth  : z.width;
  const GAP = 6;                        // meme ecart que la regle CSS .zone-label
  return { x: z.x + z.width / 2 - w / 2, y: z.y - GAP - h, w, h };
}

// Zone dont le NOM se trouve sous ce point (coordonnees canevas).
function findZoneLabelAtPoint(x, y) {
  let best = null, bestZ = -1;
  for (const id of Object.keys(APP.zones || {})) {
    const b = _zoneLabelBox(id);
    if (!b) continue;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      const zz = APP.zones[id].zIndex || 1;
      if (zz > bestZ) { best = id; bestZ = zz; }
    }
  }
  return best;
}

function findZoneAtPoint(x, y) {
  let best = null, bestZ = -1;
  for (const [id, z] of Object.entries(APP.zones || {})) {
    const inBody  = !z.hidden && x >= z.x && x <= z.x + z.width && y >= z.y && y <= z.y + z.height;
    const lb      = _zoneLabelBox(id);   // 50 points en dur laissaient passer le haut d'une etiquette
    const inLabel = !!lb && x >= lb.x && x <= lb.x + lb.w && y >= lb.y && y < z.y;
    if (inBody || inLabel) {
      const zz = z.zIndex || 1;
      if (zz > bestZ) { best = id; bestZ = zz; }
    }
  }
  return best;
}

function bringZoneToFront(id) {
  const maxZ = Object.values(APP.zones).reduce((m, z) => Math.max(m, z.zIndex || 1), 0);
  const z = APP.zones[id];
  if (!z) return;
  z.zIndex = maxZ + 1;
  const el = _zEl(id);
  if (el) el.style.zIndex = z.zIndex;
  setDirty();
}

// ── Inline label edit ─────────────────────────────────────────
function _editZoneLabelInline(id) {
  const z     = APP.zones[id];
  const el    = _zEl(id);
  if (!z || !el) return;
  const label = el.querySelector('.zone-label');
  if (!label) return;

  label.contentEditable = 'true';
  label.focus();
  const range = document.createRange();
  range.selectNodeContents(label);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  const finish = () => {
    label.contentEditable = 'false';
    const newName = label.textContent.trim() || 'Zone';
    z.name = newName;
    label.textContent = newName;
    const nameInput = document.getElementById('ip-zone-name');
    if (nameInput) nameInput.value = newName;
    setDirty();
    label.removeEventListener('blur',    finish);
    label.removeEventListener('keydown', onKey);
  };

  const onKey = e => {
    e.stopPropagation();
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); finish(); }
  };

  label.addEventListener('blur',    finish);
  label.addEventListener('keydown', onKey);
}

// ── Selection ─────────────────────────────────────────────────
function selectZone(id) {
  clearSelZone();
  clearSel();
  clearSelCable();
  APP.selZone = id;
  const el = _zEl(id);
  el?.classList.add('zone-sel');
  if (!APP.zones[id]?.hidden) {
    el?.querySelectorAll('.zone-rh').forEach(h => { h.style.display = 'block'; });
  }
  enterZoneEditMode(id);
  openZonePanel(id);
}

function clearSelZone() {
  if (!APP.selZone) return;
  const el = _zEl(APP.selZone);
  el?.querySelectorAll('.zone-rh').forEach(h => { h.style.display = ''; });
  exitZoneEditMode(APP.selZone);
  el?.classList.remove('zone-sel');
  APP.selZone = null;
}

// ── Delete ────────────────────────────────────────────────────
function deleteZone(id) {
  if (_zoneInEditMode === id) exitZoneEditMode(id);
  _zEl(id)?.remove();
  delete APP.zones[id];
  if (APP.selZone === id) APP.selZone = null;
  if (typeof closePanel === 'function') closePanel();
  setDirty();
}

// ── Delete zone and all devices inside ───────────────────────
function _deleteZoneAndContent(id) {
  const nodeIds = new Set(_getNodesInZone(id));

  // Delete cables connected to the nodes being removed
  APP.cables = APP.cables.filter(c => !nodeIds.has(c.from) && !nodeIds.has(c.to));

  // Remove node DOM elements
  for (const nid of nodeIds) {
    document.getElementById(`n-${nid}`)?.remove();
    document.getElementById(`nl-${nid}`)?.remove();
    delete APP.nodes[nid];
  }

  deleteZone(id);
  rebuildCM();
  renderCables();
  if (typeof refreshSidebar === 'function') refreshSidebar();
  setDirty();
}

// ── Sub-project: detach super-zone, keep content ─────────────
function _removeSuperZoneKeepContent(id) {
  const z = APP.zones[id];
  if (!z || !z.isSubproject) return;
  const spId = z.subproject_id;

  deleteZone(id);

  // Strip subproject_id so items become regular canvas content
  for (const z2 of Object.values(APP.zones)) {
    if (z2.subproject_id === spId) delete z2.subproject_id;
  }
  for (const n of Object.values(APP.nodes)) {
    if (n.subproject_id === spId) delete n.subproject_id;
  }
  for (const c of APP.cables) {
    if (c.subproject_id === spId) delete c.subproject_id;
  }

  renderAllZones();
  if (typeof refreshSidebar === 'function') refreshSidebar();
  setDirty();
}

// ── Sub-project: delete super-zone and all its content ───────
function _deleteSubprojectAll(spId) {
  // Delete all zones with this spId (super-zone + child zones)
  for (const [zid, z] of Object.entries(APP.zones)) {
    if (z.subproject_id === spId) {
      _zEl(zid)?.remove();
      delete APP.zones[zid];
    }
  }

  // Collect node IDs to delete
  const nodeIds = new Set(
    Object.entries(APP.nodes)
      .filter(([, n]) => n.subproject_id === spId)
      .map(([nid]) => nid)
  );

  // Delete cables belonging to this subproject OR connected to its nodes
  APP.cables = APP.cables.filter(c => {
    if (c.subproject_id === spId || nodeIds.has(c.from) || nodeIds.has(c.to)) return false;
    return true;
  });

  // Remove node DOM elements
  for (const nid of nodeIds) {
    document.getElementById(`n-${nid}`)?.remove();
    document.getElementById(`nl-${nid}`)?.remove();
    delete APP.nodes[nid];
  }

  APP.selZone = null;
  if (typeof closePanel === 'function') closePanel();

  rebuildCM();
  renderCables();
  if (typeof refreshSidebar === 'function') refreshSidebar();
  setDirty();
}

// ── Render all (on project load / undo-redo) ──────────────────
function renderAllZones() {
  const layer = _zLayer();
  if (!layer) return;
  layer.innerHTML = '';
  _zNextId = 1;
  for (const id of Object.keys(APP.zones)) {
    const num = parseInt(id.replace('z-', '')) || 0;
    if (num >= _zNextId) _zNextId = num + 1;
    _buildZoneEl(id);
  }
}

// ── Zone panel ────────────────────────────────────────────────
function openZonePanel(id) {
  const z = APP.zones[id];
  if (!z) return;
  const panel = document.getElementById('info-panel');

  const hdr = document.querySelector('#info-panel > .ip-header');
  const bdy = document.querySelector('#info-panel > .ip-body');
  if (hdr) hdr.style.display = 'none';
  if (bdy) bdy.style.display = 'none';
  const el = document.getElementById('ip-multi');
  if (el) el.style.display = 'none';
  const tlEl = document.getElementById('ip-textlabel');
  if (tlEl) tlEl.style.display = 'none';

  const zPanel = document.getElementById('ip-zone');
  if (!zPanel) return;
  zPanel.style.display = 'block';

  const nameInput = document.getElementById('ip-zone-name');
  if (nameInput) nameInput.value = z.name;
  const sizeInput = document.getElementById('ip-zone-labelsize');
  if (sizeInput) sizeInput.value = z.labelSize || 96;
  const hideBtn = document.getElementById('ip-zone-toggle-hide');
  if (hideBtn) hideBtn.textContent = z.hidden ? t('zone_show') : t('zone_hide');

  // Color swatches
  const colorsDiv = document.getElementById('ip-zone-colors');
  if (colorsDiv) {
    colorsDiv.innerHTML = '';
    ZONE_COLORS.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'zone-color-btn';
      btn.style.background = c;
      if (c === z.color) btn.classList.add('active');
      btn.title = c;
      btn.addEventListener('click', () => {
        if (!APP.selZone) return;
        pushUndo();
        APP.zones[APP.selZone].color = c;
        _applyZoneStyles(APP.selZone, _zEl(APP.selZone));
        colorsDiv.querySelectorAll('.zone-color-btn').forEach(b => {
          b.classList.toggle('active', b.style.background === c || b.title === c);
        });
        setDirty();
      });
      colorsDiv.appendChild(btn);
    });
  }

  // Opacity
  const opSlider = document.getElementById('ip-zone-opacity');
  const opVal    = document.getElementById('ip-zone-opacity-val');
  if (opSlider) opSlider.value = Math.round(z.opacity * 100);
  if (opVal)    opVal.textContent = Math.round(z.opacity * 100) + '%';

  _updateZoneNodesPanel(id);

  // Show/hide controls depending on zone type
  const isSpZone = !!z.isSubproject;
  const deleteBtn        = document.getElementById('ip-zone-delete');
  const deleteContentBtn = document.getElementById('ip-zone-delete-content');
  const spActions        = document.getElementById('ip-zone-sp-actions');
  if (deleteBtn)        deleteBtn.style.display        = isSpZone ? 'none' : '';
  if (deleteContentBtn) deleteContentBtn.style.display = isSpZone ? 'none' : '';
  if (spActions)        spActions.style.display        = isSpZone ? 'block' : 'none';

  panel.classList.add('open');
}

function _updateZoneNodesPanel(id) {
  const z   = APP.zones[id];
  const div = document.getElementById('ip-zone-nodes');
  if (!z || !div) return;
  div.innerHTML = '';
  const inside = _getNodesInZone(id);
  if (!inside.length) {
    div.innerHTML = `<div style="font-family:var(--mono);font-size:11px;color:var(--textdim);padding:4px 0">${t('no_devices')}</div>`;
    return;
  }
  inside.forEach(nodeId => {
    const s = APP.nodes[nodeId];
    if (!s) return;
    const cat = getCat(s.cat);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:3px 0;cursor:pointer;border-radius:3px';
    row.innerHTML = `
      <div style="width:8px;height:8px;border-radius:50%;background:${escapeHtml(cat.color)};flex-shrink:0"></div>
      <span style="font-family:var(--mono);font-size:11px;color:var(--text)">${escapeHtml(s.short || s.name)}</span>
    `;
    row.addEventListener('click', () => selectNode(nodeId));
    div.appendChild(row);
  });
}

function _getNodesInZone(id) {
  const z = APP.zones[id];
  if (!z) return [];
  return Object.entries(APP.nodes)
    .filter(([, s]) => {
      const cx = s.x + s.w / 2;
      const cy = s.y + s.h / 2;
      return cx >= z.x && cx <= z.x + z.width && cy >= z.y && cy <= z.y + z.height;
    })
    .map(([nid]) => nid);
}

// ── Place mode (click+drag to draw zone) ──────────────────────
function startZonePlaceMode() {
  if (typeof _routeStepPending === 'function' && _routeStepPending()) return; // câble en attente de sa route
  _zPlace = true;
  document.getElementById('canvas-area').style.cursor = 'crosshair';

  let banner = document.getElementById('cable-add-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'cable-add-banner';
    document.body.appendChild(banner);
  }
  banner.innerHTML = t('zone_create_hint')
    + ` <button class="cab-cancel-btn" onclick="exitZonePlaceMode()">✕ ${t('cancel')}</button>`;
  banner.classList.add('visible');

  const area = document.getElementById('canvas-area');
  const root = document.getElementById('canvas-root');

  const onDown = e => {
    if (!_zPlace || e.button !== 0) return;
    if (!_EMPTY_TARGETS.has(e.target.id)) return;
    e.stopImmediatePropagation();
    _zPlaceStart = screenToCanvas(e.clientX, e.clientY);
    _zPlaceEl = document.createElement('div');
    _zPlaceEl.id = 'zone-preview';
    _zPlaceEl.style.cssText = 'position:absolute;pointer-events:none;border:2px dashed rgba(0,212,255,.7);background:rgba(0,212,255,.08);border-radius:4px';
    root.appendChild(_zPlaceEl);
    area.setPointerCapture(e.pointerId);
  };

  const onMove = e => {
    if (!_zPlace || !_zPlaceStart || !_zPlaceEl) return;
    const cur = screenToCanvas(e.clientX, e.clientY);
    const x = Math.min(_zPlaceStart.x, cur.x);
    const y = Math.min(_zPlaceStart.y, cur.y);
    const w = Math.abs(cur.x - _zPlaceStart.x);
    const h = Math.abs(cur.y - _zPlaceStart.y);
    _zPlaceEl.style.left   = x + 'px';
    _zPlaceEl.style.top    = y + 'px';
    _zPlaceEl.style.width  = w + 'px';
    _zPlaceEl.style.height = h + 'px';
  };

  const onUp = e => {
    if (!_zPlace || !_zPlaceStart) return;
    const cur = screenToCanvas(e.clientX, e.clientY);
    const x   = Math.min(_zPlaceStart.x, cur.x);
    const y   = Math.min(_zPlaceStart.y, cur.y);
    const w   = Math.abs(cur.x - _zPlaceStart.x);
    const h   = Math.abs(cur.y - _zPlaceStart.y);
    _zPlaceEl?.remove(); _zPlaceEl = null;
    _zPlaceStart = null;
    if (w > 30 && h > 30) {
      pushUndo();
      addZone(x, y, w, h);
    }
    exitZonePlaceMode();
    area.removeEventListener('pointerdown', onDown, true);
    area.removeEventListener('pointermove', onMove);
    area.removeEventListener('pointerup',   onUp);
  };

  area.addEventListener('pointerdown', onDown, true);
  area.addEventListener('pointermove', onMove);
  area.addEventListener('pointerup',   onUp);
}

// Ré-affiche le texte du bandeau dans la langue courante, sans changer l'état
// (appelé par setLang() car ce bandeau est injecté en JS, pas via data-i18n).
function _refreshZonePlaceBanner() {
  if (!_zPlace) return;
  const banner = document.getElementById('cable-add-banner');
  if (!banner) return;
  banner.innerHTML = t('zone_create_hint')
    + ` <button class="cab-cancel-btn" onclick="exitZonePlaceMode()">✕ ${t('cancel')}</button>`;
}

function exitZonePlaceMode() {
  _zPlace = false;
  document.getElementById('canvas-area').style.cursor = '';
  const banner = document.getElementById('cable-add-banner');
  if (banner) banner.classList.remove('visible');
}

// ── Panel init ────────────────────────────────────────────────
function initZones() {
  document.getElementById('ip-zone-close')?.addEventListener('click', () => {
    clearSelZone();
    if (typeof closePanel === 'function') closePanel();
  });

  document.getElementById('ip-zone-toggle-hide')?.addEventListener('click', () => {
    if (!APP.selZone) return;
    const z = APP.zones[APP.selZone];
    if (!z) return;
    pushUndo();
    z.hidden = !z.hidden;
    _applyZoneStyles(APP.selZone, _zEl(APP.selZone));
    const btn = document.getElementById('ip-zone-toggle-hide');
    if (btn) btn.textContent = z.hidden ? t('zone_show') : t('zone_hide');
    setDirty();
  });

  document.getElementById('ip-zone-name')?.addEventListener('input', () => {
    if (!APP.selZone) return;
    const z = APP.zones[APP.selZone];
    if (!z) return;
    z.name = document.getElementById('ip-zone-name').value;
    const domEl = _zEl(APP.selZone);
    const lbl   = domEl?.querySelector('.zone-label');
    if (lbl && lbl.contentEditable !== 'true') lbl.textContent = z.name;
    setDirty();
  });

  document.getElementById('ip-zone-labelsize')?.addEventListener('input', e => {
    if (!APP.selZone) return;
    const z = APP.zones[APP.selZone];
    if (!z) return;
    const v = Math.max(12, Math.min(400, parseInt(e.target.value) || 96));
    z.labelSize = v;
    const lbl = _zEl(APP.selZone)?.querySelector('.zone-label');
    if (lbl) lbl.style.fontSize = v + 'px';
    setDirty();
  });

  const opSlider = document.getElementById('ip-zone-opacity');
  const opVal    = document.getElementById('ip-zone-opacity-val');
  opSlider?.addEventListener('input', e => {
    if (!APP.selZone) return;
    const z = APP.zones[APP.selZone];
    if (!z) return;
    z.opacity = parseInt(e.target.value) / 100;
    if (opVal) opVal.textContent = e.target.value + '%';
    _applyZoneStyles(APP.selZone, _zEl(APP.selZone));
    setDirty();
  });

  document.getElementById('ip-zone-delete')?.addEventListener('click', () => {
    if (!APP.selZone) return;
    const idToDelete = APP.selZone;
    showConfirm(t('delete_zone_confirm'), { danger: true }).then(ok => {
      if (ok) { pushUndo(); deleteZone(idToDelete); }
    });
  });

  document.getElementById('ip-zone-delete-content')?.addEventListener('click', () => {
    if (!APP.selZone) return;
    const id = APP.selZone;
    const inside = _getNodesInZone(id);
    const msg = inside.length > 0
      ? t('delete_zone_content').replace('$n', inside.length)
      : t('delete_zone_empty');
    showConfirm(msg, { danger: true }).then(ok => {
      if (!ok) return;
      pushUndo();
      _deleteZoneAndContent(id);
    });
  });

  document.getElementById('ip-zone-sp-detach')?.addEventListener('click', () => {
    if (!APP.selZone) return;
    const id = APP.selZone;
    showConfirm(t('detach_subproject')).then(ok => {
      if (!ok) return;
      pushUndo();
      _removeSuperZoneKeepContent(id);
    });
  });

  document.getElementById('ip-zone-sp-delete-all')?.addEventListener('click', () => {
    if (!APP.selZone) return;
    const id = APP.selZone;
    const z = APP.zones[id];
    if (!z?.isSubproject) return;
    const spId = z.subproject_id;
    const nc = Object.values(APP.nodes).filter(n => n.subproject_id === spId).length;
    const zc = Object.values(APP.zones).filter(z2 => z2.subproject_id === spId && !z2.isSubproject).length;
    const msg = t('remove_subproject').replace('$name', z.name).replace('$nd', nc).replace('$nz', zc);
    showConfirm(msg, { danger: true }).then(ok => {
      if (!ok) return;
      pushUndo();
      _deleteSubprojectAll(spId);
    });
  });

  document.getElementById('add-dd-zone')?.addEventListener('click', () => {
    document.getElementById('add-dropdown')?.classList.remove('open');
    startZonePlaceMode();
  });
}
