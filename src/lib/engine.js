let worker = null;
let processId = 0;
let onResult = null;

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      if (onResult) onResult(e.data);
    };
  }
  return worker;
}

export function setOnResult(callback) {
  onResult = callback;
}

function cloneParams(params) {
  return {
    ...params,
    impact: params.impact ? { x: params.impact.x, y: params.impact.y } : null,
  };
}

export function requestFullProcess(srcData, params, blendData) {
  const id = ++processId;
  const w = getWorker();

  const pixels = new Uint8ClampedArray(srcData.data);
  const blendPixels = blendData ? new Uint8ClampedArray(blendData.data) : null;

  const transferables = [pixels.buffer];
  if (blendPixels) transferables.push(blendPixels.buffer);

  w.postMessage({
    type: 'full', id,
    data: {
      pixels: pixels.buffer,
      width: srcData.width,
      height: srcData.height,
      params: cloneParams(params),
      blendPixels: blendPixels ? blendPixels.buffer : null,
    },
  }, transferables);

  return id;
}

export function requestRenderOnly(cached, params, blendData) {
  const id = ++processId;
  const w = getWorker();

  const copyNS = new Int32Array(cached.nearestSeed);
  const copyD1 = new Float32Array(cached.dist1Sq);
  const copyD2 = new Float32Array(cached.dist2Sq);
  const copyAC = new Uint8ClampedArray(cached.avgColors);
  const blendPixels = blendData ? new Uint8ClampedArray(blendData.data) : null;

  const transferables = [copyNS.buffer, copyD1.buffer, copyD2.buffer, copyAC.buffer];
  if (blendPixels) transferables.push(blendPixels.buffer);

  w.postMessage({
    type: 'render', id,
    data: {
      nearestSeed: copyNS.buffer,
      dist1Sq: copyD1.buffer,
      dist2Sq: copyD2.buffer,
      avgColors: copyAC.buffer,
      width: cached.width,
      height: cached.height,
      params: cloneParams(params),
      blendPixels: blendPixels ? blendPixels.buffer : null,
    },
  }, transferables);

  return id;
}
