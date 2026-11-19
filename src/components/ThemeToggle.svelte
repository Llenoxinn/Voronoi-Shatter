<script>
  import { getAppState, toggleTheme } from '../context.svelte.js';

  const appState = getAppState();
</script>

<button
  type="button"
  onclick={() => toggleTheme(appState)}
  aria-label={appState.isDark ? 'Switch to light studio theme' : 'Switch to darkroom theme'}
  title={appState.isDark ? 'Gallery Stone' : 'Darkroom'}
  class="inline-flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 md:w-8 md:h-8 rounded-lg text-studio-muted hover:text-studio-ink hover:bg-studio-elevated motion-safe:enabled:active:scale-[0.96] transition-[color,background-color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60"
>
  {#if appState.isDark}
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
