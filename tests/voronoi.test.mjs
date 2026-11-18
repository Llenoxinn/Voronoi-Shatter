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
});
