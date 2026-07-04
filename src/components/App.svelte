<script>
  import { onMount } from 'svelte';
  import { createAppState } from '../context.svelte.js';
  import Header from './Header.svelte';
  import Sidebar from './Sidebar.svelte';
  import CanvasArea from './CanvasArea.svelte';
  import { setOnResult, requestFullProcess, requestRenderOnly } from '../lib/engine.js';
  import { snapshotCanvas } from '../lib/canvas-utils.js';

  const state = createAppState();

  let canvasEl;
  let currentId = 0;
  let crossfadeAnim = null;
  let processTimer = null;

  const MAX_IMAGE = 1200;
  const CROSSFADE_MS = 320;

  onMount(() => {
    setOnResult(handleResult);
  });

  function handleResult(result) {
    if (result.id !== currentId) return;

    state.processing = false;

    if (result.full) {
      state.cachedNearest = new Int32Array(result.nearestSeed);
      state.cachedDist1Sq = new Float32Array(result.dist1Sq);
      state.cachedDist2Sq = new Float32Array(result.dist2Sq);
      state.cachedAvgColors = new Uint8ClampedArray(result.avgColors);
      state.cachedWidth = result.width;
      state.cachedHeight = result.height;
      state.seeds = result.seeds || [];
    }

    const output = new Uint8ClampedArray(result.output);
    const imageData = new ImageData(output, result.width, result.height);
    applyToCanvas(imageData);
  }

  function applyToCanvas(imageData) {
    if (!canvasEl) return;
    if (crossfadeAnim) { cancelAnimationFrame(crossfadeAnim); crossfadeAnim = null; }

    const w = imageData.width;
    const h = imageData.height;
    const oldFrame = snapshotCanvas(canvasEl);

    if (!oldFrame.width || !oldFrame.height) {
      canvasEl.getContext('2d').putImageData(imageData, 0, 0);
      return;
    }

    const newFrame = document.createElement('canvas');
    newFrame.width = w;
    newFrame.height = h;
    newFrame.getContext('2d').putImageData(imageData, 0, 0);

    const ctx = canvasEl.getContext('2d');
    const start = performance.now();

    function anim(now) {
      const t = Math.min((now - start) / CROSSFADE_MS, 1);
      const e = 1 - Math.pow(1 - t, 3);

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(newFrame, 0, 0);
      ctx.globalAlpha = 1 - e;
      ctx.drawImage(oldFrame, 0, 0);
      ctx.globalAlpha = 1;

      if (t < 1) {
        crossfadeAnim = requestAnimationFrame(anim);
      } else {
        crossfadeAnim = null;
      }
    }
    crossfadeAnim = requestAnimationFrame(anim);
  }

  function loadImage(img) {
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;

    if (w > MAX_IMAGE || h > MAX_IMAGE) {
      if (w > h) { h = Math.round(h * MAX_IMAGE / w); w = MAX_IMAGE; }
      else { w = Math.round(w * MAX_IMAGE / h); h = MAX_IMAGE; }
    }
    w = Math.round(w);
    h = Math.round(h);

    const oc = document.createElement('canvas');
    oc.width = w;
    oc.height = h;
    const octx = oc.getContext('2d');
    octx.drawImage(img, 0, 0, w, h);

    state.srcData = octx.getImageData(0, 0, w, h);
    state.srcWidth = w;
    state.srcHeight = h;
    state.hasImage = true;

    state.seeds = [];
    state.cachedNearest = null;
    state.cachedDist1Sq = null;
    state.cachedDist2Sq = null;
    state.cachedAvgColors = null;

    if (canvasEl) {
      canvasEl.width = w;
      canvasEl.height = h;
    }

    startFull();
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => loadImage(img);
      img.onerror = () => { state.processing = false; };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function startFull() {
    if (!state.srcData) return;
    state.processing = true;
    currentId = ++currentId;
    requestFullProcess(state.srcData, state.params);
  }

  function startRender() {
    if (!state.cachedNearest) { startFull(); return; }
    state.processing = true;
    currentId = ++currentId;
    requestRenderOnly({
      nearestSeed: state.cachedNearest, dist1Sq: state.cachedDist1Sq,
      dist2Sq: state.cachedDist2Sq, avgColors: state.cachedAvgColors,
      width: state.cachedWidth, height: state.cachedHeight,
    }, state.params);
  }

  function handleGeoChange() {
    clearTimeout(processTimer);
    processTimer = setTimeout(startFull, 120);
  }

  function handleBorderChange() {
    clearTimeout(processTimer);
    processTimer = setTimeout(startRender, 80);
  }

  function handleRegenerate() {
    clearTimeout(processTimer);
    if (state.srcData) startFull();
  }

  function handleDownload() {
    if (!canvasEl) return;
    canvasEl.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'voronoi-shatter.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
</script>

<div class="flex flex-col h-screen bg-[#0a0a12] text-white select-none">
  <Header hasImage={state.hasImage} onChangeImage={() => document.getElementById('fileInput')?.click()} />
  <main class="flex flex-1 overflow-hidden">
    <Sidebar
      onGeoChange={handleGeoChange}
      onBorderChange={handleBorderChange}
      onRegenerate={handleRegenerate}
      onDownload={handleDownload}
      onFile={handleFile}
    />
    <CanvasArea
      bind:canvasEl
      hasImage={state.hasImage}
      processing={state.processing}
      srcWidth={state.srcWidth}
      srcHeight={state.srcHeight}
      onFile={handleFile}
    />
  </main>
</div>
