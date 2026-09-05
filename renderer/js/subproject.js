/* ═══════════════════════════════════════════════════════════════
   subproject.js — Import a .wires file as a sub-project
═══════════════════════════════════════════════════════════════ */

let _spPlaceActive = false;

async function importSubproject() {
  if (!LICENSE.isPro()) { LICENSE.showGate('subprojects'); return; }
  if (!window.electronAPI) return;

  const result = await window.electronAPI.openDialog();
  if (!result) return;

  let data;
  try { data = JSON.parse(result.data); }
  catch(e) { alert('Invalid project file.'); return; }
  if (!data || data.version !== 1) { alert('Unsupported file format.'); return; }

  const importedNodes = (data.nodes || []).filter(n => n.cat !== 'internet');
  if (!importedNodes.length) { alert('This project contains no importable devices.'); return; }

  // Bounding box of imported content (canvas-space)
  const PAD   = 60;
  const srcMinX = Math.min(...importedNodes.map(n => n.x));
  const srcMinY = Math.min(...importedNodes.map(n => n.y));
  const srcMaxX = Math.max(...importedNodes.map(n => n.x + n.w));
  const srcMaxY = Math.max(...importedNodes.map(n => n.y + n.h));
  const ghostW  = srcMaxX - srcMinX + PAD * 2;
  const ghostH  = srcMaxY - srcMinY + PAD * 2;

  _startSubprojectPlaceMode(data, importedNodes, ghostW, ghostH, srcMinX, srcMinY);
}

// ── Collision : ghost rect vs existing nodes (+ label) ───────
function _ghostCollides(gx, gy, gw, gh) {
  for (const n of Object.values(APP.nodes)) {
    const bottom = n.y + n.h + 14 + (n.lblSize || 48);
    if (gx < n.x + n.w && gx + gw > n.x &&
        gy < bottom      && gy + gh > n.y) return true;
  }
  return false;
}

// ── Placement mode ────────────────────────────────────────────
function _startSubprojectPlaceMode(data, importedNodes, ghostW, ghostH, srcMinX, srcMinY) {
  if (_spPlaceActive) return;
  _spPlaceActive = true;

  const area  = document.getElementById('canvas-area');
  const root  = document.getElementById('canvas-root');

  // Ghost element
  const ghost = document.createElement('div');
  ghost.id = 'sp-ghost';
  ghost.style.cssText = `
    position:absolute; pointer-events:none; z-index:200;
    width:${ghostW}px; height:${ghostH}px;
    border:2px dashed rgba(0,176,240,0.9);
    background:rgba(0,176,240,0.35);
    border-radius:6px; box-sizing:border-box;
    display:flex; align-items:center; justify-content:center;
    transition:background .1s, border-color .1s;
  `;
  const ghostLabel = document.createElement('span');
  ghostLabel.id = 'sp-ghost-label';
  ghostLabel.style.cssText = 'font-family:monospace;font-size:12px;letter-spacing:1px;color:rgba(0,176,240,0.9);pointer-events:none;text-align:center;padding:4px';
  ghostLabel.textContent = data.meta?.title || 'Import';
  ghost.appendChild(ghostLabel);
  root.appendChild(ghost);

  // Banner
  let banner = document.getElementById('cable-add-banner');
  if (!banner) { banner = document.createElement('div'); banner.id = 'cable-add-banner'; document.body.appendChild(banner); }
  banner.innerHTML = t('sp_place_banner') + ' <strong>' + escapeHtml(data.meta?.title || 'project') + '</strong> &nbsp;'
    + `<button class="cab-cancel-btn" id="sp-cancel-btn">✕ ${t('cancel')}</button>`;
  banner.classList.add('visible');
  document.getElementById('sp-cancel-btn')?.addEventListener('click', _cancelSubprojectPlace);

  area.style.cursor = 'crosshair';
  const _sidebar = document.getElementById('sidebar-left');
  if (_sidebar) _sidebar.style.pointerEvents = 'none';

  let _canPlace = false;
  let _ghostX = 0, _ghostY = 0;
  let _mouseClientX = 0, _mouseClientY = 0;
  let _edgePanRafId = null;

  const EDGE_ZONE  = 80;   // px depuis le bord pour déclencher le pan
  const BASE_SPEED = 5;    // px/frame à pleine vitesse
  const SLOW_RATIO = 0.12; // ratio quand le ghost est bleu

  const _updateGhost = () => {
    const pos = screenToCanvas(_mouseClientX, _mouseClientY);
    _ghostX = pos.x - ghostW / 2;
    _ghostY = pos.y - ghostH / 2;
    ghost.style.left = _ghostX + 'px';
    ghost.style.top  = _ghostY + 'px';

    _canPlace = !_ghostCollides(_ghostX, _ghostY, ghostW, ghostH);

    if (_canPlace) {
      ghost.style.borderColor = 'rgba(0,176,240,0.9)';
      ghost.style.background  = 'rgba(0,176,240,0.35)';
      ghostLabel.style.color  = 'rgba(0,176,240,0.9)';
      area.style.cursor = 'crosshair';
    } else {
      ghost.style.borderColor = 'rgba(255,60,60,0.9)';
      ghost.style.background  = 'rgba(255,60,60,0.35)';
      ghostLabel.style.color  = 'rgba(255,60,60,0.9)';
      area.style.cursor = 'not-allowed';
    }
  };

  const _edgePanLoop = () => {
    if (!_spPlaceActive) return;
    _edgePanRafId = requestAnimationFrame(_edgePanLoop);

    const rect = area.getBoundingClientRect();
    const mx = _mouseClientX - rect.left;
    const my = _mouseClientY - rect.top;
    const W  = rect.width;
    const H  = rect.height;

    let dx = 0, dy = 0;
    if (mx < EDGE_ZONE)       dx = -(1 - mx / EDGE_ZONE)       * BASE_SPEED;
    if (mx > W - EDGE_ZONE)   dx =  (1 - (W - mx) / EDGE_ZONE) * BASE_SPEED;
    if (my < EDGE_ZONE)       dy = -(1 - my / EDGE_ZONE)       * BASE_SPEED;
    if (my > H - EDGE_ZONE)   dy =  (1 - (H - my) / EDGE_ZONE) * BASE_SPEED;

    if (dx === 0 && dy === 0) return;

    const speed = _canPlace ? SLOW_RATIO : 1;
    APP.view.panX -= dx * speed;
    APP.view.panY -= dy * speed;
    applyT();
    _updateGhost();
  };

  const onMove = e => {
    _mouseClientX = e.clientX;
    _mouseClientY = e.clientY;
    _updateGhost();
  };

  const onDown = e => {
    if (e.button !== 0) return;
    if (!_canPlace) return;
    e.stopPropagation();

    const offsetX = _ghostX + 60 - srcMinX;  // 60 = PAD
    const offsetY = _ghostY + 60 - srcMinY;

    _cleanup();
    _placeSubproject(data, importedNodes, offsetX, offsetY);
  };

  const onKey = e => { if (e.key === 'Escape') _cancelSubprojectPlace(); };

  const _cleanup = () => {
    _spPlaceActive = false;
    ghost.remove();
    if (_edgePanRafId) { cancelAnimationFrame(_edgePanRafId); _edgePanRafId = null; }
    area.removeEventListener('pointermove', onMove);
    area.removeEventListener('pointerdown', onDown, true);
    document.removeEventListener('keydown', onKey);
    area.style.cursor = '';
    if (_sidebar) _sidebar.style.pointerEvents = '';
    const b = document.getElementById('cable-add-banner');
    if (b) b.classList.remove('visible');
  };

  window._cancelSubprojectPlace = _cleanup;

  area.addEventListener('pointermove', onMove);
  area.addEventListener('pointerdown', onDown, true);
  document.addEventListener('keydown', onKey);

  _edgePanRafId = requestAnimationFrame(_edgePanLoop);
}

function _cancelSubprojectPlace() {
  if (typeof window._cancelSubprojectPlace === 'function') {
    window._cancelSubprojectPlace();
    window._cancelSubprojectPlace = null;
  }
}

// ── Place the imported content at the chosen position ─────────
function _placeSubproject(data, importedNodes, offsetX, offsetY) {
  const spId = 'sp-' + Date.now();

  pushUndo();

  // Map old node IDs → new IDs
  const nodeIdMap = {};
  for (const n of importedNodes) {
    const newId = uuid();
    nodeIdMap[n.id] = newId;
    const nx = n.x + offsetX;
    const ny = n.y + offsetY;
    APP.nodes[newId] = {
      ...n, id: newId,
      x: nx, y: ny,
      cx: nx + n.w / 2, cy: ny + n.h / 2,
      subproject_id: spId,
    };
  }

  // Import cables (only internal ones) — build cableIdMap for route remapping
  const cableIdMap = {};
  for (const c of (data.cables || [])) {
    const newFrom = nodeIdMap[c.from];
    const newTo   = nodeIdMap[c.to];
    if (!newFrom || !newTo) continue;
    const newCableId = _nextCableId++;
    cableIdMap[c.id] = newCableId;
    APP.cables.push({
      ...c, id: newCableId,
      from: newFrom, to: newTo,
      subproject_id: spId,
    });
  }

  // Import signal routes — remap cableIds in segments and paths
  const _remapSegs = segs => (segs || [])
    .filter(s => cableIdMap[s.cableId] !== undefined)
    .map(s => ({ ...s, cableId: cableIdMap[s.cableId] }));

  const _remapPaths = function remap(paths) {
    return (paths || []).map(p => ({
      ...p, id: uuid(),
      segments: _remapSegs(p.segments),
      paths: remap(p.paths),
    }));
  };

  for (const ch of (data.chains || [])) {
    const remappedSegs = _remapSegs(ch.segments);
    if (!remappedSegs.length) continue;
    APP.chains.push({
      ...ch, id: uuid(),
      segments: remappedSegs,
      paths: _remapPaths(ch.paths),
      subproject_id: spId,
    });
  }

  // Import sub-zones
  for (const z of Object.values(data.zones || {})) {
    const newZid = _newZoneId();
    APP.zones[newZid] = {
      ...z, id: newZid,
      x: z.x + offsetX, y: z.y + offsetY,
      subproject_id: spId,
    };
  }

  // Bounding box of placed nodes → super-zone
  const addedNodes = Object.values(APP.nodes).filter(n => n.subproject_id === spId);
  const PAD  = 60;
  const minX = Math.min(...addedNodes.map(n => n.x)) - PAD;
  const minY = Math.min(...addedNodes.map(n => n.y)) - PAD;
  const maxX = Math.max(...addedNodes.map(n => n.x + n.w)) + PAD;
  const maxY = Math.max(...addedNodes.map(n => n.y + n.h)) + PAD;

  const superZoneId = _newZoneId();
  const maxZIdx = Object.values(APP.zones).reduce((m, z) => Math.max(m, z.zIndex || 1), 0);
  APP.zones[superZoneId] = {
    id: superZoneId,
    x: minX, y: minY,
    width:  maxX - minX,
    height: maxY - minY,
    name:   data.meta?.title || 'Imported project',
    color:  '#00b0f0',
    opacity: 0.3,
    labelSize: 96,
    hidden: false,
    zIndex: maxZIdx + 1,
    isSubproject: true,
    subproject_id: spId,
  };

  renderNodes();
  rebuildCM();
  renderCables();
  renderAllZones();
  if (typeof renderRoutesList === 'function') renderRoutesList();
  refreshSidebar();
  setDirty();
  requestAnimationFrame(() => fitView());
}
