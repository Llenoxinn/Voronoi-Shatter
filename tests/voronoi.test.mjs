import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateSeeds, computeVoronoi, renderVoronoi } from '../src/lib/voronoi.js';
import { generateVoronoiSVG } from '../src/lib/svg-export.js';

function createGradientPixels(w, h) {
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      pixels[i] = Math.round((x / Math.max(1, w - 1)) * 255);
      pixels[i + 1] = Math.round((y / Math.max(1, h - 1)) * 255);
      pixels[i + 2] = ((x * 7 + y * 13) % 256);
      pixels[i + 3] = 255;
    }
  }
  return pixels;
}

function createSolidPixels(w, h, r, g, b, a = 255) {
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = a;
  }
  return pixels;
}

function extractPolygonTags(svg) {
  return svg.match(/<polygon\b[^>]*\/>/g) ?? [];
}

function extractPolygonPoints(svg) {
  return extractPolygonTags(svg).map((poly) => {
    const match = poly.match(/points="([^"]+)"/);
    assert.ok(match, 'polygon should contain a points attribute');
    return match[1];
  });
}

function extractPolygonFills(svg) {
  return extractPolygonTags(svg).map((poly) => {
    const match = poly.match(/fill="([^"]+)"/);
    assert.ok(match, 'polygon should contain a fill attribute');
    return match[1];
  });
}

function parsePolygonArea(polyTag) {
  const match = polyTag.match(/points="([^"]+)"/);
  assert.ok(match, 'polygon should contain a points attribute');
  const coords = match[1]
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      assert.ok(Number.isFinite(x) && Number.isFinite(y), 'polygon vertex coordinates must be finite numbers');
      return { x, y };
    });

  let area2 = 0;
  for (let i = 0; i < coords.length; i++) {
    const a = coords[i];
    const b = coords[(i + 1) % coords.length];
    area2 += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area2) * 0.5;
}

function totalSvgPolygonArea(svg) {
  return extractPolygonTags(svg).reduce((sum, poly) => sum + parsePolygonArea(poly), 0);
}

function computeVoronoiBruteForce(pixels, w, h, seeds, metric = 'euclidean') {
  const n = seeds.length;
  const numPixels = w * h;
  const nearestSeed = new Int32Array(numPixels);
  const dist1Sq = new Float32Array(numPixels);
  const dist2Sq = new Float32Array(numPixels);
  const cellSumR = new Float64Array(n);
  const cellSumG = new Float64Array(n);
  const cellSumB = new Float64Array(n);
  const cellCounts = new Int32Array(n);
  const metricMode = metric === 'manhattan' ? 1 : metric === 'chebyshev' ? 2 : 0;

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

describe('generateSeeds', () => {
  it('produces deterministic output for an identical seed', () => {
    const first = generateSeeds(100, 100, 16, 65, 42);
    const second = generateSeeds(100, 100, 16, 65, 42);

    assert.equal(first.length, 16);
    assert.deepEqual(first, second);
    for (const pt of first) {
      assert.ok(pt.x >= 0 && pt.x <= 99);
      assert.ok(pt.y >= 0 && pt.y <= 99);
    }
  });

  it('produces distinct output for different seeds', () => {
    const a = generateSeeds(100, 100, 16, 65, 42);
    const b = generateSeeds(100, 100, 16, 65, 99);

    assert.notDeepEqual(a, b);
  });

  it('places seed 0 at (impact.x * w, impact.y * h) in radial impact mode', () => {
    const w = 120;
    const h = 80;
    const count = 20;
    const impact = { x: 0.35, y: 0.625 };

    const seedsA = generateSeeds(w, h, count, 50, 7, impact);
    const seedsB = generateSeeds(w, h, count, 50, 7, impact);
    const seedsC = generateSeeds(w, h, count, 50, 19, impact);

    assert.equal(seedsA.length, count);
    assert.equal(seedsA[0].x, impact.x * w);
    assert.equal(seedsA[0].y, impact.y * h);
    assert.deepEqual(seedsA, seedsB);
    assert.notDeepEqual(seedsA, seedsC);

    for (const pt of seedsA) {
      assert.ok(pt.x >= 0 && pt.x <= w - 1);
      assert.ok(pt.y >= 0 && pt.y <= h - 1);
    }
  });
});

describe('computeVoronoi', () => {
  for (const metric of ['euclidean', 'manhattan', 'chebyshev']) {
    it(`returns expected typed array lengths and invariants for ${metric} metric`, () => {
      const w = 32;
      const h = 24;
      const seeds = generateSeeds(w, h, 12, 45, 11);
      const pixels = createGradientPixels(w, h);

      const { nearestSeed, dist1Sq, dist2Sq, avgColors } = computeVoronoi(
        pixels,
        w,
        h,
        seeds,
        metric
      );

      assert.ok(nearestSeed instanceof Int32Array);
      assert.ok(dist1Sq instanceof Float32Array);
      assert.ok(dist2Sq instanceof Float32Array);
      assert.ok(avgColors instanceof Uint8ClampedArray);

      assert.equal(nearestSeed.length, w * h);
      assert.equal(dist1Sq.length, w * h);
      assert.equal(dist2Sq.length, w * h);
      assert.equal(avgColors.length, seeds.length * 4);

      for (let i = 0; i < w * h; i++) {
        assert.ok(nearestSeed[i] >= 0 && nearestSeed[i] < seeds.length);
        assert.ok(dist1Sq[i] >= 0);
        assert.ok(dist2Sq[i] >= dist1Sq[i]);
      }
    });
  }

  it('differentiates euclidean, manhattan, and chebyshev metrics accurately', () => {
    const w = 10;
    const h = 10;
    const pixels = createSolidPixels(w, h, 100, 150, 200);
    const idx = 3 * w + 3; // pixel (3, 3)

    // At (3, 3): seed 0 at (1, 1) -> dx=2, dy=2 (E^2=8, M=4, C=2)
    //           seed 1 at (0, 3) -> dx=3, dy=0 (E^2=9, M=3, C=3)
    const seedsEM = [
      { x: 1, y: 1 },
      { x: 0, y: 3 },
    ];
    const euclEM = computeVoronoi(pixels, w, h, seedsEM, 'euclidean');
    const manhEM = computeVoronoi(pixels, w, h, seedsEM, 'manhattan');
    assert.equal(euclEM.nearestSeed[idx], 0);
    assert.equal(euclEM.dist1Sq[idx], 8);
    assert.equal(euclEM.dist2Sq[idx], 9);
    assert.equal(manhEM.nearestSeed[idx], 1);
    assert.equal(manhEM.dist1Sq[idx], 9);
    assert.equal(manhEM.dist2Sq[idx], 16);

    // At (3, 3): seed 0 at (0, 0) -> dx=3, dy=3 (E^2=18, M=6, C=3)
    //           seed 1 at (7, 3) -> dx=4, dy=0 (E^2=16, M=4, C=4)
    const seedsEC = [
      { x: 0, y: 0 },
      { x: 7, y: 3 },
    ];
    const euclEC = computeVoronoi(pixels, w, h, seedsEC, 'euclidean');
    const chebEC = computeVoronoi(pixels, w, h, seedsEC, 'chebyshev');
    assert.equal(euclEC.nearestSeed[idx], 1);
    assert.equal(euclEC.dist1Sq[idx], 16);
    assert.equal(euclEC.dist2Sq[idx], 18);
    assert.equal(chebEC.nearestSeed[idx], 0);
    assert.equal(chebEC.dist1Sq[idx], 9);
    assert.equal(chebEC.dist2Sq[idx], 16);
  });

  it('computes accurate per-cell average colors', () => {
    const w = 20;
    const h = 10;
    const pixels = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (x < 10) {
          pixels[i] = 200;
          pixels[i + 1] = 40;
          pixels[i + 2] = 20;
        } else {
          pixels[i] = 10;
          pixels[i + 1] = 80;
          pixels[i + 2] = 220;
        }
        pixels[i + 3] = 255;
      }
    }

    const seeds = [
      { x: 4, y: 5 },
      { x: 15, y: 5 },
    ];
    const { avgColors } = computeVoronoi(pixels, w, h, seeds, 'euclidean');

    assert.deepEqual(Array.from(avgColors), [200, 40, 20, 255, 10, 80, 220, 255]);
  });

  for (const mode of [
    { label: 'uniform grid', impact: null },
    { label: 'radial impact', impact: { x: 0.35, y: 0.6 } },
  ]) {
    for (const metric of ['euclidean', 'manhattan', 'chebyshev']) {
      it(`matches brute-force oracle exactly with spatial grid (n=48, ${metric}, ${mode.label})`, () => {
        const w = 75;
        const h = 53;
        const seeds = generateSeeds(w, h, 48, 70, 42, mode.impact);
        assert.equal(seeds.length, 48);

        const pixels = createGradientPixels(w, h);
        const actual = computeVoronoi(pixels, w, h, seeds, metric);
        const expected = computeVoronoiBruteForce(pixels, w, h, seeds, metric);

        assert.deepEqual(actual.nearestSeed, expected.nearestSeed);
        assert.deepEqual(actual.dist1Sq, expected.dist1Sq);
        assert.deepEqual(actual.dist2Sq, expected.dist2Sq);
        assert.deepEqual(actual.avgColors, expected.avgColors);
      });
    }
  }

  it('handles empty seeds without throwing and fills nearestSeed with -1', () => {
    const w = 8;
    const h = 8;
    const pixels = createGradientPixels(w, h);
    const { nearestSeed, dist1Sq, dist2Sq, avgColors } = computeVoronoi(pixels, w, h, [], 'euclidean');

    assert.ok(nearestSeed instanceof Int32Array);
    assert.ok(dist1Sq instanceof Float32Array);
    assert.ok(dist2Sq instanceof Float32Array);
    assert.ok(avgColors instanceof Uint8ClampedArray);

    assert.equal(nearestSeed.length, w * h);
    assert.equal(dist1Sq.length, w * h);
    assert.equal(dist2Sq.length, w * h);
    assert.equal(avgColors.length, 0);

    for (let i = 0; i < w * h; i++) {
      assert.equal(nearestSeed[i], -1);
      assert.equal(dist1Sq[i], Infinity);
      assert.equal(dist2Sq[i], Infinity);
    }
  });
});

describe('renderVoronoi', () => {
  it('returns a w * h * 4 Uint8ClampedArray', () => {
    const w = 24;
    const h = 20;
    const seeds = generateSeeds(w, h, 9, 40, 5);
    const pixels = createGradientPixels(w, h);
    const { nearestSeed, dist1Sq, dist2Sq, avgColors } = computeVoronoi(pixels, w, h, seeds, 'euclidean');

    const out = renderVoronoi(
      w,
      h,
      nearestSeed,
      dist1Sq,
      dist2Sq,
      avgColors,
      seeds,
      pixels,
      1.5,
      [17, 17, 19],
      0,
      0,
      0,
      null,
      'normal',
      0,
      false,
      false
    );

    assert.ok(out instanceof Uint8ClampedArray);
    assert.equal(out.length, w * h * 4);
  });

  it('makes interior non-border pixels transparent (alpha === 0) when wireframe is true', () => {
    const w = 40;
    const h = 40;
    const seeds = [
      { x: 10, y: 20 },
      { x: 30, y: 20 },
    ];
    const pixels = createSolidPixels(w, h, 120, 180, 240);
    const { nearestSeed, dist1Sq, dist2Sq, avgColors } = computeVoronoi(pixels, w, h, seeds, 'euclidean');

    const borderColor = [255, 64, 32];
    const out = renderVoronoi(
      w,
      h,
      nearestSeed,
      dist1Sq,
      dist2Sq,
      avgColors,
      seeds,
      pixels,
      2,
      borderColor,
      0,
      0,
      0,
      null,
      'normal',
      0,
      false,
      true
    );

    const interiorLeftIdx = (20 * w + 5) * 4;
    const interiorRightIdx = (20 * w + 35) * 4;
    const borderIdx = (20 * w + 20) * 4;

    assert.equal(out[interiorLeftIdx + 3], 0);
    assert.equal(out[interiorRightIdx + 3], 0);
    assert.equal(out[borderIdx], borderColor[0]);
    assert.equal(out[borderIdx + 1], borderColor[1]);
    assert.equal(out[borderIdx + 2], borderColor[2]);
    assert.equal(out[borderIdx + 3], 255);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const edgeDist = Math.sqrt(dist2Sq[idx]) - Math.sqrt(dist1Sq[idx]);
        if (edgeDist >= 2 + 0.85) {
          assert.equal(out[idx * 4 + 3], 0);
        }
      }
    }

    const zeroBorderWireframe = renderVoronoi(
      w,
      h,
      nearestSeed,
      dist1Sq,
      dist2Sq,
      avgColors,
      seeds,
      pixels,
      0,
      borderColor,
      0,
      0,
      0,
      null,
      'normal',
      0,
      false,
      true
    );
    for (let i = 3; i < zeroBorderWireframe.length; i += 4) {
      assert.equal(zeroBorderWireframe[i], 0);
    }
  });

  it('lowers alpha on border edges when transparentBorder is true', () => {
    const w = 40;
    const h = 40;
    const seeds = [
      { x: 10, y: 20 },
      { x: 30, y: 20 },
    ];
    const pixels = createSolidPixels(w, h, 80, 140, 200);
    const { nearestSeed, dist1Sq, dist2Sq, avgColors } = computeVoronoi(pixels, w, h, seeds, 'euclidean');

    const opaqueOut = renderVoronoi(
      w,
      h,
      nearestSeed,
      dist1Sq,
      dist2Sq,
      avgColors,
      seeds,
      pixels,
      2,
      [17, 17, 19],
      0,
      0,
      0,
      null,
      'normal',
      0,
      false,
      false
    );

    const transOut = renderVoronoi(
      w,
      h,
      nearestSeed,
      dist1Sq,
      dist2Sq,
      avgColors,
      seeds,
      pixels,
      2,
      [17, 17, 19],
      0,
      0,
      0,
      null,
      'normal',
      0,
      true,
      false
    );

    const interiorIdx = (20 * w + 5) * 4;
    const nearEdgeIdx = (20 * w + 19) * 4;
    const exactBorderIdx = (20 * w + 20) * 4;

    assert.equal(transOut[interiorIdx + 3], 255);
    assert.equal(opaqueOut[exactBorderIdx + 3], 255);
    assert.equal(transOut[exactBorderIdx + 3], 0);
    assert.ok(transOut[nearEdgeIdx + 3] < opaqueOut[nearEdgeIdx + 3]);
    assert.ok(transOut[nearEdgeIdx + 3] > 0 && transOut[nearEdgeIdx + 3] < 255);
  });

  it('renders valid RGB/alpha values (0..255) with refraction, dispersion, and bevel enabled', () => {
    const w = 48;
    const h = 48;
    const seeds = generateSeeds(w, h, 16, 60, 123);
    const pixels = createGradientPixels(w, h);
    const { nearestSeed, dist1Sq, dist2Sq, avgColors } = computeVoronoi(pixels, w, h, seeds, 'euclidean');

    const baseline = renderVoronoi(
      w,
      h,
      nearestSeed,
      dist1Sq,
      dist2Sq,
      avgColors,
      seeds,
      pixels,
      1.5,
      [17, 17, 19],
      0,
      0,
      0,
      null,
      'normal',
      0,
      false,
      false
    );

    const optics = renderVoronoi(
      w,
      h,
      nearestSeed,
      dist1Sq,
      dist2Sq,
      avgColors,
      seeds,
      pixels,
      1.5,
      [17, 17, 19],
      75,
      80,
      85,
      null,
      'normal',
      0,
      false,
      false
    );

    assert.ok(optics instanceof Uint8ClampedArray);
    assert.equal(optics.length, w * h * 4);

    let differingBytes = 0;
    for (let i = 0; i < optics.length; i++) {
      const value = optics[i];
      assert.ok(Number.isInteger(value) && value >= 0 && value <= 255);
      if (i % 4 === 3) {
        assert.equal(value, 255);
      }
      if (value !== baseline[i]) {
        differingBytes++;
      }
    }

    assert.ok(differingBytes > 0, 'optical effects should alter rendered pixel values');
  });

  it('supports all 5 blend modes across opacity 0, 50, and 100', () => {
    const w = 24;
    const h = 16;
    const seeds = generateSeeds(w, h, 12, 50, 19);
    const pixels = createGradientPixels(w, h);
    const blendPixels = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      blendPixels[i] = 255 - pixels[i];
      blendPixels[i + 1] = (pixels[i + 1] + 97) % 256;
      blendPixels[i + 2] = 200;
      blendPixels[i + 3] = 255;
    }

    const { nearestSeed, dist1Sq, dist2Sq, avgColors } = computeVoronoi(pixels, w, h, seeds, 'euclidean');
    const baseline = renderVoronoi(
      w,
      h,
      nearestSeed,
      dist1Sq,
      dist2Sq,
      avgColors,
      seeds,
      pixels,
      0,
      [17, 17, 19],
      0,
      0,
      0,
      null,
      'normal',
      0,
      false,
      false
    );

    const modes = ['normal', 'multiply', 'screen', 'overlay', 'soft-light'];
    for (const mode of modes) {
      for (const opacity of [0, 50, 100]) {
        const out = renderVoronoi(
          w,
          h,
          nearestSeed,
          dist1Sq,
          dist2Sq,
          avgColors,
          seeds,
          pixels,
          0,
          [17, 17, 19],
          0,
          0,
          0,
          blendPixels,
          mode,
          opacity,
          false,
          false
        );

        assert.ok(out instanceof Uint8ClampedArray);
        assert.equal(out.length, w * h * 4);

        let diffsFromBaseline = 0;
        for (let i = 0; i < out.length; i++) {
          const val = out[i];
          assert.ok(Number.isInteger(val) && val >= 0 && val <= 255);
          if (i % 4 === 3) {
            assert.equal(val, 255);
          }
          if (val !== baseline[i]) {
            diffsFromBaseline++;
          }
        }

        if (opacity === 0) {
          assert.deepEqual(out, baseline, `${mode} at opacity=0 should match unblended baseline`);
        } else {
          assert.ok(diffsFromBaseline > 0, `${mode} at opacity=${opacity} should alter rendered pixels`);
        }

        if (mode === 'normal' && opacity === 100) {
          assert.deepEqual(out, blendPixels, 'normal blend at opacity=100 should match blendPixels');
        }
      }
    }
  });

  it('keeps soft-light continuous across dark tones (base=63 vs base=64 with blend=255)', () => {
    const w = 8;
    const h = 8;
    const seeds = [
      { x: 2, y: 4 },
      { x: 6, y: 4 },
    ];
    const pixels63 = createSolidPixels(w, h, 63, 63, 63);
    const pixels64 = createSolidPixels(w, h, 64, 64, 64);
    const whiteBlend = createSolidPixels(w, h, 255, 255, 255);

    const v63 = computeVoronoi(pixels63, w, h, seeds, 'euclidean');
    const v64 = computeVoronoi(pixels64, w, h, seeds, 'euclidean');

    const out63 = renderVoronoi(
      w,
      h,
      v63.nearestSeed,
      v63.dist1Sq,
      v63.dist2Sq,
      v63.avgColors,
      seeds,
      pixels63,
      0,
      [0, 0, 0],
      0,
      0,
      0,
      whiteBlend,
      'soft-light',
      100,
      false,
      false
    );

    const out64 = renderVoronoi(
      w,
      h,
      v64.nearestSeed,
      v64.dist1Sq,
      v64.dist2Sq,
      v64.avgColors,
      seeds,
      pixels64,
      0,
      [0, 0, 0],
      0,
      0,
      0,
      whiteBlend,
      'soft-light',
      100,
      false,
      false
    );

    const r63 = out63[0];
    const r64 = out64[0];

    // W3C soft-light with blend=255 brightens base=63 (~127) and base=64 (~128) smoothly
    assert.ok(r63 > 100, `expected base=63 soft-light output not to be crushed near 0, got ${r63}`);
    assert.ok(r64 > 100, `expected base=64 soft-light output to be brightened, got ${r64}`);
    assert.ok(
      Math.abs(r64 - r63) <= 3,
      `expected soft-light continuity between base=63 (${r63}) and base=64 (${r64}) within <= 3 levels`
    );

    for (let i = 0; i < out63.length; i += 4) {
      assert.equal(out63[i], r63);
      assert.equal(out63[i + 1], r63);
      assert.equal(out63[i + 2], r63);
      assert.equal(out64[i], r64);
      assert.equal(out64[i + 1], r64);
      assert.equal(out64[i + 2], r64);
    }
  });
});

describe('generateVoronoiSVG', () => {
  it('produces valid <svg> containing <polygon> elements matching seed count', () => {
    const w = 100;
    const h = 100;
    const seeds = generateSeeds(w, h, 16, 50, 7);
    const pixels = createGradientPixels(w, h);
    const { avgColors } = computeVoronoi(pixels, w, h, seeds, 'euclidean');

    const svg = generateVoronoiSVG(w, h, seeds, avgColors);
    const polygons = extractPolygonTags(svg);

    assert.ok(
      svg.startsWith(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`)
    );
    assert.ok(svg.endsWith('</svg>'));
    assert.equal(polygons.length, seeds.length);

    for (const poly of polygons) {
      assert.match(poly, /points="[0-9.,\s]+"/);
      assert.match(poly, /fill="rgb\(\d+, \d+, \d+\)"/);
      assert.match(poly, /stroke="#111113"/);
      assert.match(poly, /stroke-width="1\.5"/);
    }
  });

  it('handles wireframe: true with fill="none"', () => {
    const w = 100;
    const h = 100;
    const seeds = generateSeeds(w, h, 16, 50, 7);
    const pixels = createGradientPixels(w, h);
    const { avgColors } = computeVoronoi(pixels, w, h, seeds, 'euclidean');

    const svg = generateVoronoiSVG(w, h, seeds, avgColors, {
      wireframe: true,
      borderColor: '#ff00aa',
      borderWidth: 2,
    });
    const polygons = extractPolygonTags(svg);

    assert.equal(polygons.length, seeds.length);
    assert.equal(svg.includes('fill="rgb('), false);
    for (const poly of polygons) {
      assert.match(poly, /fill="none"/);
      assert.match(poly, /stroke="#ff00aa"/);
      assert.match(poly, /stroke-width="2"/);
    }
  });

  it('handles transparentBorder: true by suppressing polygon strokes while preserving fills', () => {
    const w = 100;
    const h = 100;
    const seeds = generateSeeds(w, h, 16, 50, 7);
    const pixels = createGradientPixels(w, h);
    const { avgColors } = computeVoronoi(pixels, w, h, seeds, 'euclidean');

    const svg = generateVoronoiSVG(w, h, seeds, avgColors, {
      transparentBorder: true,
      borderColor: '#ff00aa',
      borderWidth: 2,
    });
    const polygons = extractPolygonTags(svg);

    assert.equal(polygons.length, seeds.length);
    for (const poly of polygons) {
      assert.match(poly, /fill="rgb\(\d+, \d+, \d+\)"/);
      assert.match(poly, /stroke="none"/);
      assert.match(poly, /stroke-width="0"/);
    }
  });

  it('insets polygons to create real cutout gaps when transparentBorder is true with borderWidth=4', () => {
    const w = 100;
    const h = 100;
    const seeds = generateSeeds(w, h, 16, 50, 7);
    const pixels = createGradientPixels(w, h);
    const { avgColors } = computeVoronoi(pixels, w, h, seeds, 'euclidean');

    const opaqueSvg = generateVoronoiSVG(w, h, seeds, avgColors, {
      transparentBorder: false,
      borderWidth: 4,
    });
    const cutoutSvg = generateVoronoiSVG(w, h, seeds, avgColors, {
      transparentBorder: true,
      borderWidth: 4,
    });

    const cutoutPolys = extractPolygonTags(cutoutSvg);
    assert.equal(cutoutPolys.length, seeds.length);

    for (const poly of cutoutPolys) {
      assert.match(poly, /fill="rgb\(\d+, \d+, \d+\)"/);
      assert.match(poly, /stroke="none"/);
      assert.match(poly, /stroke-width="0"/);
    }

    const opaqueArea = totalSvgPolygonArea(opaqueSvg);
    const cutoutArea = totalSvgPolygonArea(cutoutSvg);
    assert.ok(cutoutArea > 0, 'cutout polygons should preserve positive area');
    assert.ok(
      cutoutArea < w * h,
      `expected total cutout polygon area (${cutoutArea}) to be strictly less than canvas area (${w * h})`
    );
    assert.ok(
      cutoutArea < opaqueArea,
      `expected cutout area (${cutoutArea}) to be strictly smaller than non-inset area (${opaqueArea})`
    );
  });

  for (const metric of ['manhattan', 'chebyshev']) {
    it(`generates distinct valid SVG geometry for ${metric} metric with and without nearestSeed`, () => {
      const w = 80;
      const h = 80;
      const seeds = generateSeeds(w, h, 12, 55, 7);
      const pixels = createGradientPixels(w, h);

      const eucl = computeVoronoi(pixels, w, h, seeds, 'euclidean');
      const euclSvg = generateVoronoiSVG(w, h, seeds, eucl.avgColors, { metric: 'euclidean' });
      const euclPoints = extractPolygonPoints(euclSvg);

      const { nearestSeed, avgColors } = computeVoronoi(pixels, w, h, seeds, metric);
      const svgWithGrid = generateVoronoiSVG(w, h, seeds, avgColors, { metric, nearestSeed });
      const svgWithoutGrid = generateVoronoiSVG(w, h, seeds, avgColors, { metric });

      for (const svg of [svgWithGrid, svgWithoutGrid]) {
        assert.ok(
          svg.startsWith(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`)
        );
        assert.ok(svg.endsWith('</svg>'));
        assert.equal(extractPolygonTags(svg).length, seeds.length);
      }

      assert.equal(svgWithoutGrid, svgWithGrid);
      assert.notDeepEqual(extractPolygonPoints(svgWithGrid), euclPoints);

      const opaqueArea = totalSvgPolygonArea(svgWithGrid);
      const transparentSvg = generateVoronoiSVG(w, h, seeds, avgColors, {
        metric,
        nearestSeed,
        transparentBorder: true,
        borderWidth: 4,
      });
      const transparentPolys = extractPolygonTags(transparentSvg);
      assert.equal(transparentPolys.length, seeds.length);
      for (const poly of transparentPolys) {
        assert.match(poly, /fill="rgb\(\d+, \d+, \d+\)"/);
        assert.match(poly, /stroke="none"/);
        assert.match(poly, /stroke-width="0"/);
      }
      const transparentArea = totalSvgPolygonArea(transparentSvg);
      assert.ok(transparentArea > 0 && transparentArea < w * h);
      assert.ok(transparentArea < opaqueArea);

      const wireframeSvg = generateVoronoiSVG(w, h, seeds, avgColors, {
        metric,
        nearestSeed,
        wireframe: true,
        borderColor: '#336699',
        borderWidth: 2,
      });
      const wireframePolys = extractPolygonTags(wireframeSvg);
      assert.equal(wireframePolys.length, seeds.length);
      assert.equal(wireframeSvg.includes('fill="rgb('), false);
      for (const poly of wireframePolys) {
        assert.match(poly, /fill="none"/);
        assert.match(poly, /stroke="#336699"/);
        assert.match(poly, /stroke-width="2"/);
      }
    });
  }

  it('applies deterministic facet shading when bevel is enabled while keeping RGB values in 0..255', () => {
    const w = 100;
    const h = 100;
    const seeds = generateSeeds(w, h, 16, 50, 7);
    const pixels = createGradientPixels(w, h);
    const { avgColors } = computeVoronoi(pixels, w, h, seeds, 'euclidean');

    const flatSvg = generateVoronoiSVG(w, h, seeds, avgColors, { bevel: 0 });
    const bevelSvgA = generateVoronoiSVG(w, h, seeds, avgColors, { bevel: 80 });
    const bevelSvgB = generateVoronoiSVG(w, h, seeds, avgColors, { bevel: 80 });

    assert.equal(bevelSvgA, bevelSvgB);

    const flatFills = extractPolygonFills(flatSvg);
    const bevelFills = extractPolygonFills(bevelSvgA);
    assert.equal(bevelFills.length, seeds.length);
    assert.notDeepEqual(bevelFills, flatFills);

    for (const fill of bevelFills) {
      const match = fill.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
      assert.ok(match, `expected valid rgb() fill, got ${fill}`);
      for (let c = 1; c <= 3; c++) {
        const val = Number(match[c]);
        assert.ok(Number.isInteger(val) && val >= 0 && val <= 255);
      }
    }
  });

  it('sanitizes malicious borderColor strings to prevent SVG attribute injection', () => {
    const w = 60;
    const h = 60;
    const seeds = generateSeeds(w, h, 9, 45, 3);
    const pixels = createGradientPixels(w, h);
    const { avgColors } = computeVoronoi(pixels, w, h, seeds, 'euclidean');
    const malicious = '" onload="alert(1)';

    for (const wireframe of [false, true]) {
      const svg = generateVoronoiSVG(w, h, seeds, avgColors, {
        borderColor: malicious,
        borderWidth: 2,
        wireframe,
      });
      const polygons = extractPolygonTags(svg);

      assert.equal(polygons.length, seeds.length);
      assert.equal(svg.includes('onload='), false);
      assert.equal(svg.includes('alert(1)'), false);
      for (const poly of polygons) {
        assert.match(poly, /stroke="#111113"/);
      }
    }
  });

  it('returns an empty valid <svg> wrapper without throwing when seeds is empty', () => {
    const expected = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" width="100" height="80">\n</svg>';

    assert.equal(generateVoronoiSVG(100, 80, [], new Uint8ClampedArray(0)), expected);
    assert.equal(
      generateVoronoiSVG(100, 80, [], new Uint8ClampedArray(0), { metric: 'manhattan' }),
      expected
    );
    assert.equal(
      generateVoronoiSVG(100, 80, [], new Uint8ClampedArray(0), { metric: 'chebyshev' }),
      expected
    );
  });
});
