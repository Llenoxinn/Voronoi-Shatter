<script>
  import { onMount, onDestroy } from 'svelte';
  import { generateSeeds, computeVoronoi, renderVoronoi } from '../lib/voronoi.js';
  import { generateVoronoiSVG } from '../lib/svg-export.js';
  import ThemeToggle from './ThemeToggle.svelte';

  let {
    presets = [],
    onOpenStudio,
    onOpenSample,
    onOpenDemo,
    onOpenPreset,
    onFile,
  } = $props();

  let heroCanvas = $state();
  let heroImpact = $state({ x: 0.38, y: 0.44 });
  let heroSeed = $state(42071);
  let activeHeroPreset = $state('Prism');
  let heroMetric = $state('euclidean');
  let heroWireframe = $state(false);
  let heroCutout = $state(false);
  let heroCellCount = $state(80);
  let heroRefraction = $state(65);
  let heroBevel = $state(55);
  let heroDispersion = $state(24);
  let heroBorderWidth = $state(1.5);
  let fileInput = $state();

  let showcaseCanvas = $state();
  let activeShowcaseIndex = $state(0);

  let srcPixels = null;
  let lastHeroVoronoi = null;
  let showcaseSrcPixels = null;
  let showcaseRaf = null;
  const showcaseCache = new Map();

  const W = 840;
  const H = 480;
  const SW = 520;
  const SH = 300;

  const HERO_METRICS = [
    { id: 'euclidean', label: 'Crystal' },
    { id: 'manhattan', label: 'Diamond' },
    { id: 'chebyshev', label: 'Grid' },
  ];

  const PRESET_THEMES = [
    {
      tab: 'bg-[#d94826] text-white',
      panel: 'bg-[#d94826] text-white',
      badge: 'bg-black/20 text-white',
      cta: 'bg-[#111113] text-[#f4f3ef]',
    },
    {
      tab: 'bg-[#18181c] text-[#f4f3ef]',
      panel: 'bg-[#18181c] text-[#f4f3ef]',
      badge: 'bg-white/10 text-[#f4f3ef]',
      cta: 'bg-[#f4f3ef] text-[#111113]',
    },
    {
      tab: 'bg-[#0f766e] text-white',
      panel: 'bg-[#0f766e] text-white',
      badge: 'bg-black/20 text-white',
      cta: 'bg-[#111113] text-[#f4f3ef]',
    },
    {
      tab: 'bg-[#1d4ed8] text-white',
      panel: 'bg-[#1d4ed8] text-white',
      badge: 'bg-black/20 text-white',
      cta: 'bg-[#111113] text-[#f4f3ef]',
    },
    {
      tab: 'bg-[#b45309] text-white',
      panel: 'bg-[#b45309] text-white',
      badge: 'bg-black/20 text-white',
      cta: 'bg-[#111113] text-[#f4f3ef]',
    },
    {
      tab: 'bg-[#334155] text-white',
      panel: 'bg-[#334155] text-white',
      badge: 'bg-black/20 text-white',
      cta: 'bg-[#f4f3ef] text-[#111113]',
    },
  ];

  const activeShowcasePreset = $derived(presets[activeShowcaseIndex] ?? presets[0] ?? null);
  const activeShowcaseTheme = $derived(
    PRESET_THEMES[activeShowcaseIndex % PRESET_THEMES.length]
  );

  function hexToRgb(hex) {
    if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) return [17, 17, 19];
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
  }

  function paintSourceComposition(w, h) {
    const oc = document.createElement('canvas');
    oc.width = w;
    oc.height = h;
    const ctx = oc.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#141418');
    grad.addColorStop(0.45, '#2b2240');
    grad.addColorStop(1, '#d94826');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const sunRadius = Math.round(Math.min(w, h) * 0.44);
    const sun = ctx.createRadialGradient(
      w * 0.36,
      h * 0.42,
      Math.max(10, Math.round(sunRadius * 0.08)),
      w * 0.36,
      h * 0.42,
      sunRadius
    );
    sun.addColorStop(0, '#fde68a');
    sun.addColorStop(0.5, '#f97316');
    sun.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(w * 0.36, h * 0.42, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(13, 148, 136, 0.85)';
    ctx.beginPath();
    ctx.moveTo(w * 0.54, h * 0.14);
    ctx.lineTo(w * 0.88, h * 0.78);
    ctx.lineTo(w * 0.42, h * 0.86);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(244, 243, 239, 0.16)';
    ctx.fillRect(w * 0.1, h * 0.62, w * 0.285, h * 0.21);

    return ctx.getImageData(0, 0, w, h).data;
  }

  function buildHeroSource() {
    srcPixels = paintSourceComposition(W, H);
  }

  function buildShowcaseSource() {
    showcaseSrcPixels = paintSourceComposition(SW, SH);
  }

  function computeHeroGeometry() {
    if (!heroCanvas || !srcPixels) return;
    const count = Math.max(24, Math.min(160, heroCellCount));
    const seeds = generateSeeds(W, H, count, 75, heroSeed, heroImpact);
    const { nearestSeed, dist1Sq, dist2Sq, avgColors } = computeVoronoi(
      srcPixels,
      W,
      H,
      seeds,
      heroMetric
    );
    lastHeroVoronoi = {
      seeds,
      nearestSeed,
      dist1Sq,
      dist2Sq,
      avgColors,
    };
    renderHeroAppearance();
  }

  function renderHeroAppearance() {
    if (!heroCanvas || !srcPixels) return;
    if (!lastHeroVoronoi) {
      computeHeroGeometry();
      return;
    }
    const { seeds, nearestSeed, dist1Sq, dist2Sq, avgColors } = lastHeroVoronoi;
    const out = renderVoronoi(
      W,
      H,
      nearestSeed,
      dist1Sq,
      dist2Sq,
      avgColors,
      seeds,
      srcPixels,
      heroBorderWidth,
      [17, 17, 19],
      heroRefraction,
      heroBevel,
      heroDispersion,
      null,
      'normal',
      0,
      heroCutout,
      heroWireframe
    );
    if (heroCanvas.width !== W) heroCanvas.width = W;
    if (heroCanvas.height !== H) heroCanvas.height = H;
    heroCanvas.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0);
  }

  function renderShowcasePreset(preset) {
    if (!showcaseCanvas || !showcaseSrcPixels || !preset) return;
    let imageData = showcaseCache.get(preset.name);
    if (!imageData) {
      const count = Math.max(24, Math.min(200, preset.cellCount ?? 80));
      const jitter = typeof preset.jitter === 'number' ? preset.jitter : 75;
      const metric = typeof preset.metric === 'string' ? preset.metric : 'euclidean';
      const impact = preset.name === 'Cracked' ? { x: 0.42, y: 0.46 } : null;
      const seeds = generateSeeds(SW, SH, count, jitter, 42071, impact);
      const { nearestSeed, dist1Sq, dist2Sq, avgColors } = computeVoronoi(
        showcaseSrcPixels,
        SW,
        SH,
        seeds,
        metric
      );
      const out = renderVoronoi(
        SW,
        SH,
        nearestSeed,
        dist1Sq,
        dist2Sq,
        avgColors,
        seeds,
        showcaseSrcPixels,
        typeof preset.borderWidth === 'number' ? preset.borderWidth : 1.5,
        hexToRgb(preset.borderColor),
        typeof preset.refraction === 'number' ? preset.refraction : 0,
        typeof preset.bevel === 'number' ? preset.bevel : 0,
        typeof preset.dispersion === 'number' ? preset.dispersion : 0,
        null,
        'normal',
        0,
        Boolean(preset.transparentBorder),
        Boolean(preset.wireframe)
      );
      imageData = new ImageData(out, SW, SH);
      showcaseCache.set(preset.name, imageData);
    }
    if (showcaseCanvas.width !== SW) showcaseCanvas.width = SW;
    if (showcaseCanvas.height !== SH) showcaseCanvas.height = SH;
    showcaseCanvas.getContext('2d').putImageData(imageData, 0, 0);
  }

  function selectShowcasePreset(idx) {
    const preset = presets[idx];
    if (!preset) return;
    if (showcaseRaf) {
      cancelAnimationFrame(showcaseRaf);
      showcaseRaf = null;
    }
    activeShowcaseIndex = idx;
    renderShowcasePreset(preset);
  }

  function handlePresetTabKeydown(e, idx) {
    if (!presets.length) return;
    let nextIdx = null;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % presets.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + presets.length) % presets.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = presets.length - 1;
    if (nextIdx === null) return;
    e.preventDefault();
    selectShowcasePreset(nextIdx);
    document.getElementById(`preset-tab-${nextIdx}`)?.focus();
  }

  function previewPresetInHero(preset) {
    selectHeroPreset(preset);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('studio-preview')?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'center',
    });
  }

  function exportHeroSVG() {
    if (!lastHeroVoronoi) return;
    const svg = generateVoronoiSVG(
      W,
      H,
      lastHeroVoronoi.seeds,
      lastHeroVoronoi.avgColors,
      {
        metric: heroMetric,
        nearestSeed: lastHeroVoronoi.nearestSeed,
        bevel: heroBevel,
        borderWidth: heroBorderWidth,
        borderColor: '#111113',
        transparentBorder: heroCutout,
        wireframe: heroWireframe,
      }
    );
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voronoi-shatter-${heroMetric}-${heroCellCount}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleHeroClick(e) {
    if (!heroCanvas) return;
    const rect = heroCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    heroImpact = {
      x: Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height)),
    };
    heroSeed = (heroSeed + 7919) % 999983;
    computeHeroGeometry();
  }

  function selectHeroPreset(preset) {
    const prevCellCount = heroCellCount;
    const prevMetric = heroMetric;

    activeHeroPreset = preset.name;
    if (typeof preset.cellCount === 'number') {
      heroCellCount = Math.max(24, Math.min(160, preset.cellCount));
    }
    if (typeof preset.refraction === 'number') heroRefraction = preset.refraction;
    if (typeof preset.bevel === 'number') heroBevel = preset.bevel;
    if (typeof preset.borderWidth === 'number') heroBorderWidth = preset.borderWidth;
    heroDispersion =
      typeof preset.dispersion === 'number'
        ? preset.dispersion
        : preset.refraction === 0
          ? 0
          : 24;
    heroMetric = typeof preset.metric === 'string' ? preset.metric : 'euclidean';
    heroCutout = typeof preset.transparentBorder === 'boolean' ? preset.transparentBorder : false;
    heroWireframe = typeof preset.wireframe === 'boolean' ? preset.wireframe : false;

    if (!lastHeroVoronoi || heroCellCount !== prevCellCount || heroMetric !== prevMetric) {
      computeHeroGeometry();
    } else {
      renderHeroAppearance();
    }
  }

  function launchDemoInStudio() {
    onOpenDemo?.({
      cellCount: heroCellCount,
      jitter: 75,
      metric: heroMetric,
      wireframe: heroWireframe,
      transparentBorder: heroCutout,
      borderWidth: heroBorderWidth,
      borderColor: '#111113',
      refraction: heroRefraction,
      bevel: heroBevel,
      dispersion: heroDispersion,
      impact: heroImpact ? { x: heroImpact.x, y: heroImpact.y } : null,
      seed: heroSeed,
    });
  }

  function handleFileChange(e) {
    if (e.target.files.length > 0) {
      onFile(e.target.files[0]);
      e.target.value = '';
    }
  }

  function reveal(node) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return {};
    node.style.opacity = '0';
    node.style.transform = 'translateY(12px)';
    node.style.transition = 'opacity 280ms var(--ease-out), transform 280ms var(--ease-out)';

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          node.style.opacity = '1';
          node.style.transform = 'translateY(0)';
          io.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    io.observe(node);
    return { destroy: () => io.disconnect() };
  }

  onMount(() => {
    buildHeroSource();
    computeHeroGeometry();
    buildShowcaseSource();
    if (presets[activeShowcaseIndex]) {
      showcaseRaf = requestAnimationFrame(() => {
        showcaseRaf = null;
        if (presets[activeShowcaseIndex]) {
          renderShowcasePreset(presets[activeShowcaseIndex]);
        }
      });
    }
  });

  onDestroy(() => {
    if (showcaseRaf) cancelAnimationFrame(showcaseRaf);
  });
</script>

<div class="min-h-[100dvh] w-full max-w-full bg-studio-bg text-studio-ink overflow-x-hidden">
  <!-- Fluid Island Floating Nav -->
  <div class="sticky top-4 z-30 px-4 pointer-events-none">
    <header class="pointer-events-auto max-w-4xl mx-auto flex items-center justify-between gap-2 h-14 sm:h-12 pl-3 pr-1.5 sm:pl-4 sm:pr-2 rounded-full backdrop-blur-xl bg-studio-panel border border-studio-border shadow-[0_12px_32px_rgba(0,0,0,0.07),inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]">
      <a
        href="#top"
        class="flex items-center gap-2 overflow-hidden min-w-0 min-h-[44px] sm:min-h-0 text-studio-ink no-underline rounded-full px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60"
      >
        <svg class="w-4 h-4 shrink-0 text-studio-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
          <line x1="12" y1="22" x2="12" y2="12" />
          <line x1="22" y1="8.5" x2="12" y2="12" />
          <line x1="2" y1="8.5" x2="12" y2="12" />
        </svg>
        <span class="font-display font-[579] text-sm tracking-[-0.015em] truncate">Voronoi Shatter</span>
      </a>

      <nav class="hidden md:flex items-center gap-7 text-xs font-medium text-studio-muted" aria-label="Primary">
        <a
          href="#optics"
          class="hover:text-studio-ink transition-colors duration-150 ease-[var(--ease-out)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60"
        >
          Optics
        </a>
        <a
          href="#presets"
          class="hover:text-studio-ink transition-colors duration-150 ease-[var(--ease-out)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60"
        >
          Presets
        </a>
        <a
          href="#figma-plugin"
          class="hover:text-studio-ink transition-colors duration-150 ease-[var(--ease-out)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60"
        >
          Figma Plugin
        </a>
      </nav>

      <div class="flex items-center gap-1.5 shrink-0">
        <ThemeToggle />
        <button
          type="button"
          onclick={onOpenStudio}
          class="inline-flex items-center justify-center min-h-[44px] sm:min-h-0 sm:h-8 px-3 sm:px-4 rounded-full bg-studio-ink text-studio-bg text-xs font-medium whitespace-nowrap hover:opacity-90 motion-safe:enabled:active:scale-[0.96] transition-[opacity,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60"
        >
          Open Studio
        </button>
      </div>
    </header>
  </div>

  <!-- Hero: Editorial Headline + Voronoi-Faceted Monumental Wordmark Behind Interactive Studio -->
  <section id="top" class="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-16 md:pt-16 md:pb-24">
    <div class="max-w-5xl">
      <h1 class="font-display font-[579] text-4xl sm:text-6xl lg:text-[4.5rem] leading-[1.05] tracking-[-0.03em] text-studio-ink text-balance">
        You give it pixels.<br />
        We fracture them into crystal.
      </h1>
      <p class="mt-5 text-base sm:text-lg text-studio-muted leading-relaxed max-w-[48ch] text-pretty">
        Per-shard optical refraction, directional bevels, and RGB dispersion&mdash;running locally in your browser.
      </p>

      <div class="flex flex-wrap items-center gap-3 mt-7">
        <button
          type="button"
          onclick={onOpenSample}
          class="group inline-flex items-center gap-3 min-h-[44px] h-11 pl-5 pr-2 rounded-full bg-studio-accent text-studio-accent-ink text-sm font-medium hover:opacity-95 motion-safe:enabled:active:scale-[0.96] transition-[opacity,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-bg"
        >
          <span>Try live sample</span>
          <span class="w-7 h-7 rounded-full bg-black/15 flex items-center justify-center motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-[1px] transition-transform duration-200 ease-[var(--ease-out)]">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </span>
        </button>
        <button
          type="button"
          onclick={() => fileInput.click()}
          class="inline-flex items-center justify-center min-h-[44px] h-11 px-6 rounded-full border border-studio-border-strong bg-studio-panel text-studio-ink text-sm font-medium hover:border-studio-ink motion-safe:enabled:active:scale-[0.96] transition-[border-color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60"
        >
          Upload image
        </button>
        <input
          type="file"
          accept="image/*"
          bind:this={fileInput}
          onchange={handleFileChange}
          aria-label="Upload image to studio"
        />
      </div>
    </div>

    <!-- Monumental Voronoi-Faceted Display Wordmark Behind Double-Bezel App Frame -->
    <div id="studio-preview" class="relative mt-14 md:mt-20">
      <div
        aria-hidden="true"
        class="voronoi-wordmark pointer-events-none font-display font-[579] tracking-[-0.045em] leading-[0.84] text-center"
        style="font-size: clamp(3.25rem, 15.5vw, 13.25rem);"
      >
        SHATTER
      </div>

      <div class="relative -mt-5 sm:-mt-11 md:-mt-16 rounded-[1.75rem] p-1.5 bg-studio-ink/[0.045] dark:bg-white/[0.05] border border-transparent ring-1 ring-black/10 dark:ring-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.10)] dark:shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
        <div class="rounded-[calc(1.75rem-0.375rem)] bg-studio-panel overflow-hidden border border-studio-border shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <!-- Studio Top Workstation Bar -->
          <div class="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-studio-panel border-b border-studio-border">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="flex items-center gap-1.5 min-w-0">
                <svg class="w-3.5 h-3.5 shrink-0 text-studio-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                  <line x1="12" y1="22" x2="12" y2="12" />
                  <line x1="22" y1="8.5" x2="12" y2="12" />
                  <line x1="2" y1="8.5" x2="12" y2="12" />
                </svg>
                <span class="text-xs font-semibold text-studio-ink whitespace-nowrap">Studio Preview</span>
              </div>
              <span class="hidden sm:inline-block px-2 py-0.5 rounded bg-studio-elevated font-mono text-xs text-studio-muted tabular-nums whitespace-nowrap">
                {W}&times;{H} &middot; {heroCellCount} shards
              </span>
            </div>

            <div class="flex items-center gap-1.5">
              <button
                type="button"
                onclick={exportHeroSVG}
                class="inline-flex items-center justify-center min-h-[44px] sm:min-h-0 sm:h-7 px-3 sm:px-2.5 rounded-md border border-studio-border bg-studio-elevated/70 hover:bg-studio-elevated text-xs font-medium text-studio-ink whitespace-nowrap motion-safe:enabled:active:scale-[0.96] transition-[background-color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60"
              >
                Export SVG
              </button>
              <button
                type="button"
                onclick={launchDemoInStudio}
                class="inline-flex items-center justify-center min-h-[44px] sm:min-h-0 sm:h-7 px-3.5 sm:px-3 rounded-md bg-studio-ink text-studio-bg text-xs font-medium whitespace-nowrap hover:opacity-90 motion-safe:enabled:active:scale-[0.96] transition-[opacity,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60"
              >
                Open Full Studio
              </button>
            </div>
          </div>

          <!-- 3-Column Workstation Preview (Tool Rail + Matte Canvas + Pro Inspector) -->
          <div class="grid grid-cols-1 lg:grid-cols-[44px_1fr_256px]">
            <!-- Left Tool Rail -->
            <div class="hidden lg:flex flex-col items-center py-2.5 gap-1.5 bg-studio-panel border-r border-studio-border">
              <button
                type="button"
                onclick={() => {
                  heroImpact = heroImpact ? null : { x: 0.38, y: 0.44 };
                  computeHeroGeometry();
                }}
                title={heroImpact ? 'Radial impact active — click to toggle grid' : 'Click to enable radial impact'}
                aria-label="Toggle radial impact"
                aria-pressed={Boolean(heroImpact)}
                class="w-7 h-7 rounded-md inline-flex items-center justify-center motion-safe:enabled:active:scale-[0.96] transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-panel {heroImpact
                  ? 'bg-studio-accent text-studio-accent-ink'
                  : 'text-studio-muted hover:text-studio-ink hover:bg-studio-elevated'}"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <circle cx="12" cy="12" r="7" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </button>

              <button
                type="button"
                onclick={() => {
                  heroSeed = (heroSeed + 7919) % 999983;
                  computeHeroGeometry();
                }}
                title="Reseed shards"
                aria-label="Reseed shards"
                class="w-7 h-7 rounded-md inline-flex items-center justify-center text-studio-muted hover:text-studio-ink hover:bg-studio-elevated motion-safe:enabled:active:scale-[0.96] transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>

              <button
                type="button"
                onclick={() => {
                  heroCutout = !heroCutout;
                  renderHeroAppearance();
                }}
                title="Cutout gaps"
                aria-label="Toggle cutout gaps"
                aria-pressed={heroCutout}
                class="w-7 h-7 rounded-md inline-flex items-center justify-center motion-safe:enabled:active:scale-[0.96] transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 {heroCutout
                  ? 'bg-studio-ink text-studio-bg'
                  : 'text-studio-muted hover:text-studio-ink hover:bg-studio-elevated'}"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <rect x="4" y="4" width="6" height="6" rx="1" />
                  <rect x="14" y="4" width="6" height="6" rx="1" />
                  <rect x="4" y="14" width="6" height="6" rx="1" />
                  <rect x="14" y="14" width="6" height="6" rx="1" />
                </svg>
              </button>

              <button
                type="button"
                onclick={() => {
                  heroWireframe = !heroWireframe;
                  renderHeroAppearance();
                }}
                title="Wireframe only"
                aria-label="Toggle wireframe"
                aria-pressed={heroWireframe}
                class="w-7 h-7 rounded-md inline-flex items-center justify-center motion-safe:enabled:active:scale-[0.96] transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 {heroWireframe
                  ? 'bg-studio-ink text-studio-bg'
                  : 'text-studio-muted hover:text-studio-ink hover:bg-studio-elevated'}"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">
                  <polygon points="12 3 21 9 18 20 6 20 3 9 12 3" />
                  <line x1="12" y1="3" x2="12" y2="20" />
                </svg>
              </button>
            </div>

            <!-- Matte Canvas Stage -->
            <div class="min-w-0 p-3 sm:p-4 flex items-center justify-center bg-studio-elevated/55 dark:bg-[#0a0a0c]">
              <div
                class="relative w-full rounded-lg overflow-hidden border border-transparent ring-1 ring-black/10 dark:ring-white/10 shadow-[0_14px_36px_rgba(0,0,0,0.16)]"
                style={heroWireframe || heroCutout
                  ? 'background-color: var(--studio-elevated); background-image: conic-gradient(var(--studio-border) 90deg, transparent 90deg 180deg, var(--studio-border) 180deg 270deg, transparent 270deg); background-size: 16px 16px;'
                  : ''}
              >
                <canvas
                  bind:this={heroCanvas}
                  onclick={handleHeroClick}
                  title="Click anywhere to move the fracture origin"
                  class="block w-full h-auto cursor-crosshair"
                ></canvas>
                {#if heroImpact}
                  <div
                    aria-hidden="true"
                    class="absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-studio-accent bg-studio-bg/60 pointer-events-none"
                    style="left: {heroImpact.x * 100}%; top: {heroImpact.y * 100}%;"
                  ></div>
                {/if}
              </div>
            </div>

            <!-- Miniature Pro Inspector -->
            <div class="min-w-0 bg-studio-panel border-t lg:border-t-0 lg:border-l border-studio-border p-3.5 space-y-3.5 text-left">
              <div>
                <div class="flex items-center justify-between gap-2 mb-2">
                  <span class="text-xs font-semibold text-studio-ink">Presets</span>
                  <span class="text-xs text-studio-subtle">Click canvas</span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-1.5 lg:gap-1">
                  {#each presets.slice(0, 4) as preset}
                    {@const active = activeHeroPreset === preset.name}
                    <button
                      type="button"
                      onclick={() => selectHeroPreset(preset)}
                      aria-pressed={active}
                      class="min-h-[44px] lg:min-h-0 lg:h-7 px-2 rounded-md text-xs font-medium border motion-safe:enabled:active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-panel {active
                        ? 'bg-studio-accent text-studio-accent-ink border-studio-accent'
                        : 'bg-studio-elevated/60 text-studio-muted border-studio-border hover:text-studio-ink'}"
                    >
                      {preset.name}
                    </button>
                  {/each}
                </div>
              </div>

              <div class="pt-3 border-t border-studio-border">
                <span class="block text-xs font-semibold text-studio-ink mb-1.5">Metric</span>
                <div class="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-studio-elevated border border-studio-border" role="group" aria-label="Shard metric">
                  {#each HERO_METRICS as metric}
                    {@const active = heroMetric === metric.id}
                    <button
                      type="button"
                      onclick={() => {
                        heroMetric = metric.id;
                        computeHeroGeometry();
                      }}
                      aria-pressed={active}
                      class="min-h-[44px] lg:min-h-0 lg:h-6 rounded-md text-xs font-medium motion-safe:enabled:active:scale-[0.96] transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 {active
                        ? 'bg-studio-panel text-studio-ink shadow-sm'
                        : 'text-studio-muted hover:text-studio-ink'}"
                    >
                      {metric.label}
                    </button>
                  {/each}
                </div>
              </div>

              <!-- Mobile/Tablet quick tool toggles (mirrors left ToolRail) -->
              <div class="grid grid-cols-2 sm:grid-cols-4 lg:hidden gap-1.5 pt-2 border-t border-studio-border">
                <button
                  type="button"
                  onclick={() => {
                    heroImpact = heroImpact ? null : { x: 0.38, y: 0.44 };
                    computeHeroGeometry();
                  }}
                  aria-pressed={Boolean(heroImpact)}
                  class="min-h-[44px] px-2 rounded-md text-xs font-medium border motion-safe:enabled:active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-panel {heroImpact
                    ? 'bg-studio-accent text-studio-accent-ink border-studio-accent'
                    : 'bg-studio-elevated/60 text-studio-muted border-studio-border hover:text-studio-ink'}"
                >
                  Impact
                </button>
                <button
                  type="button"
                  onclick={() => {
                    heroSeed = (heroSeed + 7919) % 999983;
                    computeHeroGeometry();
                  }}
                  class="min-h-[44px] px-2 rounded-md text-xs font-medium border border-studio-border bg-studio-elevated text-studio-ink hover:border-studio-border-strong motion-safe:enabled:active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60"
                >
                  Reseed
                </button>
                <button
                  type="button"
                  onclick={() => {
                    heroCutout = !heroCutout;
                    renderHeroAppearance();
                  }}
                  aria-pressed={heroCutout}
                  class="min-h-[44px] px-2 rounded-md text-xs font-medium border motion-safe:enabled:active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 {heroCutout
                    ? 'bg-studio-ink text-studio-bg border-studio-ink'
                    : 'bg-studio-elevated/60 text-studio-muted border-studio-border hover:text-studio-ink'}"
                >
                  Cutout
                </button>
                <button
                  type="button"
                  onclick={() => {
                    heroWireframe = !heroWireframe;
                    renderHeroAppearance();
                  }}
                  aria-pressed={heroWireframe}
                  class="min-h-[44px] px-2 rounded-md text-xs font-medium border motion-safe:enabled:active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 {heroWireframe
                    ? 'bg-studio-ink text-studio-bg border-studio-ink'
                    : 'bg-studio-elevated/60 text-studio-muted border-studio-border hover:text-studio-ink'}"
                >
                  Wireframe
                </button>
              </div>

              <div class="pt-3 border-t border-studio-border space-y-2.5">
                <label class="block space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-studio-muted font-medium">Cells</span>
                    <span class="font-mono font-semibold text-studio-ink tabular-nums">{heroCellCount}</span>
                  </div>
                  <input
                    type="range"
                    min="24"
                    max="160"
                    step="1"
                    bind:value={heroCellCount}
                    oninput={() => computeHeroGeometry()}
                    class="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 rounded-full"
                  />
                </label>

                <label class="block space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-studio-muted font-medium">Refraction</span>
                    <span class="font-mono font-semibold text-studio-ink tabular-nums">{heroRefraction}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    bind:value={heroRefraction}
                    oninput={() => renderHeroAppearance()}
                    class="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 rounded-full"
                  />
                </label>

                <label class="block space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-studio-muted font-medium">Bevel</span>
                    <span class="font-mono font-semibold text-studio-ink tabular-nums">{heroBevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    bind:value={heroBevel}
                    oninput={() => renderHeroAppearance()}
                    class="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 rounded-full"
                  />
                </label>

                <label class="block space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-studio-muted font-medium">Dispersion</span>
                    <span class="font-mono font-semibold text-studio-ink tabular-nums">{heroDispersion}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    bind:value={heroDispersion}
                    oninput={() => renderHeroAppearance()}
                    class="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 rounded-full"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Bold Color-Blocked Optics Showcase Card -->
  <section id="optics" use:reveal class="max-w-6xl mx-auto px-5 sm:px-8 py-16 md:py-24">
    <div class="relative overflow-hidden rounded-3xl bg-studio-accent text-studio-accent-ink p-8 pb-16 sm:p-12 sm:pb-20 lg:p-16 lg:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
      <div class="lg:col-span-5 min-w-0">
        <h2 class="font-display font-[579] text-3xl sm:text-5xl leading-[1.06] tracking-[-0.03em] text-balance">
          Freedom to fracture. Zero uploads.
        </h2>
        <p class="mt-4 text-base opacity-90 leading-relaxed max-w-[38ch] text-pretty">
          Every pixel stays in your browser&rsquo;s Web Worker. Tune optics in real time and paste straight into Figma.
        </p>
      </div>

      <div class="lg:col-span-7 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
        <div class="min-w-0">
          <h3 class="font-display font-[579] text-lg sm:text-xl leading-[1.2] tracking-[-0.015em]">Optical Refraction</h3>
          <p class="mt-1.5 text-base opacity-90 leading-relaxed text-pretty">
            Displaces sampled pixels per cell along a deterministic vector for real glass depth.
          </p>
        </div>

        <div class="min-w-0">
          <h3 class="font-display font-[579] text-lg sm:text-xl leading-[1.2] tracking-[-0.015em]">RGB Dispersion</h3>
          <p class="mt-1.5 text-base opacity-90 leading-relaxed text-pretty">
            Splits red and blue channels along shard boundaries for chromatic prism edges.
          </p>
        </div>

        <div class="min-w-0">
          <h3 class="font-display font-[579] text-lg sm:text-xl leading-[1.2] tracking-[-0.015em]">Radial Impact</h3>
          <p class="mt-1.5 text-base opacity-90 leading-relaxed text-pretty">
            Click anywhere on your artwork to cluster smaller shards around an epicenter.
          </p>
        </div>

        <div class="min-w-0">
          <h3 class="font-display font-[579] text-lg sm:text-xl leading-[1.2] tracking-[-0.015em]">3D Facet Bevels</h3>
          <p class="mt-1.5 text-base opacity-90 leading-relaxed text-pretty">
            Directional rim highlights paired with smoothstep anti-aliased fracture borders.
          </p>
        </div>
      </div>

      <!-- Subtle Voronoi crystal facet edge motif -->
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 64"
        preserveAspectRatio="none"
        class="pointer-events-none absolute inset-x-0 bottom-0 w-full h-11 sm:h-14 text-current opacity-20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
        stroke-linejoin="round"
      >
        <polygon points="0,64 0,34 86,20 148,64" fill="currentColor" fill-opacity="0.22" />
        <polygon points="86,20 196,12 248,46 148,64" fill="currentColor" fill-opacity="0.1" />
        <polygon points="196,12 318,28 248,46" fill="currentColor" fill-opacity="0.28" />
        <polygon points="248,46 318,28 386,64 148,64" fill="currentColor" fill-opacity="0.14" />
        <polygon points="318,28 442,10 512,38 386,64" fill="currentColor" fill-opacity="0.24" />
        <polygon points="442,10 582,22 512,38" fill="currentColor" fill-opacity="0.12" />
        <polygon points="512,38 582,22 664,52 620,64 386,64" fill="currentColor" fill-opacity="0.18" />
        <polygon points="582,22 728,12 664,52" fill="currentColor" fill-opacity="0.26" />
        <polygon points="728,12 848,30 784,64 620,64 664,52" fill="currentColor" fill-opacity="0.12" />
        <polygon points="848,30 964,14 1028,44 926,64 784,64" fill="currentColor" fill-opacity="0.22" />
        <polygon points="964,14 1098,24 1028,44" fill="currentColor" fill-opacity="0.14" />
        <polygon points="1028,44 1098,24 1200,32 1200,64 926,64" fill="currentColor" fill-opacity="0.26" />
      </svg>
    </div>
  </section>

  <!-- Seamless Color-Coded Tabbed Presets Showcase -->
  <section id="presets" use:reveal class="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28">
    <div class="max-w-3xl mb-10">
      <h2 class="font-display font-[579] text-3xl sm:text-5xl leading-[1.06] tracking-[-0.03em] text-studio-ink text-balance">
        Six calibrated presets, ready in one click.
      </h2>
      <p class="mt-3 text-base text-studio-muted leading-relaxed max-w-[52ch] text-pretty">
        Inspect each optical recipe live, compare shard density and refraction, then launch directly into the studio.
      </p>
    </div>

    {#if activeShowcasePreset}
      <div>
        <!-- Flush Color-Coded Tab Strip -->
        <div
          role="tablist"
          aria-label="Optical presets"
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 lg:gap-0 items-end"
        >
          {#each presets as preset, idx}
            {@const active = activeShowcaseIndex === idx}
            {@const theme = PRESET_THEMES[idx % PRESET_THEMES.length]}
            <button
              id="preset-tab-{idx}"
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="preset-showcase-panel"
              tabindex={active ? 0 : -1}
              onclick={() => selectShowcasePreset(idx)}
              onkeydown={(e) => handlePresetTabKeydown(e, idx)}
              class="min-w-0 min-h-[44px] px-4 py-3.5 text-left rounded-xl lg:rounded-b-none lg:rounded-t-2xl border-2 lg:border-0 motion-safe:enabled:active:scale-[0.96] transition-[opacity,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-ink dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-studio-bg {theme.tab} {active
                ? 'opacity-100 lg:pb-4 border-studio-ink dark:border-white/90'
                : 'opacity-80 hover:opacity-100 border-transparent'}"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="inline-flex items-center gap-1.5 min-w-0">
                  {#if active}
                    <span class="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden="true"></span>
                  {/if}
                  <span class="font-display font-[579] text-sm sm:text-base leading-[1.2] tracking-[-0.015em] truncate">
                    {preset.name}
                  </span>
                </span>
                <span class="font-mono text-xs tabular-nums opacity-85 shrink-0">{preset.cellCount}c</span>
              </div>
              <div class="text-xs opacity-85 mt-0.5 truncate">{preset.desc}</div>
            </button>
          {/each}
        </div>

        <!-- Connected Color-Matched Showcase Panel -->
        <div
          id="preset-showcase-panel"
          role="tabpanel"
          aria-labelledby="preset-tab-{activeShowcaseIndex}"
          class="mt-2 lg:mt-0 rounded-2xl lg:rounded-t-none lg:rounded-b-3xl p-6 sm:p-10 lg:p-12 transition-[background-color,color] duration-200 ease-[var(--ease-out)] {activeShowcaseTheme.panel}"
        >
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div class="lg:col-span-5 min-w-0 space-y-6">
              <div>
                <h3 class="font-display font-[579] text-3xl sm:text-4xl leading-[1.08] tracking-[-0.025em] text-balance">
                  {activeShowcasePreset.name}
                </h3>
                <p class="mt-2 text-base opacity-90 leading-relaxed max-w-[40ch] text-pretty">
                  {activeShowcasePreset.desc}&mdash;calibrated with {activeShowcasePreset.cellCount} shards, {activeShowcasePreset.refraction}% refraction, and {activeShowcasePreset.bevel}% bevel depth.
                </p>
              </div>

              <!-- Live Tabular-Nums Parameter Readout -->
              <dl class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div class="min-w-0 rounded-xl px-3 py-2.5 {activeShowcaseTheme.badge}">
                  <dt class="text-xs opacity-80">Cells</dt>
                  <dd class="mt-0.5 font-mono text-sm font-semibold tabular-nums">{activeShowcasePreset.cellCount}</dd>
                </div>
                <div class="min-w-0 rounded-xl px-3 py-2.5 {activeShowcaseTheme.badge}">
                  <dt class="text-xs opacity-80">Jitter</dt>
                  <dd class="mt-0.5 font-mono text-sm font-semibold tabular-nums">{activeShowcasePreset.jitter}%</dd>
                </div>
                <div class="min-w-0 rounded-xl px-3 py-2.5 {activeShowcaseTheme.badge}">
                  <dt class="text-xs opacity-80">Refraction</dt>
                  <dd class="mt-0.5 font-mono text-sm font-semibold tabular-nums">{activeShowcasePreset.refraction}%</dd>
                </div>
                <div class="min-w-0 rounded-xl px-3 py-2.5 {activeShowcaseTheme.badge}">
                  <dt class="text-xs opacity-80">Bevel</dt>
                  <dd class="mt-0.5 font-mono text-sm font-semibold tabular-nums">{activeShowcasePreset.bevel}%</dd>
                </div>
                <div class="min-w-0 rounded-xl px-3 py-2.5 {activeShowcaseTheme.badge}">
                  <dt class="text-xs opacity-80">Dispersion</dt>
                  <dd class="mt-0.5 font-mono text-sm font-semibold tabular-nums">{activeShowcasePreset.dispersion ?? 0}%</dd>
                </div>
                <div class="min-w-0 rounded-xl px-3 py-2.5 {activeShowcaseTheme.badge}">
                  <dt class="text-xs opacity-80">Border</dt>
                  <dd class="mt-0.5 font-mono text-sm font-semibold tabular-nums">{activeShowcasePreset.borderWidth}px</dd>
                </div>
              </dl>

              <div class="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onclick={() => onOpenPreset?.(activeShowcasePreset)}
                  class="inline-flex items-center justify-center min-h-[44px] sm:min-h-0 sm:h-10 px-5 rounded-full text-sm font-medium hover:opacity-90 motion-safe:enabled:active:scale-[0.96] transition-[opacity,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85 focus-visible:ring-offset-2 focus-visible:ring-offset-black/25 {activeShowcaseTheme.cta}"
                >
                  Open {activeShowcasePreset.name} in Studio
                </button>
                <button
                  type="button"
                  onclick={() => previewPresetInHero(activeShowcasePreset)}
                  class="inline-flex items-center justify-center min-h-[44px] sm:min-h-0 sm:h-10 px-4 rounded-full text-sm font-medium border border-white/30 bg-white/10 hover:bg-white/20 motion-safe:enabled:active:scale-[0.96] transition-[background-color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85"
                >
                  Preview in Hero
                </button>
              </div>
            </div>

            <!-- Live Voronoi Specimen Frame -->
            <div class="lg:col-span-7 min-w-0">
              <div class="rounded-2xl p-1.5 bg-black/20 border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
                <div class="rounded-[calc(1rem-0.375rem)] overflow-hidden bg-[#141418] border border-transparent ring-1 ring-white/15">
                  <canvas
                    bind:this={showcaseCanvas}
                    width={SW}
                    height={SH}
                    aria-label="Live {activeShowcasePreset.name} Voronoi preset specimen"
                    class="block w-full h-auto"
                  ></canvas>
                  <div class="px-3.5 py-2 bg-[#141418] text-[#f4f3ef]/80 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
                    <span>{activeShowcasePreset.name} &middot; {activeShowcasePreset.metric ?? 'euclidean'}</span>
                    <span>{SW}&times;{SH} &middot; {activeShowcasePreset.cellCount}c</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </section>

  <!-- High-Contrast Figma Plugin Download Section -->
  <section id="figma-plugin" use:reveal class="max-w-6xl mx-auto px-5 sm:px-8 py-16 md:py-24">
    <div class="rounded-3xl bg-studio-ink text-studio-bg p-8 sm:p-12 lg:p-14 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
      <div class="lg:col-span-6 min-w-0">
        <h2 class="font-display font-[579] text-3xl sm:text-4xl leading-[1.06] tracking-[-0.03em] text-balance">
          Figma Plugin
        </h2>
        <p class="mt-3 text-base opacity-85 leading-relaxed max-w-[44ch] text-pretty">
          Fracture selected frames and layers directly inside Figma with live optical controls and vector export.
        </p>

        <div class="mt-7">
          <a
            href="./voronoi-shatter-figma-plugin.zip"
            download="voronoi-shatter-figma-plugin.zip"
            class="inline-flex items-center gap-2.5 min-h-[44px] h-11 px-6 rounded-full bg-studio-accent text-studio-accent-ink text-sm font-medium hover:opacity-95 motion-safe:active:scale-[0.96] transition-[opacity,transform] duration-150 ease-[var(--ease-out)] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-ink"
          >
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download Figma Plugin</span>
          </a>
        </div>
      </div>

      <ol class="lg:col-span-6 min-w-0 space-y-4">
        <li class="flex items-start gap-4 p-4 rounded-2xl bg-studio-bg/[0.08] border border-studio-bg/15">
          <span class="font-mono tabular-nums text-xs font-semibold opacity-75 pt-0.5 shrink-0">01</span>
          <div class="min-w-0">
            <div class="text-sm font-semibold tracking-tight">Unzip</div>
            <div class="text-sm opacity-80 mt-0.5 leading-relaxed break-words">
              Extract <code class="font-mono text-xs">voronoi-shatter-figma-plugin.zip</code> to a local folder.
            </div>
          </div>
        </li>
        <li class="flex items-start gap-4 p-4 rounded-2xl bg-studio-bg/[0.08] border border-studio-bg/15">
          <span class="font-mono tabular-nums text-xs font-semibold opacity-75 pt-0.5 shrink-0">02</span>
          <div class="min-w-0">
            <div class="text-sm font-semibold tracking-tight">Plugins &rarr; Development</div>
            <div class="text-sm opacity-80 mt-0.5 leading-relaxed">
              In Figma, open the menu and go to <span class="font-medium">Plugins &rarr; Development</span>.
            </div>
          </div>
        </li>
        <li class="flex items-start gap-4 p-4 rounded-2xl bg-studio-bg/[0.08] border border-studio-bg/15">
          <span class="font-mono tabular-nums text-xs font-semibold opacity-75 pt-0.5 shrink-0">03</span>
          <div class="min-w-0">
            <div class="text-sm font-semibold tracking-tight">Import plugin from manifest&hellip;</div>
            <div class="text-sm opacity-80 mt-0.5 leading-relaxed">
              Select <code class="font-mono text-xs">manifest.json</code> inside the unzipped folder.
            </div>
          </div>
        </li>
      </ol>
    </div>
  </section>

  <!-- Monumental Closing Typographic Section -->
  <section use:reveal class="max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
    <h2
      class="voronoi-wordmark font-display font-[579] tracking-[-0.04em] leading-[0.95] pb-[0.08em] text-balance"
      style="font-size: clamp(3rem, 11vw, 8.25rem);"
    >
      Start today.
    </h2>
    <p class="mt-4 text-base sm:text-lg text-studio-muted leading-relaxed max-w-[44ch] mx-auto text-pretty">
      Open the studio with a sample composition or drop your own artwork.
    </p>
    <div class="flex flex-wrap items-center justify-center gap-3 mt-8">
      <button
        type="button"
        onclick={onOpenSample}
        class="inline-flex items-center justify-center min-h-[44px] h-11 px-6 rounded-full bg-studio-accent text-studio-accent-ink text-sm font-medium hover:opacity-90 motion-safe:enabled:active:scale-[0.96] transition-[opacity,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-bg"
      >
        Launch with sample
      </button>
      <button
        type="button"
        onclick={onOpenStudio}
        class="inline-flex items-center justify-center min-h-[44px] h-11 px-6 rounded-full border border-studio-border-strong bg-studio-panel text-studio-ink text-sm font-medium hover:border-studio-ink motion-safe:enabled:active:scale-[0.96] transition-[border-color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60"
      >
        Open empty studio
      </button>
    </div>
  </section>

  <footer class="max-w-6xl mx-auto px-5 sm:px-8 py-8 border-t border-studio-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-studio-subtle">
    <span class="font-display font-[579] text-studio-muted">Voronoi Shatter</span>
    <span>Space to reseed &middot; Hold C to compare &middot; Ctrl+Z to undo &middot; Ctrl+S to export</span>
  </footer>
</div>

<style>
  .voronoi-wordmark {
    color: transparent;
    -webkit-text-fill-color: transparent;
    background-color: #18181c;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 160'%3E%3Crect width='320' height='160' fill='%2318181c'/%3E%3Cg stroke='%23111113' stroke-width='2' stroke-linejoin='round'%3E%3Cpolygon points='0,0 68,0 46,44 0,56' fill='%23d94826'/%3E%3Cpolygon points='68,0 148,0 112,62 46,44' fill='%23f59e0b'/%3E%3Cpolygon points='148,0 234,0 186,38 112,62' fill='%230d9488'/%3E%3Cpolygon points='234,0 320,0 266,58 186,38' fill='%231d4ed8'/%3E%3Cpolygon points='320,0 320,56 266,58' fill='%23d94826'/%3E%3Cpolygon points='0,56 46,44 62,106 0,114' fill='%23312e81'/%3E%3Cpolygon points='46,44 112,62 62,106' fill='%23f06449'/%3E%3Cpolygon points='112,62 186,38 208,100 134,122' fill='%234338ca'/%3E%3Cpolygon points='112,62 134,122 62,106' fill='%2314b8a6'/%3E%3Cpolygon points='186,38 266,58 208,100' fill='%23fb923c'/%3E%3Cpolygon points='266,58 278,118 208,100' fill='%23b45309'/%3E%3Cpolygon points='266,58 320,56 320,114 278,118' fill='%230f766e'/%3E%3Cpolygon points='0,114 62,106 68,160 0,160' fill='%23f59e0b'/%3E%3Cpolygon points='62,106 134,122 148,160 68,160' fill='%23d94826'/%3E%3Cpolygon points='134,122 208,100 234,160 148,160' fill='%232563eb'/%3E%3Cpolygon points='208,100 278,118 234,160' fill='%23f06449'/%3E%3Cpolygon points='278,118 320,114 320,160 234,160' fill='%23334155'/%3E%3C/g%3E%3Cg fill='%23ffffff' fill-opacity='0.14'%3E%3Cpolygon points='68,0 148,0 112,62'/%3E%3Cpolygon points='186,38 266,58 208,100'/%3E%3Cpolygon points='112,62 134,122 62,106'/%3E%3C/g%3E%3C/svg%3E");
    background-size: 320px 160px;
    background-position: center;
    -webkit-background-clip: text;
    background-clip: text;
    filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.14));
  }

  :global(html.dark) .voronoi-wordmark {
    filter: drop-shadow(0 16px 34px rgba(0, 0, 0, 0.55)) brightness(1.06);
  }

  @media (forced-colors: active) {
    .voronoi-wordmark {
      color: CanvasText;
      -webkit-text-fill-color: CanvasText;
      background: none;
      filter: none;
    }
  }
</style>
