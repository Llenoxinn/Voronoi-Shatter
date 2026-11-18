# Repository Guidelines

## Stack & Architecture

- **Framework**: Svelte 5 (runes `$state`, `$derived`, `$props`, `$bindable`, `$props.id()`, `$effect`) + Vite 6 + Tailwind CSS 3.
- **State**: Centralized in [src/context.svelte.js](src/context.svelte.js) via `createAppState()`, `getAppState()`, and `toggleTheme()` (avoid naming local context bindings `state` to prevent `$state` rune conflict).
- **Lifecycle**: Clean up timers and `requestAnimationFrame` handles in `onDestroy()`.
- **Rendering Pipeline**:
  - Geometry changes (`cellCount`, `jitter`, `metric`, `seed`, `impact`, or `Reseed`) trigger `requestFullProcess()` in [src/lib/engine.js](src/lib/engine.js), recomputing seeds and distance fields in [src/lib/worker.js](src/lib/worker.js).
  - Appearance changes (`refraction`, `bevel`, `dispersion`, `borderWidth`, `borderColor`, `transparentBorder`, `wireframe`, `blendMode`, `blendOpacity`) trigger `requestRenderOnly()` using cached typed arrays so sliders stay responsive.
  - Buffers are transferred via `postMessage(..., transferables)` — always copy `srcData` / cached typed arrays (and plain-clone `params` via `cloneParams()`) before posting because transferred buffers detach and Svelte `$state` proxies cannot be structured-cloned.
  - Stage display in [src/components/CanvasArea.svelte](src/components/CanvasArea.svelte) receives `showAlpha` (`transparentBorder || wireframe`) from [src/components/App.svelte](src/components/App.svelte) to toggle the `16px` checkerboard backdrop (with a toolbar override) alongside a `Fit / 100%` zoom switch.
  - Vector export uses [src/lib/svg-export.js](src/lib/svg-export.js), and embed/Figma host messaging uses [src/lib/plugin-api.js](src/lib/plugin-api.js).

## UI Conventions

- **Typography & Palette**: `Geist` + `Geist Mono` (`tabular-nums` for changing numbers). Gallery Stone (default) and Darkroom (`.dark`) themes defined via CSS variables in [src/app.css](src/app.css) and mapped in [tailwind.config.js](tailwind.config.js) (`studio-bg`, `studio-panel`, `studio-elevated`, `studio-ink`, `studio-muted`, `studio-accent`).
- **Controls**: Prefer segmented/pill buttons over native `<select>` for small option sets (such as `Fit / 100%` zoom); use `enabled:active:scale-[0.96]` for tactile press feedback, `44px` minimum touch targets on mobile, and `tabular-nums` inputs like the `Seed` numeric field (`1`–`1e9`) in [src/components/Sidebar.svelte](src/components/Sidebar.svelte).
- **Motion**: Use explicit transition properties (`transition-colors`, `transition-transform`, `transition-opacity`) with `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`) from [src/app.css](src/app.css) and keep UI durations under `300ms`. Never animate instant keyboard-initiated actions like `Hold to compare` (`C`). Respect `prefers-reduced-motion`.
- **Icons**: Use inline geometric SVGs (`aria-hidden="true"`) rather than emoji characters.

## Verification

Run the unit tests, plugin packager, and production build after UI, worker, or plugin changes:

```bash
# Run Voronoi & SVG unit tests (node --test tests/voronoi.test.mjs)
npm test

# Package figma-plugin/ into public/voronoi-shatter-figma-plugin.zip (scripts/build-plugin.mjs)
npm run build:plugin

# Run production build (also runs scripts/build-plugin.mjs automatically via prebuild)
npm run build
```
