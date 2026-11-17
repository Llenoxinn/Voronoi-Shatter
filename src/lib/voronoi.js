export function generateSeeds(w, h, count, jitter) {
  const aspect = w / h;
  const cols = Math.max(1, Math.round(Math.sqrt(count * aspect)));
  const rows = Math.max(1, Math.round(count / cols));
  const cellW = w / cols;
  const cellH = h / rows;
  const jf = jitter / 100;
  const maxDx = cellW * 0.48 * jf;
  const maxDy = cellH * 0.48 * jf;
  const seeds = [];

  for (let r = 0; r < rows && seeds.length < count; r++) {
    for (let c = 0; c < cols && seeds.length < count; c++) {
      const cx = (c + 0.5) * cellW;
      const cy = (r + 0.5) * cellH;
      seeds.push({
        x: Math.max(0, Math.min(w - 1, cx + (Math.random() * 2 - 1) * maxDx)),
        y: Math.max(0, Math.min(h - 1, cy + (Math.random() * 2 - 1) * maxDy)),
      });
    }
  }
  return seeds;
}

export function computeVoronoi(pixels, w, h, seeds) {
  const n = seeds.length;
  const numPixels = w * h;
  const nearestSeed = new Int32Array(numPixels);
  const dist1Sq = new Float32Array(numPixels);
  const dist2Sq = new Float32Array(numPixels);
  const cellSumR = new Float64Array(n);
  const cellSumG = new Float64Array(n);
  const cellSumB = new Float64Array(n);
  const cellCounts = new Int32Array(n);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let min1 = Infinity;
      let min2 = Infinity;
      let minIdx = -1;

      for (let s = 0; s < n; s++) {
        const dx = x - seeds[s].x;
        const dy = y - seeds[s].y;
        const d = dx * dx + dy * dy;

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
      dist1Sq[i] = min1;
      dist2Sq[i] = min2;

      const pi = i * 4;
      cellSumR[minIdx] += pixels[pi];
      cellSumG[minIdx] += pixels[pi + 1];
      cellSumB[minIdx] += pixels[pi + 2];
      cellCounts[minIdx]++;
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
        const d =
          base < 64
            ? (((16 * base) / 255 - 12) * (base / 255) + 4) * (base / 255)
            : Math.sqrt(base / 255) * 255;
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
  blendPixels,
  blendMode,
  blendOpacity
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

  const nSeeds = seeds ? seeds.length : avgColors.length / 4;
  const seedShiftX = new Float32Array(nSeeds);
  const seedShiftY = new Float32Array(nSeeds);
  const seedTint = new Float32Array(nSeeds);

  for (let s = 0; s < nSeeds; s++) {
    const angle = seedHash(s + 1, 1.37) * Math.PI * 2;
    const mag = 0.35 + seedHash(s + 1, 4.91) * 0.65;
    seedShiftX[s] = Math.cos(angle) * mag * refShift;
    seedShiftY[s] = Math.sin(angle) * mag * refShift;
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

      if (refAmt > 0 && srcPixels) {
        const sx = Math.max(0, Math.min(w - 1, Math.round(x + seedShiftX[s])));
        const sy = Math.max(0, Math.min(h - 1, Math.round(y + seedShiftY[s])));
        const si = (sy * w + sx) * 4;
        const mix = Math.min(1, refAmt * 1.15);
        r = r + (srcPixels[si] - r) * mix;
        g = g + (srcPixels[si + 1] - g) * mix;
        b = b + (srcPixels[si + 2] - b) * mix;
      }

      const d1 = Math.sqrt(dist1Sq[i]);
      const d2 = Math.sqrt(dist2Sq[i]);
      const edgeDist = d2 - d1;

      if (bevelAmt > 0 && seeds && seeds[s]) {
        const vx = x - seeds[s].x;
        const vy = y - seeds[s].y;
        const len = Math.sqrt(vx * vx + vy * vy) || 1;
        // Top-left key light (-0.707, -0.707)
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

      if (bw > 0) {
        const borderAlpha = 1 - smoothstep(Math.max(0, bw - 0.85), bw + 0.85, edgeDist);
        if (borderAlpha > 0) {
          r = r + (br - r) * borderAlpha;
          g = g + (bg - g) * borderAlpha;
          b = b + (bb - b) * borderAlpha;
        }
      }

      out[oi] = r;
      out[oi + 1] = g;
      out[oi + 2] = b;
      out[oi + 3] = 255;
    }
  }

  return out;
}
