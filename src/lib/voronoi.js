function mulberry32(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSeeds(w, h, count, jitter, seed = 1, impact = null) {
  const rand = mulberry32(seed);
  const seeds = [];

  if (impact && typeof impact.x === 'number' && typeof impact.y === 'number') {
    const ix = Math.max(0, Math.min(w - 1, impact.x * w));
    const iy = Math.max(0, Math.min(h - 1, impact.y * h));
    const maxR = Math.hypot(Math.max(ix, w - ix), Math.max(iy, h - iy));
    const jf = jitter / 100;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    seeds.push({ x: ix, y: iy });
    for (let k = 1; k < count; k++) {
      const t = k / count;
      // Power curve clusters smaller shards tightly around the impact epicenter
      const rNorm = Math.pow(t, 1.35);
      const radius = rNorm * maxR * (0.85 + (rand() - 0.5) * 0.45 * jf);
      const angle = k * goldenAngle + (rand() - 0.5) * 0.85 * jf;
      const sx = Math.max(0, Math.min(w - 1, ix + Math.cos(angle) * radius));
      const sy = Math.max(0, Math.min(h - 1, iy + Math.sin(angle) * radius));
      seeds.push({ x: sx, y: sy });
    }
    return seeds;
  }

  const aspect = w / h;
  const cols = Math.max(1, Math.round(Math.sqrt(count * aspect)));
  const rows = Math.max(1, Math.round(count / cols));
  const cellW = w / cols;
  const cellH = h / rows;
  const jf = jitter / 100;
  const maxDx = cellW * 0.48 * jf;
  const maxDy = cellH * 0.48 * jf;

  for (let r = 0; r < rows && seeds.length < count; r++) {
    for (let c = 0; c < cols && seeds.length < count; c++) {
      const cx = (c + 0.5) * cellW;
      const cy = (r + 0.5) * cellH;
      seeds.push({
        x: Math.max(0, Math.min(w - 1, cx + (rand() * 2 - 1) * maxDx)),
        y: Math.max(0, Math.min(h - 1, cy + (rand() * 2 - 1) * maxDy)),
      });
    }
  }
  return seeds;
}

export function computeVoronoi(pixels, w, h, seeds, metric = 'euclidean') {
  const n = seeds.length;
  const numPixels = w > 0 && h > 0 ? w * h : 0;
  const nearestSeed = new Int32Array(numPixels);
  const dist1Sq = new Float32Array(numPixels);
  const dist2Sq = new Float32Array(numPixels);

  if (n === 0 || numPixels === 0) {
    nearestSeed.fill(-1);
    dist1Sq.fill(Infinity);
    dist2Sq.fill(Infinity);
    return {
      nearestSeed,
      dist1Sq,
      dist2Sq,
      avgColors: new Uint8ClampedArray(n * 4),
    };
  }

  const cellSumR = new Float64Array(n);
  const cellSumG = new Float64Array(n);
  const cellSumB = new Float64Array(n);
  const cellCounts = new Int32Array(n);
  const metricMode = metric === 'manhattan' ? 1 : metric === 'chebyshev' ? 2 : 0;

  if (n >= 24 && w > 0 && h > 0) {
    const cs = Math.max(8, Math.sqrt((w * h) / n));
    const gridW = Math.ceil(w / cs);
    const gridH = Math.ceil(h / cs);
    const gridCount = gridW * gridH;

    const bucketCounts = new Int32Array(gridCount);
    const seedBucket = new Int32Array(n);
    const seedX = new Float64Array(n);
    const seedY = new Float64Array(n);

    for (let s = 0; s < n; s++) {
      const sx = seeds[s].x;
      const sy = seeds[s].y;
      seedX[s] = sx;
      seedY[s] = sy;
      const bx = Math.max(0, Math.min(gridW - 1, Math.floor(sx / cs)));
      const by = Math.max(0, Math.min(gridH - 1, Math.floor(sy / cs)));
      const bi = by * gridW + bx;
      seedBucket[s] = bi;
      bucketCounts[bi]++;
    }

    const bucketOffsets = new Int32Array(gridCount + 1);
    for (let i = 0; i < gridCount; i++) {
      bucketOffsets[i + 1] = bucketOffsets[i] + bucketCounts[i];
    }

    const bucketSeeds = new Int32Array(n);
    const writePos = new Int32Array(bucketOffsets.subarray(0, gridCount));
    for (let s = 0; s < n; s++) {
      const bi = seedBucket[s];
      bucketSeeds[writePos[bi]++] = s;
    }

    const maxSpans = 2 + 2 * gridH;
    const spanStart = new Int32Array(maxSpans);
    const spanEnd = new Int32Array(maxSpans);

    for (let y = 0; y < h; y++) {
      const rowOffset = y * w;
      const gy = Math.min(gridH - 1, Math.floor(y / cs));

      for (let x = 0; x < w; x++) {
        const gx = Math.min(gridW - 1, Math.floor(x / cs));
        let min1 = Infinity;
        let min2 = Infinity;
        let minIdx = -1;

        for (let r = 0; ; r++) {
          let spanCount = 0;

          if (r === 0) {
            const bi = gy * gridW + gx;
            const s0 = bucketOffsets[bi];
            const e0 = bucketOffsets[bi + 1];
            if (s0 < e0) {
              spanStart[0] = s0;
              spanEnd[0] = e0;
              spanCount = 1;
            }
          } else {
            const hasLeft = gx - r >= 0;
            const hasRight = gx + r < gridW;
            const hasTop = gy - r >= 0;
            const hasBottom = gy + r < gridH;

            if (!hasLeft && !hasRight && !hasTop && !hasBottom) break;

            if (min2 < Infinity) {
              let minBound = Infinity;
              if (hasLeft) {
                const bd = x - (gx - r + 1) * cs;
                if (bd < minBound) minBound = bd;
              }
              if (hasRight) {
                const bd = (gx + r) * cs - x;
                if (bd < minBound) minBound = bd;
              }
              if (hasTop) {
                const bd = y - (gy - r + 1) * cs;
                if (bd < minBound) minBound = bd;
              }
              if (hasBottom) {
                const bd = (gy + r) * cs - y;
                if (bd < minBound) minBound = bd;
              }
              const safeBound = minBound - 1e-6;
              if (safeBound > 0) {
                if (metricMode === 0 ? safeBound * safeBound > min2 : safeBound > min2) {
                  break;
                }
              }
            }

            const xMin = hasLeft ? gx - r : 0;
            const xMax = hasRight ? gx + r : gridW - 1;

            if (hasTop) {
              const rowBase = (gy - r) * gridW;
              const s0 = bucketOffsets[rowBase + xMin];
              const e0 = bucketOffsets[rowBase + xMax + 1];
              if (s0 < e0) {
                spanStart[spanCount] = s0;
                spanEnd[spanCount] = e0;
                spanCount++;
              }
            }
            if (hasBottom) {
              const rowBase = (gy + r) * gridW;
              const s0 = bucketOffsets[rowBase + xMin];
              const e0 = bucketOffsets[rowBase + xMax + 1];
              if (s0 < e0) {
                spanStart[spanCount] = s0;
                spanEnd[spanCount] = e0;
                spanCount++;
              }
            }
            if (hasLeft || hasRight) {
              const yStart = hasTop ? gy - r + 1 : 0;
              const yEnd = hasBottom ? gy + r - 1 : gridH - 1;
              if (hasLeft) {
                const lx = gx - r;
                for (let by = yStart; by <= yEnd; by++) {
                  const bi = by * gridW + lx;
                  const s0 = bucketOffsets[bi];
                  const e0 = bucketOffsets[bi + 1];
                  if (s0 < e0) {
                    spanStart[spanCount] = s0;
                    spanEnd[spanCount] = e0;
                    spanCount++;
                  }
                }
              }
              if (hasRight) {
                const rx = gx + r;
                for (let by = yStart; by <= yEnd; by++) {
                  const bi = by * gridW + rx;
                  const s0 = bucketOffsets[bi];
                  const e0 = bucketOffsets[bi + 1];
                  if (s0 < e0) {
                    spanStart[spanCount] = s0;
                    spanEnd[spanCount] = e0;
                    spanCount++;
                  }
                }
              }
            }
          }

          for (let sp = 0; sp < spanCount; sp++) {
            const start = spanStart[sp];
            const end = spanEnd[sp];
            for (let k = start; k < end; k++) {
              const s = bucketSeeds[k];
              const dx = x - seedX[s];
              const dy = y - seedY[s];
              let d;
              if (metricMode === 1) {
                d = Math.abs(dx) + Math.abs(dy);
              } else if (metricMode === 2) {
                d = Math.max(Math.abs(dx), Math.abs(dy));
              } else {
                d = dx * dx + dy * dy;
              }

              if (d <= min2) {
                if (d < min1) {
                  min2 = min1;
                  min1 = d;
                  minIdx = s;
                } else if (d === min1) {
                  if (s < minIdx) minIdx = s;
                  min2 = min1;
                } else {
                  min2 = d;
                }
              }
            }
          }
        }

        const i = rowOffset + x;
        nearestSeed[i] = minIdx;
        dist1Sq[i] = metricMode === 0 ? min1 : min1 * min1;
        dist2Sq[i] = metricMode === 0 ? min2 : min2 * min2;

        const pi = i * 4;
        cellSumR[minIdx] += pixels[pi];
        cellSumG[minIdx] += pixels[pi + 1];
        cellSumB[minIdx] += pixels[pi + 2];
        cellCounts[minIdx]++;
      }
    }
  } else {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let min1 = Infinity;
        let min2 = Infinity;
        let minIdx = -1;

        for (let s = 0; s < n; s++) {
          const dx = x - seeds[s].x;
          const dy = y - seeds[s].y;
          let d;
          if (metricMode === 1) {
            d = Math.abs(dx) + Math.abs(dy);
          } else if (metricMode === 2) {
            d = Math.max(Math.abs(dx), Math.abs(dy));
          } else {
            d = dx * dx + dy * dy;
          }

          if (d < min1) {
            min2 = min1;
            min1 = d;
            minIdx = s;
          } else if (d < min2) {
            min2 = d;
          }
        }

        const i = y * w + x;
        nearestSeed[i] = minIdx;
        dist1Sq[i] = metricMode === 0 ? min1 : min1 * min1;
        dist2Sq[i] = metricMode === 0 ? min2 : min2 * min2;

        const pi = i * 4;
        cellSumR[minIdx] += pixels[pi];
        cellSumG[minIdx] += pixels[pi + 1];
        cellSumB[minIdx] += pixels[pi + 2];
        cellCounts[minIdx]++;
      }
    }
  }

  const avgColors = new Uint8ClampedArray(n * 4);
  for (let s = 0; s < n; s++) {
    if (cellCounts[s] > 0) {
      avgColors[s * 4] = cellSumR[s] / cellCounts[s];
      avgColors[s * 4 + 1] = cellSumG[s] / cellCounts[s];
      avgColors[s * 4 + 2] = cellSumB[s] / cellCounts[s];
      avgColors[s * 4 + 3] = 255;
    } else {
      avgColors[s * 4 + 3] = 0;
    }
  }

  return { nearestSeed, dist1Sq, dist2Sq, avgColors };
}

function blendRGB(r, g, b, br, bg, bb, mode) {
  switch (mode) {
    case 'normal':
      return [br, bg, bb];
    case 'multiply':
      return [(r * br) / 255, (g * bg) / 255, (b * bb) / 255];
    case 'screen':
      return [
        255 - ((255 - r) * (255 - br)) / 255,
        255 - ((255 - g) * (255 - bg)) / 255,
        255 - ((255 - b) * (255 - bb)) / 255,
      ];
    case 'overlay': {
      const ol = (base, blend) =>
        base < 128
          ? (2 * base * blend) / 255
          : 255 - (2 * (255 - base) * (255 - blend)) / 255;
      return [ol(r, br), ol(g, bg), ol(b, bb)];
    }
    case 'soft-light': {
      const sl = (base, blend) => {
        const f = blend / 255;
        if (f <= 0.5) return base - ((1 - 2 * f) * base * (255 - base)) / 255;
        const bn = base / 255;
        const d = (bn <= 0.25 ? ((16 * bn - 12) * bn + 4) * bn : Math.sqrt(bn)) * 255;
        return base + (2 * f - 1) * (d - base);
      };
      return [sl(r, br), sl(g, bg), sl(b, bb)];
    }
    default:
      return [r, g, b];
  }
}

function seedHash(s, salt) {
  const x = Math.sin(s * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function renderVoronoi(
  w,
  h,
  nearestSeed,
  dist1Sq,
  dist2Sq,
  avgColors,
  seeds,
  srcPixels,
  borderWidth,
  borderColor,
  refraction,
  bevel,
  dispersion,
  blendPixels,
  blendMode,
  blendOpacity,
  transparentBorder = false,
  wireframe = false
) {
  const numPixels = w * h;
  const out = new Uint8ClampedArray(numPixels * 4);
  const bw = borderWidth;
  const [br, bg, bb] = borderColor;
  const blendAmt = (blendOpacity || 0) / 100;
  const useBlend = Boolean(blendPixels && blendAmt > 0 && blendMode);

  const refAmt = Math.max(0, Math.min(1, (refraction || 0) / 100));
  const refShift = refAmt * 32;
  const bevelAmt = Math.max(0, Math.min(1, (bevel || 0) / 100));
  const dispAmt = Math.max(0, Math.min(1, (dispersion || 0) / 100));
  const dispPx = dispAmt * 14;

  const nSeeds = seeds && seeds.length > 0 ? seeds.length : avgColors.length / 4;
  const seedShiftX = new Float32Array(nSeeds);
  const seedShiftY = new Float32Array(nSeeds);
  const seedDirX = new Float32Array(nSeeds);
  const seedDirY = new Float32Array(nSeeds);
  const seedTint = new Float32Array(nSeeds);

  for (let s = 0; s < nSeeds; s++) {
    const angle = seedHash(s + 1, 1.37) * Math.PI * 2;
    const mag = 0.35 + seedHash(s + 1, 4.91) * 0.65;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    seedDirX[s] = dx;
    seedDirY[s] = dy;
    seedShiftX[s] = dx * mag * refShift;
    seedShiftY[s] = dy * mag * refShift;
    seedTint[s] = (seedHash(s + 1, 9.13) - 0.5) * 2;
  }

  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      const i = rowOffset + x;
      const oi = i * 4;
      const s = nearestSeed[i];
      const ai = s * 4;

      let r = avgColors[ai];
      let g = avgColors[ai + 1];
      let b = avgColors[ai + 2];

      if ((refAmt > 0 || dispAmt > 0) && srcPixels) {
        const gx = Math.max(0, Math.min(w - 1, Math.round(x + seedShiftX[s])));
        const gy = Math.max(0, Math.min(h - 1, Math.round(y + seedShiftY[s])));
        const gi = (gy * w + gx) * 4;

        let sr = srcPixels[gi];
        const sg = srcPixels[gi + 1];
        let sb = srcPixels[gi + 2];

        if (dispPx > 0.25) {
          const rx = Math.max(0, Math.min(w - 1, Math.round(gx + seedDirX[s] * dispPx)));
          const ry = Math.max(0, Math.min(h - 1, Math.round(gy + seedDirY[s] * dispPx)));
          const bx = Math.max(0, Math.min(w - 1, Math.round(gx - seedDirX[s] * dispPx)));
          const by = Math.max(0, Math.min(h - 1, Math.round(gy - seedDirY[s] * dispPx)));
          sr = srcPixels[(ry * w + rx) * 4];
          sb = srcPixels[(by * w + bx) * 4 + 2];
        }

        const mix = Math.min(1, Math.max(refAmt * 1.15, dispAmt * 0.85));
        r = r + (sr - r) * mix;
        g = g + (sg - g) * mix;
        b = b + (sb - b) * mix;
      }

      const d1 = Math.sqrt(dist1Sq[i]);
      const d2 = Math.sqrt(dist2Sq[i]);
      const edgeDist = d2 - d1;

      if (bevelAmt > 0 && seeds && seeds[s]) {
        const vx = x - seeds[s].x;
        const vy = y - seeds[s].y;
        const len = Math.sqrt(vx * vx + vy * vy) || 1;
        const lightDot = -(vx * 0.7071 + vy * 0.7071) / len;
        const rim = 1 - smoothstep(bw, bw + 14, edgeDist);
        const facetLight = seedTint[s] * 14 * bevelAmt;
        const edgeLight = lightDot * rim * 52 * bevelAmt;
        const delta = facetLight + edgeLight;
        r = Math.max(0, Math.min(255, r + delta));
        g = Math.max(0, Math.min(255, g + delta));
        b = Math.max(0, Math.min(255, b + delta));
      }

      if (useBlend) {
        const [mr, mg, mb] = blendRGB(
          r,
          g,
          b,
          blendPixels[oi],
          blendPixels[oi + 1],
          blendPixels[oi + 2],
          blendMode
        );
        r = r + (mr - r) * blendAmt;
        g = g + (mg - g) * blendAmt;
        b = b + (mb - b) * blendAmt;
      }

      let alpha = 255;

      if (wireframe) {
        if (bw > 0) {
          const borderAlpha = 1 - smoothstep(Math.max(0, bw - 0.85), bw + 0.85, edgeDist);
          r = br;
          g = bg;
          b = bb;
          alpha = Math.round(255 * borderAlpha);
        } else {
          alpha = 0;
        }
      } else if (bw > 0) {
        const borderAlpha = 1 - smoothstep(Math.max(0, bw - 0.85), bw + 0.85, edgeDist);
        if (borderAlpha > 0) {
          if (transparentBorder) {
            alpha = Math.round(255 * (1 - borderAlpha));
          } else {
            r = r + (br - r) * borderAlpha;
            g = g + (bg - g) * borderAlpha;
            b = b + (bb - b) * borderAlpha;
          }
        }
      }

      out[oi] = r;
      out[oi + 1] = g;
      out[oi + 2] = b;
      out[oi + 3] = alpha;
    }
  }

  return out;
}
