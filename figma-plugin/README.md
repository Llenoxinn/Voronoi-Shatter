# Voronoi Shatter Figma Plugin

## Install in Figma Desktop

1. **Get the plugin bundle**:
   - Download `voronoi-shatter-figma-plugin.zip` from the landing page and unzip it to a local folder, **or**
   - From this repository, run `npm run build:plugin` (which packages `manifest.json`, `code.js`, `ui.html`, and `README.md` into `public/voronoi-shatter-figma-plugin.zip`), or import directly from `figma-plugin/`.
2. Open **Figma Desktop** and go to **Plugins -> Development -> Import plugin from manifest...**.
3. Select `manifest.json` from the unzipped folder (or `figma-plugin/manifest.json`), then run **Plugins -> Development -> Voronoi Shatter**.

## How the `ui.html` Bridge Works

- `code.js` opens `ui.html` (`980x680`), which embeds the Voronoi Shatter Studio inside an `<iframe>` at `http://localhost:5173/?embed=1` by default (or a custom `?studio=<url>` query parameter; `manifest.json` includes `devAllowedDomains` for local ports `5173` and `5175`).
- If the local dev server (`npm run dev`) is not running within 3 seconds, `ui.html` displays a URL form so you can load any hosted Studio URL with `?embed=1`.
- When the Studio finishes mounting, `src/lib/plugin-api.js` posts `voronoi:ready` to the bridge, enabling **Pull Selection**, **Insert PNG**, and **Insert SVG** (while `?embed=1` also exposes **Insert** in the Studio top bar).
- On connect (or when clicking **Pull Selection**), `code.js` exports the currently selected Figma layer via `exportAsync({ format: 'PNG' })` and sends `selection-bytes` to `ui.html`, which converts it to a data URL and posts `voronoi:load-image` to the Studio iframe.
- Triggering **Insert** in the Studio (or **Insert SVG** / **Insert PNG** in the `ui.html` toolbar, which posts `voronoi:export` to the iframe) emits `voronoi:export-result`, which `ui.html` relays to `code.js` via `parent.postMessage({ pluginMessage }, '*')`:
  - `insert-svg` — creates a vector node via `figma.createNodeFromSvg(msg.svg)` and centers it in the viewport.
  - `insert-png` — creates an image rectangle via `figma.createImage(new Uint8Array(msg.bytes))` sized to `width x height` and centers it in the viewport.
