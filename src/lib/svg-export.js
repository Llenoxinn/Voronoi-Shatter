import { computeVoronoi } from './voronoi.js';

const EDGE_T = 0;
const EDGE_R = 1;
const EDGE_B = 2;
const EDGE_L = 3;

// Directed marching-squares transitions keeping inside (1) on the right
// (clockwise outer contours in screen coordinates, +x right, +y down).
const MARCHING_SQUARES_EDGES = [
  [],
  [[EDGE_L, EDGE_B]],
  [[EDGE_B, EDGE_R]],
  [[EDGE_L, EDGE_R]],
  [[EDGE_R, EDGE_T]],
  [[EDGE_R, EDGE_T], [EDGE_L, EDGE_B]],
  [[EDGE_B, EDGE_T]],
  [[EDGE_L, EDGE_T]],
  [[EDGE_T, EDGE_L]],
  [[EDGE_T, EDGE_B]],
  [[EDGE_T, EDGE_L], [EDGE_B, EDGE_R]],
  [[EDGE_T, EDGE_R]],
  [[EDGE_R, EDGE_L]],
  [[EDGE_R, EDGE_B]],
  [[EDGE_B, EDGE_L]],
  [],
];

function seedHash(s, salt) {
  const x = Math.sin(s * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function sanitizeHexColor(hex, fallback = '#111113') {
  if (typeof hex !== 'string') return fallback;
  const trimmed = hex.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : fallback;
}

function clampByte(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(255, Math.round(n))) : 0;
}

function getShardFill(s, avgColors, wireframe, bevel) {
  if (wireframe) return 'none';
  const ai = s * 4;
  let r = clampByte(avgColors && avgColors[ai]);
  let g = clampByte(avgColors && avgColors[ai + 1]);
  let b = clampByte(avgColors && avgColors[ai + 2]);

  if (bevel > 0) {
    const bevelAmt = Math.max(0, Math.min(1, bevel / 100));
    const delta = Math.round((seedHash(s + 1, 9.13) - 0.5) * 2 * 14 * bevelAmt);
    r = clampByte(r + delta);
    g = clampByte(g + delta);
    b = clampByte(b + delta);
  }

  return `rgb(${r}, ${g}, ${b})`;
}

function signedPolygonArea(poly) {
  let area2 = 0;
  const len = poly.length;
  for (let i = 0; i < len; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % len];
    area2 += a.x * b.y - b.x * a.y;
  }
  return area2 * 0.5;
}

function formatPoints(poly, w, h) {
  return poly
    .map((p) => {
      const x = Number.isFinite(p.x) ? Math.max(0, Math.min(w, p.x)) : 0;
      const y = Number.isFinite(p.y) ? Math.max(0, Math.min(h, p.y)) : 0;
      return `${Number(x.toFixed(2))},${Number(y.toFixed(2))}`;
    })
    .join(' ');
}

/**
 * Clip a convex polygon against the perpendicular bisector half-plane
 * (p - mid) · (seedJ - seedS) <= 0 using Sutherland-Hodgman clipping.
 * When inset > 0, shifts mid inward toward (sx, sy) along the unit bisector normal.
 */
function clipPolygonHalfPlane(poly, sx, sy, jx, jy, inset = 0) {
  const nx = jx - sx;
  const ny = jy - sy;
  if (nx === 0 && ny === 0) return poly;

  let midX = (sx + jx) * 0.5;
  let midY = (sy + jy) * 0.5;
  if (inset > 0) {
    const dist = Math.hypot(nx, ny);
    midX -= (nx / dist) * inset;
    midY -= (ny / dist) * inset;
  }

  const out = [];
  const len = poly.length;

  for (let i = 0; i < len; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % len];
    const dA = (a.x - midX) * nx + (a.y - midY) * ny;
    const dB = (b.x - midX) * nx + (b.y - midY) * ny;
    const inA = dA <= 0;
    const inB = dB <= 0;

    if (inA && inB) {
      out.push(b);
    } else if (inA && !inB) {
      const t = dA / (dA - dB);
      out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    } else if (!inA && inB) {
      const t = dA / (dA - dB);
      out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
      out.push(b);
    }
  }

  return out;
}

function computeEuclideanCell(w, h, seeds, s, inset) {
  const sx = seeds[s].x;
  const sy = seeds[s].y;
  const n = seeds.length;

  let poly = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];

  for (let j = 0; j < n; j++) {
    if (j === s) continue;
    poly = clipPolygonHalfPlane(poly, sx, sy, seeds[j].x, seeds[j].y, inset);
    if (poly.length < 3) break;
  }

  return poly;
}

function edgePointKey(cx, cy, edge, stride) {
  let hx;
  let hy;
  if (edge === EDGE_T) {
    hx = 2 * cx + 2;
    hy = 2 * cy + 1;
  } else if (edge === EDGE_R) {
    hx = 2 * cx + 3;
    hy = 2 * cy + 2;
  } else if (edge === EDGE_B) {
    hx = 2 * cx + 2;
    hy = 2 * cy + 3;
  } else {
    hx = 2 * cx + 1;
    hy = 2 * cy + 2;
  }
  return hy * stride + hx;
}

function removeCollinear(poly, eps = 1e-4) {
  if (poly.length <= 3) return poly;
  let pts = poly;
  let changed = true;

  while (changed && pts.length > 3) {
    changed = false;
    const len = pts.length;
    const next = [];
    let remaining = len;

    for (let i = 0; i < len; i++) {
      if (remaining <= 3) {
        next.push(pts[i]);
        continue;
      }

      const prev = next.length > 0 ? next[next.length - 1] : pts[len - 1];
      const curr = pts[i];
      const after = i === len - 1 && next.length > 0 ? next[0] : pts[(i + 1) % len];

      const dx = after.x - prev.x;
      const dy = after.y - prev.y;
      const segLen = Math.hypot(dx, dy);

      if (segLen < eps) {
        if (Math.hypot(curr.x - prev.x, curr.y - prev.y) < eps) {
          changed = true;
          remaining--;
          continue;
        }
        next.push(curr);
        continue;
      }

      const cross = Math.abs((curr.x - prev.x) * dy - (curr.y - prev.y) * dx);
      const dist = cross / segLen;
      const dot = (curr.x - prev.x) * (after.x - curr.x) + (curr.y - prev.y) * (after.y - curr.y);
      if (dist <= eps && dot >= -eps) {
        changed = true;
        remaining--;
        continue;
      }

      next.push(curr);
    }

    pts = next;
  }

  return pts;
}

function pointSegmentDistSq(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = p.x - a.x;
    const ey = p.y - a.y;
    return ex * ex + ey * ey;
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const px = a.x + t * dx - p.x;
  const py = a.y + t * dy - p.y;
  return px * px + py * py;
}

function simplifyOpenChain(chain, tolSq) {
  const len = chain.length;
  if (len <= 2) return chain;

  const keep = new Uint8Array(len);
  keep[0] = 1;
  keep[len - 1] = 1;

  const stack = [0, len - 1];
  while (stack.length > 0) {
    const end = stack.pop();
    const start = stack.pop();
    let maxDistSq = -1;
    let maxIdx = -1;
    const a = chain[start];
    const b = chain[end];

    for (let i = start + 1; i < end; i++) {
      const dSq = pointSegmentDistSq(chain[i], a, b);
      if (dSq > maxDistSq) {
        maxDistSq = dSq;
        maxIdx = i;
      }
    }

    if (maxDistSq > tolSq && maxIdx !== -1) {
      keep[maxIdx] = 1;
      if (maxIdx - start > 1) stack.push(start, maxIdx);
      if (end - maxIdx > 1) stack.push(maxIdx, end);
    }
  }

  const out = [];
  for (let i = 0; i < len; i++) {
    if (keep[i]) out.push(chain[i]);
  }
  return out;
}

function simplifyClosedPolygon(poly, tol = 0.6) {
  const cleaned = removeCollinear(poly);
  const len = cleaned.length;
  if (len <= 3) return cleaned;

  let cx = 0;
  let cy = 0;
  for (let i = 0; i < len; i++) {
    cx += cleaned[i].x;
    cy += cleaned[i].y;
  }
  cx /= len;
  cy /= len;

  let idxA = 0;
  let bestDistSq = -1;
  for (let i = 0; i < len; i++) {
    const dx = cleaned[i].x - cx;
    const dy = cleaned[i].y - cy;
    const dSq = dx * dx + dy * dy;
    if (dSq > bestDistSq) {
      bestDistSq = dSq;
      idxA = i;
    }
  }

  let idxB = (idxA + Math.floor(len / 2)) % len;
  bestDistSq = -1;
  const ptA = cleaned[idxA];
  for (let i = 0; i < len; i++) {
    if (i === idxA) continue;
    const dx = cleaned[i].x - ptA.x;
    const dy = cleaned[i].y - ptA.y;
    const dSq = dx * dx + dy * dy;
    if (dSq > bestDistSq) {
      bestDistSq = dSq;
      idxB = i;
    }
  }

  const chain1 = [];
  for (let i = idxA; ; i = (i + 1) % len) {
    chain1.push(cleaned[i]);
    if (i === idxB) break;
  }

  const chain2 = [];
  for (let i = idxB; ; i = (i + 1) % len) {
    chain2.push(cleaned[i]);
    if (i === idxA) break;
  }

  const tolSq = tol * tol;
  const s1 = simplifyOpenChain(chain1, tolSq);
  const s2 = simplifyOpenChain(chain2, tolSq);

  const combined = [];
  for (let i = 0; i < s1.length - 1; i++) combined.push(s1[i]);
  for (let i = 0; i < s2.length - 1; i++) combined.push(s2[i]);

  const finalPoly = removeCollinear(combined);
  return finalPoly.length >= 3 ? finalPoly : cleaned;
}

function insetPolygonAttempt(poly, amount, w, h) {
  const len = poly.length;
  if (len < 3 || amount <= 0) return poly;

  const edgeNx = new Float64Array(len);
  const edgeNy = new Float64Array(len);
  const edgeLen = new Float64Array(len);
  const edgeOffset = new Float64Array(len);
  const edgeEps = 1e-2;

  for (let i = 0; i < len; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % len];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy);
    edgeLen[i] = l;
    if (l > 1e-9) {
      // Inward normal for CW polygon in screen coordinates (+x right, +y down)
      edgeNx[i] = -dy / l;
      edgeNy[i] = dx / l;
    }
    const onCanvasEdge =
      (Math.abs(a.x) < edgeEps && Math.abs(b.x) < edgeEps) ||
      (Math.abs(a.x - w) < edgeEps && Math.abs(b.x - w) < edgeEps) ||
      (Math.abs(a.y) < edgeEps && Math.abs(b.y) < edgeEps) ||
      (Math.abs(a.y - h) < edgeEps && Math.abs(b.y - h) < edgeEps);
    edgeOffset[i] = onCanvasEdge ? 0 : amount;
  }

  const out = new Array(len);
  for (let i = 0; i < len; i++) {
    const pIdx = (i - 1 + len) % len;
    const cIdx = i;
    const d1 = edgeOffset[pIdx];
    const d2 = edgeOffset[cIdx];

    let ux = 0;
    let uy = 0;

    if (d1 > 0 || d2 > 0) {
      const nx1 = edgeNx[pIdx];
      const ny1 = edgeNy[pIdx];
      const nx2 = edgeNx[cIdx];
      const ny2 = edgeNy[cIdx];
      const det = nx1 * ny2 - ny1 * nx2;

      if (Math.abs(det) > 1e-4) {
        ux = (d1 * ny2 - d2 * ny1) / det;
        uy = (nx1 * d2 - nx2 * d1) / det;
      } else {
        const mx = (nx1 + nx2) * 0.5;
        const my = (ny1 + ny2) * 0.5;
        const mLen = Math.hypot(mx, my);
        const dAvg = (d1 + d2) * 0.5;
        if (mLen > 1e-6) {
          ux = (mx / mLen) * dAvg;
          uy = (my / mLen) * dAvg;
        }
      }

      const uLen = Math.hypot(ux, uy);
      const minAdjLen = Math.min(edgeLen[pIdx], edgeLen[cIdx]);
      const maxShift = Math.min(amount * 2.5, 0.4 * minAdjLen);
      if (uLen > maxShift && uLen > 1e-9) {
        const scale = maxShift / uLen;
        ux *= scale;
        uy *= scale;
      }
    }

    out[i] = {
      x: Math.max(0, Math.min(w, poly[i].x + ux)),
      y: Math.max(0, Math.min(h, poly[i].y + uy)),
    };
  }

  return out;
}

function insetPolygon(poly, inset, w, h) {
  if (inset <= 0 || poly.length < 3) return poly;
  const origArea = signedPolygonArea(poly);
  if (origArea <= 1e-3) return poly;

  const first = insetPolygonAttempt(poly, inset, w, h);
  const firstArea = signedPolygonArea(first);
  if (firstArea > 1e-3 && firstArea <= origArea + 1e-3) {
    return first;
  }

  const half = insetPolygonAttempt(poly, inset * 0.5, w, h);
  const halfArea = signedPolygonArea(half);
  if (halfArea > 1e-3 && halfArea <= origArea + 1e-3) {
    return half;
  }

  return poly;
}

function extractCellContour(labels, gw, gh, s, minX, minY, maxX, maxY, scaleX, scaleY) {
  const stride = 2 * gw + 1;
  const nextMap = new Map();

  for (let cy = minY - 1; cy <= maxY; cy++) {
    const y0In = cy >= 0 && cy < gh;
    const y1In = cy + 1 >= 0 && cy + 1 < gh;
    const row0 = cy * gw;
    const row1 = (cy + 1) * gw;

    for (let cx = minX - 1; cx <= maxX; cx++) {
      const x0In = cx >= 0 && cx < gw;
      const x1In = cx + 1 >= 0 && cx + 1 < gw;

      const tl = x0In && y0In && labels[row0 + cx] === s ? 1 : 0;
      const tr = x1In && y0In && labels[row0 + cx + 1] === s ? 1 : 0;
      const br = x1In && y1In && labels[row1 + cx + 1] === s ? 1 : 0;
      const bl = x0In && y1In && labels[row1 + cx] === s ? 1 : 0;

      const mask = (tl << 3) | (tr << 2) | (br << 1) | bl;
      if (mask === 0 || mask === 15) continue;

      // Preserve sharp outer canvas corners flush with [0, w] x [0, h]
      if (cx === -1 && cy === -1 && mask === 2) {
        const corner = 0;
        nextMap.set(edgePointKey(cx, cy, EDGE_B, stride), corner);
        nextMap.set(corner, edgePointKey(cx, cy, EDGE_R, stride));
        continue;
      }
      if (cx === gw - 1 && cy === -1 && mask === 1) {
        const corner = 2 * gw;
        nextMap.set(edgePointKey(cx, cy, EDGE_L, stride), corner);
        nextMap.set(corner, edgePointKey(cx, cy, EDGE_B, stride));
        continue;
      }
      if (cx === gw - 1 && cy === gh - 1 && mask === 8) {
        const corner = 2 * gh * stride + 2 * gw;
        nextMap.set(edgePointKey(cx, cy, EDGE_T, stride), corner);
        nextMap.set(corner, edgePointKey(cx, cy, EDGE_L, stride));
        continue;
      }
      if (cx === -1 && cy === gh - 1 && mask === 4) {
        const corner = 2 * gh * stride;
        nextMap.set(edgePointKey(cx, cy, EDGE_R, stride), corner);
        nextMap.set(corner, edgePointKey(cx, cy, EDGE_T, stride));
        continue;
      }

      const transitions = MARCHING_SQUARES_EDGES[mask];
      for (let t = 0; t < transitions.length; t++) {
        const [fromEdge, toEdge] = transitions[t];
        const fromKey = edgePointKey(cx, cy, fromEdge, stride);
        const toKey = edgePointKey(cx, cy, toEdge, stride);
        nextMap.set(fromKey, toKey);
      }
    }
  }

  const visited = new Set();
  let bestLoop = null;
  let bestArea = 0;

  for (const startKey of nextMap.keys()) {
    if (visited.has(startKey)) continue;
    const loop = [];
    let curr = startKey;

    while (curr !== undefined && !visited.has(curr)) {
      visited.add(curr);
      const hx = curr % stride;
      const hy = (curr - hx) / stride;
      loop.push({ x: hx * 0.5 * scaleX, y: hy * 0.5 * scaleY });
      curr = nextMap.get(curr);
    }

    if (loop.length >= 3) {
      const area = signedPolygonArea(loop);
      if (area > bestArea) {
        bestArea = area;
        bestLoop = loop;
      }
    }
  }

  return bestLoop;
}

function generateNonEuclideanPolygons(w, h, seeds, metric, nearestSeed, inset) {
  const n = seeds.length;
  let labels = nearestSeed;
  let gw = w;
  let gh = h;

  if (!labels || labels.length !== w * h) {
    if (w * h > 250000) {
      const scale = Math.sqrt(129600 / (w * h));
      gw = Math.max(1, Math.round(w * scale));
      gh = Math.max(1, Math.round(h * scale));
    }
    const sxScale = gw / w;
    const syScale = gh / h;
    const workingSeeds =
      gw === w && gh === h
        ? seeds
        : seeds.map((pt) => ({ x: pt.x * sxScale, y: pt.y * syScale }));
    const dummyPixels = new Uint8ClampedArray(gw * gh * 4);
    labels = computeVoronoi(dummyPixels, gw, gh, workingSeeds, metric).nearestSeed;
  }

  const minX = new Int32Array(n).fill(gw);
  const minY = new Int32Array(n).fill(gh);
  const maxX = new Int32Array(n).fill(-1);
  const maxY = new Int32Array(n).fill(-1);

  for (let y = 0; y < gh; y++) {
    const rowOffset = y * gw;
    for (let x = 0; x < gw; x++) {
      const s = labels[rowOffset + x];
      if (s < 0 || s >= n) continue;
      if (x < minX[s]) minX[s] = x;
      if (x > maxX[s]) maxX[s] = x;
      if (y < minY[s]) minY[s] = y;
      if (y > maxY[s]) maxY[s] = y;
    }
  }

  const scaleX = w / gw;
  const scaleY = h / gh;
  const results = [];

  for (let s = 0; s < n; s++) {
    if (maxX[s] < minX[s]) continue;

    const rawLoop = extractCellContour(
      labels,
      gw,
      gh,
      s,
      minX[s],
      minY[s],
      maxX[s],
      maxY[s],
      scaleX,
      scaleY
    );
    if (!rawLoop || rawLoop.length < 3) continue;

    let poly = simplifyClosedPolygon(rawLoop, 0.6);
    if (inset > 0) {
      poly = insetPolygon(poly, inset, w, h);
    }
    if (poly.length < 3) continue;

    results.push({ s, poly });
  }

  return results;
}

/**
 * Generate a clean, valid SVG string of the Voronoi tessellation.
 */
export function generateVoronoiSVG(
  w,
  h,
  seeds,
  avgColors,
  {
    borderWidth = 1.5,
    borderColor = '#111113',
    transparentBorder = false,
    wireframe = false,
    metric = 'euclidean',
    nearestSeed = null,
    bevel = 0,
  } = {}
) {
  const safeW = Number.isFinite(Number(w)) ? Math.max(0, Number(w)) : 0;
  const safeH = Number.isFinite(Number(h)) ? Math.max(0, Number(h)) : 0;
  const rawBorderWidth = Number(borderWidth);
  const safeBorderWidth = Number.isFinite(rawBorderWidth) ? Math.max(0, rawBorderWidth) : 0;
  const safeBorderColor = sanitizeHexColor(borderColor);
  const rawBevel = Number(bevel);
  const safeBevel = Number.isFinite(rawBevel) ? Math.max(0, rawBevel) : 0;
  const seedList = Array.isArray(seeds) ? seeds : [];
  const n = seedList.length;
  const polygons = [];

  const stroke = wireframe
    ? safeBorderColor
    : transparentBorder || safeBorderWidth <= 0
      ? 'none'
      : safeBorderColor;
  const strokeWidth = transparentBorder && !wireframe ? 0 : safeBorderWidth;
  const inset = transparentBorder && !wireframe && safeBorderWidth > 0 ? safeBorderWidth * 0.5 : 0;

  if (n > 0 && safeW > 0 && safeH > 0) {
    if (metric === 'manhattan' || metric === 'chebyshev') {
      const cells = generateNonEuclideanPolygons(safeW, safeH, seedList, metric, nearestSeed, inset);
      for (let i = 0; i < cells.length; i++) {
        const { s, poly } = cells[i];
        const points = formatPoints(poly, safeW, safeH);
        const fill = getShardFill(s, avgColors, wireframe, safeBevel);
        polygons.push(
          `  <polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" />`
        );
      }
    } else {
      for (let s = 0; s < n; s++) {
        let poly = computeEuclideanCell(safeW, safeH, seedList, s, inset);
        if (inset > 0 && (poly.length < 3 || Math.abs(signedPolygonArea(poly)) < 1e-4)) {
          poly = computeEuclideanCell(safeW, safeH, seedList, s, 0);
        }
        if (poly.length < 3) continue;

        const points = formatPoints(poly, safeW, safeH);
        const fill = getShardFill(s, avgColors, wireframe, safeBevel);
        polygons.push(
          `  <polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" />`
        );
      }
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${safeW} ${safeH}" width="${safeW}" height="${safeH}">`,
    ...polygons,
    '</svg>',
  ].join('\n');
}
