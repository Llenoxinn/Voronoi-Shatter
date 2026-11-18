<script>
  import { onMount } from 'svelte';
  import { generateSeeds, computeVoronoi, renderVoronoi } from '../lib/voronoi.js';

  let {
    presets = [],
    onOpenStudio,
    onOpenSample,
    onOpenPreset,
    onFile,
  } = $props();

  let heroCanvas = $state();
  let heroImpact = $state({ x: 0.38, y: 0.44 });
  let heroSeed = $state(42071);
  let isDark = $state(false);
  let fileInput = $state();

  let srcPixels = null;
  const W = 720;
  const H = 440;

  function toggleTheme() {
    const root = document.documentElement;
    root.classList.add('theme-switching');
    isDark = !isDark;
    root.classList.toggle('dark', isDark);
    void root.offsetHeight;
    requestAnimationFrame(() => {
      root.classList.remove('theme-switching');
    });
  }

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

    const sun = ctx.createRadialGradient(W * 0.36, H * 0.42, 16, W * 0.36, H * 0.42, 190);
    sun.addColorStop(0, '#fde68a');
    sun.addColorStop(0.5, '#f97316');
    sun.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(W * 0.36, H * 0.42, 190, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(13, 148, 136, 0.85)';
    ctx.beginPath();
    ctx.moveTo(W * 0.54, H * 0.14);
    ctx.lineTo(W * 0.88, H * 0.78);
    ctx.lineTo(W * 0.42, H * 0.86);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(244, 243, 239, 0.16)';
    ctx.fillRect(W * 0.1, H * 0.62, 220, 96);

    srcPixels = ctx.getImageData(0, 0, W, H).data;
  }

  function renderHero() {
    if (!heroCanvas || !srcPixels) return;
    const seeds = generateSeeds(W, H, 72, 75, heroSeed, heroImpact);
    const { nearestSeed, dist1Sq, dist2Sq, avgColors } = computeVoronoi(srcPixels, W, H, seeds);
    const out = renderVoronoi(
      W,
      H,
      nearestSeed,
      dist1Sq,
      dist2Sq,
      avgColors,
      seeds,
      srcPixels,
      1.5,
      [17, 17, 19],
      65,
      55,
      24,
      null,
      'normal',
      0
    );
    heroCanvas.width = W;
    heroCanvas.height = H;
    heroCanvas.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0);
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

  function handleFileChange(e) {
    if (e.target.files.length > 0) {
      onFile(e.target.files[0]);
      e.target.value = '';
    }
  }

  onMount(() => {
    buildHeroSource();
    renderHero();
  });
</script>

<div class="min-h-[100dvh] bg-studio-bg text-studio-ink overflow-x-hidden">
  <!-- Minimal Editorial Top Bar -->
  <header class="sticky top-0 z-30 backdrop-blur-xl bg-studio-bg/80 border-b border-studio-border">
    <div class="max-w-6xl mx-auto flex items-center justify-between h-14 px-5 sm:px-8">
      <a href="#top" class="flex items-center gap-2.5 text-studio-ink no-underline">
        <svg class="w-4 h-4 text-studio-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
          <line x1="12" y1="22" x2="12" y2="12" />
          <line x1="22" y1="8.5" x2="12" y2="12" />
          <line x1="2" y1="8.5" x2="12" y2="12" />
        </svg>
        <span class="font-display font-bold text-sm tracking-[-0.03em]">Voronoi Shatter</span>
      </a>

      <nav class="hidden md:flex items-center gap-7 text-xs font-medium text-studio-muted">
        <a href="#optics" class="hover:text-studio-ink transition-colors duration-150">Optics</a>
        <a href="#presets" class="hover:text-studio-ink transition-colors duration-150">Presets</a>
        <a href="#workflow" class="hover:text-studio-ink transition-colors duration-150">Workflow</a>
      </nav>

      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={toggleTheme}
          aria-label={isDark ? 'Switch to light studio theme' : 'Switch to darkroom theme'}
          class="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-studio-border bg-studio-panel text-studio-muted hover:text-studio-ink active:scale-[0.96] transition-[color,transform] duration-150"
        >
          {#if isDark}
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          {:else}
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          {/if}
        </button>

        <button
          type="button"
          onclick={onOpenStudio}
          class="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-studio-ink text-studio-bg text-[11px] font-mono uppercase tracking-[0.08em] font-medium hover:opacity-90 active:scale-[0.96] transition-[opacity,transform] duration-150"
        >
          Open Studio
        </button>
      </div>
    </div>
  </header>

  <!-- Hero: Asymmetric Editorial Header + Live Interactive Canvas Frame -->
  <section id="top" class="max-w-6xl mx-auto px-5 sm:px-8 pt-14 pb-20 md:pt-20 md:pb-28">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-end">
      <div class="lg:col-span-8">
        <span class="inline-block text-[11px] font-mono uppercase tracking-[0.16em] text-studio-accent mb-4">
          Client-Side Optical Fracture Instrument
        </span>
        <h1 class="font-display font-bold text-4xl sm:text-5xl lg:text-[4rem] leading-[1.02] tracking-[-0.03em] text-studio-ink max-w-4xl">
          Fracture flat imagery into optical crystal.
        </h1>
      </div>

      <div class="lg:col-span-4 flex flex-col items-start gap-5">
        <p class="text-sm sm:text-base text-studio-muted leading-[1.55] max-w-[40ch]">
          Real-time Voronoi tessellation with per-shard refraction, directional facet bevels, and RGB dispersion—running locally in your browser.
        </p>
        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onclick={onOpenSample}
            class="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-studio-accent text-studio-accent-ink text-xs font-mono uppercase tracking-[0.08em] font-medium hover:opacity-90 active:scale-[0.96] transition-[opacity,transform] duration-150"
          >
            Try Live Sample
          </button>
          <button
            type="button"
            onclick={() => fileInput.click()}
            class="inline-flex items-center justify-center h-11 px-5 rounded-xl border border-studio-border-strong bg-studio-panel text-studio-ink text-xs font-mono uppercase tracking-[0.08em] hover:border-studio-ink active:scale-[0.96] transition-[border-color,transform] duration-150"
          >
            Upload Image
          </button>
          <input type="file" accept="image/*" bind:this={fileInput} onchange={handleFileChange} aria-label="Upload image to studio" />
        </div>
      </div>
    </div>

    <!-- Live Interactive App Showcase Frame -->
    <div class="mt-12 rounded-2xl border border-studio-border-strong bg-studio-panel p-2 sm:p-3 shadow-[0_24px_70px_rgba(17,17,19,0.09),inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[0_28px_80px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div class="flex items-center justify-between px-3 py-2 border-b border-studio-border text-[10px] font-mono text-studio-muted">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-studio-accent"></span>
          <span>Interactive preview — click anywhere on the artwork to move the impact point</span>
        </div>
        <span class="hidden sm:inline tabular-nums">72 cells &middot; refraction 65% &middot; dispersion 24%</span>
      </div>

      <div class="relative mt-2 rounded-xl overflow-hidden bg-studio-bg">
        <canvas
          bind:this={heroCanvas}
          onclick={handleHeroClick}
          class="block w-full h-auto cursor-crosshair"
        ></canvas>
        <div
          aria-hidden="true"
          class="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-studio-accent bg-studio-bg/60 pointer-events-none"
          style="left: {heroImpact.x * 100}%; top: {heroImpact.y * 100}%;"
        ></div>
      </div>
    </div>
  </section>

  <!-- Gapless Bento Grid: Optics & Architecture -->
  <section id="optics" class="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28 border-t border-studio-border">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
      <div>
        <span class="text-[11px] font-mono uppercase tracking-[0.16em] text-studio-accent">Engine</span>
        <h2 class="font-display font-bold text-3xl sm:text-4xl tracking-[-0.03em] text-studio-ink mt-2">
          Not another flat polygon filter.
        </h2>
      </div>
      <p class="text-sm text-studio-muted max-w-[42ch]">
        Built for art directors, poster designers, and front-end builders who need crisp geometry without leaving the browser.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-12 grid-flow-dense gap-4">
      <article class="md:col-span-7 p-7 rounded-2xl bg-studio-panel border border-studio-border flex flex-col justify-between min-h-[220px]">
        <div class="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.12em] text-studio-subtle">
          <span>Optical Refraction</span>
          <span class="tabular-nums text-studio-ink">0–100%</span>
        </div>
        <div class="mt-8">
          <h3 class="font-display font-semibold text-xl tracking-[-0.02em] text-studio-ink">
            Per-shard pixel displacement &amp; RGB dispersion
          </h3>
          <p class="mt-2 text-sm text-studio-muted leading-relaxed max-w-[52ch]">
            Each Voronoi cell samples displaced source pixels along a deterministic vector and splits red and blue channels for authentic glass prism edges.
          </p>
        </div>
      </article>

      <article class="md:col-span-5 p-7 rounded-2xl bg-studio-ink text-studio-bg flex flex-col justify-between min-h-[220px]">
        <div class="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.12em] opacity-65">
          <span>Radial Fracture</span>
          <span>Click-to-Impact</span>
        </div>
        <div class="mt-8">
          <h3 class="font-display font-semibold text-xl tracking-[-0.02em]">
            Cluster shards from any focal point
          </h3>
          <p class="mt-2 text-sm opacity-75 leading-relaxed">
            Click anywhere on the canvas to switch from a uniform grid to a golden-angle radial fracture centered on your subject.
          </p>
        </div>
      </article>

      <article class="md:col-span-5 p-7 rounded-2xl bg-studio-elevated border border-studio-border flex flex-col justify-between min-h-[220px]">
        <div class="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.12em] text-studio-subtle">
          <span>Surface Finish</span>
          <span class="tabular-nums text-studio-ink">Smoothstep AA</span>
        </div>
        <div class="mt-8">
          <h3 class="font-display font-semibold text-xl tracking-[-0.02em] text-studio-ink">
            3D facet bevels &amp; anti-aliased borders
          </h3>
          <p class="mt-2 text-sm text-studio-muted leading-relaxed">
            Directional top-left rim highlights and sub-pixel edge falloff eliminate staircase artifacts at any border thickness.
          </p>
        </div>
      </article>

      <article class="md:col-span-7 p-7 rounded-2xl bg-studio-panel border border-studio-border flex flex-col justify-between min-h-[220px]">
        <div class="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.12em] text-studio-subtle">
          <span>Worker Cache</span>
          <span>Zero Server Uploads</span>
        </div>
        <div class="mt-8">
          <h3 class="font-display font-semibold text-xl tracking-[-0.02em] text-studio-ink">
            Cached distance fields for instant slider tuning
          </h3>
          <p class="mt-2 text-sm text-studio-muted leading-relaxed max-w-[52ch]">
            Voronoi geometry computes once in a dedicated Web Worker; adjusting refraction, bevels, dispersion, blend layers, or borders re-renders in milliseconds.
          </p>
        </div>
      </article>
    </div>
  </section>

  <!-- Presets Audition Section -->
  <section id="presets" class="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28 border-t border-studio-border">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
      <div>
        <span class="text-[11px] font-mono uppercase tracking-[0.16em] text-studio-accent">Presets</span>
        <h2 class="font-display font-bold text-3xl sm:text-4xl tracking-[-0.03em] text-studio-ink mt-2">
          Six calibrated starting points.
        </h2>
      </div>
      <p class="text-sm text-studio-muted">Select any preset to jump straight into the studio.</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {#each presets as preset}
        <button
          type="button"
          onclick={() => onOpenPreset(preset)}
          class="group flex flex-col items-start p-5 rounded-2xl bg-studio-panel border border-studio-border hover:border-studio-accent active:scale-[0.98] transition-[border-color,transform] duration-150 ease-[var(--ease-out)] text-left"
        >
          <div class="flex items-center justify-between w-full">
            <span class="font-display font-semibold text-base text-studio-ink group-hover:text-studio-accent transition-colors duration-150">
              {preset.name}
            </span>
            <span class="text-[10px] font-mono text-studio-subtle tabular-nums">
              {preset.cellCount} cells
            </span>
          </div>
          <span class="text-xs text-studio-muted mt-1">{preset.desc}</span>
          <div class="flex items-center gap-3 mt-4 pt-3 border-t border-studio-border w-full text-[10px] font-mono text-studio-subtle tabular-nums">
            <span>Refraction {preset.refraction}%</span>
            <span>&middot;</span>
            <span>Bevel {preset.bevel}%</span>
            <span>&middot;</span>
            <span>Border {preset.borderWidth}px</span>
          </div>
        </button>
      {/each}
    </div>
  </section>

  <!-- Workflow / Shortcuts Strip -->
  <section id="workflow" class="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28 border-t border-studio-border">
    <div class="rounded-2xl bg-studio-ink text-studio-bg p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
      <div>
        <span class="text-[11px] font-mono uppercase tracking-[0.16em] text-studio-accent">Start Creating</span>
        <h2 class="font-display font-bold text-3xl sm:text-5xl tracking-[-0.03em] mt-2">
          Ready to shatter?
        </h2>
        <p class="mt-3 text-sm opacity-75 max-w-[44ch]">
          Paste straight into Figma with 1-click Copy PNG, or export lossless PNG, JPEG, and WebP files.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onclick={onOpenSample}
          class="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-studio-accent text-studio-accent-ink text-xs font-mono uppercase tracking-[0.08em] font-medium hover:opacity-90 active:scale-[0.96] transition-[opacity,transform] duration-150"
        >
          Launch with Sample
        </button>
        <button
          type="button"
          onclick={onOpenStudio}
          class="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-white/20 text-xs font-mono uppercase tracking-[0.08em] hover:border-white/50 active:scale-[0.96] transition-[border-color,transform] duration-150"
        >
          Empty Studio
        </button>
      </div>
    </div>
  </section>

  <footer class="max-w-6xl mx-auto px-5 sm:px-8 py-8 border-t border-studio-border flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-studio-subtle">
    <span>Voronoi Shatter &mdash; Client-side Svelte 5 + Web Worker Studio</span>
    <span>Space reseed &middot; C compare &middot; Ctrl+S export</span>
  </footer>
</div>
