# Repository Guidelines

## Stack & Architecture

- **Framework**: Svelte 5 (runes `$state`, `$derived`, `$props`, `$bindable`, `$props.id()`, `$effect`) + Vite 6 + Tailwind CSS 3.
- **State & Theme**: Centralized in [src/context.svelte.js](src/context.svelte.js) via `createAppState()`, `getAppState()`, and `toggleTheme()` (avoid naming local context bindings `state` to prevent `$state` rune conflict). Theme persists in `localStorage` under `voronoi-shatter-theme` with `prefers-color-scheme` fallback and an inline pre-paint script in [index.html](index.html).
- **History**: Bounded 50-step undo/redo snapshots live in [src/lib/history.js](src/lib/history.js) (`createHistory`, `cloneHistoryParams`, `paramsEqual`).
- **Lifecycle**: Clean up timers, host message bridges, and `requestAnimationFrame` handles in `onDestroy()`.
- **Rendering Pipeline**:
  - Geometry changes (`cellCount`, `jitter`, `metric`, `seed`, `impact`, or `Reseed`) trigger `requestFullProcess()` in [src/lib/engine.js](src/lib/engine.js), recomputing seeds and spatial-grid accelerated (`n >= 24`) distance fields in [src/lib/voronoi.js](src/lib/voronoi.js) via [src/lib/worker.js](src/lib/worker.js).
  - Appearance changes (`refraction`, `bevel`, `dispersion`, `borderWidth`, `borderColor`, `transparentBorder`, `wireframe`, `blendMode`, `blendOpacity`) trigger `requestRenderOnly()` using cached typed arrays so sliders stay responsive.
  - Buffers transfer via `postMessage(..., transferables)` — always copy `srcData` / cached typed arrays (and plain-clone `params` via `cloneParams()`) before posting because transferred buffers detach and Svelte `$state` proxies cannot be structured-cloned.
  - Worker crashes, deserialization errors, and caught worker exceptions route through `setOnError` in [src/lib/engine.js](src/lib/engine.js), which resets the worker and surfaces an accessible status notice in [src/components/App.svelte](src/components/App.svelte).
  - Stage display in [src/components/CanvasArea.svelte](src/components/CanvasArea.svelte) receives `showAlpha` (`transparentBorder || wireframe`) from [src/components/App.svelte](src/components/App.svelte) to toggle the `16px` checkerboard backdrop (with a toolbar override) alongside a `Fit / 100%` zoom switch.
  - Vector export in [src/lib/svg-export.js](src/lib/svg-export.js) handles Euclidean half-plane clipping, non-Euclidean (`manhattan`, `chebyshev`) marching-squares contours, geometric `transparentBorder` inset cutouts, bevel tinting, and hex/numeric attribute sanitization.
  - Embed/Figma host messaging uses [src/lib/plugin-api.js](src/lib/plugin-api.js) (stripping prototype-pollution keys), and [src/components/App.svelte](src/components/App.svelte) validates and clamps `voronoi:set-params` against an explicit allowlist (`applyHostParams()`).

## UI Conventions

- **Typography & Palette**: `Outfit` (variable display face, weight `579` via `font-display font-[579]`) + `Geist` + `Geist Mono` (`tabular-nums` for changing numbers). Gallery Stone (default) and Darkroom (`.dark`) themes are defined via CSS variables in [src/app.css](src/app.css) and mapped in [tailwind.config.js](tailwind.config.js) (`studio-bg`, `studio-panel`, `studio-elevated`, `studio-ink`, `studio-muted`, `studio-accent`) with `future.hoverOnlyWhenSupported: true`.
- **Controls**: Prefer segmented/pill buttons over native `<select>` for small option sets (`Fit / 100%`, metrics, export format); use `enabled:active:scale-[0.96]` for tactile press feedback, `44px` minimum mobile touch targets, a `16px` (`text-base`) mobile input floor, and `tabular-nums` inputs like `Seed` (`1`–`1e9`) in [src/components/Sidebar.svelte](src/components/Sidebar.svelte).
- **Layout & Focus**: Use concentric corner radii (`rounded-[calc(...)]`), `overscroll-contain` on scroll containers, and visible `focus-visible:ring-2` rings; avoid `select-none` on layout roots so text remains selectable.
- **Motion**: Use explicit transition properties (`transition-colors`, `transition-transform`, `transition-opacity`, `transition-[...]`) with `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`) from [src/app.css](src/app.css) and keep UI durations under `300ms` (canvas crossfade uses `CROSSFADE_MS = 220ms`, guarded by `prefers-reduced-motion`). Never animate instant keyboard-initiated actions like `Hold to compare` (`C`). Respect `prefers-reduced-motion`.
- **Icons**: Use inline geometric SVGs (`aria-hidden="true"`) rather than emoji characters.

## Verification

Run the unit tests, plugin packager, and production build after UI, worker, or plugin changes:

```bash
# Run unit tests (node --test tests/*.test.mjs)
npm test

# Package figma-plugin/ into public/voronoi-shatter-figma-plugin.zip (scripts/build-plugin.mjs)
npm run build:plugin

# Run production build (also runs scripts/build-plugin.mjs automatically via prebuild)
npm run build
```
