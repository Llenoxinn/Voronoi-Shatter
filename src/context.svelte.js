import { setContext, getContext } from 'svelte';

const KEY = Symbol('voronoi');

export function createAppState() {
  const state = $state({
    srcData: null,
    srcWidth: 0,
    srcHeight: 0,
    hasImage: false,
    processing: false,
    params: { cellCount: 50, jitter: 70, borderWidth: 2, borderColor: '#000000' },
    seeds: [],
    cachedNearest: null,
    cachedDist1Sq: null,
    cachedDist2Sq: null,
    cachedAvgColors: null,
    cachedWidth: 0,
    cachedHeight: 0,
  });

  setContext(KEY, state);
  return state;
}

export function getAppState() {
  return getContext(KEY);
}
