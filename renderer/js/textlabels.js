/* ═══════════════════════════════════════════════════════════════
   textlabels.js — Free-standing text annotations on the canvas
═══════════════════════════════════════════════════════════════ */

const TL_FONTS = [
  'Arial', 'Arial Black', 'Calibri', 'Cambria',
  'Comic Sans MS', 'Consolas', 'Courier New',
  'Georgia', 'Helvetica', 'Impact',
  'Menlo', 'Segoe UI', 'Tahoma',
  'Times New Roman', 'Trebuchet MS', 'Verdana',
];

let _tlNextId    = 1;
let _tlDrag      = null;   // { id, ox, oy, startX, startY, moved }
let _tlResize    = null;   // { id, startX, startY, startSize }
let _tlPlace     = false;  // mode "place on canvas click"
let _cachedFonts = null;   // system fonts loaded once

async function getSystemFonts() {
  if (_cachedFonts) return _cachedFonts;
  try {
    const fonts = await window.queryLocalFonts();
    const families = [...new Set(fonts.map(f => f.family))].sort((a, b) => a.localeCompare(b));
    _cachedFonts = families.length ? families : TL_FONTS;
  } catch (e) {
    _cachedFonts = TL_FONTS;
  }
  return _cachedFonts;
}

function _tlLayer() { return document.getElementById('text-labels-layer'); }
function _tlEl(id)  { return document.getElementById(`tl-${id}`); }

function _newTlId() {
  while (APP.textLabels[`tl-${_tlNextId}`]) _tlNextId++;
  return `tl-${_tlNextId++}`;
}

// ── Create ────────────────────────────────────────────────────
function addTextLabel(cx, cy) {
  const id = _newTlId();
  APP.textLabels[id] = {
    id, x: cx - 40, y: cy - 12,
    text: 'Label', html: 'Label',
    fontFamily: 'Arial', fontSize: 60,
    bold: false, italic: false, underline: false,
    color: '#ffffff', orientation: 'horizontal',
    resizeMode: false, width: null, height: null,
  };
  _buildTlEl(id);
  selectTextLabel(id);
  setDirty();
}

// ── Build / update DOM element ────────────────────────────────
function _buildTlEl(id) {
  const layer = _tlLayer();
  if (!layer) return;
  let el = _tlEl(id);
  if (!el) {
    el = document.createElement('div');
    el.id = `tl-${id}`;
    el.className = 'text-label';
    layer.appendChild(el);

    el.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.stopPropagation();
      if (el.contentEditable === 'true') return; // let browser handle text selection
      selectTextLabel(id);
      const tl = APP.textLabels[id];
      if (!tl) return;
      _tlDrag = { id, startX: e.clientX, startY: e.clientY, ox: tl.x, oy: tl.y, moved: false };
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener('pointermove', e => {
      if (!_tlDrag || _tlDrag.id !== id) return;
      const dx = (e.clientX - _tlDrag.startX) / APP.view.zoom;
      const dy = (e.clientY - _tlDrag.startY) / APP.view.zoom;
      if (!_tlDrag.moved && Math.hypot(dx, dy) < 3) return;
      if (!_tlDrag.moved) pushUndo();
      _tlDrag.moved = true;
      const tl = APP.textLabels[id];
      tl.x = _tlDrag.ox + dx;
      tl.y = _tlDrag.oy + dy;
      el.style.left = tl.x + 'px';
      el.style.top  = tl.y + 'px';
    });

    el.addEventListener('pointerup', () => {
      if (_tlDrag?.moved) setDirty();
      _tlDrag = null;
    });

    el.addEventListener('dblclick', e => {
      e.stopPropagation();
      _editTlInline(id);
    });

    // ── Resize handle ────────────────────────────────────────
    const handle = document.createElement('div');
    handle.className = 'tl-resize-handle';
    el.appendChild(handle);

    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      const tl = APP.textLabels[id];
      if (!tl) return;
      pushUndo();
      _tlResize = { id, startX: e.clientX, startY: e.clientY, startSize: tl.fontSize };
      handle.setPointerCapture(e.pointerId);
    });

    handle.addEventListener('pointermove', e => {
      if (!_tlResize || _tlResize.id !== id) return;
      const tl = APP.textLabels[id];
      if (!tl) return;
      const delta = (_tlResize.startX - e.clientX + _tlResize.startY - e.clientY) / APP.view.zoom;
      const newSize = Math.max(6, Math.min(400, Math.round(_tlResize.startSize + delta * 0.5)));
      tl.fontSize = newSize;
      el.style.fontSize = newSize + 'px';
      const sz = document.getElementById('ip-tl-size');
      if (sz) sz.value = newSize;
    });

    handle.addEventListener('pointerup', () => {
      if (_tlResize) { setDirty(); _tlResize = null; }
    });
  }
  _applyTlStyles(id, el);
  _buildResizeHandles(id, el);
}

function _applyTlStyles(id, el) {
  const tl = APP.textLabels[id];
  if (!tl || !el) return;
  el.style.left           = tl.x + 'px';
  el.style.top            = tl.y + 'px';
  el.style.fontFamily     = tl.fontFamily;
  el.style.fontSize       = tl.fontSize + 'px';
  el.style.fontWeight     = tl.bold      ? 'bold'      : 'normal';
  el.style.fontStyle      = tl.italic    ? 'italic'    : 'normal';
  el.style.textDecoration = tl.underline ? 'underline' : 'none';
  el.style.color       = tl.color;
  el.style.transform   = (tl.orientation === 'vertical') ? 'rotate(-90deg)' : 'none';
  el.style.writingMode = 'horizontal-tb';
  // Box resize mode
  el.classList.toggle('tl-resizing', !!tl.resizeMode);
  if (tl.width) {
    el.style.width    = tl.width  + 'px';
    el.style.height   = tl.height ? tl.height + 'px' : 'auto';
    el.style.overflow = 'hidden';
  } else {
    el.style.width = el.style.height = el.style.overflow = '';
  }
  if (el.contentEditable !== 'true') {
    const handles = [...el.querySelectorAll('.tl-resize-handle, .tl-rh')];
    handles.forEach(h => h.remove());
    // tl.html vient d'un fichier .wires potentiellement échangé avec quelqu'un d'autre :
    // jamais posé tel quel (sanitizeRichText retire scripts/gestionnaires d'évènements,
    // garde la mise en forme normale — gras/italique/police/couleur). tl.text n'est
    // censé être QUE du texte brut, donc simplement échappé, pas passé au sanitizeur.
    el.innerHTML = tl.html != null ? sanitizeRichText(tl.html) : escapeHtml(tl.text ?? '');
    handles.forEach(h => el.appendChild(h));
  }
}

// ── Box resize handles (8 directions) ────────────────────────
function _buildResizeHandles(id, el) {
  el.querySelectorAll('.tl-rh').forEach(h => h.remove());
  const tl = APP.textLabels[id];
  if (!tl || !tl.resizeMode) return;

  ['n','s','e','w'].forEach(dir => {
    const h = document.createElement('div');
    h.className = `rh rh-${dir} tl-rh`;
    el.appendChild(h);

    let start = null;
    h.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const tl = APP.textLabels[id];
      if (!tl) return;
      start = { sx: e.clientX, sy: e.clientY, x: tl.x, y: tl.y, w: tl.width, h: tl.height };
      h.setPointerCapture(e.pointerId);
    });

    h.addEventListener('pointermove', e => {
      if (!start) return;
      const tl = APP.textLabels[id];
      if (!tl) return;
      const dx = (e.clientX - start.sx) / APP.view.zoom;
      const dy = (e.clientY - start.sy) / APP.view.zoom;
      if (!start.undoPushed) { pushUndo(); start.undoPushed = true; }
      let nx = start.x, ny = start.y, nw = start.w, nh = start.h;
      if (dir.includes('e')) nw = Math.max(40, start.w + dx);
      if (dir.includes('s')) nh = Math.max(16, start.h + dy);
      if (dir.includes('w')) { nw = Math.max(40, start.w - dx); nx = start.x + start.w - nw; }
      if (dir.includes('n')) { nh = Math.max(16, start.h - dy); ny = start.y + start.h - nh; }
      tl.x = nx; tl.y = ny; tl.width = nw; tl.height = nh;
      el.style.left = nx + 'px'; el.style.top = ny + 'px';
      el.style.width = nw + 'px'; el.style.height = nh + 'px';
    });

    h.addEventListener('pointerup', () => { if (start) { setDirty(); start = null; } });
  });
}

function _hasMixedFonts(el) {
  if (!el) return false;
  return !!el.querySelector('font[face], [style*="font-family"]');
}

function _syncStyleButtons(editEl) {
  const cmds = { 'ip-tl-bold': 'bold', 'ip-tl-italic': 'italic', 'ip-tl-underline': 'underline' };
  Object.entries(cmds).forEach(([btnId, cmd]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    let has = document.queryCommandState(cmd);
    if (!has) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const frag = sel.getRangeAt(0).cloneContents();
        const tmp = document.createElement('div');
        tmp.appendChild(frag);
        const patterns = {
          bold:      /<(b|strong)[\s>\/]/i,
          italic:    /<(i|em)[\s>\/]/i,
          underline: /<u[\s>\/]/i,
        };
        has = patterns[cmd].test(tmp.innerHTML);
      }
    }
    btn.classList.toggle('active', has);
  });
}

// ── Render all (on project load) ──────────────────────────────
function renderAllTextLabels() {
  const layer = _tlLayer();
  if (!layer) return;
  layer.innerHTML = '';
  _tlNextId = 1;
  for (const id of Object.keys(APP.textLabels)) {
    const num = parseInt(id.replace('tl-', '')) || 0;
    if (num >= _tlNextId) _tlNextId = num + 1;
    _buildTlEl(id);
  }
}

// ── Selection ─────────────────────────────────────────────────
function selectTextLabel(id) {
  clearSelTextLabel();
  if (typeof clearSel      === 'function') clearSel();
  if (typeof clearSelCable === 'function') clearSelCable();
  if (typeof clearSelMulti === 'function') clearSelMulti();
  APP.selTextLabel = id;
  _tlEl(id)?.classList.add('tl-sel');
  if (typeof openTextLabelPanel === 'function') openTextLabelPanel(id);
}

function clearSelTextLabel() {
  if (!APP.selTextLabel) return;
  const el = _tlEl(APP.selTextLabel);
  if (el) {
    el.classList.remove('tl-sel');
    const tl = APP.textLabels[APP.selTextLabel];
    if (tl && tl.resizeMode) {
      tl.resizeMode = false;
      el.classList.remove('tl-resizing');
      _buildResizeHandles(APP.selTextLabel, el); // retire les handles
    }
  }
  APP.selTextLabel = null;
}

// ── Delete ────────────────────────────────────────────────────
function deleteTextLabel(id) {
  _tlEl(id)?.remove();
  delete APP.textLabels[id];
  if (APP.selTextLabel === id) APP.selTextLabel = null;
  if (typeof closePanel === 'function') closePanel();
  setDirty();
}

// ── Inline edit (double-click) ────────────────────────────────
function _editTlInline(id) {
  const tl = APP.textLabels[id];
  const el = _tlEl(id);
  if (!tl || !el) return;
  // Retirer tous les handles pour qu'ils ne soient pas dans la zone contenteditable
  const _handles = [...el.querySelectorAll('.tl-resize-handle, .tl-rh')];
  _handles.forEach(h => h.remove());

  el.contentEditable = 'true';
  el.classList.add('tl-editing');
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  _syncStyleButtons(el);

  const syncPanel = () => {
    const ta = document.getElementById('ip-tl-text');
    if (ta) ta.value = el.textContent;
  };

  const syncFontDropdown = () => {
    const fontSel = document.getElementById('ip-tl-font');
    if (!fontSel) return;
    const f = document.queryCommandValue('fontName');
    fontSel.value = f || '';
  };

  const onSelChange = () => {
    const s = window.getSelection();
    if (!s || !s.rangeCount) return;
    if (el.contains(s.getRangeAt(0).commonAncestorContainer)) {
      syncFontDropdown();
      _syncStyleButtons(el);
    }
  };
  document.addEventListener('selectionchange', onSelChange);

  const finish = () => {
    el.contentEditable = 'false';
    el.classList.remove('tl-editing');
    tl.html = el.innerHTML;
    tl.text = el.textContent;
    _handles.forEach(h => { if (!el.contains(h)) el.appendChild(h); });
    syncPanel();
    setDirty();
    el.removeEventListener('input',   syncPanel);
    el.removeEventListener('keydown', onKey);
    document.removeEventListener('selectionchange', onSelChange);
    document.removeEventListener('pointerdown',     onDocClick, true);
    const fontSel = document.getElementById('ip-tl-font');
    if (fontSel) fontSel.value = _hasMixedFonts(el) ? '' : tl.fontFamily;
  };

  const onDocClick = e => {
    if (el.contains(e.target)) return;
    const panel = document.getElementById('info-panel');
    if (panel && panel.contains(e.target)) return;
    finish();
  };

  const _savedHtml = tl.html != null ? sanitizeRichText(tl.html) : escapeHtml(tl.text ?? '');
  const onKey = e => {
    e.stopPropagation();
    if (e.key === 'Escape') { el.innerHTML = _savedHtml; syncPanel(); finish(); }
  };
  el.addEventListener('input',   syncPanel);
  el.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', onDocClick, true);
}

// ── Place mode ────────────────────────────────────────────────
function startTextLabelPlaceMode() {
  _tlPlace = true;
  document.getElementById('canvas-area').style.cursor = 'crosshair';

  // Réutilise le même banner que le mode câble (même style garanti)
  let banner = document.getElementById('cable-add-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'cable-add-banner';
    document.body.appendChild(banner);
  }
  banner.innerHTML = t('place_textlabel_banner')
    + ` <button class="cab-cancel-btn" onclick="exitTextLabelPlaceMode()">✕ ${t('cancel')}</button>`;
  banner.classList.add('visible');

  const area = document.getElementById('canvas-area');
  const handler = e => {
    if (!_tlPlace) { area.removeEventListener('click', handler, true); return; }
    if (!_EMPTY_TARGETS.has(e.target.id)) return;
    e.stopImmediatePropagation();
    exitTextLabelPlaceMode();
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    addTextLabel(x, y);
    area.removeEventListener('click', handler, true);
  };
  area.addEventListener('click', handler, true);
}

// Ré-affiche le texte du bandeau dans la langue courante, sans changer l'état
// (appelé par setLang() car ce bandeau est injecté en JS, pas via data-i18n).
function _refreshTextLabelPlaceBanner() {
  if (!_tlPlace) return;
  const banner = document.getElementById('cable-add-banner');
  if (!banner) return;
  banner.innerHTML = t('place_textlabel_banner')
    + ` <button class="cab-cancel-btn" onclick="exitTextLabelPlaceMode()">✕ ${t('cancel')}</button>`;
}

function exitTextLabelPlaceMode() {
  _tlPlace = false;
  document.getElementById('canvas-area').style.cursor = '';
  const banner = document.getElementById('cable-add-banner');
  if (banner) banner.classList.remove('visible');
}

// ── Panel init (called once at DOMContentLoaded) ──────────────
function initTextLabels() {
  const _upd = (field, cb) => {
    document.getElementById(field)?.addEventListener('input', () => {
      if (!APP.selTextLabel) return;
      const tl = APP.textLabels[APP.selTextLabel];
      if (!tl) return;
      cb(tl, document.getElementById(field));
      _applyTlStyles(APP.selTextLabel, _tlEl(APP.selTextLabel));
      setDirty();
    });
  };

  const _tog = (btnId, prop, cmd) => {
    document.getElementById(btnId)?.addEventListener('click', () => {
      if (!APP.selTextLabel) return;
      const tl = APP.textLabels[APP.selTextLabel];
      if (!tl) return;
      const el = _tlEl(APP.selTextLabel);
      if (el && el.contentEditable === 'true') {
        document.execCommand(cmd);
        tl.html = el.innerHTML;
        tl.text = el.textContent;
        _syncStyleButtons(el);
        setDirty();
      } else {
        pushUndo();
        tl[prop] = !tl[prop];
        document.getElementById(btnId).classList.toggle('active', tl[prop]);
        _applyTlStyles(APP.selTextLabel, el);
        setDirty();
      }
    });
  };

  document.getElementById('ip-tl-close')?.addEventListener('click', () => {
    clearSelTextLabel();
    if (typeof closePanel === 'function') closePanel();
  });

  _upd('ip-tl-text', (tl, elInput) => {
    tl.text = elInput.value;
    const dom = _tlEl(APP.selTextLabel);
    if (dom && dom.contentEditable !== 'true') {
      dom.textContent = tl.text;
      tl.html = dom.innerHTML; // properly HTML-escaped plain text
    }
  });

  document.getElementById('ip-tl-font')?.addEventListener('change', () => {
    if (!APP.selTextLabel) return;
    const tl = APP.textLabels[APP.selTextLabel];
    if (!tl) return;
    const value = document.getElementById('ip-tl-font').value;
    if (!value) return;
    pushUndo();
    const el = _tlEl(APP.selTextLabel);
    if (el && el.contentEditable === 'true') {
      // Apply only to current selection
      document.execCommand('fontName', false, value);
      tl.html = el.innerHTML;
      tl.text = el.textContent;
      setDirty();
    } else {
      tl.fontFamily = value;
      _applyTlStyles(APP.selTextLabel, el);
      setDirty();
    }
  });

  _upd('ip-tl-size', (tl, el) => {
    const sz = parseInt(el.value);
    if (sz >= 6 && sz <= 400) tl.fontSize = sz;
  });

  _upd('ip-tl-color', (tl, el) => { tl.color = el.value; });

  _tog('ip-tl-bold',      'bold',      'bold');
  _tog('ip-tl-italic',    'italic',    'italic');
  _tog('ip-tl-underline', 'underline', 'underline');

  document.getElementById('ip-tl-horiz')?.addEventListener('click', () => {
    if (!APP.selTextLabel) return;
    const tl = APP.textLabels[APP.selTextLabel];
    if (!tl) return;
    pushUndo();
    tl.orientation = 'horizontal';
    document.getElementById('ip-tl-horiz')?.classList.add('active');
    document.getElementById('ip-tl-vert')?.classList.remove('active');
    _applyTlStyles(APP.selTextLabel, _tlEl(APP.selTextLabel));
    setDirty();
  });

  document.getElementById('ip-tl-vert')?.addEventListener('click', () => {
    if (!APP.selTextLabel) return;
    const tl = APP.textLabels[APP.selTextLabel];
    if (!tl) return;
    pushUndo();
    tl.orientation = 'vertical';
    document.getElementById('ip-tl-vert')?.classList.add('active');
    document.getElementById('ip-tl-horiz')?.classList.remove('active');
    _applyTlStyles(APP.selTextLabel, _tlEl(APP.selTextLabel));
    setDirty();
  });

  document.getElementById('ip-tl-reset-size')?.addEventListener('click', () => {
    if (!APP.selTextLabel) return;
    const tl = APP.textLabels[APP.selTextLabel];
    if (!tl || !tl.width) return;
    pushUndo();
    tl.width = tl.height = null;
    tl.resizeMode = false;
    const el = _tlEl(APP.selTextLabel);
    if (el) {
      el.classList.remove('tl-resizing');
      _buildResizeHandles(APP.selTextLabel, el);
      _applyTlStyles(APP.selTextLabel, el);
    }
    document.getElementById('ip-tl-resize')?.classList.remove('active');
    document.getElementById('ip-tl-reset-size').disabled = true;
    setDirty();
  });

  document.getElementById('ip-tl-resize')?.addEventListener('click', () => {
    if (!APP.selTextLabel) return;
    const tl = APP.textLabels[APP.selTextLabel];
    if (!tl) return;
    const el = _tlEl(APP.selTextLabel);
    if (!el) return;
    pushUndo();
    tl.resizeMode = !tl.resizeMode;
    if (tl.resizeMode && !tl.width) {
      tl.width  = el.offsetWidth;
      tl.height = el.offsetHeight;
    }
    // dimensions conservées quand on désactive — seuls les handles disparaissent
    _applyTlStyles(APP.selTextLabel, el);
    _buildResizeHandles(APP.selTextLabel, el);
    document.getElementById('ip-tl-resize')?.classList.toggle('active', tl.resizeMode);
    setDirty();
  });

  document.getElementById('ip-tl-delete')?.addEventListener('click', () => {
    if (!APP.selTextLabel) return;
    showConfirm(t('delete_textlabel_confirm'), { danger: true }).then(ok => {
      if (ok) { pushUndo(); deleteTextLabel(APP.selTextLabel); }
    });
  });
}
