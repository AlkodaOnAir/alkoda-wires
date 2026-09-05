/* ═══════════════════════════════════════════════════════════════
   canvas.js — Pan / Zoom / Minimap
═══════════════════════════════════════════════════════════════ */

let _area, _root, _mmCanvas, _mmCtx;
let _areaRect    = null;
let _panStart    = null;
let _panMoved    = false;
let _mmRafId     = null;
let _marqueeStart = null; // canvas coords {x,y}
let _marqueeEl    = null;
let _marqueeMoved = false;
let _zoneDrag         = null; // { id, startX, startY, ox, oy, moved }
let _zoneJustSelected = false; // suppress click after zone selected in pointerdown
let _spaceDown        = false; // Espace tenu → pan partout (Mac trackpad)
let _wheelRaf         = null;
let _lastWheelT       = 0;
let _zoomHaloTmr      = null;
let _zoomOnCursor     = localStorage.getItem('wires-zoom-on-cursor') === '1'; // molette/trackpad : centré sur la souris (true) ou sur le viewport (false, défaut)
let _zoomGesture      = null; // mode curseur : point de référence figé pour tout un geste de zoom (voir le handler wheel)

const _EMPTY_TARGETS = new Set(['canvas-area', 'canvas-root', 'nodes-layer']);

// Appelé depuis nodes.js quand un déplacement d'appareil est bloqué (une route/
// chemin/segment anime, voir _isDimmingActive dans routes.js) : démarre un
// panoramique à la place, comme un clic sur le canevas vide — sans dépendre de la
// propagation de l'évènement, puisque le clic a eu lieu sur le nœud lui-même,
// jamais dans _EMPTY_TARGETS.
function startCanvasPanFromEvent(e) {
  _panStart = { x: e.clientX, y: e.clientY, px: APP.view.panX, py: APP.view.panY };
  _panMoved = false;
  _area.setPointerCapture(e.pointerId);
}

// Sécurité anti-régression de la suspension du halo #glow pendant un zoom actif (voir le
// handler 'wheel' plus bas) : window._zoomHaloSuppress = false dans la console désactive
// la suspension (le halo reste recomposé à chaque frame pendant le zoom, comme avant).
window._zoomHaloSuppress = window._zoomHaloSuppress !== false;

// Sécurité anti-régression du correctif de clignotement au zoom molette (throttle de
// updateAreaRect() + regroupement par frame de applyT(), voir le handler 'wheel' plus
// bas) : window._zoomRafCoalesce = false dans la console repasse instantanément à
// l'ancien comportement (rafraîchi et appliqué en synchrone à chaque tick de molette).
window._zoomRafCoalesce = window._zoomRafCoalesce !== false;

// Sécurité anti-régression du zoom proportionnel (voir le handler 'wheel') :
// window._zoomProportional = false dans la console rétablit l'ancien zoom par paliers
// fixes de 0,02 quantifiés au 1/50e, insensible à l'amplitude du geste.
window._zoomProportional = window._zoomProportional !== false;
// Sensibilité du zoom proportionnel, réglable en direct depuis la console
// (window._zoomSensitivity = 0.003 pour un zoom plus vif, 0.001 pour plus doux).
// 0,0024 (+20 % par rapport aux 0,002 d'origine, retenus après essais au
// trackpad) — environ 22 % par cran de molette classique.
window._zoomSensitivity = window._zoomSensitivity ?? 0.0024;

function initCanvas() {
  _area     = document.getElementById('canvas-area');
  _root     = document.getElementById('canvas-root');
  _mmCanvas = document.getElementById('mm-canvas');
  _mmCanvas.width  = 480;
  _mmCanvas.height = 270;
  _mmCtx = _mmCanvas.getContext('2d');
  _mmCtx.scale(3, 3);

  // Zoom molette centré sur le centre du viewport
  // ⚠️ window._zoomRafCoalesce (par défaut true) : getBoundingClientRect() (dans
  // updateAreaRect) force un recalcul de mise en page synchrone — inutile à chaque tick
  // de molette, la zone du canevas ne change pas pendant un geste de zoom. Rafraîchi une
  // seule fois au DÉBUT d'un geste (silence > 200ms depuis le tick précédent), pas à
  // chaque tick. L'écriture du transform (applyT) est en plus regroupée par frame
  // d'affichage, comme pour le survol/glissement — un geste de zoom fluide peut envoyer
  // des évènements plus vite qu'une frame.
  _area.addEventListener('wheel', e => {
    e.preventDefault();

    // Suspendre le halo #glow pendant un zoom actif (recomposition coûteuse à chaque
    // changement d'échelle) — purement visuel via une classe CSS, l'attribut filter réel
    // n'est jamais touché. Rétabli après une accalmie de 200ms (fin du geste de zoom).
    if (window._zoomHaloSuppress) {
      document.getElementById('cables-svg')?.classList.add('zoom-active');
      clearTimeout(_zoomHaloTmr);
      _zoomHaloTmr = setTimeout(() => {
        document.getElementById('cables-svg')?.classList.remove('zoom-active');
      }, 200);
    }

    const now = performance.now();
    const isNewGesture = !_areaRect || now - _lastWheelT > 200;
    if (window._zoomRafCoalesce) {
      if (isNewGesture) updateAreaRect();
    } else {
      updateAreaRect();
    }
    _lastWheelT = now;

    const areaCX = _areaRect.width  / 2;
    const areaCY = _areaRect.height / 2;
    const cursorX = e.clientX - _areaRect.left;
    const cursorY = e.clientY - _areaRect.top;

    // Zoom proportionnel à l'AMPLITUDE réelle du geste, et multiplicatif.
    // L'ancien calcul n'utilisait que le SENS de l'évènement (±0,02 par tick, arrondi
    // au 1/50e) : correct pour un cran net de molette, mais inadapté au trackpad, qui
    // envoie un flux d'évènements très fins et très rapides — chacun comptait alors
    // pour un cran entier, d'où un zoom brutal et insensible à la douceur du geste.
    // Multiplicatif (et non additif) pour que la sensation soit identique à 20 % comme
    // à 200 % : +2 % de zoom absolu est énorme quand on est dézoomé, imperceptible
    // quand on est zoomé. deltaMode 1 = lignes (souris classique), 0 = pixels (trackpad).
    let nz;
    if (window._zoomProportional) {
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      nz = Math.max(0.1, Math.min(4, APP.view.zoom * Math.exp(-dy * window._zoomSensitivity)));
    } else {
      const step = e.deltaY < 0 ? 0.02 : -0.02;
      nz = Math.max(0.1, Math.min(4, Math.round((APP.view.zoom + step) * 50) / 50));
    }
    if (nz === APP.view.zoom) return;

    // Alt+molette : centrage actif pour ce geste précis, sans toucher au réglage
    // permanent du bouton ⌖ (ni l'un ni l'autre ne s'excluent — Alt marche que
    // le bouton soit actif ou non). Alt plutôt que Ctrl : sur Mac, Ctrl+molette
    // est souvent capté par le zoom d'accessibilité système avant d'arriver ici.
    if (_zoomOnCursor || e.altKey) {
      // Point du canevas + position écran mémorisés UNE SEULE FOIS au début du
      // geste (pas à chaque cran) : sinon le recentrage repart d'un nouveau
      // point à chaque cran (molette/trackpad peut en envoyer des dizaines
      // pour un seul geste), et l'effet s'accumule bien au-delà de l'intention
      // — jusqu'à faire sortir le canevas du cadre. Le point ciblé reste donc
      // fixe pour tout le geste ; seule sa progression vers le centre avance,
      // en fonction du zoom cumulé depuis le DÉBUT du geste (pas du nombre de
      // crans, pour un résultat identique à la molette comme au trackpad).
      if (isNewGesture || !_zoomGesture) {
        _zoomGesture = {
          cx: (cursorX - APP.view.panX) / APP.view.zoom,
          cy: (cursorY - APP.view.panY) / APP.view.zoom,
          cursorX, cursorY,
          startZoom: APP.view.zoom,
        };
      }
      const progress = 1 - _zoomGesture.startZoom / nz;
      const destX = _zoomGesture.cursorX + (areaCX - _zoomGesture.cursorX) * progress;
      const destY = _zoomGesture.cursorY + (areaCY - _zoomGesture.cursorY) * progress;
      APP.view.panX = destX - nz * _zoomGesture.cx;
      APP.view.panY = destY - nz * _zoomGesture.cy;
    } else {
      const sc = nz / APP.view.zoom;
      APP.view.panX = areaCX - sc * (areaCX - APP.view.panX);
      APP.view.panY = areaCY - sc * (areaCY - APP.view.panY);
    }
    APP.view.zoom = nz;

    if (window._zoomRafCoalesce) {
      if (_wheelRaf) cancelAnimationFrame(_wheelRaf);
      _wheelRaf = requestAnimationFrame(() => { _wheelRaf = null; applyT(); });
    } else {
      applyT();
    }
  }, { passive: false });

  // Espace + drag gauche → pan partout, y compris au-dessus des nœuds (Mac trackpad)
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space' || e.repeat) return;
    if (e.target.closest('input, textarea, [contenteditable]')) return;
    e.preventDefault();
    _spaceDown = true;
    _area.style.cursor = 'grab';
  }, { capture: true });

  document.addEventListener('keyup', e => {
    if (e.code !== 'Space') return;
    _spaceDown = false;
    if (!_panStart) _area.style.cursor = '';
  });

  document.addEventListener('pointerdown', e => {
    if (!_spaceDown || e.button !== 0 || !_area.contains(e.target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    _panStart = { x: e.clientX, y: e.clientY, px: APP.view.panX, py: APP.view.panY };
    _panMoved = false;
    _area.style.cursor = 'grabbing';
    _area.setPointerCapture(e.pointerId);
  }, { capture: true });

  document.addEventListener('click', e => {
    if (_spaceDown) { e.stopImmediatePropagation(); e.preventDefault(); }
  }, { capture: true });

  // Pan : clic gauche ou droit ou milieu sur canvas vide | Marquee : Alt+clic gauche | Zone : clic gauche sur zone
  _area.addEventListener('pointerdown', e => {
    const onEmpty = _EMPTY_TARGETS.has(e.target.id);
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      _panStart = { x: e.clientX, y: e.clientY, px: APP.view.panX, py: APP.view.panY };
      _panMoved = false;
      _area.setPointerCapture(e.pointerId);
    } else if (e.button === 0 && onEmpty) {
      e.preventDefault();
      if (!e.altKey) {
        // Vérifier s'il y a une zone sous le curseur
        const pos     = screenToCanvas(e.clientX, e.clientY);
        const hitZone = typeof findZoneAtPoint === 'function' ? findZoneAtPoint(pos.x, pos.y) : null;
        if (hitZone) {
          if (typeof selectZone === 'function') selectZone(hitZone);
          _zoneJustSelected = true;
          const z = APP.zones[hitZone];
          if (z && !z.hidden) _zoneDrag = { id: hitZone, startX: e.clientX, startY: e.clientY, ox: z.x, oy: z.y, moved: false };
          _area.setPointerCapture(e.pointerId);
          return;
        }
      }
      if (e.altKey) {
        // Alt+clic gauche → marquee
        _marqueeStart = screenToCanvas(e.clientX, e.clientY);
        _marqueeMoved = false;
      } else {
        // Clic gauche sur canvas vide → pan
        _panStart = { x: e.clientX, y: e.clientY, px: APP.view.panX, py: APP.view.panY };
        _panMoved = false;
      }
      _area.setPointerCapture(e.pointerId);
    }
  });
  _area.addEventListener('pointermove', e => {
    if (_zoneDrag) {
      const dx = (e.clientX - _zoneDrag.startX) / APP.view.zoom;
      const dy = (e.clientY - _zoneDrag.startY) / APP.view.zoom;
      if (!_zoneDrag.moved && Math.hypot(dx, dy) < 4) return;
      if (!_zoneDrag.moved && typeof pushUndo === 'function') pushUndo();
      _zoneDrag.moved = true;
      const z = APP.zones[_zoneDrag.id];
      if (z) {
        z.x = _zoneDrag.ox + dx;
        z.y = _zoneDrag.oy + dy;
        const el = document.getElementById(`zone-${_zoneDrag.id}`);
        if (el) { el.style.left = z.x + 'px'; el.style.top = z.y + 'px'; }
      }
      _area.style.cursor = 'move';
      return;
    }
    if (_panStart) {
      const dx = e.clientX - _panStart.x;
      const dy = e.clientY - _panStart.y;
      if (!_panMoved && Math.hypot(dx, dy) < 4) return;
      _panMoved = true;
      APP.view.panX = _panStart.px + dx;
      APP.view.panY = _panStart.py + dy;
      _area.style.cursor = 'grabbing';
      applyT();
    }
    if (_marqueeStart) {
      const cur = screenToCanvas(e.clientX, e.clientY);
      const dx = Math.abs(cur.x - _marqueeStart.x), dy = Math.abs(cur.y - _marqueeStart.y);
      if (!_marqueeMoved && dx < 5 && dy < 5) return;
      _marqueeMoved = true;
      _area.style.cursor = 'crosshair';
      if (!_marqueeEl) {
        _marqueeEl = document.createElement('div');
        _marqueeEl.id = 'marquee-rect';
        _area.appendChild(_marqueeEl);
      }
      _updateMarqueeEl(_marqueeStart, cur);
    }
  });
  _area.addEventListener('pointerup', e => {
    if (_zoneDrag) {
      if (_zoneDrag.moved && typeof setDirty === 'function') setDirty();
      _zoneDrag = null;
      _area.releasePointerCapture(e.pointerId);
      _area.style.cursor = '';
      return;
    }
    if (_panStart) {
      _panStart = null;
      _area.releasePointerCapture(e.pointerId);
      _area.style.cursor = _spaceDown ? 'grab' : '';
    }
    if (_marqueeStart !== null) {
      const cur = screenToCanvas(e.clientX, e.clientY);
      if (_marqueeMoved) {
        _applyMarqueeSelect(_marqueeStart, cur);
      }
      _marqueeEl?.remove(); _marqueeEl = null;
      _area.releasePointerCapture(e.pointerId);
      _area.style.cursor = '';
      _marqueeStart = null;
    }
  });
  // Click sur canvas vide : bloquer si c'était un drag, sinon zone hit-test ou clear sélection
  _area.addEventListener('click', e => {
    if (_panMoved || _marqueeMoved || _zoneJustSelected) {
      _panMoved = false; _marqueeMoved = false; _zoneJustSelected = false;
      e.stopImmediatePropagation();
      return;
    }
    if (_EMPTY_TARGETS.has(e.target.id)) {
      const pos     = screenToCanvas(e.clientX, e.clientY);
      const hitZone = typeof findZoneAtPoint === 'function' ? findZoneAtPoint(pos.x, pos.y) : null;
      if (hitZone) {
        if (typeof selectZone === 'function') selectZone(hitZone);
        return;
      }
      const routesPanel = document.getElementById('routes-panel');
      if (routesPanel?.classList.contains('open') || window._routesPanelJustClosed) {
        window._routesPanelJustClosed = false;
        routesPanel?.classList.remove('open');
        return;
      }
      // Arrête l'animation active, quelle qu'elle soit — segment isolé, chemin
      // isolé ou route entière (un seul actif à la fois en pratique) — jusqu'ici
      // seule la route entière était prise en compte ici : un chemin ou un
      // segment isolé animait indéfiniment sans jamais réagir au clic sur le
      // canevas vide.
      if (_segAnim.cableId != null && typeof _stopSegAnimation === 'function') {
        _stopSegAnimation();
        if (typeof _updateTrace === 'function') _updateTrace();
        if (_activeRoutes.size) _restartAnimation();
        if (typeof renderRoutesList === 'function') renderRoutesList();
        return;
      }
      if (_tracedPathId && typeof _clearPathAnimation === 'function') {
        _clearPathAnimation();
        return;
      }
      if (typeof clearRouteTrace === 'function' && _activeRoutes.size > 0) {
        clearRouteTrace();
        return;
      }
      if (typeof clearSelMulti === 'function') clearSelMulti();
      if (typeof clearSel      === 'function') clearSel();
      if (typeof closePanel    === 'function') closePanel();
    }
  }, true);
  _area.addEventListener('dblclick', e => {
    if (!_EMPTY_TARGETS.has(e.target.id)) return;
    const pos     = screenToCanvas(e.clientX, e.clientY);
    const hitZone = typeof findZoneAtPoint === 'function' ? findZoneAtPoint(pos.x, pos.y) : null;
    if (hitZone && typeof bringZoneToFront === 'function') bringZoneToFront(hitZone);
  });
  _area.addEventListener('contextmenu', e => e.preventDefault());

  // Touch pinch-zoom
  let _touches = [], _pinchDist0 = 0, _zoom0 = 1;
  _area.addEventListener('touchstart', e => {
    _touches = [...e.touches];
    if (_touches.length === 2) {
      _pinchDist0 = Math.hypot(
        _touches[1].clientX - _touches[0].clientX,
        _touches[1].clientY - _touches[0].clientY
      );
      _zoom0 = APP.view.zoom;
    }
  }, { passive: true });
  _area.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const d = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      APP.view.zoom = Math.max(0.03, Math.min(4, _zoom0 * d / _pinchDist0));
      applyT();
    }
  }, { passive: false });

  // Drag sur minimap → naviguer en live
  let _mmDragging = false;
  const _mmNavigate = e => {
    const r = _mmCanvas.getBoundingClientRect();
    const sx = CW / 160, sy = CH / 90;
    const cx = (e.clientX - r.left) * sx;
    const cy = (e.clientY - r.top)  * sy;
    updateAreaRect();
    APP.view.panX = _areaRect.width  / 2 - cx * APP.view.zoom;
    APP.view.panY = _areaRect.height / 2 - cy * APP.view.zoom;
    applyT();
  };
  _mmCanvas.addEventListener('pointerdown', e => {
    _mmDragging = true;
    _mmCanvas.setPointerCapture(e.pointerId);
    _mmNavigate(e);
  });
  _mmCanvas.addEventListener('pointermove', e => {
    if (_mmDragging) _mmNavigate(e);
  });
  _mmCanvas.addEventListener('pointerup',   () => { _mmDragging = false; });
  _mmCanvas.addEventListener('pointercancel', () => { _mmDragging = false; });

  // Boutons toolbar zoom
  document.getElementById('btn-zoom-in') .addEventListener('click', () => dz(+0.02));
  document.getElementById('btn-zoom-out').addEventListener('click', () => dz(-0.02));

  // Bascule zoom molette/trackpad centré sur la souris — sans effet sur les boutons
  // +/- ci-dessus (au clic, la souris est sur le bouton, pas sur le canevas).
  const btnZoomCursor = document.getElementById('btn-zoom-cursor');
  btnZoomCursor.classList.toggle('active', _zoomOnCursor);
  btnZoomCursor.addEventListener('click', () => {
    _zoomOnCursor = !_zoomOnCursor;
    localStorage.setItem('wires-zoom-on-cursor', _zoomOnCursor ? '1' : '0');
    btnZoomCursor.classList.toggle('active', _zoomOnCursor);
    btnZoomCursor.blur(); // sinon garde le focus clavier et peut bloquer un raccourci (ex. F)
  });

  applyT();
  setTimeout(fitView, 50);
}

function updateAreaRect() {
  _areaRect = _area.getBoundingClientRect();
}

let _zoomLogTmr = null;
function applyT() {
  const { zoom, panX, panY } = APP.view;
  _root.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  document.documentElement.style.setProperty('--z-border', (2 / zoom).toFixed(3) + 'px');
  document.getElementById('zoom-val').textContent = Math.round(zoom * 100) + '%';
  // Bande de capture des câbles : largeur constante à l'écran au-delà de 100 %, donc à
  // réécrire quand le zoom bouge. Aucun redessin — un seul attribut par câble, et la
  // fonction sort d'elle-même si la largeur n'a pas changé (pan, zoom sous 100 %).
  if (typeof refreshCableHitWidths === 'function') refreshCableHitWidths();
  // Nom du type sous un point de connexion (mode ajouter un câble) : la distance qui
  // compte est celle À L'ÉCRAN entre deux ports, donc à recalculer à chaque zoom.
  if (typeof _refreshPortLabelCrowding === 'function') _refreshPortLabelCrowding();
  scheduleMinimap();
  clearTimeout(_zoomLogTmr);
  _zoomLogTmr = setTimeout(() => wLog('ZOOM', { pct: Math.round(zoom * 100) }), 600);
}

function dz(d) {
  updateAreaRect();
  const nz = Math.max(0.1, Math.min(4, Math.round((APP.view.zoom + d) * 50) / 50));
  const sc = nz / APP.view.zoom;
  const mx = _areaRect ? _areaRect.width  / 2 : 400;
  const my = _areaRect ? _areaRect.height / 2 : 300;
  APP.view.panX = mx - sc * (mx - APP.view.panX);
  APP.view.panY = my - sc * (my - APP.view.panY);
  APP.view.zoom = nz;
  applyT();
}

function fitView() {
  updateAreaRect();
  const sl = document.getElementById('sidebar-left');
  const leftOffset = sl?.classList.contains('pinned') ? 200 : 40;
  const ids   = Object.keys(APP.nodes);
  const zids  = Object.keys(APP.zones || {});
  const aW = _areaRect?.width  || 800;
  const aH = _areaRect?.height || 600;
  if (!ids.length && !zids.length) {
    APP.view.zoom = 1;
    APP.view.panX = leftOffset + (aW - leftOffset) / 2 - CW / 2;
    APP.view.panY = aH / 2 - CH / 2;
    applyT();
    return;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of Object.values(APP.nodes)) {
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + s.w);
    maxY = Math.max(maxY, s.y + s.h + 40);
  }
  for (const z of Object.values(APP.zones || {})) {
    minX = Math.min(minX, z.x);
    minY = Math.min(minY, z.y - 24); // 24px for zone label above
    maxX = Math.max(maxX, z.x + z.width);
    maxY = Math.max(maxY, z.y + z.height);
  }
  const pad = 80;
  const bw = maxX - minX + pad * 2;
  const bh = maxY - minY + pad * 2;
  const usableW = aW - leftOffset;
  const zoom = Math.min(usableW / bw, aH / bh, 2);
  APP.view.zoom = Math.max(0.15, zoom);
  APP.view.panX = leftOffset + usableW / 2 - (minX - pad + bw / 2) * zoom;
  APP.view.panY = aH / 2 - (minY - pad + bh / 2) * zoom;
  applyT();
}

// ── Marquee helpers ──────────────────────────────────────────
function _updateMarqueeEl(start, cur) {
  if (!_marqueeEl) return;
  // Convertir coords canvas → coords écran relatives à _area
  const toScreen = c => ({
    x: c.x * APP.view.zoom + APP.view.panX,
    y: c.y * APP.view.zoom + APP.view.panY,
  });
  const s = toScreen(start), e2 = toScreen(cur);
  const x = Math.min(s.x, e2.x), y = Math.min(s.y, e2.y);
  _marqueeEl.style.left   = x + 'px';
  _marqueeEl.style.top    = y + 'px';
  _marqueeEl.style.width  = Math.abs(e2.x - s.x) + 'px';
  _marqueeEl.style.height = Math.abs(e2.y - s.y) + 'px';
}

function _applyMarqueeSelect(start, end) {
  const x1 = Math.min(start.x, end.x), y1 = Math.min(start.y, end.y);
  const x2 = Math.max(start.x, end.x), y2 = Math.max(start.y, end.y);
  if (typeof clearSelMulti === 'function') clearSelMulti();
  if (typeof clearSel      === 'function') clearSel();
  if (typeof clearSelCable === 'function') clearSelCable();
  for (const [id, s] of Object.entries(APP.nodes)) {
    if (s.x < x2 && s.x + s.w > x1 && s.y < y2 && s.y + s.h > y1) {
      APP.selMulti.add(id);
      document.getElementById(`n-${id}`)?.classList.add('sel-multi');
    }
  }
  if (APP.selMulti.size === 1) {
    const id = [...APP.selMulti][0];
    clearSelMulti();
    selectNode(id);
  } else if (APP.selMulti.size > 1) {
    wLog('MARQUEE_SEL', { count: APP.selMulti.size });
    if (typeof openMultiPanel === 'function') openMultiPanel();
  }
}

// Coordonnées écran → canvas
function screenToCanvas(clientX, clientY) {
  updateAreaRect();
  return {
    x: (clientX - _areaRect.left - APP.view.panX) / APP.view.zoom,
    y: (clientY - _areaRect.top  - APP.view.panY) / APP.view.zoom,
  };
}

// ── Minimap ──────────────────────────────────────────────────
function scheduleMinimap() {
  if (_mmRafId) return;
  _mmRafId = requestAnimationFrame(() => {
    _mmRafId = null;
    drawMinimap();
  });
}

function drawMinimap() {
  if (!_mmCtx) return;
  const W = 160, H = 90;
  const sx = W / CW, sy = H / CH;

  _mmCtx.fillStyle = '#060810';
  _mmCtx.fillRect(0, 0, W, H);

  // Contenu de la minimap. `colored` = false → tout en gris neutre : sert à dessiner
  // ce qui est HORS du cadre de visualisation, pour que seule la portion réellement
  // affichée à l'écran garde ses couleurs (catégories, types de câble).
  const _drawContent = colored => {
    _mmCtx.lineWidth = 0.6;
    for (const c of APP.cables) {
      if (WIRELESS_TYPES.has(c.type)) continue; // pas de trajet pour un lien sans fil
      const pts = cableOverrides[c.id];
      if (!pts || pts.length < 2) continue;
      _mmCtx.strokeStyle = colored ? (c.color || '#888') + '88' : '#48546688';
      _mmCtx.beginPath();
      _mmCtx.moveTo(pts[0][0] * sx, pts[0][1] * sy);
      for (let i = 1; i < pts.length; i++) {
        _mmCtx.lineTo(pts[i][0] * sx, pts[i][1] * sy);
      }
      _mmCtx.stroke();
    }
    for (const s of Object.values(APP.nodes)) {
      const cat = getCat(s.cat);
      _mmCtx.fillStyle = colored ? (cat.color || '#888') + 'cc' : '#5a6678cc';
      _mmCtx.fillRect(s.x * sx, s.y * sy, s.w * sx, s.h * sy);
    }
  };

  // Cadre de visualisation (portion du canevas réellement à l'écran)
  updateAreaRect();
  const { zoom, panX, panY } = APP.view;
  const vx = -panX / zoom * sx;
  const vy = -panY / zoom * sy;
  const vw = (_areaRect?.width  || 800) / zoom * sx;
  const vh = (_areaRect?.height || 600) / zoom * sy;

  // Tout en gris d'abord, puis uniquement l'intérieur du cadre repassé en couleur.
  _drawContent(false);
  _mmCtx.save();
  _mmCtx.beginPath();
  _mmCtx.rect(vx, vy, vw, vh);
  _mmCtx.clip();
  _drawContent(true);
  _mmCtx.restore();

  _mmCtx.strokeStyle = 'rgba(0,212,255,.7)';
  _mmCtx.lineWidth = 1;
  _mmCtx.strokeRect(vx, vy, vw, vh);
}
