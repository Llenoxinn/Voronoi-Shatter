<script>
  import { onMount } from 'svelte';
  import { createAppState } from '../context.svelte.js';
  import Header from './Header.svelte';
  import Sidebar from './Sidebar.svelte';
  import CanvasArea from './CanvasArea.svelte';
  import { setOnResult, requestFullProcess, requestRenderOnly } from '../lib/engine.js';
  import { snapshotCanvas } from '../lib/canvas-utils.js';

  const appState = createAppState();

  let canvasEl = $state();
  let currentId = 0;
  let crossfadeAnim = null;
  let processTimer = null;
  let comparing = $state(false);

  const MAX_IMAGE = 1200;
  const CROSSFADE_MS = 320;

  onMount(() => {
    setOnResult(handleResult);
  });

  function handleResult(result) {
    if (result.id !== currentId) return;
    appState.processing = false;

    if (result.full) {
      appState.cachedNearest = new Int32Array(result.nearestSeed);
      appState.cachedDist1Sq = new Float32Array(result.dist1Sq);
      appState.cachedDist2Sq = new Float32Array(result.dist2Sq);
      appState.cachedAvgColors = new Uint8ClampedArray(result.avgColors);
      appState.cachedWidth = result.width;
      appState.cachedHeight = result.height;
      appState.seeds = result.seeds || [];
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
      if (t < 1) { crossfadeAnim = requestAnimationFrame(anim); }
      else { crossfadeAnim = null; }
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
    w = Math.round(w); h = Math.round(h);

    const oc = document.createElement('canvas');
    oc.width = w; oc.height = h;
    const octx = oc.getContext('2d');
    octx.drawImage(img, 0, 0, w, h);

    appState.srcData = octx.getImageData(0, 0, w, h);
    appState.srcWidth = w; appState.srcHeight = h;
    appState.hasImage = true;

    appState.seeds = [];
    appState.cachedNearest = null; appState.cachedDist1Sq = null;
    appState.cachedDist2Sq = null; appState.cachedAvgColors = null;
    appState.blendData = null; appState.hasBlend = false;

    if (canvasEl) { canvasEl.width = w; canvasEl.height = h; }
    startFull();
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => loadImage(img);
      img.onerror = () => { appState.processing = false; };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handleBlendFile(file) {
    if (!file || !file.type.startsWith('image/') || !appState.srcData) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const oc = document.createElement('canvas');
        oc.width = appState.srcWidth; oc.height = appState.srcHeight;
        const octx = oc.getContext('2d');
        octx.drawImage(img, 0, 0, appState.srcWidth, appState.srcHeight);
        appState.blendData = octx.getImageData(0, 0, appState.srcWidth, appState.srcHeight);
        appState.hasBlend = true;
        startRender();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handleBlendRemove() {
    appState.blendData = null; appState.hasBlend = false;
    appState.params.blendMode = 'normal'; appState.params.blendOpacity = 50;
    startRender();
  }

  function startFull() {
    if (!appState.srcData) return;
    appState.processing = true;
    currentId++;
    requestFullProcess(appState.srcData, appState.params, appState.blendData);
  }

  function startRender() {
    if (!appState.cachedNearest) { startFull(); return; }
    appState.processing = true;
    currentId++;
    requestRenderOnly({
      nearestSeed: appState.cachedNearest, dist1Sq: appState.cachedDist1Sq,
      dist2Sq: appState.cachedDist2Sq, avgColors: appState.cachedAvgColors,
      width: appState.cachedWidth, height: appState.cachedHeight,
    }, appState.params, appState.blendData);
  }

  function handleGeoChange() { clearTimeout(processTimer); processTimer = setTimeout(startFull, 120); }
  function handleBorderChange() { clearTimeout(processTimer); processTimer = setTimeout(startRender, 80); }
  function handleBlendChange() { clearTimeout(processTimer); processTimer = setTimeout(startRender, 80); }
  function handleRegenerate() { clearTimeout(processTimer); if (appState.srcData) startFull(); }

  function handleDownload() {
    if (!canvasEl) return;
    const format = appState.params.exportFormat || 'png';
    const mimeType = `image/${format}`;
    const quality = format === 'png' ? undefined : (appState.params.exportQuality || 92) / 100;

    canvasEl.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voronoi-shatter.${format}`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, mimeType, quality);
  }

  function handleSample() {
    const w = 960;
    const h = 640;
    const oc = document.createElement('canvas');
    oc.width = w;
    oc.height = h;
    const ctx = oc.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(0.5, '#312e81');
    bg.addColorStop(1, '#be185d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const orb = ctx.createRadialGradient(w * 0.34, h * 0.38, 20, w * 0.34, h * 0.38, 220);
    orb.addColorStop(0, '#fde047');
    orb.addColorStop(0.5, '#f97316');
    orb.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(w * 0.34, h * 0.38, 220, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(45, 212, 191, 0.78)';
    ctx.beginPath();
    ctx.moveTo(w * 0.56, h * 0.18);
    ctx.lineTo(w * 0.86, h * 0.72);
    ctx.lineTo(w * 0.44, h * 0.82);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(w * 0.14, h * 0.58, 280, 140);

    loadImage(oc);
  }

  function handleKeydown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === ' ' && !e.repeat) { e.preventDefault(); handleRegenerate(); }
    if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && appState.hasImage) { comparing = true; }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleDownload(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      appState.params.cellCount = 80;
      appState.params.jitter = 75;
      appState.params.refraction = 45;
      appState.params.bevel = 40;
      appState.params.borderWidth = 1.5;
      appState.params.borderColor = '#0b0c0f';
      handleGeoChange();
    }
  }

  function handleKeyup(e) {
    if (e.key === 'c' || e.key === 'C') comparing = false;
  }
</script>

<svelte:window onkeydown={handleKeydown} onkeyup={handleKeyup} />

<div class="flex flex-col h-screen bg-studio-bg text-studio-ink select-none">
  <Header hasImage={appState.hasImage} processing={appState.processing} />
  <main class="flex flex-col md:flex-row flex-1 overflow-hidden">
    <Sidebar
      onGeoChange={handleGeoChange}
      onBorderChange={handleBorderChange}
      onRegenerate={handleRegenerate}
      onDownload={handleDownload}
      onFile={handleFile}
      onBlendFile={handleBlendFile}
      onBlendRemove={handleBlendRemove}
      onBlendChange={handleBlendChange}
    />
    <CanvasArea
      bind:canvasEl
      bind:comparing
      hasImage={appState.hasImage}
      processing={appState.processing}
      srcData={appState.srcData}
      onFile={handleFile}
      onSample={handleSample}
    />
  </main>
</div>
