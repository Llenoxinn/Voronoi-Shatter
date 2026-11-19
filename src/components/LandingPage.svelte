<script>
  import { onMount } from 'svelte';
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

  let srcPixels = null;
  let lastHeroVoronoi = null;
  const W = 840;
  const H = 480;

  const HERO_METRICS = [
    { id: 'euclidean', label: 'Crystal' },
    { id: 'manhattan', label: 'Diamond' },
    { id: 'chebyshev', label: 'Grid' },
  ];

  const PRESET_COLORS = [
    'bg-[#d94826] text-white',
    'bg-[#111113] text-[#f4f3ef]',
    'bg-[#0d9488] text-white',
    'bg-[#1d4ed8] text-white',
    'bg-[#b45309] text-white',
    'bg-[#334155] text-white',
  ];

  function buildHeroSource() {
    const oc = document.createElement('canvas');
    oc.width = W;
    oc.height = H;
    const ctx = oc.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#141418');
    grad.addColorStop(0.45, '#2b2240');
    grad.addColorStop(1, '#d94826');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const sun = ctx.createRadialGradient(W * 0.36, H * 0.42, 16, W * 0.36, H * 0.42, 210);
    sun.addColorStop(0, '#fde68a');
    sun.addColorStop(0.5, '#f97316');
    sun.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(W * 0.36, H * 0.42, 210, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(13, 148, 136, 0.85)';
    ctx.beginPath();
    ctx.moveTo(W * 0.54, H * 0.14);
    ctx.lineTo(W * 0.88, H * 0.78);
    ctx.lineTo(W * 0.42, H * 0.86);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(244, 243, 239, 0.16)';
    ctx.fillRect(W * 0.1, H * 0.62, 240, 100);

    srcPixels = ctx.getImageData(0, 0, W, H).data;
  }

  function renderHero() {
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
    lastHeroVoronoi = { seeds, avgColors, borderWidth: heroBorderWidth };
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
    heroCanvas.width = W;
    heroCanvas.height = H;
    heroCanvas.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0);
  }

  function exportHeroSVG() {
    if (!lastHeroVoronoi) return;
    const svg = generateVoronoiSVG(
      W,
      H,
      lastHeroVoronoi.seeds,
      lastHeroVoronoi.avgColors,
      {
        borderWidth: lastHeroVoronoi.borderWidth,
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
    renderHero();
  }

  function selectHeroPreset(preset) {
    activeHeroPreset = preset.name;
    if (typeof preset.cellCount === 'number') heroCellCount = Math.max(24, Math.min(160, preset.cellCount));
    if (typeof preset.refraction === 'number') heroRefraction = preset.refraction;
    if (typeof preset.bevel === 'number') heroBevel = preset.bevel;
    if (typeof preset.borderWidth === 'number') heroBorderWidth = preset.borderWidth;
    renderHero();
  }

  function launchDemoInStudio() {
    onOpenDemo?.({
      cellCount: heroCellCount,
      metric: heroMetric,
      wireframe: heroWireframe,
      refraction: heroRefraction,
      bevel: heroBevel,
      dispersion: heroDispersion,
      impact: heroImpact,
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
    node.style.transform = 'translateY(18px)';
    node.style.transition = 'opacity 550ms var(--ease-spring), transform 550ms var(--ease-spring)';

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          node.style.opacity = '1';
          node.style.transform = 'translateY(0)';
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(node);
    return { destroy: () => io.disconnect() };
  }

  onMount(() => {
    buildHeroSource();
    renderHero();
  });
</script>

<div class="min-h-[100dvh] bg-studio-bg text-studio-ink overflow-x-hidden">
  <!-- Fluid Island Floating Nav -->
  <div class="sticky top-4 z-30 px-4 pointer-events-none">
    <header class="pointer-events-auto max-w-4xl mx-auto flex items-center justify-between h-12 pl-4 pr-2 rounded-full backdrop-blur-xl bg-studio-panel border border-studio-border shadow-[0_12px_32px_rgba(17,17,19,0.07),inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]">
      <a href="#top" class="flex items-center gap-2 text-studio-ink no-underline">
        <svg class="w-4 h-4 text-studio-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
          <line x1="12" y1="22" x2="12" y2="12" />
          <line x1="22" y1="8.5" x2="12" y2="12" />
          <line x1="2" y1="8.5" x2="12" y2="12" />
        </svg>
        <span class="font-semibold text-sm tracking-tight">Voronoi Shatter</span>
      </a>

      <nav class="hidden md:flex items-center gap-7 text-xs font-medium text-studio-muted">
        <a href="#optics" class="hover:text-studio-ink transition-colors duration-150">Optics</a>
        <a href="#presets" class="hover:text-studio-ink transition-colors duration-150">Presets</a>
        <a href="#figma-plugin" class="hover:text-studio-ink transition-colors duration-150">Figma Plugin</a>
      </nav>

      <div class="flex items-center gap-1.5">
        <ThemeToggle />
        <button
          type="button"
          onclick={onOpenStudio}
          class="inline-flex items-center justify-center h-8 px-4 rounded-full bg-studio-ink text-studio-bg text-xs font-medium hover:opacity-90 active:scale-[0.96] transition-[opacity,transform] duration-150"
        >
          Open Studio
        </button>
      </div>
    </header>
  </div>

  <!-- Hero: Editorial Headline + Monumental Type Behind Interactive Window -->
  <section id="top" class="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-16 md:pt-16 md:pb-24">
    <div class="max-w-4xl">
      <h1 class="font-medium text-4xl sm:text-6xl lg:text-[4.25rem] leading-[1.03] tracking-[-0.035em] text-studio-ink text-balance">
        You give it pixels.<br />
        We fracture them into crystal.
      </h1>
      <p class="mt-5 text-base sm:text-lg text-studio-muted leading-relaxed max-w-[46ch] text-pretty">
        Per-shard optical refraction, directional bevels, and RGB dispersion—running locally in your browser.
      </p>

      <div class="flex flex-wrap items-center gap-3 mt-7">
        <button
          type="button"
          onclick={onOpenSample}
          class="group inline-flex items-center gap-3 h-11 pl-5 pr-2 rounded-full bg-studio-accent text-studio-accent-ink text-sm font-medium hover:opacity-95 active:scale-[0.96] transition-[opacity,transform] duration-150"
        >
          <span>Try live sample</span>
          <span class="w-7 h-7 rounded-full bg-black/15 flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-[1px] transition-transform duration-200 ease-[var(--ease-out)]">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </span>
        </button>
        <button
          type="button"
          onclick={() => fileInput.click()}
          class="inline-flex items-center justify-center h-11 px-6 rounded-full border border-studio-border-strong bg-studio-panel text-studio-ink text-sm font-medium hover:border-studio-ink active:scale-[0.96] transition-[border-color,transform] duration-150"
        >
          Upload image
        </button>
        <input type="file" accept="image/*" bind:this={fileInput} onchange={handleFileChange} aria-label="Upload image to studio" />
      </div>
    </div>

    <!-- Monumental Display Wordmark Behind Double-Bezel App Frame -->
    <div class="relative mt-14 md:mt-20">
      <div
        aria-hidden="true"
        class="select-none pointer-events-none font-bold tracking-[-0.055em] leading-[0.82] text-studio-ink/[0.08] dark:text-studio-ink/[0.1] text-center"
        style="font-size: clamp(4.5rem, 16.5vw, 13.5rem);"
      >
        SHATTER
      </div>

      <div class="relative -mt-6 sm:-mt-10 md:-mt-14 rounded-[1.75rem] p-1.5 bg-studio-ink/[0.04] dark:bg-white/[0.04] ring-1 ring-studio-border">
        <div class="rounded-[calc(1.75rem-0.375rem)] bg-studio-panel overflow-hidden border border-studio-border shadow-[0_28px_80px_rgba(17,17,19,0.12),inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[0_32px_90px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <!-- Studio Top Workstation Bar -->
          <div class="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-studio-panel border-b border-studio-border">
            <div class="flex items-center gap-2.5">
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-studio-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                  <line x1="12" y1="22" x2="12" y2="12" />
                  <line x1="22" y1="8.5" x2="12" y2="12" />
                  <line x1="2" y1="8.5" x2="12" y2="12" />
                </svg>
                <span class="text-xs font-semibold text-studio-ink">Studio Preview</span>
              </div>
              <span class="hidden sm:inline-block px-2 py-0.5 rounded bg-studio-elevated font-mono text-[10px] text-studio-muted tabular-nums">
                {W}&times;{H} &middot; {heroCellCount} shards
              </span>
            </div>

            <div class="flex items-center gap-1.5">
              <button
                type="button"
                onclick={exportHeroSVG}
                class="h-7 px-2.5 rounded-md border border-studio-border bg-studio-elevated/70 hover:bg-studio-elevated text-[11px] font-medium text-studio-ink active:scale-[0.96] transition-[background-color,transform] duration-150"
              >
                Export SVG
              </button>
              <button
                type="button"
                onclick={launchDemoInStudio}
                class="h-7 px-3 rounded-md bg-studio-ink text-studio-bg text-[11px] font-medium hover:opacity-90 active:scale-[0.96] transition-[opacity,transform] duration-150"
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
                  renderHero();
                }}
                title={heroImpact ? 'Radial impact active — click to toggle grid' : 'Click to enable radial impact'}
                aria-label="Toggle radial impact"
                aria-pressed={Boolean(heroImpact)}
                class="w-7 h-7 rounded-md inline-flex items-center justify-center active:scale-[0.96] {heroImpact
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
                  renderHero();
                }}
                title="Reseed shards"
                aria-label="Reseed shards"
                class="w-7 h-7 rounded-md inline-flex items-center justify-center text-studio-muted hover:text-studio-ink hover:bg-studio-elevated active:scale-[0.96]"
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
                  renderHero();
                }}
                title="Cutout gaps"
                aria-label="Toggle cutout gaps"
                aria-pressed={heroCutout}
                class="w-7 h-7 rounded-md inline-flex items-center justify-center active:scale-[0.96] {heroCutout
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
                  renderHero();
                }}
                title="Wireframe only"
                aria-label="Toggle wireframe"
                aria-pressed={heroWireframe}
                class="w-7 h-7 rounded-md inline-flex items-center justify-center active:scale-[0.96] {heroWireframe
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
            <div class="p-3 sm:p-4 flex items-center justify-center bg-studio-elevated/55 dark:bg-[#0a0a0c]">
              <div
                class="relative w-full rounded-lg overflow-hidden ring-1 ring-black/10 dark:ring-white/10 shadow-[0_14px_36px_rgba(17,17,19,0.16)]"
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
            <div class="bg-studio-panel border-t lg:border-t-0 lg:border-l border-studio-border p-3.5 space-y-3.5 text-left">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-[11px] font-semibold text-studio-ink">Presets</span>
                  <span class="text-[10px] text-studio-subtle">Click canvas to fracture</span>
                </div>
                <div class="grid grid-cols-4 lg:grid-cols-2 gap-1">
                  {#each presets.slice(0, 4) as preset}
                    {@const active = activeHeroPreset === preset.name}
                    <button
                      type="button"
                      onclick={() => selectHeroPreset(preset)}
                      class="h-7 px-2 rounded-md text-[11px] font-medium border active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 {active
                        ? 'bg-studio-accent text-studio-accent-ink border-studio-accent'
                        : 'bg-studio-elevated/60 text-studio-muted border-studio-border hover:text-studio-ink'}"
                    >
                      {preset.name}
                    </button>
                  {/each}
                </div>
              </div>

              <div class="pt-3 border-t border-studio-border">
                <span class="block text-[11px] font-semibold text-studio-ink mb-1.5">Metric</span>
                <div class="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-studio-elevated border border-studio-border" role="group" aria-label="Shard metric">
                  {#each HERO_METRICS as metric}
                    {@const active = heroMetric === metric.id}
                    <button
                      type="button"
                      onclick={() => {
                        heroMetric = metric.id;
                        renderHero();
                      }}
                      class="h-6 rounded-md text-[11px] font-medium active:scale-[0.96] transition-[background-color,color,transform] duration-150 {active
                        ? 'bg-studio-panel text-studio-ink shadow-sm'
                        : 'text-studio-muted hover:text-studio-ink'}"
                    >
                      {metric.label}
                    </button>
                  {/each}
                </div>
              </div>

              <!-- Mobile/Tablet quick tool toggles (mirrors left ToolRail) -->
              <div class="flex lg:hidden items-center gap-1.5 pt-2 border-t border-studio-border">
                <button
                  type="button"
                  onclick={() => {
                    heroSeed = (heroSeed + 7919) % 999983;
                    renderHero();
                  }}
                  class="flex-1 h-8 rounded-md text-[11px] font-medium bg-studio-elevated text-studio-ink active:scale-[0.96]"
                >
                  Reseed
                </button>
                <button
                  type="button"
                  onclick={() => {
                    heroCutout = !heroCutout;
                    renderHero();
                  }}
                  aria-pressed={heroCutout}
                  class="flex-1 h-8 rounded-md text-[11px] font-medium border active:scale-[0.96] {heroCutout
                    ? 'bg-studio-ink text-studio-bg border-studio-ink'
                    : 'bg-studio-elevated/60 text-studio-muted border-studio-border'}"
                >
                  Cutout
                </button>
                <button
                  type="button"
                  onclick={() => {
                    heroWireframe = !heroWireframe;
                    renderHero();
                  }}
                  aria-pressed={heroWireframe}
                  class="flex-1 h-8 rounded-md text-[11px] font-medium border active:scale-[0.96] {heroWireframe
                    ? 'bg-studio-ink text-studio-bg border-studio-ink'
                    : 'bg-studio-elevated/60 text-studio-muted border-studio-border'}"
                >
                  Wireframe
                </button>
              </div>

              <div class="pt-3 border-t border-studio-border space-y-2.5">
                <label class="block space-y-1">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="text-studio-muted font-medium">Cells</span>
                    <span class="font-mono font-semibold text-studio-ink tabular-nums">{heroCellCount}</span>
                  </div>
                  <input type="range" min="24" max="160" step="1" bind:value={heroCellCount} oninput={() => renderHero()} class="w-full" />
                </label>

                <label class="block space-y-1">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="text-studio-muted font-medium">Refraction</span>
                    <span class="font-mono font-semibold text-studio-ink tabular-nums">{heroRefraction}%</span>
                  </div>
                  <input type="range" min="0" max="100" step="1" bind:value={heroRefraction} oninput={() => renderHero()} class="w-full" />
                </label>

                <label class="block space-y-1">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="text-studio-muted font-medium">Bevel</span>
                    <span class="font-mono font-semibold text-studio-ink tabular-nums">{heroBevel}%</span>
                  </div>
                  <input type="range" min="0" max="100" step="1" bind:value={heroBevel} oninput={() => renderHero()} class="w-full" />
                </label>

                <label class="block space-y-1">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="text-studio-muted font-medium">Dispersion</span>
                    <span class="font-mono font-semibold text-studio-ink tabular-nums">{heroDispersion}%</span>
                  </div>
                  <input type="range" min="0" max="100" step="1" bind:value={heroDispersion} oninput={() => renderHero()} class="w-full" />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Bold Color-Blocked Showcase Card -->
  <section id="optics" use:reveal class="max-w-6xl mx-auto px-5 sm:px-8 py-12 md:py-20">
    <div class="rounded-3xl bg-studio-accent text-studio-accent-ink p-8 sm:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
      <div class="lg:col-span-5">
        <h2 class="font-medium text-3xl sm:text-5xl leading-[1.05] tracking-[-0.03em] text-balance">
          Freedom to fracture. Zero uploads.
        </h2>
        <p class="mt-4 text-sm sm:text-base opacity-85 leading-relaxed max-w-[34ch]">
          Every pixel stays in your browser's Web Worker. Tune optics in real time and paste straight into Figma.
        </p>
      </div>

      <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
        <div>
          <h3 class="font-semibold text-lg tracking-tight">Optical Refraction</h3>
          <p class="mt-1.5 text-sm opacity-85 leading-relaxed">
            Displaces sampled pixels per cell along a deterministic vector for real glass depth.
          </p>
        </div>

        <div>
          <h3 class="font-semibold text-lg tracking-tight">RGB Dispersion</h3>
          <p class="mt-1.5 text-sm opacity-85 leading-relaxed">
            Splits red and blue channels along shard boundaries for chromatic prism edges.
          </p>
        </div>

        <div>
          <h3 class="font-semibold text-lg tracking-tight">Radial Impact</h3>
          <p class="mt-1.5 text-sm opacity-85 leading-relaxed">
            Click anywhere on your artwork to cluster smaller shards around an epicenter.
          </p>
        </div>

        <div>
          <h3 class="font-semibold text-lg tracking-tight">3D Facet Bevels</h3>
          <p class="mt-1.5 text-sm opacity-85 leading-relaxed">
            Directional rim highlights paired with smoothstep anti-aliased fracture borders.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Color-Coded Preset Strip + Live Specimen -->
  <section id="presets" use:reveal class="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28">
    <div class="max-w-2xl mb-10">
      <h2 class="font-medium text-3xl sm:text-5xl leading-[1.06] tracking-[-0.03em] text-studio-ink text-balance">
        Six calibrated presets, ready in one click.
      </h2>
    </div>

    <!-- Color-blocked horizontal preset tabs (like reference) -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {#each presets as preset, idx}
        {@const active = activeHeroPreset === preset.name}
        <button
          type="button"
          onclick={() => {
            selectHeroPreset(preset);
            onOpenPreset(preset);
          }}
          class="flex flex-col justify-between p-4 rounded-2xl text-left min-h-[128px] active:scale-[0.96] transition-[transform,opacity] duration-150 {PRESET_COLORS[idx % PRESET_COLORS.length]} {active
            ? 'ring-2 ring-studio-ink ring-offset-2 ring-offset-studio-bg'
            : 'hover:opacity-95'}"
        >
          <div>
            <div class="font-semibold text-base tracking-tight">{preset.name}</div>
            <div class="text-xs opacity-80 mt-0.5">{preset.desc}</div>
          </div>

          <div class="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-mono tabular-nums">
            <span>{preset.refraction}%</span>
            <span class="opacity-75">{preset.cellCount}c</span>
          </div>
        </button>
      {/each}
    </div>
  </section>

  <!-- High-Contrast Figma Plugin Download Section -->
  <section id="figma-plugin" use:reveal class="max-w-6xl mx-auto px-5 sm:px-8 py-10 md:py-16">
    <div class="rounded-3xl bg-studio-ink text-studio-bg p-8 sm:p-12 lg:p-14 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
      <div class="lg:col-span-6">
        <h2 class="font-medium text-3xl sm:text-4xl leading-[1.06] tracking-[-0.03em] text-balance">
          Figma Plugin
        </h2>
        <p class="mt-3 text-sm sm:text-base opacity-80 leading-relaxed max-w-[40ch] text-pretty">
          Fracture selected frames and layers directly inside Figma with live optical controls and vector export.
        </p>

        <div class="mt-7">
          <a
            href="./voronoi-shatter-figma-plugin.zip"
            download="voronoi-shatter-figma-plugin.zip"
            class="inline-flex items-center gap-2.5 h-11 px-6 rounded-full bg-studio-accent text-studio-accent-ink text-sm font-medium hover:opacity-95 active:scale-[0.96] transition-[opacity,transform] duration-150 no-underline"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download Figma Plugin</span>
          </a>
        </div>
      </div>

      <ol class="lg:col-span-6 space-y-4">
        <li class="flex items-start gap-4 p-4 rounded-2xl bg-studio-bg/[0.08] border border-studio-bg/15">
          <span class="font-mono tabular-nums text-xs font-semibold opacity-70 pt-0.5">01</span>
          <div>
            <div class="text-sm font-semibold tracking-tight">Unzip</div>
            <div class="text-xs opacity-75 mt-0.5">Extract <code class="font-mono">voronoi-shatter-figma-plugin.zip</code> to a local folder.</div>
          </div>
        </li>
        <li class="flex items-start gap-4 p-4 rounded-2xl bg-studio-bg/[0.08] border border-studio-bg/15">
          <span class="font-mono tabular-nums text-xs font-semibold opacity-70 pt-0.5">02</span>
          <div>
            <div class="text-sm font-semibold tracking-tight">Plugins &rarr; Development</div>
            <div class="text-xs opacity-75 mt-0.5">In Figma, open the menu and go to <span class="font-medium">Plugins &rarr; Development</span>.</div>
          </div>
        </li>
        <li class="flex items-start gap-4 p-4 rounded-2xl bg-studio-bg/[0.08] border border-studio-bg/15">
          <span class="font-mono tabular-nums text-xs font-semibold opacity-70 pt-0.5">03</span>
          <div>
            <div class="text-sm font-semibold tracking-tight">Import plugin from manifest...</div>
            <div class="text-xs opacity-75 mt-0.5">Select <code class="font-mono">manifest.json</code> inside the unzipped folder.</div>
          </div>
        </li>
      </ol>
    </div>
  </section>

  <!-- Monumental Closing Typographic Section -->
  <section use:reveal class="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-20 md:pt-20 md:pb-28 text-center">
    <h2
      class="font-bold tracking-[-0.045em] leading-[0.95] text-studio-ink select-none"
      style="font-size: clamp(3.5rem, 11vw, 8.5rem);"
    >
      Start today.
    </h2>
    <p class="mt-5 text-base text-studio-muted max-w-[42ch] mx-auto text-pretty">
      Open the studio with a sample composition or drop your own artwork.
    </p>
    <div class="flex flex-wrap items-center justify-center gap-3 mt-8">
      <button
        type="button"
        onclick={onOpenSample}
        class="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-studio-accent text-studio-accent-ink text-sm font-medium hover:opacity-90 active:scale-[0.96] transition-[opacity,transform] duration-150"
      >
        Launch with sample
      </button>
      <button
        type="button"
        onclick={onOpenStudio}
        class="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-studio-border-strong bg-studio-panel text-studio-ink text-sm font-medium hover:border-studio-ink active:scale-[0.96] transition-[border-color,transform] duration-150"
      >
        Open empty studio
      </button>
    </div>
  </section>

  <footer class="max-w-6xl mx-auto px-5 sm:px-8 py-8 border-t border-studio-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-studio-subtle">
    <span>Voronoi Shatter</span>
    <span>Space to reseed &middot; Hold C to compare &middot; Ctrl+S to export</span>
  </footer>
</div>
