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
  // Sélectionner un appareil fermerait le panneau Routes pendant le formulaire de route d'un nouveau câble : avertir d'abord.
  if (typeof _routeStepFormOpen === 'function' && _routeStepFormOpen()) { _confirmLeaveRouteStep(() => selectNode(id)); return; }
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

  _applySelCableDim(cabSet);

  openInfoPanel(id);
  enterResizeMode(id);
}

// Câbles de l'appareil sélectionné en évidence, tous les autres estompés. Filtre catégorie/câble/zone actif :
// un câble qu'il masque ne doit jamais être rallumé par la sélection, même connecté à l'appareil sélectionné —
// le filtre l'emporte toujours (voir _computeCatZoneState/_cablePassesFilter, library.js).
function _applySelCableDim(cabSet) {
  const filtersActive = !(_catFilter.has('__ALL__') && _cableFilter.has('__ALL__') && _zoneFilter.has('__ALL__'));
  const catZoneState = filtersActive ? _computeCatZoneState() : null;

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
}

// Tout redessin des câbles (renderCables et redrawOnlyCables, cables.js) les recrée dans leur état normal : sans
// ceci, déplacer ou redimensionner l'appareil sélectionné rallumait les câbles sans rapport avec lui. Rien pendant
// une route, qui gère son propre estompage. window._xSelDimOnRedraw = false en console : ancien comportement.
function reapplySelCableDim() {
  if (window._xSelDimOnRedraw === false || !APP.sel || !APP.nodes[APP.sel]) return;
  if (typeof _isDimmingActive === 'function' && _isDimmingActive()) return;
  const cabSet = new Set();
  for (const conn of CM[APP.sel] || []) cabSet.add(conn.cid);
  // Sans le fondu d'opacité (main.css) : un câble branché à l'arrière est mesuré pendant son dessin (occlusion,
  // cables.js), ce qui fait prendre en compte son état normal à l'écran — le fondu le ferait alors réapparaître
  // puis s'effacer à chaque redessin, et clignoter pendant un déplacement. L'état final est pris en compte
  // (getBoundingClientRect) avant de rendre le fondu, qui ne rejoue donc rien.
  const svg = document.getElementById('cables-svg');
  svg?.classList.add('cables-no-transition');
  _applySelCableDim(cabSet);
  if (svg) { void svg.getBoundingClientRect(); svg.classList.remove('cables-no-transition'); }
}

// Resélectionne un appareil dont le DOM vient d'être reconstruit (↻ Avant/Arrière, modification
// appliquée). selectNode() redessine alors tous les câbles à leur état normal avant de les estomper,
// et un câble branché sur une vue Arrière est mesuré pendant ce dessin (occlusion, cables.js) :
// l'estompage partait en fondu, le câble réapparaissait 0,2 s avant de s'effacer (journal du
// 2026-09-15). Fondu coupé le temps de la resélection, comme dans reapplySelCableDim ; cliquer
// sur un autre appareil garde le sien.
// window._xReselectNoFade = false en console : ancien comportement (fondu rejoué).
function reselectNode(sid) {
  if (window._xReselectNoFade === false) { APP.sel = null; selectNode(sid); return; }
  const svg = document.getElementById('cables-svg');
  svg?.classList.add('cables-no-transition');
  APP.sel = null;
  selectNode(sid);
  if (svg) { void svg.getBoundingClientRect(); svg.classList.remove('cables-no-transition'); }
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
