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
      let min1 = Infinity, min2 = Infinity;
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
      avgColors[s * 4]     = cellSumR[s] / cellCounts[s];
      avgColors[s * 4 + 1] = cellSumG[s] / cellCounts[s];
      avgColors[s * 4 + 2] = cellSumB[s] / cellCounts[s];
      avgColors[s * 4 + 3] = 255;
    } else {
      avgColors[s * 4 + 3] = 0;
    }
  }

  return { nearestSeed, dist1Sq, dist2Sq, avgColors };
}

export function renderVoronoi(w, h, nearestSeed, dist1Sq, dist2Sq, avgColors, borderWidth, borderColor) {
  const numPixels = w * h;
  const out = new Uint8ClampedArray(numPixels * 4);
  const bw = borderWidth;
  const [br, bg, bb] = borderColor;

  for (let i = 0; i < numPixels; i++) {
    const d1 = Math.sqrt(dist1Sq[i]);
    const d2 = Math.sqrt(dist2Sq[i]);

    if (bw > 0 && (d2 - d1) < bw) {
      out[i * 4]     = br;
      out[i * 4 + 1] = bg;
      out[i * 4 + 2] = bb;
      out[i * 4 + 3] = 255;
    } else {
      const s = nearestSeed[i];
      const ai = s * 4;
      out[i * 4]     = avgColors[ai];
      out[i * 4 + 1] = avgColors[ai + 1];
      out[i * 4 + 2] = avgColors[ai + 2];
      out[i * 4 + 3] = 255;
    }
  }
  return out;
}
