# Repository Guidelines

## Stack & Architecture

- **Framework**: Svelte 5 (runes `$state`, `$derived`, `$props`, `$bindable`, `$props.id()`, `$effect`) + Vite 6 + Tailwind CSS 3.
- **State**: Centralized in [src/context.svelte.js](src/context.svelte.js) via `createAppState()`, `getAppState()`, and `toggleTheme()` (avoid naming local context bindings `state` to prevent `$state` rune conflict).
- **Lifecycle**: Clean up timers and `requestAnimationFrame` handles in `onDestroy()`.
- **Rendering Pipeline**:
  - Geometry changes (`cellCount`, `jitter`, `metric`, `impact`, or `Reseed`) trigger `requestFullProcess()` in [src/lib/engine.js](src/lib/engine.js), recomputing seeds and distance fields in [src/lib/worker.js](src/lib/worker.js).
  - Appearance changes (`refraction`, `bevel`, `dispersion`, `borderWidth`, `borderColor`, `transparentBorder`, `wireframe`, `blendMode`, `blendOpacity`) trigger `requestRenderOnly()` using cached typed arrays so sliders stay responsive.
  - Buffers are transferred via `postMessage(..., transferables)` — always copy `srcData` / cached typed arrays (and plain-clone `params` via `cloneParams()`) before posting because transferred buffers detach and Svelte `$state` proxies cannot be structured-cloned.
  - Vector export uses [src/lib/svg-export.js](src/lib/svg-export.js), and embed/Figma host messaging uses [src/lib/plugin-api.js](src/lib/plugin-api.js).

## UI Conventions

- **Typography & Palette**: `Geist` + `Geist Mono` (`tabular-nums` for changing numbers). Gallery Stone (default) and Darkroom (`.dark`) themes defined via CSS variables in [src/app.css](src/app.css) and mapped in [tailwind.config.js](tailwind.config.js) (`studio-bg`, `studio-panel`, `studio-elevated`, `studio-ink`, `studio-muted`, `studio-accent`).
- **Controls**: Prefer segmented/pill buttons over native `<select>` for small option sets; use `enabled:active:scale-[0.96]` for tactile press feedback and `44px` minimum touch targets on mobile.
- **Motion**: Use explicit transition properties (`transition-colors`, `transition-transform`, `transition-opacity`) with `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`) from [src/app.css](src/app.css) and keep UI durations under `300ms`. Never animate instant keyboard-initiated actions like `Hold to compare` (`C`). Respect `prefers-reduced-motion`.
- **Icons**: Use inline geometric SVGs (`aria-hidden="true"`) rather than emoji characters.

## Verification

Run the production build after any UI or worker change:

```bash
npm run build
```
