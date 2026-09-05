/* ═══════════════════════════════════════════════════════════════
   ui.js — Header actions, new project
═══════════════════════════════════════════════════════════════ */

// ── Nom du projet ────────────────────────────────────────────
function updateProjectNameDisplay() {
  const label = document.getElementById('h-project-label');
  const wrap  = document.getElementById('h-project-name');
  if (!label || !wrap) return;
  const name = APP.meta.title || '';
  const isUntitled = !name || name === 'Untitled';
  label.textContent = isUntitled ? t('untitled') : name;
  wrap.classList.toggle('untitled', isUntitled);
  refreshDirtyMark();
}

// Marqueur « modifications non enregistrées » : une étoile dans l'en-tête à côté du nom
// du projet, et la même dans le titre de la fenêtre. Reconstruit à partir du nom et de
// l'état enregistré/modifié, appelé à chaque changement de l'un ou de l'autre — donc
// notamment depuis setDirty(), ce qui le met à jour sans que personne ait à y penser.
// L'étoile de l'en-tête est un élément à part du libellé, jamais éditable : le
// renommage remplace le libellé seul, et repart du nom réel du projet.
function refreshDirtyMark() {
  const name       = APP.meta?.title || '';
  const isUntitled = !name || name === 'Untitled';
  const shown      = isUntitled ? t('untitled') : name;
  const star = document.getElementById('h-project-star');
  if (star) star.hidden = !dirty;
  if (window.electronAPI) window.electronAPI.setTitle(`Wires — ${shown}${dirty ? ' *' : ''}`);
}

function promptProjectName(allowCancel = true) {
  return new Promise(resolve => {
    const wrap  = document.getElementById('h-project-name');
    const label = document.getElementById('h-project-label');
    if (!wrap || !label) { resolve(false); return; }

    const current = APP.meta.title && APP.meta.title !== 'Untitled' ? APP.meta.title : '';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.className = 'h-project-inline-input';
    input.style.cssText = 'font-family:var(--mono);font-size:12px;letter-spacing:1px;color:var(--text);background:transparent;border:none;outline:none;width:220px;';

    label.replaceWith(input);
    wrap.classList.add('editing');
    input.focus();
    input.select();

    let settled = false;
    const confirm = () => {
      if (settled) return;
      settled = true;
      const trimmed = input.value.trim();
      const newLabel = document.createElement('span');
      newLabel.id = 'h-project-label';
      input.replaceWith(newLabel);
      wrap.classList.remove('editing');
      if (!trimmed) { updateProjectNameDisplay(); resolve(false); return; }
      APP.meta.title = trimmed;
      updateProjectNameDisplay();
      if (typeof setTitleChanged === 'function') setTitleChanged();
      setDirty(true);
      resolve(true);
    };
    const cancel = () => {
      if (settled) return;
      settled = true;
      const newLabel = document.createElement('span');
      newLabel.id = 'h-project-label';
      input.replaceWith(newLabel);
      wrap.classList.remove('editing');
      updateProjectNameDisplay();
      resolve(false);
    };

    const onDocPointerDown = e => {
      if (e.target !== input) { confirm(); document.removeEventListener('pointerdown', onDocPointerDown, true); }
    };
    document.addEventListener('pointerdown', onDocPointerDown, true);

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); document.removeEventListener('pointerdown', onDocPointerDown, true); confirm(); }
      if (e.key === 'Escape') { e.preventDefault(); document.removeEventListener('pointerdown', onDocPointerDown, true); cancel(); }
    });
    input.addEventListener('blur', confirm);
  });
}

function initUI() {
  // Undo / Redo
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);

  // Routes panel
  // Panneau Routes et panneau appareil : mutuellement exclusifs (voir aussi
  // panel.js et select.js) — sans ce nettoyage complet, l'appareil restait
  // sélectionné "en coulisses" (APP.sel jamais remis à null), donc l'estompage
  // du canevas persistait même panneau fermé.
  document.getElementById('btn-routes').addEventListener('click', () => {
    document.getElementById('routes-panel').classList.toggle('open');
    if (typeof clearSel === 'function') clearSel();
    if (typeof closePanel === 'function') closePanel();
  });
  document.getElementById('btn-routes-close').addEventListener('click', () => {
    document.getElementById('routes-panel').classList.remove('open');
  });

  // Info panel close
  document.getElementById('ip-close').addEventListener('click', closePanel);

  // Clic sur le nom du projet → renommer
  document.getElementById('h-project-name').addEventListener('click', () => {
    promptProjectName(true);
  });

  // Afficher le nom initial
  updateProjectNameDisplay();


}

// offerTour=false pour les appels internes qui remettent l'état à zéro sans que
// l'utilisateur ait vraiment demandé un nouveau projet (ex: _restoreAutosave quand
// il n'y a rien à restaurer, closeProject) — sinon la popup s'affiche puis reste
// affichée par-dessus le VRAI projet que l'utilisateur ouvre juste après (ex: un
// ancien projet choisi dans "Projets récents"), sans rapport avec ce nouveau projet.
function newProject(offerTour = true, skipDirtyCheck = false) {
  const _doNew = () => {
    wLog('PROJECT_NEW', {});
  APP.nodes        = {};
  APP.cables       = [];
  APP.chains       = [];
  APP.sel          = null;
  APP.selCable     = null;
  APP.selMulti     = new Set();
  APP.textLabels   = {};
  APP.selTextLabel = null;
  document.getElementById('text-labels-layer')?.replaceChildren();
  APP.zones    = {};
  APP.selZone  = null;
  document.getElementById('zones-layer')?.replaceChildren();
  APP.undo        = [];
  APP.redo        = [];
  APP.meta        = { title: 'Untitled', created: Date.now(), modified: Date.now() };
  cableOverrides  = {};
  selCableId      = null;
  anchorMode      = false;
  resizeNodeId    = null;
  _nextCableId    = 1;
  currentFilePath = null;

  _ensureInternetNode();
  renderNodes();
  rebuildCM();
  renderCables();
  clearSel();
  closePanel();
  setDirty(false);
  updateUndoRedoBtns();
  APP.view.zoom = 1;
  APP.view.panX = 0;
  APP.view.panY = 0;
  applyT();
  if (typeof refreshSidebar === 'function') refreshSidebar();
  if (window.electronAPI) {
    refreshDirtyMark();
    window.electronAPI.autosaveWrite('{}'); // effacer l'autosave
  }
  if (typeof updateProjectNameDisplay === 'function') updateProjectNameDisplay();
  if (window.electronAPI) window.electronAPI.setProjectOpen(true);
  if (offerTour && typeof _tourMaybeOfferPopup === 'function') _tourMaybeOfferPopup();
  };
  if (dirty && !skipDirtyCheck) {
    showConfirm(t('unsaved_warn')).then(ok => { if (ok) _doNew(); });
  } else {
    _doNew();
  }
}
