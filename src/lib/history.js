/**
 * Pure undo/redo history manager for Voronoi Shatter studio parameters.
 */

/**
 * Return a plain-cloned snapshot of undoable geometry, optics, and blend parameters.
 * @param {Record<string, any>} [params]
 */
export function cloneHistoryParams(params = {}) {
  const src = params || {};
  const impact =
    src.impact && typeof src.impact.x === 'number' && typeof src.impact.y === 'number'
      ? { x: src.impact.x, y: src.impact.y }
      : null;

  return {
    cellCount: src.cellCount,
    jitter: src.jitter,
    refraction: src.refraction,
    bevel: src.bevel,
    dispersion: src.dispersion,
    borderWidth: src.borderWidth,
    borderColor: src.borderColor,
    metric: src.metric,
    transparentBorder: src.transparentBorder,
    wireframe: src.wireframe,
    seed: src.seed,
    impact,
    blendMode: src.blendMode,
    blendOpacity: src.blendOpacity,
  };
}

/**
 * Deep-compare two parameter snapshots (including radial impact coordinates).
 * @param {Record<string, any> | null | undefined} a
 * @param {Record<string, any> | null | undefined} b
 * @returns {boolean}
 */
export function paramsEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;

  if (
    a.cellCount !== b.cellCount ||
    a.jitter !== b.jitter ||
    a.refraction !== b.refraction ||
    a.bevel !== b.bevel ||
    a.dispersion !== b.dispersion ||
    a.borderWidth !== b.borderWidth ||
    a.metric !== b.metric ||
    a.transparentBorder !== b.transparentBorder ||
    a.wireframe !== b.wireframe ||
    a.seed !== b.seed ||
    a.blendMode !== b.blendMode ||
    a.blendOpacity !== b.blendOpacity
  ) {
    return false;
  }

  if (typeof a.borderColor === 'string' && typeof b.borderColor === 'string') {
    if (a.borderColor.toLowerCase() !== b.borderColor.toLowerCase()) return false;
  } else if (a.borderColor !== b.borderColor) {
    return false;
  }

  const impA = a.impact ?? null;
  const impB = b.impact ?? null;
  if (impA === null && impB === null) return true;
  if (impA === null || impB === null) return false;
  return impA.x === impB.x && impA.y === impB.y;
}

/**
 * Create a bounded linear undo/redo history stack.
 * @param {Record<string, any>} initialParams
 * @param {number} [maxLength=50]
 */
export function createHistory(initialParams, maxLength = 50) {
  const limit = Math.max(1, Math.floor(Number(maxLength) || 50));
  let stack = [cloneHistoryParams(initialParams)];
  let index = 0;

  return {
    push(params) {
      const next = cloneHistoryParams(params);
      if (paramsEqual(stack[index], next)) return false;

      if (index < stack.length - 1) {
        stack = stack.slice(0, index + 1);
      }

      stack.push(next);
      if (stack.length > limit) {
        stack = stack.slice(stack.length - limit);
      }
      index = stack.length - 1;
      return true;
    },

    undo() {
      if (index <= 0) return null;
      index -= 1;
      return cloneHistoryParams(stack[index]);
    },

    redo() {
      if (index >= stack.length - 1) return null;
      index += 1;
      return cloneHistoryParams(stack[index]);
    },

    reset(params) {
      stack = [cloneHistoryParams(params)];
      index = 0;
    },

    canUndo() {
      return index > 0;
    },

    canRedo() {
      return index < stack.length - 1;
    },

    current() {
      return cloneHistoryParams(stack[index]);
    },

    length() {
      return stack.length;
    },
  };
}
