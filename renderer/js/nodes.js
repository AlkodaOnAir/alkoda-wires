/* ═══════════════════════════════════════════════════════════════
   nodes.js — Rendu DOM nœuds, drag, resize, labels
═══════════════════════════════════════════════════════════════ */

const MIN_W = 40, MIN_H = 30;

// Sécurité anti-régression du correctif de redimensionnement (patch en place des câbles
// connectés plutôt que réinitialisation totale du cache de tracé, voir setupResizeHandle) :
// window._resizePatchCables = false dans la console repasse instantanément à l'ancien
// comportement (recalcul complet de TOUS les câbles du projet à chaque redimensionnement).
window._resizePatchCables = window._resizePatchCables !== false;

// ── Icônes des ports sans fil (WiFi/Bluetooth/HF) ─────────────
// Purement décoratif — voir _placeDots(). Couleur du trait choisie pour contraster
// avec le fond du dot (couleur du type, voir CABLE_META dans app.js).
// pointer-events:none sur l'icône elle-même : un SVG en traits seuls (fill="none")
// ne capte nativement les clics que sur les traits peints eux-mêmes (comportement
// par défaut des SVG), pas sur toute sa zone visuelle — sans ça, la zone cliquable
// réelle se limite aux quelques pixels du trait au lieu de tout le point de connexion.
function _wirelessIconHTML(type) {
  if (type === 'WiFi') {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0a0f1e" stroke-width="2.2" stroke-linecap="round" style="pointer-events:none">
      <path d="M2 9a14.14 14.14 0 0 1 20 0"/>
      <path d="M6 13a8.5 8.5 0 0 1 12 0"/>
      <path d="M10 17a3 3 0 0 1 4 0"/>
      <circle cx="12" cy="20" r="1.4" fill="#0a0f1e" stroke="none"/>
    </svg>`;
  }
  if (type === 'Bluetooth') {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" style="pointer-events:none">
      <path d="M6.5 6.5L17.5 17.5L12 23V1L17.5 6.5L6.5 17.5"/>
    </svg>`;
  }
  // HF : pas de logo universel pour cette catégorie — badge texte.
  return `<span style="font-size:10px;font-weight:700;color:#ffffff;font-family:var(--mono,monospace);letter-spacing:.3px;pointer-events:none">HF</span>`;
}

// ── Internet node — icône SVG globe embarquée ─────────────────
const _INTERNET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><circle cx="80" cy="80" r="64" fill="#001a2e" stroke="#00aaff" stroke-width="3.5"/><ellipse cx="80" cy="80" rx="28" ry="64" fill="none" stroke="#00aaff" stroke-width="2.5" opacity="0.75"/><line x1="16" y1="80" x2="144" y2="80" stroke="#00aaff" stroke-width="2.5" opacity="0.75"/><path d="M20 54 Q80 38 140 54" fill="none" stroke="#00aaff" stroke-width="2" opacity="0.65"/><path d="M20 106 Q80 122 140 106" fill="none" stroke="#00aaff" stroke-width="2" opacity="0.65"/></svg>`;
const _INTERNET_IMG = `data:image/svg+xml,${encodeURIComponent(_INTERNET_SVG)}`;

// ── Ajouter le nœud Internet s'il n'existe pas encore ─────────
function _ensureInternetNode() {
  const hasInternet = Object.values(APP.nodes).some(n => n.cat === 'internet');
  if (hasInternet) return;
  const id = uuid();
  APP.nodes[id] = {
    id,
    name: 'Internet', short: 'Internet',
    cat: 'internet', virtual: true,
    img: _INTERNET_IMG, img_original: _INTERNET_IMG,
    desc: '', desc_en: '',
    x: 230, y: 520, w: 60, h: 50,
    cx: 260, cy: 545,
    bb: { left: 0, right: 1, top: 0, bottom: 1 },
    stub: null,
    ports: [{ id: 'rj45', type: 'RJ45', nx: 0.5, ny: 0.02, dual: true }],
    zindex: 1,
  };
  CM[id] = [];
}

// ── Mettre à jour l'apparence grisée des nœuds Internet ───────
function _updateInternetNodes() {
  for (const [id, n] of Object.entries(APP.nodes)) {
    if (n.cat !== 'internet') continue;
    const el = document.getElementById(`n-${id}`);
    if (!el) continue;
    const connected = CM[id] && CM[id].length > 0;
    el.classList.toggle('internet-disconnected', !connected);
  }
}

// ── Créer un nouveau nœud depuis un équipement de la lib ──────
function createNode(equipment, canvasX, canvasY) {
  pushUndo();
  const id = uuid();
  const w = equipment.w || 240;
  const h = equipment.h || 120;
  const node = {
    id,
    name:    equipment.name,
    short:   equipment.short || equipment.name,
    _nameEd: false,
    _shortEd: false,
    cat:     equipment.cat || 'video',
    img:          equipment.img || null,
    img_original: equipment.img_original || null,
    // Tolérance de détourage : la bibliothèque la mémorise depuis toujours, mais
    // elle n'était jamais reportée sur l'appareil placé. Deux effets, tous deux
    // constatés : Configuration image rouvrait sur la valeur par défaut au lieu
    // de celle réglée pour cet appareil, et l'appareil n'ayant aucune tolérance
    // enregistrée, la fenêtre ne détectait plus qu'on y touchait.
    // `?? null` et non `|| null` : une tolérance de 0 est une valeur légitime.
    rmbg_tol:     equipment.rmbg_tol ?? null,
    // Recadrage ajusté à la main, en fractions (0..1). Même raison : sans lui,
    // rouvrir Configuration image recalcule le cadre automatique et écrase
    // l'ajustement.
    rmbg_crop:    equipment.rmbg_crop || null,
    desc:    equipment.desc || '',
    desc_en: equipment.desc_en || '',
    x: Math.round(canvasX - w / 2),
    y: Math.round(canvasY - h / 2),
    w, h,
    cx: 0, cy: 0,
    bb:         equipment.bb || { left: 0, right: 1, top: 0, bottom: 1 },
    bbAuto:     !!equipment.bbAuto, // sinon recalculé au chargement de l'image (voir renderOneNode)
    stub:       equipment.stub || null,
    ports:      equipment.ports ? equipment.ports.map(p => ({ ...p })) : [],
    shape:      equipment.shape || null,
    shapeColor: equipment.shapeColor || null,
    zindex: 1,
  };
  node.cx = node.x + node.w / 2;
  node.cy = node.y + node.h / 2;

  APP.nodes[id] = node;
  CM[id] = [];

  renderOneNode(id);
  rebuildCM();
  renderCables(); // recalcul complet (nouveau obstacle)
  if (typeof refreshSidebar === 'function') refreshSidebar();
  setDirty();
  return id;
}

// ── Rendu de TOUS les nœuds ───────────────────────────────────
function renderNodes() {
  const nodesLayer  = document.getElementById('nodes-layer');
  const labelsLayer = document.getElementById('node-labels-layer');
  nodesLayer .innerHTML = '';
  labelsLayer.innerHTML = '';
  for (const id of Object.keys(APP.nodes)) {
    renderOneNode(id);
  }
}

// ── Rendu d'UN nœud ──────────────────────────────────────────
function renderOneNode(sid) {
  const s = APP.nodes[sid];
  if (!s) return;
  s.id = sid;
  s.cx = s.x + s.w / 2;
  s.cy = s.y + s.h / 2;

  const cat = getCat(s.cat);

  // Supprimer ancien DOM si existe
  document.getElementById(`n-${sid}`)?.remove();
  document.getElementById(`nl-${sid}`)?.remove();

  // ── Nœud ────────────────────────────────────────────────
  const el = document.createElement('div');
  el.className = 'node';
  el.id = `n-${sid}`;
  el.style.cssText = `left:${s.x}px;top:${s.y}px;width:${s.w}px;height:${s.h + 40}px;z-index:${s.zindex || 1}`;

  const box = document.createElement('div');
  box.className = 'node-box';
  box.style.cssText = `width:${s.w}px;height:${s.h}px`;

  const catbar = document.createElement('div');
  catbar.className = 'node-catbar';
  catbar.style.background = cat.color;

  const imgWrap = document.createElement('div');
  imgWrap.className = 'node-img-wrap';
  imgWrap.style.cssText = `width:${s.w}px;height:${s.h - 3}px`;

  if (s.img) {
    const img = document.createElement('img');
    img.src = s.img;
    img.alt = s.name;
    img.draggable = false;
    imgWrap.appendChild(img);
  } else {
    // Placeholder visuel quand pas d'image
    imgWrap.style.background = cat.color + '22';
    imgWrap.style.display = 'flex';
    imgWrap.style.alignItems = 'center';
    imgWrap.style.justifyContent = 'center';
    imgWrap.style.flexDirection = 'column';
    imgWrap.style.gap = '6px';

    const icon = document.createElement('div');
    icon.style.cssText = `
      width:48px;height:48px;border-radius:8px;
      background:${cat.color}33;border:1px solid ${cat.color}55;
      display:flex;align-items:center;justify-content:center;
      font-size:22px;
    `;
    icon.textContent = _catIcon(s.cat);

    const nameEl = document.createElement('div');
    nameEl.style.cssText = `
      font-family:var(--mono);font-size:11px;color:${cat.color};
      letter-spacing:1px;text-align:center;padding:0 8px;max-width:${s.w - 16}px;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    `;
    nameEl.textContent = s.short || s.name;

    imgWrap.appendChild(icon);
    imgWrap.appendChild(nameEl);
  }

  box.appendChild(catbar);
  box.appendChild(imgWrap);

  // ── Dots de port ──────────────────────────────────────────
  // Couche dédiée, SŒUR de .node-box et non enfant : .node-box rogne son contenu
  // (overflow:hidden, pour les coins arrondis de l'image), ce qui coupait la moitié
  // d'un point de connexion posé au bord de l'image. Placée aux mêmes coordonnées,
  // elle suit le léger soulèvement au survol via sa propre règle CSS (.node-ports).
  const portsLayer = document.createElement('div');
  portsLayer.className = 'node-ports';
  portsLayer.style.cssText = `position:absolute;left:0;top:0;width:${s.w}px;height:${s.h}px;pointer-events:none`;

  // Placement différé après chargement image (pour connaître les dimensions naturelles)
  function _placeDots() {
    portsLayer.querySelectorAll('.port-dot-node').forEach(d => d.remove());
    if (!s.ports || !s.ports.length) return;
    const r = _nodeImgRect(s);
    s.ports.forEach(p => {
      const _orphan  = !isKnownCableType(p.type);
      const _wireless = !_orphan && WIRELESS_TYPES.has(p.type);
      const color = _orphan ? '#1e2535' : (getCableMeta(p.type).color || '#00d4ff');
      const dot = document.createElement('div');
      dot.className = 'port-dot-node' + (_wireless ? ' port-wireless' : '');
      dot.dataset.portId   = p.id;
      dot.dataset.portType = p.type;
      dot.dataset.nodeId   = sid;
      dot.dataset.dual     = p.dual ? 'true' : '';
      const lx = r ? r.offX + p.nx * r.rW : p.nx * s.w;
      const ly = r ? r.offY + p.ny * r.rH : p.ny * s.h + 3;
      // Pas d'anneau IN/OUT sur un port sans fil pour l'instant : sa logique de
      // connexion (double occupant, IN/OUT) n'est pas encore branchée (tâche séparée).
      const dualRing = (_orphan || _wireless) ? 'box-shadow:none;' : (p.dual ? `box-shadow:0 0 0 2px #0a0f1e,0 0 0 4px ${color};` : `box-shadow:0 0 6px ${color}99;`);
      // Zone cliquable un peu plus large que les ports physiques (30px) : un port sans
      // fil est le SEUL élément interactif de sa connexion (pas de tracé de câble en
      // secours à cliquer à côté), une cible plus généreuse est donc justifiée ici.
      const dotSize = _wireless ? 38 : 30;
      dot.style.cssText = `
        position:absolute;
        left:${lx}px;
        top:${ly}px;
        width:${dotSize}px;height:${dotSize}px;
        background:${color};border:${_orphan ? '1px dashed #555' : 'none'};border-radius:50%;
        transform:translate(-50%,-50%);
        display:flex;align-items:center;justify-content:center;
        ${dualRing}
        z-index:5;
      `;
      if (_orphan) {
        dot.innerHTML = `<span style="font-size:13px;color:#555;line-height:1">✕</span>`;
      } else if (_wireless) {
        dot.innerHTML = _wirelessIconHTML(p.type);
      }
      // Nom du type de port : frère du point dans portsLayer, PAS enfant du point —
      // .port-dot-node.cab-clickable/cab-free applique clip-path:circle() (cercle de
      // hit-test précis, voir main.css) qui rogne aussi tout contenu enfant, donc un
      // nom imbriqué dans le point est invisible même avec display:block. Toujours
      // créé ; sa visibilité réelle (port cible disponible ET assez de place à l'écran
      // par rapport à ses voisins également affichés) est pilotée depuis newcable.js
      // via les classes lbl-available (_refreshPortDotState) et label-crowded
      // (_refreshPortLabelCrowding), rappelées à chaque changement d'état câble et à
      // chaque zoom/déplacement (canvas.js::applyT). Décalage vertical plus grand pour
      // un port double, pour dégager son anneau (box-shadow, hors gabarit du point).
      if (!_orphan) {
        const lbl = document.createElement('div');
        lbl.className = 'port-dot-type-lbl';
        lbl.dataset.portId = p.id;
        lbl.textContent = tType(p.type);
        lbl.style.cssText = `
          position:absolute;left:${lx}px;top:${ly + dotSize / 2 + (p.dual ? 8 : 3)}px;
          transform:translateX(-50%);
          white-space:nowrap;pointer-events:none;
          font-family:var(--mono);font-size:10px;color:${color};
          z-index:6;
        `;
        portsLayer.appendChild(lbl);
      }
      // Lien sans fil : aucun tracé n'est dessiné, ce symbole est donc le seul point
      // d'entrée de la connexion. Il porte les deux gestes qu'un câble physique porte
      // sur son tracé — simple clic pour ouvrir le panneau, double-clic pour animer
      // les routes qui l'utilisent. D'où le délai sur le simple clic, repris du câble :
      // sans lui, le panneau s'ouvrirait avant que le second clic n'arrive.
      let _dotClickTimer = null;
      dot.addEventListener('click', e => {
        const debounce = _wireless && !_cableAddMode;
        if (!debounce) {
          if (typeof _onPortDotClick === 'function') _onPortDotClick(e, sid, p.id, p.type, p.nx, p.ny, !!p.dual);
          return;
        }
        e.stopPropagation();
        clearTimeout(_dotClickTimer);
        _dotClickTimer = setTimeout(() => {
          if (typeof _onPortDotClick === 'function') _onPortDotClick(e, sid, p.id, p.type, p.nx, p.ny, !!p.dual);
        }, 220);
      });
      if (_wireless) {
        dot.addEventListener('dblclick', e => {
          // stopPropagation sinon le double-clic remonte à l'appareil, dont le
          // gestionnaire ouvre la fenêtre de configuration d'image.
          e.stopPropagation();
          clearTimeout(_dotClickTimer);
          if (_cableAddMode) return;
          const cab = APP.cables.find(c =>
            (c.from === sid && c.from_port === p.id) ||
            (c.to   === sid && c.to_port   === p.id)
          );
          if (cab && typeof toggleRoutesUsingCable === 'function') toggleRoutesUsingCable(cab.id);
        });
      }
      portsLayer.appendChild(dot);
    });
  }

  if (s.img) {
    // L'image est déjà dans le DOM (imgWrap) — attendre qu'elle soit chargée
    const imgEl = imgWrap.querySelector('img');
    const _onLoad = () => {
      s._imgW = imgEl.naturalWidth;
      s._imgH = imgEl.naturalHeight;

      // Migration ponctuelle du cadre de contenu (bb) : historiquement il valait une
      // constante (PNG entier, ou 2 % de marge) au lieu du contour réellement opaque,
      // ce qui faisait contourner les câbles au ras du cadre d'image plutôt qu'au ras
      // de l'appareil visible. Recalculé ici une seule fois par appareil, au chargement
      // de son image (déjà décodée à cet instant, donc quasi gratuit), puis marqué
      // bbAuto pour ne plus jamais y revenir — y compris après enregistrement, la
      // propriété étant sauvegardée dans le .wires. Volontairement SANS setDirty :
      // ouvrir un projet ne doit pas le marquer comme modifié.
      if (!s.bbAuto) {
        s.bb = s.shape
          ? { left: 0, right: 1, top: 0, bottom: 1 } // une forme remplit son PNG
          : (typeof _alphaBBFromImage === 'function' ? _alphaBBFromImage(imgEl) : s.bb);
        s.bbAuto = true;
      }
      // Auto-fit height to image aspect ratio unless user manually resized
      if (!s.hManual && s._imgW && s._imgH) {
        const naturalH = Math.max(MIN_H, Math.round(s.w * s._imgH / s._imgW));
        if (naturalH !== s.h) {
          s.h = naturalH;
          s.cy = s.y + s.h / 2;
          el.style.height         = (s.h + 40) + 'px';
          box.style.height        = s.h + 'px';
          imgWrap.style.height    = (s.h - 3) + 'px';
          portsLayer.style.height = s.h + 'px';
          _updateLblPos(sid);
          // Ports have moved → invalidate all overrides for connected cables
          for (const c of (APP?.cables || [])) {
            if (c.from === sid || c.to === sid) delete cableOverrides[c.id];
          }
          setDirty();
        }
      }
      _placeDots();
      // Recalculate cables whose endpoints have drifted from the now-correct port positions.
      // Delete the whole override (not just snap endpoints) so BFS recomputes a clean path.
      let needRedraw = false;
      for (const c of (APP?.cables || [])) {
        if (c.from !== sid && c.to !== sid) continue;
        const pts = cableOverrides[c.id];
        if (!pts || pts.length < 2) {
          if ((c.from === sid && c.from_nx != null) || (c.to === sid && c.to_nx != null)) {
            delete cableOverrides[c.id];
            needRedraw = true;
          }
          continue;
        }
        let stale = false;
        if (c.from === sid && c.from_nx != null) {
          const ep = edgePtFixed(s, c.from_nx, c.from_ny);
          if (Math.abs(pts[0][0] - ep[0]) > 1 || Math.abs(pts[0][1] - ep[1]) > 1) stale = true;
        }
        if (c.to === sid && c.to_nx != null) {
          const ep = edgePtFixed(s, c.to_nx, c.to_ny);
          const last = pts.length - 1;
          if (Math.abs(pts[last][0] - ep[0]) > 1 || Math.abs(pts[last][1] - ep[1]) > 1) stale = true;
        }
        if (stale) { delete cableOverrides[c.id]; needRedraw = true; }
      }
      if (needRedraw && typeof renderCables === 'function') renderCables();
    };
    if (imgEl && imgEl.complete && imgEl.naturalWidth) {
      _onLoad();
    } else if (imgEl) {
      imgEl.addEventListener('load', _onLoad, { once: true });
      // Fallback si déjà chargée avant le listener
      if (imgEl.complete && imgEl.naturalWidth) _onLoad();
    }
  } else {
    _placeDots(); // pas d'image → fallback immédiat
  }

  el.appendChild(box);
  el.appendChild(portsLayer); // après box : les ports passent au-dessus de l'image

  document.getElementById('nodes-layer').appendChild(el);

  // ── Label (dans node-labels-layer) ──────────────────────
  const lbl = document.createElement('div');
  lbl.className = 'node-lbl';
  lbl.id = `nl-${sid}`;
  lbl.contentEditable = 'true';
  lbl.spellcheck = false;
  lbl.textContent = s.short || s.name;
  lbl.style.color = cat.color;
  lbl.style.fontSize = (s.lblSize || 48) + 'px';
  _updateLblPos(sid, lbl);

  let _lblOld = lbl.textContent;
  lbl.addEventListener('focus', () => {
    _lblOld = lbl.textContent.trim();
    window._activeNodeLbl = lbl;
  });
  lbl.addEventListener('input', () => {
    s.short = lbl.textContent.trim();
    s._shortEd = true;
    setDirty();
  });
  lbl.addEventListener('blur', () => {
    if (window._activeNodeLbl === lbl) window._activeNodeLbl = null;
    window.getSelection()?.removeAllRanges();
    const nv = lbl.textContent.trim();
    if (nv !== _lblOld) wLog('NODE_RENAME', { id: sid, from: _lblOld, to: nv });
    _lblOld = nv;
  });
  lbl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); lbl.blur(); }
  });

  // ── Resize handle ────────────────────────────────────────
  const nlRh = document.createElement('div');
  nlRh.className = 'node-lbl-rh';
  lbl.appendChild(nlRh);
  let _lblResz = null;
  nlRh.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    pushUndo();
    _lblResz = { startX: e.clientX, startY: e.clientY, startSize: s.lblSize || 48 };
    nlRh.setPointerCapture(e.pointerId);
  });
  nlRh.addEventListener('pointermove', e => {
    if (!_lblResz) return;
    const delta = (_lblResz.startX - e.clientX + _lblResz.startY - e.clientY) / APP.view.zoom;
    const sz = Math.max(8, Math.min(200, Math.round(_lblResz.startSize + delta * 0.5)));
    s.lblSize = sz;
    lbl.style.fontSize = sz + 'px';
  });
  nlRh.addEventListener('pointerup', () => {
    if (_lblResz) { setDirty(); _lblResz = null; }
  });

  // ── Exit édition au clic hors du label (une seule fois globale) ──
  if (!window._nodeLblBlurInit) {
    window._nodeLblBlurInit = true;
    document.addEventListener('pointerdown', e => {
      const lbl = window._activeNodeLbl;
      if (lbl && !lbl.contains(e.target)) lbl.blur();
    }, true);
  }

  document.getElementById('node-labels-layer').appendChild(lbl);

  // Sync classes label ↔ nœud via MutationObserver
  const obs = new MutationObserver(() => {
    const node = document.getElementById(`n-${sid}`);
    if (!node || !lbl) return;
    ['sel','lit','dim','route-dim'].forEach(cls => {
      lbl.classList.toggle(cls, node.classList.contains(cls));
    });
    // Couleur quand sélectionné
    if (node.classList.contains('sel')) lbl.style.color = '#fff';
    else lbl.style.color = getCat(APP.nodes[sid]?.cat).color;
  });
  obs.observe(el, { attributes: true, attributeFilter: ['class'] });

  // ── Drag nœud ────────────────────────────────────────────
  setupNodeDrag(el, sid);

  // ── Click : sélection (débounce pour ne pas déclencher sur dblclick) ──
  let _clickTimer = null;
  el.addEventListener('click', e => {
    // Ignore si c'était un drag
    if (APP.drag.moved) { APP.drag.moved = false; e.stopPropagation(); return; }
    if (e.target.classList.contains('port-dot-node') && (_cableAddMode || e.target.classList.contains('port-wireless'))) return;
    e.stopPropagation();
    if (e.shiftKey) {
      pushUndo();
      const maxZ = Math.max(1, ...Object.values(APP.nodes).map(n => n.zindex || 1));
      APP.nodes[sid].zindex = maxZ + 1;
      el.style.zIndex = maxZ + 1;
      wLog('NODE_FRONT', { id: sid, name: APP.nodes[sid]?.name });
      setDirty();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Click : toggle dans la multi-sélection
      // Si un nœud unique était sélectionné, le faire entrer dans selMulti d'abord
      if (APP.sel && !APP.selMulti.size) {
        const prev = APP.sel;
        APP.sel = null;
        exitResizeMode();
        closePanel();
        document.getElementById(`n-${prev}`)?.classList.remove('sel', 'lit', 'dim', 'route-dim');
        document.getElementById(`nl-${prev}`)?.classList.remove('dim', 'route-dim');
        document.getElementById(`n-${prev}`)?.classList.add('sel-multi');
        APP.selMulti.add(prev);
        // Restaurer opacité des autres nœuds (et de leurs étiquettes nl-*)
        for (const nid of Object.keys(APP.nodes)) {
          if (nid !== prev) {
            document.getElementById(`n-${nid}`)?.classList.remove('sel', 'lit', 'dim', 'route-dim');
            document.getElementById(`nl-${nid}`)?.classList.remove('dim', 'route-dim');
          }
        }
        document.querySelectorAll('#cables-svg .cable-visual').forEach(p => {
          delete p.dataset.selected; p.removeAttribute('filter');
          p.setAttribute('stroke-width', '3.5'); p.setAttribute('opacity', '0.85');
        });
        // Remet TOUS les câbles à l'opacité de repos ci-dessus, sans jamais consulter
        // le filtre catégorie/câble/zone actif — même défaut que _applyCanvasDim(∅,∅,∅)
        // (routes.js), corrigé de la même façon : réappliquer le filtre juste après.
        if (typeof applyCanvasFilters === 'function') applyCanvasFilters();
      }
      if (APP.selMulti.has(sid)) {
        APP.selMulti.delete(sid);
        el.classList.remove('sel-multi');
      } else {
        APP.selMulti.add(sid);
        el.classList.add('sel-multi');
      }
      if (APP.selMulti.size > 0) {
        if (typeof openMultiPanel === 'function') openMultiPanel();
      } else {
        closePanel();
      }
      return;
    }
    // Clic sur un nœud déjà dans selMulti → le retirer (comportement Explorateur Windows)
    if (APP.selMulti && APP.selMulti.has(sid)) {
      APP.selMulti.delete(sid);
      el.classList.remove('sel-multi');
      if (APP.selMulti.size > 1) {
        openMultiPanel();
      } else if (APP.selMulti.size === 1) {
        const remaining = [...APP.selMulti][0];
        clearSelMulti();
        selectNode(remaining);
      } else {
        closePanel();
      }
      return;
    }
    clearSelMulti();
    clearTimeout(_clickTimer);
    _clickTimer = setTimeout(() => { selectNode(sid); }, 220);
  });

  // ── Double-clic : éditer les ports (Image Setup) ────────
  el.addEventListener('dblclick', e => {
    e.stopPropagation();
    clearTimeout(_clickTimer); // annule la sélection du premier click
    if (typeof openNodePortsEditor === 'function') openNodePortsEditor(sid);
  });
}

function _catIcon(cat) {
  const icons = {
    switcher: '🎬', capture: '📹', conversion: '🔄',
    video: '📺', audio: '🔊', network: '🌐',
    rack: '🗄️', external: '📡', usb: '🔌',
    power: '⚡', storage: '💾', camera: '📷',
    display: '🖥️', computer: '💻',
    // Même symbole que le repli ci-dessous, et c'est voulu : « Non classé »
    // EST le cas « catégorie inconnue », rendu explicite et cochable dans les
    // filtres au lieu d'être un état fantôme.
    unsorted: '📦',
  };
  return icons[cat] || '📦';
}

function _updateLblPos(sid, lblEl) {
  const s = APP.nodes[sid];
  if (!s) return;
  const lbl = lblEl || document.getElementById(`nl-${sid}`);
  if (!lbl) return;
  lbl.style.left      = (s.x + s.w / 2) + 'px';
  lbl.style.top       = (s.y + s.h + 14) + 'px';
  lbl.style.transform = 'translateX(-50%)';
  lbl.style.position  = 'absolute';
}

// ── Drag nœud ────────────────────────────────────────────────
function setupNodeDrag(el, sid) {
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    if (APP.drag.active) return;
    // Ne pas démarrer le drag si on clique sur un label, une poignée resize,
    // ou un dot de port en mode ajout de câble
    if (e.target.classList.contains('node-lbl') ||
        e.target.classList.contains('rh') ||
        e.target.isContentEditable) return;
    if (e.target.classList.contains('port-dot-node') && (_cableAddMode || e.target.classList.contains('port-wireless'))) return;
    // Une route/chemin/segment est en cours d'animation (voir _isDimmingActive,
    // routes.js) : déplacer un appareil est verrouillé, y compris s'il n'est pas
    // concerné par la route active — le clic-glisser panoramique le canevas à la
    // place (comportement attendu par défaut sur un clic hors appareil).
    if (typeof _isDimmingActive === 'function' && _isDimmingActive()) {
      e.stopPropagation();
      e.preventDefault();
      if (typeof startCanvasPanFromEvent === 'function') startCanvasPanFromEvent(e);
      return;
    }

    e.stopPropagation();
    e.preventDefault();

    const s = APP.nodes[sid];
    APP.drag.active = true;
    APP.drag.type   = 'node';
    APP.drag.id     = sid;
    APP.drag.moved  = false;
    APP.drag.ox     = screenToCanvas(e.clientX, e.clientY).x - s.x;
    APP.drag.oy     = screenToCanvas(e.clientX, e.clientY).y - s.y;

    // Snapshot des overrides câbles pour patcher depuis l'état initial à chaque frame —
    // TOUS les câbles, pas seulement ceux connectés à ce nœud : un câble tiers a lui
    // aussi besoin de son tracé d'origine pour être dévié en direct s'il se retrouve
    // chevauché (voir redrawCablesMovingNode), et pour y revenir si l'appareil s'éloigne.
    APP.drag.cableSnapshot = {};
    for (const c of APP.cables) {
      if (cableOverrides[c.id]) {
        APP.drag.cableSnapshot[c.id] = cableOverrides[c.id].map(p => [...p]);
      }
    }
    APP.drag._bypassedCables = new Set();

    // Multi-drag : enregistrer la position initiale de chaque nœud sélectionné
    APP.drag._multiSnap = null;
    if (APP.selMulti && APP.selMulti.size > 1 && APP.selMulti.has(sid)) {
      APP.drag._multiSnap = {};
      for (const mid of APP.selMulti) {
        const ms = APP.nodes[mid];
        APP.drag._multiSnap[mid] = { x: ms.x, y: ms.y };
      }
    }

    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener('pointermove', e => {
    if (!APP.drag.active || APP.drag.type !== 'node' || APP.drag.id !== sid) return;
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const s = APP.nodes[sid];

    if (!APP.drag.moved) {
      pushUndo();
      APP.drag.moved = true;
    }

    s.x = Math.round(x - APP.drag.ox);
    s.y = Math.round(y - APP.drag.oy);
    s.cx = s.x + s.w / 2;
    s.cy = s.y + s.h / 2;

    el.style.left = s.x + 'px';
    el.style.top  = s.y + 'px';
    _updateLblPos(sid);

    // Multi-drag : déplacer tous les autres nœuds sélectionnés du même delta
    if (APP.drag._multiSnap) {
      const dx = s.x - APP.drag._multiSnap[sid].x;
      const dy = s.y - APP.drag._multiSnap[sid].y;
      for (const [mid, snap] of Object.entries(APP.drag._multiSnap)) {
        if (mid === sid) continue;
        const ms = APP.nodes[mid];
        ms.x = snap.x + dx; ms.y = snap.y + dy;
        ms.cx = ms.x + ms.w / 2; ms.cy = ms.y + ms.h / 2;
        const mel = document.getElementById(`n-${mid}`);
        if (mel) { mel.style.left = ms.x + 'px'; mel.style.top = ms.y + 'px'; }
        _updateLblPos(mid);
        redrawCablesMovingNode(mid);
      }
    }

    // Redessiner câbles connectés en live (extrémités suivent le nœud)
    redrawCablesMovingNode(sid);
  });

  el.addEventListener('pointerup', e => {
    if (!APP.drag.active || APP.drag.id !== sid) return;
    APP.drag.active = false;
    APP.drag.type   = null;
    el.releasePointerCapture(e.pointerId);

    if (APP.drag.moved && APP.drag._multiSnap) {
      // Multi-move : recalculer les câbles de tous les nœuds déplacés
      for (const mid of Object.keys(APP.drag._multiSnap)) {
        for (const c of APP.cables) {
          if (c.from === mid || c.to === mid) delete cableOverrides[c.id];
        }
      }
      APP.drag._multiSnap = null;
      renderCables();
      setDirty();
      wLog('MULTI_MOVE', { count: APP.selMulti.size });
    } else if (APP.drag.moved) {
      // Corriger les diagonales introduites par le déplacement du nœud :
      // normalizePts insère le bon coin, simplify supprime les points redondants.
      // Le tracé lui-même (ancrage + contournement d'un appareil tiers éventuel) est
      // déjà correct à ce stade — calculé en direct à chaque frame par
      // redrawCablesMovingNode, y compris pour le câble connecté au nœud déplacé —
      // donc jamais recalculé ici, seulement figé/nettoyé.
      const s = APP.nodes[sid];
      for (const c of APP.cables) {
        const pts = cableOverrides[c.id];
        if (!pts || pts.length < 2) continue;
        const n = pts.length;
        const snap = pts.map(p => [...p]);
        const R = v => Math.round(v);
        if (c.from === sid && c.from_nx != null) {
          const newAnc = edgePtFixed(s, c.from_nx, c.from_ny).map(R);
          const dx = newAnc[0] - snap[0][0], dy = newAnc[1] - snap[0][1];
          pts[0] = newAnc;
          if (n >= 3) {
            pts[1] = c.from_stub_dir
              ? _stubFromDir(newAnc, c.from_stub_dir)
              : [R(snap[1][0] + dx), R(snap[1][1] + dy)];
            if (n > 3) {
              if (Math.abs(snap[2][1] - snap[1][1]) < 1) pts[2] = [pts[2][0], pts[1][1]];
              else                                        pts[2] = [pts[1][0], pts[2][1]];
            }
          }
        }
        if (c.to === sid && c.to_nx != null) {
          const newAnc = edgePtFixed(s, c.to_nx, c.to_ny).map(R);
          const dx = newAnc[0] - snap[n-1][0], dy = newAnc[1] - snap[n-1][1];
          pts[n - 1] = newAnc;
          if (n >= 3) {
            pts[n - 2] = c.to_stub_dir
              ? _stubFromDir(newAnc, c.to_stub_dir)
              : [R(snap[n-2][0] + dx), R(snap[n-2][1] + dy)];
            if (n > 3) {
              if (Math.abs(snap[n-3][1] - snap[n-2][1]) < 1) pts[n-3] = [pts[n-3][0], pts[n-2][1]];
              else                                             pts[n-3] = [pts[n-2][0], pts[n-3][1]];
            }
          }
        }
        cableOverrides[c.id] = simplify(normalizePts(pts));
      }
      APP.drag.cableSnapshot = {};
      renderCables();
      setDirty();
      const _ms = APP.nodes[sid];
      wLog('NODE_MOVE', { id: sid, x: _ms.x, y: _ms.y });
    }
    APP.drag._multiSnap = null;
    APP.drag._bypassedCables = null;
    // Reset moved au prochain pointerdown (pas de setTimeout — évite le faux click)
  });
}

// ── Resize mode ───────────────────────────────────────────────
// Coins (nw/ne/sw/se) = proportionnel | Côtés (n/s/e/w) = libre
function enterResizeMode(sid) {
  if (resizeNodeId && resizeNodeId !== sid) exitResizeMode();
  resizeNodeId = sid;

  const el = document.getElementById(`n-${sid}`);
  if (!el) return;

  el.querySelectorAll('.rh').forEach(h => h.remove());

  const handles = ['nw'];
  handles.forEach(dir => {
    const h = document.createElement('div');
    h.className = `rh rh-${dir}`;
    h.dataset.dir = dir;
    el.appendChild(h);
    setupResizeHandle(h, sid, dir);
  });
}

function exitResizeMode() {
  if (!resizeNodeId) return;
  const el = document.getElementById(`n-${resizeNodeId}`);
  el?.querySelectorAll('.rh').forEach(h => h.remove());
  resizeNodeId = null;
}

function setupResizeHandle(handle, sid, dir) {
  let startX, startY, startState;
  const isCorner = dir.length === 2; // nw/ne/sw/se = proportionnel

  handle.addEventListener('pointerdown', e => {
    e.stopPropagation();
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    const s = APP.nodes[sid];
    startState = { x: s.x, y: s.y, w: s.w, h: s.h, ratio: s.w / s.h };
    startX = e.clientX;
    startY = e.clientY;
    pushUndo();
  });

  handle.addEventListener('pointermove', e => {
    const s = APP.nodes[sid];
    const dx = (e.clientX - startX) / APP.view.zoom;
    const dy = (e.clientY - startY) / APP.view.zoom;
    let { x, y, w, h, ratio } = startState;

    if (isCorner) {
      // Proportionnel : utiliser le delta dominant
      const d = (Math.abs(dx) + Math.abs(dy)) / 2;
      const sign = (dir.includes('e') ? dx : -dx) > 0 ? 1 : -1;
      const delta = sign * d;
      const nw = Math.max(MIN_W, w + delta);
      const nh = Math.max(MIN_H, nw / ratio);
      if (dir.includes('w')) x = x + w - nw;
      if (dir.includes('n')) y = y + h - nh;
      w = nw; h = nh;
    } else {
      // Libre : un seul axe
      if (dir === 'e') w = Math.max(MIN_W, w + dx);
      if (dir === 's') h = Math.max(MIN_H, h + dy);
      if (dir === 'w') { const nw = Math.max(MIN_W, w - dx); x = x + w - nw; w = nw; }
      if (dir === 'n') { const nh = Math.max(MIN_H, h - dy); y = y + h - nh; h = nh; }
    }

    s.x = Math.round(x); s.y = Math.round(y);
    s.w = Math.round(w); s.h = Math.round(h);
    // Un redimensionnement PROPORTIONNEL (coin) ne modifie jamais le ratio w/h — il
    // n'y a donc aucune raison de désactiver l'auto-ajustement à l'image (voir plus
    // bas, au chargement) à cause de lui. Verrouillé en "manuel" seulement par un
    // redimensionnement LIBRE (un seul côté), le seul qui puisse réellement introduire
    // un ratio différent de celui de l'image. Avant ce correctif, tout redimensionnement
    // — même un simple agrandissement proportionnel — bloquait pour toujours le
    // réajustement automatique lors d'un futur remplacement d'image, laissant la
    // hauteur figée sur l'ancien ratio (câble contourné trop large/haut, sélection
    // débordant visiblement de l'image réellement affichée).
    if (!isCorner) s.hManual = true;
    s.cx = s.x + s.w / 2; s.cy = s.y + s.h / 2;
    applyNodeResize(sid);
  });

  handle.addEventListener('pointerup', e => {
    handle.releasePointerCapture(e.pointerId);
    // cableOverrides = {} effaçait TOUT le cache de tracé du projet (tous les câbles,
    // pas seulement ceux du nœud redimensionné), forçant un nouveau calcul BFS complet
    // qui pouvait reprendre une route différente pour des câbles sans aucun rapport —
    // voir _patchCablesForPortMove (cables.js) qui ne patche que l'ancre + le stub
    // adjacent des câbles réellement connectés à ce nœud.
    if (window._resizePatchCables && typeof _patchCablesForPortMove === 'function') {
      _patchCablesForPortMove(sid);
    } else {
      cableOverrides = {};
    }
    renderCables();
    setDirty();
    const _rs = APP.nodes[sid];
    wLog('NODE_RESIZE', { id: sid, w: _rs.w, h: _rs.h });
  });
}

function applyNodeResize(sid) {
  const s = APP.nodes[sid];
  const el = document.getElementById(`n-${sid}`);
  if (!el) return;

  el.style.left   = s.x + 'px';
  el.style.top    = s.y + 'px';
  el.style.width  = s.w + 'px';
  el.style.height = (s.h + 40) + 'px';

  const box = el.querySelector('.node-box');
  if (box) { box.style.width = s.w + 'px'; box.style.height = s.h + 'px'; }

  const imgWrap = el.querySelector('.node-img-wrap');
  if (imgWrap) { imgWrap.style.width = s.w + 'px'; imgWrap.style.height = (s.h - 3) + 'px'; }

  const img = el.querySelector('.node-img-wrap img');
  if (img) { img.style.width = s.w + 'px'; img.style.height = (s.h - 3) + 'px'; }

  const portsLayer = el.querySelector('.node-ports');
  if (portsLayer) { portsLayer.style.width = s.w + 'px'; portsLayer.style.height = s.h + 'px'; }

  // Mettre à jour la position des port dots
  if (s.ports && s.ports.length) {
    s.ports.forEach(p => {
      const dot = el.querySelector(`.port-dot-node[data-port-id="${p.id}"]`);
      if (dot) {
        dot.style.left = (p.nx * s.w) + 'px';
        dot.style.top  = (p.ny * s.h + 3) + 'px';
      }
    });
  }

  _updateLblPos(sid);
  redrawOnlyCables();
}

// ── Centrer la vue sur un nœud ────────────────────────────────
function centerOnNode(sid) {
  const s = APP.nodes[sid];
  if (!s) return;
  updateAreaRect();
  const aW = _areaRect?.width  || 800;
  const aH = _areaRect?.height || 600;
  const z  = APP.view.zoom;
  APP.view.panX = aW / 2 - (s.x + s.w / 2) * z;
  APP.view.panY = aH / 2 - (s.y + s.h / 2) * z;
  applyT();
}

// ── Trouver une position libre sur le canvas ──────────────────
function findFreePosition(w, h) {
  updateAreaRect();
  const aW = _areaRect?.width  || 800;
  const aH = _areaRect?.height || 600;
  // Position centrale visible
  const cx = (aW / 2 - APP.view.panX) / APP.view.zoom;
  const cy = (aH / 2 - APP.view.panY) / APP.view.zoom;

  const PAD = 20;
  const nodes = Object.values(APP.nodes);

  function overlaps(x, y) {
    return nodes.some(n =>
      x < n.x + n.w + PAD && x + w + PAD > n.x &&
      y < n.y + n.h + PAD && y + h + PAD > n.y
    );
  }

  // Spirale : centre, puis décale progressivement
  const step = Math.max(w, h) + PAD;
  for (let ring = 0; ring <= 10; ring++) {
    if (ring === 0) {
      const x = Math.round(cx - w / 2);
      const y = Math.round(cy - h / 2);
      if (!overlaps(x, y)) return { x, y };
    } else {
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dy = -ring; dy <= ring; dy++) {
          if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
          const x = Math.round(cx - w / 2 + dx * step);
          const y = Math.round(cy - h / 2 + dy * step);
          if (!overlaps(x, y)) return { x, y };
        }
      }
    }
  }
  return { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2) };
}

// ── Supprimer le nœud Internet (câbles supprimés, routes nettoyées) ──
function deleteInternetNode(id) {
  showConfirm(t('delete_internet_confirm'), { danger: true }).then(ok => {
    if (!ok) return;
    pushUndo();

    // Supprimer tous les câbles connectés + les retirer des routes
    const cids = APP.cables.filter(c => c.from === id || c.to === id).map(c => c.id);
    cids.forEach(cid => {
      if (typeof _removeCableFromAllRoutes === 'function') _removeCableFromAllRoutes(cid);
      APP.cables = APP.cables.filter(c => c.id !== cid);
      delete cableOverrides[cid];
    });

    delete APP.nodes[id];
    document.getElementById(`n-${id}`)?.remove();
    document.getElementById(`nl-${id}`)?.remove();

    rebuildCM();
    renderCables();
    if (typeof renderRoutesList === 'function') renderRoutesList();
    clearSel();
    closePanel();
    if (typeof refreshSidebar === 'function') refreshSidebar();
    setDirty();
  });
}

// ── Restaurer le nœud Internet — bas-gauche de la vue courante ──
function restoreInternetNode() {
  pushUndo();
  updateAreaRect();
  const aW = _areaRect?.width  || 800;
  const aH = _areaRect?.height || 600;
  const W = 180, H = 140, PAD = 20, PAD_X = 60;
  // Coin bas-gauche du viewport en coordonnées canevas (PAD_X > PAD pour dégager le sidebar)
  const startX = (PAD_X - APP.view.panX) / APP.view.zoom;
  const startY = ((aH - H - PAD) - APP.view.panY) / APP.view.zoom;
  const nodes = Object.values(APP.nodes);
  function overlaps(ox, oy) {
    return nodes.some(n =>
      ox < n.x + n.w + PAD && ox + W + PAD > n.x &&
      oy < n.y + n.h + PAD && oy + H + PAD > n.y
    );
  }
  let fx = Math.round(startX), fy = Math.round(startY);
  const step = Math.max(W, H) + PAD;
  outer: for (let ring = 0; ring <= 10; ring++) {
    if (ring === 0) {
      if (!overlaps(fx, fy)) break outer;
    } else {
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dy = -ring; dy <= ring; dy++) {
          if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
          const tx = Math.round(startX + dx * step);
          const ty = Math.round(startY + dy * step);
          if (!overlaps(tx, ty)) { fx = tx; fy = ty; break outer; }
        }
      }
    }
  }
  const id = uuid();
  APP.nodes[id] = {
    id,
    name: 'Internet', short: 'Internet',
    cat: 'internet', virtual: true,
    img: _INTERNET_IMG, img_original: _INTERNET_IMG,
    desc: '', desc_en: '',
    x: fx, y: fy, w: W, h: H,
    cx: fx + W / 2, cy: fy + H / 2,
    bb: { left: 0, right: 1, top: 0, bottom: 1 },
    stub: null,
    ports: [{ id: 'rj45', type: 'RJ45', nx: 0.5, ny: 0.02, dual: true }],
    zindex: 1,
  };
  CM[id] = [];
  renderNodes();
  rebuildCM();
  renderCables();
  if (typeof refreshSidebar === 'function') refreshSidebar();
  setDirty();
}

// ── Supprimer un nœud ─────────────────────────────────────────
function deleteNode(id) {
  pushUndo();
  wLog('NODE_DEL', { id, name: APP.nodes[id]?.name, cat: APP.nodes[id]?.cat });

  // Supprime entièrement (jamais orphelin) tout câble connecté à l'appareil supprimé
  // — physique ou sans fil, conforme à ce qu'annonce la confirmation ("... et tous
  // ses câbles ?", voir locales.js delete_node_confirm). Un câble peut être référencé
  // par une ou plusieurs routes (segments du tronc, d'un chemin/sous-chemin, ou de la
  // fin de route — potentiellement dans plusieurs routes à la fois via copier/coller
  // ou "+ Ajouter à une autre route") : ces références sont retirées AVANT la
  // suppression du câble lui-même, sinon la route garderait un segment pointant vers
  // un cableId inexistant (jamais rendu, ni nettoyé automatiquement).
  APP.cables
    .filter(c => c.from === id || c.to === id)
    .map(c => c.id)
    .forEach(cid => {
      if (typeof _purgeCableFromRoutes === 'function') _purgeCableFromRoutes(cid);
      deleteConn(cid, { skipRouteCheck: true, skipUndo: true });
    });

  delete APP.nodes[id];

  document.getElementById(`n-${id}`)?.remove();
  document.getElementById(`nl-${id}`)?.remove();

  rebuildCM();
  renderCables();
  clearSel();
  closePanel();
  if (typeof refreshSidebar === 'function') refreshSidebar();
  if (document.getElementById('routes-panel')?.classList.contains('open')) renderRoutesList();
  setDirty();
}
