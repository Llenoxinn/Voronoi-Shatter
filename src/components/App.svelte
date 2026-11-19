<script>
  import { onMount, onDestroy } from 'svelte';
  import { createAppState } from '../context.svelte.js';
  import LandingPage from './LandingPage.svelte';
  import Header from './Header.svelte';
  import ToolRail from './ToolRail.svelte';
  import Sidebar from './Sidebar.svelte';
  import CanvasArea from './CanvasArea.svelte';
  import { setOnResult, setOnError, requestFullProcess, requestRenderOnly } from '../lib/engine.js';
  import { snapshotCanvas } from '../lib/canvas-utils.js';
  import { generateVoronoiSVG } from '../lib/svg-export.js';
  import { isEmbedMode, initPluginBridge, postToHost } from '../lib/plugin-api.js';
  import { createHistory } from '../lib/history.js';

  const appState = createAppState();
  const embed = isEmbedMode();

  const PRESETS = [
    { name: 'Prism', desc: 'Refracted shards', cellCount: 80, jitter: 75, refraction: 65, bevel: 55, dispersion: 24, borderWidth: 1.5, borderColor: '#111113', metric: 'euclidean', transparentBorder: false, wireframe: false },
    { name: 'Glass', desc: 'Stained bevels', cellCount: 120, jitter: 45, refraction: 35, bevel: 70, dispersion: 15, borderWidth: 3, borderColor: '#18181b', metric: 'euclidean', transparentBorder: false, wireframe: false },
    { name: 'Mosaic', desc: 'Flat tiles', cellCount: 90, jitter: 60, refraction: 0, bevel: 15, dispersion: 0, borderWidth: 1.5, borderColor: '#111113', metric: 'euclidean', transparentBorder: false, wireframe: false },
    { name: 'Low Poly', desc: 'Clean facets', cellCount: 220, jitter: 90, refraction: 0, bevel: 35, dispersion: 0, borderWidth: 0, borderColor: '#111113', metric: 'euclidean', transparentBorder: false, wireframe: false },
    { name: 'Cracked', desc: 'Fractured lens', cellCount: 55, jitter: 80, refraction: 85, bevel: 60, dispersion: 35, borderWidth: 2.5, borderColor: '#111113', metric: 'euclidean', transparentBorder: false, wireframe: false },
    { name: 'Fine', desc: 'Micro crystal', cellCount: 400, jitter: 55, refraction: 40, bevel: 30, dispersion: 12, borderWidth: 0.5, borderColor: '#111113', metric: 'euclidean', transparentBorder: false, wireframe: false },
  ];

  const history = createHistory(appState.params);

  let view = $state(embed ? 'studio' : 'landing');
  let canvasEl = $state();
  let currentId = 0;
  let crossfadeAnim = null;
  let sampleRaf = null;
  let processTimer = null;
  let noticeTimer = null;
  let pendingGeo = false;
  let fullInFlight = false;
  let lastRenderedImageData = null;
  let drawnCanvasEl = null;
  let comparing = $state(false);
  let canUndo = $state(false);
  let canRedo = $state(false);
  let notice = $state(null);
  let cleanupBridge = null;

  const MAX_IMAGE = 1200;
  const CROSSFADE_MS = 220;

  const VALID_METRICS = new Set(['euclidean', 'manhattan', 'chebyshev']);
  const VALID_BLEND_MODES = new Set(['normal', 'multiply', 'screen', 'overlay', 'soft-light']);
  const VALID_EXPORT_FORMATS = new Set(['png', 'jpeg', 'webp', 'svg']);
  const VALID_EMBED_EXPORT_FORMATS = new Set(['png', 'svg']);
  const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

  function clampFinite(value, min, max, integer = false) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    const clamped = Math.max(min, Math.min(max, value));
    return integer ? Math.round(clamped) : clamped;
  }

  function applyHostParams(nextParams) {
    if (!nextParams || typeof nextParams !== 'object' || Array.isArray(nextParams)) return false;
    let changed = false;

    const cellCount = clampFinite(nextParams.cellCount, 5, 500, true);
    if (cellCount !== null) {
      appState.params.cellCount = cellCount;
      changed = true;
    }

    for (const key of ['jitter', 'refraction', 'bevel', 'dispersion', 'blendOpacity']) {
      const value = clampFinite(nextParams[key], 0, 100);
      if (value !== null) {
        appState.params[key] = value;
        changed = true;
      }
    }

    const borderWidth = clampFinite(nextParams.borderWidth, 0, 10);
    if (borderWidth !== null) {
      appState.params.borderWidth = borderWidth;
      changed = true;
    }

    if (typeof nextParams.borderColor === 'string' && HEX_COLOR_RE.test(nextParams.borderColor)) {
      appState.params.borderColor = nextParams.borderColor;
      changed = true;
    }

    if (typeof nextParams.metric === 'string' && VALID_METRICS.has(nextParams.metric)) {
      appState.params.metric = nextParams.metric;
      changed = true;
    }

    if (typeof nextParams.transparentBorder === 'boolean') {
      appState.params.transparentBorder = nextParams.transparentBorder;
      changed = true;
    }

    if (typeof nextParams.wireframe === 'boolean') {
      appState.params.wireframe = nextParams.wireframe;
      changed = true;
    }

    const seed = clampFinite(nextParams.seed, 1, 1e9, true);
    if (seed !== null) {
      appState.params.seed = seed;
      changed = true;
    }

    if ('impact' in nextParams) {
      if (nextParams.impact === null) {
        appState.params.impact = null;
        changed = true;
      } else if (nextParams.impact && typeof nextParams.impact === 'object') {
        const ix = clampFinite(nextParams.impact.x, 0, 1);
        const iy = clampFinite(nextParams.impact.y, 0, 1);
        if (ix !== null && iy !== null) {
          appState.params.impact = { x: ix, y: iy };
          changed = true;
        }
      }
    }

    if (typeof nextParams.blendMode === 'string' && VALID_BLEND_MODES.has(nextParams.blendMode)) {
      appState.params.blendMode = nextParams.blendMode;
      changed = true;
    }

    const allowedFormats = embed ? VALID_EMBED_EXPORT_FORMATS : VALID_EXPORT_FORMATS;
    if (typeof nextParams.exportFormat === 'string' && allowedFormats.has(nextParams.exportFormat)) {
      appState.params.exportFormat = nextParams.exportFormat;
      changed = true;
    }

    const exportQuality = clampFinite(nextParams.exportQuality, 10, 100);
    if (exportQuality !== null) {
      appState.params.exportQuality = exportQuality;
      changed = true;
    }

    return changed;
  }

  const activePreset = $derived(
    PRESETS.find(
      (p) =>
        p.cellCount === appState.params.cellCount &&
        p.jitter === appState.params.jitter &&
        p.refraction === appState.params.refraction &&
        p.bevel === appState.params.bevel &&
        p.dispersion === appState.params.dispersion &&
        p.borderWidth === appState.params.borderWidth &&
        p.borderColor.toLowerCase() === appState.params.borderColor.toLowerCase() &&
        p.metric === appState.params.metric &&
        p.transparentBorder === appState.params.transparentBorder &&
        p.wireframe === appState.params.wireframe
    )?.name ?? null
  );

  // Redraw the last rendered frame when returning to Studio onto a newly mounted canvas.
  $effect(() => {
    if (
      view === 'studio' &&
      canvasEl &&
      appState.hasImage &&
      lastRenderedImageData &&
      drawnCanvasEl !== canvasEl
    ) {
      if (
        canvasEl.width !== lastRenderedImageData.width ||
        canvasEl.height !== lastRenderedImageData.height
      ) {
        canvasEl.width = lastRenderedImageData.width;
        canvasEl.height = lastRenderedImageData.height;
      }
      canvasEl.getContext('2d').putImageData(lastRenderedImageData, 0, 0);
      drawnCanvasEl = canvasEl;
    }
  });

  function cancelSampleRaf() {
    if (sampleRaf) {
      cancelAnimationFrame(sampleRaf);
      sampleRaf = null;
    }
  }

  function invalidateCaches() {
    appState.cachedNearest = null;
    appState.cachedDist1Sq = null;
    appState.cachedDist2Sq = null;
    appState.cachedAvgColors = null;
  }

  function showNotice(message, tone = 'info', duration = 3600) {
    clearTimeout(noticeTimer);
    notice = { message, tone };
    noticeTimer = setTimeout(() => {
      notice = null;
      noticeTimer = null;
    }, duration);
  }

  function syncHistoryFlags() {
    canUndo = history.canUndo();
    canRedo = history.canRedo();
  }

  function recordHistory() {
    history.push(appState.params);
    syncHistoryFlags();
  }

  function needsFullRecompute(prev, next) {
    if (
      prev.cellCount !== next.cellCount ||
      prev.jitter !== next.jitter ||
      prev.metric !== next.metric ||
      prev.seed !== next.seed
    ) {
      return true;
    }
    const pImp = prev.impact ?? null;
    const nImp = next.impact ?? null;
    if (pImp === null && nImp === null) return false;
    if (pImp === null || nImp === null) return true;
    return pImp.x !== nImp.x || pImp.y !== nImp.y;
  }

  function applyHistorySnapshot(snap) {
    const geoChanged = needsFullRecompute(appState.params, snap);
    appState.params.cellCount = snap.cellCount;
    appState.params.jitter = snap.jitter;
    appState.params.refraction = snap.refraction;
    appState.params.bevel = snap.bevel;
    appState.params.dispersion = snap.dispersion;
    appState.params.borderWidth = snap.borderWidth;
    appState.params.borderColor = snap.borderColor;
    appState.params.metric = snap.metric;
    appState.params.transparentBorder = snap.transparentBorder;
    appState.params.wireframe = snap.wireframe;
    appState.params.seed = snap.seed;
    appState.params.impact = snap.impact ? { x: snap.impact.x, y: snap.impact.y } : null;
    appState.params.blendMode = snap.blendMode;
    appState.params.blendOpacity = snap.blendOpacity;

    if (!appState.srcData) return;
    if (geoChanged || fullInFlight || !appState.cachedNearest) {
      startFull();
    } else {
      startRender();
    }
  }

  function handleUndo() {
    if (!appState.hasImage) return;
    if (processTimer) {
      clearTimeout(processTimer);
      processTimer = null;
      pendingGeo = false;
      history.push(appState.params);
    }
    const prev = history.undo();
    syncHistoryFlags();
    if (prev) applyHistorySnapshot(prev);
  }

  function handleRedo() {
    if (!appState.hasImage || !history.canRedo()) return;
    if (processTimer) {
      clearTimeout(processTimer);
      processTimer = null;
      pendingGeo = false;
    }
    const next = history.redo();
    syncHistoryFlags();
    if (next) applyHistorySnapshot(next);
  }

  function handleGoHome() {
    cancelSampleRaf();
    clearTimeout(processTimer);
    processTimer = null;
    pendingGeo = false;
    if (crossfadeAnim) {
      cancelAnimationFrame(crossfadeAnim);
      crossfadeAnim = null;
    }
    comparing = false;
    view = 'landing';
  }

  async function exportToHost(format = 'svg') {
    if (!appState.hasImage) {
      postToHost('voronoi:export-error', { message: 'Load or pull an image first.' });
      return;
    }

    if (format === 'svg') {
      if (fullInFlight || !appState.cachedAvgColors) {
        postToHost('voronoi:export-error', { message: 'Wait for rendering to finish before exporting SVG.' });
        showNotice('Wait for rendering to finish before exporting SVG.', 'error');
        return;
      }
      const svg = generateVoronoiSVG(
        appState.cachedWidth,
        appState.cachedHeight,
        appState.seeds,
        appState.cachedAvgColors,
        { ...appState.params, nearestSeed: appState.cachedNearest }
      );
      postToHost('voronoi:export-result', { format: 'svg', svg });
      return;
    }

    if (!canvasEl) {
      postToHost('voronoi:export-error', { message: 'Canvas is not ready yet.' });
      return;
    }

    const blob = await new Promise((r) => canvasEl.toBlob(r, 'image/png'));
    if (!blob) {
      postToHost('voronoi:export-error', { message: 'PNG export failed.' });
      showNotice('Export failed.', 'error');
      return;
    }

    const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
    postToHost('voronoi:export-result', {
      format: 'png',
      bytes,
      width: appState.srcWidth,
      height: appState.srcHeight,
    });
  }

  function handleSendToHost() {
    const fmt = appState.params.exportFormat === 'svg' ? 'svg' : 'png';
    exportToHost(fmt);
  }

  onMount(() => {
    setOnResult(handleResult);
    setOnError((err) => {
      fullInFlight = false;
      invalidateCaches();
      appState.processing = false;
      showNotice(err?.message || 'Processing failed. Try adjusting parameters.', 'error');
    });
    if (embed) {
      cleanupBridge = initPluginBridge({
        onLoadImageDataUrl: (dataUrl) => {
          if (typeof dataUrl !== 'string' || !/^data:image\//i.test(dataUrl)) return;
          view = 'studio';
          const img = new Image();
          img.onload = () => loadImage(img);
          img.onerror = () => {
            appState.processing = false;
            showNotice('Could not load image from host.', 'error');
          };
          img.src = dataUrl;
        },
        onSetParams: (nextParams) => {
          if (applyHostParams(nextParams)) {
            handleGeoChange();
          }
        },
        onRequestExport: exportToHost,
      });
    }
  });

  onDestroy(() => {
    cleanupBridge?.();
    clearTimeout(processTimer);
    clearTimeout(noticeTimer);
    if (crossfadeAnim) cancelAnimationFrame(crossfadeAnim);
    cancelSampleRaf();
  });

  function assignPresetParams(preset) {
    appState.params.cellCount = preset.cellCount;
    appState.params.jitter = preset.jitter;
    appState.params.refraction = preset.refraction;
    appState.params.bevel = preset.bevel;
    appState.params.dispersion = preset.dispersion;
    appState.params.borderWidth = preset.borderWidth;
    appState.params.borderColor = preset.borderColor;
    appState.params.metric = preset.metric;
    appState.params.transparentBorder = preset.transparentBorder;
    appState.params.wireframe = preset.wireframe;
  }

  function applyPreset(preset) {
    clearTimeout(processTimer);
    processTimer = null;
    pendingGeo = false;
    assignPresetParams(preset);
    if (appState.srcData) {
      recordHistory();
      startFull();
    }
  }

  function handleResult(result) {
    if (result.id !== currentId) return;
    appState.processing = false;

    if (result.full) {
      fullInFlight = false;
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
    lastRenderedImageData = imageData;
    applyToCanvas(imageData);
  }

  function prefersReducedMotion() {
    return (
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    );
  }

  function applyToCanvas(imageData) {
    if (!canvasEl) return;
    if (crossfadeAnim) {
      cancelAnimationFrame(crossfadeAnim);
      crossfadeAnim = null;
    }

    drawnCanvasEl = canvasEl;
    const w = imageData.width;
    const h = imageData.height;

    if (canvasEl.width !== w || canvasEl.height !== h) {
      canvasEl.width = w;
      canvasEl.height = h;
      canvasEl.getContext('2d').putImageData(imageData, 0, 0);
      return;
    }

    if (prefersReducedMotion()) {
      canvasEl.getContext('2d').putImageData(imageData, 0, 0);
      return;
    }

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

  function loadImage(img, { fromPaste = false } = {}) {
    cancelSampleRaf();
    clearTimeout(processTimer);
    processTimer = null;
    pendingGeo = false;

    const origW = Math.round(img.naturalWidth || img.width);
    const origH = Math.round(img.naturalHeight || img.height);
    if (!origW || !origH) {
      appState.processing = false;
      showNotice('Unsupported or corrupted image file.', 'error');
      return;
    }

    let w = origW;
    let h = origH;
    let resized = false;
    if (w > MAX_IMAGE || h > MAX_IMAGE) {
      if (w > h) {
        h = Math.round((h * MAX_IMAGE) / w);
        w = MAX_IMAGE;
      } else {
        w = Math.round((w * MAX_IMAGE) / h);
        h = MAX_IMAGE;
      }
      resized = true;
    }
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));

    if (resized) {
      showNotice(`Resized ${origW}×${origH} → ${w}×${h} for live rendering`);
    } else if (fromPaste) {
      showNotice('Pasted image from clipboard');
    }

    const oc = document.createElement('canvas');
    oc.width = w;
    oc.height = h;
    const octx = oc.getContext('2d');
    octx.drawImage(img, 0, 0, w, h);

    appState.srcData = octx.getImageData(0, 0, w, h);
    appState.srcWidth = w;
    appState.srcHeight = h;
    appState.hasImage = true;

    appState.seeds = [];
    invalidateCaches();
    appState.blendData = null;
    appState.hasBlend = false;
    lastRenderedImageData = null;
    drawnCanvasEl = null;

    history.reset(appState.params);
    syncHistoryFlags();

    if (canvasEl) {
      canvasEl.width = w;
      canvasEl.height = h;
    }
    startFull();
  }

  function handleFile(file, options = {}) {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      showNotice('Please select a valid image file.', 'error');
      return;
    }
    cancelSampleRaf();
    view = 'studio';
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => loadImage(img, options);
      img.onerror = () => {
        appState.processing = false;
        showNotice('Unsupported or corrupted image file.', 'error');
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      appState.processing = false;
      showNotice('Could not read image file.', 'error');
    };
    reader.readAsDataURL(file);
  }

  function handleBlendFile(file) {
    if (!file || !appState.srcData) return;
    if (!file.type || !file.type.startsWith('image/')) {
      showNotice('Please select a valid blend image.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const dw = appState.srcWidth;
        const dh = appState.srcHeight;
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        if (!iw || !ih) {
          showNotice('Could not load blend image.', 'error');
          return;
        }
        const scale = Math.max(dw / iw, dh / ih);
        const drawW = iw * scale;
        const drawH = ih * scale;
        const dx = (dw - drawW) * 0.5;
        const dy = (dh - drawH) * 0.5;

        const oc = document.createElement('canvas');
        oc.width = dw;
        oc.height = dh;
        const octx = oc.getContext('2d');
        octx.drawImage(img, dx, dy, drawW, drawH);
        appState.blendData = octx.getImageData(0, 0, dw, dh);
        appState.hasBlend = true;
        startRender();
      };
      img.onerror = () => {
        showNotice('Could not load blend image.', 'error');
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      showNotice('Could not read blend image file.', 'error');
    };
    reader.readAsDataURL(file);
  }

  function handleBlendRemove() {
    clearTimeout(processTimer);
    processTimer = null;
    const runFull = pendingGeo;
    pendingGeo = false;
    appState.blendData = null;
    appState.hasBlend = false;
    appState.params.blendMode = 'normal';
    appState.params.blendOpacity = 50;
    recordHistory();
    if (runFull) startFull();
    else startRender();
  }

  function startFull() {
    if (!appState.srcData) return;
    fullInFlight = true;
    invalidateCaches();
    appState.processing = true;
    currentId = requestFullProcess(appState.srcData, appState.params, appState.blendData);
  }

  function startRender() {
    if (fullInFlight || !appState.cachedNearest) {
      startFull();
      return;
    }
    appState.processing = true;
    currentId = requestRenderOnly(
      {
        nearestSeed: appState.cachedNearest,
        dist1Sq: appState.cachedDist1Sq,
        dist2Sq: appState.cachedDist2Sq,
        avgColors: appState.cachedAvgColors,
        width: appState.cachedWidth,
        height: appState.cachedHeight,
      },
      appState.params,
      appState.blendData
    );
  }

  function handleGeoChange() {
    pendingGeo = true;
    clearTimeout(processTimer);
    processTimer = setTimeout(() => {
      processTimer = null;
      pendingGeo = false;
      recordHistory();
      startFull();
    }, 120);
  }

  function handleAppearanceChange() {
    clearTimeout(processTimer);
    processTimer = setTimeout(() => {
      processTimer = null;
      const runFull = pendingGeo;
      pendingGeo = false;
      recordHistory();
      if (runFull) startFull();
      else startRender();
    }, 80);
  }

  function handleRegenerate() {
    clearTimeout(processTimer);
    processTimer = null;
    pendingGeo = false;
    appState.params.seed = Math.floor(Math.random() * 1e9) + 1;
    if (appState.srcData) {
      recordHistory();
      startFull();
    }
  }

  function handleImpact(x, y) {
    clearTimeout(processTimer);
    processTimer = null;
    pendingGeo = false;
    appState.params.impact = { x, y };
    if (appState.srcData) {
      recordHistory();
      startFull();
    }
  }

  function handleClearImpact() {
    clearTimeout(processTimer);
    processTimer = null;
    pendingGeo = false;
    appState.params.impact = null;
    if (appState.srcData) {
      recordHistory();
      startFull();
    }
  }

  async function handleCopy() {
    if (!canvasEl || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      showNotice('Clipboard copy unavailable', 'error');
      return false;
    }
    try {
      const blob = await new Promise((resolve) => canvasEl.toBlob(resolve, 'image/png'));
      if (!blob) {
        showNotice('Clipboard copy unavailable', 'error');
        return false;
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    } catch {
      showNotice('Clipboard copy unavailable', 'error');
      return false;
    }
  }

  function handleDownload() {
    if (!appState.hasImage) return;
    const format = appState.params.exportFormat || 'png';

    if (format === 'svg') {
      if (fullInFlight || !appState.cachedAvgColors) {
        showNotice('Wait for rendering to finish before exporting SVG.', 'error');
        return;
      }
      const svg = generateVoronoiSVG(
        appState.cachedWidth,
        appState.cachedHeight,
        appState.seeds,
        appState.cachedAvgColors,
        { ...appState.params, nearestSeed: appState.cachedNearest }
      );
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'voronoi-shatter.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    if (!canvasEl) return;
    const mimeType = `image/${format}`;
    const quality = format === 'png' ? undefined : (appState.params.exportQuality || 92) / 100;

    canvasEl.toBlob(
      (blob) => {
        if (!blob) {
          showNotice('Export failed.', 'error');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voronoi-shatter.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      mimeType,
      quality
    );
  }

  function handleSample() {
    view = 'studio';
    const w = 960;
    const h = 640;
    const oc = document.createElement('canvas');
    oc.width = w;
    oc.height = h;
    const ctx = oc.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#141418');
    bg.addColorStop(0.45, '#2b2240');
    bg.addColorStop(1, '#d94826');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const orb = ctx.createRadialGradient(w * 0.34, h * 0.38, 20, w * 0.34, h * 0.38, 220);
    orb.addColorStop(0, '#fde68a');
    orb.addColorStop(0.5, '#f97316');
    orb.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(w * 0.34, h * 0.38, 220, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(13, 148, 136, 0.85)';
    ctx.beginPath();
    ctx.moveTo(w * 0.56, h * 0.18);
    ctx.lineTo(w * 0.86, h * 0.72);
    ctx.lineTo(w * 0.44, h * 0.82);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(244, 243, 239, 0.16)';
    ctx.fillRect(w * 0.14, h * 0.58, 280, 140);

    cancelSampleRaf();
    sampleRaf = requestAnimationFrame(() => {
      sampleRaf = null;
      loadImage(oc);
    });
  }

  function handleOpenPreset(preset) {
    assignPresetParams(preset);
    appState.params.impact = null;
    handleSample();
  }

  function handleResetParams() {
    clearTimeout(processTimer);
    processTimer = null;
    pendingGeo = false;
    appState.params.cellCount = 80;
    appState.params.jitter = 75;
    appState.params.refraction = 65;
    appState.params.bevel = 55;
    appState.params.dispersion = 24;
    appState.params.borderWidth = 1.5;
    appState.params.borderColor = '#111113';
    appState.params.metric = 'euclidean';
    appState.params.transparentBorder = false;
    appState.params.wireframe = false;
    appState.params.impact = null;
    if (appState.srcData) {
      recordHistory();
      startFull();
    }
  }

  function handleOpenDemoInStudio(demoState) {
    if (demoState) {
      if (typeof demoState.cellCount === 'number') appState.params.cellCount = demoState.cellCount;
      if (typeof demoState.jitter === 'number') appState.params.jitter = demoState.jitter;
      if (typeof demoState.metric === 'string') appState.params.metric = demoState.metric;
      if (typeof demoState.wireframe === 'boolean') appState.params.wireframe = demoState.wireframe;
      if (typeof demoState.transparentBorder === 'boolean') {
        appState.params.transparentBorder = demoState.transparentBorder;
      }
      if (typeof demoState.borderWidth === 'number') appState.params.borderWidth = demoState.borderWidth;
      if (typeof demoState.borderColor === 'string') appState.params.borderColor = demoState.borderColor;
      if (typeof demoState.refraction === 'number') appState.params.refraction = demoState.refraction;
      if (typeof demoState.bevel === 'number') appState.params.bevel = demoState.bevel;
      if (typeof demoState.dispersion === 'number') appState.params.dispersion = demoState.dispersion;
      if ('impact' in demoState) {
        appState.params.impact = demoState.impact
          ? { x: demoState.impact.x, y: demoState.impact.y }
          : null;
      }
      if (typeof demoState.seed === 'number') appState.params.seed = demoState.seed;
    }
    handleSample();
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleFile(file, { fromPaste: true });
          return;
        }
      }
    }
  }

  function handleKeydown(e) {
    if (view !== 'studio') return;

    if (e.key === 'Escape') {
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'BUTTON' ||
          active.tagName === 'SELECT' ||
          active.tagName === 'TEXTAREA') &&
        active.closest('aside')
      ) {
        active.blur();
        return;
      }
      if (appState.params.impact) {
        handleClearImpact();
      }
      return;
    }

    const target = e.target;
    const isTextEntry =
      target instanceof HTMLElement &&
      (target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        (target.tagName === 'INPUT' &&
          !['range', 'color', 'checkbox', 'radio', 'button'].includes(target.type)));

    if (isTextEntry) return;

    const mod = (e.ctrlKey || e.metaKey) && !e.altKey;
    const key = e.key.toLowerCase();

    if (mod && key === 's') {
      e.preventDefault();
      handleDownload();
      return;
    }
    if (mod && !e.shiftKey && key === 'z') {
      e.preventDefault();
      handleUndo();
      return;
    }
    if ((mod && e.shiftKey && key === 'z') || (mod && key === 'y')) {
      e.preventDefault();
      handleRedo();
      return;
    }

    if (e.key === ' ' && !e.repeat && !(target instanceof HTMLElement && target.tagName === 'BUTTON')) {
      e.preventDefault();
      handleRegenerate();
    }
    if (key === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey && appState.hasImage) {
      comparing = true;
    }
  }

  function handleKeyup(e) {
    if (e.key === 'c' || e.key === 'C') comparing = false;
  }
</script>

<svelte:window onkeydown={handleKeydown} onkeyup={handleKeyup} onpaste={handlePaste} onblur={() => (comparing = false)} />

{#if view === 'landing'}
  <LandingPage
    presets={PRESETS}
    onOpenStudio={() => (view = 'studio')}
    onOpenSample={handleSample}
    onOpenDemo={handleOpenDemoInStudio}
    onOpenPreset={handleOpenPreset}
    onFile={handleFile}
  />
{:else}
  <div class="relative flex flex-col h-[100dvh] bg-studio-bg text-studio-ink overflow-hidden">
    <Header
      hasImage={appState.hasImage}
      width={appState.srcWidth}
      height={appState.srcHeight}
      cellCount={appState.seeds.length}
      metric={appState.params.metric}
      exportFormat={appState.params.exportFormat}
      isEmbed={embed}
      {canUndo}
      {canRedo}
      onHome={handleGoHome}
      onFile={handleFile}
      onSample={handleSample}
      onUndo={handleUndo}
      onRedo={handleRedo}
      onReset={handleResetParams}
      onCopy={handleCopy}
      onDownload={handleDownload}
      onSendToHost={handleSendToHost}
    />
    <main class="relative flex flex-col md:flex-row flex-1 w-full h-full overflow-hidden">
      <ToolRail
        bind:comparing
        onRegenerate={handleRegenerate}
        onClearImpact={handleClearImpact}
        onBorderChange={handleAppearanceChange}
      />
      <CanvasArea
        bind:canvasEl
        {comparing}
        hasImage={appState.hasImage}
        processing={appState.processing}
        srcData={appState.srcData}
        impact={appState.params.impact}
        showAlpha={appState.params.transparentBorder || appState.params.wireframe}
        onFile={handleFile}
        onSample={handleSample}
        onImpact={handleImpact}
      />
      <Sidebar
        presets={PRESETS}
        {activePreset}
        isEmbed={embed}
        bind:comparing
        onPreset={applyPreset}
        onGeoChange={handleGeoChange}
        onBorderChange={handleAppearanceChange}
        onRegenerate={handleRegenerate}
        onClearImpact={handleClearImpact}
        onBlendFile={handleBlendFile}
        onBlendRemove={handleBlendRemove}
        onBlendChange={handleAppearanceChange}
      />
    </main>

    {#if notice}
      <div
        role="status"
        aria-live="polite"
        class="pointer-events-none fixed left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-1.5rem)] md:max-w-md px-3.5 py-2 rounded-lg backdrop-blur-md border shadow-md text-xs font-medium leading-snug flex items-center gap-2 {appState.hasImage
          ? 'bottom-[calc(42dvh+0.75rem)] md:bottom-auto md:top-16'
          : 'bottom-4 md:bottom-auto md:top-16'} {notice.tone === 'error'
          ? 'bg-studio-panel border-studio-accent/50 text-studio-accent'
          : 'bg-studio-panel/95 border-studio-border-strong text-studio-ink'}"
      >
        {#if notice.tone === 'error'}
          <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        {:else}
          <svg class="w-3.5 h-3.5 shrink-0 text-studio-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        {/if}
        <span class="break-words">{notice.message}</span>
      </div>
    {/if}
  </div>
{/if}
