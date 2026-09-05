/* ═══════════════════════════════════════════════════════════════
   routing.js — Algorithmes BFS orthogonal (fonctions pures)
   Extraits et adaptés de la référence Alkoda_transparent.html
═══════════════════════════════════════════════════════════════ */

function getRealBB(s, margin) {
  const m = margin || 0;
  const bb = s.bb || { left: 0, right: 1, top: 0, bottom: 1 };
  // bb est exprimé en coordonnées de l'IMAGE (calculé sur ses pixels opaques, cf.
  // _alphaBBFromCanvas), il doit donc être déplié dans le rectangle qu'occupe cette
  // image à l'intérieur de l'appareil — le même que celui des ports (edgePtFixed).
  // Appliqué à la boîte, il débordait du contour visible de toute la marge de
  // centrage : sur un bandeau de rack large et plat, une image de 934 px dans une
  // boîte de 1033 poussait l'obstacle 48 px trop loin à droite, et le faisait
  // commencer 16 px avant le bord réel à gauche. Les câbles contournaient donc
  // l'appareil bien avant de l'atteindre.
  const r  = _nodeImgRect(s);
  const ox = r ? r.offX : 0;
  const oy = r ? r.offY : 0;
  const w  = r ? r.rW   : s.w;
  const h  = r ? r.rH   : s.h;
  return {
    x1: s.x + ox + bb.left   * w - m,
    x2: s.x + ox + bb.right  * w + m,
    y1: s.y + oy + bb.top    * h - m,
    y2: s.y + oy + bb.bottom * h + m,
  };
}

function getObstacles(excludeIds) {
  return Object.entries(APP.nodes)
    .filter(([sid]) => !excludeIds.includes(sid))
    .map(([, s]) => getRealBB(s, OBS_MARGIN));
}

function ptInObs(x, y, obstacles) {
  for (const o of obstacles) {
    if (x > o.x1 && x < o.x2 && y > o.y1 && y < o.y2) return true;
  }
  return false;
}

function segBlocked(x1, y1, x2, y2, obstacles) {
  for (const o of obstacles) {
    if (x1 === x2) { // vertical
      const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
      if (x1 > o.x1 && x1 < o.x2 && minY < o.y2 && maxY > o.y1) return true;
    } else { // horizontal
      const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
      if (y1 > o.y1 && y1 < o.y2 && minX < o.x2 && maxX > o.x1) return true;
    }
  }
  return false;
}

function edgePt(s, tx, ty) {
  const bb = s.bb || { left: 0, right: 1, top: 0, bottom: 1 };
  const ox1 = s.x + bb.left  * s.w, ox2 = s.x + bb.right  * s.w;
  const oy1 = s.y + bb.top   * s.h, oy2 = s.y + bb.bottom * s.h;
  const ocx = (ox1 + ox2) / 2, ocy = (oy1 + oy2) / 2;
  const ohw = (ox2 - ox1) / 2, ohh = (oy2 - oy1) / 2;
  const dx = tx - ocx, dy = ty - ocy;
  if (Math.abs(dx) * ohh > Math.abs(dy) * ohw) {
    return [ocx + Math.sign(dx || 1) * ohw,
            Math.max(oy1 + 3, Math.min(oy2 - 3, ocy + dy * (ohw / Math.abs(dx || 1))))];
  }
  return [Math.max(ox1 + 3, Math.min(ox2 - 3, ocx + dx * (ohh / Math.abs(dy || 1)))),
          ocy + Math.sign(dy || 1) * ohh];
}

// Calcule le rect réel de l'image dans le node (padding img + objet-fit:contain)
// Avec box-sizing:border-box global, la bordure 1px du node-box est intérieure :
//   l'image commence à (border=1 + padding=3, border=1 + padding=3) = (4, 4) dans .node
// catbar est display:none donc contribue 0px ; imgWrap a height explicite s.h-3.
function _nodeImgRect(s) {
  if (!s._imgW || !s._imgH) return null;
  const PAD = 3;
  const wrapH  = s.h - 3;        // imgWrap height explicite (nodes.js)
  const availW = s.w  - PAD * 2;
  const availH = wrapH - PAD * 2;
  const scale  = Math.min(availW / s._imgW, availH / s._imgH);
  const rW     = s._imgW * scale;
  const rH     = s._imgH * scale;
  const offX   = (availW - rW) / 2 + PAD + 1;  // +1 bordure node-box
  const offY   = (availH - rH) / 2 + PAD + 1;  // +1 bordure node-box (catbar hidden)
  return { offX, offY, rW, rH };
}

function edgePtFixed(s, nx, ny) {
  const R = v => Math.round(v);
  const r = _nodeImgRect(s);
  if (r) return [R(s.x + r.offX + nx * r.rW), R(s.y + r.offY + ny * r.rH)];
  return [R(s.x + nx * s.w), R(s.y + ny * s.h)];
}

function stubPt(s, nx, ny) {
  // Utilise edgePtFixed pour que stub et ancre partagent le même point de base
  const [px, py] = edgePtFixed(s, nx, ny);

  // Direction override explicite sur le nœud → prioritaire
  const dir = s.stub || null;
  if (dir === 'top')    return [px, py - STUB_LEN];
  if (dir === 'bottom') return [px, py + STUB_LEN];
  if (dir === 'left')   return [px - STUB_LEN, py];
  if (dir === 'right')  return [px + STUB_LEN, py];

  // Sinon : inférer la direction depuis la position du port.
  const dLeft   = nx;
  const dRight  = 1 - nx;
  const dTop    = ny;
  const dBottom = 1 - ny;
  const minD = Math.min(dLeft, dRight, dTop, dBottom);

  if (minD === dLeft)   return [px - STUB_LEN, py];
  if (minD === dRight)  return [px + STUB_LEN, py];
  if (minD === dTop)    return [px, py - STUB_LEN];
  return [px, py + STUB_LEN];
}

function getGridLines(obstacles) {
  const xs = new Set(), ys = new Set();
  for (const o of obstacles) {
    xs.add(o.x1 - 20); xs.add(o.x2 + 20);
    ys.add(o.y1 - 20); ys.add(o.y2 + 20);
  }
  xs.add(0); xs.add(CW);
  ys.add(0); ys.add(CH);
  return {
    xs: [...xs].sort((a, b) => a - b),
    ys: [...ys].sort((a, b) => a - b),
  };
}

function findOrthPath(sa, sb, fromPt, toPt) {
  const exIds = [sa.id, sb.id];
  const obstacles = getObstacles(exIds);
  const [x1, y1] = fromPt || edgePt(sa, sb.cx || sb.x + sb.w / 2, sb.cy || sb.y + sb.h / 2);
  const [x2, y2] = toPt   || edgePt(sb, sa.cx || sa.x + sa.w / 2, sa.cy || sa.y + sa.h / 2);

  const { xs, ys } = getGridLines(obstacles);
  const allXs = [...new Set([...xs, x1, x2])].sort((a, b) => a - b);
  const allYs = [...new Set([...ys, y1, y2])].sort((a, b) => a - b);

  const xi = {}; allXs.forEach((x, i) => xi[x] = i);
  const yi = {}; allYs.forEach((y, i) => yi[y] = i);
  const NX = allXs.length, NY = allYs.length;

  const si = xi[x1], sj = yi[y1];
  const ti = xi[x2], tj = yi[y2];

  const key = (i, j) => i * NY + j;
  const dist = new Map();
  const prev = new Map();
  const sk = key(si, sj);
  dist.set(sk, 0);
  const queue = [[si, sj]];
  let found = false;
  const tk = key(ti, tj);

  while (queue.length && !found) {
    const [ci, cj] = queue.shift();
    const ck = key(ci, cj);
    const cd = dist.get(ck);

    const neighbors = [[ci-1,cj],[ci+1,cj],[ci,cj-1],[ci,cj+1]];
    for (const [ni, nj] of neighbors) {
      if (ni < 0 || ni >= NX || nj < 0 || nj >= NY) continue;
      const nk = key(ni, nj);
      if (dist.has(nk)) continue;

      const cx = allXs[ci], cy = allYs[cj];
      const nx = allXs[ni], ny = allYs[nj];

      if (segBlocked(cx, cy, nx, ny, obstacles)) continue;

      const w = Math.abs(nx - cx) + Math.abs(ny - cy);
      dist.set(nk, cd + w);
      prev.set(nk, ck);
      queue.push([ni, nj]);

      if (nk === tk) { found = true; break; }
    }
  }

  if (!found) return [[x1, y1], [x1, y2], [x2, y2]];

  const path = [];
  let cur = tk;
  while (cur !== undefined) {
    const i = Math.floor(cur / NY), j = cur % NY;
    path.unshift([allXs[i], allYs[j]]);
    cur = prev.get(cur);
  }
  return path;
}

function normalizePts(pts) {
  const EQ = (a, b) => Math.abs(a - b) < 0.5;
  if (pts.length < 2) return pts;
  const r = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = r[r.length - 1], [cx, cy] = pts[i];
    if (!EQ(px, cx) && !EQ(py, cy)) {
      const prev2 = r.length >= 2 ? r[r.length - 2] : null;
      if (prev2 && EQ(prev2[0], px)) {
        r.push([px, cy]);
      } else {
        r.push([cx, py]);
      }
    }
    r.push([cx, cy]);
  }
  return r;
}

function simplify(pts) {
  if (pts.length <= 2) return pts;
  const r = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [cx, cy] = pts[i], [nx, ny] = pts[i + 1];
    const [px, py] = r[r.length - 1];
    if (cx === px && cy === py) continue;
    const sameXline = (px === cx && cx === nx);
    const sameYline = (py === cy && cy === ny);
    if (!sameXline && !sameYline) { r.push(pts[i]); continue; }
    if (sameYline && (cx - px) * (nx - cx) < 0) { continue; }
    if (sameXline && (cy - py) * (ny - cy) < 0) { continue; }
  }
  r.push(pts[pts.length - 1]);
  return r;
}

function toSVG(pts) {
  if (pts.length < 2) return '';
  const R = 20;
  if (pts.length === 2) {
    return `M${pts[0][0]} ${pts[0][1]} L${pts[1][0]} ${pts[1][1]}`;
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1], [cx, cy] = pts[i], [nx, ny] = pts[i + 1];
    const l1 = Math.hypot(cx - px, cy - py), l2 = Math.hypot(nx - cx, ny - cy);
    if (l1 < 0.01 || l2 < 0.01) { d += ` L${cx.toFixed(1)} ${cy.toFixed(1)}`; continue; }
    const r = Math.min(R, l1 / 2, l2 / 2);
    const bx = cx - (cx - px) / l1 * r, by = cy - (cy - py) / l1 * r;
    const ax = cx + (nx - cx) / l2 * r, ay = cy + (ny - cy) / l2 * r;
    d += ` L${bx.toFixed(1)} ${by.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ax.toFixed(1)} ${ay.toFixed(1)}`;
  }
  d += ` L${pts[pts.length-1][0].toFixed(1)} ${pts[pts.length-1][1].toFixed(1)}`;
  return d;
}
