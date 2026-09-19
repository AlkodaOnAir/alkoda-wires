/* ═══════════════════════════════════════════════════════════════
   panel.js — Right side info panel
═══════════════════════════════════════════════════════════════ */

// Scan du réseau pour le champ « Adresse IP » : résultat gardé pour la session (tous les appareils),
// affiché par le panneau de l'appareil actuellement ouvert (voir openInfoPanel).
let _ipScanResult  = null; // { devices: [{ ip, mac, vendor }], error? }
let _ipScanRunning = null; // scan en cours (promesse)
let _ipScanRender  = null; // rendu du panneau actuellement ouvert
let _ipScanFolded  = false; // liste repliée par l'utilisateur (session), redépliée par un nouveau scan

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

  // Position du nom autour de l'appareil (4 flèches en T inversé). Choix par appareil,
  // jamais retenu comme valeur de départ des suivants : « en dessous » reste le défaut.
  // S'applique à toute la sélection quand plusieurs appareils sont sélectionnés.
  const posWrap = document.getElementById('ip-lblpos');
  if (posWrap) {
    const _cur = typeof nodeLblPos === 'function' ? nodeLblPos(s) : (s.lblPos || 'bottom');
    posWrap.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b.dataset.pos === _cur);
      b.onclick = () => {
        const targets = (APP.selMulti && APP.selMulti.size > 1) ? [...APP.selMulti] : [sid];
        const pos = b.dataset.pos;
        if (targets.every(id => (APP.nodes[id]?.lblPos || 'bottom') === pos)) return;
        pushUndo();
        targets.forEach(id => {
          const n = APP.nodes[id];
          if (!n) return;
          if (pos === 'bottom') delete n.lblPos; else n.lblPos = pos;
          _updateLblPos(id);
        });
        posWrap.querySelectorAll('button').forEach(x => x.classList.toggle('active', x.dataset.pos === pos));
        setDirty();
        wLog('NODE_LBL_POS', { id: sid, pos, count: targets.length });
      };
    });
  }

  // Bouton crayon → modale de modification complète de l'appareil (nom, nom court,
  // catégorie, image/forme, ports) — voir openEditNodeModal/library.js
  const editBtn = document.getElementById('ip-edit-node');
  editBtn.title = t('edit_device_title');
  editBtn.onclick = () => { if (typeof openEditNodeModal === 'function') openEditNodeModal(sid); };

  // Image — reflète la vue active (Avant/Arrière) si l'appareil en a deux.
  // Ports/câbles restent basés sur l'Avant (voir renderOneNode/nodes.js) :
  // ce bouton ne change que l'aperçu affiché ici et sur le canevas.
  const ipImg     = document.getElementById('ip-img');
  const ipImgWrap = document.getElementById('ip-img-wrap');
  const ipFlipBtn = document.getElementById('ip-flip-view');
  const _rearActive = typeof _previewView !== 'undefined' && _previewView[sid] === 'rear' && !!s.imgRear;
  const _dispImg = _rearActive ? s.imgRear : s.img;
  if (_dispImg) {
    ipImg.src = _dispImg;
    ipImgWrap.style.display = '';
  } else {
    ipImgWrap.style.display = 'none';
  }
  if (ipFlipBtn) {
    ipFlipBtn.style.display = s.imgRear ? '' : 'none';
    ipFlipBtn.onclick = () => { if (typeof toggleNodeActiveView === 'function') toggleNodeActiveView(sid); };
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

  // Adresse IP — deuxième ligne sous le nom sur le canevas (voir _applyNodeIpLine, nodes.js).
  // Taille de départ 2/3 du nom et couleur blanche, figées au premier réglage puis indépendantes du nom.
  let ipSection = document.getElementById('ip-ipaddr');
  if (!ipSection) {
    ipSection = document.createElement('div');
    ipSection.id = 'ip-ipaddr';
    ipSection.className = 'ip-section';
    ipSection.innerHTML = `
      <div class="ip-section-title" data-i18n="ip_address">${t('ip_address')}</div>
      <div class="ip-tl-field" id="ip-ipaddr-octets" style="display:flex;align-items:center;gap:3px">
        ${[0, 1, 2, 3].map(i => `${i ? '<span style="color:var(--textdim);font-family:var(--mono)">.</span>' : ''}<input type="text" class="ip-tl-input" inputmode="numeric" maxlength="3" spellcheck="false" style="flex:1;min-width:0;text-align:center;padding:5px 2px">`).join('')}
      </div>
      <div class="ip-tl-field">
        <button type="button" class="ip-btn" id="ip-ipaddr-scan" data-i18n="ip_scan">${t('ip_scan')}</button>
        <div id="ip-ipaddr-scan-status" style="font-family:var(--mono);font-size:10px;color:var(--textdim);margin-top:4px"></div>
        <div id="ip-ipaddr-scan-toggle" style="position:relative;display:flex;align-items:center;min-height:22px;font-family:var(--mono);font-size:10px;color:var(--textdim);margin-top:4px;cursor:pointer;user-select:none"></div>
        <div id="ip-ipaddr-scan-list" style="max-height:140px;overflow-y:auto;margin-top:4px"></div>
      </div>
      <label class="ip-tl-field" style="display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" id="ip-ipaddr-visible" style="margin:0">
        <span class="ip-tl-label" style="margin:0" data-i18n="ip_visible">${t('ip_visible')}</span>
      </label>
      <div class="ip-tl-row2">
        <div class="ip-tl-field" style="flex:1">
          <label class="ip-tl-label" data-i18n="tl_size">${t('tl_size')}</label>
          <input type="number" id="ip-ipaddr-size" class="ip-tl-input" min="6" max="400">
        </div>
        <div class="ip-tl-field" style="flex:1">
          <label class="ip-tl-label" data-i18n="tl_color">${t('tl_color')}</label>
          <input type="color" id="ip-ipaddr-color" class="ip-tl-color">
        </div>
      </div>`;
    document.getElementById('ip-conns-section').insertAdjacentElement('beforebegin', ipSection);
  }
  ipSection.style.display = s.cat === 'internet' ? 'none' : '';
  if (s.cat !== 'internet') {
    const octets = [...document.querySelectorAll('#ip-ipaddr-octets input')];
    const ipVis = document.getElementById('ip-ipaddr-visible');
    const ipSz  = document.getElementById('ip-ipaddr-size');
    const ipCol = document.getElementById('ip-ipaddr-color');
    const _defSize = node => _defaultIpSize(node); // dernière taille choisie (gardée en mémoire) ou 2/3 du nom
    const _ipEdit = fn => () => {
      const node = APP.nodes[sid];
      if (!node) return;
      fn(node);
      if (node.ipSize == null)  node.ipSize  = _defSize(node);
      if (node.ipColor == null) node.ipColor = _defaultIpColor(); // dernière couleur choisie (gardée en mémoire) ou blanc
      _applyNodeIpLine(sid);
      setDirty();
    };
    ipVis.checked  = s.ipVisible !== false;
    ipSz.value     = s.ipSize || _defSize(s);
    ipCol.value    = s.ipColor || _defaultIpColor();

    // Adresse IPv4 en 4 cases, points fixes : 3 chiffres → case suivante (001 pour 1), ou Point/Espace/virgule/flèche droite ;
    // zéros inutiles retirés (001 → 1), 255 au maximum ; coller une adresse complète remplit les 4 cases.
    const _octetNorm = v => (v === '' ? '' : String(Math.min(255, parseInt(v, 10))));
    const _saveOctets = _ipEdit(node => { node.ip = octets.every(o => o.value === '') ? '' : octets.map(o => o.value).join('.'); });
    const _goto = (i, caretEnd) => {
      const o = octets[i];
      if (!o) return;
      o.focus();
      if (caretEnd) o.setSelectionRange(o.value.length, o.value.length);
    };
    const _ipParts = (s.ip || '').split('.');
    octets.forEach((o, i) => {
      o.value   = (_ipParts[i] || '').replace(/\D/g, '').slice(0, 3);
      o.onfocus = () => o.select();
      o.oninput = () => {
        o.value = o.value.replace(/\D/g, '').slice(0, 3);
        if (o.value.length === 3) {
          o.value = _octetNorm(o.value);
          _saveOctets();
          if (i < 3) _goto(i + 1);
          return;
        }
        _saveOctets();
      };
      o.onblur = () => {
        const n = _octetNorm(o.value);
        if (n !== o.value) { o.value = n; _saveOctets(); }
      };
      o.onkeydown = e => {
        if (e.key === '.' || e.key === ' ' || e.key === ',') {
          e.preventDefault();
          if (o.value !== '' && i < 3) _goto(i + 1);
        } else if (e.key === 'ArrowRight' && o.selectionStart === o.value.length && i < 3) {
          e.preventDefault(); _goto(i + 1);
        } else if (e.key === 'ArrowLeft' && o.selectionEnd === 0 && i > 0) {
          e.preventDefault(); _goto(i - 1, true);
        } else if (e.key === 'Backspace' && o.value === '' && i > 0) {
          e.preventDefault(); _goto(i - 1, true);
        } else if (e.key === 'Enter') {
          e.preventDefault(); o.blur();
        }
      };
      o.onpaste = e => {
        const m = (e.clipboardData?.getData('text') || '').match(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})/);
        if (!m) return;
        e.preventDefault();
        octets.forEach((x, k) => { x.value = _octetNorm(m[k + 1]); });
        _saveOctets();
      };
    });

    // Scan du réseau : propositions « IP — fabricant » gardées pour la session, fabricant de l'appareil en tête ;
    // un clic sur une proposition remplit les 4 cases (toujours modifiables ensuite).
    const scanBtn    = document.getElementById('ip-ipaddr-scan');
    const scanStatus = document.getElementById('ip-ipaddr-scan-status');
    const scanList   = document.getElementById('ip-ipaddr-scan-list');
    const scanToggle = document.getElementById('ip-ipaddr-scan-toggle');
    const _setI18n = (el, key) => { el.dataset.i18n = key; el.textContent = t(key); };
    _ipScanRender = () => {
      const res = _ipScanResult;
      _setI18n(scanBtn, _ipScanRunning ? 'ip_scanning' : (res ? 'ip_rescan' : 'ip_scan'));
      scanBtn.disabled = !!_ipScanRunning;
      scanList.innerHTML = '';
      scanStatus.removeAttribute('data-i18n');
      scanStatus.textContent = '';
      scanToggle.textContent = '';
      scanToggle.style.display = 'none';
      if (_ipScanRunning || !res) return;
      if (res.error || !res.devices.length) { _setI18n(scanStatus, res.error ? 'ip_scan_error' : 'ip_scan_none'); return; }
      // Ligne « N propositions ▾/▸ » : replie ou déplie la liste (état gardé pour la session).
      const count = res.devices.length;
      const countLbl = document.createElement('span');
      countLbl.textContent = count === 1 ? t('ip_scan_count_1') : t('ip_scan_count').replace('$n', count);
      // Triangle dessiné (un caractère de police serait décalé en hauteur selon la police) : exactement au milieu
      // de la ligne, donc aligné sur le texte ; même taille que l'ancien caractère agrandi.
      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      arrow.setAttribute('width', '12');
      arrow.setAttribute('height', '12');
      arrow.setAttribute('viewBox', '0 0 12 12');
      arrow.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:block';
      const tri = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      tri.setAttribute('d', _ipScanFolded ? 'M2.5 1 L9.5 6 L2.5 11 Z' : 'M1 2.5 L11 2.5 L6 9.5 Z');
      tri.setAttribute('fill', 'currentColor');
      arrow.appendChild(tri);
      scanToggle.append(countLbl, arrow);
      scanToggle.style.display = 'flex'; // pas '' : effacerait le display:flex qui centre le texte en hauteur
      scanToggle.onclick = () => { _ipScanFolded = !_ipScanFolded; _ipScanRender(); };
      if (_ipScanFolded) return;
      const node   = APP.nodes[sid];
      const nameLc = `${node?.name || ''} ${node?.short || ''}`.toLowerCase();
      // Marque du nom présente dans la table des fabricants enregistrés (brands.js) : elle décide, groupe propriétaire compris
      // (Marantz → D&M Holdings) ; sinon, premier mot du fabricant cherché dans le nom. Même marque : en tête et en couleur.
      // window._xIpVendorTable = false en console : premier mot seul, comme avant.
      const tableMatch = window._xIpVendorTable !== false ? vendorMatcherForDevice(nameLc) : null;
      const sameBrand  = d => {
        if (tableMatch) return tableMatch(d.vendor);
        const w = (d.vendor || '').toLowerCase().split(/[^a-z0-9]+/).find(x => x.length >= 3);
        return !!(w && nameLc.includes(w));
      };
      res.devices.map(d => ({ d, same: sameBrand(d) })).sort((a, b) => b.same - a.same).forEach(({ d, same }) => {
        const item = document.createElement('div');
        item.textContent = d.vendor ? `${d.ip} — ${d.vendor}` : d.ip;
        item.title = item.textContent;
        item.style.cssText = 'font-family:var(--mono);font-size:11px;padding:3px 6px;border-radius:3px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'
          + (same ? ';color:var(--accent)' : '');
        item.onmouseenter = () => { item.style.background = 'rgba(0,212,255,.12)'; };
        item.onmouseleave = () => { item.style.background = ''; };
        item.onclick = () => {
          const p = d.ip.split('.');
          octets.forEach((o, k) => { o.value = p[k] || ''; });
          _saveOctets();
        };
        scanList.appendChild(item);
      });
    };
    scanBtn.onclick = async () => {
      if (_ipScanRunning || !window.electronAPI?.networkScan) return;
      _ipScanRunning = window.electronAPI.networkScan();
      _ipScanFolded  = false; // nouveau scan : liste redépliée pour montrer les nouveaux résultats
      _ipScanRender();
      try { _ipScanResult = await _ipScanRunning; }
      catch (e) { _ipScanResult = { devices: [], error: String(e) }; }
      _ipScanRunning = null;
      _ipScanRender?.(); // panneau ouvert à la fin du scan, qui peut être celui d'un autre appareil
    };
    _ipScanRender();

    ipVis.onchange = () => { pushUndo(); _ipEdit(node => { node.ipVisible = ipVis.checked; })(); };
    // Taille et couleur choisies : gardées en mémoire comme départ du prochain appareil, même après redémarrage.
    ipSz.oninput   = _ipEdit(node => {
      const v = parseInt(ipSz.value, 10);
      if (!(v >= 6 && v <= 400)) return;
      node.ipSize = v;
      localStorage.setItem('wires-ip-size', String(v));
    });
    ipCol.oninput  = _ipEdit(node => {
      node.ipColor = ipCol.value;
      localStorage.setItem('wires-ip-color', ipCol.value);
    });
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
  const ipSection = document.getElementById('ip-ipaddr'); // adresse IP : réservée au panneau d'un appareil
  if (ipSection) ipSection.style.display = 'none';
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
