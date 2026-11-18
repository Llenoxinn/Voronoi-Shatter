import { setContext, getContext } from 'svelte';

const KEY = Symbol('voronoi');

export function createAppState() {
  const state = $state({
    srcData: null,
    srcWidth: 0,
    srcHeight: 0,
    hasImage: false,
    processing: false,
    isDark: false,
    params: {
      cellCount: 80,
      jitter: 75,
      refraction: 45,
      bevel: 40,
      dispersion: 20,
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

  setContext(KEY, state);
  return state;
}

export function getAppState() {
  return getContext(KEY);
}

export function toggleTheme(appState) {
  const root = document.documentElement;
  root.classList.add('theme-switching');
  appState.isDark = !appState.isDark;
  root.classList.toggle('dark', appState.isDark);
  void root.offsetHeight;
  requestAnimationFrame(() => {
    root.classList.remove('theme-switching');
  });
}
