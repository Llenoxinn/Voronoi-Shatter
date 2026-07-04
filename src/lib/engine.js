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

export function requestFullProcess(srcData, params) {
  const id = ++processId;
  const w = getWorker();

  const pixels = new Uint8ClampedArray(srcData.data);

  w.postMessage({
    type: 'full', id,
    data: {
      pixels: pixels.buffer,
      width: srcData.width,
      height: srcData.height,
      params: { ...params },
    },
  }, [pixels.buffer]);

  return id;
}

export function requestRenderOnly(cached, params) {
  const id = ++processId;
  const w = getWorker();

  const copyNS = new Int32Array(cached.nearestSeed);
  const copyD1 = new Float32Array(cached.dist1Sq);
  const copyD2 = new Float32Array(cached.dist2Sq);
  const copyAC = new Uint8ClampedArray(cached.avgColors);

  w.postMessage({
    type: 'render', id,
    data: {
      nearestSeed: copyNS.buffer,
      dist1Sq: copyD1.buffer,
      dist2Sq: copyD2.buffer,
      avgColors: copyAC.buffer,
      width: cached.width,
      height: cached.height,
      params: { ...params },
    },
  }, [copyNS.buffer, copyD1.buffer, copyD2.buffer, copyAC.buffer]);

  return id;
}
