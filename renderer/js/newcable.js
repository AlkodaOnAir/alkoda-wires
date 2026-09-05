/* ═══════════════════════════════════════════════════════════════
   newcable.js — Mode "Add Cable" : clic direct sur les ports du canvas
═══════════════════════════════════════════════════════════════ */

let _cableAddMode = false;
let _cableAddFrom = null; // { nodeId, portId, type, nx, ny }

const _USB_FAMILY   = new Set(['USB-A', 'USB-C']);
function _usbCompat(a, b)   { return _USB_FAMILY.has(a)   && _USB_FAMILY.has(b); }

const _AUDIO_ANALOG = new Set(['Jack 3.5', 'Jack 6.35', 'RCA/Cinch', 'XLR']);
function _audioCompat(a, b) { return _AUDIO_ANALOG.has(a) && _AUDIO_ANALOG.has(b); }

// ── Griser l'option câble si aucun device (hors Internet) ────
function refreshAddCableBtn() {
  const btn = document.getElementById('add-dd-cable');
  if (!btn) return;
  const hasDevices = Object.values(APP.nodes).some(n => n.cat !== 'internet');
  btn.style.opacity       = hasDevices ? '' : '0.35';
  btn.style.pointerEvents = hasDevices ? '' : 'none';
  btn.title               = hasDevices ? '' : t('add_device_first');
}

// ── Init : dropdown bouton + ────────────────────────────────
function initNewCableModal() {
  const btn      = document.getElementById('btn-add-node');
  const dropdown = document.getElementById('add-dropdown');

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const r = btn.getBoundingClientRect();
    dropdown.style.left = r.left + 'px';
    dropdown.style.top  = (r.bottom + 4) + 'px';
    dropdown.classList.toggle('open');
  });
  document.addEventListener('click', () => dropdown.classList.remove('open'));

  document.getElementById('add-dd-device').addEventListener('click', () => {
    dropdown.classList.remove('open');
    _startAddDeviceFlow();
  });

  document.getElementById('add-dd-cable').addEventListener('click', () => {
    dropdown.classList.remove('open');
    _startCableAddMode();
  });

  document.getElementById('add-dd-label').addEventListener('click', () => {
    dropdown.classList.remove('open');
    startTextLabelPlaceMode();
  });
}

// ── Ports utilisés (side-aware pour les ports double) ────────
// `exclude` (optionnel) : { cableId, role } — l'extrémité en cours de glissement ne
// doit pas se compter elle-même comme occupante, sinon son propre port apparaîtrait
// plein et il deviendrait impossible de la reposer là où elle était.
function _usedPorts(exclude = null) {
  const used = new Set();
  APP.cables.forEach(c => {
    const skip = exclude && exclude.cableId === c.id;
    if (c.from && c.from_port && !(skip && exclude.role === 'from'))
      used.add(c.from_side ? `${c.from}:${c.from_port}:${c.from_side}` : `${c.from}:${c.from_port}`);
    if (c.to && c.to_port && !(skip && exclude.role === 'to'))
      used.add(c.to_side ? `${c.to}:${c.to_port}:${c.to_side}` : `${c.to}:${c.to_port}`);
  });
  return used;
}

// Vrai si toutes les entrées du port sont occupées
function _isPortFull(nodeId, port, used) {
  // Port sans fil : illimité par défaut (1 source → N destinations), pas de
  // notion d'IN/OUT à saturer — jamais "plein", quel que soit `port.dual`.
  if (typeof WIRELESS_TYPES !== 'undefined' && WIRELESS_TYPES.has(port.type)) return false;
  if (port.dual)
    return used.has(`${nodeId}:${port.id}:in`) && used.has(`${nodeId}:${port.id}:out`);
  return used.has(`${nodeId}:${port.id}`);
}

// ── Démarrer le mode câble ────────────────────────────────────
function _startCableAddMode() {
  const used = _usedPorts();
  const hasFree = Object.entries(APP.nodes).some(([id, n]) =>
    (n.ports || []).some(p => !_isPortFull(id, p, used))
  );
  if (!hasFree) {
    _showCableAddBanner(t('no_free_connectors'), true);
    return;
  }
  _cableAddMode = true;
  _cableAddFrom = null;
  wLog('CABLE_MODE_START', {});
  document.getElementById('canvas-area').classList.add('cable-add-mode');
  _refreshPortDotState();
  _showCableAddBanner(t('cable_mode_from'));
}

// ── Quitter le mode câble ─────────────────────────────────────
function exitCableAddMode() {
  if (!_cableAddMode) return;
  if (!_cableAddFrom) wLog('CABLE_MODE_CANCEL', {});
  _cableAddMode = false;
  _cableAddFrom = null;
  document.getElementById('dual-port-popup')?.remove();
  document.getElementById('canvas-area').classList.remove('cable-add-mode');
  _hideCableAddBanner();
  document.querySelectorAll('.port-dot-node').forEach(dot => {
    dot.classList.remove('cab-used', 'cab-mismatch', 'cab-selected', 'cab-clickable', 'cab-free');
  });
}

// ── Mettre à jour l'état visuel des dots ─────────────────────
function _refreshPortDotState() {
  const used = _usedPorts();
  for (const [sid, node] of Object.entries(APP.nodes)) {
    const el = document.getElementById(`n-${sid}`);
    if (!el) continue;
    (node.ports || []).forEach(p => {
      const dot = el.querySelector(`.port-dot-node[data-port-id="${p.id}"]`);
      if (!dot) return;
      const isFull     = _isPortFull(sid, p, used);
      const sameType   = _cableAddFrom ? (p.type === _cableAddFrom.type || _usbCompat(p.type, _cableAddFrom.type) || _audioCompat(p.type, _cableAddFrom.type)) : true;
      const isSelected = _cableAddFrom &&
                         _cableAddFrom.nodeId === sid &&
                         _cableAddFrom.portId === p.id;
      const isAvailable = !isFull && sameType && !isSelected;
      dot.classList.toggle('cab-used',      isFull);
      dot.classList.toggle('cab-selected',  isSelected);
      dot.classList.toggle('cab-mismatch',  !!_cableAddFrom && !isSelected && !sameType);
      dot.classList.toggle('cab-free',      isAvailable);
      dot.classList.toggle('cab-clickable', isAvailable);
      const lbl = el.querySelector(`.port-dot-type-lbl[data-port-id="${p.id}"]`);
      if (lbl) lbl.classList.toggle('lbl-available', isAvailable);
    });
  }
  _refreshPortLabelCrowding();
}

// ── Nom du type de port : cacher si un voisin AFFICHÉ est trop proche ────────
// N'entrent en compte que les ports actuellement cab-free/cab-clickable (les
// seuls dont le nom peut réellement s'afficher, voir main.css) — un port déjà
// utilisé ou de type incompatible n'affiche jamais son nom, donc ne peut jamais
// gêner celui d'un voisin. Distance mesurée À L'ÉCRAN (multipliée par le zoom
// courant), pas dans les coordonnées internes du canevas : sans ça, zoomer ne
// libérerait jamais de place puisque l'écart entre deux ports grandit avec le
// zoom exactement comme le reste du canevas. Rappelée à chaque changement d'état
// câble (ci-dessus) ET à chaque zoom/déplacement (canvas.js::applyT).
function _refreshPortLabelCrowding() {
  if (!_cableAddMode) return;
  const zoom = APP.view?.zoom || 1;
  const MIN_GAP_PX = 38; // ~taille d'un point sans fil (38px) — repère, pas une mesure exacte du texte
  for (const [sid, node] of Object.entries(APP.nodes)) {
    const el = document.getElementById(`n-${sid}`);
    if (!el || !node.ports || !node.ports.length) continue;
    const r = typeof _nodeImgRect === 'function' ? _nodeImgRect(node) : null;
    const shown = [];
    node.ports.forEach(p => {
      const lbl = el.querySelector(`.port-dot-type-lbl[data-port-id="${p.id}"]`);
      if (!lbl || !lbl.classList.contains('lbl-available')) return;
      shown.push({
        lbl,
        lx: r ? r.offX + p.nx * r.rW : p.nx * node.w,
        ly: r ? r.offY + p.ny * r.rH : p.ny * node.h + 3,
      });
    });
    shown.forEach(o1 => {
      const crowded = shown.some(o2 => o2 !== o1 && Math.hypot(o2.lx - o1.lx, o2.ly - o1.ly) * zoom < MIN_GAP_PX);
      o1.lbl.classList.toggle('label-crowded', crowded);
    });
  }
}

// ── Popup IN / OUT pour les ports double ─────────────────────
// onChosen(nodeId, portId, portType, nx, ny, side) optionnel : par défaut
// _onPortSideChosen (mode "Ajouter un câble"). Permet de réutiliser cette même
// popup ailleurs (ex: rattachement d'un câble orphelin, cables.js) sans dupliquer
// l'UI — c'est le principe de base attendu pour tout branchement sur un port double.
function _showDualPortPopup(e, nodeId, portId, portType, nx, ny, usedSides, onChosen) {
  document.getElementById('dual-port-popup')?.remove();
  const chosen = onChosen || _onPortSideChosen;

  const popup = document.createElement('div');
  popup.id = 'dual-port-popup';
  popup.style.cssText = `
    position:fixed;left:${e.clientX + 12}px;top:${e.clientY - 10}px;
    background:#0a0f1e;border:1px solid #1e2d45;border-radius:6px;
    overflow:hidden;z-index:99999;width:72px;
    box-shadow:0 4px 16px rgba(0,0,0,.6);
  `;

  const btns = [];
  ['in', 'out'].forEach((side, i) => {
    const occupied = usedSides.has(side);
    const activeColor = side === 'in' ? '#00d4ff' : '#b8ccec';
    const btn = document.createElement('div');
    btn.dataset.side = side;
    btn.dataset.occupied = occupied ? '1' : '';
    btn.dataset.activeColor = occupied ? '#2a3a55' : activeColor;
    btn.style.cssText = `
      padding:10px 0;text-align:center;
      font-family:var(--mono);font-size:13px;font-weight:500;letter-spacing:1px;
      cursor:${occupied ? 'default' : 'pointer'};
      color:${occupied ? '#2a3a55' : activeColor};
      text-decoration:${occupied ? 'line-through' : 'none'};
      transition:color .1s, background .1s;
      ${i === 0 ? 'border-bottom:1px solid #1e2d45;' : ''}
    `;
    btn.textContent = side.toUpperCase();
    if (!occupied) {
      const hoverBg = side === 'in' ? 'rgba(0,212,255,.18)' : 'rgba(184,204,236,.12)';
      btn.addEventListener('mouseenter', () => {
        btn.style.background = hoverBg;
        btn.style.color = '#00d4ff';
        btns.forEach(b => { if (b !== btn && !b.dataset.occupied) b.style.color = '#2a3a55'; });
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = '';
        btns.forEach(b => { if (!b.dataset.occupied) b.style.color = b.dataset.activeColor; });
      });
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        popup.remove();
        chosen(nodeId, portId, portType, nx, ny, side);
      });
    }
    btns.push(btn);
    popup.appendChild(btn);
  });

  document.body.appendChild(popup);
  setTimeout(() => {
    const dismiss = () => { popup.remove(); document.removeEventListener('click', dismiss); };
    document.addEventListener('click', dismiss);
  }, 0);
}

// ── Logique commune après choix du side (ou port simple) ─────
function _onPortSideChosen(nodeId, portId, portType, nx, ny, side) {
  if (!_cableAddFrom) {
    _cableAddFrom = { nodeId, portId, type: portType, nx, ny, side: side || null };
    _refreshPortDotState();
    _showCableAddBanner(`<span style="color:${(CABLE_META[portType]||{}).color||'#00d4ff'}">${escapeHtml(tType(portType))}</span>${t('cable_mode_to_suffix')}`);
  } else {
    if (portType !== _cableAddFrom.type && !_usbCompat(portType, _cableAddFrom.type) && !_audioCompat(portType, _cableAddFrom.type)) return;
    const toNode = APP.nodes[nodeId];
    const toPort = (toNode?.ports || []).find(p => p.id === portId);
    pushUndo();
    createCable(
      _cableAddFrom.nodeId, nodeId,
      _cableAddFrom.type,
      _cableAddFrom.portId, portId,
      {
        from_nx:   _cableAddFrom.nx, from_ny: _cableAddFrom.ny,
        to_nx:     toPort ? toPort.nx : nx,
        to_ny:     toPort ? toPort.ny : ny,
        from_side: _cableAddFrom.side,
        to_side:   side || null,
      }
    );
    exitCableAddMode();
  }
}

// ── Clic sur un dot de port ───────────────────────────────────
function _onPortDotClick(e, nodeId, portId, portType, nx, ny, isDual) {
  if (!_cableAddMode) {
    // Port sans fil hors mode ajout de câble : pas de tracé à cliquer pour ouvrir
    // son panneau (comme un câble physique) — le port lui-même est le seul point
    // d'entrée. Sans stopPropagation ici, le clic remonte au nœud et ouvre à la
    // place le panneau de l'appareil.
    if (typeof WIRELESS_TYPES !== 'undefined' && WIRELESS_TYPES.has(portType)) {
      const cab = APP.cables.find(c =>
        (c.from === nodeId && c.from_port === portId) ||
        (c.to   === nodeId && c.to_port   === portId)
      );
      if (cab) { e.stopPropagation(); openCablePanel(cab.id); }
    }
    return;
  }
  e.stopPropagation();

  // Sans fil : ni IN/OUT ni limite d'occupant — juste source puis destination,
  // comme un port simple, mais jamais bloqué (1 source → N destinations, ou l'inverse).
  if (typeof WIRELESS_TYPES !== 'undefined' && WIRELESS_TYPES.has(portType)) {
    _onPortSideChosen(nodeId, portId, portType, nx, ny, null);
    return;
  }

  const used = _usedPorts();

  if (isDual && APP.nodes[nodeId]?.cat !== 'internet') {
    const usedSides = new Set();
    if (used.has(`${nodeId}:${portId}:in`))  usedSides.add('in');
    if (used.has(`${nodeId}:${portId}:out`)) usedSides.add('out');
    if (usedSides.size === 2) return; // les deux côtés occupés
    _showDualPortPopup(e, nodeId, portId, portType, nx, ny, usedSides);
    return;
  }

  // Port simple
  if (used.has(`${nodeId}:${portId}`)) return;
  _onPortSideChosen(nodeId, portId, portType, nx, ny, null);
}

// ── Bandeau d'instruction ─────────────────────────────────────
function _showCableAddBanner(msg, autoHide = false) {
  let banner = document.getElementById('cable-add-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'cable-add-banner';
    document.body.appendChild(banner);
  }
  banner.innerHTML = msg + (autoHide
    ? ''
    : ` <button class="cab-cancel-btn" onclick="exitCableAddMode()">✕ ${t('cancel')}</button>`);
  banner.classList.add('visible');
  if (autoHide) {
    setTimeout(() => banner.classList.remove('visible'), 2000);
  }
}

// Ré-affiche le texte du bandeau dans la langue courante, sans changer l'état
// (appelé par setLang() car ce bandeau est injecté en JS, pas via data-i18n).
function _refreshCableAddBanner() {
  if (!_cableAddMode) return;
  if (_cableAddFrom) {
    _showCableAddBanner(`<span style="color:${(CABLE_META[_cableAddFrom.type]||{}).color||'#00d4ff'}">${escapeHtml(tType(_cableAddFrom.type))}</span>${t('cable_mode_to_suffix')}`);
  } else {
    _showCableAddBanner(t('cable_mode_from'));
  }
}

function _hideCableAddBanner() {
  const banner = document.getElementById('cable-add-banner');
  if (banner) banner.classList.remove('visible');
}
