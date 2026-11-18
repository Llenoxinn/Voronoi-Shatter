<script>
  import { onMount } from 'svelte';
  import { generateSeeds, computeVoronoi, renderVoronoi } from '../lib/voronoi.js';
  import ThemeToggle from './ThemeToggle.svelte';

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
  let fileInput = $state();

  let srcPixels = null;
  const W = 720;
  const H = 440;

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
  <header class="sticky top-0 z-30 backdrop-blur-xl bg-studio-bg/85 border-b border-studio-border">
    <div class="max-w-6xl mx-auto flex items-center justify-between h-14 px-5 sm:px-8">
      <a href="#top" class="flex items-center gap-2.5 text-studio-ink no-underline">
        <svg class="w-4 h-4 text-studio-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
          <line x1="12" y1="22" x2="12" y2="12" />
          <line x1="22" y1="8.5" x2="12" y2="12" />
          <line x1="2" y1="8.5" x2="12" y2="12" />
        </svg>
        <span class="font-semibold text-sm tracking-tight">Voronoi Shatter</span>
      </a>

      <nav class="hidden md:flex items-center gap-7 text-sm text-studio-muted">
        <a href="#optics" class="hover:text-studio-ink transition-colors duration-150">Optics</a>
        <a href="#presets" class="hover:text-studio-ink transition-colors duration-150">Presets</a>
        <a href="#start" class="hover:text-studio-ink transition-colors duration-150">Start</a>
      </nav>

      <div class="flex items-center gap-2">
        <ThemeToggle size="md" />
        <button
          type="button"
          onclick={onOpenStudio}
          class="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-studio-ink text-studio-bg text-xs font-medium hover:opacity-90 active:scale-[0.96] transition-[opacity,transform] duration-150"
        >
          Open Studio
        </button>
      </div>
    </div>
  </header>

  <!-- Hero -->
  <section id="top" class="max-w-6xl mx-auto px-5 sm:px-8 pt-14 pb-20 md:pt-20 md:pb-24">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-end">
      <div class="lg:col-span-8">
        <h1 class="font-semibold text-4xl sm:text-5xl lg:text-[3.75rem] leading-[1.04] tracking-[-0.03em] text-studio-ink max-w-3xl text-balance">
          Fracture flat imagery into optical crystal.
        </h1>
      </div>

      <div class="lg:col-span-4 flex flex-col items-start gap-5">
        <p class="text-base text-studio-muted leading-relaxed max-w-[38ch]">
          Voronoi tessellation with per-shard refraction, directional bevels, and RGB dispersion—rendered in your browser.
        </p>
        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onclick={onOpenSample}
            class="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-studio-accent text-studio-accent-ink text-sm font-medium hover:opacity-90 active:scale-[0.96] transition-[opacity,transform] duration-150"
          >
            Try live sample
          </button>
          <button
            type="button"
            onclick={() => fileInput.click()}
            class="inline-flex items-center justify-center h-11 px-5 rounded-xl border border-studio-border-strong bg-studio-panel text-studio-ink text-sm font-medium hover:border-studio-ink active:scale-[0.96] transition-[border-color,transform] duration-150"
          >
            Upload image
          </button>
          <input type="file" accept="image/*" bind:this={fileInput} onchange={handleFileChange} aria-label="Upload image to studio" />
        </div>
      </div>
    </div>

    <!-- Interactive App Frame -->
    <div class="mt-12 rounded-2xl border border-studio-border-strong bg-studio-panel p-2 sm:p-3 shadow-[0_24px_70px_rgba(17,17,19,0.08)] dark:shadow-[0_28px_80px_rgba(0,0,0,0.6)]">
      <div class="relative rounded-xl overflow-hidden bg-studio-bg">
        <canvas
          bind:this={heroCanvas}
          onclick={handleHeroClick}
          title="Click anywhere to move the fracture origin"
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

  <!-- Bento Capabilities -->
  <section id="optics" class="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-24 border-t border-studio-border">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
      <h2 class="font-semibold text-3xl sm:text-4xl tracking-[-0.025em] text-studio-ink">
        Built for crisp geometry.
      </h2>
      <p class="text-sm text-studio-muted max-w-[40ch]">
        Click-to-impact clustering, sub-pixel edge falloff, and instant re-rendering.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-12 grid-flow-dense gap-4">
      <article class="md:col-span-7 p-7 rounded-2xl bg-studio-panel border border-studio-border flex flex-col justify-between min-h-[200px]">
        <h3 class="font-semibold text-xl tracking-[-0.015em] text-studio-ink">
          Per-shard refraction &amp; RGB dispersion
        </h3>
        <p class="mt-3 text-sm text-studio-muted leading-relaxed max-w-[50ch]">
          Each Voronoi cell samples displaced source pixels along a deterministic vector and splits red and blue channels for prism glass edges.
        </p>
      </article>

      <article class="md:col-span-5 p-7 rounded-2xl bg-studio-ink text-studio-bg flex flex-col justify-between min-h-[200px]">
        <h3 class="font-semibold text-xl tracking-[-0.015em]">
          Radial impact epicenter
        </h3>
        <p class="mt-3 text-sm opacity-75 leading-relaxed">
          Click anywhere on the artwork to cluster shards around a focal point, or reset to a uniform grid.
        </p>
      </article>

      <article class="md:col-span-5 p-7 rounded-2xl bg-studio-elevated border border-studio-border flex flex-col justify-between min-h-[200px]">
        <h3 class="font-semibold text-xl tracking-[-0.015em] text-studio-ink">
          3D bevels &amp; anti-aliased edges
        </h3>
        <p class="mt-3 text-sm text-studio-muted leading-relaxed">
          Directional rim highlights and smoothstep edge falloff keep fracture lines clean at any border width.
        </p>
      </article>

      <article class="md:col-span-7 p-7 rounded-2xl bg-studio-panel border border-studio-border flex flex-col justify-between min-h-[200px]">
        <h3 class="font-semibold text-xl tracking-[-0.015em] text-studio-ink">
          Cached Web Worker &amp; clipboard copy
        </h3>
        <p class="mt-3 text-sm text-studio-muted leading-relaxed max-w-[50ch]">
          Distance fields stay cached in a background worker so optics, blend, and border sliders update immediately—ready to paste straight into Figma.
        </p>
      </article>
    </div>
  </section>

  <!-- Presets with visual % meter bars -->
  <section id="presets" class="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-24 border-t border-studio-border">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
      <h2 class="font-semibold text-3xl sm:text-4xl tracking-[-0.025em] text-studio-ink">
        Six starting presets.
      </h2>
      <p class="text-sm text-studio-muted">Click any preset to open it in the studio.</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each presets as preset}
        <button
          type="button"
          onclick={() => onOpenPreset(preset)}
          class="group flex flex-col items-start p-5 rounded-2xl bg-studio-panel border border-studio-border hover:border-studio-accent active:scale-[0.98] transition-[border-color,transform] duration-150 ease-[var(--ease-out)] text-left"
        >
          <div class="flex items-baseline justify-between w-full">
            <span class="font-semibold text-base text-studio-ink group-hover:text-studio-accent transition-colors duration-150">
              {preset.name}
            </span>
            <span class="font-mono text-xs font-semibold text-studio-ink tabular-nums">
              {preset.cellCount} <span class="font-sans font-normal text-studio-muted">cells</span>
            </span>
          </div>
          <span class="text-xs text-studio-muted mt-0.5">{preset.desc}</span>

          <!-- Visual % meter bars -->
          <div class="w-full space-y-2.5 mt-5 pt-4 border-t border-studio-border">
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="text-studio-muted">Refraction</span>
                <span class="font-mono font-semibold text-studio-ink tabular-nums">{preset.refraction}%</span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-studio-elevated overflow-hidden">
                <div class="h-full rounded-full bg-studio-accent" style="width: {preset.refraction}%;"></div>
              </div>
            </div>

            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="text-studio-muted">Bevel</span>
                <span class="font-mono font-semibold text-studio-ink tabular-nums">{preset.bevel}%</span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-studio-elevated overflow-hidden">
                <div class="h-full rounded-full bg-studio-ink/75" style="width: {preset.bevel}%;"></div>
              </div>
            </div>
          </div>
        </button>
      {/each}
    </div>
  </section>

  <!-- CTA -->
  <section id="start" class="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-24 border-t border-studio-border">
    <div class="rounded-2xl bg-studio-ink text-studio-bg p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
      <div>
        <h2 class="font-semibold text-3xl sm:text-5xl tracking-[-0.03em]">
          Start shattering.
        </h2>
        <p class="mt-3 text-sm opacity-75 max-w-[42ch]">
          Copy PNG straight to your clipboard or export lossless files in one click.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
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
          class="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-white/25 text-sm font-medium hover:border-white/60 active:scale-[0.96] transition-[border-color,transform] duration-150"
        >
          Open empty studio
        </button>
      </div>
    </div>
  </section>

  <footer class="max-w-6xl mx-auto px-5 sm:px-8 py-8 border-t border-studio-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-studio-subtle">
    <span>Voronoi Shatter</span>
    <span>Space to reseed &middot; Hold C to compare &middot; Ctrl+S to export</span>
  </footer>
</div>
