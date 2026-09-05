/* ═══════════════════════════════════════════════════════════════
   select.js — Sélection nœuds, états dim/lit/sel
═══════════════════════════════════════════════════════════════ */

function clearSelMulti() {
  if (!APP.selMulti || !APP.selMulti.size) return;
  APP.selMulti.forEach(id => {
    document.getElementById(`n-${id}`)?.classList.remove('sel-multi');
  });
  APP.selMulti.clear();
}

function selectNode(id) {
  if (APP.drag?.active || APP.drag?.moved || _segDragState || _segDragged) return;
  if (APP.sel === id) { clearSelMulti(); return; }
  if (typeof _resetCanvasOpacity === 'function') _resetCanvasOpacity();

  clearSelMulti();
  clearSelCable();
  if (typeof clearSelTextLabel === 'function') clearSelTextLabel();
  if (typeof clearSelZone      === 'function') clearSelZone();
  // Panneau Routes et panneau appareil : mutuellement exclusifs (voir ui.js/panel.js) —
  // sélectionner un appareil pendant que le panneau Routes est ouvert le referme.
  document.getElementById('routes-panel')?.classList.remove('open');
  APP.sel = id;
  wLog('NODE_SEL', { id, name: APP.nodes[id]?.name, cat: APP.nodes[id]?.cat });

  const litSet = new Set();
  const cabSet = new Set();

  if (CM[id]) {
    for (const conn of CM[id]) {
      litSet.add(conn.sid);
      cabSet.add(conn.cid);
    }
  }

  // Mettre à jour les classes des nœuds
  for (const nid of Object.keys(APP.nodes)) {
    const el = document.getElementById(`n-${nid}`);
    if (!el) continue;
    // L'étiquette (nl-*) est hors de .node : lui refléter l'estompage
    const lbl = document.getElementById(`nl-${nid}`);
    el.classList.remove('sel', 'lit', 'dim', 'route-dim');
    lbl?.classList.remove('dim', 'route-dim');
    if (nid === id)          el.classList.add('sel');
    else if (litSet.has(nid)) el.classList.add('lit');
    else { el.classList.add('dim'); lbl?.classList.add('dim'); }
  }

  // Filtre catégorie/câble/zone actif : un câble qu'il masque ne doit jamais être
  // rallumé par la sélection, même connecté à l'appareil sélectionné — le filtre
  // l'emporte toujours (voir _computeCatZoneState/_cablePassesFilter, library.js).
  const filtersActive = !(_catFilter.has('__ALL__') && _cableFilter.has('__ALL__') && _zoneFilter.has('__ALL__'));
  const catZoneState = filtersActive ? _computeCatZoneState() : null;

  // Mettre à jour les câbles visuels
  const visuals = document.querySelectorAll('#cables-svg .cable-visual');
  visuals.forEach(p => {
    const cid = +p.dataset.cid;
    const hit = _svg?.querySelector(`.cable-hit[data-cid="${cid}"]`);
    const c = filtersActive ? APP.cables.find(x => x.id === cid) : null;

    if (c && !_cablePassesFilter(c, catZoneState)) {
      p.setAttribute('opacity', '0');
      p.setAttribute('stroke-width', '1');
      p.removeAttribute('filter');
      delete p.dataset.selected;
      if (hit) hit.style.pointerEvents = 'none';
      return;
    }

    if (hit) hit.style.pointerEvents = '';
    if (cabSet.has(cid)) {
      p.setAttribute('stroke-width', '4.5');
      p.setAttribute('opacity', '0.97');
      p.setAttribute('filter', 'url(#glow)');
      p.dataset.selected = '1';
    } else {
      p.setAttribute('opacity', '0.03');
      p.setAttribute('stroke-width', '1');
      p.removeAttribute('filter');
      delete p.dataset.selected;
    }
  });

  openInfoPanel(id);
  enterResizeMode(id);
}

function clearSel() {
  clearSelMulti();
  if (typeof clearSelTextLabel === 'function') clearSelTextLabel();
  if (typeof clearSelZone      === 'function') clearSelZone();
  APP.sel = null;

  for (const nid of Object.keys(APP.nodes)) {
    const el = document.getElementById(`n-${nid}`);
    el?.classList.remove('sel', 'lit', 'dim', 'route-dim');
    document.getElementById(`nl-${nid}`)?.classList.remove('dim', 'route-dim');
  }

  // Restaurer câbles
  document.querySelectorAll('#cables-svg .cable-visual').forEach(p => {
    delete p.dataset.selected;
    p.removeAttribute('filter');
    p.setAttribute('stroke-width', '3.5');
    p.setAttribute('opacity', '0.85');
  });

  exitResizeMode();
  if (typeof applyCanvasFilters === 'function') applyCanvasFilters();
}
