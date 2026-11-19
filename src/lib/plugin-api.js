/**
 * Embed detection and postMessage bridge for hosting Voronoi Shatter inside
 * an iframe (e.g. a Figma plugin UI or external studio host).
 *
 * ## PostMessage Protocol
 *
 * **App -> Host** (sent via {@link postToHost}):
 * - `voronoi:ready` — `{ type: 'voronoi:ready' }`
 *   Emitted once {@link initPluginBridge} has attached its message listener.
 * - `voronoi:export-result` —
 *   - SVG: `{ type: 'voronoi:export-result', format: 'svg', svg: string }`
 *   - PNG: `{ type: 'voronoi:export-result', format: 'png', bytes: number[], width: number, height: number }`
 * - `voronoi:export-error` —
 *   `{ type: 'voronoi:export-error', format?: string, message: string }`
 *   Emitted when an export cannot be completed (for example, no image is loaded).
 *
 * **Host -> App** (handled by {@link initPluginBridge}):
 * - `voronoi:load-image` — `{ type: 'voronoi:load-image', dataUrl: string }`
 *   Loads an image data URL or image URL into the Studio canvas.
 * - `voronoi:set-params` — `{ type: 'voronoi:set-params', params: Record<string, unknown> }`
 *   Merges parameter updates into Studio state and triggers recomputation.
 * - `voronoi:export` — `{ type: 'voronoi:export', format: 'svg' | 'png' | string }`
 *   Requests the Studio to export the current render back to the host.
 */

/**
 * Returns true when running in embed mode (`?embed` query param or inside an iframe).
 * @returns {boolean}
 */
export function isEmbedMode() {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location?.search || '').has('embed')) return true;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Post a typed message to the parent host window.
 *
 * Common message types emitted by the Studio:
 * - `'voronoi:ready'`
 * - `'voronoi:export-result'`
 * - `'voronoi:export-error'`
 *
 * @param {string} type - Namespaced message type (e.g. `'voronoi:ready'`).
 * @param {Record<string, unknown>} [payload] - Optional serializable fields merged into the message.
 */
export function postToHost(type, payload = {}) {
  if (typeof window === 'undefined' || typeof type !== 'string' || !type) return;
  const extra =
    payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  try {
    window.parent.postMessage({ ...extra, type }, '*');
  } catch {
    // Ignore detached or restricted parent window errors.
  }
}

const FORBIDDEN_PARAM_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Return a shallow/nested plain-object copy with prototype-pollution keys removed.
 * @param {Record<string, unknown>} input
 * @param {number} [depth]
 * @returns {Record<string, unknown>}
 */
function sanitizeParams(input, depth = 0) {
  if (depth > 4) return {};
  const clean = {};
  for (const key of Object.keys(input)) {
    if (FORBIDDEN_PARAM_KEYS.has(key)) continue;
    const val = input[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      clean[key] = sanitizeParams(val, depth + 1);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

/**
 * Initialize the window message listener for host-to-app commands (`voronoi:load-image`,
 * `voronoi:set-params`, `voronoi:export`) and notify the host with `voronoi:ready`.
 *
 * Messages with missing or invalid payloads are safely ignored, and prototype-pollution
 * keys (`__proto__`, `constructor`, `prototype`) are rejected from `voronoi:set-params`.
 *
 * @param {object} [handlers]
 * @param {(dataUrl: string) => void} [handlers.onLoadImageDataUrl] - Called for valid `voronoi:load-image` messages.
 * @param {(params: Record<string, unknown>) => void} [handlers.onSetParams] - Called for valid `voronoi:set-params` messages.
 * @param {(format: string) => void} [handlers.onRequestExport] - Called for valid `voronoi:export` messages.
 * @returns {() => void} Cleanup function removing the message listener.
 */
export function initPluginBridge(handlers) {
  if (typeof window === 'undefined') return () => {};

  const { onLoadImageDataUrl, onSetParams, onRequestExport } =
    handlers && typeof handlers === 'object' ? handlers : {};

  const handleMessage = (event) => {
    if (
      window.parent &&
      window.parent !== window &&
      event?.source &&
      event.source !== window.parent
    ) {
      return;
    }

    const data = event?.data;
    if (!data || typeof data !== 'object' || typeof data.type !== 'string') return;

    switch (data.type) {
      case 'voronoi:load-image':
        if (typeof data.dataUrl === 'string' && data.dataUrl.trim().length > 0) {
          onLoadImageDataUrl?.(data.dataUrl);
        }
        break;
      case 'voronoi:set-params':
        if (data.params && typeof data.params === 'object' && !Array.isArray(data.params)) {
          const safeParams = sanitizeParams(data.params);
          if (Object.keys(safeParams).length > 0) {
            onSetParams?.(safeParams);
          }
        }
        break;
      case 'voronoi:export':
        if (typeof data.format === 'string' && data.format.trim().length > 0) {
          onRequestExport?.(data.format);
        }
        break;
      default:
        break;
    }
  };

  window.addEventListener('message', handleMessage);
  postToHost('voronoi:ready');

  return () => {
    window.removeEventListener('message', handleMessage);
  };
}
