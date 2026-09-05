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
  label.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (APP.selZone !== id) selectZone(id);
  });

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
}

function findZoneAtPoint(x, y) {
  let best = null, bestZ = -1;
  for (const [id, z] of Object.entries(APP.zones || {})) {
    const inBody  = !z.hidden && x >= z.x && x <= z.x + z.width && y >= z.y && y <= z.y + z.height;
    const inLabel = x >= z.x && x <= z.x + z.width && y >= z.y - 50 && y < z.y;
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
