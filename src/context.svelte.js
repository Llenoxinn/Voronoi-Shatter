import { setContext, getContext } from 'svelte';

const KEY = Symbol('voronoi');
export const THEME_STORAGE_KEY = 'voronoi-shatter-theme';

function getInitialDark() {
  if (typeof window === 'undefined') return false;
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch {
    // Ignore storage access errors in private or sandboxed contexts.
  }
  try {
    return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  } catch {
    return false;
  }
}

export function createAppState() {
  const initialDark = getInitialDark();
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', initialDark);
  }

  const appState = $state({
    srcData: null,
    srcWidth: 0,
    srcHeight: 0,
    hasImage: false,
    processing: false,
    isDark: initialDark,
    params: {
      cellCount: 80,
      jitter: 75,
      refraction: 65,
      bevel: 55,
      dispersion: 24,
      borderWidth: 1.5,
      borderColor: '#111113',
      metric: 'euclidean',
      transparentBorder: false,
      wireframe: false,
      seed: 104729,
      impact: null,
      blendMode: 'normal',
      blendOpacity: 50,
      exportFormat: 'png',
      exportQuality: 92,
    },
    seeds: [],
    cachedNearest: null,
    cachedDist1Sq: null,
    cachedDist2Sq: null,
    cachedAvgColors: null,
    cachedWidth: 0,
    cachedHeight: 0,
    blendData: null,
    hasBlend: false,
  });

  setContext(KEY, appState);
  return appState;
}

export function getAppState() {
  return getContext(KEY);
}

export function toggleTheme(appState) {
  const nextDark = !appState.isDark;
  const root = typeof document !== 'undefined' ? document.documentElement : null;

  if (root) {
    root.classList.add('theme-switching');
  }
  appState.isDark = nextDark;
  if (root) {
    root.classList.toggle('dark', nextDark);
    void root.offsetHeight;
    requestAnimationFrame(() => {
      root.classList.remove('theme-switching');
    });
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextDark ? 'dark' : 'light');
  } catch {
    // Ignore storage access errors in private or sandboxed contexts.
  }
}
