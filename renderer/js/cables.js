/* ═══════════════════════════════════════════════════════════════
   cables.js — Rendu SVG câbles, nudging, hit areas, tooltip
═══════════════════════════════════════════════════════════════ */

let _svg, _ctt;

// Sécurité anti-régression du correctif de clignotement hover (regroupement par frame
// des changements opacity/filter, voir plus bas) : window._hoverRafCoalesce = false
// dans la console repasse instantanément à l'ancien comportement (écriture immédiate).
window._hoverRafCoalesce = window._hoverRafCoalesce !== false;

// Sécurité anti-régression du correctif de clignotement pendant le glissement d'un
// segment de câble (regroupement par frame de redrawOnlyCables(), voir _startSegmentDrag) :
// window._dragRafCoalesce = false dans la console repasse instantanément à l'ancien
// comportement (reconstruction immédiate à chaque pointermove).
window._dragRafCoalesce = window._dragRafCoalesce !== false;

// Sécurité anti-régression du contournement en direct des câbles tiers pendant le
// glissement d'un appareil (voir redrawCablesMovingNode/_computeNodeBypassPts) :
// window._xNodeBypassPreview = false dans la console désactive entièrement cette
// prévisualisation, retour au comportement d'avant (un câble tiers ne bouge jamais).
window._xNodeBypassPreview = window._xNodeBypassPreview !== false;

// ── Rendu complet des câbles ──────────────────────────────────
function renderCables() {
  _svg = document.getElementById('cables-svg');
  _ctt = document.getElementById('ctt');

  // Vider le SVG sauf les <defs>
  const defs = _svg.querySelector('defs');
  _svg.innerHTML = '';
  if (defs) _svg.appendChild(defs);

  // Assurer que chaque nœud a son id comme propriété
  for (const [sid, s] of Object.entries(APP.nodes)) s.id = sid;

  // ── 1. Router tous les câbles ────────────────────────────
  // Un câble sans fil (WiFi/Bluetooth/HF) n'a pas de trajet physique à calculer/afficher
  // — seuls ses deux ports (permanents, voir nodes.js) le représentent visuellement.
  const routed = APP.cables.filter(c => !WIRELESS_TYPES.has(c.type)).map(c => {
    const sa = APP.nodes[c.from], sb = APP.nodes[c.to];

    // Câble orphelin (un ou deux bouts sans nœud)
    if (!sa || !sb) {
      if (cableOverrides[c.id]) return { c, pts: cableOverrides[c.id], orphan: true };
      // Construire un chemin minimal depuis les positions stockées
      const fx = c.orphan_from ? c.orphan_from_x : (sa ? sa.cx : 0);
      const fy = c.orphan_from ? c.orphan_from_y : (sa ? sa.cy : 0);
      const tx = c.orphan_to   ? c.orphan_to_x   : (sb ? sb.cx : fx + 80);
      const ty = c.orphan_to   ? c.orphan_to_y   : (sb ? sb.cy : fy);
      return { c, pts: [[fx, fy], [tx, ty]], orphan: true };
    }

    // Si override manuel existant → utiliser directement
    if (cableOverrides[c.id]) return { c, pts: cableOverrides[c.id] };

    const fromPt   = (c.from_nx != null) ? edgePtFixed(sa, c.from_nx, c.from_ny) : null;
    const toPt     = (c.to_nx   != null) ? edgePtFixed(sb, c.to_nx,   c.to_ny  ) : null;
    const fromStub = (c.from_nx != null)
      ? (c.from_stub_dir && fromPt ? _stubFromDir(fromPt, c.from_stub_dir) : stubPt(sa, c.from_nx, c.from_ny))
      : null;
    const toStub   = (c.to_nx   != null)
      ? (c.to_stub_dir && toPt ? _stubFromDir(toPt, c.to_stub_dir) : stubPt(sb, c.to_nx, c.to_ny))
      : null;

    const rawPath = findOrthPath(sa, sb, fromStub || fromPt, toStub || toPt);
    let pts = simplify(rawPath);
    if (fromPt && fromStub) pts = [fromPt, ...pts];
    if (toPt   && toStub  ) pts = [...pts, toPt];
    pts = simplify(pts);

    // simplify() peut retirer le stub forcé (from_stub_dir/to_stub_dir, choisi via
    // le clic droit "Changer de direction") s'il juge le chemin recalculé en
    // aller-retour immédiat — même cas de figure que dans setStubDir(), qui s'en
    // protège déjà pour l'usage interactif. Sans ce même garde-fou ici, une
    // direction manuelle est silencieusement perdue au premier recalcul complet
    // (ex: déplacement d'un port dans Image Setup, qui invalide cableOverrides
    // et force ce chemin de rendu depuis zéro).
    // IMPORTANT : réinsérer SEULEMENT le point de sortie (sans coude) casse
    // l'orthogonalité si le point suivant n'est ni sur le même X ni le même Y —
    // le segment rendu devient alors une diagonale. On ajoute donc un point de
    // coude, comme le fait déjà setStubDir(), mais seulement quand c'est requis.
    if (c.from_stub_dir && fromPt) {
      const exp = _stubFromDir(fromPt, c.from_stub_dir);
      const cur = pts[1];
      const sameAsExp = cur && Math.abs(cur[0] - exp[0]) <= 1 && Math.abs(cur[1] - exp[1]) <= 1;
      if (!sameAsExp) {
        const stubIsH  = (c.from_stub_dir === 'left' || c.from_stub_dir === 'right');
        const sameAxis = cur && (Math.abs(cur[0] - exp[0]) <= 1 || Math.abs(cur[1] - exp[1]) <= 1);
        if (cur && !sameAxis) {
          const corner = stubIsH ? [exp[0], cur[1]] : [cur[0], exp[1]];
          pts.splice(1, 0, exp, corner);
        } else {
          pts.splice(1, 0, exp);
        }
      }
    }
    if (c.to_stub_dir && toPt) {
      const exp = _stubFromDir(toPt, c.to_stub_dir);
      const n = pts.length;
      const cur = pts[n - 2];
      const sameAsExp = cur && Math.abs(cur[0] - exp[0]) <= 1 && Math.abs(cur[1] - exp[1]) <= 1;
      if (!sameAsExp) {
        const stubIsH  = (c.to_stub_dir === 'left' || c.to_stub_dir === 'right');
        const sameAxis = cur && (Math.abs(cur[0] - exp[0]) <= 1 || Math.abs(cur[1] - exp[1]) <= 1);
        if (cur && !sameAxis) {
          const corner = stubIsH ? [exp[0], cur[1]] : [cur[0], exp[1]];
          pts.splice(n - 1, 0, corner, exp);
        } else {
          pts.splice(n - 1, 0, exp);
        }
      }
    }
    return { c, pts };
  });

  // ── 2. Nudging ───────────────────────────────────────────
  function segsOverlap1D(a1, a2, b1, b2) {
    const lo = Math.max(Math.min(a1,a2), Math.min(b1,b2));
    const hi = Math.min(Math.max(a1,a2), Math.max(b1,b2));
    return hi - lo > EPS;
  }

  const hGroups = new Map();
  const vGroups = new Map();

  routed.forEach(({ pts }, cIdx) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1,y1] = pts[i], [x2,y2] = pts[i+1];
      if (Math.abs(y1-y2) < EPS) {
        const yk = Math.round(y1 / EPS) * EPS;
        if (!hGroups.has(yk)) hGroups.set(yk, []);
        hGroups.get(yk).push({ cIdx, sIdx: i, ptsLen: pts.length, x1, x2, y: y1 });
      } else if (Math.abs(x1-x2) < EPS) {
        const xk = Math.round(x1 / EPS) * EPS;
        if (!vGroups.has(xk)) vGroups.set(xk, []);
        vGroups.get(xk).push({ cIdx, sIdx: i, ptsLen: pts.length, y1, y2, x: x1 });
      }
    }
  });

  function nudgeGroup(segs, isH) {
    if (segs.length <= 1) return;
    segs.sort((a, b) => isH
      ? Math.min(a.x1,a.x2) - Math.min(b.x1,b.x2)
      : Math.min(a.y1,a.y2) - Math.min(b.y1,b.y2));
    const clusters = [];
    for (const seg of segs) {
      let placed = false;
      for (const cl of clusters) {
        for (const ms of cl) {
          const ov = isH
            ? segsOverlap1D(seg.x1, seg.x2, ms.x1, ms.x2)
            : segsOverlap1D(seg.y1, seg.y2, ms.y1, ms.y2);
          if (ov) { cl.push(seg); placed = true; break; }
        }
        if (placed) break;
      }
      if (!placed) clusters.push([seg]);
    }
    for (const cl of clusters) {
      if (cl.length <= 1) continue;
      const total = (cl.length - 1) * NUDGE;
      cl.forEach((seg, k) => {
        if (seg.sIdx === 0 || seg.sIdx === seg.ptsLen - 2) return;
        const offset = -total / 2 + k * NUDGE;
        const pts = routed[seg.cIdx].pts;
        if (isH) {
          pts[seg.sIdx]   = [pts[seg.sIdx][0],   pts[seg.sIdx][1]   + offset];
          pts[seg.sIdx+1] = [pts[seg.sIdx+1][0], pts[seg.sIdx+1][1] + offset];
        } else {
          pts[seg.sIdx]   = [pts[seg.sIdx][0]   + offset, pts[seg.sIdx][1]];
          pts[seg.sIdx+1] = [pts[seg.sIdx+1][0] + offset, pts[seg.sIdx+1][1]];
        }
      });
    }
  }

  hGroups.forEach(segs => nudgeGroup(segs, true));
  vGroups.forEach(segs => nudgeGroup(segs, false));

  // ── 3. Stocker et dessiner ───────────────────────────────
  // Câble sélectionné en dernier — même raison que dans redrawOnlyCables().
  routed.sort((a, b) => (a.c.id === selCableId) - (b.c.id === selCableId));
  routed.forEach(({ c, pts, orphan }) => {
    if (!pts.length) return;
    // Only cache BFS result when both nodes' images are confirmed loaded,
    // so we never persist a path built on fallback (pre-load) port positions.
    if (!cableOverrides[c.id]) {
      const sa = APP.nodes[c.from], sb = APP.nodes[c.to];
      const imagesReady = (!sa?.img || sa?._imgW) && (!sb?.img || sb?._imgW);
      if (imagesReady) cableOverrides[c.id] = pts.map(pt => [...pt]);
    }
    drawCable(c, pts, orphan);
  });

  // Poignées d'extrémités orphelines : passe SÉPARÉE, après TOUS les câbles —
  // garantit qu'elles restent toujours au-dessus (sinon la bande de capture d'un
  // câble voisin dessiné après pourrait recouvrir la leur, empêchant de l'attraper).
  routed.forEach(({ c, pts, orphan }) => {
    if (!orphan || !pts.length) return;
    if (c.orphan_from) _drawOrphanHandle(c, pts, 0, 'from');
    if (c.orphan_to)   _drawOrphanHandle(c, pts, pts.length - 1, 'to');
  });

  drawJunctionMarkers();
  scheduleMinimap();
}

// ── Redessiner en live pendant le drag d'un nœud ─────────────
// Patch les 2 points terminaux (ancre + stub) du câble connecté au nœud qui bouge.
// Câble NON connecté : testé contre la position courante de l'appareil déplacé —
// c'est le seul obstacle qui peut nouvellement le chevaucher, lui restant sinon
// immobile (voir _computeNodeBypassPts) — figé dans cet état au relâchement.
// Câble CONNECTÉ : son tracé change de forme à chaque frame (une extrémité bouge
// avec l'appareil), donc n'importe quel AUTRE appareil du projet peut se retrouver
// sur son chemin — pas seulement l'appareil déplacé, auquel il est justement
// branché (jamais un obstacle pour son propre câble, comme dans le routage complet,
// voir getObstacles). Testé et dévié contre chacun de ces appareils tiers en séquence.
// Sécu de régression : window._xNodeBypassPreview = false dans la console désactive
// entièrement cette prévisualisation, retour au comportement d'avant (câble jamais dévié).
function redrawCablesMovingNode(sid) {
  const s = APP.nodes[sid];
  if (!s) return;
  const liveBypass = window._xNodeBypassPreview !== false;
  const bb = liveBypass ? getRealBB(s, 0) : null;
  if (!APP.drag._bypassedCables) APP.drag._bypassedCables = new Set();

  for (const c of APP.cables) {
    // Toujours patcher depuis le snapshot de début de drag → pas de dérive cumulative
    const snap = APP.drag?.cableSnapshot?.[c.id];
    if (!snap || snap.length < 2) continue;
    const n = snap.length;
    const connected = c.from === sid || c.to === sid;

    // Clone frais du snapshot comme base de ce frame
    const pts = snap.map(p => [...p]);
    cableOverrides[c.id] = pts;

    const R = v => Math.round(v);

    // Coude (pts[1]/pts[n-2]) recalculé comme l'intersection à angle droit entre la
    // nouvelle ancre et le point suivant du tracé (snap[2]/snap[n-3], toujours pris
    // depuis l'instantané de début de glisser pour rester fixe pendant tout le
    // geste) — jamais une translation de l'ancien coude par le delta complet de
    // l'ancre, qui entraînait le segment suivant avec lui au lieu de ne faire
    // varier que la longueur du premier stub. Même principe que
    // _patchCablesForPortMove (déplacement de port/redimensionnement).
    // Câble à direction de sortie forcée (from_stub_dir/to_stub_dir) : PAS de
    // longueur fixe ici (contrairement à _stubFromDir(), utilisée à la création/à
    // l'édition manuelle) — seul l'axe imposé (down/up = vertical, left/right =
    // horizontal) remplace le calcul géométrique de wasH ; le stub s'étire donc
    // lui aussi librement pendant un glisser d'appareil, choix explicite pour ne
    // jamais entraîner le reste du tracé avec lui.
    if (c.from === sid && c.from_nx != null) {
      const newAnc = edgePtFixed(s, c.from_nx, c.from_ny).map(R);
      pts[0] = newAnc;
      if (n >= 3) {
        const wasH = c.from_stub_dir
          ? (c.from_stub_dir === 'left' || c.from_stub_dir === 'right')
          : Math.abs(snap[1][1] - snap[0][1]) < 1;
        const pivot = snap[2];
        pts[1] = wasH ? [pivot[0], newAnc[1]] : [newAnc[0], pivot[1]];
      }
    }

    if (c.to === sid && c.to_nx != null) {
      const newAnc = edgePtFixed(s, c.to_nx, c.to_ny).map(R);
      pts[n - 1] = newAnc;
      if (n >= 3) {
        const wasH = c.to_stub_dir
          ? (c.to_stub_dir === 'left' || c.to_stub_dir === 'right')
          : Math.abs(snap[n-2][1] - snap[n-1][1]) < 1;
        const pivot = snap[n-3];
        pts[n - 2] = wasH ? [pivot[0], newAnc[1]] : [newAnc[0], pivot[1]];
      }
    }

    cableOverrides[c.id] = pts;

    if (!liveBypass) continue;

    if (connected) {
      let curPts = pts, anyTouched = false;
      for (const obb of getObstacles([c.from, c.to])) {
        const { pts: dev, touched } = _computeNodeBypassPts(curPts, obb);
        if (touched) { curPts = dev; anyTouched = true; }
      }
      cableOverrides[c.id] = curPts;
      if (anyTouched) APP.drag._bypassedCables.add(c.id);
      else            APP.drag._bypassedCables.delete(c.id);
    } else if (bb) {
      const { pts: bypassed, touched } = _computeNodeBypassPts(snap, bb);
      if (touched) {
        cableOverrides[c.id] = bypassed;
        APP.drag._bypassedCables.add(c.id);
      } else {
        APP.drag._bypassedCables.delete(c.id);
      }
    }
  }

  redrawOnlyCables();

  for (const cid of APP.drag._bypassedCables) {
    const el = _svg?.querySelector('.cable-visual[data-cid="' + cid + '"]');
    if (el) el.classList.add('route-hover-highlight');
  }
}

// ── Patch en place après déplacement d'un port ou redimensionnement d'un nœud ──
// Même principe que redrawCablesMovingNode ci-dessus, mais pour un changement
// ponctuel (pas une session de drag continue) : on part directement du tracé
// caché courant comme référence, pas d'un snapshot. Ne touche que l'ancre + le
// stub adjacent de CHAQUE câble connecté à ce nœud ; le reste du tracé (et tous
// les câbles connectés à un AUTRE nœud) reste identique. Sans ça, un déplacement
// de quelques pixels — ou un redimensionnement, même minime — invalidait tout le
// tracé et forçait un nouveau calcul BFS complet pour TOUS les câbles du projet,
// qui pouvait reprendre une route entièrement différente pour des câbles sans
// aucun rapport avec le nœud modifié, et ignorer visuellement la direction de
// sortie forcée manuellement (from_stub_dir/to_stub_dir restent bien respectés,
// mais seulement pour LE stub lui-même — pas pour la suite du chemin, recalculée
// à neuf par le BFS).
// Gère aussi bien un port nommé (from_port/to_port, via le tableau ports du nœud)
// qu'un ancrage direct sans port (from_nx/from_ny seuls) — un redimensionnement
// peut toucher les deux cas, alors qu'un déplacement de port dans Configuration
// image ne concernait jusqu'ici que le premier.
// Le stub est reconstruit comme le coude orthogonal entre la NOUVELLE ancre et le
// point suivant du tracé (coude libre, OU stub/ancre de l'AUTRE bout du câble s'il
// n'y a pas de coude libre — jamais modifié ici), plutôt que translaté par un simple
// delta (x,y) : un déplacement de port le long d'un bord FIXE ne bouge qu'un seul
// axe (la translation suffit alors), mais un redimensionnement peut déplacer l'ancre
// en diagonale (x ET y à la fois) — une simple translation casse alors l'angle droit
// avec le point suivant, qui lui n'a pas bougé, créant un segment en diagonale
// (repéré sur un câble à un seul coude par bout, où ce point suivant est justement
// le stub/ancre de l'autre bout).
function _patchCablesForPortMove(nid) {
  const s = APP.nodes[nid];
  if (!s) return;
  const R = v => Math.round(v);

  for (const c of APP.cables) {
    const pts = cableOverrides[c.id];
    if (!pts || pts.length < 2) continue;
    const n = pts.length;

    if (c.from === nid) {
      let nx, ny;
      if (c.from_port) { const p = s.ports.find(pp => pp.id === c.from_port); if (p) { nx = p.nx; ny = p.ny; } }
      else if (c.from_nx != null) { nx = c.from_nx; ny = c.from_ny; }
      if (nx != null) {
        c.from_nx = nx; c.from_ny = ny;
        const oldAnc  = pts[0];
        const oldStub = pts[1];
        const newAnc  = edgePtFixed(s, nx, ny).map(R);
        // Port inchangé → ne toucher à rien. Cette fonction ne doit patcher que ce
        // qu'un déplacement a réellement décalé : réécrire le stub à sa position
        // « canonique » depuis l'ancre écrase un coude légitime du tracé et rend le
        // segment voisin oblique. Cas observé sur un câble à 3 points avec direction
        // de sortie forcée, dont le point voisin est l'ancre fixe de l'autre appareil,
        // donc impossible à réaligner — un simple « Appliquer » sans aucune
        // modification suffisait à créer la diagonale.
        const moved = Math.abs(newAnc[0] - oldAnc[0]) > 1 || Math.abs(newAnc[1] - oldAnc[1]) > 1;
        if (moved) {
          pts[0] = newAnc;
          if (n >= 3) {
            if (c.from_stub_dir && n > 3) {
              // Direction forcée : le nouveau stub est dérivé de l'ancre, pas du point
              // suivant — celui-ci doit donc se réajuster pour rester à angle droit.
              pts[1] = _stubFromDir(newAnc, c.from_stub_dir);
              const oldStubY = oldStub[1];
              if (Math.abs(pts[2][1] - oldStubY) < 1) pts[2] = [pts[2][0], pts[1][1]];
              else                                     pts[2] = [pts[1][0], pts[2][1]];
            } else if (c.from_stub_dir) {
              // Tracé à 3 points : pts[1] n'est pas un court stub de sortie, c'est le
              // coude unique qui porte TOUT le tracé, et pts[2] est l'ancre fixe de
              // l'autre appareil. Le remplacer par le stub canonique (à ~20 px du port)
              // jetterait la route entière. On se contente donc de le réaligner sur la
              // nouvelle ancre, en gardant l'axe imposé par la direction forcée : le
              // tracé se décale du déplacement du port, sans changer de forme.
              const stubIsH = (c.from_stub_dir === 'left' || c.from_stub_dir === 'right');
              const pivot   = pts[2];
              pts[1] = stubIsH ? [pivot[0], newAnc[1]] : [newAnc[0], pivot[1]];
            } else {
              const wasH  = Math.abs(oldStub[1] - oldAnc[1]) < 1;
              const pivot = pts[2]; // coude libre ou stub/ancre fixe de l'autre bout — inchangé
              pts[1] = wasH ? [pivot[0], newAnc[1]] : [newAnc[0], pivot[1]];
            }
          }
        }
      }
    }

    if (c.to === nid) {
      let nx, ny;
      if (c.to_port) { const p = s.ports.find(pp => pp.id === c.to_port); if (p) { nx = p.nx; ny = p.ny; } }
      else if (c.to_nx != null) { nx = c.to_nx; ny = c.to_ny; }
      if (nx != null) {
        c.to_nx = nx; c.to_ny = ny;
        // Longueur relue ici : le bloc « from » ci-dessus a pu insérer un coude sur ce
        // même tracé, auquel cas les index comptés depuis la fin auraient glissé.
        const m = pts.length;
        const oldAnc  = pts[m - 1];
        const oldStub = pts[m - 2];
        const newAnc  = edgePtFixed(s, nx, ny).map(R);
        // Même garde qu'à l'extrémité « from » ci-dessus : port inchangé, on ne touche
        // à rien. C'est ici que les diagonales apparaissaient (câbles à 3 points dont
        // l'arrivée porte une direction de sortie forcée).
        const moved = Math.abs(newAnc[0] - oldAnc[0]) > 1 || Math.abs(newAnc[1] - oldAnc[1]) > 1;
        if (moved) {
          pts[m - 1] = newAnc;
          if (m >= 3) {
            if (c.to_stub_dir && m > 3) {
              pts[m - 2] = _stubFromDir(newAnc, c.to_stub_dir);
              const oldStubY = oldStub[1];
              if (Math.abs(pts[m - 3][1] - oldStubY) < 1) pts[m - 3] = [pts[m - 3][0], pts[m - 2][1]];
              else                                          pts[m - 3] = [pts[m - 2][0], pts[m - 3][1]];
            } else if (c.to_stub_dir) {
              // Tracé à 3 points : même raisonnement qu'à l'extrémité « from » ci-dessus.
              const stubIsH = (c.to_stub_dir === 'left' || c.to_stub_dir === 'right');
              const pivot   = pts[m - 3];
              pts[m - 2] = stubIsH ? [pivot[0], newAnc[1]] : [newAnc[0], pivot[1]];
            } else {
              const wasH  = Math.abs(oldStub[1] - oldAnc[1]) < 1;
              const pivot = pts[m - 3];
              pts[m - 2] = wasH ? [pivot[0], newAnc[1]] : [newAnc[0], pivot[1]];
            }
          }
        }
      }
    }
  }
}

// ── Redessiner câbles uniquement (sans recalcul BFS) ─────────
function redrawOnlyCables() {
  _svg = document.getElementById('cables-svg');
  // Synchronisé ici plutôt que dans selectCable/clearSelCable : plusieurs chemins
  // modifient selCableId directement (menu clic droit sur un embout, glissement d'un
  // segment) sans passer par ces fonctions, mais tous finissent par redessiner ici.
  _setCablesOnTop(selCableId != null);
  const defs = _svg.querySelector('defs');
  // Ne PAS supprimer : les points lumineux vivent normalement dans #flow-svg, où ce
  // vidage ne les atteint pas — mais _xFlowOverlay = false les ramène ici, et sans cette
  // sauvegarde un simple redessin de câble les effacerait en pleine animation.
  const particles = [..._svg.querySelectorAll('circle.flow-particle')];
  _svg.innerHTML = '';
  if (defs) _svg.appendChild(defs);
  particles.forEach(p => _svg.appendChild(p));

  const orphanEntries = [];
  // Câble sélectionné dessiné en DERNIER : sa bande de capture passe ainsi devant
  // celles des câbles voisins, qui sinon peuvent la recouvrir et empêcher d'attraper
  // un segment dans une zone dense (tri stable : l'ordre des autres est préservé).
  const _ordered = [...APP.cables].sort((a, b) => (a.id === selCableId) - (b.id === selCableId));
  for (const c of _ordered) {
    if (WIRELESS_TYPES.has(c.type)) continue; // pas de trajet à dessiner, voir renderCables()
    const pts = cableOverrides[c.id];
    if (!pts || !pts.length) continue;
    const orphan = !APP.nodes[c.from] || !APP.nodes[c.to];
    drawCable(c, pts, orphan);
    if (orphan) orphanEntries.push({ c, pts });
  }
  // Poignées orphelines en passe séparée, après tous les câbles (voir renderCables()
  // pour le pourquoi : rester toujours au-dessus des bandes de capture voisines).
  orphanEntries.forEach(({ c, pts }) => {
    if (c.orphan_from) _drawOrphanHandle(c, pts, 0, 'from');
    if (c.orphan_to)   _drawOrphanHandle(c, pts, pts.length - 1, 'to');
  });
  drawJunctionMarkers();
  scheduleMinimap();
  if (typeof applyCanvasFilters === 'function') applyCanvasFilters();
}

// ── Marqueurs de jonction IN+OUT (port dual partagé par 2 câbles) ─
function drawJunctionMarkers() {
  const endpointMap = new Map();
  for (const c of APP.cables) {
    if (WIRELESS_TYPES.has(c.type)) continue; // pas de triangle de jonction pour un lien sans fil
    const pts = cableOverrides[c.id];
    if (!pts || pts.length < 2) continue;
    if (c.from && c.from_nx != null) {
      const key = `${c.from}|${c.from_nx}|${c.from_ny}`;
      if (!endpointMap.has(key)) endpointMap.set(key, []);
      endpointMap.get(key).push({ c, pts, end: 'from' });
    }
    if (c.to && c.to_nx != null) {
      const key = `${c.to}|${c.to_nx}|${c.to_ny}`;
      if (!endpointMap.has(key)) endpointMap.set(key, []);
      endpointMap.get(key).push({ c, pts, end: 'to' });
    }
  }

  const markers = [];
  for (const [key, entries] of endpointMap) {
    if (entries.length < 2) continue;
    const [nodeId, nxStr, nyStr] = key.split('|');
    const node = APP.nodes[nodeId];
    if (!node?.ports) continue;
    const nx = parseFloat(nxStr), ny = parseFloat(nyStr);
    const port = node.ports.find(p => Math.abs(p.nx - nx) < 0.001 && Math.abs(p.ny - ny) < 0.001);
    if (!port?.dual) continue;
    const { pts, end } = entries[0];
    const jp = end === 'from' ? pts[0] : pts[pts.length - 1];
    const np = end === 'from' ? pts[1] : pts[pts.length - 2];
    const angle = Math.atan2(np[1] - jp[1], np[0] - jp[0]) * 180 / Math.PI;
    markers.push({ x: jp[0], y: jp[1], angle, color: entries[0].c.color || '#888', nodeId, portId: port.id });
  }

  if (markers.length === 0) return;

  // Masque SVG : cache le câble à l'intérieur des triangles
  // (le node HTML en dessous du SVG reste visible car transparent)
  let defs = _svg.querySelector('defs');
  if (!defs) { defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs'); _svg.prepend(defs); }
  defs.querySelector('#jct-mask')?.remove();

  const mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
  mask.setAttribute('id', 'jct-mask');
  const bgR = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgR.setAttribute('x', '-100000'); bgR.setAttribute('y', '-100000');
  bgR.setAttribute('width', '200000'); bgR.setAttribute('height', '200000');
  bgR.setAttribute('fill', 'white');
  mask.appendChild(bgR);

  const tipDist = 35, triH = 20, base = 7;
  for (const { x, y, angle } of markers) {
    const rad = angle * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const T = ([px, py]) => `${x + px*cos - py*sin},${y + px*sin + py*cos}`;
    for (const tri of [
      [[-tipDist,0],[-base,-triH],[-base,triH]],
      [[tipDist,0], [base,-triH], [base,triH]]
    ]) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      el.setAttribute('points', tri.map(T).join(' '));
      el.setAttribute('fill', 'black');
      mask.appendChild(el);
    }
  }
  defs.appendChild(mask);

  // Appliquer le masque aux paths visuels des câbles uniquement
  for (const el of _svg.querySelectorAll('.cable-visual')) {
    el.setAttribute('mask', 'url(#jct-mask)');
  }

  // Dessiner les contours du marqueur (hors masque → toujours visible)
  for (const { x, y, angle, color, nodeId, portId } of markers) {
    _drawBowtieMarker(x, y, angle, color, nodeId, portId);
  }
}

function _drawBowtieMarker(x, y, angleDeg, color, nodeId, portId) {
  const tipDist = 35, triH = 20, base = 7, gap = 4, barH = 7;
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'junction-marker');
  if (nodeId) g.dataset.nodeId = nodeId;
  if (portId) g.dataset.portId = portId;
  g.setAttribute('transform', `translate(${x},${y}) rotate(${angleDeg})`);
  g.style.pointerEvents = 'none';

  const poly = (pts, fill) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    el.setAttribute('points', pts); el.setAttribute('fill', fill);
    return el;
  };
  const rect = (rx, ry, rw, rh, fill) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    el.setAttribute('x', rx); el.setAttribute('y', ry);
    el.setAttribute('width', rw); el.setAttribute('height', rh);
    el.setAttribute('fill', fill);
    return el;
  };

  // Triangles : contour couleur câble, intérieur transparent (masque cache le câble derrière)
  const triLeft = poly(`-${tipDist},0 -${base},-${triH} -${base},${triH}`, 'none');
  triLeft.setAttribute('stroke', color); triLeft.setAttribute('stroke-width', '3.5');
  triLeft.setAttribute('stroke-linejoin', 'round'); triLeft.setAttribute('vector-effect', 'non-scaling-stroke');
  const triRight = poly(`${tipDist},0 ${base},-${triH} ${base},${triH}`, 'none');
  triRight.setAttribute('stroke', color); triRight.setAttribute('stroke-width', '3.5');
  triRight.setAttribute('stroke-linejoin', 'round'); triRight.setAttribute('vector-effect', 'non-scaling-stroke');
  g.appendChild(triLeft);
  g.appendChild(triRight);
  g.appendChild(rect(-base, -(gap + barH), base * 2, barH, color));
  g.appendChild(rect(-base, gap, base * 2, barH, color));
  _svg.appendChild(g);
}

// Hit-test un point écran contre les segments TERMINAUX (stubs) d'un câble.
// Retourne l'index du segment (0 = stub 'from', nPts-2 = stub 'to') ou null.
// Utilisé par le clic droit (menu contextuel direction/coude).
function _hitTestStubSeg(e, pts) {
  const { x, y } = screenToCanvas(e.clientX, e.clientY);
  const HIT = 30 / APP.view.zoom;
  let bestSeg = null, bestDist = HIT;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1,y1] = pts[i], [x2,y2] = pts[i+1];
    const isH = Math.abs(y2-y1) < EPS, isV = Math.abs(x2-x1) < EPS;
    if (!isH && !isV) continue;
    let dist;
    if (isH) { if (x<Math.min(x1,x2)-5||x>Math.max(x1,x2)+5) continue; dist=Math.abs(y-y1); }
    else      { if (y<Math.min(y1,y2)-5||y>Math.max(y1,y2)+5) continue; dist=Math.abs(x-x1); }
    if (dist < bestDist) { bestDist = dist; bestSeg = i; }
  }
  const nPts = pts.length;
  // Segment terminal exact → correspondance directe.
  if (bestSeg === 0 || bestSeg === nPts - 2) return bestSeg;
  // Segment immédiatement adjacent à un stub terminal → même bout. Le stub lui-même
  // peut être trop court pour viser précisément dessus (clic droit qui tombe alors,
  // géométriquement, plus près du segment suivant/précédent). Chemin à 3 segments :
  // le seul segment du milieu est adjacent aux deux bouts à la fois — 'from' l'emporte
  // arbitrairement, cas rare et sans conséquence (les deux options restent accessibles
  // via le clic exact sur l'autre bout).
  if (bestSeg === 1)        return 0;
  if (bestSeg === nPts - 3) return nPts - 2;
  return null;
}

// ── Largeur de la bande de capture d'un câble ────────────────
// Bande invisible, plus large que le trait, dans laquelle un clic attrape le câble.
// Elle est exprimée en unités du canevas, or le zoom est une transformation CSS du
// conteneur : à 24 en dur, elle grossissait donc proportionnellement au zoom, exactement
// comme l'écart entre deux câbles voisins. Zoomer ne servait à rien pour viser — le
// recouvrement entre deux bandes restait identique à tous les niveaux.
// On vise désormais une largeur constante À L'ÉCRAN (24 px) dès qu'on zoome au-delà de
// 100 % : la bande rétrécit dans le canevas au fur et à mesure, et deux câbles voisins
// finissent par se séparer. En dessous de 100 %, on garde la valeur d'origine — une
// largeur fixe à l'écran y couvrirait beaucoup plus de canevas qu'aujourd'hui et ferait
// justement attraper le voisin en vue d'ensemble.
// Sécu de régression : window._xHitScreenWidth = false dans la console DevTools rétablit
// l'ancien comportement (24 à tous les zooms).
const HIT_BAND_PX = 24;

function _cableHitWidth() {
  if (window._xHitScreenWidth === false) return HIT_BAND_PX;
  const z = APP?.view?.zoom || 1;
  return +(HIT_BAND_PX / Math.max(1, z)).toFixed(2);
}

// Réécrit l'épaisseur sur les bandes DÉJÀ dessinées, sans rien redessiner : une seule
// écriture d'attribut par câble, appelée au changement de zoom. Sort immédiatement si
// la largeur n'a pas changé (déplacement du canevas, zoom sous 100 %).
let _lastHitWidth = null;
function refreshCableHitWidths() {
  const w = _cableHitWidth();
  if (w === _lastHitWidth) return;
  _lastHitWidth = w;
  document.querySelectorAll('#cables-svg .cable-hit').forEach(p => p.setAttribute('stroke-width', w));
}

// ── Dessiner un câble (visual + hit path unique) ─────────────
function drawCable(c, pts, orphan = false) {
  const d = toSVG(pts);
  if (!d) return;

  const isSelected = c.id === selCableId;

  // ── Path visuel ──────────────────────────────────────────────
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  p.setAttribute('stroke', orphan ? '#556' : (c.color || '#888'));
  p.setAttribute('stroke-width', isSelected ? '5' : (orphan ? '2' : '3.5'));
  p.setAttribute('fill', 'none');
  p.setAttribute('opacity', isSelected ? '1' : (orphan ? '0.5' : '0.85'));
  if (orphan) p.setAttribute('stroke-dasharray', '6,5');
  if (!orphan && c.dashed && c.dashed !== 'solid') {
    if (c.dashed === 'long') p.setAttribute('stroke-dasharray', '16,10');
    else p.setAttribute('stroke-dasharray', '6,4'); // 'short' ou true (legacy)
  }
  if (isSelected)      p.setAttribute('filter', 'url(#glow)');
  p.setAttribute('vector-effect', 'non-scaling-stroke');
  p.setAttribute('data-cid', c.id);
  p.classList.add('cable-visual', 'cp');
  p.style.pointerEvents = 'none';
  if (isSelected) p.dataset.selected = '1';
  _svg.appendChild(p);

  // Stub sélectionné (direction OU coude) : segment surligné en cyan (épouse la courbure du coin)
  const _stubUiState = _stubSelState || _stubBendState;
  if (_stubUiState && _stubUiState.cid === c.id && pts.length >= 2) {
    const n2 = pts.length;
    const RC = 10;
    let hlD;
    if (_stubUiState.end === 'from') {
      if (n2 >= 3) {
        const P = pts[0], C = pts[1], Nxt = pts[2];
        const l1 = Math.hypot(C[0]-P[0], C[1]-P[1]);
        const l2 = Math.hypot(Nxt[0]-C[0], Nxt[1]-C[1]);
        const r  = Math.min(RC, l1/2, l2/2);
        // vp = direction corner → P (côté stub), vn = corner → Nxt
        const vp = [(P[0]-C[0])/l1,   (P[1]-C[1])/l1];
        const vn = [(Nxt[0]-C[0])/l2, (Nxt[1]-C[1])/l2];
        // bxy = début de la bezier côté stub (r avant le coin)
        const bxy  = [C[0]+r*vp[0], C[1]+r*vp[1]];
        // ctrl de la demi-bezier (t=0→0.5) = mid(bxy, C)
        const ctrl = [C[0]+r/2*vp[0], C[1]+r/2*vp[1]];
        // point à 45° = B(0.5) = C + r/4*(vp+vn)
        const mid  = [C[0]+r/4*(vp[0]+vn[0]), C[1]+r/4*(vp[1]+vn[1])];
        hlD = `M${P[0]} ${P[1]} L${bxy[0].toFixed(1)} ${bxy[1].toFixed(1)} Q${ctrl[0].toFixed(1)} ${ctrl[1].toFixed(1)} ${mid[0].toFixed(1)} ${mid[1].toFixed(1)}`;
      } else {
        hlD = `M${pts[0][0]} ${pts[0][1]} L${pts[1][0]} ${pts[1][1]}`;
      }
    } else {
      if (n2 >= 3) {
        const Prev = pts[n2-3], C = pts[n2-2], E = pts[n2-1];
        const l1 = Math.hypot(C[0]-Prev[0], C[1]-Prev[1]);
        const l2 = Math.hypot(E[0]-C[0],    E[1]-C[1]);
        const r  = Math.min(RC, l1/2, l2/2);
        // vp = direction corner → Prev, vo = corner → E (côté stub)
        const vp = [(Prev[0]-C[0])/l1, (Prev[1]-C[1])/l1];
        const vo = [(E[0]-C[0])/l2,    (E[1]-C[1])/l2];
        // axy = fin de la bezier côté stub (r avant le coin depuis E)
        const axy  = [C[0]+r*vo[0], C[1]+r*vo[1]];
        // ctrl de la demi-bezier (axy → mid) = mid(axy, C)
        const ctrl = [C[0]+r/2*vo[0], C[1]+r/2*vo[1]];
        // point à 45° = B(0.5) = C + r/4*(vp+vo)
        const mid  = [C[0]+r/4*(vp[0]+vo[0]), C[1]+r/4*(vp[1]+vo[1])];
        hlD = `M${E[0]} ${E[1]} L${axy[0].toFixed(1)} ${axy[1].toFixed(1)} Q${ctrl[0].toFixed(1)} ${ctrl[1].toFixed(1)} ${mid[0].toFixed(1)} ${mid[1].toFixed(1)}`;
      } else {
        hlD = `M${pts[n2-2][0]} ${pts[n2-2][1]} L${pts[n2-1][0]} ${pts[n2-1][1]}`;
      }
    }
    const hl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hl.setAttribute('d', hlD);
    hl.setAttribute('stroke', '#00d4ff');
    hl.setAttribute('stroke-width', '6');
    hl.setAttribute('stroke-linecap', 'round');
    hl.setAttribute('fill', 'none');
    hl.setAttribute('vector-effect', 'non-scaling-stroke');
    hl.style.pointerEvents = 'none';
    _svg.appendChild(hl);
  }

  // ── Path hit unique (hover + clic + drag) ────────────────────
  // Le drag de segment est détecté au pointerdown en itérant les segments.
  // Les listeners de move/up sont sur window pour survivre aux redraws SVG.
  {
    const ph = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    ph.setAttribute('d', d);
    ph.setAttribute('stroke', 'transparent');
    // Bande de capture (survol + clic + drag), cf. _cableHitWidth().
    ph.setAttribute('stroke-width', _cableHitWidth());
    ph.setAttribute('fill', 'none');
    ph.setAttribute('pointer-events', 'stroke');
    ph.setAttribute('cursor', 'move');
    ph.setAttribute('data-cid', c.id);
    ph.classList.add('cable-hit');

    // Tooltip hover
    // ⚠️ window._hoverRafCoalesce (par défaut true) regroupe l'épaississement/opacity/
    // filter par frame (requestAnimationFrame) au lieu de les écrire en synchrone à
    // chaque enter/leave : un balayage rapide sur une zone dense enchaînait ces écritures
    // (dont le filtre #glow, coûteux à recomposer) plus vite que le navigateur ne pouvait
    // peindre, d'où un clignotement visuel (câbles/étiquettes disparaissant brièvement).
    let _hoverRaf = null;
    const _applyEnter = () => {
      const vis = _svg.querySelector(`.cable-visual[data-cid="${c.id}"]`);
      if (!vis || vis.dataset.selected) return;
      // Épaississement franc (3.5→7) + halo néon (#glow). Ignoré si déjà mis en avant
      // (câble sélectionné, connecté au nœud sélectionné, ou membre de la route active —
      // voir _updateTrace) : déjà à son opacité maximale, rien à ajouter.
      vis.setAttribute('stroke-width','7'); vis.setAttribute('opacity','1'); vis.setAttribute('filter','url(#glow)');
    };
    const _applyLeave = () => {
      const vis = _svg.querySelector(`.cable-visual[data-cid="${c.id}"]`);
      // Retour à l'état de repos RÉEL, pas à 0.85 en dur (qui « rallumait » les
      // câbles estompés par une sélection ou une route dès qu'on les survolait).
      // - nœud sélectionné : ce câble n'est pas connecté (sinon dataset.selected)
      //   → il doit rester estompé comme l'a mis selectNode (0.03 / 1).
      // - route active : idem, vérifié directement ici.
      if (!vis || vis.dataset.selected) return;
      // Filtre catégorie/câble/zone actif : applyCanvasFilters() est la seule source
      // de vérité pour l'opacité correcte de CE câble (visible ou masqué) — sans ce
      // court-circuit, le 0.85 en dur plus bas révélait un câble filtré dès qu'on le
      // survolait puis le quittait, car cet appel (différé d'une frame par le
      // regroupement RAF ci-dessous) s'exécutait souvent APRÈS l'appel équivalent placé
      // dans mouseleave (lui synchrone), écrasant la correction qu'il venait de poser.
      const filtersActive = !(_catFilterExclude && _catFilter.size === 0 && _cableFilterExclude && _cableFilter.size === 0 && _zoneFilterExclude && _zoneFilter.size === 0);
      if (!APP.sel && filtersActive && typeof applyCanvasFilters === 'function') {
        applyCanvasFilters();
        return;
      }
      vis.removeAttribute('filter');
      // _isDimmingActive() couvre route active ET animation de segment/chemin isolés
      // (routes.js) — un simple _activeRoutes.size laissait ces deux dernières se
      // faire raviver au survol, puisqu'elles ne touchent volontairement pas _activeRoutes.
      const routeActive = typeof _isDimmingActive === 'function' && _isDimmingActive();
      let sw, op;
      if (APP.sel || routeActive) { sw = '1';   op = '0.03'; }
      else                        { sw = '3.5'; op = '0.85'; }
      vis.setAttribute('stroke-width', sw); vis.setAttribute('opacity', op);
    };
    ph.addEventListener('mouseenter', () => {
      const vis = _svg.querySelector(`.cable-visual[data-cid="${c.id}"]`);
      // Un estompage en cours (route active ou nœud sélectionné) et ce câble n'y est pas
      // marqué (dataset.selected) : ni éclaircissement, ni info-bulle, ni positionnement —
      // sortie complète, avant tout effet de bord. Sans ça, l'info-bulle (posée hors de ce
      // bloc auparavant) s'affichait pour n'importe quel câble estompé survolé.
      const dimmingActive = (typeof _isDimmingActive === 'function' && _isDimmingActive()) || !!APP.sel;
      if (dimmingActive && !vis?.dataset.selected) return;
      // Câble masqué par un filtre catégorie/câble/zone (opacité 0, posée par
      // applyCanvasFilters) : ne pas le raviver au survol, ça viderait le filtre de son sens.
      if (vis?.getAttribute('opacity') === '0') return;

      if (window._hoverRafCoalesce) {
        if (_hoverRaf) cancelAnimationFrame(_hoverRaf);
        _hoverRaf = requestAnimationFrame(() => { _hoverRaf = null; _applyEnter(); });
      } else {
        _applyEnter();
      }
      _ctt = document.getElementById('ctt');
      _ctt.style.display = 'block';
      const fn = APP.nodes[c.from]?.name || c.from;
      const tn = APP.nodes[c.to]?.name   || c.to;
      _ctt.innerHTML = `<span style="color:${escapeHtml(c.color)}">${escapeHtml(tType(c.type))}</span> — ${escapeHtml(fn)} ↔ ${escapeHtml(tn)}`;
    });
    ph.addEventListener('mousemove', e => {
      _ctt = document.getElementById('ctt');
      _ctt.style.left = Math.min(e.clientX + 14, window.innerWidth - 320) + 'px';
      _ctt.style.top  = (e.clientY - 34) + 'px';
    });
    ph.addEventListener('mouseleave', () => {
      document.getElementById('ctt').style.display = 'none';
      // Le cas filtre actif est désormais géré à l'intérieur de _applyLeave() elle-même
      // (voir son commentaire) — plus besoin d'un second appel à applyCanvasFilters()
      // ici, qui pouvait de toute façon s'exécuter avant elle et se faire écraser.
      if (window._hoverRafCoalesce) {
        if (_hoverRaf) cancelAnimationFrame(_hoverRaf);
        _hoverRaf = requestAnimationFrame(() => { _hoverRaf = null; _applyLeave(); });
      } else {
        _applyLeave();
      }
    });

    // Pointerdown : clic droit sur segment terminal → menu contextuel (direction/coude)
    //               sinon → drag de segment
    ph.addEventListener('pointerdown', e => {
      if (e.button === 2) {
        const pts2 = cableOverrides[c.id];
        const bestSeg = (pts2 && pts2.length >= 2) ? _hitTestStubSeg(e, pts2) : null;
        if (bestSeg !== null) {
          e.stopPropagation();
          e.preventDefault();
          _showStubMenu(e, c.id, bestSeg === 0 ? 'from' : 'to');
        }
        return;
      }
      if (e.button !== 0) return;
      // Une route/chemin/segment est en cours d'animation (voir _isDimmingActive,
      // routes.js) : déplacer un segment est verrouillé, même règle et même repli
      // (panoramique du canevas) que pour un appareil (nodes.js) — l'animation garde
      // une référence directe vers le tracé SVG du câble, prise une seule fois à son
      // lancement et jamais rafraîchie ; un glissement pendant qu'elle tourne la
      // faisait pointer vers un tracé détruit, donc figé sur l'ancienne position.
      if (typeof _isDimmingActive === 'function' && _isDimmingActive()) {
        e.stopPropagation();
        e.preventDefault();
        if (typeof startCanvasPanFromEvent === 'function') startCanvasPanFromEvent(e);
        return;
      }
      e.stopPropagation();
      e.preventDefault();

      _startSegmentDrag(e, c);
    });

    // Click (sans drag) : sélection
    ph.addEventListener('click', e => {
      if (_segDragged) return;
      e.stopPropagation();
      selectCable(c.id);
    });

    _svg.appendChild(ph);
  }

  // Les poignées d'extrémités orphelines sont dessinées ailleurs, dans une passe
  // séparée APRÈS tous les câbles (voir renderCables()/redrawOnlyCables()) — sinon
  // un câble voisin dessiné juste après dans cette même boucle pourrait recouvrir
  // la zone de capture de la poignée avec sa propre bande invisible de 24px.
}

// ── Sélection de stub terminal (menu clic droit) ──────────────
let _stubSelState  = null; // { cid, end: 'from'|'to' } — mode "changer de direction"
let _stubBendState = null; // { cid, end: 'from'|'to' } — mode "créer un coude"

function _stubFromDir(anchor, dir) {
  const L = STUB_LEN;
  if (dir === 'left')  return [anchor[0] - L, anchor[1]];
  if (dir === 'right') return [anchor[0] + L, anchor[1]];
  if (dir === 'up')    return [anchor[0], anchor[1] - L];
  return [anchor[0], anchor[1] + L]; // down
}

function setStubDir(dir) {
  const st = _stubSelState;
  if (!st) return;
  const c = APP.cables.find(x => x.id === st.cid);
  if (!c) return;
  const pts = cableOverrides[c.id];
  if (!pts || pts.length < 2) return;
  pushUndo();

  // Réancrer les extrémités sur les coordonnées de port réelles (évite la dérive cumulative)
  const fromNode = APP.nodes[c.from], toNode = APP.nodes[c.to];
  if (fromNode && c.from_nx != null) pts[0] = edgePtFixed(fromNode, c.from_nx, c.from_ny);
  if (toNode   && c.to_nx   != null) pts[pts.length - 1] = edgePtFixed(toNode, c.to_nx, c.to_ny);

  const stubIsH = (dir === 'left' || dir === 'right');

  if (st.end === 'from') {
    c.from_stub_dir = dir;
    pts[1] = _stubFromDir(pts[0], dir);

    if (pts.length >= 3) {
      // Coin perpendiculaire au stub entre le nouveau bout et la suite du tracé
      // (pts[2], point intérieur ou ancre fixe suivante — jamais déplacé, juste lu).
      // Toujours perpendiculaire, jamais dans l'axe du stub : sinon la suite peut
      // repartir en sens inverse juste après, et donner l'impression que le
      // segment est parti dans le mauvais sens. simplify() retire ce coin
      // ensuite si la suite était déjà alignée (rien à corriger).
      const corner = stubIsH ? [pts[1][0], pts[2][1]] : [pts[2][0], pts[1][1]];
      pts.splice(2, 0, corner);
    }
  } else {
    c.to_stub_dir = dir;
    const n = pts.length;
    pts[n - 2] = _stubFromDir(pts[n - 1], dir);

    if (n >= 3) {
      const corner = stubIsH ? [pts[n - 2][0], pts[n - 3][1]] : [pts[n - 3][0], pts[n - 2][1]];
      pts.splice(n - 2, 0, corner);
    }
  }

  const result = simplify(normalizePts(pts));
  // Réinsérer le stub si simplify l'a supprimé (backtrack colinéaire)
  if (st.end === 'from') {
    const exp = _stubFromDir(result[0], dir);
    if (result.length < 2 || Math.abs(result[1][0] - exp[0]) > 1 || Math.abs(result[1][1] - exp[1]) > 1) {
      result.splice(1, 0, exp);
    }
  } else {
    const exp = _stubFromDir(result[result.length - 1], dir);
    if (result.length < 2 || Math.abs(result[result.length - 2][0] - exp[0]) > 1 || Math.abs(result[result.length - 2][1] - exp[1]) > 1) {
      result.splice(result.length - 1, 0, exp);
    }
  }
  cableOverrides[c.id] = result;
  redrawOnlyCables();
  setDirty();
}

function exitStubSel() {
  _stubSelState = null;
  redrawOnlyCables();
}

// ── Menu contextuel clic droit sur un stub : direction / coude ─
function _showStubMenu(e, cid, end) {
  document.getElementById('_stub-menu')?.remove();

  // Même habillage que le popup IN / OUT des ports doubles (newcable.js, _showDualPortPopup) :
  // fond/bordure navy, police mono, accent cyan au survol.
  const menu = document.createElement('div');
  menu.id = '_stub-menu';
  menu.style.cssText = `
    position:fixed; z-index:99999;
    background:#0a0f1e; border:1px solid #1e2d45; border-radius:6px;
    box-shadow:0 4px 16px rgba(0,0,0,.6); overflow:hidden;
    display:flex; flex-direction:column; min-width:200px;
  `;

  const items = [];
  const addItem = (label, onClick) => {
    const item = document.createElement('div');
    item.textContent = label;
    item.style.cssText = `
      padding:10px 14px; text-align:left;
      font-family:var(--mono); font-size:13px; font-weight:500; letter-spacing:1px;
      color:#b8ccec; cursor:pointer;
      transition:color .1s, background .1s;
      ${items.length > 0 ? 'border-top:1px solid #1e2d45;' : ''}
    `;
    item.addEventListener('mouseenter', () => { item.style.background = 'rgba(0,212,255,.18)'; item.style.color = '#00d4ff'; });
    item.addEventListener('mouseleave', () => { item.style.background = ''; item.style.color = '#b8ccec'; });
    item.addEventListener('click', ev => {
      ev.stopPropagation();
      onClick();
      menu.remove();
    });
    items.push(item);
    menu.appendChild(item);
  };

  addItem(t('stub_menu_change_dir'), () => {
    _stubBendState = null;
    _stubSelState = { cid, end };
    selCableId = cid; APP.selCable = cid;
    redrawOnlyCables();
  });
  addItem(t('stub_menu_create_bend'), () => {
    _stubSelState = null;
    _stubBendState = { cid, end };
    selCableId = cid; APP.selCable = cid;
    redrawOnlyCables();
  });

  document.body.appendChild(menu);

  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  menu.style.left = Math.max(4, Math.min(e.clientX, window.innerWidth  - mw - 8)) + 'px';
  menu.style.top  = Math.max(4, Math.min(e.clientY, window.innerHeight - mh - 8)) + 'px';

  // Fermeture sur tout NOUVEL appui (gauche ou droit) hors du menu.
  // Volontairement pas de listener sur 'click'/'contextmenu' : ces événements
  // se déclenchent au RELÂCHEMENT du bouton, donc pour le clic droit qui vient
  // d'ouvrir ce menu, son propre relâchement produirait un 'contextmenu' qui
  // fermerait le menu instantanément (bug : le menu ne "tenait" que bouton enfoncé).
  // 'pointerdown' ne se déclenche qu'à l'appui, donc jamais pour ce même clic.
  const close = ev => {
    if (!menu.contains(ev.target)) {
      menu.remove();
      document.removeEventListener('pointerdown', close);
    }
  };
  menu._stubMenuCleanup = () => document.removeEventListener('pointerdown', close);
  setTimeout(() => document.addEventListener('pointerdown', close), 0);
}

// ── Mode "créer un coude" ──────────────────────────────────────
function _dirBetween(from, to) {
  if (Math.abs(from[1] - to[1]) < 1) return to[0] < from[0] ? 'left' : 'right';
  return to[1] < from[1] ? 'up' : 'down';
}

function _bendKeyIsLive(dir) {
  const st = _stubBendState;
  if (!st) return false;
  const c = APP.cables.find(x => x.id === st.cid);
  if (!c) return false;
  const pts = cableOverrides[c.id];
  if (!pts || pts.length < 3) return false;

  const stubDir = (st.end === 'from')
    ? _dirBetween(pts[0], pts[1])
    : _dirBetween(pts[pts.length - 1], pts[pts.length - 2]);
  const stubIsH = (stubDir === 'left' || stubDir === 'right');
  const bendIsH = (dir === 'left' || dir === 'right');
  return bendIsH !== stubIsH;
}

function setStubBend(dir) {
  const st = _stubBendState;
  if (!st) return;
  const c = APP.cables.find(x => x.id === st.cid);
  if (!c) return;
  const pts = cableOverrides[c.id];
  if (!pts || pts.length < 3) return; // câble droit à 2 points : pas de stub distinct à courber
  pushUndo();

  // Réancrer les extrémités sur les coordonnées de port réelles (évite la dérive cumulative)
  const fromNode = APP.nodes[c.from], toNode = APP.nodes[c.to];
  if (fromNode && c.from_nx != null) pts[0] = edgePtFixed(fromNode, c.from_nx, c.from_ny);
  if (toNode   && c.to_nx   != null) pts[pts.length - 1] = edgePtFixed(toNode, c.to_nx, c.to_ny);

  let tipPt, bendPt;
  if (st.end === 'from') {
    const baseDir = _dirBetween(pts[0], pts[1]);
    pts[1] = _stubFromDir(pts[0], baseDir);        // ré-affirme le tip
    tipPt = pts[1];
    bendPt = _stubFromDir(pts[1], dir);             // nouveau coin, perpendiculaire

    if (pts.length === 3) {
      pts.splice(2, 0, bendPt); // pts[2] est l'ancre fixe de l'autre bout → jamais déplacée, on insère
    } else {
      pts[2] = bendPt;          // pts[2] est un point intérieur sûr → écrasement direct, idempotent
    }
  } else {
    const n = pts.length;
    const baseDir = _dirBetween(pts[n - 1], pts[n - 2]);
    pts[n - 2] = _stubFromDir(pts[n - 1], baseDir); // ré-affirme le tip
    tipPt = pts[n - 2];
    bendPt = _stubFromDir(pts[n - 2], dir);          // nouveau coin, perpendiculaire

    if (n === 3) {
      pts.splice(n - 2, 0, bendPt); // pts[n-3] est l'ancre fixe de l'autre bout → on insère avant le tip
    } else {
      pts[n - 3] = bendPt;          // pts[n-3] est un point intérieur sûr → écrasement direct, idempotent
    }
  }

  const result = simplify(normalizePts(pts));

  // simplify() peut effacer le coude s'il le juge redondant/backtrack — typiquement
  // quand la suite du câble doit repartir en sens inverse pour rejoindre l'autre
  // appareil. On le réinsère alors juste à côté du tip : l'appui sur une flèche
  // doit toujours produire un résultat visible dans la direction demandée,
  // même si ça ajoute un petit aller-retour local (même logique que le
  // "réinsérer le stub" de setStubDir ci-dessus).
  const CLOSE = (a, b) => Math.abs(a[0] - b[0]) < 1 && Math.abs(a[1] - b[1]) < 1;
  const tipIdx = result.findIndex(p => CLOSE(p, tipPt));
  if (tipIdx === -1) {
    if (st.end === 'from') result.splice(1, 0, tipPt, bendPt);
    else                   result.splice(result.length - 1, 0, bendPt, tipPt);
  } else if (st.end === 'from') {
    const next = result[tipIdx + 1];
    if (!next || !CLOSE(next, bendPt)) result.splice(tipIdx + 1, 0, bendPt);
  } else {
    const prev = result[tipIdx - 1];
    if (!prev || !CLOSE(prev, bendPt)) result.splice(tipIdx, 0, bendPt);
  }

  cableOverrides[c.id] = result;
  redrawOnlyCables();
  setDirty();
}

function exitStubBend() {
  _stubBendState = null;
  redrawOnlyCables();
}

// ── Drag de segment — état global ────────────────────────────
let _segDragState = null;
let _segDragged   = false; // true si un drag est en cours ou vient de finir

function _startSegmentDrag(e, c) {
  const pts = cableOverrides[c.id];
  if (!pts || pts.length < 2) return;

  // ── Trouver le segment le plus proche du curseur ──────────
  const { x, y } = screenToCanvas(e.clientX, e.clientY);
  const HIT_DIST  = 30 / APP.view.zoom; // distance max en canvas px
  const DRAG_THR  = 4  / APP.view.zoom; // seuil pour distinguer clic vs drag

  let bestSeg = null, bestDist = HIT_DIST;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const isH = Math.abs(y2 - y1) < EPS;
    const isV = Math.abs(x2 - x1) < EPS;
    if (!isH && !isV) continue;

    let dist;
    if (isH) {
      if (x < Math.min(x1, x2) - 5 || x > Math.max(x1, x2) + 5) continue;
      dist = Math.abs(y - y1);
    } else {
      if (y < Math.min(y1, y2) - 5 || y > Math.max(y1, y2) + 5) continue;
      dist = Math.abs(x - x1);
    }
    if (dist < bestDist) { bestDist = dist; bestSeg = { i, isH }; }
  }
  if (!bestSeg) return;

  const { i: sIdx, isH } = bestSeg;
  const N = pts.length;

  // ── Segments terminaux : non draggables (liés au nœud) ───
  // Utiliser le clic droit (menu direction/coude) pour les modifier.
  if (N === 2 || sIdx === 0 || sIdx === N - 2) return;

  // Pas d'instantané d'annulation ici : à l'appui, on ne sait pas encore si c'est un
  // glissement ou un simple clic de sélection. pushUndo() se terminant par setDirty(),
  // le prendre d'avance marquait le projet comme modifié au moindre clic sur un câble
  // — la boîte « sauvegarder ? » s'ouvrait à la fermeture sans que rien n'ait changé.
  // Il est donc pris au premier vrai déplacement (voir onMove), ce qui évite aussi de
  // recopier tout le projet à chaque clic.
  _segDragged = false;

  const startPts    = pts.map(p => [...p]);
  const startCanvas = screenToCanvas(e.clientX, e.clientY);
  const startVal    = isH ? startPts[sIdx][1] : startPts[sIdx][0];

  _segDragState = {
    c, isH, sIdx,
    startPts, startCanvas, startVal,
    bpStart: sIdx, bpLen: 2,
    dragThreshold: DRAG_THR,
    undoPushed: false,   // instantané pris au premier déplacement réel, une seule fois
  };

  // ── Listeners sur window — survivent aux redraws SVG ──────
  // ⚠️ window._dragRafCoalesce (par défaut true) : redrawOnlyCables() reconstruit TOUTE
  // la scène (vide puis redessine tous les câbles, triangles de jonction, etc.) — appelé
  // en synchrone à chaque pointermove, un glissement rapide enchaînait ces reconstructions
  // plus vite que le navigateur ne pouvait peindre, provoquant le même clignotement que
  // celui déjà corrigé au survol. Le calcul (contournement, snap) reste synchrone à chaque
  // évènement ; seule la reconstruction visuelle est désormais regroupée par frame.
  let _dragRaf = null;
  const onMove = e => {
    const st = _segDragState;
    if (!st) return;
    const pts = cableOverrides[st.c.id];
    if (!pts) return;

    const cur      = screenToCanvas(e.clientX, e.clientY);
    const rawDelta = st.isH ? cur.y - st.startCanvas.y : cur.x - st.startCanvas.x;
    if (Math.abs(rawDelta) < st.dragThreshold && !_segDragged) return;

    // Premier déplacement réel : c'est maintenant qu'on capture l'état d'avant, alors
    // que le tracé n'a encore subi aucune modification (le splice a lieu plus bas).
    if (!st.undoPushed) { st.undoPushed = true; pushUndo(); }

    _segDragged = true;
    document.body.style.cursor = st.isH ? 'ns-resize' : 'ew-resize';

    const SNAP     = 8;
    const SNAP_MAG = 24 / APP.view.zoom; // magnétisme entre segments parallèles
    let   newVal   = Math.round((st.startVal + rawDelta) / SNAP) * SNAP;

    // Magnétisme : snaper sur un segment parallèle proche (évite doubles coudes inutiles)
    for (let j = 0; j < pts.length - 1; j++) {
      if (j >= st.bpStart && j < st.bpStart + st.bpLen) continue; // ignorer le segment draggé
      const [jx1, jy1] = pts[j], [jx2, jy2] = pts[j + 1];
      const jIsH = Math.abs(jy2 - jy1) < EPS;
      if (jIsH !== st.isH) continue; // orientation différente
      const jVal = st.isH ? jy1 : jx1;
      if (Math.abs(newVal - jVal) <= SNAP_MAG) { newVal = jVal; break; }
    }

    const axIdx  = st.isH ? 0 : 1;
    const c0     = st.startPts[st.sIdx][axIdx];
    const c1     = st.startPts[st.sIdx + 1][axIdx];

    const bpPts  = _computeBypassPts(st.isH ? 'H' : 'V', c0, c1, newVal, st.startVal, st.c.from, st.c.to);
    pts.splice(st.bpStart, st.bpLen, ...bpPts);
    st.bpLen         = bpPts.length;

    if (selCableId !== st.c.id) { clearSel(); selCableId = st.c.id; APP.selCable = st.c.id; }

    if (window._dragRafCoalesce) {
      if (_dragRaf) cancelAnimationFrame(_dragRaf);
      _dragRaf = requestAnimationFrame(() => { _dragRaf = null; redrawOnlyCables(); });
    } else {
      redrawOnlyCables();
    }
  };

  const onUp = e => {
    window.removeEventListener('pointermove', onMove);
    document.body.style.cursor = '';
    if (_dragRaf) { cancelAnimationFrame(_dragRaf); _dragRaf = null; }

    if (_segDragged && _segDragState) {
      const pts = cableOverrides[_segDragState.c.id];
      if (pts) cableOverrides[_segDragState.c.id] = simplify(normalizePts(pts));
      // Redraw synchrone explicite : selectCable() ci-dessous ne redessine pas tant que
      // _segDragState n'est pas encore remis à null (voir sa propre garde), et le dernier
      // redraw programmé par onMove vient d'être annulé juste au-dessus — sans cet appel,
      // la position finale du drag (et le passage par simplify()) ne serait pas peinte
      // immédiatement à la fin du glissement.
      redrawOnlyCables();
      selectCable(_segDragState.c.id, false); // resélectionner sans rouvrir le panneau
      setDirty();
    }
    // Pas de branche « else » : rien n'a été empilé tant qu'aucun déplacement n'a eu
    // lieu, donc rien à dépiler. L'ancien APP.undo.pop() retirait la dernière entrée
    // de la pile sans vérifier qu'elle lui appartenait.
    _segDragState = null;
    setTimeout(() => { _segDragged = false; }, 50);
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp, { once: true });
}

// ── Contournement en direct des câbles tiers pendant le glissement d'un appareil ──
// Symétrique de _computeBypassPts (qui déplace un segment autour d'appareils fixes) :
// ici c'est l'appareil qui bouge, le câble reste immobile. Chaque segment orthogonal
// du tracé D'ORIGINE (jamais un résultat déjà dévié — même principe que
// redrawCablesMovingNode, pour ne pas dériver d'une frame à l'autre) est testé contre
// la position COURANTE de l'appareil ; un segment chevauché est localement dévié pour
// longer son bord le plus proche, sur toute la portion réellement recouverte. Retourne
// aussi si au moins un segment a été touché, pour piloter la surbrillance en direct.
function _computeNodeBypassPts(origPts, bb) {
  const MARGIN = 4, MIN_OV = 10;

  // 1re passe : pour chaque segment, ses infos de blocage (ou null si dégagé) — rien
  // n'est encore émis, pour pouvoir détecter les paires adjacentes avant de décider.
  const blocks = [];
  for (let i = 0; i < origPts.length - 1; i++) {
    const [x1, y1] = origPts[i], [x2, y2] = origPts[i + 1];
    const isH = y1 === y2;
    const newVal = isH ? y1 : x1;
    const minC   = isH ? Math.min(x1, x2) : Math.min(y1, y2);
    const maxC   = isH ? Math.max(x1, x2) : Math.max(y1, y2);
    const lo = isH ? bb.y1 : bb.x1;
    const hi = isH ? bb.y2 : bb.x2;
    const sa = (isH ? bb.x1 : bb.y1) - MARGIN;
    const sb = (isH ? bb.x2 : bb.y2) + MARGIN;
    let b = null;
    if (newVal > lo && newVal < hi && minC < sb - MIN_OV && maxC > sa + MIN_OV) {
      const bsa = Math.max(sa, minC), bsb = Math.min(sb, maxC);
      if (bsa < bsb) b = { isH, newVal, lo, hi, bsa, bsb };
    }
    blocks.push(b);
  }

  let touched = false;
  const result = [origPts[0]];
  let i = 0;
  while (i < origPts.length - 1) {
    const b = blocks[i];
    if (!b) { result.push(origPts[i + 1]); i++; continue; }
    touched = true;

    // Segment suivant AUSSI bloqué et d'axe opposé (toujours le cas dans une polyligne
    // orthogonale valide) : leur jonction partagée tombe donc à l'intérieur de
    // l'obstacle — chacun revenant indépendamment vers ce point crée un double détour
    // qui se chevauche (la boucle signalée). Fusionnés en un seul contournement qui
    // tourne par UN SEUL coin de l'obstacle, sans jamais repasser par ce point piégé.
    const nb = blocks[i + 1];
    if (nb && nb.isH !== b.isH && i + 2 < origPts.length) {
      const P0 = origPts[i], P1 = origPts[i + 2];
      const vertX  = b.isH ? P1[0] : P0[0];
      const horizY = b.isH ? P0[1] : P1[1];
      // Cotés choisis d'après l'extrémité EXTÉRIEURE de l'AUTRE segment (pas la
      // position propre du segment) : sinon le coin choisi peut pointer du mauvais
      // côté et ne pas réellement mener vers P0/P1 sans retraverser l'obstacle.
      const outerVertY  = b.isH ? P1[1] : P0[1];
      const outerHorizX = b.isH ? P0[0] : P1[0];
      const bbH = b.isH ? b : nb, bbV = b.isH ? nb : b; // bloc horizontal / vertical
      const bvX = outerHorizX <= bbV.lo ? bbV.lo - MARGIN
                : outerHorizX >= bbV.hi ? bbV.hi + MARGIN
                : (Math.abs(vertX - bbV.lo) <= Math.abs(vertX - bbV.hi) ? bbV.lo - MARGIN : bbV.hi + MARGIN);
      const bvY = outerVertY <= bbH.lo ? bbH.lo - MARGIN
                : outerVertY >= bbH.hi ? bbH.hi + MARGIN
                : (Math.abs(horizY - bbH.lo) <= Math.abs(horizY - bbH.hi) ? bbH.lo - MARGIN : bbH.hi + MARGIN);

      if (b.isH) result.push([P0[0], bvY], [bvX, bvY], [bvX, P1[1]]);
      else       result.push([vertX, bvY], [bvX, bvY], [bvX, horizY]);
      result.push(P1);
      i += 2;
      continue;
    }

    // Segment isolé bloqué (pas de fusion possible/nécessaire) : contournement simple,
    // jog vers le bord le plus proche puis retour — comme avant.
    const bv = Math.abs(b.newVal - b.lo) <= Math.abs(b.newVal - b.hi) ? b.lo - MARGIN : b.hi + MARGIN;
    const [x1, y1] = origPts[i], [x2, y2] = origPts[i + 1];
    const ascending = b.isH ? (x1 <= x2) : (y1 <= y2);
    const near = ascending ? b.bsa : b.bsb, far = ascending ? b.bsb : b.bsa;
    const seg = b.isH
      ? [[near, b.newVal], [near, bv], [far, bv], [far, b.newVal]]
      : [[b.newVal, near], [bv, near], [bv, far], [b.newVal, far]];
    result.push(...seg, origPts[i + 1]);
    i++;
  }

  return { pts: result, touched };
}

// ── Contournement automatique d'obstacles pendant le drag ────
function _computeBypassPts(axis, c0, c1, newVal, startVal, fromId, toId) {
  const MARGIN  = 4;   // pixels de marge autour du nœud
  const MIN_OV  = 10;  // chevauchement minimum pour considérer un obstacle

  // mk(mainAxis, perpAxis) → [x, y]
  const mk = axis === 'H'
    ? (m, p) => [m, p]   // H : main=X, perp=Y
    : (m, p) => [p, m];  // V : main=Y, perp=X

  const minC = Math.min(c0, c1), maxC = Math.max(c0, c1);
  const blockers = [];

  // Les deux appareils auxquels CE câble est branché ne sont jamais des obstacles
  // pour lui-même — même exclusion que getObstacles(exIds) dans routing.js pour le
  // routage automatique initial. Sans ça, rapprocher un segment de son propre
  // appareil de départ/arrivée déclenchait un contournement absurde juste à côté
  // de l'endroit où le câble doit de toute façon se raccorder.
  for (const [sid, node] of Object.entries(APP.nodes)) {
    if (sid === fromId || sid === toId) continue;
    const bb = getRealBB(node, 0);
    let lo, hi, sa, sb;

    if (axis === 'H') {
      lo = bb.y1; hi = bb.y2;        // plage perp (Y)
      sa = bb.x1 - MARGIN;           // plage main (X)
      sb = bb.x2 + MARGIN;
    } else {
      lo = bb.x1; hi = bb.x2;        // plage perp (X)
      sa = bb.y1 - MARGIN;
      sb = bb.y2 + MARGIN;
    }

    if (newVal <= lo || newVal >= hi) continue;           // hors plage perp
    if (minC >= sb - MIN_OV || maxC <= sa + MIN_OV) continue; // hors plage main

    // Borner la zone bypass à la longueur du segment
    const bsa = Math.max(sa, minC);
    const bsb = Math.min(sb, maxC);
    if (bsa >= bsb) continue;

    // Côté de contournement : décidé une fois pour toutes à partir de la position de
    // DÉPART du glissement (startVal, fixe pendant tout le geste), pas de la position
    // de la frame précédente (lastIntended, qui glisse à chaque déplacement). Avec
    // lastIntended, le côté basculait dès la 2e frame suivant l'entrée dans la zone
    // (dès que lastIntended dépassait lui-même le bord d'entrée) — alors que le
    // segment était encore tout près de ce bord — ce qui créait un aller-retour
    // visible façon boucle en cours d'approche. startVal ne glisse jamais : le
    // segment reste du côté par lequel il a abordé l'appareil pendant tout le
    // glissement, même en s'approchant très près du bord opposé.
    const bv = startVal <= lo ? lo - MARGIN : hi + MARGIN;
    blockers.push({ sa: bsa, sb: bsb, bv });
  }

  if (blockers.length === 0) {
    return [mk(c0, newVal), mk(c1, newVal)];
  }

  blockers.sort((a, b) => a.sa - b.sa);

  // Fusionner les zones de contournement qui se touchent ou se chevauchent (plusieurs
  // appareils proches sur l'axe du segment déplacé). Sans ça, le tracé revient en
  // arrière d'une zone à l'autre (la zone suivante commence avant la fin de la
  // précédente) au lieu de continuer à avancer — un repli/boucle visible sur le câble.
  const merged = [];
  for (const bl of blockers) {
    const last = merged[merged.length - 1];
    if (last && bl.sa <= last.sb) last.sb = Math.max(last.sb, bl.sb);
    else merged.push({ sa: bl.sa, sb: bl.sb, bv: bl.bv });
  }

  // bsa/bsb (et donc "merged") sont toujours triés du plus petit au plus grand, quel
  // que soit le sens réel du segment (c0 -> c1 peut aussi bien descendre que monter).
  // Construire le détour dans cet ordre fixe cassait le tracé dès que c0 > c1 : le
  // premier point du contournement (bsa, le plus PETIT) tombe alors du mauvais côté —
  // plus loin de c0 que ne l'est bsb — et le dernier point (bsb) revient en arrière
  // vers c1, repassant par une portion déjà tracée entre c0 et bsa. C'était la boucle
  // par recouvrement (deux segments superposés sur le même axe) signalée sur un câble
  // dont le segment glissé va d'une valeur haute vers une valeur basse.
  const ascending = c0 <= c1;
  const orderedMerged = ascending ? merged : merged.slice().reverse();
  const result = [mk(c0, newVal)];
  for (const bl of orderedMerged) {
    const near = ascending ? bl.sa : bl.sb; // bord rencontré en premier depuis c0
    const far  = ascending ? bl.sb : bl.sa; // bord rencontré en dernier, vers c1
    result.push(mk(near, newVal));
    result.push(mk(near, bl.bv));
    result.push(mk(far, bl.bv));
    result.push(mk(far, newVal));
  }
  result.push(mk(c1, newVal));

  return result;
}

// ── Éjecter un câble d'un port (le rendre orphelin SANS le supprimer) ──
// Même principe que deleteNode() : couper la référence au nœud (from/to = null,
// ce qui déclenche le rendu "orphelin" dans renderCables()), et effacer le lien
// de port (from_port/to_port/side) devenu obsolète. Utilisé quand l'appartenance
// d'un câble à un port devient ambiguë : rattachement sur un port déjà occupé,
// ou bascule simple<->double d'un port occupé.
//
// IMPORTANT : ne JAMAIS supprimer cableOverrides[c.id] ici (piège déjà rencontré) —
// pour un câble orphelin, renderCables() ne route plus rien : il trace une simple
// ligne droite entre les 2 extrémités stockées. Supprimer le tracé existant détruit
// donc le chemin visuel (devient une diagonale brute) ET, si le recalcul suivant
// échoue à re-remplir le cache (ex: image du nœud en cours de rechargement), la
// poignée de glissement reste figée pour toujours (son handler fait `if (!ovPts)
// return;`). On préserve donc le tracé, et on étire juste le bout existant dans
// l'axe de son dernier segment (reste orthogonal, visuellement détaché du port).
const _ORPHAN_EJECT_OFFSET = 48; // px, décalage/dégagement du point orphelin (facilite la prise en main)

function _orphanCableEnd(c, role) {
  const pts = cableOverrides[c.id];
  let ox, oy;

  if (pts && pts.length >= 2) {
    const tipIdx  = role === 'from' ? 0 : pts.length - 1;
    const nextIdx = role === 'from' ? 1 : pts.length - 2;
    const [tx, ty] = pts[tipIdx], [nx2, ny2] = pts[nextIdx];
    if (Math.abs(ty - ny2) <= 1) { // segment horizontal → étirer en X, en s'éloignant du reste du tracé
      ox = tx + (tx >= nx2 ? _ORPHAN_EJECT_OFFSET : -_ORPHAN_EJECT_OFFSET);
      oy = ty;
    } else {                       // segment vertical → étirer en Y
      ox = tx;
      oy = ty + (ty >= ny2 ? _ORPHAN_EJECT_OFFSET : -_ORPHAN_EJECT_OFFSET);
    }
    pts[tipIdx] = [ox, oy];
  } else {
    // Pas de tracé existant (rare) : repli géométrique depuis la position du port.
    const nid  = role === 'from' ? c.from : c.to;
    const node = nid ? APP.nodes[nid] : null;
    const nx   = role === 'from' ? c.from_nx : c.to_nx;
    const ny   = role === 'from' ? c.from_ny : c.to_ny;
    let ax = 0, ay = 0;
    if (node && nx != null) { [ax, ay] = edgePtFixed(node, nx, ny); }
    else if (node) { ax = node.cx; ay = node.cy; }
    ox = ax + _ORPHAN_EJECT_OFFSET; oy = ay + _ORPHAN_EJECT_OFFSET;
  }

  if (role === 'from') {
    c.orphan_from   = true;
    c.orphan_from_x = ox; c.orphan_from_y = oy;
    c.from = null; c.from_port = null; c.from_side = null;
  } else {
    c.orphan_to   = true;
    c.orphan_to_x = ox; c.orphan_to_y = oy;
    c.to = null; c.to_port = null; c.to_side = null;
  }
  // cableOverrides[c.id] volontairement CONSERVÉ (voir commentaire ci-dessus).
}

// Câbles actuellement attachés à un port donné (from_port OU to_port === portId
// sur ce nœud), avec leur rôle et leur côté ('in'/'out'/null). Exclut cid (le
// câble en cours de rattachement, pour ne pas s'éjecter lui-même).
function _portOccupants(nodeId, portId, excludeCableId) {
  const out = [];
  for (const oc of APP.cables) {
    if (oc.id === excludeCableId) continue;
    if (oc.from === nodeId && oc.from_port === portId) out.push({ c: oc, role: 'from', side: oc.from_side || null });
    if (oc.to   === nodeId && oc.to_port   === portId) out.push({ c: oc, role: 'to',   side: oc.to_side   || null });
  }
  return out;
}

// ── Ports éligibles au rattachement d'une extrémité ──────────────────────────
// Un port ne sert jamais deux fois : lâcher une extrémité de câble sur un port déjà
// pris ne doit PAS en éjecter l'occupant. Les seuls ports proposés sont donc les
// mêmes que ceux du mode « Ajouter un câble » (newcable.js) — libres ET de type
// compatible. Sans ce filtre, les deux poignées de rattachement (poignée orpheline
// et poignée d'extrémité d'un câble sélectionné) acceptaient n'importe quel port,
// de n'importe quel type, plein ou non, et éjectaient silencieusement le câble déjà
// branché : on échangeait un orphelin contre un autre sans le voir.
// Sécu de régression : window._xReattachFilter = false dans la console DevTools
// rétablit l'ancien comportement (tous les ports proposés, éjection possible).
function _typeFitsCable(portType, cableType) {
  return portType === cableType
      || _usbCompat(portType, cableType)
      || _audioCompat(portType, cableType);
}

// Types de référence d'une extrémité : celui du câble, plus celui du port qu'elle
// occupe encore (aucun si elle est orpheline). Les deux peuvent diverger sur un
// projet où un type de câble personnalisé a été renommé — le renommage réécrit
// APP.cables[].type mais pas node.ports[].type — et un déplacement parfaitement
// légitime ne doit pas être refusé à cause de ça.
function _reattachRefTypes(cable, role) {
  const types = new Set([cable.type]);
  const nid = role === 'from' ? cable.from      : cable.to;
  const pid = role === 'from' ? cable.from_port : cable.to_port;
  const cur = nid && pid ? (APP.nodes[nid]?.ports || []).find(p => p.id === pid) : null;
  if (cur) types.add(cur.type);
  return [...types];
}

function _portAcceptsEnd(sid, port, cable, used, refTypes) {
  if (window._xReattachFilter === false) return true;
  if (_isPortFull(sid, port, used)) return false;
  return refTypes.some(t => _typeFitsCable(port.type, t));
}

// Prédicat (sid, port) => bool, occupation figée à l'appel — l'extrémité déplacée
// est exclue du décompte pour pouvoir revenir sur son propre port.
function _reattachAcceptor(cid, role) {
  const cable = APP.cables.find(x => x.id === cid);
  if (!cable) return () => false;
  const used     = _usedPorts({ cableId: cid, role });
  const refTypes = _reattachRefTypes(cable, role);
  return (sid, port) => _portAcceptsEnd(sid, port, cable, used, refTypes);
}

// Grise et rend inertes les ports qui ne peuvent pas accueillir cette extrémité,
// le temps du glissement. Marquage retiré par _hideAllPortDots().
function _markReattachTargets(cid, role) {
  const accepts = _reattachAcceptor(cid, role);
  document.getElementById('canvas-area')?.classList.add('reattach-active');
  for (const [sid, node] of Object.entries(APP.nodes)) {
    const el = document.getElementById(`n-${sid}`);
    if (!el) continue;
    (node.ports || []).forEach(p => {
      const dot = el.querySelector(`.port-dot-node[data-port-id="${p.id}"]`);
      if (dot) dot.classList.toggle('reattach-blocked', !accepts(sid, p));
    });
  }
}

// Résout le rattachement d'un câble (cid) à un port qui peut être double : éjecte
// l'occupant ambigu/en trop (jamais supprimé, juste renvoyé orphelin), puis ouvre
// la popup IN/OUT si le port est double — même popup que le mode "Ajouter un câble"
// — avant d'appeler onSide(side). Port simple : éjecte l'occupant existant s'il y
// en a un, puis onSide(null) immédiat, sans popup.
// Centralisé ici pour que TOUT rattachement à un port (poignée de câble orphelin
// ET glissement d'ancre normale sur un câble sélectionné) respecte la même règle.
// Avant cette extraction, seule la poignée orpheline le faisait : glisser l'ancre
// normale d'un câble (setupAnchorDrag, cid sélectionné, orphelin ou non) rattachait
// directement au port visé sans jamais demander IN/OUT ni éjecter l'occupant déjà
// en place — un câble pouvait donc se retrouver « accroché » silencieusement au
// même port/côté qu'un autre déjà présent.
// Depuis le filtre _portAcceptsEnd ci-dessus, les deux appelants ne passent plus ici
// qu'avec un port qui a encore de la place : les branches d'éjection ne servent donc
// plus qu'au cas ambigu (occupant d'un port double sans côté IN/OUT enregistré,
// séquelle d'un port basculé en double alors qu'un câble y était déjà branché), que
// _isPortFull ne compte pas comme plein. C'est exactement la règle voulue : on
// éjecte pour lever une ambiguïté, jamais pour prendre la place de quelqu'un.
function _resolvePortSide(e, cid, sid, port, onSide) {
  if (!port.dual) {
    _portOccupants(sid, port.id, cid).forEach(o => _orphanCableEnd(o.c, o.role));
    onSide(null);
    return;
  }
  const occupants = _portOccupants(sid, port.id, cid);
  const ambiguous = occupants.some(o => !o.side);
  if (occupants.length >= 2 || ambiguous) {
    occupants.forEach(o => _orphanCableEnd(o.c, o.role));
  }
  const stillOccupied = _portOccupants(sid, port.id, cid);
  const usedSides = new Set(stillOccupied.map(o => o.side).filter(Boolean));
  redrawOnlyCables(); // reflète une éventuelle éjection avant d'ouvrir la popup
  _showDualPortPopup(e, sid, port.id, port.type, port.nx, port.ny, usedSides,
    (_n, _p, _t, _nx, _ny, side) => onSide(side));
}

// [DEBUG] Comme wLog, mais affiche aussi en direct dans la console DevTools (F12) —
// wLog seul n'écrit que dans wires-activity.log, invisible tant qu'on ne rouvre pas
// ce fichier. Préfixe fixe pour pouvoir filtrer la console sur "ORPHAN-DEBUG".
function _odbg(action, data) {
  wLog(action, data);
  console.log(`[ORPHAN-DEBUG] ${action}`, data || '');
}

function _drawOrphanHandle(c, pts, idx, role) {
 try {
  const [px, py] = pts[idx];

  // Zone de capture élargie, invisible et séparée du disque visuel — même principe
  // que la bande de capture des câbles (ph/.cable-hit) : beaucoup plus facile à
  // attraper à la souris sans pour autant grossir le disque affiché à l'écran.
  const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  hit.setAttribute('cx', px);
  hit.setAttribute('cy', py);
  hit.setAttribute('r', '20');
  hit.setAttribute('fill', 'transparent');
  hit.setAttribute('cursor', 'crosshair');
  // #cables-svg a pointer-events:none sur sa racine (index.html) — sans ce override
  // explicite, ce cercle hérite "none" et ne reçoit STRICTEMENT AUCUN clic, quelle
  // que soit sa taille (même motif que .anchor-handle/.bend-handle plus bas dans ce
  // fichier, qui posent tous les deux pointer-events explicitement pour cette raison).
  hit.setAttribute('pointer-events', 'all');
  hit.classList.add('orphan-handle-hit');

  const h = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  h.setAttribute('cx', px);
  h.setAttribute('cy', py);
  h.setAttribute('r', '10');
  h.setAttribute('fill', '#ff6b35');
  h.setAttribute('stroke', '#fff');
  h.setAttribute('stroke-width', '2');
  h.setAttribute('opacity', '0.9');
  h.style.pointerEvents = 'none'; // le disque visuel ne fait qu'illustrer ; hit capte les clics
  h.classList.add('orphan-handle');

  // IMPORTANT : move/up sur window, PAS sur hit — un listener attaché à l'élément
  // lui-même s'auto-détruirait dès le premier mouvement, puisque son propre handler
  // appelle redrawOnlyCables() qui fait _svg.innerHTML='' (recrée un TOUT NOUVEAU
  // cercle) : l'élément qui écoute encore le prochain pointermove n'existe alors
  // plus dans le DOM (le clic initial marchait — pointerdown/survol — mais tout
  // glissement au-delà du premier pixel ne bougeait plus rien). Même motif déjà
  // établi ailleurs dans ce fichier (setupAnchorDrag, segment-drag) : listeners
  // sur window, survivent aux redraws.
  hit.addEventListener('pointerdown', e => {
   try {
    e.stopPropagation();
    _odbg('ORPHAN_DRAG_START', { cableId: c.id, role, idx, px, py });
    // Instantané d'annulation pris au premier déplacement réel, pas à l'appui :
    // pushUndo() se termine par setDirty(), et un simple clic sur la poignée marquait
    // donc le projet comme modifié sans que l'extrémité ait bougé d'un pixel.
    let undoPushed = false;

    // Révéler ET activer les points de port réels pendant le glissement (même
    // élément .port-dot-node de 30x30px que le mode "Ajouter un câble", pas une
    // zone recalculée à part qui pourrait diverger de ce que l'utilisateur voit).
    document.querySelectorAll('.node').forEach(el => el.classList.add('ports-visible'));
    document.getElementById('canvas-area')?.classList.add('orphan-reattach-active');
    // ...mais seuls les ports libres et de type compatible restent actifs.
    _markReattachTargets(c.id, role);

    let moveCount = 0;

    const onMove = ev => {
      try {
        moveCount++;
        const { x, y } = screenToCanvas(ev.clientX, ev.clientY);
        const ovPts = cableOverrides[c.id];
        if (!ovPts) {
          _odbg('ORPHAN_DRAG_MOVE_NO_OVERRIDE', { cableId: c.id, moveCount });
          return;
        }
        if (moveCount === 1 || moveCount % 20 === 0) {
          _odbg('ORPHAN_DRAG_MOVE', { cableId: c.id, moveCount, x: Math.round(x), y: Math.round(y) });
        }
        if (!undoPushed) { undoPushed = true; pushUndo(); } // état d'avant le moindre déplacement
        ovPts[idx] = [Math.round(x), Math.round(y)];
        if (role === 'from') { c.orphan_from_x = x; c.orphan_from_y = y; }
        else                 { c.orphan_to_x   = x; c.orphan_to_y   = y; }
        redrawOnlyCables();
        setDirty();
      } catch (err) {
        _odbg('ORPHAN_DRAG_MOVE_ERROR', { cableId: c.id, moveCount, msg: String(err?.message || err), stack: String(err?.stack || '').slice(0, 400) });
      }
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      document.getElementById('canvas-area')?.classList.remove('orphan-reattach-active');
      _hideAllPortDots();
    };

    // Finalise le rattachement de CE câble sur sid/port, avec le côté donné
    // (null pour un port simple), puis force le recalcul du tracé.
    const finalize = (sid, port, nx, ny, side) => {
      try {
        _odbg('ORPHAN_DRAG_FINALIZE', { cableId: c.id, role, sid, portId: port ? port.id : null, side });
        if (role === 'from') {
          c.from = sid; c.orphan_from = false;
          c.from_nx = nx; c.from_ny = ny;
          // Lier au port réel (id) : sans ça, un futur déplacement de ce port dans
          // Image Setup ne retrouve jamais ce câble (recherche par id) et son
          // tracé reste figé à l'ancienne position pour toujours.
          c.from_port = port ? port.id : null;
          c.from_side = side;
        } else {
          c.to = sid; c.orphan_to = false;
          c.to_nx = nx; c.to_ny = ny;
          c.to_port = port ? port.id : null;
          c.to_side = side;
        }
        delete cableOverrides[c.id]; // forcer recalcul BFS
        rebuildCM();
        renderCables();
        setDirty();
      } catch (err) {
        _odbg('ORPHAN_DRAG_FINALIZE_ERROR', { cableId: c.id, msg: String(err?.message || err), stack: String(err?.stack || '').slice(0, 400) });
      }
    };

    // Rattache sur un port PRÉCIS (trouvé, quelle que soit la méthode) : délègue
    // à _resolvePortSide (éjection + popup IN/OUT si port double, partagée avec
    // setupAnchorDrag) puis finalise avec le côté résolu.
    const reattachToPort = (upEvent, sid, port) => {
      try {
        // Port plein ou de type incompatible : refus pur et simple, comme s'il n'y
        // avait pas de cible. L'extrémité reste orpheline là où elle a été lâchée
        // (Ctrl+Z la remet en place) — on ne débranche jamais l'occupant.
        if (!_reattachAcceptor(c.id, role)(sid, port)) {
          _odbg('ORPHAN_DRAG_REATTACH_REFUSED', { cableId: c.id, sid, portId: port.id, portType: port.type });
          redrawOnlyCables();
          setDirty();
          return;
        }
        _odbg('ORPHAN_DRAG_REATTACH', { cableId: c.id, sid, portId: port.id, dual: !!port.dual });
        _resolvePortSide(upEvent, c.id, sid, port, side => finalize(sid, port, port.nx, port.ny, side));
      } catch (err) {
        _odbg('ORPHAN_DRAG_REATTACH_ERROR', { cableId: c.id, msg: String(err?.message || err), stack: String(err?.stack || '').slice(0, 400) });
      }
    };

    const onUp = e => {
      try {
        // elementsFromPoint (PLURIEL) plutôt que elementFromPoint : au relâchement,
        // notre propre cercle de capture (hit, 20px) est géométriquement SUR le
        // point de port visé — c'est justement là qu'on vient de le faire glisser.
        // Un simple elementFromPoint() se retournerait donc souvent lui-même. En
        // listant TOUTE la pile à ce pixel, on ignore nos propres cercles (recréés
        // à chaque redrawOnlyCables() pendant le glissement — notre référence "hit"
        // du closure est de toute façon obsolète après le tout premier mouvement)
        // et on cherche le premier .port-dot-node, quel que soit l'ordre d'empilement.
        // Testé AVANT cleanup() : cleanup() désactive pointer-events sur les points
        // de port, qui deviendraient alors transparents au hit-test.
        const dotEl = document.elementsFromPoint(e.clientX, e.clientY)
          .find(el => el.classList?.contains('port-dot-node'));
        _odbg('ORPHAN_DRAG_UP', { cableId: c.id, moveCount, dotElFound: !!dotEl, dotElNodeId: dotEl?.dataset?.nodeId, dotElPortId: dotEl?.dataset?.portId });
        cleanup();

        // Simple clic sur la poignée, sans le moindre déplacement : l'extrémité n'a
        // pas bougé d'un pixel, il n'y a donc rien à rattacher — et surtout rien à
        // marquer comme modifié. Sans cette sortie, le clic tombait dans la branche
        // « rien trouvé » plus bas, qui appelle setDirty().
        if (moveCount === 0) { _odbg('ORPHAN_DRAG_UP_NO_MOVE', { cableId: c.id }); return; }

        // 1) Élément RÉEL sous le curseur au relâchement — le même .port-dot-node
        //    (30x30px) que celui affiché à l'écran, aucun recalcul de position à
        //    part qui pourrait diverger du rendu (zoom, arrondis, etc.).
        if (dotEl) {
          const sid  = dotEl.dataset.nodeId;
          const node = APP.nodes[sid];
          const port = node?.ports?.find(p => p.id === dotEl.dataset.portId);
          if (node && port) { reattachToPort(e, sid, port); return; }
          _odbg('ORPHAN_DRAG_UP_DOT_LOOKUP_FAILED', { sid, hasNode: !!node, portId: dotEl.dataset.portId });
        }

        // 2) Repli : relâché dans la zone d'un appareil (marge 20px) mais pas pile
        //    sur un point de port précis — même logique que setupAnchorDrag.
        const { x, y } = screenToCanvas(e.clientX, e.clientY);
        for (const [sid, node] of Object.entries(APP.nodes)) {
          if (x >= node.x - 20 && x <= node.x + node.w + 20 &&
              y >= node.y - 20 && y <= node.y + node.h + 20) {
            const snappedPort = _snapToNearestPort(node, x, y);
            if (snappedPort) { _odbg('ORPHAN_DRAG_UP_AREA_SNAP', { sid, portId: snappedPort.id }); reattachToPort(e, sid, snappedPort); return; }
            const nx = Math.max(0, Math.min(1, (x - node.x) / node.w));
            const ny = Math.max(0, Math.min(1, (y - node.y) / node.h));
            _odbg('ORPHAN_DRAG_UP_AREA_NOPORT', { sid, nx: nx.toFixed(2), ny: ny.toFixed(2) });
            finalize(sid, null, nx, ny, null);
            return;
          }
        }

        // 3) Rien trouvé : reste orphelin, redessiné à sa dernière position.
        _odbg('ORPHAN_DRAG_UP_NOTHING', { cableId: c.id });
        redrawOnlyCables();
        setDirty();
      } catch (err) {
        _odbg('ORPHAN_DRAG_UP_ERROR', { cableId: c.id, msg: String(err?.message || err), stack: String(err?.stack || '').slice(0, 400) });
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
   } catch (err) {
    // Échec pendant la mise en place (avant l'attache move/up) : sans ce filet,
    // aucun listener n'est jamais posé (le glissement ne répond à rien du tout,
    // symptôme rapporté) et orphan-reattach-active peut rester bloqué activé.
    _odbg('ORPHAN_DRAG_SETUP_ERROR', { cableId: c.id, msg: String(err?.message || err), stack: String(err?.stack || '').slice(0, 400) });
    document.getElementById('canvas-area')?.classList.remove('orphan-reattach-active');
    _hideAllPortDots();
   }
  });

  _svg.appendChild(hit);
  _svg.appendChild(h);
 } catch (err) {
  _odbg('ORPHAN_HANDLE_RENDER_ERROR', { cableId: c?.id, role, idx, ptsLen: pts?.length, msg: String(err?.message || err), stack: String(err?.stack || '').slice(0, 400) });
 }
}

// ── Sélection câble ───────────────────────────────────────────
// Surélève (ou rétablit) la couche des câbles par rapport aux étiquettes — voir
// #cables-svg.cable-on-top dans main.css. Sans ça, un segment qui passe sous une
// étiquette d'appareil est inattrapable à la souris pour le déplacer.
// Sécu de régression : window._xCableOnTop = false dans la console DevTools rétablit
// l'ancien comportement (couche des câbles toujours sous les étiquettes).
function _setCablesOnTop(on) {
  const enabled = window._xCableOnTop !== false;
  document.getElementById('cables-svg')?.classList.toggle('cable-on-top', on && enabled);
}

function selectCable(cid, openPanel = true) {
  if (APP.drag?.active || APP.drag?.moved || _segDragState) return;
  _stubSelState = null;
  _stubBendState = null;
  clearSel();
  selCableId = cid;
  APP.selCable = cid;
  redrawOnlyCables();
  showAnchorHandles(cid);
  if (openPanel) openCablePanel(cid);
}

function clearSelCable() {
  selCableId = null;
  APP.selCable = null;
  anchorMode = false;
  removeAnchorHandles();
  redrawOnlyCables();
}

// ── Mode ancres ───────────────────────────────────────────────
function enterAnchorMode(cid) {
  anchorMode = true;
  showAnchorHandles(cid);
}

function clearAnchorMode() {
  anchorMode = false;
  removeAnchorHandles();
}

function showAnchorHandles(cid) {
  removeAnchorHandles();
  const pts = cableOverrides[cid];
  const c   = APP.cables.find(x => x.id === cid);
  if (!pts || !c) return;

  // Handles aux endpoints (from / to)
  [[0, 'from'], [pts.length - 1, 'to']].forEach(([idx, role]) => {
    const [px, py] = pts[idx];
    const h = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    h.setAttribute('cx', px);
    h.setAttribute('cy', py);
    h.setAttribute('r', '10');
    h.setAttribute('fill', c.color);
    h.setAttribute('stroke', '#fff');
    h.setAttribute('stroke-width', '3');
    h.setAttribute('filter', 'drop-shadow(0 0 4px rgba(0,0,0,.8))');
    h.setAttribute('cursor', 'crosshair');
    h.setAttribute('pointer-events', 'all');
    h.classList.add('anchor-handle');
    h.dataset.cid  = cid;
    h.dataset.idx  = idx;
    h.dataset.role = role;
    setupAnchorDrag(h, cid, idx, role);
    _svg.appendChild(h);
  });

  // Petits handles discrets aux coudes (waypoints intermédiaires)
  for (let idx = 1; idx < pts.length - 1; idx++) {
    const [px, py] = pts[idx];
    const h = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    h.setAttribute('cx', px);
    h.setAttribute('cy', py);
    h.setAttribute('r', '3');
    h.setAttribute('fill', '#fff');
    h.setAttribute('fill-opacity', '0.85');
    h.setAttribute('stroke', c.color);
    h.setAttribute('stroke-width', '1.5');
    h.setAttribute('cursor', 'grab');
    h.style.pointerEvents = 'all';
    h.classList.add('anchor-handle', 'bend-handle');
    h.dataset.cid = cid;
    h.dataset.idx = idx;
    setupBendDrag(h, cid, idx);
    _svg.appendChild(h);
  }
}

function removeAnchorHandles() {
  _svg?.querySelectorAll('.anchor-handle').forEach(h => h.remove());
}

function setupBendDrag(handle, cid, idx) {
  handle.addEventListener('pointerdown', e => {
    e.stopPropagation();
    e.preventDefault();

    const pts = cableOverrides[cid];
    if (!pts || idx <= 0 || idx >= pts.length - 1) return;

    // Instantané d'annulation pris au premier déplacement réel, pas à l'appui : à ce
    // stade on ne sait pas encore si c'est un glissement ou un simple clic, et
    // pushUndo() se terminant par setDirty(), le prendre d'avance marquait le projet
    // comme modifié pour un clic qui n'a rien changé.
    const startCanvas = screenToCanvas(e.clientX, e.clientY);
    const bx = pts[idx][0];
    const by = pts[idx][1];
    // Axe du segment entrant (H = même Y que pts[idx-1], sinon V)
    const axisIn = Math.abs(pts[idx - 1][1] - by) < EPS ? 'H' : 'V';
    // Positions initiales des voisins — fixes pendant tout le drag
    const prevX = pts[idx - 1][0], prevY = pts[idx - 1][1];
    const nextX = pts[idx + 1][0], nextY = pts[idx + 1][1];
    let replaceCount = 1; // nb de points à remplacer à chaque move
    let moved = false;

    handle.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'grabbing';

    const onMove = e => {
      const cur = screenToCanvas(e.clientX, e.clientY);
      const dx  = cur.x - startCanvas.x;
      const dy  = cur.y - startCanvas.y;

      const rawDist = Math.hypot(dx, dy);
      if (!moved && rawDist < 3 / APP.view.zoom) return;
      if (!moved) pushUndo();   // état d'avant, le tracé n'a encore rien subi
      moved = true;

      // Clamp pour éviter que P1/P2 franchissent les waypoints voisins
      const GAP = 2;
      let fdx = dx, fdy = dy;
      if (axisIn === 'H') {
        if (bx >= prevX) fdx = Math.max(fdx, prevX - bx + GAP);
        else             fdx = Math.min(fdx, prevX - bx - GAP);
        if (by >= nextY) fdy = Math.max(fdy, nextY - by + GAP);
        else             fdy = Math.min(fdy, nextY - by - GAP);
      } else {
        if (by >= prevY) fdy = Math.max(fdy, prevY - by + GAP);
        else             fdy = Math.min(fdy, prevY - by - GAP);
        if (bx >= nextX) fdx = Math.max(fdx, nextX - bx + GAP);
        else             fdx = Math.min(fdx, nextX - bx - GAP);
      }

      let P1, D, P2;
      if (axisIn === 'H') {
        P1 = [bx + fdx, by];
        D  = [bx + fdx, by + fdy];
        P2 = [bx,       by + fdy];
      } else {
        P1 = [bx,       by + fdy];
        D  = [bx + fdx, by + fdy];
        P2 = [bx + fdx, by];
      }

      // Remplace replaceCount points à idx par les 3 nouveaux
      pts.splice(idx, replaceCount, P1, D, P2);
      replaceCount = 3;

      redrawOnlyCables();
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      document.body.style.cursor = '';
      if (!moved) return;   // rien empilé, donc rien à dépiler
      cableOverrides[cid] = simplify(normalizePts(cableOverrides[cid]));
      redrawOnlyCables();
      showAnchorHandles(cid);
      setDirty();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  });
}

// ── Afficher/cacher les dots de port pendant le drag câble ───
const PORT_SHOW_DIST = 120; // pixels canvas — distance pour révéler les dots

function _showNearbyPortDots(canvasX, canvasY) {
  for (const [sid, node] of Object.entries(APP.nodes)) {
    if (!node.ports || !node.ports.length) continue;
    const cx = node.x + node.w / 2;
    const cy = node.y + node.h / 2;
    const d  = Math.hypot(canvasX - cx, canvasY - cy);
    const el = document.getElementById(`n-${sid}`);
    if (!el) continue;
    el.classList.toggle('ports-visible', d < PORT_SHOW_DIST);
  }
}

function _hideAllPortDots() {
  document.querySelectorAll('.node.ports-visible').forEach(el => el.classList.remove('ports-visible'));
  document.getElementById('canvas-area')?.classList.remove('reattach-active');
  document.querySelectorAll('.port-dot-node.reattach-blocked')
    .forEach(dot => dot.classList.remove('reattach-blocked'));
}

// ── Snap au port le plus proche d'un nœud ────────────────────
const PORT_SNAP_DIST = 30; // pixels canvas

function _snapToNearestPort(node, canvasX, canvasY) {
  if (!node.ports || !node.ports.length) return null;
  let best = null, bestDist = Infinity;
  node.ports.forEach(p => {
    const [px, py] = edgePtFixed(node, p.nx, p.ny);
    const d  = Math.hypot(canvasX - px, canvasY - py);
    if (d < bestDist) { bestDist = d; best = p; }
  });
  if (bestDist <= PORT_SNAP_DIST) return best;
  return null;
}

function setupAnchorDrag(handle, cid, idx, role) {
  handle.addEventListener('pointerdown', e => {
    if (e.button === 2) {
      e.stopPropagation();
      e.preventDefault();
      _showStubMenu(e, cid, role);
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);

    const c = APP.cables.find(cb => cb.id === cid);
    if (!c) return;

    // Snapshot pour l'annulation manuelle (restore ci-dessous). L'instantané de la pile
    // d'annulation, lui, n'est pris qu'au premier déplacement réel : pushUndo() se
    // termine par setDirty(), et le prendre dès l'appui marquait le projet comme
    // modifié pour un simple clic sur la poignée.
    const snap = {
      from: c.from, to: c.to,
      from_nx: c.from_nx, from_ny: c.from_ny,
      to_nx: c.to_nx, to_ny: c.to_ny,
      from_port: c.from_port, to_port: c.to_port,
      pts: (cableOverrides[cid] || []).map(p => [...p]),
    };

    const startCanvas = screenToCanvas(e.clientX, e.clientY);
    let moved = false;

    document.body.style.cursor = 'crosshair';
    // Révéler tous les ports de connexion sur tous les nœuds, en grisant ceux qui ne
    // peuvent pas accueillir cette extrémité (pleins ou de type incompatible).
    document.querySelectorAll('.node').forEach(el => el.classList.add('ports-visible'));
    _markReattachTargets(cid, role);
    // Occupation figée pour toute la durée du geste : rien ne se débranche pendant
    // le glissement, et le magnétisme doit rester cohérent avec le grisage affiché.
    const accepts = _reattachAcceptor(cid, role);

    const onMove = e => {
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      if (!moved) {
        if (Math.hypot(x - startCanvas.x, y - startCanvas.y) < 4 / APP.view.zoom) return;
        pushUndo();   // état d'avant, le tracé n'a encore rien subi
        moved = true;
      }
      const pts = cableOverrides[cid];
      if (!pts) return;

      // Endpoint suit le curseur librement, avec snap sur le port/nœud le plus proche
      let ex = Math.round(x), ey = Math.round(y);

      // 1) Si le curseur est dans un nœud → snap au port le plus proche (sans limite)
      // 2) Sinon → snap si port à moins de PORT_SNAP_DIST
      let bestDist = PORT_SNAP_DIST, bestPx = null, bestPy = null;
      for (const [sid, node] of Object.entries(APP.nodes)) {
        for (const port of (node.ports || [])) {
          if (!accepts(sid, port)) continue; // pas de magnétisme vers un port refusé
          const [px, py] = edgePtFixed(node, port.nx, port.ny);
          const d = Math.hypot(x - px, y - py);
          if (d < bestDist) { bestDist = d; bestPx = px; bestPy = py; }
        }
      }
      if (bestPx !== null) { ex = Math.round(bestPx); ey = Math.round(bestPy); }

      pts[idx] = [ex, ey];
      redrawOnlyCables();
      showAnchorHandles(cid);
    };

    const onUp = e => {
      window.removeEventListener('pointermove', onMove);
      document.body.style.cursor = '';
      _hideAllPortDots();

      if (!moved) return;   // rien empilé, donc rien à dépiler

      const { x, y } = screenToCanvas(e.clientX, e.clientY);

      // Chercher un nœud cible au relâchement — test bounding box + marge 20px
      let targetSid = null, targetNode = null, targetPort = null;
      for (const [sid, node] of Object.entries(APP.nodes)) {
        if (x >= node.x - 20 && x <= node.x + node.w + 20 &&
            y >= node.y - 20 && y <= node.y + node.h + 20) {
          targetSid = sid; targetNode = node;
          targetPort = _snapToNearestPort(node, x, y);
          break;
        }
      }

      const restore = () => {
        APP.undo.pop();
        c.from = snap.from; c.to = snap.to;
        c.from_nx = snap.from_nx; c.from_ny = snap.from_ny;
        c.to_nx   = snap.to_nx;  c.to_ny   = snap.to_ny;
        c.from_port = snap.from_port; c.to_port = snap.to_port;
        cableOverrides[cid] = snap.pts;
        redrawOnlyCables();
        showAnchorHandles(cid);
      };

      // Pas de cible → annuler, restaurer état initial
      if (!targetNode) { restore(); return; }

      // Port visé plein ou de type incompatible : geste annulé, l'extrémité revient
      // exactement où elle était. On ne débranche jamais l'occupant, et on ne se
      // rabat pas non plus sur un rattachement au nœud sans port, qui serait une
      // connexion sans connecteur là où l'utilisateur visait clairement un port.
      if (targetPort && !accepts(targetSid, targetPort)) { restore(); return; }

      // Reconnecter au nœud/port cible
      const nx = targetPort ? targetPort.nx : Math.max(0, Math.min(1, (x - targetNode.x) / targetNode.w));
      const ny = targetPort ? targetPort.ny : Math.max(0, Math.min(1, (y - targetNode.y) / targetNode.h));

      const finalizeAttach = side => {
        if (role === 'from') {
          c.from = targetSid; c.from_nx = nx; c.from_ny = ny;
          c.from_port = targetPort ? targetPort.id : '';
          c.from_side = side;
        } else {
          c.to = targetSid; c.to_nx = nx; c.to_ny = ny;
          c.to_port = targetPort ? targetPort.id : '';
          c.to_side = side;
        }

        // Recalcul BFS complet depuis les nouvelles positions
        delete cableOverrides[cid];
        rebuildCM();
        renderCables();
        selectCable(cid);
        setDirty();
        if (typeof refreshSidebar === 'function') refreshSidebar();
      };

      // Port précis visé : éjection de l'occupant + popup IN/OUT si double, même
      // règle que la poignée de câble orphelin (cf. _resolvePortSide) — jusqu'ici
      // dupliquée SEULEMENT là-bas, ce glissement d'ancre normale rattachait donc
      // un câble à un port double sans jamais demander IN/OUT ni éjecter l'occupant
      // déjà en place. Relâché dans la zone d'un nœud mais hors d'un port précis :
      // rattachement direct, comme avant.
      if (targetPort) _resolvePortSide(e, cid, targetSid, targetPort, finalizeAttach);
      else            finalizeAttach(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  });
}

// ── Créer un câble entre deux nœuds ──────────────────────────
function createCable(fromId, toId, type, fromPort = '', toPort = '', opts = {}) {
  const meta = getCableMeta(type);
  const c = {
    id:       _nextCableId++,
    from:     fromId,
    to:       toId,
    type,
    color:    meta.color,
    dashed:   meta.dashed,
    label:    '',
    from_nx:   opts.from_nx  ?? null, from_ny: opts.from_ny ?? null,
    to_nx:     opts.to_nx    ?? null, to_ny:   opts.to_ny   ?? null,
    from_port: fromPort,
    to_port:   toPort,
    from_side: opts.from_side ?? null,
    to_side:   opts.to_side   ?? null,
    _userCreated: true,
  };
  APP.cables.push(c);
  wLog('CABLE_ADD', { id: c.id, type, from: fromId, to: toId, fromPort, toPort });
  rebuildCM();
  renderCables();
  if (typeof refreshSidebar === 'function') refreshSidebar();
  setDirty();
  return c.id;
}

// ── Supprimer un câble ────────────────────────────────────────
function deleteConn(cid, opts = {}) {
  if (!opts.skipUndo) pushUndo();
  const _dc = APP.cables.find(c => c.id === cid);
  if (_dc) wLog('CABLE_DEL', { id: cid, type: _dc.type, from: _dc.from, to: _dc.to });
  APP.cables = APP.cables.filter(c => c.id !== cid);
  delete cableOverrides[cid];
  APP.chains.forEach(ch => { ch.cables = ch.cables.filter(id => id !== cid); });
  rebuildCM();
  if (selCableId === cid) clearSelCable();
  renderCables();
  updateInfoPanel();
  if (typeof refreshSidebar === 'function') refreshSidebar();
  setDirty();
}

// ── Filtre câble ──────────────────────────────────────────────
function setCableFilter(f) {
  _cableFilter = f;
  redrawOnlyCables();
}

// Clic sur le canvas → désélectionner
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('canvas-area').addEventListener('click', e => {
    if (e.target.id === 'canvas-area' || e.target.id === 'canvas-root' ||
        e.target.id === 'nodes-layer') {
      if (_stubSelState)  { exitStubSel();  return; }
      if (_stubBendState) { exitStubBend(); return; }
      clearSel();
      clearSelCable();
      closePanel();
    }
  });
});
