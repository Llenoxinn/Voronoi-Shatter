<script>
  import { getAppState } from '../context.svelte.js';

  let {
    comparing = $bindable(false),
    onRegenerate,
    onClearImpact,
    onBorderChange,
  } = $props();

  const appState = getAppState();
</script>

{#if appState.hasImage}
  <nav
    aria-label="Studio tools"
    class="hidden md:flex flex-col items-center justify-between w-12 shrink-0 py-3 bg-studio-panel border-r border-studio-border"
  >
    <div class="flex flex-col items-center gap-1.5">
      <!-- Radial Impact Indicator / Clear -->
      <button
        type="button"
        onclick={() => {
          if (appState.params.impact) onClearImpact?.();
        }}
        title={appState.params.impact ? 'Radial impact active — click to reset to grid' : 'Impact tool active — click canvas to fracture radially'}
        aria-label={appState.params.impact ? 'Reset radial impact to grid' : 'Radial impact tool'}
        aria-pressed={Boolean(appState.params.impact)}
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg motion-safe:enabled:active:scale-[0.96] transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-panel {appState.params.impact
          ? 'bg-studio-accent text-studio-accent-ink'
          : 'text-studio-ink bg-studio-elevated/70'}"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2" />
          <line x1="12" y1="2" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="2" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
        </svg>
      </button>

      <!-- Hold to Compare (C) -->
      <button
        type="button"
        onpointerdown={() => (comparing = true)}
        onpointerup={() => (comparing = false)}
        onpointerleave={() => (comparing = false)}
        onpointercancel={() => (comparing = false)}
        title="Hold to compare original (C)"
        aria-label="Hold to compare original"
        aria-pressed={comparing}
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg motion-safe:enabled:active:scale-[0.96] transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 {comparing
          ? 'bg-studio-ink text-studio-bg'
          : 'text-studio-muted hover:text-studio-ink hover:bg-studio-elevated'}"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
      </button>

      <!-- Reseed (Space) -->
      <button
        type="button"
        onclick={() => onRegenerate?.()}
        disabled={appState.processing}
        title="Reseed shards (Space)"
        aria-label="Reseed shards"
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg text-studio-muted hover:text-studio-ink hover:bg-studio-elevated motion-safe:enabled:active:scale-[0.96] disabled:opacity-35 transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      </button>

      <span class="w-5 h-px bg-studio-border my-1" aria-hidden="true"></span>

      <!-- Cutout Gaps Toggle -->
      <button
        type="button"
        onclick={() => {
          appState.params.transparentBorder = !appState.params.transparentBorder;
          onBorderChange?.();
        }}
        title="Toggle cutout border gaps"
        aria-label="Toggle cutout border gaps"
        aria-pressed={appState.params.transparentBorder}
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg motion-safe:enabled:active:scale-[0.96] transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 {appState.params.transparentBorder
          ? 'bg-studio-ink text-studio-bg'
          : 'text-studio-muted hover:text-studio-ink hover:bg-studio-elevated'}"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
        </svg>
      </button>

      <!-- Wireframe Toggle -->
      <button
        type="button"
        onclick={() => {
          appState.params.wireframe = !appState.params.wireframe;
          onBorderChange?.();
        }}
        title="Toggle wireframe only"
        aria-label="Toggle wireframe only"
        aria-pressed={appState.params.wireframe}
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg motion-safe:enabled:active:scale-[0.96] transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 {appState.params.wireframe
          ? 'bg-studio-ink text-studio-bg'
          : 'text-studio-muted hover:text-studio-ink hover:bg-studio-elevated'}"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polygon points="12 3 21 9 18 20 6 20 3 9 12 3" />
          <line x1="12" y1="3" x2="12" y2="20" />
          <line x1="3" y1="9" x2="21" y2="9" />
        </svg>
      </button>
    </div>

    <span class="text-[0.625rem] font-mono text-studio-subtle tabular-nums" title="Active shard count">
      {appState.seeds.length || appState.params.cellCount}
    </span>
  </nav>
{/if}
