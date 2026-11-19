import { generateSeeds, computeVoronoi, renderVoronoi } from './voronoi.js';

let cachedSrcPixels = null;
let cachedSeeds = [];

function parseColor(hex) {
  if (typeof hex !== 'string') return [17, 17, 19];
  const trimmed = hex.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return [
      parseInt(trimmed.slice(1, 3), 16),
      parseInt(trimmed.slice(3, 5), 16),
      parseInt(trimmed.slice(5, 7), 16),
    ];
  }
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return [
      parseInt(trimmed[1], 16) * 17,
      parseInt(trimmed[2], 16) * 17,
      parseInt(trimmed[3], 16) * 17,
    ];
  }
  return [17, 17, 19];
}

self.onmessage = function (e) {
  const id = e?.data?.id;

  try {
    const { type, data } = e.data;

    if (type === 'full') {
      const { pixels, width, height, params, blendPixels } = data;
      const pixelArray = new Uint8ClampedArray(pixels);
      const blendArray = blendPixels ? new Uint8ClampedArray(blendPixels) : null;

      cachedSrcPixels = pixelArray;
      const seeds = generateSeeds(width, height, params.cellCount, params.jitter, params.seed, params.impact);
      cachedSeeds = seeds;

      const voronoi = computeVoronoi(pixelArray, width, height, seeds, params.metric);
      const bc = parseColor(params.borderColor);
      const output = renderVoronoi(
        width,
        height,
        voronoi.nearestSeed,
        voronoi.dist1Sq,
        voronoi.dist2Sq,
        voronoi.avgColors,
        seeds,
        cachedSrcPixels,
        params.borderWidth,
        bc,
        params.refraction,
        params.bevel,
        params.dispersion,
        blendArray,
        params.blendMode,
        params.blendOpacity,
        params.transparentBorder,
        params.wireframe
      );

      const transferables = [
        output.buffer,
        voronoi.nearestSeed.buffer,
        voronoi.dist1Sq.buffer,
        voronoi.dist2Sq.buffer,
        voronoi.avgColors.buffer,
      ];

      self.postMessage(
        {
          type: 'result',
          id,
          full: true,
          width,
          height,
          seeds,
          output: output.buffer,
          nearestSeed: voronoi.nearestSeed.buffer,
          dist1Sq: voronoi.dist1Sq.buffer,
          dist2Sq: voronoi.dist2Sq.buffer,
          avgColors: voronoi.avgColors.buffer,
        },
        transferables
      );
    }

    if (type === 'render') {
      const { nearestSeed: ns, dist1Sq: d1, dist2Sq: d2, avgColors: ac, width, height, params, blendPixels } = data;
      const blendArray = blendPixels ? new Uint8ClampedArray(blendPixels) : null;

      const bc = parseColor(params.borderColor);
      const output = renderVoronoi(
        width,
        height,
        new Int32Array(ns),
        new Float32Array(d1),
        new Float32Array(d2),
        new Uint8ClampedArray(ac),
        cachedSeeds,
        cachedSrcPixels,
        params.borderWidth,
        bc,
        params.refraction,
        params.bevel,
        params.dispersion,
        blendArray,
        params.blendMode,
        params.blendOpacity,
        params.transparentBorder,
        params.wireframe
      );

      self.postMessage(
        {
          type: 'result',
          id,
          full: false,
          width,
          height,
          output: output.buffer,
        },
        [output.buffer]
      );
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      id,
      message: err?.message || 'Worker processing failed',
    });
  }
};
