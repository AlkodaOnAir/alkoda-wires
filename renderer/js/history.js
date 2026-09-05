/* ═══════════════════════════════════════════════════════════════
   history.js — Undo / Redo
═══════════════════════════════════════════════════════════════ */

function initHistory() {
  updateUndoRedoBtns();
}

function captureState() {
  // Couleurs catégories (id → color)
  const catColors = {};
  for (const c of (APP.categories || [])) { if (!c.virtual) catColors[c.id] = c.color; }
  return {
    nodes:              JSON.parse(JSON.stringify(APP.nodes)),
    cables:             APP.cables.map(c => ({ ...c })),
    chains:             JSON.parse(JSON.stringify(APP.chains)),
    waypoints:          JSON.parse(JSON.stringify(cableOverrides)),
    textLabels:         JSON.parse(JSON.stringify(APP.textLabels)),
    zones:              JSON.parse(JSON.stringify(APP.zones)),
    cableColorOverrides:{ ...USER_CABLE_COLOR_OVERRIDES },
    cableDashOverrides: { ...USER_CABLE_DASH_OVERRIDES  },
    customRouteTypes:   JSON.parse(JSON.stringify(USER_ROUTE_TYPES)),
    customRouteColors:  [...USER_ROUTE_COLORS],
    catColors,
    nativeCatColors:    { ...NATIVE_CAT_COLOR_OVERRIDES },
  };
}

function pushUndo() {
  APP.undo.push(captureState());
  if (APP.undo.length > MAX_UNDO) APP.undo.shift();
  APP.redo.length = 0;
  updateUndoRedoBtns();
  scheduleSave();
  if (typeof refreshSidebar === 'function') refreshSidebar();
}

function undo() {
  if (!APP.undo.length) return;
  wLog('UNDO', { remaining: APP.undo.length - 1 });
  APP.redo.push(captureState());
  applyState(APP.undo.pop());
  updateUndoRedoBtns();
}

function redo() {
  if (!APP.redo.length) return;
  wLog('REDO', { remaining: APP.redo.length - 1 });
  APP.undo.push(captureState());
  applyState(APP.redo.pop());
  updateUndoRedoBtns();
}

function applyState(state) {
  // Restaurer nœuds complets
  APP.nodes      = JSON.parse(JSON.stringify(state.nodes));
  APP.cables     = state.cables.map(c => ({ ...c }));
  APP.chains     = JSON.parse(JSON.stringify(state.chains || []));
  APP.textLabels = JSON.parse(JSON.stringify(state.textLabels || {}));
  APP.zones      = JSON.parse(JSON.stringify(state.zones      || {}));

  cableOverrides = JSON.parse(JSON.stringify(state.waypoints || {}));

  // Restaurer overrides couleur/dash câbles
  Object.keys(USER_CABLE_COLOR_OVERRIDES).forEach(k => delete USER_CABLE_COLOR_OVERRIDES[k]);
  Object.assign(USER_CABLE_COLOR_OVERRIDES, state.cableColorOverrides || {});
  Object.keys(USER_CABLE_DASH_OVERRIDES).forEach(k => delete USER_CABLE_DASH_OVERRIDES[k]);
  Object.assign(USER_CABLE_DASH_OVERRIDES,  state.cableDashOverrides  || {});
  if (state.customRouteTypes) USER_ROUTE_TYPES = JSON.parse(JSON.stringify(state.customRouteTypes));
  if (state.customRouteColors) USER_ROUTE_COLORS = [...state.customRouteColors];
  // Restaurer couleurs catégories
  for (const [id, color] of Object.entries(state.catColors || {})) {
    const cat = APP.categories.find(c => c.id === id);
    if (cat) cat.color = color;
  }
  Object.keys(NATIVE_CAT_COLOR_OVERRIDES).forEach(k => delete NATIVE_CAT_COLOR_OVERRIDES[k]);
  Object.assign(NATIVE_CAT_COLOR_OVERRIDES, state.nativeCatColors || {});
  // Persister les overrides restaurés
  if (typeof saveUserCats === 'function') saveUserCats();

  // Une zone en cours d'édition (enterZoneEditMode, zones.js) a son élément DOM déplacé
  // dans #zone-edit-overlay, hors de #zones-layer — renderAllZones() ne vide que ce
  // dernier, donc une zone encore "en édition" au moment d'un undo/redo resterait
  // orpheline dans l'overlay, invisible pour le nettoyage. clearSelZone() la ramène
  // d'abord dans sa couche normale (exitZoneEditMode) avant tout re-rendu.
  if (typeof clearSelZone === 'function') clearSelZone();
  if (typeof clearSelTextLabel === 'function') clearSelTextLabel();

  // Re-render
  renderNodes();
  rebuildCM();
  renderCables();
  if (typeof renderAllTextLabels  === 'function') renderAllTextLabels();
  if (typeof renderAllZones       === 'function') renderAllZones();
  if (typeof renderSidebarCables  === 'function') renderSidebarCables();
  clearSel();
  closePanel();
  // La fenêtre d'édition d'une route (routes.js::_openCreateRouteModal), si
  // ouverte, garde en mémoire une référence directe vers son ancienne chain —
  // devenue une copie fantôme dès qu'un undo/redo remplace APP.chains. Elle
  // se resynchronise sur la vraie chain restaurée plutôt que de se fermer ;
  // si celle-ci a disparu (undo d'une création), la fenêtre se ferme.
  const _rcf = document.querySelector('.route-create-form');
  if (_rcf?.dataset.chainId) {
    const fresh = APP.chains.find(c => c.id === _rcf.dataset.chainId);
    if (fresh && typeof _rcf._wiresResync === 'function') _rcf._wiresResync(fresh);
    else _rcf.remove();
  }
  updateUndoRedoBtns();
  if (typeof refreshSidebar === 'function') refreshSidebar();
  // Le panneau Routes reste ouvert à travers Annuler/Rétablir (routes.js) : son
  // contenu doit refléter les chains restaurées, pas rester figé sur l'état d'avant.
  if (document.getElementById('routes-panel')?.classList.contains('open') && typeof renderRoutesList === 'function') {
    renderRoutesList();
  }
}

function updateUndoRedoBtns() {
  const btnU = document.getElementById('btn-undo');
  const btnR = document.getElementById('btn-redo');
  btnU.disabled = APP.undo.length === 0;
  btnR.disabled = APP.redo.length === 0;
  btnU.classList.toggle('active', APP.undo.length > 0);
  btnR.classList.toggle('active', APP.redo.length > 0);
}
