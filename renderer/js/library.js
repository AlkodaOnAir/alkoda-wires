/* ═══════════════════════════════════════════════════════════════
   library.js — Sidebar gauche : catégories + filtres câbles
   Fidèle à la référence Alkoda_transparent.html
═══════════════════════════════════════════════════════════════ */

const _catFilter  = new Set();
const _zoneFilter = new Set();
// Mode de chaque filtre : false = isoler (le Set = ce qu'on affiche), true =
// masquer (le Set = ce qu'on cache, tout le reste s'affiche) — c'est aussi
// exactement l'état ON/OFF du toggle "Tout" de la section (ON = masquer,
// OFF = isoler). Basculé uniquement par le toggle de la ligne "Tout", qui vide
// le Set en changeant de mode pour repartir d'une base propre. Les yeux des
// lignes individuelles ne touchent jamais ce booléen, seulement le Set — voir
// applyCanvasFilters() pour l'interprétation, et les render* pour l'œil/toggle.
let _catFilterExclude   = true;
let _cableFilterExclude = true;
let _zoneFilterExclude  = true;
let _anImgData  = null;

// ── Palette couleurs pour câbles custom ─────────────────────
const CUSTOM_CABLE_COLORS = [
  '#9c27b0','#e91e63','#ff9800','#4caf50','#00bcd4',
  '#3f51b5','#ff5722','#607d8b','#795548','#009688',
];
function _nextCableColor() {
  const used = new Set(USER_CABLE_TYPES.map(t => t.color));
  return CUSTOM_CABLE_COLORS.find(c => !used.has(c)) || CUSTOM_CABLE_COLORS[USER_CABLE_TYPES.length % CUSTOM_CABLE_COLORS.length];
}

// ── Palette couleurs pour catégories custom ──────────────────
const CUSTOM_CAT_COLORS = [
  '#f06292','#4db6ac','#aed581','#ff8a65','#4fc3f7',
  '#ce93d8','#80cbc4','#ffb74d','#a5d6a7','#90caf9',
];
function _nextCatColor() {
  const used = new Set(APP.categories.map(c => c.color));
  return CUSTOM_CAT_COLORS.find(c => !used.has(c)) || CUSTOM_CAT_COLORS[APP.categories.length % CUSTOM_CAT_COLORS.length];
}

// ── Catégories utilisateur persistantes ──────────────────────
async function _loadUserCats() {
  if (!window.electronAPI) return;
  try {
    const data = await window.electronAPI.userCatsRead();
    for (const cat of (data.customCats || [])) {
      if (!APP.categories.find(c => c.id === cat.id)) APP.categories.push(cat);
    }
    for (const [id, override] of Object.entries(data.nativeOverrides || {})) {
      const cat = APP.categories.find(c => c.id === id);
      if (cat) cat.nativeOverride = { ...(cat.nativeOverride || {}), ...override };
    }
    for (const ct of (data.customCableTypes || [])) {
      if (!USER_CABLE_TYPES.find(t => t.id === ct.id)) USER_CABLE_TYPES.push(ct);
    }
    // Repart de zéro : le tableau peut déjà contenir le repli synchrone posé
    // par routes.js au chargement du script (voir ce fichier) — les vraies
    // données persistées, une fois là, font seules foi.
    USER_ROUTE_TYPES.length = 0;
    for (const rt of (data.customRouteTypes || [])) {
      if (!USER_ROUTE_TYPES.find(t => t.id === rt.id)) USER_ROUTE_TYPES.push(rt);
    }
    // Premier lancement seulement : matérialise les types de route prédéfinis
    // dans la liste éditable, pour qu'ils soient supprimables comme les autres
    // ensuite. Le drapeau (et non la longueur de la liste) évite de les
    // remettre si l'utilisateur les a tous volontairement supprimés depuis.
    _routeTypesSeeded = !!data.routeTypesSeeded;
    if (!_routeTypesSeeded) {
      SIGNAL_TYPES_LIST.forEach(id => {
        if (!USER_ROUTE_TYPES.find(t => t.id === id)) USER_ROUTE_TYPES.push({ id });
      });
      _routeTypesSeeded = true;
      saveUserCats();
    }

    USER_ROUTE_COLORS.length = 0;
    for (const col of (data.customRouteColors || [])) {
      if (!USER_ROUTE_COLORS.includes(col)) USER_ROUTE_COLORS.push(col);
    }
    // Même principe que _routeTypesSeeded ci-dessus, pour ROUTE_COLORS.
    _routeColorsSeeded = !!data.routeColorsSeeded;
    if (!_routeColorsSeeded) {
      ROUTE_COLORS.forEach(col => {
        if (!USER_ROUTE_COLORS.includes(col)) USER_ROUTE_COLORS.push(col);
      });
      _routeColorsSeeded = true;
      saveUserCats();
    }
    // Restaurer overrides couleur câbles natifs
    for (const [type, color] of Object.entries(data.cableColorOverrides || {})) {
      USER_CABLE_COLOR_OVERRIDES[type] = color;
    }
    // Restaurer overrides dash câbles
    for (const [type, dash] of Object.entries(data.cableDashOverrides || {})) {
      USER_CABLE_DASH_OVERRIDES[type] = dash;
    }
    // Restaurer overrides couleur catégories natives
    for (const [id, color] of Object.entries(data.nativeCatColors || {})) {
      const cat = APP.categories.find(c => c.id === id);
      if (cat) cat.color = color;
      NATIVE_CAT_COLOR_OVERRIDES[id] = color;
    }
  } catch(e) { console.warn('User cats load failed:', e); }
}

// ── Inline edit du nom d'une catégorie (sidebar) ─────────────
function _startCatInlineEdit(btn, catId, labelSpan) {
  const catObj = APP.categories.find(c => c.id === catId);
  if (!catObj) return;
  const currentLabel = getCat(catId).label;
  const lang = getLang();

  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentLabel;
  input.style.cssText = 'background:transparent;border:none;border-bottom:1px solid rgba(0,212,255,.6);color:var(--text);font-size:11px;width:80px;outline:none;padding:0;min-width:40px;';

  labelSpan.replaceWith(input);
  input.focus();
  input.select();

  // Afficher le ✕ — sauf sur une catégorie verrouillée (`locked`).
  // Supprimer une catégorie supprime TOUS ses appareils (voir le gestionnaire
  // de delBtn plus bas) : sur « Non classé », qui est la corbeille par défaut
  // de tout appareil pas encore rangé, un clic de trop les emporterait tous.
  const delBtn = btn.querySelector('.f-delete');
  if (delBtn && !APP.categories.find(c => c.id === catId)?.locked) delBtn.style.display = 'inline';

  let committed = false;
  function commit() {
    if (committed) return;
    committed = true;
    if (delBtn) delBtn.style.display = 'none';
    const newName = input.value.trim();
    if (newName && newName !== currentLabel) {
      if (catObj.label_key) {
        if (!catObj.nativeOverride) catObj.nativeOverride = {};
        catObj.nativeOverride[lang] = newName;
      } else if (catObj.labels) {
        catObj.labels[lang] = newName;
      } else {
        catObj.label = newName;
      }
      saveUserCats();
    }
    renderSidebarCats();
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { committed = true; if (delBtn) delBtn.style.display = 'none'; renderSidebarCats(); }
  });

  if (delBtn) {
    delBtn.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); });
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      committed = true;
      renderSidebarCats();
      const label = getCat(catId).label;
      showConfirm(t('delete_cat_warning').replace('$name', label), { danger: true }).then(ok => {
        if (!ok) return;
        const toDelete = Object.keys(APP.nodes).filter(id => APP.nodes[id].cat === catId);
        if (toDelete.length) { pushUndo(); toDelete.forEach(id => deleteNode(id)); }
        APP.categories = APP.categories.filter(c => c.id !== catId);
        if (!catObj.label_key && !catObj.virtual) saveUserCats();
        _catFilter.delete(catId);
        if (_catFilter.size === 0) _catFilterExclude = true;
        setDirty();
        renderSidebarCats();
        applyCanvasFilters();
      });
    });
  }
}

// ── Inline edit + suppression d'un type de câble (sidebar) ───
function _startCableInlineEdit(btn, type, labelSpan) {
  const currentName = type;

  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentName;
  input.style.cssText = 'background:transparent;border:none;border-bottom:1px solid rgba(0,212,255,.6);color:var(--text);font-size:11px;width:80px;outline:none;padding:0;min-width:40px;font-family:var(--mono);';

  labelSpan.replaceWith(input);
  input.focus();
  input.select();

  const delBtn = btn.querySelector('.c-delete');
  if (delBtn) delBtn.style.display = 'inline';

  let committed = false;
  function commit() {
    if (committed) return;
    committed = true;
    if (delBtn) delBtn.style.display = 'none';
    const newName = input.value.trim();
    // Un nom déjà pris (natif ou personnalisé) fusionnerait deux types en laissant une
    // entrée en double dans la liste : refus, l'ancien nom est réaffiché tel quel.
    if (newName && newName !== currentName && !isKnownCableType(newName)) {
      const oldColor = getCableMeta(currentName).color;
      APP.cables.forEach(c => { if (c.type === currentName) { c.type = newName; c.color = oldColor; } });

      // Le nom d'un type EST son identifiant : il doit être suivi partout où il est
      // écrit. Sans ça, les ports gardent un nom qui n'existe plus dans la liste des
      // types — affichés comme type inconnu, et plus aucun câble ne peut s'y
      // rebrancher, la compatibilité de type ne trouvant plus de correspondance.
      Object.values(APP.nodes).forEach(n =>
        (n.ports || []).forEach(p => { if (p.type === currentName) p.type = newName; }));

      let libTouched = false;
      EQUIPMENT_LIBRARY.forEach(eq =>
        (eq.ports || []).forEach(p => {
          if (p.type === currentName) { p.type = newName; libTouched = true; }
        }));
      if (libTouched && typeof _saveUserLibrary === 'function') _saveUserLibrary();

      // Clés portant l'ancien nom : surcharges de couleur/trait et filtre latéral.
      for (const map of [USER_CABLE_COLOR_OVERRIDES, USER_CABLE_DASH_OVERRIDES]) {
        if (map[currentName] !== undefined) { map[newName] = map[currentName]; delete map[currentName]; }
      }
      if (_cableFilter.has(currentName)) { _cableFilter.delete(currentName); _cableFilter.add(newName); }

      const uc = USER_CABLE_TYPES.find(t => t.id === currentName);
      if (uc) { uc.id = newName; }
      else { USER_CABLE_TYPES.push({ id: newName, color: oldColor }); }
      saveUserCats();
      rebuildCM();
      setDirty();
    }
    renderSidebarCables();
    redrawOnlyCables();
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { committed = true; if (delBtn) delBtn.style.display = 'none'; renderSidebarCables(); }
  });

  if (delBtn) {
    delBtn.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); });
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      committed = true;
      renderSidebarCables();
      showConfirm(t('delete_cable_type_warning').replace('$name', currentName), { danger: true }).then(ok => {
        if (!ok) return;
        pushUndo();
        const _deletedCableIds = APP.cables.filter(c => c.type === currentName).map(c => c.id);
        APP.cables = APP.cables.filter(c => c.type !== currentName);
        _deletedCableIds.forEach(cid => _removeCableFromAllRoutes(cid));
        USER_CABLE_TYPES = USER_CABLE_TYPES.filter(t => t.id !== currentName);
        saveUserCats();
        _cableFilter.delete(currentName);
        if (_cableFilter.size === 0) _cableFilterExclude = true;
        rebuildCM();
        setDirty();
        renderSidebarCables();
        redrawOnlyCables();
        if (typeof renderRoutesList === 'function') renderRoutesList();
      });
    });
  }
}

// ── Librairie utilisateur persistante ────────────────────────
async function _loadUserLibrary() {
  if (!window.electronAPI) return;
  try {
    const items = await window.electronAPI.userlibRead();
    if (Array.isArray(items) && items.length) {
      // Ajouter uniquement les items pas déjà présents (par id)
      const existing = new Set(EQUIPMENT_LIBRARY.map(e => e.id));
      items.forEach(eq => { if (!existing.has(eq.id)) EQUIPMENT_LIBRARY.push(eq); });
    }
  } catch(e) { console.warn('User library load failed:', e); }
}

async function _saveUserLibrary() {
  if (!window.electronAPI) return;
  // Sauvegarder uniquement les custom (id commence par 'custom-')
  const custom = EQUIPMENT_LIBRARY.filter(e => e.id && e.id.startsWith('custom-'));
  await window.electronAPI.userlibWrite(custom);
}

async function initLibrary() {
  await _loadUserLibrary();
  await _loadUserCats();

  renderSidebarCats();
  renderSidebarCables();
  renderSidebarZones();

  // Collapsible section toggles
  document.querySelectorAll('.sl-toggle').forEach(title => {
    title.addEventListener('click', () => {
      const body = document.getElementById(title.dataset.target);
      if (!body) return;
      title.classList.toggle('collapsed');
      body.classList.toggle('collapsed');
    });
  });

  // Vue d'ensemble
  document.getElementById('btn-fit-view').addEventListener('click', fitView);

  // Bouton + : géré par newcable.js (initNewCableModal)

  // Recherche dans le header
  const searchInput = document.getElementById('search-input');
  const searchDrop  = document.getElementById('search-drop');
  searchInput.addEventListener('input', () => _doSearch(searchInput.value));
  searchInput.addEventListener('blur',  () => setTimeout(() => searchDrop.classList.remove('open'), 200));
  searchInput.addEventListener('keydown', e => { if (e.key === 'Escape') searchDrop.classList.remove('open'); });

  // Drag & drop canvas ← bibliothèque (EQUIPMENT_LIBRARY)
  setupLibDrop();

  // Modal ajouter appareil
  setupAddNodeModal();

  // Modal remove background
  _initRmbgModal();

  // Stats header
  updateHeaderStats();
}

// ── Sidebar : catégories utilisées seulement ─────────────────
function renderSidebarCats() {
  const list = document.getElementById('cats-list');
  list.innerHTML = '';

  const usedCats = APP.categories
    .filter(cat => !cat.virtual && Object.values(APP.nodes).some(n => n.cat === cat.id))
    .sort((a, b) => (!!a.pinned !== !!b.pinned) ? (a.pinned ? -1 : 1)
                  : getCat(a.id).label.localeCompare(getCat(b.id).label));

  if (!usedCats.length) {
    list.innerHTML = `<div class="sl-empty">${t('no_equipment')}</div>`;
    return;
  }

  // Bouton "All" — seul le toggle est cliquable, il bascule le mode isoler/
  // masquer de toute la section (voir commentaire en tête de fichier). Les yeux
  // individuels ci-dessous n'agissent que sur le Set, jamais sur ce mode — donc
  // sélectionner une catégorie ne fait plus bouger ce toggle.
  const catAllOn = _catFilterExclude;
  const allBtn = _makeFBtn({ id: 'all', label: t('all'), label_en: 'All', color: '#7a90b0' }, catAllOn, 0, catAllOn, true);
  allBtn.querySelector('.f-toggle')?.addEventListener('click', e => {
    e.stopPropagation();
    const willBeOn = !_catFilterExclude;
    _animateToggleThenApply(e.currentTarget, willBeOn, () => {
      _catFilterExclude = willBeOn;
      _catFilter.clear();
      wLog('FILTER_CAT', { cat: 'all' });
      renderSidebarCats(); applyCanvasFilters();
    });
  });
  list.appendChild(allBtn);

  usedCats.forEach(rawCat => {
    const cat   = getCat(rawCat.id);
    const count = Object.values(APP.nodes).filter(n => n.cat === cat.id).length;
    const isSel = _catFilter.has(cat.id);
    const eyeOpen = _catFilterExclude ? !isSel : isSel;
    const btn   = _makeFBtn(cat, isSel, count, eyeOpen);

    btn.querySelector('.f-eye-wrap')?.addEventListener('click', e => {
      e.stopPropagation();
      if (_catFilter.has(cat.id)) _catFilter.delete(cat.id);
      else _catFilter.add(cat.id);
      wLog('FILTER_CAT', { cat: cat.id });
      renderSidebarCats(); applyCanvasFilters();
    });

    btn.addEventListener('dblclick', e => {
      if (e.target.closest('.f-eye-wrap')) return;
      const labelSpan = btn.querySelector('.f-label');
      if (labelSpan) _startCatInlineEdit(btn, cat.id, labelSpan);
    });

    list.appendChild(btn);
  });
}

// ── Sidebar : types de câbles utilisés seulement ─────────────
function renderSidebarCables() {
  const list = document.getElementById('cables-list');
  list.innerHTML = '';

  const usedTypes = [...new Set(APP.cables.map(c => c.type))].sort((a, b) => a.localeCompare(b));

  if (!usedTypes.length) {
    list.innerHTML = `<div class="sl-empty">${t('no_cables')}</div>`;
    return;
  }

  const totalCount = APP.cables.length;

  // Bouton "All" — seul le toggle est cliquable, il bascule le mode isoler/
  // masquer de toute la section. Les yeux individuels ci-dessous n'agissent que
  // sur le Set, jamais sur ce mode — donc sélectionner un type ne fait plus
  // bouger ce toggle.
  const cblAllOn = _cableFilterExclude;
  const allBtn = document.createElement('button');
  allBtn.className = 'c-btn' + (cblAllOn ? ' active' : '');
  allBtn.dataset.ctype = 'all';
  allBtn.innerHTML = `${_toggleSwitchHTML(cblAllOn)}<div class="c-line" style="background:#888"></div><span class="c-label">${t('all')}</span><span class="f-count">${totalCount}</span>`;
  allBtn.querySelector('.f-toggle')?.addEventListener('click', e => {
    e.stopPropagation();
    const willBeOn = !_cableFilterExclude;
    _animateToggleThenApply(e.currentTarget, willBeOn, () => {
      _cableFilterExclude = willBeOn;
      _cableFilter.clear();
      wLog('FILTER_CABLE', { type: 'all' });
      renderSidebarCables(); redrawOnlyCables();
    });
  });
  list.appendChild(allBtn);

  usedTypes.forEach(type => {
    const meta  = getCableMeta(type);
    const count = APP.cables.filter(c => c.type === type).length;
    const isSel = _cableFilter.has(type);
    const eyeOpen = _cableFilterExclude ? !isSel : isSel;
    const btn   = document.createElement('button');
    btn.className = 'c-btn' + (isSel ? ' active' : '');
    btn.dataset.ctype = type;
    const lineStyle = meta.dashed === 'long'
      ? `background:repeating-linear-gradient(90deg,${meta.color} 0,${meta.color} 10px,transparent 10px,transparent 16px)`
      : (meta.dashed && meta.dashed !== 'solid')
        ? `background:repeating-linear-gradient(90deg,${meta.color} 0,${meta.color} 4px,transparent 4px,transparent 8px)`
        : `background:${meta.color}`;
    btn.innerHTML = `<span class="f-eye-wrap" style="display:inline-flex;flex-shrink:0;opacity:.55;color:var(--text)">${_eyeSVG(eyeOpen)}</span><div class="c-line" style="${lineStyle}"></div><span class="c-label">${escapeHtml(tType(type))}</span><span class="f-count">${count}</span><span class="c-delete" style="display:none;margin-left:auto;padding-left:6px;color:#ff5555;font-size:11px;cursor:pointer;line-height:1;flex-shrink:0">✕</span>`;

    btn.querySelector('.f-eye-wrap')?.addEventListener('click', e => {
      e.stopPropagation();
      if (_cableFilter.has(type)) _cableFilter.delete(type);
      else _cableFilter.add(type);
      wLog('FILTER_CABLE', { type });
      renderSidebarCables(); redrawOnlyCables();
    });

    // Renommer (et supprimer) ne concerne que les types personnalisés, comme le
    // décrit le manuel. Le nom d'un type natif est son identifiant : il est écrit
    // tel quel dans les projets et sert de clé partout (CABLE_META, familles de
    // compatibilité USB/audio, WIRELESS_TYPES, table de traduction). Le renommer
    // ne le renommait d'ailleurs pas : ça créait un type de plus, en laissant les
    // ports sur l'ancien nom.
    btn.addEventListener('dblclick', e => {
      if (e.target.closest('.f-eye-wrap')) return;
      const isCustom  = USER_CABLE_TYPES.some(t => t.id === type);
      const labelSpan = btn.querySelector('.c-label');
      if (isCustom && labelSpan) _startCableInlineEdit(btn, type, labelSpan);
    });

    list.appendChild(btn);
  });
}

// Œil ouvert/fermé — reflète le résultat réel pour CETTE ligne (visible ou non) :
// pas besoin de retenir "isoler ou masquer", l'œil de chaque ligne montre
// directement la conséquence, et son clic ne bascule que l'appartenance au Set
// (jamais le mode). Sur la ligne "Tout" d'une section, le toggle iOS ci-dessous
// remplace l'œil : lui seul montre et bascule le mode (voir commentaire en tête
// de fichier), et vide le Set à chaque bascule pour repartir d'une base propre.
// Interrupteur style iOS pour la ligne Tout uniquement (les lignes individuelles
// gardent l'œil ci-dessous) — piste ovale + rond qui glisse gauche/droite,
// bleu accent quand actif, blanc/gris au repos.
function _toggleSwitchHTML(on) {
  return `<span class="f-toggle" style="position:relative;display:inline-block;width:28px;height:16px;border-radius:8px;flex-shrink:0;background:${on ? '#00d4ff' : '#3a4d6d'};transition:background .15s">`
    + `<span style="position:absolute;top:2px;left:${on ? '14px' : '2px'};width:12px;height:12px;border-radius:50%;background:#fff;transition:left .15s"></span>`
    + `</span>`;
}

// renderSidebarXxx() vide et recrée tout le DOM de la liste : sans ce délai,
// la nouvelle position du rond serait déjà là au tout premier paint et le
// glissement ne se verrait jamais. On anime donc le nœud encore présent AVANT
// de muter l'état et de déclencher le re-render (une fois glissé).
function _animateToggleThenApply(toggleEl, willBeOn, applyFn) {
  const thumb = toggleEl.firstElementChild;
  toggleEl.style.background = willBeOn ? '#00d4ff' : '#3a4d6d';
  thumb.style.left = willBeOn ? '14px' : '2px';
  setTimeout(applyFn, 150);
}

function _eyeSVG(open) {
  return open
    ? '<svg class="f-eye" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>'
    : '<svg class="f-eye f-eye-closed" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/><line x1="2" y1="2" x2="22" y2="22"/></svg>';
}

function _makeFBtn(cat, active, count = 0, eyeOpen = true, isAllRow = false) {
  const btn = document.createElement('button');
  btn.className = 'f-btn' + (active ? ' active' : '');
  btn.dataset.catId = cat.id;
  const eyeMarkup = isAllRow
    ? _toggleSwitchHTML(eyeOpen)
    : `<span class="f-eye-wrap" style="display:inline-flex;flex-shrink:0;opacity:.55;color:var(--text)">${_eyeSVG(eyeOpen)}</span>`;
  btn.innerHTML = `
    ${eyeMarkup}
    <div class="f-dot" style="background:${escapeHtml(cat.color)}"></div>
    <span class="f-label">${escapeHtml(cat.label)}</span>
    ${count > 0 ? `<span class="f-count">${count}</span>` : ''}
    <span class="f-delete" style="display:none;margin-left:auto;padding-left:6px;color:#ff5555;font-size:11px;cursor:pointer;line-height:1;flex-shrink:0">✕</span>
  `;
  return btn;
}

// ── Mise à jour stats header ─────────────────────────────────
function updateHeaderStats() {
  const nodeCount  = Object.keys(APP.nodes).length;
  const cableCount = APP.cables.length;
  const el = document.getElementById('h-count-txt');
  if (el) el.textContent = `${nodeCount} ${t('devices')} · ${cableCount} ${t('connections_stat')}`;
  if (typeof refreshAddCableBtn === 'function') refreshAddCableBtn();
}

// ── Sidebar : zones ───────────────────────────────────────────
function renderSidebarZones() {
  const list = document.getElementById('zones-list');
  if (!list) return;
  list.innerHTML = '';

  const zones = Object.values(APP.zones || {});

  if (!zones.length) {
    list.innerHTML = `<div class="sl-empty">${t('no_zones')}</div>`;
    return;
  }

  // Bouton "All" — seul le toggle est cliquable, il bascule le mode isoler/
  // masquer de toute la section. Les yeux individuels ci-dessous n'agissent que
  // sur le Set, jamais sur ce mode — donc sélectionner une zone ne fait plus
  // bouger ce toggle.
  const zAllOn = _zoneFilterExclude;
  const allBtn = document.createElement('button');
  allBtn.className = 'z-btn' + (zAllOn ? ' active' : '');
  allBtn.innerHTML = `${_toggleSwitchHTML(zAllOn)}<div class="z-dot" style="background:#7a90b0"></div><span class="z-label">${t('all')}</span><span class="f-count">${zones.length}</span>`;
  allBtn.querySelector('.f-toggle')?.addEventListener('click', e => {
    e.stopPropagation();
    const willBeOn = !_zoneFilterExclude;
    _animateToggleThenApply(e.currentTarget, willBeOn, () => {
      _zoneFilterExclude = willBeOn;
      _zoneFilter.clear();
      renderSidebarZones(); applyCanvasFilters();
    });
  });
  list.appendChild(allBtn);

  const _makeZBtn = (z, indented) => {
    const btn = document.createElement('button');
    const isSel = _zoneFilter.has(z.id);
    const eyeOpen = _zoneFilterExclude ? !isSel : isSel;
    btn.className = 'z-btn' + (isSel ? ' active' : '');
    if (indented) btn.style.paddingLeft = '20px';
    const dotStyle = z.isSubproject
      ? `border:2px dashed ${escapeHtml(z.color || '#888')};background:transparent;box-sizing:border-box`
      : `background:${escapeHtml(z.color || '#888')}`;
    btn.innerHTML = `<span class="f-eye-wrap" style="display:inline-flex;flex-shrink:0;opacity:.55;color:var(--text)">${_eyeSVG(eyeOpen)}</span><div class="z-dot" style="${dotStyle}"></div><span class="z-label">${escapeHtml(z.name || 'Zone')}</span>`;
    btn.querySelector('.f-eye-wrap')?.addEventListener('click', e => {
      e.stopPropagation();
      if (_zoneFilter.has(z.id)) _zoneFilter.delete(z.id);
      else _zoneFilter.add(z.id);
      renderSidebarZones(); applyCanvasFilters();
    });
    return btn;
  };

  // Separate super-zones, child zones (keyed by spId), and regular zones
  const superZones = zones.filter(z => z.isSubproject).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const childZones = {};
  const regularZones = [];

  for (const z of zones) {
    if (z.isSubproject) continue;
    if (z.subproject_id) {
      if (!childZones[z.subproject_id]) childZones[z.subproject_id] = [];
      childZones[z.subproject_id].push(z);
    } else {
      regularZones.push(z);
    }
  }

  // Super-zones with child zones indented below
  for (const sz of superZones) {
    list.appendChild(_makeZBtn(sz, false));
    const children = (childZones[sz.subproject_id] || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    for (const cz of children) {
      list.appendChild(_makeZBtn(cz, true));
    }
  }

  // Regular zones
  regularZones.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  for (const z of regularZones) {
    list.appendChild(_makeZBtn(z, false));
  }
}

// ── État filtre catégorie+zone par nœud, et test de filtre par câble ─────────
// Dupliqué de la partie catégorie+zone d'applyCanvasFilters() ci-dessous plutôt
// que d'y toucher (fonction déjà en place, qui marche) — utilisé par selectNode()
// pour ne jamais rallumer un câble masqué par le filtre, même connecté à
// l'appareil qu'on vient de sélectionner : le filtre doit toujours l'emporter.
function _computeCatZoneState() {
  const nodes  = APP.nodes  || {};
  const cables = APP.cables || [];
  const catEmpty   = !_catFilter.has('__ALL__')  && _catFilter.size  === 0;
  const zoneActive = !_zoneFilter.has('__ALL__') && _zoneFilter.size > 0;
  const stateRank  = s => s === 'hidden' ? 0 : s === 'ghost' ? 1 : 2;
  const worstState = (a, b) => stateRank(a) <= stateRank(b) ? a : b;

  const catStates = {};
  if (_catFilterExclude) {
    for (const [id, n] of Object.entries(nodes)) {
      catStates[id] = (!catEmpty && _catFilter.has(n.cat)) ? 'hidden' : 'primary';
    }
  } else if (catEmpty) {
    for (const id of Object.keys(nodes)) catStates[id] = 'hidden';
  } else if (!_catFilter.has('__ALL__')) {
    const catPrimary = new Set();
    for (const [id, n] of Object.entries(nodes)) {
      if (_catFilter.has(n.cat)) catPrimary.add(id);
    }
    const catGhost = new Set();
    for (const c of cables) {
      if (catPrimary.has(c.from) && !catPrimary.has(c.to)) catGhost.add(c.to);
      if (catPrimary.has(c.to)   && !catPrimary.has(c.from)) catGhost.add(c.from);
    }
    for (const id of Object.keys(nodes)) {
      catStates[id] = catPrimary.has(id) ? 'primary' : catGhost.has(id) ? 'ghost' : 'hidden';
    }
  } else {
    for (const id of Object.keys(nodes)) catStates[id] = 'primary';
  }

  const zoneStates = {};
  if (_zoneFilterExclude) {
    const excludedZones = Object.values(APP.zones || {}).filter(z => _zoneFilter.has(z.id));
    for (const [id, n] of Object.entries(nodes)) {
      const ncx = n.x + n.w / 2;
      const ncy = n.y + n.h / 2;
      const inExcluded = excludedZones.some(z =>
        ncx >= z.x && ncx <= z.x + z.width && ncy >= z.y && ncy <= z.y + z.height);
      zoneStates[id] = inExcluded ? 'hidden' : 'primary';
    }
  } else if (!zoneActive) {
    for (const id of Object.keys(nodes)) zoneStates[id] = 'primary';
  } else {
    const selectedZones = Object.values(APP.zones || {}).filter(z => _zoneFilter.has(z.id));
    const zonePrimary = new Set();
    for (const [id, n] of Object.entries(nodes)) {
      const ncx = n.x + n.w / 2;
      const ncy = n.y + n.h / 2;
      for (const z of selectedZones) {
        if (ncx >= z.x && ncx <= z.x + z.width && ncy >= z.y && ncy <= z.y + z.height) {
          zonePrimary.add(id); break;
        }
      }
    }
    const zoneGhost = new Set();
    for (const c of cables) {
      if (zonePrimary.has(c.from) && !zonePrimary.has(c.to)) zoneGhost.add(c.to);
      if (zonePrimary.has(c.to)   && !zonePrimary.has(c.from)) zoneGhost.add(c.from);
    }
    for (const id of Object.keys(nodes)) {
      zoneStates[id] = zonePrimary.has(id) ? 'primary' : zoneGhost.has(id) ? 'ghost' : 'hidden';
    }
  }

  const catZoneState = {};
  for (const id of Object.keys(nodes)) {
    catZoneState[id] = worstState(catStates[id], zoneStates[id]);
  }
  return catZoneState;
}

// Zone masquée : un câble touchant un appareil dans une zone masquée doit
// disparaître avec lui, même si l'autre bout reste 'primary' par ailleurs
// (l'ancrage cat/zone normal ne suffit pas à le détecter, voir applyCanvasFilters()).
function _nodeInExcludedZone(nodeId) {
  if (!_zoneFilterExclude) return false;
  const n = APP.nodes[nodeId];
  if (!n) return false;
  const ncx = n.x + n.w / 2;
  const ncy = n.y + n.h / 2;
  return Object.values(APP.zones || {}).some(z =>
    _zoneFilter.has(z.id) && ncx >= z.x && ncx <= z.x + z.width && ncy >= z.y && ncy <= z.y + z.height);
}
// Même principe que _nodeInExcludedZone ci-dessus, pour catégorie masquée.
function _nodeInExcludedCategory(nodeId) {
  if (!_catFilterExclude) return false;
  const n = APP.nodes[nodeId];
  if (!n) return false;
  return _catFilter.has(n.cat);
}

function _cablePassesFilter(c, catZoneState) {
  if (_nodeInExcludedZone(c.from) || _nodeInExcludedZone(c.to)) return false;
  if (_nodeInExcludedCategory(c.from) || _nodeInExcludedCategory(c.to)) return false;
  if (_cableMaskedByRoutes(c.id)) return false;
  if (_nodeMaskedByRoutes(c.from) || _nodeMaskedByRoutes(c.to)) return false;
  const cblEmpty = !_cableFilter.has('__ALL__') && _cableFilter.size === 0;
  const fromCZ = catZoneState[c.from] || 'hidden';
  const toCZ   = catZoneState[c.to]   || 'hidden';
  const anchored = fromCZ === 'primary' || toCZ === 'primary';
  if (_cableFilterExclude) return !_cableFilter.has(c.type) && anchored;
  if (cblEmpty) return false;
  if (!_cableFilter.has('__ALL__')) return _cableFilter.has(c.type) && anchored;
  return anchored;
}

// ── Filtre canvas — applique opacité sur nodes et câbles ──────
function applyCanvasFilters() {
  // Node sélectionné : filtres suspendus — l'estompage de sélection prime.
  // (doit passer AVANT le fast path, sinon _resetCanvasOpacity rallume à 0.85
  // les câbles que selectNode vient d'estomper, à chaque survol de câble)
  if (APP.sel) return;

  // Fast path — tous les filtres sur All (tout visible)
  if (_catFilterExclude && _catFilter.size === 0 && _cableFilterExclude && _cableFilter.size === 0 && _zoneFilterExclude && _zoneFilter.size === 0) {
    _resetCanvasOpacity();
    return;
  }

  const nodes  = APP.nodes  || {};
  const cables = APP.cables || [];
  const nodeState = {};

  const cblEmpty   = !_cableFilter.has('__ALL__') && _cableFilter.size === 0;
  const catEmpty   = !_catFilter.has('__ALL__')   && _catFilter.size  === 0;
  const zoneAny    = !_zoneFilter.has('__ALL__');                          // pour affichage rectangles
  const zoneActive = !_zoneFilter.has('__ALL__') && _zoneFilter.size > 0; // pour filtrage nodes

  // ── Rectangles de zones ───────────────────────────────────────
  // Mode masquer : affiche tout SAUF les zones cochées (inversé par rapport au
  // mode isoler par défaut, où seules les zones cochées s'affichent).
  for (const zid of Object.keys(APP.zones || {})) {
    const el = document.getElementById(`zone-${zid}`);
    if (!el) continue;
    if (!zoneAny) { el.style.opacity = ''; continue; }
    const checked = _zoneFilter.has(zid);
    el.style.opacity = (_zoneFilterExclude ? !checked : checked) ? '' : '0';
  }

  // ── Helper combinaison : l'état le plus restrictif gagne ──────
  const stateRank  = s => s === 'hidden' ? 0 : s === 'ghost' ? 1 : 2;
  const worstState = (a, b) => stateRank(a) <= stateRank(b) ? a : b;

  // ── États catégorie ───────────────────────────────────────────
  // Mode masquer : pas de nuance "fantôme" — une catégorie cochée cache
  // directement ses appareils, tout le reste s'affiche normalement. Plus simple
  // que le mode isoler (qui, lui, doit distinguer primary/ghost/hidden).
  const catStates = {};
  if (_catFilterExclude) {
    for (const [id, n] of Object.entries(nodes)) {
      catStates[id] = (!catEmpty && _catFilter.has(n.cat)) ? 'hidden' : 'primary';
    }
  } else if (catEmpty) {
    for (const id of Object.keys(nodes)) catStates[id] = 'hidden';
  } else if (!_catFilter.has('__ALL__')) {
    const catPrimary = new Set();
    for (const [id, n] of Object.entries(nodes)) {
      if (_catFilter.has(n.cat)) catPrimary.add(id);
    }
    const catGhost = new Set();
    for (const c of cables) {
      if (catPrimary.has(c.from) && !catPrimary.has(c.to)) catGhost.add(c.to);
      if (catPrimary.has(c.to)   && !catPrimary.has(c.from)) catGhost.add(c.from);
    }
    for (const id of Object.keys(nodes)) {
      catStates[id] = catPrimary.has(id) ? 'primary' : catGhost.has(id) ? 'ghost' : 'hidden';
    }
  } else {
    for (const id of Object.keys(nodes)) catStates[id] = 'primary';
  }

  // ── États zone ────────────────────────────────────────────────
  // Mode masquer : même principe que catégorie ci-dessus — pas de fantôme.
  const zoneStates = {};
  if (_zoneFilterExclude) {
    const excludedZones = Object.values(APP.zones || {}).filter(z => _zoneFilter.has(z.id));
    for (const [id, n] of Object.entries(nodes)) {
      const ncx = n.x + n.w / 2;
      const ncy = n.y + n.h / 2;
      const inExcluded = excludedZones.some(z =>
        ncx >= z.x && ncx <= z.x + z.width && ncy >= z.y && ncy <= z.y + z.height);
      zoneStates[id] = inExcluded ? 'hidden' : 'primary';
    }
  } else if (!zoneActive) {
    for (const id of Object.keys(nodes)) zoneStates[id] = 'primary';
  } else {
    const selectedZones = Object.values(APP.zones || {}).filter(z => _zoneFilter.has(z.id));
    const zonePrimary = new Set();
    for (const [id, n] of Object.entries(nodes)) {
      const ncx = n.x + n.w / 2;
      const ncy = n.y + n.h / 2;
      for (const z of selectedZones) {
        if (ncx >= z.x && ncx <= z.x + z.width && ncy >= z.y && ncy <= z.y + z.height) {
          zonePrimary.add(id); break;
        }
      }
    }
    const zoneGhost = new Set();
    for (const c of cables) {
      if (zonePrimary.has(c.from) && !zonePrimary.has(c.to)) zoneGhost.add(c.to);
      if (zonePrimary.has(c.to)   && !zonePrimary.has(c.from)) zoneGhost.add(c.from);
    }
    for (const id of Object.keys(nodes)) {
      zoneStates[id] = zonePrimary.has(id) ? 'primary' : zoneGhost.has(id) ? 'ghost' : 'hidden';
    }
  }

  // ── États câble ───────────────────────────────────────────────
  // Mode masquer : un type de câble exclu ne cache jamais l'APPAREIL (qui peut
  // avoir d'autres câbles à montrer) — seuls les câbles eux-mêmes de ce type
  // disparaissent, géré séparément dans la boucle d'opacité des câbles plus bas.
  const cableStates = {};
  if (_cableFilterExclude) {
    for (const id of Object.keys(nodes)) cableStates[id] = 'primary';
  } else if (cblEmpty) {
    for (const id of Object.keys(nodes)) cableStates[id] = 'hidden';
  } else if (!_cableFilter.has('__ALL__')) {
    const cblPrimary = new Set();
    for (const c of cables) {
      if (_cableFilter.has(c.type)) { cblPrimary.add(c.from); cblPrimary.add(c.to); }
    }
    for (const id of Object.keys(nodes)) {
      cableStates[id] = cblPrimary.has(id) ? 'primary' : 'hidden';
    }
  } else {
    for (const id of Object.keys(nodes)) cableStates[id] = 'primary';
  }

  // ── Combiner cat + zone (réutilisé plus bas pour ancrer la visibilité des
  // câbles, sans y mélanger l'état câble — voir la boucle d'opacité des câbles) ──
  const catZoneState = {};
  for (const id of Object.keys(nodes)) {
    catZoneState[id] = worstState(catStates[id], zoneStates[id]);
  }

  // ── Combiner cat + zone + câble ───────────────────────────────
  for (const id of Object.keys(nodes)) {
    nodeState[id] = worstState(catZoneState[id], cableStates[id]);
    if (_nodeMaskedByRoutes(id)) nodeState[id] = 'hidden';
  }

  // ── Appliquer opacité nodes ───────────────────────────────
  for (const [id, state] of Object.entries(nodeState)) {
    const el  = document.getElementById(`n-${id}`);
    const lbl = document.getElementById(`nl-${id}`);
    const op  = state === 'primary' ? '' : state === 'ghost' ? '0.35' : '0';
    const pe  = state === 'hidden'  ? 'none' : '';
    if (el)  { el.style.opacity  = op; el.style.pointerEvents  = pe; }
    if (lbl) { lbl.style.opacity = op; lbl.style.pointerEvents = pe; }
  }

  // ── Appliquer opacité câbles ──────────────────────────────
  // La bande de capture (.cable-hit, pointer-events:stroke) est un élément séparé
  // du tracé visuel (.cable-visual, pointer-events:none) — mettre l'opacité de ce
  // dernier à 0 ne désactive donc jamais, à elle seule, le survol/clic sur un câble
  // masqué par le filtre. Comme pour les nœuds ci-dessus, pointer-events suit
  // maintenant la même visibilité.
  document.querySelectorAll('.cable-visual').forEach(p => {
    const cid = p.dataset.cid;
    const c = cables.find(x => String(x.id) === String(cid));
    if (!c) return;
    const hit = _svg?.querySelector(`.cable-hit[data-cid="${cid}"]`);

    if (String(c.id) === String(selCableId)) {
      p.setAttribute('opacity', '1');
      if (hit) hit.style.pointerEvents = '';
      return;
    }

    // Un câble n'est "ancré" au filtre catégorie/zone actif que si l'un de ses deux
    // bouts est réellement 'primary' (pas seulement 'ghost' via une AUTRE connexion)
    // — sinon deux appareils rendus visibles chacun pour une raison indépendante et
    // sans rapport avec ce câble précis suffisaient à l'afficher lui aussi, même
    // totalement étranger au filtre.
    const fromCZ = catZoneState[c.from] || 'hidden';
    const toCZ   = catZoneState[c.to]   || 'hidden';
    const anchored = fromCZ === 'primary' || toCZ === 'primary';
    let visible;

    if (_cableFilterExclude) {
      // Mode masquer : câble caché si son type est coché, ancrage cat/zone inchangé.
      visible = !_cableFilter.has(c.type) && anchored;
    } else if (cblEmpty) {
      // All cables désactivé → tous câbles cachés
      visible = false;
    } else if (!_cableFilter.has('__ALL__')) {
      // Type spécifique : le câble doit en plus correspondre au type filtré.
      visible = _cableFilter.has(c.type) && anchored;
    } else {
      visible = anchored;
    }

    if (_nodeInExcludedZone(c.from) || _nodeInExcludedZone(c.to)) visible = false;
    if (_nodeInExcludedCategory(c.from) || _nodeInExcludedCategory(c.to)) visible = false;
    if (_cableMaskedByRoutes(c.id)) visible = false;
    if (_nodeMaskedByRoutes(c.from) || _nodeMaskedByRoutes(c.to)) visible = false;

    const isOrphan = p.getAttribute('stroke-dasharray') === '6,5';
    p.setAttribute('opacity', visible ? (isOrphan ? '0.5' : '0.85') : '0');
    if (hit) hit.style.pointerEvents = visible ? '' : 'none';
  });

  // ── Marqueurs de jonction (bowtie dual ports) ─────────────
  document.querySelectorAll('.junction-marker').forEach(g => {
    const nid = g.dataset.nodeId;
    if (nid && nodeState[nid] !== undefined) {
      g.style.opacity = nodeState[nid] === 'hidden' ? '0' : '';
    } else {
      g.style.opacity = '';
    }
  });

  // ── Texte labels : toujours visibles (non affectés par zone filter) ──
  for (const id of Object.keys(APP.textLabels || {})) {
    const el = document.getElementById(`tl-${id}`);
    if (el) el.style.opacity = '';
  }

  // Rebuild export preview if panel is open
  if (document.getElementById('export-panel')?.classList.contains('open')) {
    if (typeof _scheduleRebuild === 'function') _scheduleRebuild(200);
  }
}

function _resetCanvasOpacity() {
  for (const id of Object.keys(APP.nodes || {})) {
    const el  = document.getElementById(`n-${id}`);
    const lbl = document.getElementById(`nl-${id}`);
    // Un appareil qui n'appartient qu'à des routes masquées (œil, voir routes.js)
    // doit rester effacé même sur ce chemin rapide — sans filtre catégorie/câble/
    // zone actif, rien d'autre ici ne vérifie le masquage par route.
    const masked = typeof _nodeMaskedByRoutes === 'function' && _nodeMaskedByRoutes(id);
    if (el)  { el.style.opacity  = masked ? '0' : ''; el.style.pointerEvents  = masked ? 'none' : ''; }
    if (lbl) { lbl.style.opacity = masked ? '0' : ''; lbl.style.pointerEvents = masked ? 'none' : ''; }
  }
  document.querySelectorAll('.cable-visual').forEach(p => {
    if (p.dataset.selected) return; // laissé à selectNode
    const cid = p.dataset.cid;
    const hit = _svg?.querySelector(`.cable-hit[data-cid="${cid}"]`);
    const c = (APP.cables || []).find(x => String(x.id) === String(cid));
    const masked = c && (
      (typeof _cableMaskedByRoutes === 'function' && _cableMaskedByRoutes(c.id)) ||
      (typeof _nodeMaskedByRoutes  === 'function' && (_nodeMaskedByRoutes(c.from) || _nodeMaskedByRoutes(c.to)))
    );
    if (masked) {
      p.setAttribute('opacity', '0');
      if (hit) hit.style.pointerEvents = 'none';
      return;
    }
    const isOrphan = p.getAttribute('stroke-dasharray') === '6,5';
    p.setAttribute('opacity', isOrphan ? '0.5' : '0.85');
    if (hit) hit.style.pointerEvents = '';
  });
  for (const id of Object.keys(APP.textLabels || {})) {
    const el = document.getElementById(`tl-${id}`);
    if (el) el.style.opacity = '';
  }
  for (const zid of Object.keys(APP.zones || {})) {
    const el = document.getElementById(`zone-${zid}`);
    if (el) el.style.opacity = '';
  }
  document.querySelectorAll('.junction-marker').forEach(g => {
    const nid = g.dataset.nodeId;
    g.style.opacity = (nid && typeof _nodeMaskedByRoutes === 'function' && _nodeMaskedByRoutes(nid)) ? '0' : '';
  });

  // Une route active doit garder son estompage : ré-appliquer l'état de trace,
  // sinon tout survol de câble ou re-rendu (qui passe ici via applyCanvasFilters)
  // « rallume » les câbles hors route à 0.85.
  if (typeof _activeRoutes !== 'undefined' && _activeRoutes.size && typeof _updateTrace === 'function') _updateTrace();

  // Rebuild export preview if panel is open
  if (document.getElementById('export-panel')?.classList.contains('open')) {
    if (typeof _scheduleRebuild === 'function') _scheduleRebuild(200);
  }
}

// ── Mise à jour complète de la sidebar ───────────────────────
function refreshSidebar() {
  // Nettoyer les filtres qui n'existent plus dans le projet chargé
  for (const id of [..._zoneFilter]) { if (!(APP.zones || {})[id]) _zoneFilter.delete(id); }
  for (const id of [..._catFilter])  { if (!APP.categories.some(c => c.id === id)) _catFilter.delete(id); }
  for (const t  of [..._cableFilter]){ if (!APP.cables.some(c => c.type === t)) _cableFilter.delete(t); }

  // Si le nettoyage a vidé un filtre, revenir en mode masquer (afficher tout)
  if (_catFilter.size   === 0) _catFilterExclude   = true;
  if (_cableFilter.size === 0) _cableFilterExclude = true;
  if (_zoneFilter.size  === 0) _zoneFilterExclude  = true;

  renderSidebarCats();
  renderSidebarCables();
  renderSidebarZones();
  updateHeaderStats();
  applyCanvasFilters();
}

// ── Drag depuis bibliothèque vers canvas ─────────────────────
function setupLibDrop() {
  const area = document.getElementById('canvas-area');
  area.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  area.addEventListener('drop', e => {
    e.preventDefault();
    const eqId = e.dataTransfer.getData('text/plain');
    const eq = EQUIPMENT_LIBRARY.find(x => x.id === eqId);
    if (!eq) return;
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    createNode(eq, x, y);
    updateHeaderStats();
    renderSidebarCats();
  });
}

// ── Recherche dans le header ─────────────────────────────────
function _doSearch(raw) {
  const q    = raw.toLowerCase().trim();
  const drop = document.getElementById('search-drop');
  if (!q) { drop.classList.remove('open'); drop.innerHTML = ''; return; }

  const items = Object.values(APP.nodes).filter(n =>
    n.name.toLowerCase().includes(q) || (n.short || '').toLowerCase().includes(q)
  ).slice(0, 8);

  if (!items.length) { drop.classList.remove('open'); drop.innerHTML = ''; return; }

  drop.innerHTML = '';
  items.forEach(n => {
    const cat  = getCat(n.cat);
    const div  = document.createElement('div');
    div.className = 'sd-item';
    div.innerHTML = `
      <div class="sd-dot" style="background:${escapeHtml(cat.color)}"></div>
      <span>${escapeHtml(n.name)}</span>
      <span class="sd-cat">${escapeHtml(cat.label)}</span>
    `;
    div.addEventListener('mousedown', () => {
      selectNode(n.id);
      drop.classList.remove('open');
      document.getElementById('search-input').value = '';
    });
    drop.appendChild(div);
  });
  drop.classList.add('open');
}

// ── Auto short name depuis le full name ───────────────────────
// Stratégie : ignorer le premier mot (marque) et utiliser le modèle
function _autoShortName(fullName) {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return words[0].substring(0, 10);

  // Les mots de modèle = tout sauf le premier (la marque)
  const model = words.slice(1);

  // Si le modèle tient en 10 chars, le prendre tel quel
  const joined = model.join(' ');
  if (joined.length <= 10) return joined;

  // Sinon : prendre les 2 premiers mots du modèle, max 10 chars
  const two = model.slice(0, 2).join(' ');
  if (two.length <= 10) return two;

  // En dernier recours : premier mot du modèle tronqué
  return model[0].substring(0, 10);
}

// ── Modal ajouter appareil ───────────────────────────────────
// Non nul quand la modale est ouverte pour MODIFIER un appareil déjà sur le canevas
// (bouton crayon du panneau d'info) plutôt que pour en ajouter un — voir
// openEditNodeModal. Le bouton de validation devient « Appliquer » et n'ajoute rien
// au canevas ni à la bibliothèque : il modifie ce seul appareil.
let _anEditNodeId = null;

// Remet à zéro tout l'état d'ajout (nom/image/forme/ports) — appelé une seule
// fois, au tout début du flux (voir _startAddDeviceFlow), jamais à la fin :
// la configuration image/ports qui suit doit partir d'un état vierge, pas
// hériter du dernier appareil ajouté ou édité.
function _resetAddDeviceState() {
  _anEditNodeId = null;
  document.getElementById('an-name').value  = '';
  document.getElementById('an-short').value = '';
  _anNumberTouched = false;
  _anImgData    = null;
  // _rmbgOriginal n'était jusqu'ici jamais remis à null (seulement réécrit à
  // l'entrée en édition) : sans ce reset, un ajout neuf hériterait encore de
  // l'image du DERNIER appareil édité pour la comparaison de groupe d'image.
  _rmbgOriginal = null;
  _currentShape = null;
  _searchProduct = null; // un nom rapporté par une recherche abandonnée ne doit pas survivre
  _anPorts      = [];
  _shortEdited  = false;
  _lastAppliedBB = null; // calculé au passage par la configuration image
  const _ov = document.getElementById('an-prev-overlay');
  if (_ov) { _ov.style.display = 'none'; _ov.querySelectorAll('.an-pdot').forEach(d => d.remove()); }
  _refreshImgGroupNumberField(); // sinon #an-number garde les options d'un précédent appareil édité
  // Le bouton confirm reste actif — la validation ports se fait dans la popup BG
  document.getElementById('an-confirm').disabled = false;
  const anErr = document.getElementById('an-error');
  if (anErr) anErr.style.display = 'none';
}

// Affiche la modale Ajouter un appareil (nom/nom court/catégorie) — dernière
// étape du flux, appelée une fois l'image/forme déjà configurée (voir
// _startAddDeviceFlow) ou pour rouvrir une fiche existante (openEditNodeModal
// gère elle-même son propre affichage, sans passer par ici).
function _openAddNodeModalUI() {
  const modal  = document.getElementById('modal-add-node');
  const catSel = document.getElementById('an-cat');
  catSel.innerHTML = '';
  sortCats(APP.categories.filter(c => !c.virtual)).forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = getCat(cat.id).label;
    catSel.appendChild(opt);
  });
  const optCustom = document.createElement('option');
  optCustom.value = '__custom__';
  optCustom.textContent = 'Custom...';
  catSel.appendChild(optCustom);
  const customCatInput = document.getElementById('an-cat-custom');
  customCatInput.style.display = 'none';
  customCatInput.value = '';
  // Sélection par défaut EXPLICITE. Sans elle, le navigateur retenait la
  // première option du menu, donc la première par ordre alphabétique — une
  // catégorie sans rapport avec l'appareil, ET différente selon la langue de
  // l'interface (« Alimentation » en français, « Audio » en anglais).
  // `unsorted` étant épinglée en tête, elle est déjà la première option ; la
  // poser quand même protège d'un futur changement d'ordre.
  catSel.value = 'unsorted';
  _prefillFromSearchProduct();
  _applyAnModalMode();
  modal.classList.add('open');
  setTimeout(() => document.getElementById('an-name').focus(), 50);
}

// Pré-remplit nom complet et nom court quand l'image vient de la recherche.
// Les deux champs restent librement modifiables : c'est une proposition, pas
// une valeur imposée.
//
// Répartition : le nom complet porte « MARQUE - Modèle », le nom court porte le
// MODÈLE seul. Le nom court s'affiche sous l'appareil sur le canevas — y mettre
// la marque ferait afficher « RODE » à trois micros RODE, impossible à
// distinguer ; le modèle, lui, les sépare.
//
// Aucun numéro n'est ajouté ici : le numéro d'exemplaire est un menu déroulant
// distinct (#an-number), alimenté par la numérotation en cascade. Un numéro
// collé dans le nom casserait ce mécanisme.
function _prefillFromSearchProduct() {
  const p = _searchProduct;
  _searchProduct = null; // consommé une seule fois, jamais reporté sur l'appareil suivant
  if (!p) return;
  const marque = (p.brand || '').trim();
  const modele = (p.model || '').trim();
  if (!marque && !modele) return;

  // Ne jamais écraser ce que l'utilisateur a déjà tapé (cas d'une réouverture).
  const nom = document.getElementById('an-name');
  if (nom && !nom.value) nom.value = marque && modele ? `${marque} - ${modele}` : (modele || marque);
  const court = document.getElementById('an-short');
  if (court && !court.value && modele) {
    court.value = modele;
    _shortEdited = true; // valeur explicite : la dérivation automatique ne doit plus l'écraser
  }

  // ⚠️ NE PAS émettre d'événement `input` sur le champ Nom après l'avoir rempli.
  // Ce serait techniquement possible — écrire `.value` depuis le code n'en
  // déclenche aucun — mais ça réveillerait la détection de marque (detectBrand),
  // qui choisirait une catégorie à la place de l'utilisateur.
  // Décision explicite du 2026-09-02 : un appareil arrive en « Non classé » et
  // c'est l'utilisateur qui le range. Une marque ne justifie pas un classement.
}

// Point d'entrée « Nouvel appareil » (menu +) : réinitialise l'état puis ouvre
// directement le choix d'image/forme (#modal-pick-image) — la modale Ajouter
// un appareil (nom/catégorie) ne s'affiche qu'à la fin, une fois l'image/les
// ports déjà configurés (voir la branche « mode création » de rmbg-apply).
function _startAddDeviceFlow() {
  const nodeCount = Object.keys(APP.nodes).filter(id => id !== 'internet').length;
  if (!LICENSE.isPro() && nodeCount >= 10) {
    LICENSE.showGate('devices');
    return;
  }
  _resetAddDeviceState();
  // L'icône Internet supprimée se restaure ici, en un clic, plutôt qu'en
  // forçant à traverser tout le choix d'image + Configuration image pour
  // atteindre l'option au fond du menu Catégorie de la toute dernière étape.
  const hasInternet = Object.values(APP.nodes).some(n => n.cat === 'internet');
  document.getElementById('pick-image-restore-internet').style.display = hasInternet ? 'none' : '';
  document.getElementById('modal-pick-image').classList.add('open');
}

// Titre + libellé du bouton de validation selon le mode (ajout / modification)
function _applyAnModalMode() {
  const isEdit = !!_anEditNodeId;
  const title  = document.getElementById('an-modal-title');
  const btn    = document.getElementById('an-confirm');
  if (title) {
    title.textContent = isEdit ? t('edit_device') : t('add_device');
    title.dataset.i18n = isEdit ? 'edit_device' : 'add_device';
  }
  if (btn) {
    btn.textContent = isEdit ? t('apply_changes') : t('place');
    btn.dataset.i18n = isEdit ? 'apply_changes' : 'place';
  }
}

// ── Modal MODIFIER un appareil déjà sur le canevas ───────────
// Réutilise la modale d'ajout, pré-remplie, en mode « Appliquer » : le nom, le nom
// court, la catégorie, l'image/forme et les ports deviennent tous modifiables d'un
// seul endroit. N'ajoute jamais rien au canevas ni à la bibliothèque — l'appareil
// existe déjà et garde son identité (mêmes id d'appareil et de ports, donc aucun
// câble ni aucune route cassés).
function openEditNodeModal(sid) {
  const node = APP.nodes[sid];
  if (!node) return;
  _anEditNodeId = sid;

  const modal  = document.getElementById('modal-add-node');
  const catSel = document.getElementById('an-cat');
  catSel.innerHTML = '';
  sortCats(APP.categories.filter(c => !c.virtual)).forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = getCat(cat.id).label;
    catSel.appendChild(opt);
  });
  const optCustom = document.createElement('option');
  optCustom.value = '__custom__';
  optCustom.textContent = 'Custom...';
  catSel.appendChild(optCustom);
  catSel.value = node.cat;

  const customCatInput = document.getElementById('an-cat-custom');
  customCatInput.style.display = 'none';
  customCatInput.value = '';
  _anNumberTouched = false;

  // Si cet appareil rejoint déjà un groupe d'image établi par d'AUTRES
  // appareils, et que son propre numéro colle à cette base, le champ Nom
  // n'affiche que la base (jamais le numéro) — sinon rouvrir "Tally-MA 03"
  // pour l'éditer, choisir "03" dans le menu (déjà présélectionné, voir
  // _refreshImgGroupNumberField), et valider donnerait "Tally-MA 03 03".
  // Un appareil sans groupe détecté (pas de voisin partageant son image)
  // garde son nom complet tel quel, chiffre ou pas — rien à en déduire ici.
  {
    const imgKey = node.img_original || node.img || null;
    const sibNames = imgKey
      ? Object.values(APP.nodes)
          .filter(n => n !== node && _imgKeyOf(n) === imgKey)
          .map(n => n.name || n.short || '?')
      : [];
    const { base } = _imgGroupNumbering(sibNames);
    const own = _splitTrailingNumber(node.name || '');
    document.getElementById('an-name').value =
      (base && own.base === base && own.num !== null) ? own.base : (node.name || '');
  }
  document.getElementById('an-short').value = node.short || '';
  _shortEdited  = true; // ne pas écraser le nom court existant en tapant dans le nom

  _anImgData         = node.img || null;
  _rmbgOriginal      = node.img_original || node.img || null;
  _currentShape      = node.shape || null;
  _currentShapeColor = node.shapeColor || '#6B7280';
  _anPorts           = (node.ports || []).map(p => ({ ...p }));
  _lastAppliedBB     = null; // recalculé si on repasse par la configuration image

  _renderAddDevicePreview();
  document.getElementById('an-confirm').disabled = false;
  const anErr = document.getElementById('an-error');
  if (anErr) anErr.style.display = 'none';
  _applyAnModalMode();
  modal.classList.add('open');
  setTimeout(() => document.getElementById('an-name').focus(), 50);
}

let _shortEdited       = false;
// Produit rapporté par la recherche d'images ({ brand?, model? }), en attente
// d'être versé dans #modal-add-node — qui n'ouvre qu'après Configuration image.
// null pour un import local ou une forme générique.
let _searchProduct     = null;
let _currentShape      = null;    // forme générique active ('rectangle','square','circle','triangle') ou null
let _currentShapeColor = '#6B7280'; // couleur de fond de la forme active
let _anPorts      = [];       // [{ id, nx, ny, type }]
let _pendingPort = null;     // { nx, ny } en attente de type
const _portRowOpeners = {};  // portId → fn() ouvre le dropdown de type
let _selectedPortIds = new Set();
let _isolatedPortId = null;  // port affiché seul dans l'image de configuration, ou null
let _shapeImgData    = null; // { data, width, height } — pixels du PNG de forme pour hit-test

// ── Agrandir la zone de placement des ports ────────────────────
// Utile pour un appareil à beaucoup de ports (patch bay...) : la zone de
// base (260px) devient trop petite pour cliquer précisément, et sa liste de
// ports (120px, sous la zone) trop courte pour tout parcourir/renommer.
// Déplace RÉELLEMENT les deux éléments (zone + liste) dans un conteneur
// posé à même <body> — pas seulement un position:fixed laissé en place dans
// la modale : un ancestor de la modale (transform/filter/opacity sur
// .modal-box, transition d'ouverture...) crée facilement son propre
// contexte d'empilement, qui piègerait le z-index de la zone SOUS le fond
// assombri même avec une valeur numérique plus haute — d'où l'image
// "grisée" constatée. Sortir les deux éléments du DOM de la modale évite
// ce piège complètement. _getImgContainRect()/_renderPortDots() lisent déjà
// clientWidth/Height en direct sur la zone, donc un simple re-rendu après
// le déplacement suffit — aucune duplication de la logique de rendu/clic.
let _rmbgExpandOrigin = null; // { zoneParent, zoneNext, listParent, listNext, footerParent, footerNext, btnParent, btnNext } — pour tout remettre en place
// Laquelle des deux vues agrandies (ports / recadrage, voir plus bas) est actuellement ouverte — les
// deux partagent le même cadre plein écran + fond assombri (_rmbgExpandWrap/_rmbgExpandBackdrop),
// donc le clic sur le fond doit savoir laquelle fermer.
let _rmbgExpandMode = null; // 'ports' | 'crop' | null

// Icône "réduire" (inverse visuel de ⛶, qui n'a pas d'équivalent Unicode) — mêmes
// conventions que #btn-zoom-cursor (stroke=currentColor, suit le thème).
const RMBG_COLLAPSE_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9,4 9,9 4,9"/><polyline points="15,4 15,9 20,9"/><polyline points="20,15 15,15 15,20"/><polyline points="4,15 9,15 9,20"/></svg>';

// Ligne "allumée" dans la liste des ports, au clic sur le point (image) ou
// sur le menu de type (liste) — INDÉPENDANT du menu de type lui-même : un
// port déjà câblé a son type verrouillé et le menu ne s'ouvre alors jamais
// (voir _portTypeLocked), donc lier l'allumage à "menu ouvert" ne marchait
// que sur les ports pas encore câblés. Un seul actif à la fois.
let _rmbgActivePortListId = null;
// Noms de port en double (sur CET appareil) — autorisé (pas de blocage de la
// saisie), mais signalé : fond de ligne rouge + clignotement du champ, et
// Appliquer désactivé tant que ça dure (demandé explicitement). Comparaison
// sur le texte tel quel (espaces retirés) ; un champ vide n'est jamais
// compté comme doublon entre deux ports vides.
function _findDuplicatePortLabels() {
  const counts = new Map();
  _anPorts.forEach(p => {
    const label = (p.label || '').trim();
    if (!label) return;
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  const dupIds = new Set();
  _anPorts.forEach(p => {
    const label = (p.label || '').trim();
    if (label && counts.get(label) > 1) dupIds.add(p.id);
  });
  return dupIds;
}

// ⚠️ POINT D'ENTRÉE UNIQUE — la seule fonction à appeler dès que quelque
// chose touchant les ports doit se refléter à l'écran (nom tapé, port
// cliqué, etc.). Un seul système, pas deux à tenir synchronisés à la main :
// elle redéclenche ELLE-MÊME _renderPortDots() (points sur l'image, y
// compris leur clignotement de doublon) EN PLUS de la mise à jour de la
// liste (fond de ligne, clignotement du champ) — jamais l'un sans l'autre,
// quel que soit l'appelant, quelle que soit la vue (normale/agrandie).
function _syncPortVisuals() {
  _renderPortDots();
  const dupIds = _findDuplicatePortLabels();
  document.querySelectorAll('#rmbg-ports-list .port-list-item').forEach(r => {
    const pid = r.dataset.portId;
    const isDup = dupIds.has(pid);
    r.style.background = isDup ? 'rgba(220,50,50,.35)' : (pid === String(_rmbgActivePortListId) ? '#1a2d50' : '');
    const input = r.querySelector('.port-list-name');
    if (input) input.classList.toggle('port-name-dup-blink', isDup);
  });
  _updateConfirmBtn();
}

function _rmbgExpandBackdrop() {
  let bd = document.getElementById('rmbg-ports-backdrop');
  if (!bd) {
    bd = document.createElement('div');
    bd.id = 'rmbg-ports-backdrop';
    bd.style.cssText = 'position:fixed;inset:0;z-index:10019;background:rgba(4,7,14,.7);display:none';
    bd.addEventListener('click', () => {
      if (_rmbgExpandMode === 'ports') _collapseRmbgPortsZone();
      else if (_rmbgExpandMode === 'crop') _collapseRmbgCropExpand();
    });
    document.body.appendChild(bd);
  }
  return bd;
}

// wrap : colonne plein écran, partagée par les deux vues agrandies (ports
// ET recadrage — voir plus bas) — rangée de contenu en haut (flex:1), puis
// pour la vue ports un bandeau align/grille/légende en LARGEUR PLEINE en
// dessous (la vue recadrage n'en a pas besoin, ses contrôles tiennent dans
// les deux colonnes du haut).
function _rmbgExpandWrap() {
  let wrap = document.getElementById('rmbg-expand-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'rmbg-expand-wrap';
    wrap.style.cssText = 'position:fixed;inset:40px;z-index:10020;display:none;flex-direction:column;gap:10px;';
    document.body.appendChild(wrap);
  }
  return wrap;
}

// Rangée du haut (image | liste, ou preview | original selon la vue),
// élément intermédiaire nécessaire car le wrap principal est en colonne.
function _rmbgExpandTop() {
  let top = document.getElementById('rmbg-expand-top');
  if (!top) {
    top = document.createElement('div');
    top.id = 'rmbg-expand-top';
    // margin-top réserve une bande vide au-dessus des deux cadres (image +
    // liste) pour le bouton ✕ (top:6px sur `wrap`, 24px de haut) : sans ça,
    // il flotte au ras de leur bord et se lit comme un bouton DU cadre de
    // droite plutôt que de la fenêtre entière.
    top.style.cssText = 'display:flex;gap:12px;flex:1 1 auto;min-height:0;margin-top:34px;';
    _rmbgExpandWrap().appendChild(top);
  }
  return top;
}

// Un seul moteur de rendu (_renderPortDots/_renderRmbgGridOverlay), qui se
// redéclenche tout seul dès que la TAILLE RÉELLE de la zone change — que ce
// soit à cause d'un agrandissement, d'une réduction, ou de tout autre motif
// futur. Remplace l'ancienne approche (rappeler ces fonctions "à la main"
// juste après avoir agrandi/réduit, avec un délai de 2 frames deviné) — un
// seul point de vérité, l'agrandissement n'a plus besoin de savoir qu'il
// doit demander un re-rendu. Un seul observateur créé, ré-observe la zone
// fraîche à chaque ouverture de modale (le clonage change l'élément).
let _rmbgPortsResizeObserver = null;
function _observeRmbgPortsZoneResize(zone) {
  if (!_rmbgPortsResizeObserver) {
    _rmbgPortsResizeObserver = new ResizeObserver(() => {
      _syncPortVisuals();
      _renderRmbgGridOverlay();
    });
  } else {
    _rmbgPortsResizeObserver.disconnect(); // ne plus observer l'ancien élément cloné
  }
  _rmbgPortsResizeObserver.observe(zone);
}

function _collapseRmbgPortsZone() {
  const zone = document.getElementById('rmbg-ports-zone');
  if (!zone || !zone.classList.contains('expanded')) return;
  zone.classList.remove('expanded');

  const list   = document.getElementById('rmbg-ports-list');
  const footer = document.getElementById('rmbg-ports-footer');
  const btn    = document.getElementById('rmbg-ports-expand');
  if (_rmbgExpandOrigin) {
    const { zoneParent, zoneNext, listParent, listNext, footerParent, footerNext, btnParent, btnNext } = _rmbgExpandOrigin;
    if (zoneParent) zoneParent.insertBefore(zone, zoneNext);
    if (list   && listParent)   listParent.insertBefore(list, listNext);
    if (footer && footerParent) footerParent.insertBefore(footer, footerNext);
    if (btn    && btnParent)    btnParent.insertBefore(btn, btnNext);
    _rmbgExpandOrigin = null;
  }

  zone.style.position  = 'relative';
  zone.style.width     = '';
  zone.style.height    = '260px';
  zone.style.flex      = '';
  zone.style.boxShadow = '';
  if (list) {
    list.style.width     = '';
    list.style.flex      = '';
    list.style.height    = '120px';
    list.style.maxHeight = '120px';
    list.style.background = '';
    list.style.border    = '';
    list.style.borderRadius = '';
    list.style.padding   = '';
  }
  if (footer) {
    footer.style.flex   = '';
    footer.style.display = 'flex'; // toujours une colonne dans la fenêtre normale
    footer.style.flexDirection = 'column';
    footer.style.gap    = '5px';
    footer.style.alignItems = '';
  }

  _rmbgExpandWrap().style.display = 'none';
  _rmbgExpandBackdrop().style.display = 'none';
  if (btn) { btn.textContent = '⛶'; btn.dataset.i18nTitle = 'rmbg_ports_expand'; btn.title = t('rmbg_ports_expand'); }
  _rmbgExpandMode = null;
  // Même appel direct qu'à l'agrandissement (voir _toggleRmbgPortsExpand) —
  // en plus du ResizeObserver, jamais à sa place seule.
  _syncPortVisuals();
  _renderRmbgGridOverlay();
  _renderPortList();
}

function _toggleRmbgPortsExpand() {
  const zone   = document.getElementById('rmbg-ports-zone');
  const list   = document.getElementById('rmbg-ports-list');
  const footer = document.getElementById('rmbg-ports-footer');
  const btn    = document.getElementById('rmbg-ports-expand');
  if (!zone) return;
  if (zone.classList.contains('expanded')) { _collapseRmbgPortsZone(); return; }
  if (_rmbgExpandMode === 'crop') _collapseRmbgCropExpand();

  _rmbgExpandOrigin = {
    zoneParent:   zone.parentNode,             zoneNext:   zone.nextSibling,
    listParent:   list   ? list.parentNode   : null, listNext:   list   ? list.nextSibling   : null,
    footerParent: footer ? footer.parentNode : null, footerNext: footer ? footer.nextSibling : null,
    btnParent:    btn    ? btn.parentNode    : null, btnNext:    btn    ? btn.nextSibling    : null,
  };

  const wrap = _rmbgExpandWrap();
  wrap.style.display = 'flex';
  const top = _rmbgExpandTop();
  top.appendChild(zone);
  if (list) top.appendChild(list);
  if (footer) wrap.appendChild(footer); // pas dans `top` : en pleine largeur, sous l'image ET la liste
  // La croix ✕ suit dans `wrap` directement (pas `zone`) : sinon elle reste
  // positionnée en absolu par rapport à la seule zone image (son parent
  // d'origine), coincée dans son coin au lieu du coin de LA FENÊTRE agrandie
  // entière (image + liste + bandeau). `top:6px;right:6px` (déjà sur le
  // bouton, inchangé) se recalcule automatiquement par rapport à `wrap` une
  // fois déplacé ici — `wrap` est le prochain ancêtre positionné.
  if (btn) wrap.appendChild(btn);

  zone.classList.add('expanded');
  zone.style.position  = 'relative'; // relatif au wrap (déjà fixed), pas fixed lui-même
  zone.style.width     = '';
  zone.style.height    = '';
  zone.style.flex      = '1 1 auto';
  zone.style.boxShadow = '0 20px 60px rgba(0,0,0,.6)';
  if (list) {
    list.style.width      = '260px';
    list.style.flex       = '0 0 260px';
    list.style.height     = '';
    list.style.maxHeight  = 'none';
    list.style.background = 'var(--bg2)';
    list.style.border     = '1px solid var(--border2)';
    list.style.borderRadius = '4px';
    // Plus besoin de padding-top compensatoire ici : le bouton ✕ flotte
    // maintenant au-dessus des deux cadres (marge réservée sur `top`, voir
    // _rmbgExpandTop), il ne touche plus la liste.
    list.style.padding    = '8px';
  }
  if (footer) {
    footer.style.flex      = '0 0 auto';
    footer.style.display   = 'flex';
    footer.style.flexDirection = 'row';
    footer.style.alignItems = 'center';
    footer.style.gap       = '18px';
    footer.style.background = 'var(--bg2)';
    footer.style.border    = '1px solid var(--border2)';
    footer.style.borderRadius = '4px';
    footer.style.padding   = '8px 12px';
  }

  _rmbgExpandBackdrop().style.display = 'block';
  if (btn) { btn.innerHTML = RMBG_COLLAPSE_ICON; btn.removeAttribute('data-i18n-title'); btn.title = t('close'); }
  _rmbgExpandMode = 'ports';
  // Appel direct au même moteur (lire clientWidth/Height juste après force le
  // navigateur à calculer le nouveau layout tout de suite, pas besoin de rAF
  // deviné) — EN PLUS du ResizeObserver, qui reste le filet de sécurité
  // général pour toute autre cause de redimensionnement.
  _syncPortVisuals();
  _renderRmbgGridOverlay();
  _renderPortList();
}

// ── Agrandir la vue recadrage (preview + original + champs) ────
// Partage le même cadre plein écran + fond assombri que la vue ports
// ci-dessus (_rmbgExpandWrap/_rmbgExpandTop/_rmbgExpandBackdrop, génériques)
// — forme différente (deux images + champs plutôt que zone+liste+bandeau),
// donc logique d'agrandissement/réduction séparée plutôt qu'un seul moteur
// à branches pour les deux formes.
let _rmbgCropExpandOrigin = null; // { previewParent, previewNext, tolRowParent, tolRowNext, originalParent, originalNext, btnParent, btnNext }

function _rmbgCropLeftPane() {
  let pane = document.getElementById('rmbg-crop-expand-left');
  if (!pane) {
    pane = document.createElement('div');
    pane.id = 'rmbg-crop-expand-left';
    pane.style.cssText = 'display:flex;flex-direction:column;gap:10px;flex:1 1 auto;min-width:0;min-height:0;';
    _rmbgExpandTop().appendChild(pane);
  }
  return pane;
}

function _rmbgCropRightPane() {
  let pane = document.getElementById('rmbg-crop-expand-right');
  if (!pane) {
    pane = document.createElement('div');
    pane.id = 'rmbg-crop-expand-right';
    pane.style.cssText = 'display:flex;flex-direction:column;gap:14px;flex:0 0 260px;';
    _rmbgExpandTop().appendChild(pane);
  }
  return pane;
}

// Les 4 champs sont des MARGES (distance entre le bord de l'image entière
// et le bord correspondant du cadre de recadrage), pas des coordonnées
// absolues — ça correspond directement à ce que montrent déjà les zones
// sombres (crop-dim-top/bottom/left/right) autour du cadre dans la preview.
function _rmbgCropFieldsBox() {
  let box = document.getElementById('rmbg-crop-fields');
  if (box) return box;

  box = document.createElement('div');
  box.id = 'rmbg-crop-fields';
  box.style.cssText = 'display:flex;flex-direction:column;gap:8px;font-family:var(--mono);font-size:11px;color:var(--textdim);background:var(--bg2);border:1px solid var(--border2);border-radius:4px;padding:10px;';

  const mkRow = (key, label) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px';
    const lbl = document.createElement('span');
    lbl.textContent = label;
    const input = document.createElement('input');
    input.type = 'number';
    input.id = 'rmbg-crop-' + key;
    input.min = '0';
    input.step = '1';
    input.className = 'form-input';
    input.style.cssText = 'width:70px;font-size:11px;text-align:right';
    input.addEventListener('input',  () => _applyCropFieldEdit(key, false));
    input.addEventListener('change', () => _applyCropFieldEdit(key, true));
    row.appendChild(lbl);
    row.appendChild(input);
    return row;
  };

  box.appendChild(mkRow('top',    t('rmbg_crop_top')));
  box.appendChild(mkRow('bottom', t('rmbg_crop_bottom')));
  box.appendChild(mkRow('left',   t('rmbg_crop_left')));
  box.appendChild(mkRow('right',  t('rmbg_crop_right')));
  return box;
}

// Un seul point de vérité pour refléter _cropRect dans les champs — appelé
// par _updateCropOverlay() (glisser une poignée passe donc aussi par ici,
// sans code séparé à tenir synchronisé). No-op si la vue n'est pas ouverte
// (les champs n'existent pas encore dans le DOM).
function _refreshCropFieldsUI() {
  const box = document.getElementById('rmbg-crop-fields');
  if (!box || !_cropRect || !_imgNatW || !_imgNatH) return;
  const { x, y, w, h } = _cropRect;
  const vals = { top: y, bottom: _imgNatH - (y + h), left: x, right: _imgNatW - (x + w) };
  for (const key in vals) {
    const input = document.getElementById('rmbg-crop-' + key);
    // Jamais écraser le champ que l'utilisateur est en train de taper.
    if (input && document.activeElement !== input) input.value = Math.round(vals[key]);
  }
}

// Édition d'un champ → recalcule _cropRect en gardant le bord OPPOSÉ fixe
// (même sémantique que les poignées de drag : bouger "top" ne touche pas
// le bas, bouger "right" ne touche pas la gauche, etc.).
function _applyCropFieldEdit(key, commit) {
  if (!_cropRect || !_imgNatW || !_imgNatH) return;
  const input = document.getElementById('rmbg-crop-' + key);
  const v = parseFloat(input.value);
  if (!Number.isFinite(v)) return;

  let { x, y, w, h } = _cropRect;
  const MIN = 10;
  if (key === 'top')    { const bottom = y + h; y = v; h = bottom - y; }
  if (key === 'bottom') { h = (_imgNatH - v) - y; }
  if (key === 'left')   { const right  = x + w; x = v; w = right  - x; }
  if (key === 'right')  { w = (_imgNatW - v) - x; }

  if (w < MIN) w = MIN;
  if (h < MIN) h = MIN;
  x = Math.max(0, Math.min(x, _imgNatW - MIN));
  y = Math.max(0, Math.min(y, _imgNatH - MIN));
  w = Math.min(w, _imgNatW - x);
  h = Math.min(h, _imgNatH - y);

  _cropRect = { x, y, w, h };
  _updateCropOverlay();
  if (commit) _commitCropRectChange();
}

function _collapseRmbgCropExpand() {
  const preview = document.getElementById('rmbg-preview');
  if (!preview || !preview.classList.contains('expanded')) return;
  preview.classList.remove('expanded');

  const tolRow   = document.getElementById('rmbg-tol-row');
  const original = document.getElementById('rmbg-original');
  const btn      = document.getElementById('rmbg-crop-expand');
  if (_rmbgCropExpandOrigin) {
    const { previewParent, previewNext, tolRowParent, tolRowNext, originalParent, originalNext, btnParent, btnNext } = _rmbgCropExpandOrigin;
    if (previewParent) previewParent.insertBefore(preview, previewNext);
    if (tolRow   && tolRowParent)   tolRowParent.insertBefore(tolRow, tolRowNext);
    if (original && originalParent) originalParent.insertBefore(original, originalNext);
    if (btn      && btnParent)      btnParent.insertBefore(btn, btnNext);
    _rmbgCropExpandOrigin = null;
  }

  preview.style.height    = '130px';
  preview.style.flex      = '';
  preview.style.boxShadow = '';
  if (original) {
    original.style.height    = '130px';
    original.style.flex      = '';
    original.style.boxShadow = '';
  }

  _rmbgExpandWrap().style.display = 'none';
  _rmbgExpandBackdrop().style.display = 'none';
  if (btn) { btn.textContent = '⛶'; btn.dataset.i18nTitle = 'rmbg_crop_expand'; btn.title = t('rmbg_crop_expand'); }
  _rmbgExpandMode = null;
  _updateCropOverlay();
}

function _toggleRmbgCropExpand() {
  const preview  = document.getElementById('rmbg-preview');
  const tolRow   = document.getElementById('rmbg-tol-row');
  const original = document.getElementById('rmbg-original');
  const btn      = document.getElementById('rmbg-crop-expand');
  if (!preview) return;
  if (preview.classList.contains('expanded')) { _collapseRmbgCropExpand(); return; }
  if (_rmbgExpandMode === 'ports') _collapseRmbgPortsZone();

  _rmbgCropExpandOrigin = {
    previewParent:  preview.parentNode,                     previewNext:  preview.nextSibling,
    tolRowParent:   tolRow   ? tolRow.parentNode   : null,   tolRowNext:   tolRow   ? tolRow.nextSibling   : null,
    originalParent: original ? original.parentNode : null,  originalNext: original ? original.nextSibling : null,
    btnParent:      btn      ? btn.parentNode      : null,   btnNext:      btn      ? btn.nextSibling      : null,
  };

  const wrap      = _rmbgExpandWrap();
  wrap.style.display = 'flex';
  const leftPane  = _rmbgCropLeftPane();
  const rightPane = _rmbgCropRightPane();
  leftPane.appendChild(preview);
  if (tolRow) leftPane.appendChild(tolRow);
  if (original) rightPane.appendChild(original);
  rightPane.appendChild(_rmbgCropFieldsBox());
  if (btn) wrap.appendChild(btn);

  preview.classList.add('expanded');
  preview.style.height    = '';
  preview.style.flex      = '1 1 auto';
  preview.style.boxShadow = '0 20px 60px rgba(0,0,0,.6)';
  if (original) {
    // "pas trop grand, juste comme référence" : hauteur modeste fixe, pas
    // flex:1 — sinon elle se disputerait la place avec les champs en dessous.
    original.style.height    = '200px';
    original.style.flex      = '0 0 auto';
    original.style.boxShadow = '0 10px 30px rgba(0,0,0,.5)';
  }

  _rmbgExpandBackdrop().style.display = 'block';
  if (btn) { btn.innerHTML = RMBG_COLLAPSE_ICON; btn.removeAttribute('data-i18n-title'); btn.title = t('close'); }
  _rmbgExpandMode = 'crop';
  _updateCropOverlay(); // repositionne le cadre dans son nouveau contexte + rafraîchit les champs
}

// ── Grille fine (repère visuel optionnel) ──────────────────────
// Utile pour juger l'alignement/l'espacement de beaucoup de ports à l'oeil
// (patch bay...) — purement visuelle, overlay séparé par-dessus l'image
// (jamais dans l'image elle-même). Pas de magnétisme : essayé, retiré —
// forçait les ports sur des intersections exactes, trop rigide en pratique
// pour une vraie photo (jamais parfaitement alignée/droite).
const RMBG_GRID_PX = 14; // taille de case en pixels écran — largeur d'un .pdot (voir _renderPortDots)

function _rmbgGridActive() {
  const cb = document.getElementById('rmbg-grid-toggle');
  return !!(cb && cb.checked);
}

function _renderRmbgGridOverlay() {
  const zone = document.getElementById('rmbg-ports-zone');
  let ov = document.getElementById('rmbg-grid-overlay');
  if (!zone) return;
  if (!_rmbgGridActive()) { if (ov) ov.style.display = 'none'; return; }
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'rmbg-grid-overlay';
    ov.style.cssText = 'position:absolute;pointer-events:none;z-index:15;'
      + 'background-image:linear-gradient(rgba(0,212,255,.35) 1px,transparent 1px),'
      + 'linear-gradient(90deg,rgba(0,212,255,.35) 1px,transparent 1px);';
  }
  if (ov.parentNode !== zone) zone.appendChild(ov); // suit la zone si déplacée (agrandissement)
  const r = _getImgContainRect();
  ov.style.left   = r.left + 'px';
  ov.style.top    = r.top + 'px';
  ov.style.width  = r.width + 'px';
  ov.style.height = r.height + 'px';
  ov.style.backgroundSize = RMBG_GRID_PX + 'px ' + RMBG_GRID_PX + 'px';
  ov.style.display = 'block';
}

// ── Flèches clavier : déplacer le(s) port(s) sélectionné(s) de 2px ─────
// Écouteur global unique posé une fois au chargement — PAS ré-attaché à
// chaque ouverture de modale comme les autres listeners de #rmbg-ports-zone
// (qui eux sont perdus au clonage, voir plus bas). Un seul écouteur avec un
// garde-fou "modale ouverte" marche aussi bien en vue normale qu'agrandie,
// puisque agrandir ne fait que déplacer le même élément dans le DOM — la
// modale elle-même n'est jamais reclonée.
document.addEventListener('keydown', e => {
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const modal = document.getElementById('modal-remove-bg');
  if (!modal || !modal.classList.contains('open')) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
  if (!_selectedPortIds.size) return;
  e.preventDefault();
  const r = _getImgContainRect();
  const dnx = 2 / r.width;
  const dny = 2 / r.height;
  let dx = 0, dy = 0;
  if (e.key === 'ArrowUp')    dy = -dny;
  if (e.key === 'ArrowDown')  dy =  dny;
  if (e.key === 'ArrowLeft')  dx = -dnx;
  if (e.key === 'ArrowRight') dx =  dnx;
  _anPorts.forEach(p => {
    if (!_selectedPortIds.has(p.id)) return;
    p.nx = Math.max(0, Math.min(1, p.nx + dx));
    p.ny = Math.max(0, Math.min(1, p.ny + dy));
  });
  _syncPortVisuals();
});

// ── Rendu des dots de port sur la zone interactive ────────────
const PORT_CONNECTOR_TYPES = ['Bluetooth','Dante','DC','DisplayPort','HDMI','HF','Jack 3.5','Jack 6.35','MADI','Optical','RCA/Cinch','RJ45','SDI','SDI-F','Speakon','Thunderbolt','USB-A','USB-C','USB-DC','WiFi','XLR'];

// ── Calcul pur : position de l'image dans la zone (object-fit:contain) ──
// Utilise naturalWidth/Height + dimensions du div. Zéro getBoundingClientRect.
function _getImgContainRect() {
  const img  = document.getElementById('rmbg-ports-img');
  const zone = document.getElementById('rmbg-ports-zone');
  const zW   = zone.clientWidth;
  const zH   = zone.clientHeight;
  const nW   = img.naturalWidth  || zW;
  const nH   = img.naturalHeight || zH;
  const scale = Math.min(zW / nW, zH / nH);
  const w = nW * scale;
  const h = nH * scale;
  return { left: (zW - w) / 2, top: (zH - h) / 2, width: w, height: h };
}

// ── Chargement des pixels PNG d'une forme générique pour hit-test ──
function _loadShapeImgData(dataUrl) {
  _shapeImgData = null;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    _shapeImgData = { data: d.data, width: c.width, height: c.height };
  };
  img.src = dataUrl;
}

// Retourne true si (nx, ny) est à l'intérieur de la forme (ou dans la marge de 10px écran)
function _isInsideShape(nx, ny) {
  if (!_shapeImgData) return true;
  const { data, width, height } = _shapeImgData;
  const r = _getImgContainRect();
  const scale = r.width / width;
  const marginPx = Math.max(2, Math.ceil(10 / scale)); // 10 px écran → px image
  const px0 = nx * width;
  const py0 = ny * height;
  const checkAt = (px, py) => {
    const x = Math.round(px), y = Math.round(py);
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 10;
  };
  if (checkAt(px0, py0)) return true;
  const d = marginPx, d2 = Math.round(d * 0.707);
  return checkAt(px0 + d, py0)   || checkAt(px0 - d, py0)   ||
         checkAt(px0, py0 + d)   || checkAt(px0, py0 - d)   ||
         checkAt(px0 + d2, py0 + d2) || checkAt(px0 + d2, py0 - d2) ||
         checkAt(px0 - d2, py0 + d2) || checkAt(px0 - d2, py0 - d2);
}

// ── Rendu des dots (divs absolus dans la zone) ────────────────
function _renderPortDots() {
  const zone = document.getElementById('rmbg-ports-zone');
  if (!zone) return;
  zone.querySelectorAll('.pdot').forEach(d => d.remove());

  const r = _getImgContainRect();
  const _dupIds = _findDuplicatePortLabels(); // une seule fois, pas par port

  _anPorts.forEach((p, i) => {
    const x = r.left + p.nx * r.width;
    const y = r.top  + p.ny * r.height;

    const _pdOrphan = !isKnownCableType(p.type);
    const portColor = _pdOrphan ? '#1e2535' : (getCableMeta(p.type).color || '#00d4ff');
    const isSel = _selectedPortIds.has(p.id);
    const isDup = _dupIds.has(p.id);
    const dot = document.createElement('div');
    dot.className = 'pdot' + (isDup ? ' pdot-dup-blink' : '');
    dot.dataset.portId = p.id;
    dot.style.cssText = `
      position:absolute;
      left:${x}px; top:${y}px;
      width:14px; height:14px;
      background:${portColor};
      border:${isSel ? '2.5px solid #00d4ff' : '2px solid #fff'};
      box-shadow:${isSel ? '0 0 7px #00d4ff' : 'none'};
      border-radius:3px;
      transform:translate(-50%,-50%);
      cursor:move; z-index:20;
      display:flex; align-items:center; justify-content:center;
      font-family:monospace; font-size:7px; font-weight:bold; color:${_pdOrphan ? '#555' : '#fff'};
      user-select:none; pointer-events:all;
    `;
    // Doublon de nom (voir _findDuplicatePortLabels) : contour rouge clignotant
    // par-dessus tout le reste (sélection incluse) — l'animation CSS gagne sur
    // le border inline ci-dessus pour la couleur, sans toucher son épaisseur.
    if (_isolatedPortId !== null && p.id !== _isolatedPortId) dot.style.display = 'none';
    // Le nom/numéro tapé par l'utilisateur (p.label) plutôt que la position
    // dans le tableau — sinon le point affichait toujours "3" même après
    // avoir renommé ce port en "14" dans la liste.
    dot.textContent = _pdOrphan ? '✕' : (p.label || (i + 1));

    dot.addEventListener('mousedown', e => {
      e.stopPropagation(); e.preventDefault();

      // Shift+click → toggle selection
      if (e.shiftKey) {
        if (_selectedPortIds.has(p.id)) _selectedPortIds.delete(p.id);
        else _selectedPortIds.add(p.id);
        _syncPortVisuals();
        _updateAlignButtons();
        return;
      }

      // Quick click (<200ms) → open type dropdown · hold → drag to move
      const pressedAt = Date.now();

      // Déplacement groupé : saisir un point qui fait partie d'une sélection multiple
      // déplace toute la sélection du même décalage. Un point hors sélection, ou un
      // port isolé sur l'image (les autres sont masqués), se déplace seul.
      const groupMove = _isolatedPortId === null
        && _selectedPortIds.size > 1
        && _selectedPortIds.has(p.id);
      const startPos = new Map();
      for (const pp of _anPorts) {
        if (pp.id === p.id || (groupMove && _selectedPortIds.has(pp.id))) {
          startPos.set(pp.id, { nx: pp.nx, ny: pp.ny });
        }
      }
      // Bornes du groupe : le décalage est limité une fois pour toutes, sinon les
      // points qui touchent un bord s'écraseraient dessus et la figure se déformerait.
      let minNx = 1, maxNx = 0, minNy = 1, maxNy = 0;
      for (const s of startPos.values()) {
        minNx = Math.min(minNx, s.nx); maxNx = Math.max(maxNx, s.nx);
        minNy = Math.min(minNy, s.ny); maxNy = Math.max(maxNy, s.ny);
      }

      const onMove = ev => {
        if (Date.now() - pressedAt < 200) return;
        const zR = document.getElementById('rmbg-ports-zone').getBoundingClientRect();
        const rc = _getImgContainRect();
        const st = startPos.get(p.id);
        const nx = (ev.clientX - zR.left - rc.left) / rc.width;
        const ny = (ev.clientY - zR.top  - rc.top)  / rc.height;
        const dnx = Math.max(-minNx, Math.min(1 - maxNx, nx - st.nx));
        const dny = Math.max(-minNy, Math.min(1 - maxNy, ny - st.ny));
        for (const pp of _anPorts) {
          const s0 = startPos.get(pp.id);
          if (!s0) continue;
          pp.nx = s0.nx + dnx;
          pp.ny = s0.ny + dny;
          const el = pp.id === p.id ? dot : zone.querySelector(`.pdot[data-port-id="${pp.id}"]`);
          if (!el) continue;
          el.style.left = (rc.left + pp.nx * rc.width)  + 'px';
          el.style.top  = (rc.top  + pp.ny * rc.height) + 'px';
        }
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        if (Date.now() - pressedAt < 200) {
          const list = document.getElementById('rmbg-ports-list');
          // Par id, jamais par position [i] : la liste est maintenant triée
          // par nom (voir _renderPortList), sa position n'a plus rien à voir
          // avec l'ordre de _anPorts.
          const row = list.querySelector(`.port-list-item[data-port-id="${p.id}"]`);
          if (row) row.scrollIntoView({ block: 'nearest' });
          _rmbgActivePortListId = p.id;
          _syncPortVisuals();
          _portRowOpeners[p.id]?.(); // ouvre le menu de type — sans effet si verrouillé (port déjà câblé), l'allumage reste indépendant
        }
        // Le déplacement d'un point ne repasse pas par _renderPortDots() : il bouge le
        // dot directement en CSS. Le libellé du bouton de validation doit donc être
        // réévalué ici, sinon il reste sur « Fermer » alors qu'un port a bougé.
        _refreshRmbgApplyLabel();
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    zone.appendChild(dot);
  });

  // Point d'accroche le plus large pour le libellé du bouton de validation : ajout,
  // déplacement, suppression d'un port, changement de type, et fin de recadrage
  // passent tous par ici.
  _refreshRmbgApplyLabel();
}

// ── Rendu liste des ports ─────────────────────────────────────
function _syncPortIsolationButtons() {
  document.querySelectorAll('#rmbg-ports-list .port-isolate-btn').forEach(btn => {
    const active = _isolatedPortId !== null && btn.dataset.portId === String(_isolatedPortId);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.style.background = active ? 'rgba(0,212,255,.15)' : 'transparent';
    btn.style.borderColor = active ? 'rgba(0,212,255,.75)' : '#1e2d45';
    btn.style.boxShadow = active ? '0 0 7px rgba(0,212,255,.3)' : 'none';
  });
}

// Nœud en cours de modification, quel que soit le chemin d'entrée : Configuration
// image ouverte seule (double-clic sur l'appareil) ou depuis la modale de
// modification complète (bouton crayon). Null à la création d'un appareil.
function _editedNodeIdForPorts() {
  return _rmbgEditNodeId || _anEditNodeId || null;
}

// Vrai si un câble est branché sur ce port. Le type d'un port occupé est verrouillé :
// un câble n'a aucun moyen de changer de type, le laisser sur un port devenu d'un
// autre type produirait un HDMI branché sur du RJ45, incohérence que rien ne
// rattraperait ensuite. Il faut débrancher le câble d'abord.
function _portTypeLocked(portId) {
  const nid = _editedNodeIdForPorts();
  if (!nid) return false;
  return APP.cables.some(c => (c.from === nid && c.from_port === portId)
                           || (c.to   === nid && c.to_port   === portId));
}

function _renderPortList(scrollToLast = false) {
  const list = document.getElementById('rmbg-ports-list');
  if (!list) return;

  // Focus à préserver : le retri est déclenché en direct à CHAQUE frappe (dès
  // qu'un port entre/sort du conflit, voir plus bas), et reconstruit toutes
  // les lignes — sans ça, le champ en cours d'édition perdrait le focus et le
  // curseur à chaque lettre tapée.
  const _active = document.activeElement;
  let _focusPortId = null, _focusStart = null, _focusEnd = null;
  if (_active && _active.classList && _active.classList.contains('port-list-name')) {
    const _activeRow = _active.closest('.port-list-item');
    if (_activeRow) {
      _focusPortId = _activeRow.dataset.portId;
      _focusStart = _active.selectionStart;
      _focusEnd = _active.selectionEnd;
    }
  }

  // Ordre visuel actuel (avant reconstruction) — sert de base au tri partiel
  // ci-dessous : un port EN CONFLIT (doublon de numérotation) doit rester à
  // sa place actuelle dans la liste, pas être déplacé par le retri. Un port
  // pas encore affiché (nouveau) est ajouté à la fin de cette base.
  const _prevOrder = Array.from(list.querySelectorAll('.port-list-item'))
    .map(r => _anPorts.find(p => String(p.id) === r.dataset.portId))
    .filter(Boolean);
  const _prevIds = new Set(_prevOrder.map(p => p.id));
  const _base = _prevOrder.concat(_anPorts.filter(p => !_prevIds.has(p.id)));

  list.innerHTML = '';

  // _origIndex : position de PLACEMENT (jamais la position triée) pour la
  // numérotation de secours ci-dessous — sans ça, un nouveau port sans
  // numéro hérite d'un numéro qui peut coïncider avec un numéro déjà pris par
  // un autre port, dès que des numéros perso cassent l'ordre 1..N.
  const _origIndex = new Map(_anPorts.map((p, i) => [p, i]));

  // Numéro de secours attribué ICI, AVANT le tri qui suit — pas seulement à
  // l'affichage (plus bas) : un port fraîchement créé n'a encore aucun label
  // à ce stade, et un label vide se classerait avant n'importe quel numéro
  // existant dans le tri (chaîne vide < tout le reste), le faisant sauter en
  // tête de liste au lieu de rester à sa place naturelle en fin de série.
  _anPorts.forEach(p => { if (!p.label) p.label = String(_origIndex.get(p) + 1); });

  // Tri par numérotation (p.label) — MAIS un port actuellement en conflit
  // (voir _findDuplicatePortLabels) garde sa place dans _base au lieu d'être
  // déplacé ; seuls les ports libres se retrient entre eux et viennent
  // remplir les places non occupées par un port en conflit, dans l'ordre.
  // {numeric:true} : "2" avant "14" (pas un tri texte pur qui mettrait "14"
  // avant "2").
  const _dupIds = _findDuplicatePortLabels();
  const _movable = _base.filter(p => !_dupIds.has(p.id))
    .sort((a, b) => (a.label || '').localeCompare(b.label || '', undefined, { numeric: true, sensitivity: 'base' }));
  let _mi = 0;
  const _sortedPorts = _base.map(p => _dupIds.has(p.id) ? p : _movable[_mi++]);

  _sortedPorts.forEach((p, i) => {
    // Numéro de secours (port sans numéro) : basé sur la position de PLACEMENT
    // (_origIndex), jamais sur `i` (position triée) — voir commentaire ci-dessus.
    const _fallbackNum = _origIndex.get(p) + 1;
    const row = document.createElement('div');
    row.className = 'port-list-item';
    row.dataset.portId = String(p.id);
    row.style.background = (_rmbgActivePortListId === p.id) ? '#1a2d50' : '';
    const typeLocked = _portTypeLocked(p.id);

    // Carré coloré indicateur (couleur du type de câble)
    const dot = document.createElement('div');
    const _listOrphan = !isKnownCableType(p.type);
    if (_listOrphan) {
      dot.style.cssText = `width:10px;height:10px;border:1px dashed #444;border-radius:2px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:7px;color:#555;`;
      dot.textContent = '✕';
    } else {
      const listColor = getCableMeta(p.type).color || '#00d4ff';
      dot.style.cssText = `width:10px;height:10px;background:${listColor};border-radius:2px;flex-shrink:0`;
    }

    // Numéro — le nom/numéro réel du port (p.label), pas sa position dans
    // la liste : sinon il restait figé sur l'ancienne valeur après un
    // renommage, incohérent avec le champ nom juste à côté.
    const num = document.createElement('span');
    num.style.cssText = 'font-family:var(--mono);font-size:11px;color:var(--textdim);min-width:18px';
    num.textContent = `#${p.label || _fallbackNum}`;

    // Le bloc couleur + numéro isole ce point sur l'image pour le repérer facilement
    const isolateBtn = document.createElement('button');
    isolateBtn.type = 'button';
    isolateBtn.className = 'port-isolate-btn';
    isolateBtn.dataset.portId = String(p.id);
    isolateBtn.title = 'Show only this connection point';
    isolateBtn.setAttribute('aria-label', `Show only connection point ${p.label || _fallbackNum}`);
    isolateBtn.style.cssText = `
      display:flex;align-items:center;gap:6px;min-width:46px;
      padding:3px 5px;background:transparent;border:1px solid #1e2d45;
      border-radius:4px;cursor:pointer;transition:all .15s;flex-shrink:0;
      font:inherit;color:inherit;
    `;
    isolateBtn.appendChild(dot);
    isolateBtn.appendChild(num);
    isolateBtn.addEventListener('click', e => {
      e.stopPropagation();
      _isolatedPortId = _isolatedPortId === p.id ? null : p.id;
      _syncPortVisuals();
      _syncPortIsolationButtons();
    });

    // Nom de port (facultatif) — champ libre, distinct de `type` (compatibilité)
    // et de `id` (technique, jamais affiché). Proportions de la ligne
    // explicitement demandées : petite case pour le clic d'isolement
    // (isolateBtn, INCHANGÉE), petite case ici pour le nom/numéro, grande
    // pour le type (selWrap reste flex:1 comme avant) — visible dans les
    // deux vues, plus besoin de le réserver à la vue agrandie une fois que
    // ce champ reste petit au lieu de se battre pour l'espace en flex:1.
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'port-list-name';
    nameInput.placeholder = t('port_name_placeholder');
    // Pré-rempli avec le numéro déjà affiché (#N) — un point de départ tout
    // de suite lisible, plutôt qu'un champ vide ; librement modifiable ensuite.
    // Écrit aussi dans p.label tout de suite (pas juste affiché) : sinon rien
    // n'est réellement enregistré tant que l'utilisateur n'a pas interagi.
    if (!p.label) p.label = String(_fallbackNum);
    nameInput.value = p.label;
    nameInput.style.cssText = `
      flex:0 0 34px;min-width:0;width:34px;
      padding:3px 4px;font-size:11px;text-align:center;
      background:var(--bg3);border:1px solid #3a4d6d;border-radius:4px;
      font-family:var(--mono);color:var(--text);outline:none;
    `;
    nameInput.addEventListener('mousedown', e => e.stopPropagation());
    // Un retri complet à CHAQUE frappe (pas seulement au blur) : sinon, un
    // port qui sort du conflit à cause de la frappe dans un AUTRE champ reste
    // visuellement à sa place (juste sa couleur changerait) tant que son
    // propre champ à lui ne perd pas le focus à son tour — bug constaté en
    // conditions réelles. _renderPortList gère le focus/curseur pour que ça
    // ne coupe jamais la frappe (voir en tête de fonction), et le pin-in-place
    // des ports encore en conflit (_dupIds, dans _renderPortList).
    nameInput.addEventListener('input', () => {
      p.label = nameInput.value.trim() || null;
      _renderPortList();
    });
    const selWrap = document.createElement('div');
    selWrap.style.cssText = 'flex:1;position:relative;'; // inchangé, comme avant l'ajout du champ nom

    const selBtn = document.createElement('div');
    selBtn.style.cssText = `
      display:flex;align-items:center;gap:6px;
      padding:3px 8px;font-size:11px;cursor:pointer;
      background:#0a0f1e;border:1px solid #1e2d45;border-radius:4px;
      font-family:var(--mono);color:#b8ccec;user-select:none;
    `;
    const _makeOption = type => {
      if (!isKnownCableType(type)) {
        return `<span style="width:8px;height:8px;border-radius:2px;border:1px dashed #444;display:inline-block;flex-shrink:0;font-size:7px;color:#555;text-align:center;line-height:7px">✕</span><span style="color:#555">-</span>`;
      }
      const c = getCableMeta(type).color || '#00d4ff';
      return `<span style="width:8px;height:8px;border-radius:2px;background:${c};display:inline-block;flex-shrink:0"></span><span>${tType(type)}</span>`;
    };
    selBtn.innerHTML = _makeOption(p.type);
    if (typeLocked) {
      // Port occupé : type figé, aucune ouverture possible (ni ici, ni par le clic
      // sur le point de connexion dans l'image, cf. _portRowOpeners plus bas).
      selBtn.style.opacity = '.5';
      selBtn.style.cursor  = 'not-allowed';
      selBtn.title = t('port_type_locked');
    }

    // Dropdown attaché au body pour échapper aux overflow:hidden parents
    const selDrop = document.createElement('div');
    selDrop.className = 'port-type-drop';
    selDrop.style.cssText = `
      display:none;position:fixed;z-index:99999;
      background:#0a0f1e;border:1px solid #1e2d45;border-radius:4px;
      min-width:120px;box-shadow:0 4px 16px rgba(0,0,0,.8);
      max-height:200px;overflow-y:auto;
    `;

    const _addTypeOpt = (tp) => {
      const opt = document.createElement('div');
      opt.style.cssText = `
        display:flex;align-items:center;gap:6px;
        padding:5px 10px;cursor:pointer;font-size:11px;
        font-family:var(--mono);color:#b8ccec;
      `;
      opt.innerHTML = _makeOption(tp);
      opt.addEventListener('mouseenter', () => opt.style.background = '#0e1628');
      opt.addEventListener('mouseleave', () => opt.style.background = '');
      opt.addEventListener('mousedown', e => {
        e.stopPropagation();
        p.type = tp;
        selBtn.innerHTML = _makeOption(tp);
        selDrop.style.display = 'none';
        dot.style.background = getCableMeta(tp).color;
        _dualStyle();
        _syncPortVisuals();
      });
      selDrop.appendChild(opt);
    };

    PORT_CONNECTOR_TYPES.forEach(_addTypeOpt);

    // Types câbles custom déjà créés
    if (USER_CABLE_TYPES.length) {
      const sep = document.createElement('div');
      sep.style.cssText = 'height:1px;background:#1e2d45;margin:4px 0';
      selDrop.appendChild(sep);
      [...USER_CABLE_TYPES].sort((a, b) => a.id.localeCompare(b.id)).forEach(ct => _addTypeOpt(ct.id));
    }

    // Option "Personnalisé..."
    const _sepCustom = document.createElement('div');
    _sepCustom.style.cssText = 'height:1px;background:#1e2d45;margin:4px 0';
    selDrop.appendChild(_sepCustom);

    const customOpt = document.createElement('div');
    customOpt.style.cssText = `
      display:flex;align-items:center;gap:6px;
      padding:5px 10px;cursor:pointer;font-size:11px;
      font-family:var(--mono);color:#b8ccec;
    `;
    customOpt.innerHTML = `<span style="width:8px;height:8px;border-radius:2px;border:1px dashed #7a90b0;display:inline-block;flex-shrink:0"></span><span>${t('custom_ellipsis')}</span>`;
    customOpt.addEventListener('mouseenter', () => customOpt.style.background = '#0e1628');
    customOpt.addEventListener('mouseleave', () => customOpt.style.background = '');
    customOpt.addEventListener('mousedown', e => {
      e.stopPropagation();
      e.preventDefault();
      selDrop.style.display = 'none';
      selBtn.innerHTML = '';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.placeholder = t('custom_cable_hint');
      inp.style.cssText = 'background:transparent;border:none;border-bottom:1px solid rgba(0,212,255,.6);color:var(--text);font-size:11px;width:100%;outline:none;padding:0;font-family:var(--mono);';
      selBtn.appendChild(inp);
      setTimeout(() => { inp.focus(); inp.select(); }, 0);
      let done = false;
      function confirmCustom() {
        if (done) return;
        done = true;
        const name = inp.value.trim();
        if (name) {
          if (!CABLE_META[name] && !USER_CABLE_TYPES.find(uc => uc.id === name)) {
            USER_CABLE_TYPES.push({ id: name, color: _nextCableColor() });
            saveUserCats();
          }
          p.type = name;
        }
        selBtn.innerHTML = _makeOption(p.type);
        dot.style.background = getCableMeta(p.type).color;
        _dualStyle();
        _syncPortVisuals();
      }
      inp.addEventListener('blur', confirmCustom);
      inp.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); }
        if (ev.key === 'Escape') { done = true; selBtn.innerHTML = _makeOption(p.type); }
      });
    });
    selDrop.appendChild(customOpt);

    document.body.appendChild(selDrop);

    // Stocker l'opener pour que le dot puisse l'appeler directement
    _portRowOpeners[p.id] = () => {
      if (typeLocked) return;
      document.querySelectorAll('.port-type-drop').forEach(d => d.style.display = 'none');
      const r = selBtn.getBoundingClientRect();
      selDrop.style.left    = r.left + 'px';
      selDrop.style.width   = r.width + 'px';
      selDrop.style.display = 'block';
      const dh = selDrop.offsetHeight || 200;
      if (r.bottom + dh > window.innerHeight) {
        selDrop.style.top = ''; selDrop.style.bottom = (window.innerHeight - r.top + 2) + 'px';
      } else {
        selDrop.style.bottom = ''; selDrop.style.top = (r.bottom + 2) + 'px';
      }
    };

    selBtn.addEventListener('mousedown', e => {
      e.stopPropagation();
      _rmbgActivePortListId = p.id;
      _syncPortVisuals();
      if (typeLocked) return;
      const isOpen = selDrop.style.display === 'block';
      document.querySelectorAll('.port-type-drop').forEach(d => d.style.display = 'none');
      if (!isOpen) {
        const r = selBtn.getBoundingClientRect();
        selDrop.style.left    = r.left + 'px';
        selDrop.style.width   = r.width + 'px';
        selDrop.style.display = 'block';
        const dh = selDrop.offsetHeight || 200;
        // Ouvrir vers le haut si pas assez de place en bas
        if (r.bottom + dh > window.innerHeight) {
          selDrop.style.top    = '';
          selDrop.style.bottom = (window.innerHeight - r.top + 2) + 'px';
        } else {
          selDrop.style.bottom = '';
          selDrop.style.top    = (r.bottom + 2) + 'px';
        }
      }
    });
    document.addEventListener('mousedown', () => { selDrop.style.display = 'none'; });
    selWrap.appendChild(selBtn);
    selWrap.appendChild(selDrop);

    // Bouton passthrough ⇌ — sans objet pour un port sans fil (pas de notion
    // d'IN/OUT : source/destination illimitées des deux côtés par défaut).
    const dualBtn = document.createElement('button');
    dualBtn.title = 'Passthrough port (IN + OUT)';
    dualBtn.textContent = '⇌';
    const _dualStyle = () => {
      const isWireless = typeof WIRELESS_TYPES !== 'undefined' && WIRELESS_TYPES.has(p.type);
      dualBtn.style.cssText = `
        display:${isWireless ? 'none' : ''};
        background:${p.dual ? 'rgba(0,212,255,.15)' : 'transparent'};
        border:1px solid ${p.dual ? 'rgba(0,212,255,.4)' : '#1e2d45'};
        color:${p.dual ? '#00d4ff' : '#2a3a55'};
        border-radius:3px; padding:1px 5px; cursor:pointer;
        font-size:13px; flex-shrink:0; transition:all .15s;
      `;
    };
    _dualStyle();
    dualBtn.addEventListener('click', e => {
      e.stopPropagation();
      p.dual = !p.dual;
      _dualStyle();
      _refreshRmbgApplyLabel();
    });

    // Bouton supprimer
    const del = document.createElement('button');
    del.className = 'port-list-del';
    del.textContent = '✕';
    del.title = 'Remove';
    del.addEventListener('click', () => {
      if (_isolatedPortId === p.id) _isolatedPortId = null;
      _anPorts = _anPorts.filter(x => x.id !== p.id);
      _selectedPortIds.delete(p.id);
      _syncPortVisuals();
      _renderPortList();
      _updateConfirmBtn();
      _updateAlignButtons();
    });

    row.appendChild(isolateBtn);
    row.appendChild(nameInput);
    row.appendChild(selWrap);
    row.appendChild(dualBtn);
    row.appendChild(del);
    list.appendChild(row);
  });

  const req = document.getElementById('rmbg-ports-required');
  if (req) req.style.display = _anPorts.length ? 'none' : '';
  _syncPortIsolationButtons();
  _syncPortVisuals(); // état initial correct dès l'ouverture (doublons déjà présents, pas seulement après une frappe)

  if (scrollToLast) {
    // Forcer le scroll en bas directement — plus fiable que scrollIntoView
    requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
  }

  // Rendre le focus/curseur au même champ qu'avant la reconstruction (voir
  // capture en haut de fonction) — recherche par data-port-id, jamais par
  // position [i], puisque ce port a justement pu changer de place.
  if (_focusPortId != null) {
    const _newRow   = list.querySelector(`.port-list-item[data-port-id="${_focusPortId}"]`);
    const _newInput = _newRow && _newRow.querySelector('.port-list-name');
    if (_newInput) {
      _newInput.focus();
      if (_focusStart != null) _newInput.setSelectionRange(_focusStart, _focusEnd);
    }
  }
}

// ── Preview dans modal Add Device avec dots de ports ─────────
function _renderAddDevicePreview() {
  _refreshImgGroupNumberField();

  const overlay = document.getElementById('an-prev-overlay');
  const img     = document.getElementById('an-prev-img');
  if (!overlay || !img) return;

  if (!_anImgData) {
    overlay.style.display = 'none';
    overlay.querySelectorAll('.an-pdot').forEach(d => d.remove());
    return;
  }

  overlay.style.display = 'block';
  overlay.title = t('reopen_image_setup');
  img.src = _anImgData;

  const _placeDots = () => {
    overlay.querySelectorAll('.an-pdot').forEach(d => d.remove());
    const iW = img.naturalWidth  || 1;
    const iH = img.naturalHeight || 1;
    const pW = overlay.clientWidth;
    const pH = overlay.clientHeight;
    const scale = Math.min(pW / iW, pH / iH);
    const rW = iW * scale, rH = iH * scale;
    const offX = (pW - rW) / 2, offY = (pH - rH) / 2;
    _anPorts.forEach((p, i) => {
      const previewColor = getCableMeta(p.type).color || '#00d4ff';
      const dot = document.createElement('div');
      dot.className = 'an-pdot';
      dot.style.cssText = `position:absolute;left:${offX + p.nx * rW}px;top:${offY + p.ny * rH}px;width:12px;height:12px;background:${previewColor};border:2px solid #fff;border-radius:3px;transform:translate(-50%,-50%);font-family:monospace;font-size:7px;font-weight:bold;color:#fff;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:10;`;
      dot.textContent = i + 1;
      overlay.appendChild(dot);
    });
  };

  img.addEventListener('load', _placeDots);
  if (img.complete) _placeDots();
}

function _updateConfirmBtn() {
  const applyBtn = document.getElementById('rmbg-apply');
  // Seul vrai blocage existant sur ce bouton (demandé explicitement) : au
  // moins deux ports du même appareil avec le même nom. Tout le reste de la
  // fenêtre ne bloque jamais Appliquer (voir historique du bouton).
  if (applyBtn) applyBtn.disabled = _findDuplicatePortLabels().size > 0;
  _refreshRmbgApplyLabel();
}

// ── Rien à appliquer ? ────────────────────────────────────────
// Vrai dès qu'un geste a pu modifier l'image sans que ça se voie dans la liste des
// ports : recadrage, ré-import, retour de l'éditeur externe. Remis à faux à chaque
// ouverture de la fenêtre sur un appareil existant.
let _rmbgTouched = false;

// Tolérance affichée par le curseur à l'OUVERTURE de la fenêtre — la référence
// pour savoir si l'utilisateur y a touché.
//
// ⚠️ Ne pas comparer à `node.rmbg_tol` : beaucoup d'appareils n'en ont pas du
// tout (nodes.js ne pose jamais ce champ, donc aucun appareil placé depuis la
// bibliothèque d'équipements n'en a). La comparaison était alors purement et
// simplement sautée, et le curseur de tolérance restait sans effet sur eux —
// le bouton annonçait « Fermer » et la modification était perdue.
// Le curseur, lui, a toujours une valeur : celle posée à l'ouverture, qu'elle
// vienne de l'appareil, du dernier réglage retenu ou du défaut.
let _rmbgTolAtOpen = null;

// Compare l'état de la fenêtre à celui de l'appareil. Comparaison sur l'état FINAL,
// pas sur le geste : déplacer un port puis le remettre exactement où il était ne
// compte pas comme une modification.
function _rmbgStateDiffers(node) {
  if (!node) return true;
  if (_rmbgTouched) return true;
  if ((node.shape || null) !== (_currentShape || null)) return true;
  if (_currentShape && (node.shapeColor || null) !== (_currentShapeColor || null)) return true;

  const tolEl = document.getElementById('rmbg-tol');
  if (tolEl && _rmbgTolAtOpen !== null && +tolEl.value !== +_rmbgTolAtOpen) return true;

  const oldPorts = node.ports || [], newPorts = _anPorts || [];
  if (oldPorts.length !== newPorts.length) return true;
  for (const op of oldPorts) {
    const np = newPorts.find(p => p.id === op.id);
    if (!np) return true;                     // port supprimé (ou remplacé par un autre)
    if (Math.abs((op.nx || 0) - (np.nx || 0)) > 1e-6) return true;
    if (Math.abs((op.ny || 0) - (np.ny || 0)) > 1e-6) return true;
    if ((op.type || '') !== (np.type || ''))  return true;
    if (!!op.dual !== !!np.dual)              return true;
    if ((op.label || '') !== (np.label || '')) return true;
  }
  return false;
}

// Le bouton de validation annonce ce qu'il va faire : « Fermer » quand il n'y a rien
// à appliquer, « ✓ Appliquer » sinon. Son ACTION est la même dans les deux cas — c'est
// elle qui ne fait rien quand rien n'a changé — pour qu'une erreur de détection ne
// puisse jamais faire perdre une modification.
// Libellé figé sur « Appliquer » dans deux cas : à la création d'un appareil (rien à
// comparer, il n'existe pas encore) et quand la fenêtre est ouverte depuis la modale
// de modification (_anEditNodeId), où valider ne touche pas à l'appareil mais renvoie
// à la modale, qui validera l'ensemble.
function _refreshRmbgApplyLabel() {
  const btn = document.getElementById('rmbg-apply');
  if (!btn) return;
  const node = (!_anEditNodeId && _rmbgEditNodeId) ? APP.nodes[_rmbgEditNodeId] : null;
  const closeOnly = !!node && !_rmbgStateDiffers(node);
  btn.textContent   = closeOnly ? t('close') : t('apply');
  btn.dataset.i18n  = closeOnly ? 'close' : 'apply';
}

function _updateAlignButtons() {
  const n = _selectedPortIds.size;
  ['rmbg-align-h', 'rmbg-align-v'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = n < 2;
    btn.style.opacity = n < 2 ? '0.4' : '1';
  });
}

// ── Couleur de bordure dérivée de la couleur de fond ─────────
function _hexToHsl(hex) {
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0, s = 0, l = (max+min)/2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max) {
      case r: h = ((g-b)/d + (g<b?6:0))/6; break;
      case g: h = ((b-r)/d + 2)/6; break;
      case b: h = ((r-g)/d + 4)/6; break;
    }
  }
  return [h*360, s*100, l*100];
}
function _hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q-p)*6*t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q-p)*(2/3-t)*6;
    return p;
  };
  let r, g, b;
  if (s === 0) { r = g = b = l; } else {
    const q = l < 0.5 ? l*(1+s) : l+s-l*s, p = 2*l-q;
    r = hue2rgb(p,q,h+1/3); g = hue2rgb(p,q,h); b = hue2rgb(p,q,h-1/3);
  }
  return '#' + [r,g,b].map(x => Math.round(x*255).toString(16).padStart(2,'0')).join('');
}
function _shapeStrokeColor(hex) {
  const [h, s, l] = _hexToHsl(hex);
  return _hslToHex(h, Math.min(100, s + 10), Math.min(90, l + 32));
}

// ── Génère un PNG canvas pour une forme générique (niveau module) ──
function _generateShapePng(shape, name, color = '#6B7280') {
  const isRect = shape === 'rectangle';
  const w = isRect ? 960 : 640;
  const h = 640;
  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const pad = 40;
  ctx.fillStyle   = color;
  ctx.strokeStyle = _shapeStrokeColor(color);
  ctx.lineWidth   = 6;
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.ellipse(w / 2, h / 2, w / 2 - pad, h / 2 - pad, 0, 0, Math.PI * 2);
  } else if (shape === 'triangle') {
    ctx.moveTo(w / 2, pad);
    ctx.lineTo(w - pad, h - pad);
    ctx.lineTo(pad, h - pad);
    ctx.closePath();
  } else {
    const r = 24;
    const x = pad, y = pad, bw = w - pad * 2, bh = h - pad * 2;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + bw - r, y); ctx.arcTo(x + bw, y, x + bw, y + r, r);
    ctx.lineTo(x + bw, y + bh - r); ctx.arcTo(x + bw, y + bh, x + bw - r, y + bh, r);
    ctx.lineTo(x + r, y + bh); ctx.arcTo(x, y + bh, x, y + bh - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
  if (name) {
    const wrapText = (text, mw) => {
      const words = text.split(' ');
      const lines = [];
      let cur = '';
      for (const word of words) {
        const test = cur ? cur + ' ' + word : word;
        if (ctx.measureText(test).width <= mw) { cur = test; }
        else {
          if (cur) lines.push(cur);
          if (ctx.measureText(word).width > mw) {
            let part = '';
            for (const ch of word) {
              if (ctx.measureText(part + ch).width <= mw) { part += ch; }
              else { if (part) lines.push(part); part = ch; }
            }
            cur = part;
          } else { cur = word; }
        }
      }
      if (cur) lines.push(cur);
      return lines;
    };
    ctx.fillStyle    = 'rgba(255,255,255,0.9)';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    if (shape === 'triangle') {
      // Rectangle virtuel ancré à la base du triangle.
      // Pour N lignes, le haut du bloc est à textBottomY - N*lineH.
      // La largeur disponible = largeur du triangle à cette hauteur - marges.
      // On cherche le plus petit N (= texte le plus large possible) qui tient.
      const yApex        = pad;
      const yBase        = h - pad;
      const triH         = yBase - yApex;
      const triBaseW     = w - 2 * pad;
      const bottomMargin = 32;
      const horizMargin  = 16;
      const textBottomY  = yBase - bottomMargin;
      const triWidthAt   = y => Math.max(0, triBaseW * (y - yApex) / triH - 2 * horizMargin);

      const startFontSize = Math.min(80, Math.max(24, Math.floor(triBaseW / (name.length * 0.65))));
      let finalLines    = null;
      let finalFontSize = 18;
      let finalStartY   = textBottomY - 9;

      let fontSize = startFontSize;
      outer:
      while (true) {
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        const lineH = fontSize * 1.35;
        const maxN  = Math.floor((textBottomY - yApex - 4) / lineH);

        if (maxN >= 1) {
          // Itérer N de 1 (texte large) vers maxN (texte étroit)
          for (let N = 1; N <= maxN; N++) {
            const maxW = triWidthAt(textBottomY - N * lineH);
            if (maxW < 12) continue;
            let lines = wrapText(name, maxW);
            if (lines.length > N) continue; // ne tient pas en N lignes
            // Tient ! Converger vers moins de lignes (largeur croissante)
            for (let iter = 0; iter < 4; iter++) {
              const prevCount = lines.length;
              const newMaxW   = triWidthAt(textBottomY - prevCount * lineH);
              if (newMaxW < 12) break;
              const newLines  = wrapText(name, newMaxW);
              if (newLines.length >= prevCount) break;
              lines = newLines;
            }
            finalLines    = lines;
            finalFontSize = fontSize;
            finalStartY   = (textBottomY - lines.length * lineH) + lineH / 2;
            break outer;
          }
        }

        if (fontSize <= 18) break;
        fontSize = Math.max(18, Math.floor(fontSize * 0.82));
      }

      if (!finalLines) finalLines = [name.substring(0, 6)];
      ctx.font = `bold ${finalFontSize}px "Courier New", monospace`;
      const lineH = finalFontSize * 1.35;
      finalLines.forEach((line, i) => ctx.fillText(line, w / 2, finalStartY + i * lineH));

    } else {
      // Rectangle, carré, cercle : bloc centré verticalement
      const maxTextW  = w - pad * 4;
      let fontSize = Math.min(80, Math.max(24, Math.floor(w / (name.length * 0.65))));
      let lines = [];
      for (let i = 0; i < 6; i++) {
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        lines = wrapText(name, maxTextW);
        const totalH = lines.length * fontSize * 1.35;
        if (totalH <= (h - 2 * pad) * 0.7) break;
        fontSize = Math.max(18, Math.floor(fontSize * 0.78));
      }
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      const lineH  = fontSize * 1.35;
      const startY = h / 2 - (lines.length - 1) * lineH / 2;
      lines.forEach((line, i) => ctx.fillText(line, w / 2, startY + i * lineH));
    }
  }
  // Auto-crop : supprimer les bords transparents pour que la forme remplisse le PNG
  const idata = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (idata[(y * w + x) * 4 + 3] > 0) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const mg = 6;
  x0 = Math.max(0, x0 - mg); y0 = Math.max(0, y0 - mg);
  x1 = Math.min(w - 1, x1 + mg); y1 = Math.min(h - 1, y1 + mg);
  const out = document.createElement('canvas');
  out.width  = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

// Dialogue natif Electron pour choisir une image (remplace l'ancien <input type="file">
// #an-img-file, qui n'offrait aucun moyen de mémoriser son propre dossier séparément
// de celui des projets .wires — voir main.js, pick-image-dialog/lastImageDir). Partagé
// entre le bouton "Import image" de la fenêtre Ajouter un appareil et le repli de
// openNodePortsEditor (appareil existant sans image du tout, plus bas dans ce fichier).
async function _pickImageAndOpenRmbg() {
  const dataUrl = await window.electronAPI.pickImage();
  if (!dataUrl) return; // dialogue annulé
  _currentShape = null; // image réelle → plus de forme générique
  _openRmbgModal(dataUrl);
}

// Taille d'import d'un nouvel appareil : jamais un agrandissement forcé au-delà de sa
// résolution réelle (perte de qualité — voir #an-prev-img, déjà chargée avec la même
// image au moment où "Confirmer" est cliqué), plafonnée à une taille raisonnable À
// L'ÉCRAN plutôt qu'un nombre fixe de pixels canevas — divisée par le zoom courant,
// pour qu'un appareil ajouté très zoomé ou dézoomé n'apparaisse pas minuscule ou
// énorme selon le hasard du niveau de zoom du moment. Avant ce correctif, w:280,h:160
// était fixe pour absolument tout import, sans rapport avec l'image réelle.
const IMPORT_TARGET_SCREEN_W = 320;
function _computeImportSize(natW, natH) {
  if (!natW || !natH) return { w: 280, h: 160 }; // repli si l'image n'a pas fini de décoder
  const targetCanvasW = IMPORT_TARGET_SCREEN_W / (APP.view.zoom || 1);
  const w = Math.max(MIN_W, Math.min(natW, targetCanvasW));
  const h = Math.max(MIN_H, Math.round(w * natH / natW));
  return { w: Math.round(w), h };
}

// ═══════════════════════════════════════════════════════════════
// Numérotation par "groupe d'image" — deux appareils posés qui partagent la
// même image (img_original, sinon img) sont proposés comme le même modèle
// ×N, plutôt que numérotés à la main par l'utilisateur. Champ permanent
// #an-number dans la modale d'ajout/modification (voir _refreshImgGroupNumberField,
// rafraîchi à chaque changement d'image par _renderAddDevicePreview) — pas
// une popup séparée après coup : le numéro s'édite à côté du nom, jamais en
// recombinant/écrasant ce qui est tapé.
// ─────────────────────────────────────────────────────────────────
function _imgKeyOf(node) { return node?.img_original || node?.img || null; }

// ── applyCategoryChange — reclasse un appareil, et propose ses frères ──
// Point de passage UNIQUE pour tout changement de catégorie d'un appareil déjà
// posé sur le canevas, appelé aussi bien par la pastille du panneau que par la
// fenêtre de modification. Deux appareils sont « frères » quand ils partagent
// la même image (_imgKeyOf) — c'est le même regroupement que la numérotation
// en cascade, le numéro ne servant qu'à les distinguer À L'INTÉRIEUR du groupe.
//
// ⚠️ pushUndo() est appelé UNE SEULE FOIS, avant la boucle. C'est ce qui fait
// qu'un Ctrl+Z défait les 4 reclassements d'un coup : ils viennent d'une seule
// action de l'utilisateur, ils doivent former un seul pas d'annulation.
// (Même règle que _autoNumberUnnumberedSiblings.)
//
// Retourne le nombre d'appareils reclassés, frères compris (0 si rien à faire).
async function applyCategoryChange(nodeId, catId) {
  const node = APP.nodes[nodeId];
  if (!node || node.cat === catId) return 0;

  pushUndo();
  wLog('NODE_CAT', { id: nodeId, from: node.cat, to: catId });
  node.cat = catId;
  renderOneNode(nodeId);
  if (typeof refreshSidebar === 'function') refreshSidebar();
  setDirty();

  // L'appareil cliqué change TOUT DE SUITE, avant la question : c'est l'action
  // demandée, elle ne doit pas attendre une réponse sur les autres.
  return 1 + await _propagateCatToSiblings(nodeId, catId);
}

// Propose d'étendre un changement de catégorie aux frères de l'appareil, et
// l'applique si l'utilisateur accepte.
//
// ⚠️ NE POUSSE AUCUN UNDO — c'est à l'appelant de l'avoir fait AVANT toute
// modification. C'est ce qui garantit qu'un Ctrl+Z défait les 4 reclassements
// d'un coup : ils viennent d'une seule action de l'utilisateur, ils doivent
// former un seul pas d'annulation. (Même règle que _autoNumberUnnumberedSiblings.)
//
// Retourne le nombre de frères effectivement reclassés.
async function _propagateCatToSiblings(nodeId, catId) {
  const node = APP.nodes[nodeId];
  const imgKey = _imgKeyOf(node);
  if (!imgKey) return 0; // forme générique sans image : aucun frère identifiable

  // Les frères DÉJÀ dans la catégorie visée sont exclus : les compter dirait
  // « 4 exemplaires » pour une question qui n'en changerait que 2.
  const freres = Object.keys(APP.nodes).filter(id =>
    id !== nodeId && _imgKeyOf(APP.nodes[id]) === imgKey && APP.nodes[id].cat !== catId);
  if (!freres.length) return 0;

  const ok = await showConfirm(
    t('cat_change_siblings')
      .replace('$n', String(freres.length + 1))
      .replace('$autres', String(freres.length))
      .replace('$cat', getCat(catId).label),
    { ok: t('cat_change_all'), cancel: t('cat_change_one') }
  );
  if (!ok) return 0;

  for (const id of freres) {
    const n = APP.nodes[id];
    if (!n) continue; // supprimé pendant que la question était ouverte
    wLog('NODE_CAT', { id, from: n.cat, to: catId });
    n.cat = catId;
    renderOneNode(id);
  }
  if (typeof refreshSidebar === 'function') refreshSidebar();
  setDirty();
  return freres.length;
}

// Isole le numéro final d'UN nom, indépendamment des autres — jamais par
// préfixe commun entre plusieurs noms, qui avale à tort un chiffre partagé
// par coïncidence (ex. "Tally-MA 03"/"04" partagent le "0" de tête : un LCP
// lettre à lettre donnerait "Tally-MA 0" comme "base", pas "Tally-MA").
// [\s_-]+ (pas *) : exige un vrai séparateur avant le chiffre, pour que
// "Tally-MA O1" (lettre O directement collée au 1, aucun séparateur) ne soit
// jamais lu comme "numéroté" — seul un chiffre précédé d'un espace/tiret/
// underscore compte.
function _splitTrailingNumber(name) {
  const m = name.match(/^(.*?)[\s_-]+(\d+)\s*$/);
  return m ? { base: m[1].trim(), num: parseInt(m[2], 10) } : { base: name.trim(), num: null };
}

// Numéros déjà pris dans un groupe — { base, used }. La base retenue est
// celle que la MAJORITÉ des noms déjà numérotés partagent (après avoir isolé
// le numéro de chacun séparément) ; un nom qui ne se numérote pas du tout
// (pas de séparateur+chiffre en fin) ne compte simplement pas.
function _imgGroupNumbering(names) {
  const parsed = names.map(_splitTrailingNumber).filter(p => p.num !== null);
  if (!parsed.length) return { base: '', used: new Set() };
  const counts = new Map();
  for (const p of parsed) counts.set(p.base, (counts.get(p.base) || 0) + 1);
  let base = parsed[0].base, best = 0;
  for (const [b, c] of counts) { if (c > best) { best = c; base = b; } }
  const used = new Set(parsed.filter(p => p.base === base).map(p => p.num));
  return { base, used };
}

function _formatGroupNumber(n, width) { return String(n).padStart(width, '0'); }

// Prochains numéros libres, dans l'ordre — width s'élargit à 3 chiffres
// seulement si le groupe dépasse 99.
function _availableGroupNumbers(used, count, width) {
  const out = [];
  let n = 1;
  while (out.length < count) {
    if (!used.has(n)) out.push(n);
    n++;
  }
  return out.map(n => _formatGroupNumber(n, width));
}

// Un appareil vient d'être confirmé avec un numéro (ex. "ATEM 03") : tout
// voisin de MÊME image encore sans numéro reçoit automatiquement le plus
// petit numéro libre (ordre d'apparition dans APP.nodes), pour qu'aucun
// appareil du groupe ne reste "muet" une fois le groupe amorcé. Appelée
// après création (_anFinalizeConfirm) ou modification (_applyEditToNode) —
// fait partie de la même action utilisateur (même pushUndo) que l'appelant,
// n'en déclenche pas de nouveau ici.
function _autoNumberUnnumberedSiblings(nodeId) {
  const node = APP.nodes[nodeId];
  if (!node) return;
  const own = _splitTrailingNumber(node.name || '');
  if (own.num === null) return; // ce device lui-même n'a pas été numéroté

  const imgKey = _imgKeyOf(node);
  if (!imgKey) return;

  const group = Object.entries(APP.nodes).filter(([id, n]) => id !== nodeId && _imgKeyOf(n) === imgKey);
  if (!group.length) return;

  const used = new Set([own.num]);
  const unnumbered = [];
  for (const [sid, n] of group) {
    const p = _splitTrailingNumber(n.name || n.short || '');
    if (p.num !== null && p.base === own.base) used.add(p.num);
    else if (p.num === null) unnumbered.push(sid);
  }
  if (!unnumbered.length) return;

  const width = [...used].some(n => n > 99) ? 3 : 2;
  let next = 1;
  for (const sid of unnumbered) {
    while (used.has(next)) next++;
    used.add(next);
    const sib = APP.nodes[sid];
    sib.name = (sib.name || sib.short || '').trim() + ' ' + _formatGroupNumber(next, width);
    renderOneNode(sid);
  }
}

// Numérotation au COLLAGE (Ctrl+V, voir _pasteNodes dans app.js) — volontairement
// différente de _autoNumberUnnumberedSiblings ci-dessus : celle-ci comble les trous
// (déclenchée depuis la fenêtre Ajouter/Modifier un appareil, laissée inchangée), alors
// que le collage numérote toujours AU-DESSUS du plus grand numéro déjà utilisé dans le
// groupe, jamais un trou — décision explicite de l'utilisateur (2026-08-23) : "je trouve
// ça plus logique de donner le numéro au-dessus [...] seulement le collage."
function _assignPasteNumbering(newNodeId) {
  const node = APP.nodes[newNodeId];
  if (!node) return;
  const imgKey = _imgKeyOf(node);
  if (!imgKey) return; // appareil "forme" générique sans image : pas de groupe à numéroter

  const siblings = Object.entries(APP.nodes).filter(([id, n]) => id !== newNodeId && _imgKeyOf(n) === imgKey);
  if (!siblings.length) return; // seul de son espèce : rien à numéroter

  const base = _splitTrailingNumber(node.name || node.short || '').base;

  // Sépare les voisins déjà numérotés (jamais retouchés) de ceux qui ne le sont pas
  // encore — typiquement l'appareil source, dont on vient justement de coller une
  // copie. Le nouvel appareil collé lui-même n'entre dans aucune des deux liste : il
  // n'a par définition pas encore de numéro à ce stade.
  const numbered = [], unnumbered = [];
  for (const pair of siblings) {
    const p = _splitTrailingNumber(pair[1].name || pair[1].short || '');
    if (p.num !== null && p.base === base) numbered.push(p.num);
    else if (p.num === null) unnumbered.push(pair);
  }
  const currentHighest = numbered.length ? Math.max(...numbered) : 0;
  const width = (currentHighest + unnumbered.length + 1 >= 100) ? 3 : 2;

  // L'appareil source (plus ancien) reçoit D'ABORD les numéros juste au-dessus du
  // maximum existant, dans l'ordre — il doit rester en-dessous du numéro de la copie,
  // la plus récente du groupe. Jamais de trou comblé (règle propre au collage,
  // décision explicite de l'utilisateur, 2026-08-23 — voir la fenêtre Ajouter un
  // appareil pour le mécanisme inverse, laissé inchangé).
  let next = currentHighest;
  for (const [sid, n] of unnumbered) {
    next++;
    n.name = base + ' ' + _formatGroupNumber(next, width);
    renderOneNode(sid);
  }

  // Le nouvel appareil collé reçoit toujours le numéro le plus grand du lot.
  next++;
  node.name = base + ' ' + _formatGroupNumber(next, width);
  renderOneNode(newNodeId);
}

function setupAddNodeModal() {
  const nameInput  = document.getElementById('an-name');
  const shortInput = document.getElementById('an-short');

  // Nom court dérivé du nom, tant que l'utilisateur ne l'a pas édité lui-même.
  //
  // ⚠️ Le nom NE CHOISIT PLUS DE CATÉGORIE (retiré le 2026-09-02, décision
  // explicite de l'utilisateur). Auparavant, chaque caractère tapé ici passait
  // par detectBrand() et, dès que le nom commençait par une des 174 marques
  // connues, la catégorie était remplacée — pendant la frappe, sans rien
  // demander. Un appareil arrive désormais en « Non classé » et c'est
  // l'utilisateur qui le range : une marque ne justifie pas un classement.
  // (detectBrand/learnBrand restent en place, ils servent ailleurs.)
  nameInput.addEventListener('input', () => {
    if (!_shortEdited) {
      shortInput.value = smartShortName(nameInput.value);
    }
  });
  // Si l'utilisateur édite manuellement le short name, on arrête l'auto
  shortInput.addEventListener('input', () => {
    _shortEdited = shortInput.value.trim() !== smartShortName(nameInput.value);
  });

  document.getElementById('an-cat').addEventListener('change', () => {
    const val = document.getElementById('an-cat').value;
    const custom = document.getElementById('an-cat-custom');
    const isCustom = val === '__custom__';
    custom.style.display = isCustom ? 'block' : 'none';
    if (isCustom) custom.focus();
  });

  // Import image (côté gauche de la zone) → dialogue natif Electron, comme le
  // sélecteur de la mini-dialog "Remplacer l'image" (voir plus haut) — mémorise lui
  // aussi lastImageDir, séparément du dossier du projet.
  document.getElementById('an-img-import').addEventListener('click', _pickImageAndOpenRmbg);

  // Clic sur l'aperçu → rouvrir la configuration image & ports SANS changer d'image
  // (retoucher le détourage, déplacer/ajouter des ports). Pour changer d'image ou
  // passer à une forme, la zone import/formes juste au-dessus reste disponible.
  document.getElementById('an-prev-overlay').addEventListener('click', () => {
    if (!_rmbgOriginal && !_anImgData) return;
    _openRmbgModal(_rmbgOriginal || _anImgData);
  });


  const _showAnError = (msg, fieldId) => {
    const el = document.getElementById('an-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; clearTimeout(el._t); el._t = setTimeout(() => { el.style.display = 'none'; }, 3500); }
    if (fieldId) { const f = document.getElementById(fieldId); if (f) { f.classList.add('field-error'); f.focus(); setTimeout(() => f.classList.remove('field-error'), 1000); } }
  };

  // Confirmer
  document.getElementById('an-confirm').addEventListener('click', () => {
    const name  = nameInput.value.trim();
    const short = shortInput.value.trim();
    let cat     = document.getElementById('an-cat').value;

    if (!name) { _showAnError(t('name_required'), 'an-name'); return; }
    if (!_anImgData) { _showAnError(t('image_required'), null); return; }

    if (cat === '__custom__') {
      const customName = document.getElementById('an-cat-custom').value.trim();
      if (!customName) { _showAnError(t('cat_name_required'), 'an-cat-custom'); return; }
      const slug = 'custom_' + customName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      if (!APP.categories.find(c => c.id === slug)) {
        const color  = _nextCatColor();
        const labels = { fr: customName, en: customName, es: customName };
        APP.categories.push({ id: slug, color, labels });
        saveUserCats();
      }
      cat = slug;
    }

    // Numéro choisi dans #an-number (voir _refreshImgGroupNumberField) : simple
    // suffixe optionnel accolé au nom tel que tapé, jamais une recombinaison
    // qui écraserait le champ Nom. Garde-fou en plus de l'ouverture "propre"
    // du champ (openEditNodeModal) : si le nom tapé se termine déjà par CE
    // numéro précis (ex. tapé à la main), ne pas le rajouter une 2e fois.
    const numChosen = document.getElementById('an-number')?.value || '';
    const alreadyEndsWithChosen = numChosen && _splitTrailingNumber(name).num !== null
      && _formatGroupNumber(_splitTrailingNumber(name).num, numChosen.length) === numChosen;
    const finalName = (numChosen && !alreadyEndsWithChosen) ? (name + ' ' + numChosen) : name;
    _anFinalizeConfirm(finalName, short, cat);
  });

  // Fermer modals
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.close)?.classList.remove('open');
      if (btn.dataset.close === 'modal-add-node') _anEditNodeId = null;
      if (btn.dataset.close === 'export-modal' && typeof _eroClearHighlight === 'function') _eroClearHighlight();
    });
  });

  // Popup groupe d'image : se ferme au clic n'importe où dessus.
  document.getElementById('img-group-popup')?.addEventListener('click', function () {
    this.style.display = 'none';
  });

  // Marque un choix VOLONTAIRE de l'utilisateur — distinct de "jamais encore
  // touché" (voir _anNumberTouched, utilisé par _refreshImgGroupNumberField).
  document.getElementById('an-number')?.addEventListener('change', () => {
    _anNumberTouched = true;
  });
}

// Rafraîchit le champ permanent #an-number (options + indice "déjà utilisée
// par...") selon l'image actuellement en attente (_anImgData/_rmbgOriginal),
// comparée aux appareils déjà posés (hors celui en cours d'édition). Appelé
// par _renderAddDevicePreview à chaque changement d'image — jamais de popup
// séparée : le numéro choisi est un simple suffixe optionnel lu directement
// sur #an-number au moment de valider (voir an-confirm).
// True dès que l'utilisateur touche #an-number À LA MAIN durant la session
// d'édition en cours (voir setupAddNodeModal) — remis à false à chaque
// ouverture fraîche (_resetAddDeviceState/openEditNodeModal).
let _anNumberTouched = false;

function _showImgGroupPopup(text) {
  const popup  = document.getElementById('img-group-popup');
  const textEl = document.getElementById('img-group-popup-text');
  if (!popup || !textEl) return;
  textEl.textContent = text;
  popup.style.display = 'flex';
}

function _refreshImgGroupNumberField() {
  const selEl  = document.getElementById('an-number');
  const hintEl = document.getElementById('an-number-hint');
  if (!selEl) return;

  const imgKey = _rmbgOriginal || _anImgData || null;
  const siblings = imgKey
    ? Object.entries(APP.nodes)
        .filter(([id, n]) => id !== _anEditNodeId && _imgKeyOf(n) === imgKey)
        .map(([, n]) => n)
    : [];
  const siblingNames = siblings.map(s => s.name || s.short || '?');
  const { base: establishedBase, used } = _imgGroupNumbering(siblingNames);

  // Champ toujours présent dans la fenêtre (jamais caché, pour ne pas déplacer
  // les champs voisins), mais désactivé et vide tant qu'aucun autre appareil ne
  // partage la même image — la numérotation n'a alors aucun sens.
  selEl.disabled = siblings.length === 0;

  // Numéro déjà attribué à CET appareil, lu sur sa fiche ENREGISTRÉE
  // (APP.nodes), jamais sur le champ Nom affiché — celui-ci n'affiche plus
  // que la base depuis openEditNodeModal, donc y chercher un chiffre ne
  // trouverait plus rien. Un appareil est exclu de ses propres "voisins",
  // donc son numéro n'apparaît jamais dans `used` : sans ce calcul à part,
  // il serait traité comme "pas encore numéroté" et le 1er numéro libre des
  // AUTRES appareils l'écraserait par défaut à l'ouverture.
  const editingNode = _anEditNodeId ? APP.nodes[_anEditNodeId] : null;
  const ownParsed = _splitTrailingNumber(editingNode ? (editingNode.name || editingNode.short || '') : '');
  const ownNumber = (establishedBase && ownParsed.base === establishedBase && ownParsed.num !== null)
    ? ownParsed.num : null;

  // Règle simple et déterministe : un numéro déjà attribué à CET appareil
  // (ownNumber) → jamais de popup, peu importe la session/l'historique. Pas
  // encore de numéro alors que l'image rejoint un groupe existant → popup,
  // à chaque fois que cette fiche est ouverte tant que rien n'est assigné —
  // c'est une invite à agir, pas une notification à usage unique.
  if (siblingNames.length && ownNumber === null) {
    _showImgGroupPopup(t('img_group_used_by') + ' ' + siblingNames.join(', ') + '\n' + t('img_group_can_number'));
  }

  const typedName = document.getElementById('an-name')?.value.trim() || '';

  const width = [...used, ownNumber].some(n => n > 99) ? 3 : 2;

  // Autant de voisins encore sans numéro que de créneaux à réserver : dès que
  // CET appareil est confirmé avec un numéro, _autoNumberUnnumberedSiblings
  // leur attribue automatiquement les plus petits numéros libres restants —
  // ne pas les proposer ici évite d'obtenir deux appareils "01" au final.
  const unnumberedSiblingCount = siblings.filter(s => _splitTrailingNumber(s.name || s.short || '').num === null).length;
  const reserved = _availableGroupNumbers(used, unnumberedSiblingCount, width).map(s => parseInt(s, 10));
  const usedOrReserved = new Set([...used, ...reserved]);

  const availableNums = _availableGroupNumbers(usedOrReserved, 6, width).map(s => parseInt(s, 10));
  const allNums = (ownNumber !== null && !availableNums.includes(ownNumber))
    ? [ownNumber, ...availableNums].sort((a, b) => a - b)
    : availableNums;
  if (!siblings.length) allNums.length = 0; // rien à proposer : appareil seul de son espèce

  const prevValue = selEl.value;
  selEl.innerHTML = '';
  const noneOpt = document.createElement('option');
  noneOpt.value = ''; noneOpt.textContent = '—'; // pas de traduction : juste "vide", tient dans les 64px du menu
  selEl.appendChild(noneOpt);
  allNums.forEach(n => {
    const opt = document.createElement('option');
    opt.value = _formatGroupNumber(n, width); opt.textContent = opt.value;
    selEl.appendChild(opt);
  });

  if (_anNumberTouched && [...selEl.options].some(o => o.value === prevValue)) {
    // Un choix déjà fait À LA MAIN par l'utilisateur reste prioritaire —
    // jamais écrasé par ce rafraîchissement (juste l'image/le nom qui a
    // changé). _anNumberTouched (pas juste "prevValue existe encore") :
    // "—" a lui-même la valeur "" — sans ce indicateur à part, un menu
    // encore jamais touché (donc valant "" par défaut) se confondait à tort
    // avec "l'utilisateur a déjà choisi — volontairement", et écrasait le
    // numéro pourtant déjà correct de l'appareil dès la toute première
    // ouverture d'une session fraîche.
    selEl.value = prevValue;
  } else if (ownNumber !== null) {
    // L'appareil édité a déjà un numéro cohérent avec la série : le garder,
    // jamais le remplacer par le 1er numéro libre des AUTRES appareils.
    selEl.value = _formatGroupNumber(ownNumber, width);
  } else {
    // Rien de déjà numéroté ici : si le nom tapé ressemble à la base établie
    // par les voisins, propose tout de suite le 1er numéro libre plutôt que
    // de forcer un choix manuel pour un cas déjà évident ; sinon, "—".
    const looksLikeSeries = establishedBase && typedName.startsWith(establishedBase);
    selEl.value = looksLikeSeries ? (_formatGroupNumber(allNums[0], width) || '') : '';
  }

  if (hintEl) {
    hintEl.style.display = siblingNames.length ? 'block' : 'none';
    if (siblingNames.length) hintEl.textContent = t('img_group_used_by') + ' ' + siblingNames.join(', ');
  }
}

// Création/modification finale d'un appareil, une fois le numéro (#an-number)
// éventuellement accolé au nom — reprend exactement ce que faisait autrefois
// le handler an-confirm après la case __custom__, juste avec un nom reçu en
// paramètre plutôt que relu sur #an-name.
function _anFinalizeConfirm(name, short, cat) {
  // Apprendre la marque si inconnue
  learnBrand(name, cat);

  // Mode modification : ne rien ajouter (ni canevas ni bibliothèque), juste
  // appliquer les changements à CET appareil, en un seul pas d'annulation.
  if (_anEditNodeId) {
    _applyEditToNode(_anEditNodeId, { name, short, cat });
    _anEditNodeId = null;
    document.getElementById('modal-add-node').classList.remove('open');
    return;
  }

  try {
    // #an-prev-img affiche déjà _anImgData au moment où ce bouton est cliquable
    // (voir _renderAddDevicePreview) : ses dimensions naturelles sont donc fiables ici.
    const _prevImg = document.getElementById('an-prev-img');
    const { w: _iw, h: _ih } = _computeImportSize(_prevImg?.naturalWidth, _prevImg?.naturalHeight);
    const eq = {
      id:           'custom-' + uuid(),
      name,
      short:        short || smartShortName(name) || name,
      cat,
      img:          _anImgData || null,
      img_original: _rmbgOriginal || null,
      rmbg_tol:     +document.getElementById('rmbg-tol').value,
      rmbg_crop:    _cropRectAsFractions(),
      ports:        _anPorts.map(p => ({ id: p.id, nx: p.nx, ny: p.ny, type: p.type, dual: p.dual || false, label: p.label || null })),
      shape:        _currentShape || null,
      shapeColor:   _currentShape ? _currentShapeColor : null,
      w: _iw, h: _ih,
      // Cadre du contenu visible, calculé sur les pixels opaques de l'image finale
      // (voir _alphaBBFromCanvas) plutôt qu'une valeur fixe : c'est ce rectangle qui
      // sert d'obstacle au routage et au contournement d'un segment déplacé.
      bb: (_currentShape ? null : _lastAppliedBB) || { left: 0, right: 1, top: 0, bottom: 1 },
      bbAuto: true,
      stub: null,
    };

    EQUIPMENT_LIBRARY.push(eq);
    _saveUserLibrary(); // persistance immédiate

    const { x, y } = findFreePosition(eq.w, eq.h);
    const nid = createNode(eq, x, y);
    wLog('NODE_ADD', { id: nid, name, cat });
    _autoNumberUnnumberedSiblings(nid);
    centerOnNode(nid);

    document.getElementById('modal-add-node').classList.remove('open');
    updateHeaderStats();
    renderSidebarCats();
  } catch(err) {
    alert('Error placing device: ' + err.message);
    console.error(err);
  }
}

// Applique en UNE fois (un seul pas d'annulation) tout ce que la modale de
// modification peut changer sur un appareil existant. Même traitement des ports que
// l'Image Setup ouvert seul (cf. rmbg-apply) : un port dont le mode simple/double
// change, ou qui disparaît, rend ambiguë l'appartenance des câbles qui y sont
// attachés → ceux-ci sont éjectés (rendus orphelins, jamais supprimés).
function _applyEditToNode(sid, { name, short, cat }) {
  const node = APP.nodes[sid];
  if (!node) return;
  const catAvant = node.cat; // pour ne proposer la propagation qu'en cas de changement réel
  pushUndo();

  const oldPorts = node.ports || [];
  const invalidatedPortIds = new Set();
  for (const newP of _anPorts) {
    const oldP = oldPorts.find(op => op.id === newP.id);
    if (oldP && !!oldP.dual !== !!newP.dual) invalidatedPortIds.add(newP.id);
  }
  for (const oldP of oldPorts) {
    if (!_anPorts.some(np => np.id === oldP.id)) invalidatedPortIds.add(oldP.id);
  }

  node.name  = name;
  node.short = short || smartShortName(name) || name;
  node.cat   = cat;
  node._nameEd = true;
  node._shortEd = true;
  node.img          = _anImgData || null;
  node.img_original = _rmbgOriginal || null;
  node.ports        = _anPorts.map(p => ({ id: p.id, nx: p.nx, ny: p.ny, type: p.type, dual: p.dual || false, label: p.label || null }));
  node.shape        = _currentShape || null;
  node.shapeColor   = _currentShape ? _currentShapeColor : null;
  // Tolérance de détourage : seulement si l'Image Setup a été ouvert pendant cette
  // modification — sinon le curseur affiche encore la valeur d'un autre appareil.
  if (document.getElementById('modal-remove-bg')?.dataset.usedForEdit === sid) {
    node.rmbg_tol = +document.getElementById('rmbg-tol').value;
    node.rmbg_crop = _cropRectAsFractions();
  }

  if (invalidatedPortIds.size) {
    for (const cc of (APP.cables || [])) {
      if (cc.from === sid && invalidatedPortIds.has(cc.from_port)) _orphanCableEnd(cc, 'from');
      if (cc.to   === sid && invalidatedPortIds.has(cc.to_port))   _orphanCableEnd(cc, 'to');
    }
  }

  wLog('NODE_EDIT', { id: sid, name, cat });
  renderOneNode(sid);
  _autoNumberUnnumberedSiblings(sid);
  _patchCablesForPortMove(sid);
  rebuildCM();
  renderCables();
  // renderCables() redessine TOUS les câbles à neuf, sans l'estompage "ne
  // montrer que les câbles de cet appareil" — sans ce ré-appel, les câbles
  // sans lien avec sid redevenaient visibles après validation. selectNode()
  // sort tôt si APP.sel === id déjà (cas normal ici, on édite l'appareil
  // sélectionné) : on le vide d'abord pour forcer un vrai recalcul avec la
  // table de connexions fraîche (rebuildCM() vient de la reconstruire).
  if (typeof selectNode === 'function') { APP.sel = null; selectNode(sid); }
  updateHeaderStats();
  renderSidebarCats();
  if (typeof refreshSidebar === 'function') refreshSidebar();
  setDirty();
  if (typeof openInfoPanel === 'function') openInfoPanel(sid);

  // Catégorie modifiée : proposer d'étendre aux exemplaires identiques. Lancé
  // sans attendre — la fenêtre de modification est déjà refermée et l'appareil
  // déjà à jour, la question ne porte que sur les autres. Sans `await` non plus
  // parce que cette fonction est synchrone et appelée depuis des gestionnaires
  // qui ne l'attendent pas.
  // ⚠️ Pas de pushUndo() là-dedans : celui posé en tête de _applyEditToNode
  // couvre déjà toute l'opération, frères compris — un seul Ctrl+Z les défait.
  if (cat !== catAvant) void _propagateCatToSiblings(sid, cat);
}

function _showBgBtn() {
  const btn = document.getElementById('an-remove-bg');
  btn.style.display = 'flex';
  btn.disabled = false;
  btn.textContent = '✂ Remove background';
  btn.style.borderColor = '';
  btn.style.color = '';
}
function _hideBgBtn() {
  document.getElementById('an-remove-bg').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════════
// MODAL REMOVE BACKGROUND
// ═══════════════════════════════════════════════════════════════
let _rmbgOriginal   = null;
let _rmbgResult     = null;
let _rmbgCanvas     = null;   // canvas brut du dernier rendu BG
let _rmbgRafId      = null;
let _rmbgEditNodeId = null;   // si défini : on édite un nœud existant
let _rmbgAppPath  = localStorage.getItem('wires-ext-editor') || '';

// Crop state — coordonnées en pixels image réelle
// Recadrage courant en fractions (0..1) de l'image d'origine, prêt à être
// enregistré sur un appareil. Même convention que les positions de ports et le
// cadre `bb` : indépendant des dimensions réelles, donc valable même si l'image
// est un jour ré-encodée à une autre taille.
function _cropRectAsFractions() {
  if (!_cropRect || !_imgNatW || !_imgNatH) return null;
  return {
    x: _cropRect.x / _imgNatW, y: _cropRect.y / _imgNatH,
    w: _cropRect.w / _imgNatW, h: _cropRect.h / _imgNatH,
  };
}

let _cropRect        = null;   // { x, y, w, h } dans l'espace image
let _portsImgCropRect = null;  // _cropRect utilisé pour générer l'image courante de portsImg
// Recadrage repris de l'appareil à l'ouverture, en fractions (0..1), consommé
// au premier rendu puis remis à null. null = pas de recadrage enregistré, on
// retombe sur le cadre automatique calculé sur les pixels visibles.
let _pendingCropFrac = null;

// Sécurité anti-régression du correctif de recadrage écrasé par la tolérance (voir
// _runRmbgRender) : window._rmbgCropFreeze = false dans la console repasse à l'ancien
// comportement (le crop est réinitialisé à la bbox auto à chaque rendu, tolérance incluse).
window._rmbgCropFreeze = window._rmbgCropFreeze !== false;
let _imgNatW  = 0;
let _imgNatH  = 0;

// ── Ouvrir Image Setup pour éditer un nœud existant ─────────
function openNodePortsEditor(sid) {
  const node = APP.nodes[sid];
  if (!node) return;
  _rmbgEditNodeId = sid;
  _currentShape      = node.shape || null;
  _currentShapeColor = node.shapeColor || '#6B7280';
  // Utiliser l'original si disponible pour permettre re-crop + re-BG
  const dataUrl = node.img_original || node.img || null;
  if (!dataUrl) {
    _pickImageAndOpenRmbg();
    return;
  }
  _anPorts = (node.ports || []).map(p => ({ ...p }));
  _openRmbgModal(dataUrl);
  // On vient de charger l'image de CET appareil : c'est l'état de référence, pas une
  // modification. (_openRmbgModal lève le drapeau pour couvrir les ré-imports.)
  _rmbgTouched = false;
  _refreshRmbgApplyLabel();
}

function _openRmbgModal(dataUrl) {
  // Toute ouverture charge une image : ré-import, retour de l'éditeur externe ou
  // remplacement comptent comme une modification. Le seul cas contraire est
  // l'ouverture sur l'appareil lui-même, qui remet le drapeau à faux juste après.
  _rmbgTouched  = true;
  _rmbgOriginal = dataUrl;
  _rmbgResult   = null;
  _rmbgCanvas   = null;   // reset pour éviter crop de l'image précédente
  _cropRect     = null;   // reset crop handles
  // Recadrage enregistré sur l'appareil, à restaurer au premier rendu plutôt
  // que de recalculer le cadre automatique — sinon un recadrage ajusté à la
  // main est écrasé à chaque réouverture de la fenêtre.
  // Stocké en fractions (0..1) et non en pixels, comme les positions de ports
  // et le cadre `bb` : indépendant des dimensions réelles de l'image.
  _pendingCropFrac = _rmbgEditNodeId ? (APP.nodes[_rmbgEditNodeId]?.rmbg_crop || null) : null;
  _shapeImgData    = null;
  _portsImgCropRect = null;
  if (_currentShape) _loadShapeImgData(dataUrl);
  // Ports conservés dès qu'on modifie un appareil existant — que ce soit par
  // l'Image Setup seul (double-clic, _rmbgEditNodeId) ou depuis la modale de
  // modification complète (bouton crayon, _anEditNodeId) : leurs id doivent
  // survivre à un changement d'image ou de forme, sinon tous les câbles branchés
  // dessus seraient cassés. Reset seulement lors d'une vraie création.
  if (!_rmbgEditNodeId && !_anEditNodeId) _anPorts = [];

  // Afficher/masquer section couleur de forme
  const colorSection = document.getElementById('rmbg-shape-color');
  if (colorSection) {
    colorSection.style.display = _currentShape ? '' : 'none';
    if (_currentShape) _syncShapeSwatches(_currentShapeColor);
  }

  // Afficher l'original
  document.getElementById('rmbg-orig-img').src = dataUrl;
  document.getElementById('rmbg-prev-img').src = '';
  document.getElementById('rmbg-status').textContent = '';

  // Zone ports — afficher l'image originale en attendant le rendu BG
  const portsImg = document.getElementById('rmbg-ports-img');
  portsImg.src = dataUrl;
  document.getElementById('rmbg-ports-zone').querySelectorAll('.pdot').forEach(d => d.remove());
  document.getElementById('rmbg-ports-list').innerHTML = '';
  const req = document.getElementById('rmbg-ports-required');
  if (req) req.style.display = '';

  // Restaurer le chemin éditeur externe mémorisé
  document.getElementById('rmbg-app-path').value = _rmbgAppPath;

  // Tolérance : priorité node > localStorage global > 38
  const _nodeTol = _rmbgEditNodeId ? (APP.nodes[_rmbgEditNodeId]?.rmbg_tol ?? null) : null;
  _setSlider('rmbg-tol', _nodeTol !== null ? _nodeTol : +(localStorage.getItem('wires-tol') ?? 19));
  // Référence pour _rmbgStateDiffers : ce que le curseur affiche MAINTENANT,
  // quelle que soit l'origine de cette valeur. Posée après _setSlider, jamais
  // avant, sinon on mémoriserait la valeur de l'appareil précédent.
  _rmbgTolAtOpen = +document.getElementById('rmbg-tol').value;

  // Apply désactivé jusqu'à ≥1 port
  _updateConfirmBtn();

  document.getElementById('modal-remove-bg').classList.add('open');

  // Attacher les listeners de zone (frais à chaque ouverture)
  const zone = document.getElementById('rmbg-ports-zone');
  const newZone = zone.cloneNode(true); // clone sans listeners
  zone.parentNode.replaceChild(newZone, zone);
  document.getElementById('rmbg-ports-zone').style.cursor = 'crosshair'; // reset curseur (état propre)
  document.getElementById('rmbg-ports-img').src = portsImg.src;
  _observeRmbgPortsZoneResize(newZone); // élément frais à chaque clonage, ré-observer
  _collapseRmbgPortsZone(); // état propre : jamais rouvrir la modale déjà agrandie
  // mousedown (pas juste click) : le mousedown de la zone (ligne plus bas,
  // "ajouter un port") ne fait d'exception que pour .pdot — sans arrêter la
  // propagation ICI, dès ce stade, cliquer le bouton poserait EN PLUS un
  // port fantôme sous le curseur.
  document.getElementById('rmbg-ports-expand').addEventListener('mousedown', e => {
    e.stopPropagation();
    e.preventDefault();
  });
  document.getElementById('rmbg-ports-expand').addEventListener('click', e => {
    e.stopPropagation();
    _toggleRmbgPortsExpand();
  });
  // .onchange= (pas addEventListener) : la case n'est jamais clonée comme la
  // zone, un addEventListener ici s'accumulerait à chaque réouverture de la
  // modale — même raison que .onclick= déjà utilisé pour Align H/V plus bas.
  const gridToggle = document.getElementById('rmbg-grid-toggle');
  gridToggle.checked = false; // état propre à chaque ouverture, jamais hérité d'un autre appareil
  gridToggle.onchange = () => _renderRmbgGridOverlay();
  _renderRmbgGridOverlay();

  _selectedPortIds.clear();
  _isolatedPortId = null;
  _rmbgActivePortListId = null;
  _updateAlignButtons();

  // Curseur : croix là où un clic pose réellement un point de connexion, sens interdit
  // partout ailleurs dans la zone. Celle-ci est plus large que l'image (marges autour),
  // et une forme générique n'occupe qu'une partie de son PNG — dans les deux cas le clic
  // est sans effet, autant que la souris le dise avant d'essayer.
  document.getElementById('rmbg-ports-zone').addEventListener('mousemove', function(e) {
    const zR = this.getBoundingClientRect();
    const r  = _getImgContainRect();
    const nx = (e.clientX - zR.left - r.left) / r.width;
    const ny = (e.clientY - zR.top  - r.top)  / r.height;
    const inImage = nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1;
    const allowed = inImage
      && (!_currentShape || !_shapeImgData || _isInsideShape(nx, ny));
    this.style.cursor = allowed ? 'crosshair' : 'not-allowed';
  });
  document.getElementById('rmbg-ports-zone').addEventListener('mouseleave', function() {
    this.style.cursor = 'crosshair'; // état propre en quittant la zone
  });

  // Mousedown sur fond vide → ajouter un port (clic rapide) ou sélection rectangle (drag)
  document.getElementById('rmbg-ports-zone').addEventListener('mousedown', function(e) {
    if (e.target.classList && e.target.classList.contains('pdot')) return;
    e.preventDefault();

    const _dropWasOpen = [...document.querySelectorAll('.port-type-drop')].some(d => d.style.display === 'block');

    const z = document.getElementById('rmbg-ports-zone');
    const zR = z.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    let isDrag = false;

    const selBox = document.createElement('div');
    selBox.style.cssText = 'position:absolute;border:1px dashed #00d4ff;background:rgba(0,212,255,0.08);pointer-events:none;z-index:30;display:none;';
    z.appendChild(selBox);

    const onMove = ev => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!isDrag && Math.hypot(dx, dy) > 6) isDrag = true;
      if (!isDrag) return;
      const x1 = Math.min(startX, ev.clientX) - zR.left;
      const y1 = Math.min(startY, ev.clientY) - zR.top;
      selBox.style.display = 'block';
      selBox.style.left   = x1 + 'px';
      selBox.style.top    = y1 + 'px';
      selBox.style.width  = Math.abs(dx) + 'px';
      selBox.style.height = Math.abs(dy) + 'px';
    };

    const onUp = ev => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      selBox.remove();

      if (!isDrag) {
        if (_dropWasOpen) return;
        // Une sélection est en cours : ce clic la relâche, il n'ajoute pas de port.
        // Sans ça, il n'existait aucun moyen simple de désélectionner — un clic dans
        // le vide créait un port, et il fallait tracer un rectangle dans une zone
        // sans aucun point. Le clic suivant, plus rien n'étant sélectionné, ajoute un
        // port comme avant.
        if (_selectedPortIds.size) {
          _selectedPortIds.clear();
          _syncPortVisuals();
          _updateAlignButtons();
          return;
        }
        // Clic rapide → ajouter un port
        const r = _getImgContainRect();
        const nx = (ev.clientX - zR.left - r.left) / r.width;
        const ny = (ev.clientY - zR.top  - r.top)  / r.height;
        // Hors de l'image : ne rien faire. La zone de clic est plus grande que l'image
        // (celle-ci est centrée dedans, avec des marges), et les coordonnées étaient
        // ramenées de force dans [0,1] — un clic à côté posait donc un port collé au
        // bord de l'image au lieu d'être sans effet.
        if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return;
        if (_currentShape && !_isInsideShape(nx, ny)) return; // hors de la forme — interdit
        _anPorts.push({ id: Date.now() + '_' + _anPorts.length, nx, ny, type: 'HDMI' });
        _syncPortVisuals();
        _renderPortList(true);
        _updateConfirmBtn();
      } else {
        // Drag → sélection rectangle
        const rx1 = Math.min(startX, ev.clientX) - zR.left;
        const ry1 = Math.min(startY, ev.clientY) - zR.top;
        const rx2 = Math.max(startX, ev.clientX) - zR.left;
        const ry2 = Math.max(startY, ev.clientY) - zR.top;
        const rc = _getImgContainRect();
        if (!e.shiftKey) _selectedPortIds.clear();
        _anPorts.forEach(p => {
          const px = rc.left + p.nx * rc.width;
          const py = rc.top  + p.ny * rc.height;
          if (px >= rx1 && px <= rx2 && py >= ry1 && py <= ry2) {
            _selectedPortIds.add(p.id);
          }
        });
        _syncPortVisuals();
        _updateAlignButtons();
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });

  // Align H / Align V (onclick overwrite to avoid listener accumulation)
  document.getElementById('rmbg-align-h').onclick = () => {
    const sel = _anPorts.filter(p => _selectedPortIds.has(p.id));
    if (sel.length < 2) return;
    const avgNy = sel.reduce((s, p) => s + p.ny, 0) / sel.length;
    sel.forEach(p => { p.ny = avgNy; });
    _selectedPortIds.clear();
    _syncPortVisuals();
    _renderPortList();
    _updateAlignButtons();
  };
  document.getElementById('rmbg-align-v').onclick = () => {
    const sel = _anPorts.filter(p => _selectedPortIds.has(p.id));
    if (sel.length < 2) return;
    const avgNx = sel.reduce((s, p) => s + p.nx, 0) / sel.length;
    sel.forEach(p => { p.nx = avgNx; });
    _selectedPortIds.clear();
    _syncPortVisuals();
    _renderPortList();
    _updateAlignButtons();
  };

  // Lancer un premier rendu
  _scheduleRmbgRender();
}

function _setSlider(id, val) {
  const sl = document.getElementById(id);
  sl.value = val;
  _updateSliderStyle(sl);
  document.getElementById(id + '-val').textContent = val;
}

function _updateSliderStyle(sl) {
  const pct = ((sl.value - sl.min) / (sl.max - sl.min) * 100).toFixed(1) + '%';
  sl.style.setProperty('--pct', pct);
}

function _scheduleRmbgRender() {
  if (_rmbgRafId) cancelAnimationFrame(_rmbgRafId);
  _rmbgRafId = requestAnimationFrame(() => {
    _rmbgRafId = null;
    _runRmbgRender();
  });
}

function _runRmbgRender() {
  // Curseur affiché sur 0-100, mais la distance de couleur réelle de l'algo
  // est doublée : l'ancienne échelle 0-120 (où seul 120, le max, donnait un
  // détourage propre) est ainsi compressée pour que ce même niveau de
  // puissance tombe à 60/100 — et laisse de la marge jusqu'à 100.
  const tol = +document.getElementById('rmbg-tol').value;
  document.getElementById('rmbg-status').textContent = 'Processing...';

  _removeBgCanvas(_rmbgOriginal, tol * 2).then(({ dataUrl, bbox, natW, natH }) => {
    _rmbgResult = dataUrl;
    _imgNatW = natW;
    _imgNatH = natH;

    const img = document.getElementById('rmbg-prev-img');
    img.src = dataUrl;
    img.onload = () => {
      if (!_cropRect || !window._rmbgCropFreeze) {
        if (_pendingCropFrac) {
          // Recadrage enregistré sur l'appareil : il prime sur le cadre
          // automatique. Consommé une seule fois — les rendus suivants (à
          // chaque changement de tolérance) ne doivent plus le réappliquer,
          // sinon un ajustement fait entre-temps serait perdu.
          const c = _pendingCropFrac;
          _pendingCropFrac = null;
          _cropRect = {
            x: Math.round(c.x * natW), y: Math.round(c.y * natH),
            w: Math.round(c.w * natW), h: Math.round(c.h * natH),
          };
        } else {
          _cropRect = { x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h };
        }
      }
      _updateCropOverlay();
      // Mettre à jour portsImg avec le même crop que _cropRect (synchrone via _rmbgCanvas)
      const portsImg = document.getElementById('rmbg-ports-img');
      if (portsImg) {
        portsImg.src = _applyCrop();
        _portsImgCropRect = { ..._cropRect };
        setTimeout(() => { _syncPortVisuals(); _renderPortList(); }, 50);
      }
    };
    document.getElementById('rmbg-status').textContent = `${t('tolerance')} ${tol} · ${t('drag_to_crop')}`;
  });
}

// Convertit coordonnées image → coordonnées DOM sur la preview
function _imgToDom(ix, iy) {
  const img = document.getElementById('rmbg-prev-img');
  const r = img.getBoundingClientRect();
  const pr = document.getElementById('rmbg-preview').getBoundingClientRect();
  const scaleX = r.width  / _imgNatW;
  const scaleY = r.height / _imgNatH;
  return {
    x: (r.left - pr.left) + ix * scaleX,
    y: (r.top  - pr.top)  + iy * scaleY,
    scaleX, scaleY,
    imgLeft: r.left - pr.left,
    imgTop:  r.top  - pr.top,
    imgW: r.width,
    imgH: r.height,
  };
}

function _updateCropOverlay() {
  if (!_cropRect) return;
  const overlay = document.getElementById('crop-overlay');
  overlay.style.display = 'block';

  const { x, y, w, h } = _cropRect;
  const tl = _imgToDom(x, y);
  const br = _imgToDom(x + w, y + h);

  const bx = tl.x, by = tl.y, bw = br.x - tl.x, bh = br.y - tl.y;

  const box = document.getElementById('crop-box');
  box.style.left   = bx + 'px';
  box.style.top    = by + 'px';
  box.style.width  = bw + 'px';
  box.style.height = bh + 'px';

  // Zones sombres
  const pw = tl.imgLeft + tl.imgW; // largeur totale de l'image dans le preview
  const ph = tl.imgTop  + tl.imgH;
  const il = tl.imgLeft, it = tl.imgTop;

  const dt = document.getElementById('crop-dim-top');
  dt.style.cssText    = `left:${il}px;top:${it}px;width:${tl.imgW}px;height:${by - it}px`;
  const db = document.getElementById('crop-dim-bottom');
  db.style.cssText    = `left:${il}px;top:${by + bh}px;width:${tl.imgW}px;height:${ph - (by + bh)}px`;
  const dl = document.getElementById('crop-dim-left');
  dl.style.cssText    = `left:${il}px;top:${by}px;width:${bx - il}px;height:${bh}px`;
  const dr = document.getElementById('crop-dim-right');
  dr.style.cssText    = `left:${bx + bw}px;top:${by}px;width:${pw - (bx + bw)}px;height:${bh}px`;

  _refreshCropFieldsUI();
}

let _rmbgPreviewResizeObserver = null; // voir fin de _initCropDrag()

function _initCropDrag() {
  const box = document.getElementById('crop-box');
  let drag = null;

  const onDown = (e) => {
    e.stopPropagation();
    const handle = e.target.dataset.h;
    const info = _imgToDom(0, 0);
    drag = {
      handle: handle || 'move',
      startX: e.clientX, startY: e.clientY,
      startRect: { ..._cropRect },
      scaleX: info.scaleX, scaleY: info.scaleY,
      imgLeft: info.imgLeft, imgTop: info.imgTop,
      imgW: info.imgW, imgH: info.imgH,
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  };

  const onMove = (e) => {
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / drag.scaleX;
    const dy = (e.clientY - drag.startY) / drag.scaleY;
    let { x, y, w, h } = drag.startRect;
    const MIN = 10;

    switch (drag.handle) {
      case 'move': x += dx; y += dy; break;
      case 'nw':   x += dx; y += dy; w -= dx; h -= dy; break;
      case 'n':               y += dy;          h -= dy; break;
      case 'ne':              y += dy; w += dx; h -= dy; break;
      case 'e':                        w += dx;           break;
      case 'se':               w += dx; h += dy;          break;
      case 's':                         h += dy;          break;
      case 'sw':  x += dx;    w -= dx; h += dy;          break;
      case 'w':   x += dx;    w -= dx;                   break;
    }

    // Contraindre dans les limites de l'image
    if (w < MIN) { if (drag.handle.includes('w')) x = drag.startRect.x + drag.startRect.w - MIN; w = MIN; }
    if (h < MIN) { if (drag.handle.includes('n')) y = drag.startRect.y + drag.startRect.h - MIN; h = MIN; }
    x = Math.max(0, Math.min(x, _imgNatW - w));
    y = Math.max(0, Math.min(y, _imgNatH - h));
    w = Math.min(w, _imgNatW - x);
    h = Math.min(h, _imgNatH - y);

    _cropRect = { x, y, w, h };
    _updateCropOverlay();
  };

  const onUp = () => {
    drag = null;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup',   onUp);
    _commitCropRectChange();
  };

  box.addEventListener('mousedown', onDown);
  box.querySelectorAll('.crop-handle').forEach(h => h.addEventListener('mousedown', onDown));

  // Bouton d'agrandissement de la preview + resize live du cadre de
  // recadrage — configuration unique (comme le drag ci-dessus), l'élément
  // n'est jamais recloné à la réouverture de la modale.
  const expBtn = document.getElementById('rmbg-crop-expand');
  if (expBtn) {
    expBtn.onmousedown = e => { e.stopPropagation(); e.preventDefault(); };
    expBtn.onclick     = e => { e.stopPropagation(); _toggleRmbgCropExpand(); };
  }
  const preview = document.getElementById('rmbg-preview');
  if (preview && !_rmbgPreviewResizeObserver) {
    _rmbgPreviewResizeObserver = new ResizeObserver(() => _updateCropOverlay());
    _rmbgPreviewResizeObserver.observe(preview);
  }
}

// Remap ports + actualiser portsImg avec le _cropRect courant — appelé à la
// fin d'un drag de poignée ET à la validation d'un champ numérique (vue
// agrandie) : même geste "je fige ce recadrage", deux façons d'y arriver.
function _commitCropRectChange() {
  const portsImg = document.getElementById('rmbg-ports-img');
  if (!portsImg || !_portsImgCropRect) return;
  const oldR = _portsImgCropRect;
  const newR = _cropRect;
  _anPorts = _anPorts.map(p => ({
    ...p,
    nx: Math.max(0, Math.min(1, (oldR.x + p.nx * oldR.w - newR.x) / newR.w)),
    ny: Math.max(0, Math.min(1, (oldR.y + p.ny * oldR.h - newR.y) / newR.h)),
  }));
  portsImg.src = _applyCrop();
  _portsImgCropRect = { ..._cropRect };
  _rmbgTouched = true;   // le recadrage ne se voit pas dans la liste des ports
  _syncPortVisuals();
}

function _syncShapeSwatches(color, container) {
  const root = container || document.getElementById('rmbg-shape-color');
  if (!root) return;
  root.querySelectorAll('.shape-swatch').forEach(btn => {
    const active = btn.dataset.color === color;
    btn.style.border = active ? '2px solid #fff' : '2px solid transparent';
    btn.style.boxShadow = active ? '0 0 0 1px ' + btn.dataset.color : 'none';
  });
  const picker = root.querySelector('input[type="color"]');
  if (picker && !root.querySelectorAll('.shape-swatch[data-color="' + color + '"]').length) {
    picker.value = color;
  }
}

function _applyShapeColor(color) {
  _currentShapeColor = color;
  if (!_currentShape) return;
  const png  = _generateShapePng(_currentShape, null, _currentShapeColor);
  _rmbgOriginal = png;
  _anImgData    = png;
  document.getElementById('rmbg-ports-img').src = png;
  document.getElementById('rmbg-orig-img').src  = png; // pour que _applyCrop() lise la bonne couleur
  _loadShapeImgData(png);
  _syncShapeSwatches(color);
  _refreshRmbgApplyLabel();
}

function _initRmbgModal() {
  // S'assurer que la popup est fermée au démarrage
  document.getElementById('modal-remove-bg').classList.remove('open');

  // Ctrl+Z dans le modal → annuler le dernier port ajouté
  document.addEventListener('keydown', e => {
    if (!((e.ctrlKey || e.metaKey) && e.key === 'z')) return;
    if (!document.getElementById('modal-remove-bg').classList.contains('open')) return;
    if (!_anPorts.length) return;
    e.preventDefault();
    e.stopPropagation();
    const last = _anPorts[_anPorts.length - 1];
    _anPorts.pop();
    _selectedPortIds.delete(last.id);
    _syncPortVisuals();
    _renderPortList();
    _updateConfirmBtn();
    _updateAlignButtons();
  });

  // Slider tolerance live
  const tolSl = document.getElementById('rmbg-tol');
  tolSl.addEventListener('input', () => {
    document.getElementById('rmbg-tol-val').textContent = tolSl.value;
    _updateSliderStyle(tolSl);
    localStorage.setItem('wires-tol', tolSl.value);
    _scheduleRmbgRender();
    _refreshRmbgApplyLabel();
  });

  // Cancel
  ['rmbg-cancel','rmbg-cancel2'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
      document.getElementById('modal-remove-bg').classList.remove('open');
      document.getElementById('crop-overlay').style.display = 'none';
      _rmbgEditNodeId = null;
    });
  });

  // Init drag crop (une seule fois)
  _initCropDrag();

  // Le listener de clic est attaché dans _openRmbgModal (pas ici)

  // Apply — crop synchrone + fermer popup → retour au modal Add Device
  document.getElementById('rmbg-apply').addEventListener('click', () => {
    try {
    // Pour les formes génériques, _rmbgOriginal est toujours le PNG à jour (couleur comprise).
    // _applyCrop() lirait rmbg-orig-img de façon synchrone avant son chargement async.
    _anImgData = _currentShape ? _rmbgOriginal : _applyCrop();

    // Ouvert DEPUIS la modale de modification (bouton crayon) : ne rien appliquer
    // ici — l'image/les ports restent en attente et c'est « Appliquer » de cette
    // modale qui valide tout d'un coup, en un seul pas d'annulation. Sans ça, on
    // aurait deux pushUndo() séparés pour ce qui est une seule action de l'utilisateur.
    if (_anEditNodeId) {
      _renderAddDevicePreview();
      const rm = document.getElementById('modal-remove-bg');
      rm.dataset.usedForEdit = _anEditNodeId; // la tolérance du curseur concerne bien CET appareil
      rm.classList.remove('open');
      document.getElementById('crop-overlay').style.display = 'none';
      return;
    }

    if (_rmbgEditNodeId) {
      // Mode édition : mettre à jour le nœud directement
      const node = APP.nodes[_rmbgEditNodeId];
      if (node) {
        // Rien n'a changé (le bouton affiche alors « Fermer ») : on referme sans rien
        // toucher. Pas d'instantané d'annulation, donc pas d'étape vide dans le Ctrl+Z
        // ni de projet marqué comme modifié, et l'image n'est pas réécrite.
        if (!_rmbgStateDiffers(node)) {
          _rmbgEditNodeId = null;
          document.getElementById('crop-overlay').style.display = 'none';
          return;   // le finally referme la fenêtre
        }
        pushUndo();

        // Ports dont le flag "double" (dual) change dans un sens ou l'autre, OU
        // qui ont été supprimés purement et simplement : l'appartenance (in/out)
        // des câbles déjà attachés devient ambiguë (bascule dual) ou carrément
        // invalide (port supprimé) → on les éjecte (jamais supprimés, juste
        // orphelins, prêts à être rattachés). Comparé AVANT d'écraser node.ports.
        // Sans le second cas (port supprimé), un câble y restant attaché gardait
        // silencieusement son tracé figé sans jamais être signalé orphelin.
        const oldPorts = node.ports || [];
        const invalidatedPortIds = new Set();
        for (const newP of _anPorts) {
          const oldP = oldPorts.find(op => op.id === newP.id);
          if (oldP && !!oldP.dual !== !!newP.dual) invalidatedPortIds.add(newP.id);
        }
        for (const oldP of oldPorts) {
          if (!_anPorts.some(np => np.id === oldP.id)) invalidatedPortIds.add(oldP.id);
        }

        node.img          = _anImgData;
        node.img_original = _rmbgOriginal;
        node.rmbg_tol     = +document.getElementById('rmbg-tol').value;
        node.rmbg_crop    = _cropRectAsFractions();
        node.ports        = _anPorts.map(p => ({ ...p }));
        if (_currentShape) { node.shape = _currentShape; node.shapeColor = _currentShapeColor; }
        // Cadre du contenu visible (obstacle pour le routage/contournement) recalculé
        // à partir des pixels opaques de l'image finale — une forme générique remplit
        // son PNG par construction, donc cadre plein.
        node.bb = _currentShape
          ? { left: 0, right: 1, top: 0, bottom: 1 }
          : (_lastAppliedBB || node.bb);
        node.bbAuto = true; // déjà calculé sur les pixels — pas de migration au chargement


        const nid = _rmbgEditNodeId;
        if (invalidatedPortIds.size) {
          for (const cc of (APP.cables || [])) {
            if (cc.from === nid && invalidatedPortIds.has(cc.from_port)) _orphanCableEnd(cc, 'from');
            if (cc.to   === nid && invalidatedPortIds.has(cc.to_port))   _orphanCableEnd(cc, 'to');
          }
        }

        // Mettre à jour les câbles connectés : patcher en place (ancre + stub
        // adjacent uniquement, cf. _patchCablesForPortMove dans cables.js) plutôt
        // qu'invalider tout le tracé — un port déplacé de quelques pixels ne doit
        // décaler QUE son extrémité, pas redéclencher un recalcul BFS complet qui
        // peut reprendre une route entièrement différente. Câbles déjà éjectés
        // ci-dessus (from/to=null) : ignorés naturellement (condition sur from/to).
        _patchCablesForPortMove(nid);

        renderOneNode(_rmbgEditNodeId);
        rebuildCM();
        renderCables();
        setDirty();
      }
      _rmbgEditNodeId = null;
    } else {
      // Mode création : image/ports configurés → dernière étape, la modale
      // Ajouter un appareil (nom/catégorie), pas encore ouverte à ce stade.
      _renderAddDevicePreview();
      _openAddNodeModalUI();
    }
    } catch(e) { console.error('rmbg-apply error:', e); }
    finally { document.getElementById('modal-remove-bg').classList.remove('open'); }
  });

  // Browse éditeur externe
  document.getElementById('rmbg-browse').addEventListener('click', async () => {
    if (!window.electronAPI) return;
    const p = await window.electronAPI.pickExe();
    if (p) {
      document.getElementById('rmbg-app-path').value = p;
      _rmbgAppPath = p;
      localStorage.setItem('wires-ext-editor', p);
    }
  });

  // Remplacer l'image — ouvre la mini-dialog de choix image/forme
  document.getElementById('rmbg-replace').addEventListener('click', () => {
    // Rouverture imbriquée, en cours de configuration d'un vrai appareil —
    // jamais pertinent d'y proposer de restaurer l'icône Internet à la place.
    document.getElementById('pick-image-restore-internet').style.display = 'none';
    document.getElementById('modal-pick-image').classList.add('open');
  });

  // Mini-dialog pick-image : fermeture
  document.getElementById('pick-image-cancel').addEventListener('click', () => {
    document.getElementById('modal-pick-image').classList.remove('open');
  });

  // Restaure l'icône Internet directement depuis ce tout premier écran —
  // sans ça il faudrait traverser choix d'image + Configuration image pour
  // atteindre l'ancienne option au fond du menu Catégorie de la dernière étape.
  document.getElementById('pick-image-restore-internet-btn').addEventListener('click', () => {
    document.getElementById('modal-pick-image').classList.remove('open');
    restoreInternetNode();
  });

  // Mini-dialog : importer une image — dialogue natif Electron (pick-image-dialog)
  // au lieu d'un <input type="file"> HTML, pour que le dossier de départ soit
  // mémorisé séparément de celui des projets .wires (voir main.js, lastImageDir).
  document.getElementById('pick-image-import').addEventListener('click', async () => {
    const dataUrl = await window.electronAPI.pickImage();
    if (!dataUrl) return; // dialogue annulé
    _acceptPickedImage(dataUrl);
  });

  // Mini-dialog : rechercher l'image en ligne — même aboutissement que l'import
  // local (un dataUrl remis à _acceptPickedImage), seule la provenance change.
  document.getElementById('pick-image-search').addEventListener('click', async () => {
    const choix = await _openDeviceSearch();
    if (!choix) return; // fenêtre fermée sans choisir
    _acceptPickedImage(choix.dataUrl, choix.produit);
  });

  // Aboutissement commun à l'import local et à la recherche en ligne : une image
  // a été choisie, quelle que soit sa provenance. Extrait de #pick-image-import
  // pour que les deux chemins ne puissent pas diverger.
  function _acceptPickedImage(dataUrl, produit) {
    // Le nom ne sert qu'à la DERNIÈRE étape (#modal-add-node), qui n'arrive
    // qu'après Configuration image : il faut donc le mettre de côté ici et le
    // relire là-bas. Toujours réécrit — un import local ou une forme passent
    // sans produit et doivent effacer celui d'une recherche précédente, sinon
    // le nom d'un appareil trouvé en ligne se collerait à l'image suivante.
    _searchProduct = produit || null;
    document.getElementById('modal-pick-image').classList.remove('open');
    _currentShape = null; // image réelle → plus de forme générique (voir _pickImageAndOpenRmbg)
    _rmbgTempPath = null;
    document.getElementById('rmbg-reimport').disabled = true;
    document.getElementById('rmbg-reimport').style.opacity = '0.35';
    document.getElementById('rmbg-status').textContent = '';
    _openRmbgModal(dataUrl);
  }

  // Ouvre la fenêtre de recherche et résout avec le dataUrl de l'image choisie,
  // ou null si elle est refermée sans choix. C'est TOUT le contrat avec Search
  // Images : le jour de l'intégration, seul le contenu de #search-images-root
  // change — ni cette signature, ni _acceptPickedImage, ni la suite du flux.
  function _openDeviceSearch() {
    return new Promise(resolve => {
      const modal = document.getElementById('modal-device-search');
      const pick  = document.getElementById('modal-pick-image');
      const root  = document.getElementById('search-images-root');
      const close = document.getElementById('device-search-cancel');
      let settled = false;

      const finish = (dataUrl, produit) => {
        if (settled) return; // ✕ puis choix (ou l'inverse) ne doit résoudre qu'une fois
        settled = true;
        close.removeEventListener('click', onCancel);
        // Démonter AVANT de vider : c'est le démontage React qui arrête la
        // relecture des images toutes les 10 s, les écouteurs clavier et les
        // abonnements IPC. Vider le conteneur sans démonter les laisserait
        // tourner dans Wires longtemps après la fermeture.
        try { window.SearchImages?.unmount(root); } catch (e) { console.error('[wires] démontage recherche :', e); }
        modal.classList.remove('open');
        root.innerHTML = ''; // le contenu est reconstruit à chaque ouverture
        // Annulation : l'écran de choix d'image reprend la main, sinon on
        // sortirait du flux d'ajout d'appareil et il faudrait tout reprendre
        // depuis + → Nouvel appareil. Image choisie : c'est _acceptPickedImage
        // qui le referme, il doit rester masqué ici.
        if (!dataUrl) pick.classList.add('open');
        resolve(dataUrl ? { dataUrl, produit: produit || null } : null);
      };
      const onCancel = () => finish(null);

      close.addEventListener('click', onCancel);
      root.innerHTML = '';
      // Search Images publie window.SearchImages au chargement de son bundle.
      // Absent = bundle non compilé (voir `npm run build:search`) : on affiche
      // le repli plutôt que de laisser un écran vide sans explication.
      if (window.SearchImages) {
        window.SearchImages.mount(root, {
          lang: typeof getLang === 'function' ? getLang() : 'en',
          // Second argument : { brand?, model? }, jamais une chaîne assemblée.
          // C'est Wires qui compose le nom complet et le nom court.
          onPick: (dataUrl, produit) => finish(dataUrl, produit),
          onCancel,
        });
      } else {
        root.appendChild(_buildSearchPlaceholder(finish));
      }
      // Masqué, pas fermé : entièrement recouvert de toute façon, et deux voiles
      // sombres empilés s'assombrissent l'un l'autre.
      pick.classList.remove('open');
      modal.classList.add('open');
    });
  }

  // Contenu PROVISOIRE de la fenêtre de recherche, remplacé intégralement par le
  // renderer de Search Images le jour de l'intégration. Le bouton de test sert
  // uniquement à vérifier dès maintenant que la chaîne complète fonctionne
  // (choix → Configuration image → nom), avant que Search n'existe côté Wires.
  function _buildSearchPlaceholder(finish) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:32px;text-align:center';

    const msg = document.createElement('div');
    msg.style.cssText = 'font-family:var(--mono);font-size:13px;color:var(--textdim);letter-spacing:1px;max-width:520px;line-height:1.7';
    msg.textContent = t('device_search_placeholder');

    const btn = document.createElement('button');
    btn.className = 'rm-bg-btn';
    btn.style.cssText = 'width:auto;padding:8px 18px';
    btn.textContent = t('device_search_test_pick');
    btn.addEventListener('click', async () => {
      const dataUrl = await window.electronAPI.pickImage();
      if (dataUrl) finish(dataUrl);
    });

    wrap.append(msg, btn);
    return wrap;
  }

  // Formes génériques → génère PNG et ouvre Image Setup directement
  document.querySelectorAll('.pick-shape-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('modal-pick-image').classList.remove('open');
      const shape = btn.dataset.shape;
      _currentShape = shape;
      _currentShapeColor = '#6B7280'; // reset couleur par défaut à chaque nouvelle forme
      // Forme générée → un fichier temp d'édition externe d'une précédente photo
      // devient sans rapport (voir #pick-image-import, même logique de reset).
      _rmbgTempPath = null;
      document.getElementById('rmbg-reimport').disabled = true;
      document.getElementById('rmbg-reimport').style.opacity = '0.35';
      document.getElementById('rmbg-status').textContent = '';
      const dataUrl = _generateShapePng(shape, null, _currentShapeColor);
      _openRmbgModal(dataUrl);
    });
  });

  // Convertit n'importe quel dataUrl en PNG via canvas
  function _asPngDataUrl(dataUrl) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve(c.toDataURL('image/png'));
      };
      img.src = dataUrl;
    });
  }

  // Open with external editor
  let _rmbgTempPath = null;
  document.getElementById('rmbg-open-ext').addEventListener('click', async () => {
    if (!_rmbgOriginal) return;
    const appPath = document.getElementById('rmbg-app-path').value.trim() || null;
    _rmbgAppPath = appPath || '';
    if (appPath) localStorage.setItem('wires-ext-editor', appPath);
    const status    = document.getElementById('rmbg-status');
    const reimportBtn = document.getElementById('rmbg-reimport');
    status.textContent = 'Opening in external editor...';
    if (window.electronAPI) {
      const pngUrl = await _asPngDataUrl(_rmbgOriginal);
      _rmbgTempPath = await window.electronAPI.openWithApp(appPath, pngUrl);
      status.textContent = 'File opened — save in your editor, then click Re-import.';
      reimportBtn.disabled = false;
      reimportBtn.style.opacity = '1';
    }
  });

  function _imgDims(dataUrl) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  // Re-import depuis le fichier temp
  document.getElementById('rmbg-reimport').addEventListener('click', async () => {
    if (!_rmbgTempPath || !window.electronAPI) return;
    const status = document.getElementById('rmbg-status');
    status.textContent = 'Reading file...';
    try {
      const b64 = await window.electronAPI.readFileB64(_rmbgTempPath);
      if (!b64) { status.textContent = 'File not found — save in your editor first.'; return; }
      const newUrl = `data:image/png;base64,${b64}`;

      const [oldDims, newDims] = await Promise.all([_imgDims(_rmbgOriginal), _imgDims(newUrl)]);
      if (oldDims && newDims && (oldDims.w !== newDims.w || oldDims.h !== newDims.h)) {
        const msg = `Canvas size changed: ${oldDims.w}×${oldDims.h} → ${newDims.w}×${newDims.h}.\n\nConnection points are stored as relative positions and may no longer align with the device's physical connectors.\n\nClick OK to continue — you will need to reposition the port dots manually.`;
        if (!await showConfirm(msg)) return;
      }

      _rmbgOriginal = newUrl;
      status.textContent = 'Re-imported — processing...';
      _runRmbgRender();
    } catch(e) {
      status.textContent = 'Re-import failed: ' + e.message;
    }
  });

  // Mémoriser chemin éditeur à la saisie
  document.getElementById('rmbg-app-path').addEventListener('change', e => {
    _rmbgAppPath = e.target.value.trim();
    if (_rmbgAppPath) localStorage.setItem('wires-ext-editor', _rmbgAppPath);
  });

  // Sélecteur couleur forme (swatches + roue)
  const colorSection = document.getElementById('rmbg-shape-color');
  colorSection.querySelectorAll('.shape-swatch').forEach(btn => {
    btn.addEventListener('click', () => _applyShapeColor(btn.dataset.color));
  });
  const colorPicker = document.getElementById('rmbg-shape-color-picker');
  colorPicker.addEventListener('input', () => _applyShapeColor(colorPicker.value));
  colorSection.querySelector('label').addEventListener('click', () => colorPicker.click());
}

// ── Algorithme suppression fond (canvas) — retourne dataUrl + bbox ──
function _removeBgCanvas(dataUrl, tolerance) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const W = img.width, H = img.height;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, W, H);
      const data = imageData.data;

      // Flood fill depuis les 4 bords — supprime uniquement les pixels contigus au contour
      const visited = new Uint8Array(W * H);
      const queue = [];

      const colorDist = (i, r, g, b) => {
        const dr = data[i] - r, dg = data[i+1] - g, db = data[i+2] - b;
        return Math.sqrt(dr*dr + dg*dg + db*db);
      };

      // Estimer la couleur de fond depuis tout le pourtour (pas seulement les 4
      // coins) et prendre la médiane — un fond studio avec un léger dégradé ou
      // une ombre portée pouvait rendre 4 coins non représentatifs de tout le
      // bord, laissant des zones de fond hors tolérance donc jamais supprimées.
      // Un pixel de bord déjà transparent (marge pré-existante dans le fichier
      // importé) est exclu de l'échantillon : sinon il tire la médiane vers le
      // noir (RGB à 0 sur un pixel transparent), et un vrai fond blanc devient
      // alors à une distance de couleur hors de portée de toute tolérance.
      const edgeR = [], edgeG = [], edgeB = [];
      const sampleEdge = i => {
        if (data[i+3] === 0) return;
        edgeR.push(data[i]); edgeG.push(data[i+1]); edgeB.push(data[i+2]);
      };
      for (let x = 0; x < W; x++) {
        sampleEdge(x*4);
        sampleEdge(((H-1)*W+x)*4);
      }
      for (let y = 1; y < H-1; y++) {
        sampleEdge((y*W)*4);
        sampleEdge((y*W+(W-1))*4);
      }
      const median = arr => { const s = arr.slice().sort((a,b)=>a-b); return s[Math.floor(s.length/2)]; };
      const bgR = edgeR.length ? median(edgeR) : 255;
      const bgG = edgeG.length ? median(edgeG) : 255;
      const bgB = edgeB.length ? median(edgeB) : 255;

      // Amorcer la file avec tous les pixels de bord qui ressemblent au fond
      const enqueue = (x, y) => {
        const idx = y * W + x;
        if (visited[idx]) return;
        const i = idx * 4;
        if (data[i+3] === 0 || colorDist(i, bgR, bgG, bgB) < tolerance) {
          visited[idx] = 1;
          queue.push(idx);
        }
      };
      for (let x = 0; x < W; x++) { enqueue(x, 0); enqueue(x, H-1); }
      for (let y = 1; y < H-1; y++) { enqueue(0, y); enqueue(W-1, y); }

      // BFS
      let qi = 0;
      while (qi < queue.length) {
        const idx = queue[qi++];
        data[idx*4+3] = 0;  // rendre transparent
        const x = idx % W, y = Math.floor(idx / W);
        if (x > 0)   enqueue(x-1, y);
        if (x < W-1) enqueue(x+1, y);
        if (y > 0)   enqueue(x, y-1);
        if (y < H-1) enqueue(x, y+1);
      }

      // Fondu sur le contour : les pixels juste à l'extérieur de la zone
      // supprimée reçoivent une transparence progressive au lieu d'un cran
      // net, sur quelques pixels de profondeur — adoucit le contour crénelé
      // et mange le liseré résiduel des pixels d'anti-crénelage de la photo
      // d'origine, sans jamais toucher aux pixels franchement opaques (loin
      // au-delà de tolerance+FEATHER).
      const FEATHER = 40;    // largeur du dégradé, en distance de couleur au-delà de la tolérance
      const FEATHER_PX = 3;  // profondeur du dégradé, en pixels autour du contour
      const inFeather = new Uint8Array(W * H);
      let ring = queue;
      for (let pass = 0; pass < FEATHER_PX && ring.length; pass++) {
        const next = [];
        for (const idx of ring) {
          const x = idx % W, y = Math.floor(idx / W);
          const cand = [];
          if (x > 0)   cand.push(idx - 1);
          if (x < W-1) cand.push(idx + 1);
          if (y > 0)   cand.push(idx - W);
          if (y < H-1) cand.push(idx + W);
          for (const nIdx of cand) {
            if (visited[nIdx] || inFeather[nIdx]) continue;
            const i = nIdx * 4;
            if (data[i+3] === 0) continue;
            const dist = colorDist(i, bgR, bgG, bgB);
            if (dist < tolerance + FEATHER) {
              const factor = Math.max(0, Math.min(1, (dist - tolerance) / FEATHER));
              data[i+3] = Math.round(data[i+3] * factor);
              inFeather[nIdx] = 1;
              next.push(nIdx);
            }
          }
        }
        ring = next;
      }

      ctx.putImageData(imageData, 0, 0);

      // Garder une référence au canvas pour le crop synchrone
      _rmbgCanvas = canvas;

      // Bounding box des pixels visibles
      let minX = W, minY = H, maxX = 0, maxY = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (data[(y * W + x) * 4 + 3] > 0) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      const bbox = (minX <= maxX && minY <= maxY)
        ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
        : { x: 0, y: 0, w: W, h: H };

      resolve({ dataUrl: canvas.toDataURL('image/png'), bbox, natW: W, natH: H });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// ── Crop automatique sur bbox (pour affichage dans zone ports) ──
function _applyCropFromBbox(dataUrl, bbox) {
  return new Promise((resolve, reject) => {
    if (!bbox || !bbox.w || !bbox.h) { resolve(dataUrl); return; }
    const img = new Image();
    img.onload = () => {
      const pad = 6; // quelques pixels de marge
      const x = Math.max(0, bbox.x - pad);
      const y = Math.max(0, bbox.y - pad);
      const w = Math.min(img.width  - x, bbox.w + pad * 2);
      const h = Math.min(img.height - y, bbox.h + pad * 2);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Cadre du contenu réellement opaque d'un canvas, en coordonnées normalisées 0..1.
// Sert à renseigner node.bb, utilisé comme rectangle d'obstacle par le routage
// automatique (getRealBB/routing.js) et par le contournement d'un segment déplacé
// (_computeBypassPts/cables.js) : sans ça, l'obstacle est le PNG entier, bordures
// transparentes comprises, et le câble s'écarte plus que le contour visible.
function _alphaBBFromCanvas(cv) {
  const FULL = { left: 0, right: 1, top: 0, bottom: 1 };
  try {
    const W = cv.width, H = cv.height;
    if (!W || !H) return FULL;
    const d = cv.getContext('2d').getImageData(0, 0, W, H).data;
    let minX = W, minY = H, maxX = -1, maxY = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (d[(y * W + x) * 4 + 3] > 8) { // seuil : ignore les pixels quasi transparents
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX || maxY < minY) return FULL; // image entièrement transparente
    return {
      left:   minX / W,
      right:  (maxX + 1) / W,
      top:    minY / H,
      bottom: (maxY + 1) / H,
    };
  } catch { return FULL; }
}

// Même calcul depuis une image déjà chargée (pas un canvas) — sert à corriger
// automatiquement, une seule fois, les appareils créés avant que ce cadre ne soit
// calculé sur les pixels (voir la migration dans renderOneNode/nodes.js).
function _alphaBBFromImage(imgEl) {
  const FULL = { left: 0, right: 1, top: 0, bottom: 1 };
  const w = imgEl?.naturalWidth, h = imgEl?.naturalHeight;
  if (!w || !h) return FULL;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  cv.getContext('2d').drawImage(imgEl, 0, 0);
  return _alphaBBFromCanvas(cv);
}

// Cadre calculé lors du dernier _applyCrop() — lu ensuite par « Appliquer » (édition
// d'un appareil existant) et par « Placer sur le canevas » (création).
let _lastAppliedBB = null;


// ── Appliquer le crop selon _cropRect — synchrone (canvas en mémoire) ──
function _applyCrop() {
  // Source : canvas BG-removed si dispo, sinon recréer depuis l'original
  const src = _rmbgCanvas || (() => {
    // Fallback : dessiner l'original dans un canvas temporaire
    const img = document.getElementById('rmbg-orig-img');
    const c   = document.createElement('canvas');
    c.width   = img.naturalWidth;
    c.height  = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    return c;
  })();

  if (!_cropRect || !src.width || !src.height) {
    _lastAppliedBB   = _alphaBBFromCanvas(src);
    return src.toDataURL('image/png');
  }

  const { x, y, w, h } = _cropRect;
  const out = document.createElement('canvas');
  out.width  = Math.round(w);
  out.height = Math.round(h);
  out.getContext('2d').drawImage(src, Math.round(x), Math.round(y), Math.round(w), Math.round(h), 0, 0, Math.round(w), Math.round(h));
  _lastAppliedBB   = _alphaBBFromCanvas(out);
  return out.toDataURL('image/png');
}
