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
  let activeHeroPreset = $state('Prism');
  let fileInput = $state();

  let srcPixels = null;
  const W = 760;
  const H = 460;

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

    const sun = ctx.createRadialGradient(W * 0.36, H * 0.42, 16, W * 0.36, H * 0.42, 195);
    sun.addColorStop(0, '#fde68a');
    sun.addColorStop(0.5, '#f97316');
    sun.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(W * 0.36, H * 0.42, 195, 0, Math.PI * 2);
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

  function renderHero(presetOverride = null) {
    if (!heroCanvas || !srcPixels) return;
    const p =
      presetOverride ||
      presets.find((item) => item.name === activeHeroPreset) || {
        cellCount: 80,
        jitter: 75,
        refraction: 65,
        bevel: 55,
        borderWidth: 1.5,
      };
    const seeds = generateSeeds(W, H, Math.min(p.cellCount, 180), p.jitter, heroSeed, heroImpact);
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
      p.borderWidth,
      [17, 17, 19],
      p.refraction,
      p.bevel,
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

  function selectHeroPreset(preset) {
    activeHeroPreset = preset.name;
    renderHero(preset);
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
  <header class="sticky top-0 z-30 backdrop-blur-xl bg-studio-bg/90 border-b border-studio-border">
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

  <!-- Asymmetric Split Hero + Live Interactive Specimen -->
  <section id="top" class="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-20 md:pt-16 md:pb-24">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
      <!-- Left: Editorial Copy & Actions -->
      <div class="lg:col-span-5 flex flex-col items-start">
        <h1 class="font-semibold text-4xl sm:text-5xl lg:text-[3.5rem] leading-[1.02] tracking-[-0.03em] text-studio-ink text-balance">
          Fracture flat imagery into optical crystal.
        </h1>

        <p class="mt-5 text-base text-studio-muted leading-relaxed max-w-[38ch] text-pretty">
          Per-shard pixel refraction, directional facet bevels, and RGB dispersion—running locally in your browser.
        </p>

        <div class="flex flex-wrap items-center gap-2.5 mt-8">
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

      <!-- Right: Live Interactive Voronoi Specimen -->
      <div class="lg:col-span-7">
        <div class="rounded-2xl border border-studio-border-strong bg-studio-panel p-2 shadow-[0_24px_70px_rgba(17,17,19,0.08)] dark:shadow-[0_28px_80px_rgba(0,0,0,0.6)]">
          <div class="relative rounded-lg overflow-hidden bg-studio-bg">
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

          <div class="flex flex-wrap items-center justify-between gap-2 px-2 pt-2.5 pb-1">
            <div class="flex flex-wrap items-center gap-1">
              {#each presets.slice(0, 4) as preset}
                {@const active = activeHeroPreset === preset.name}
                <button
                  type="button"
                  onclick={() => selectHeroPreset(preset)}
                  class="px-2.5 py-1 rounded-md text-xs font-medium active:scale-[0.96] transition-[background-color,color,transform] duration-150 {active
                    ? 'bg-studio-ink text-studio-bg'
                    : 'text-studio-muted hover:text-studio-ink hover:bg-studio-elevated'}"
                >
                  {preset.name}
                </button>
              {/each}
            </div>
            <span class="text-xs text-studio-subtle">Click artwork to move impact</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Architectural Hairline Strip (No boxed card grid) -->
  <section id="optics" class="border-t border-b border-studio-border bg-studio-panel/50">
    <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-studio-border">
      <div class="px-5 sm:px-8 py-12">
        <span class="font-mono text-xs font-semibold text-studio-accent tabular-nums">01</span>
        <h2 class="font-semibold text-lg tracking-tight text-studio-ink mt-3">
          Optical refraction &amp; dispersion
        </h2>
        <p class="mt-2 text-sm text-studio-muted leading-relaxed text-pretty">
          Displaces sampled pixels per cell and splits red and blue channels for prism glass edges.
        </p>
      </div>

      <div class="px-5 sm:px-8 py-12">
        <span class="font-mono text-xs font-semibold text-studio-accent tabular-nums">02</span>
        <h2 class="font-semibold text-lg tracking-tight text-studio-ink mt-3">
          Radial impact clustering
        </h2>
        <p class="mt-2 text-sm text-studio-muted leading-relaxed text-pretty">
          Click anywhere on your artwork to fracture radially from a focal point, or reset to a grid.
        </p>
      </div>

      <div class="px-5 sm:px-8 py-12">
        <span class="font-mono text-xs font-semibold text-studio-accent tabular-nums">03</span>
        <h2 class="font-semibold text-lg tracking-tight text-studio-ink mt-3">
          Cached worker &amp; Figma copy
        </h2>
        <p class="mt-2 text-sm text-studio-muted leading-relaxed text-pretty">
          Distance fields stay cached in a Web Worker for instant slider tuning and 1-click clipboard copy.
        </p>
      </div>
    </div>
  </section>

  <!-- Presets Specimen Table -->
  <section id="presets" class="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-24">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <h2 class="font-semibold text-3xl tracking-[-0.025em] text-studio-ink text-balance">
        Calibrated presets.
      </h2>
      <p class="text-sm text-studio-muted">Select any row to launch the studio with that profile.</p>
    </div>

    <div class="border-t border-b border-studio-border divide-y divide-studio-border">
      {#each presets as preset}
        <button
          type="button"
          onclick={() => onOpenPreset(preset)}
          class="group w-full grid grid-cols-1 md:grid-cols-12 gap-4 items-center py-4 px-2 hover:bg-studio-panel/80 active:scale-[0.995] transition-[background-color,transform] duration-150 text-left"
        >
          <div class="md:col-span-4 flex items-baseline justify-between md:justify-start gap-3">
            <span class="font-semibold text-base text-studio-ink group-hover:text-studio-accent transition-colors duration-150">
              {preset.name}
            </span>
            <span class="text-xs text-studio-muted">{preset.desc}</span>
          </div>

          <div class="md:col-span-2 font-mono text-xs font-semibold text-studio-ink tabular-nums">
            {preset.cellCount} <span class="font-sans font-normal text-studio-muted">cells</span>
          </div>

          <div class="md:col-span-3 flex items-center gap-3">
            <span class="text-xs text-studio-muted w-16 shrink-0">Refraction</span>
            <div class="flex-1 h-1.5 rounded-full bg-studio-elevated overflow-hidden">
              <div class="h-full rounded-full bg-studio-accent" style="width: {preset.refraction}%;"></div>
            </div>
            <span class="font-mono text-xs font-semibold text-studio-ink tabular-nums w-9 text-right">{preset.refraction}%</span>
          </div>

          <div class="md:col-span-3 flex items-center gap-3">
            <span class="text-xs text-studio-muted w-10 shrink-0">Bevel</span>
            <div class="flex-1 h-1.5 rounded-full bg-studio-elevated overflow-hidden">
              <div class="h-full rounded-full bg-studio-ink/75" style="width: {preset.bevel}%;"></div>
            </div>
            <span class="font-mono text-xs font-semibold text-studio-ink tabular-nums w-9 text-right">{preset.bevel}%</span>
          </div>
        </button>
      {/each}
    </div>
  </section>

  <!-- Closing Editorial Band -->
  <section class="max-w-6xl mx-auto px-5 sm:px-8 pb-20 pt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
    <div>
      <h2 class="font-semibold text-3xl sm:text-4xl tracking-[-0.03em] text-studio-ink text-balance">
        Ready to shatter your artwork?
      </h2>
      <p class="mt-2 text-sm text-studio-muted max-w-[44ch] text-pretty">
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
