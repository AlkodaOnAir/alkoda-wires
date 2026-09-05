/* ═══════════════════════════════════════════════════════════════
   panel.js — Right side info panel
═══════════════════════════════════════════════════════════════ */

function _showSinglePanelMode() {
  const multi = document.getElementById('ip-multi');
  if (multi) multi.style.display = 'none';
  const tlPanel = document.getElementById('ip-textlabel');
  if (tlPanel) tlPanel.style.display = 'none';
  const zPanel = document.getElementById('ip-zone');
  if (zPanel) zPanel.style.display = 'none';
  const hdr = document.querySelector('#info-panel > .ip-header');
  const bdy = document.querySelector('#info-panel > .ip-body');
  if (hdr) hdr.style.display = '';
  if (bdy) bdy.style.display = '';
}

function openTextLabelPanel(id) {
  const tl = APP.textLabels[id];
  if (!tl) return;
  const panel = document.getElementById('info-panel');

  const hdr = document.querySelector('#info-panel > .ip-header');
  const bdy = document.querySelector('#info-panel > .ip-body');
  if (hdr) hdr.style.display = 'none';
  if (bdy) bdy.style.display = 'none';
  const multi = document.getElementById('ip-multi');
  if (multi) multi.style.display = 'none';

  const tlPanel = document.getElementById('ip-textlabel');
  if (!tlPanel) return;
  tlPanel.style.display = 'block';

  const ta = document.getElementById('ip-tl-text');
  if (ta) ta.value = tl.text;
  const sz = document.getElementById('ip-tl-size');
  if (sz) sz.value = tl.fontSize;
  const col = document.getElementById('ip-tl-color');
  if (col) col.value = tl.color;

  document.getElementById('ip-tl-bold')     ?.classList.toggle('active', tl.bold);
  document.getElementById('ip-tl-italic')   ?.classList.toggle('active', tl.italic);
  document.getElementById('ip-tl-underline')?.classList.toggle('active', tl.underline);
  document.getElementById('ip-tl-horiz')    ?.classList.toggle('active', tl.orientation !== 'vertical');
  document.getElementById('ip-tl-vert')     ?.classList.toggle('active', tl.orientation === 'vertical');
  document.getElementById('ip-tl-resize')     ?.classList.toggle('active', !!tl.resizeMode);
  const resetBtn = document.getElementById('ip-tl-reset-size');
  if (resetBtn) resetBtn.disabled = !tl.width;

  // Font select — load system fonts async, then set value
  const fontSel = document.getElementById('ip-tl-font');
  if (fontSel) {
    const currentFont = tl.fontFamily;
    getSystemFonts().then(families => {
      if (!fontSel.options.length || fontSel.dataset.loaded !== '1') {
        fontSel.innerHTML = '<option value="">—</option>';
        families.forEach(f => {
          const opt = document.createElement('option');
          opt.value = f; opt.textContent = f;
          fontSel.appendChild(opt);
        });
        fontSel.dataset.loaded = '1';
      }
      const tlEl = _tlEl(id);
      if (typeof _hasMixedFonts === 'function' && _hasMixedFonts(tlEl)) {
        fontSel.value = '';
      } else {
        fontSel.value = currentFont;
        if (!fontSel.value && fontSel.options.length > 1) {
          fontSel.value = fontSel.options[1].value;
        }
      }
    });
  }

  panel.classList.add('open');
}

function openInfoPanel(sid) {
  _showSinglePanelMode();
  const panel = document.getElementById('info-panel');
  const s = APP.nodes[sid];
  if (!s) return;
  wLog('PANEL_OPEN', { type: 'node', id: sid, name: s.name, cat: s.cat });

  const cat = getCat(s.cat);  // label déjà traduit via t()

  // Corbeille et crayon : masqués par le panneau d'un câble, qui partage cet en-tête.
  // Rétablis ici plutôt que de compter sur un passage par closePanel(), qui n'a pas
  // lieu quand on clique directement un appareil alors qu'un câble est sélectionné.
  document.getElementById('ip-delete-node').style.display = '';
  document.getElementById('ip-edit-node').style.display = '';

  // Category badge — cliquable pour changer la catégorie
  const badge = document.getElementById('ip-badge');
  _refreshBadge(badge, cat);
  badge.dataset.sid = sid;

  // Editable name
  const nameEl = document.getElementById('ip-name');
  nameEl.textContent = s.name;
  nameEl.oninput = () => {
    s.name = nameEl.textContent.trim();
    s._nameEd = true;
    setDirty();
  };

  // Bouton crayon → modale de modification complète de l'appareil (nom, nom court,
  // catégorie, image/forme, ports) — voir openEditNodeModal/library.js
  const editBtn = document.getElementById('ip-edit-node');
  editBtn.title = t('edit_device_title');
  editBtn.onclick = () => { if (typeof openEditNodeModal === 'function') openEditNodeModal(sid); };

  // Image
  const ipImg     = document.getElementById('ip-img');
  const ipImgWrap = document.getElementById('ip-img-wrap');
  if (s.img) {
    ipImg.src = s.img;
    ipImgWrap.style.display = '';
  } else {
    ipImgWrap.style.display = 'none';
  }

  // Shape color section — visible only for shape nodes
  let ipShapeColor = document.getElementById('ip-shape-color');
  if (!ipShapeColor) {
    ipShapeColor = document.createElement('div');
    ipShapeColor.id = 'ip-shape-color';
    ipShapeColor.style.cssText = 'padding:8px 0 4px';
    ipShapeColor.innerHTML = `
      <div style="font-family:var(--mono);font-size:10px;letter-spacing:1px;color:var(--textdim);margin-bottom:6px" data-i18n="shape_color">SHAPE COLOR</div>
      <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
        <button class="shape-swatch" data-color="#6B7280" style="background:#6B7280;width:20px;height:20px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;flex-shrink:0" title="Gray"></button>
        <button class="shape-swatch" data-color="#3B82F6" style="background:#3B82F6;width:20px;height:20px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;flex-shrink:0" title="Blue"></button>
        <button class="shape-swatch" data-color="#10B981" style="background:#10B981;width:20px;height:20px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;flex-shrink:0" title="Green"></button>
        <button class="shape-swatch" data-color="#EF4444" style="background:#EF4444;width:20px;height:20px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;flex-shrink:0" title="Red"></button>
        <button class="shape-swatch" data-color="#F59E0B" style="background:#F59E0B;width:20px;height:20px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;flex-shrink:0" title="Amber"></button>
        <button class="shape-swatch" data-color="#8B5CF6" style="background:#8B5CF6;width:20px;height:20px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;flex-shrink:0" title="Purple"></button>
        <button class="shape-swatch" data-color="#1E293B" style="background:#1E293B;width:20px;height:20px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;flex-shrink:0" title="Slate"></button>
        <label style="width:20px;height:20px;border-radius:50%;background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);cursor:pointer;border:2px solid transparent;flex-shrink:0;display:block" title="Custom color">
          <input type="color" id="ip-shape-color-picker" style="opacity:0;width:0;height:0;position:absolute;pointer-events:none">
        </label>
      </div>`;
    ipImgWrap.insertAdjacentElement('afterend', ipShapeColor);
  }

  if (s.shape) {
    ipShapeColor.style.display = '';
    const currentColor = s.shapeColor || '#6B7280';
    // Sync active swatch
    ipShapeColor.querySelectorAll('.shape-swatch').forEach(btn => {
      const active = btn.dataset.color === currentColor;
      btn.style.border = active ? '2px solid #fff' : '2px solid transparent';
      btn.style.boxShadow = active ? '0 0 0 1px ' + btn.dataset.color : 'none';
    });
    // Wire swatch clicks (re-attach to avoid stale sid)
    ipShapeColor.querySelectorAll('.shape-swatch').forEach(btn => {
      btn.onclick = () => {
        const node = APP.nodes[sid];
        if (!node) return;
        node.shapeColor = btn.dataset.color;
        node.img = typeof _generateShapePng === 'function'
          ? _generateShapePng(node.shape, node.name, node.shapeColor)
          : node.img;
        node.img_original = node.img;
        ipImg.src = node.img;
        ipShapeColor.querySelectorAll('.shape-swatch').forEach(b => {
          const a = b.dataset.color === node.shapeColor;
          b.style.border = a ? '2px solid #fff' : '2px solid transparent';
          b.style.boxShadow = a ? '0 0 0 1px ' + b.dataset.color : 'none';
        });
        renderOneNode(sid);
        setDirty();
      };
    });
    const picker = document.getElementById('ip-shape-color-picker');
    picker.value = currentColor;
    picker.oninput = () => {
      const node = APP.nodes[sid];
      if (!node) return;
      node.shapeColor = picker.value;
      node.img = typeof _generateShapePng === 'function'
        ? _generateShapePng(node.shape, node.name, node.shapeColor)
        : node.img;
      node.img_original = node.img;
      ipImg.src = node.img;
      ipShapeColor.querySelectorAll('.shape-swatch').forEach(b => {
        b.style.border = '2px solid transparent';
        b.style.boxShadow = 'none';
      });
      renderOneNode(sid);
      setDirty();
    };
    ipShapeColor.querySelector('label').onclick = () => picker.click();
  } else {
    ipShapeColor.style.display = 'none';
  }

  // Connections list
  renderConnsList(sid);

  // Add cable button → same flow as toolbar (click ports on canvas)
  document.getElementById('ip-conn-add-btn').onclick = () => {
    closePanel();
    _startCableAddMode();
  };

  // Delete node button
  document.getElementById('ip-delete-node').onclick = () => {
    if (s.cat === 'internet') { deleteInternetNode(sid); return; }
    showConfirm(t('delete_node_confirm').replace('$name', s.name), { danger: true }).then(ok => {
      if (ok) deleteNode(sid);
    });
  };

  panel.classList.add('open');
}

function renderConnsList(sid) {
  const list = document.getElementById('ip-conns-list');
  list.innerHTML = '';

  const conns = CM[sid] || [];
  if (!conns.length) {
    list.innerHTML = `<div style="font-family:var(--mono);font-size:11px;color:var(--textdim);padding:8px 0">${t('no_conn')}</div>`;
    return;
  }

  conns.forEach(conn => {
    const node = APP.nodes[conn.sid];
    if (!node) return;

    const item = document.createElement('div');
    item.className = 'ip-conn-item';
    item.innerHTML = `
      <div class="ip-conn-dot" style="background:${escapeHtml(conn.color)}"></div>
      <div class="ip-conn-name">${escapeHtml(node.short || node.name)}</div>
      <div class="ip-conn-type" style="color:${escapeHtml(conn.color)}">${escapeHtml(tType(conn.type))}</div>
      <button class="ip-conn-del" data-cid="${escapeHtml(conn.cid)}" title="${t('delete_cable_title')}">✕</button>
    `;
    item.querySelector('.ip-conn-del').addEventListener('click', e => {
      e.stopPropagation();
      deleteConn(+e.target.dataset.cid);
    });
    item.addEventListener('click', () => selectNode(conn.sid));
    list.appendChild(item);
  });
}

// ── Unité de longueur de câble — dernier choix persistant, sinon système de la langue ──
const _CABLE_LENGTH_UNIT_KEY = 'wires-cable-length-unit';
function _defaultCableLengthUnit() {
  const stored = localStorage.getItem(_CABLE_LENGTH_UNIT_KEY);
  if (stored) return stored;
  return (typeof getLang === 'function' && getLang() === 'en') ? 'ft' : 'm';
}

function openCablePanel(cid) {
  _showSinglePanelMode();
  const c = APP.cables.find(x => x.id === cid);
  if (!c) return;
  wLog('PANEL_OPEN', { type: 'cable', id: cid, ctype: c.type, from: c.from, to: c.to });

  const panel    = document.getElementById('info-panel');
  const fromNode = APP.nodes[c.from];
  const toNode   = APP.nodes[c.to];

  const badge = document.getElementById('ip-badge');
  badge.textContent = tType(c.type);
  badge.style.background = (c.color || '#888') + '33';
  badge.style.color = c.color || '#888';
  delete badge.dataset.sid;

  const nameEl = document.getElementById('ip-name');
  nameEl.textContent = `${fromNode?.short || c.from} → ${toNode?.short || c.to}`;
  nameEl.oninput = null;

  document.getElementById('ip-img-wrap').style.display = 'none';
  document.getElementById('ip-conns-list').innerHTML = `
    <div style="font-family:var(--mono);font-size:11px;color:var(--textdim);padding:8px 0;line-height:2">
      <div><span style="color:${escapeHtml(c.color)}">${escapeHtml(tType(c.type))}</span></div>
      <div>${t('from')}: <b style="color:var(--text)">${escapeHtml(fromNode?.name || c.from)}</b></div>
      <div>${t('to')}: <b style="color:var(--text)">${escapeHtml(toNode?.name || c.to)}</b></div>
      <div style="margin-top:8px">
        <label for="cable-length-input" style="display:block;margin-bottom:4px">${t('cable_length_label')}</label>
        <div style="display:flex;gap:6px">
          <input type="number" class="form-input" id="cable-length-input" placeholder="${t('cable_length_placeholder')}" min="0" step="any" style="flex:1;min-width:0;font-size:12px;padding:5px 8px">
          <select class="form-select" id="cable-length-unit" style="flex:none;width:60px;font-size:12px;padding:5px 6px">
            <option value="m">m</option>
            <option value="cm">cm</option>
            <option value="ft">ft</option>
            <option value="in">in</option>
          </select>
        </div>
      </div>
      <div style="margin-top:8px">
        <button class="ip-btn" style="margin-top:4px;background:rgba(255,60,60,.15);color:#ff5555;border:1px solid rgba(255,60,60,.3)" id="del-cable-btn">
          ${t('delete_cable')}
        </button>
      </div>
    </div>
    <div id="ip-route-section-inline"></div>
  `;
  document.getElementById('del-cable-btn')?.addEventListener('click', () => {
    deleteConn(cid);
    closePanel();
  });
  const lenInput = document.getElementById('cable-length-input');
  const unitSel  = document.getElementById('cable-length-unit');
  if (lenInput && unitSel) {
    const defaultUnit = _defaultCableLengthUnit();
    lenInput.value = c.length || '';
    unitSel.value  = c.lengthUnit || defaultUnit;
    const commitLen = () => {
      const v = lenInput.value.trim();
      if (v !== (c.length || '') || unitSel.value !== (c.lengthUnit || defaultUnit)) {
        c.length = v; c.lengthUnit = unitSel.value; setDirty();
        localStorage.setItem(_CABLE_LENGTH_UNIT_KEY, unitSel.value);
      }
    };
    lenInput.addEventListener('blur', commitLen);
    lenInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); lenInput.blur(); }
      if (e.key === 'Escape') { lenInput.value = c.length || ''; lenInput.blur(); }
    });
    unitSel.addEventListener('change', commitLen);
  }
  _renderCablePanelRoutes(cid, document.getElementById('ip-route-section-inline'));

  document.getElementById('ip-add-conn-form').style.display = 'none';
  document.getElementById('ip-delete-node').style.display = 'none';
  // Le crayon ne concerne que les appareils : l'en-tête est partagé avec le panneau
  // d'un appareil, il faut donc le masquer ici comme la corbeille juste au-dessus.
  document.getElementById('ip-edit-node').style.display = 'none';

  panel.classList.add('open');
}

function _renderCablePanelRoutes(cid, container) {
  if (!container) {
    container = document.getElementById('ip-route-section-inline');
    if (!container) return;
  }
  container.innerHTML = '';
  const myRoutes = typeof getCableRoutes === 'function' ? getCableRoutes(cid) : [];
  if (!myRoutes.length) return;

  const section = document.createElement('div');
  section.style.cssText = 'margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)';
  section.innerHTML = `<div style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--textdim);letter-spacing:.06em;margin-bottom:6px">${t('routes').toUpperCase()}</div>`;

  myRoutes.forEach(chain => {
    const seg = chain.segments?.find(s => s.cableId === cid);
    const chip = document.createElement('div');
    chip.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:5px;background:rgba(255,255,255,.05);border-radius:4px;padding:5px 8px;cursor:pointer';
    chip.innerHTML = `
      <div style="width:8px;height:8px;border-radius:50%;background:${escapeHtml(chain.color)};flex-shrink:0"></div>
      <span style="font-family:var(--mono);font-size:11px;color:var(--text);flex:1">${escapeHtml(_routeDisplayTitle(chain))}</span>
      <span style="font-family:var(--mono);font-size:11px;color:var(--textdim)">${seg?.dir === 'rev' ? 'rev' : 'fwd'}</span>
    `;
    chip.addEventListener('click', () => {
      const chainId = chain.id;
      document.getElementById('routes-panel').classList.add('open');
      // Panneau Routes et panneau appareil : mutuellement exclusifs (voir ui.js) —
      // clearSel()/closePanel() APRÈS avoir lu chain.id (fermeture supprime
      // #ip-route-section, donc ce chip lui-même, de la même passe).
      if (typeof clearSel === 'function') clearSel();
      if (typeof closePanel === 'function') closePanel();
      traceRoute(chainId);
      renderRoutesList();
    });
    section.appendChild(chip);
  });

  // Bouton "Add to another route"
  const addBtn = document.createElement('button');
  addBtn.style.cssText = 'margin-top:4px;width:100%;padding:5px;border-radius:5px;border:1px dashed rgba(255,255,255,.15);background:transparent;color:var(--textdim);font-family:var(--mono);font-size:11px;cursor:pointer;text-align:left';
  addBtn.textContent = t('add_to_another_route');
  addBtn.addEventListener('click', () => {
    if (typeof _openInsertMode === 'function') _openInsertMode(cid);
  });
  section.appendChild(addBtn);

  container.appendChild(section);
}

// Ré-affiche le panneau câble dans la langue courante, sans changer la sélection
// (appelé par setLang() car ce panneau est construit en JS, pas via data-i18n).
function _refreshCablePanelLang() {
  if (!document.getElementById('info-panel')?.classList.contains('open')) return;
  if (selCableId == null) return;
  openCablePanel(selCableId);
}

function updateInfoPanel() {
  if (APP.sel) renderConnsList(APP.sel);
}

function closePanel() {
  document.getElementById('info-panel').classList.remove('open');
  document.getElementById('ip-add-conn-form').style.display = '';
  document.getElementById('ip-delete-node').style.display = '';
  document.getElementById('ip-edit-node').style.display = '';
  document.getElementById('ip-route-section')?.remove();
  if (document.getElementById('route-assign-prompt')) {
    document.getElementById('route-assign-prompt').remove();
    _cancelPendingCable();
  }
  _showSinglePanelMode();
}

function openMultiPanel() {
  const panel = document.getElementById('info-panel');

  // Cacher le contenu single-node, montrer le multi
  const hdr = document.querySelector('#info-panel > .ip-header');
  const bdy = document.querySelector('#info-panel > .ip-body');
  if (hdr) hdr.style.display = 'none';
  if (bdy) bdy.style.display = 'none';
  const multi = document.getElementById('ip-multi');
  if (!multi) return;
  multi.style.display = 'block';

  const count = APP.selMulti.size;
  document.getElementById('ip-multi-count').textContent = t('multi_devices_selected').replace('$n', count);

  const list = document.getElementById('ip-multi-list');
  list.innerHTML = '';

  for (const sid of APP.selMulti) {
    const s = APP.nodes[sid];
    if (!s) continue;
    const cat = getCat(s.cat);

    const row = document.createElement('div');
    row.className = 'ip-multi-row';
    row.dataset.sid = sid;
    row.innerHTML = `
      <div class="ip-multi-row-head">
        <span class="ip-multi-dot" style="background:${escapeHtml(cat.color)}"></span>
        <span class="ip-multi-name">${escapeHtml(s.name)}</span>
        <span class="ip-multi-cat" style="color:${escapeHtml(cat.color)}">${escapeHtml(cat.label)}</span>
        <span class="ip-multi-arrow">›</span>
      </div>
      <div class="ip-multi-expanded" style="display:none"></div>
    `;

    const head     = row.querySelector('.ip-multi-row-head');
    const expanded = row.querySelector('.ip-multi-expanded');

    head.addEventListener('click', () => {
      const isOpen = row.classList.contains('open');
      list.querySelectorAll('.ip-multi-row.open').forEach(r => {
        r.classList.remove('open');
        r.querySelector('.ip-multi-expanded').style.display = 'none';
      });
      if (!isOpen) {
        row.classList.add('open');
        expanded.style.display = '';
        _renderMultiNodeExpanded(expanded, sid);
      }
    });

    list.appendChild(row);
  }

  panel.classList.add('open');

  document.getElementById('ip-multi-close').onclick = () => {
    clearSelMulti();
    closePanel();
  };
}

function _renderMultiNodeExpanded(container, sid) {
  const s = APP.nodes[sid];
  if (!s) return;
  container.innerHTML = '';

  const conns = CM[sid] || [];
  if (conns.length) {
    conns.forEach(conn => {
      const node = APP.nodes[conn.sid];
      if (!node) return;
      const item = document.createElement('div');
      item.className = 'ip-conn-item';
      item.style.cursor = 'pointer';
      item.innerHTML = `
        <div class="ip-conn-dot" style="background:${escapeHtml(conn.color)}"></div>
        <div class="ip-conn-name">${escapeHtml(node.short || node.name)}</div>
        <div class="ip-conn-type" style="color:${escapeHtml(conn.color)}">${escapeHtml(tType(conn.type))}</div>
      `;
      item.addEventListener('click', () => { clearSelMulti(); selectNode(conn.sid); });
      container.appendChild(item);
    });
  } else {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-family:var(--mono);font-size:11px;color:var(--textdim);padding:4px 0 8px';
    empty.textContent = t('no_conn');
    container.appendChild(empty);
  }

  const del = document.createElement('button');
  del.className = 'ip-btn';
  del.style.cssText = 'margin-top:8px;background:rgba(255,60,60,.15);color:#ff5555;border:1px solid rgba(255,60,60,.3);width:100%';
  del.innerHTML = '<svg viewBox="0 0 12 14" width="11" height="11" fill="currentColor" style="vertical-align:middle;margin-right:4px" xmlns="http://www.w3.org/2000/svg"><path d="M4 0h4l1 1h3v2H0V1h3L4 0zM1 4h10l-.9 9.5A.5.5 0 0 1 9.6 14H2.4a.5.5 0 0 1-.5-.5L1 4zm3 2v5h1V6H4zm2 0v5h1V6H6zm2 0v5h1V6H8z"/></svg> ' + t('delete_device');
  del.addEventListener('click', () => {
    if (s.cat === 'internet') { deleteInternetNode(sid); return; }
    showConfirm(t('delete_node_confirm').replace('$name', s.name), { danger: true }).then(ok => {
      if (!ok) return;
      APP.selMulti.delete(sid);
      deleteNode(sid);
      if (APP.selMulti.size > 1) {
        openMultiPanel();
      } else if (APP.selMulti.size === 1) {
        const remaining = [...APP.selMulti][0];
        clearSelMulti();
        selectNode(remaining);
      } else {
        clearSelMulti();
        closePanel();
      }
    });
  });
  container.appendChild(del);
}

// Ré-affiche le panneau multi-sélection dans la langue courante, en gardant
// la ligne développée s'il y en avait une (appelé par setLang() car ce
// panneau est construit en JS, pas via data-i18n).
function _refreshMultiPanelLang() {
  const panel = document.getElementById('info-panel');
  const multi = document.getElementById('ip-multi');
  if (!panel?.classList.contains('open') || !multi || multi.style.display === 'none') return;
  const openRow = document.querySelector('#ip-multi-list .ip-multi-row.open');
  const openSid = openRow?.dataset.sid;
  openMultiPanel();
  if (openSid) {
    const row = document.querySelector(`#ip-multi-list .ip-multi-row[data-sid="${openSid}"]`);
    if (row) {
      row.classList.add('open');
      const expanded = row.querySelector('.ip-multi-expanded');
      expanded.style.display = '';
      _renderMultiNodeExpanded(expanded, openSid);
    }
  }
}

function _refreshBadge(badge, cat) {
  badge.textContent = cat.label;
  badge.style.background = cat.color + '33';
  badge.style.color = cat.color;
}

function _openCatPicker(badge, sid) {
  const dd = document.getElementById('ip-cat-dropdown');
  if (!dd) return;

  if (dd.classList.contains('open')) { dd.classList.remove('open'); return; }

  dd.innerHTML = '';
  sortCats(APP.categories || []).forEach(c => {
    const resolved = getCat(c.id);
    const row = document.createElement('div');
    row.className = 'ip-cat-row';
    const dot = document.createElement('span');
    dot.className = 'ip-cat-dot';
    dot.style.background = resolved.color;
    const lbl = document.createElement('span');
    lbl.textContent = resolved.label.toUpperCase();
    row.appendChild(dot);
    row.appendChild(lbl);
    row.addEventListener('click', async e => {
      e.stopPropagation();
      if (!APP.nodes[sid]) return;
      // Fermer le menu AVANT la popup : elle est modale, le laisser ouvert
      // derrière la laisserait visible tant qu'on n'a pas répondu.
      dd.classList.remove('open');
      // Toute la mécanique (frères, popup, pushUndo unique, rendu) vit dans
      // applyCategoryChange (library.js) — partagée avec la fenêtre de
      // modification, pour que les deux chemins ne puissent pas diverger.
      await applyCategoryChange(sid, c.id);
      if (APP.nodes[sid]) _refreshBadge(badge, getCat(APP.nodes[sid].cat));
    });
    dd.appendChild(row);
  });

  dd.classList.add('open');

  const close = e => {
    if (!dd.contains(e.target) && e.target !== badge) {
      dd.classList.remove('open');
      document.removeEventListener('click', close);
    }
  };
  setTimeout(() => document.addEventListener('click', close), 0);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('ip-close').addEventListener('click', () => {
    closePanel();
    clearSel();
    clearSelCable();
  });

  document.getElementById('ip-badge').addEventListener('click', e => {
    const sid = e.currentTarget.dataset.sid;
    if (!sid) return;
    _openCatPicker(e.currentTarget, sid);
  });
});
