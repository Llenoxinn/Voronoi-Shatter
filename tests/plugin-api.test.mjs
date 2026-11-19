import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { isEmbedMode, postToHost, initPluginBridge } from '../src/lib/plugin-api.js';

function createMockWindow({ search = '', inIframe = false, throwOnTop = false } = {}) {
  const listeners = new Map();
  const posted = [];

  const mockWin = {
    location: { search },
    parent: {
      postMessage(message, targetOrigin) {
        posted.push({ message, targetOrigin });
      },
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
  };

  mockWin.self = mockWin;
  if (throwOnTop) {
    Object.defineProperty(mockWin, 'top', {
      get() {
        throw new Error('Blocked a frame with cross-origin access');
      },
      configurable: true,
    });
  } else {
    mockWin.top = inIframe ? {} : mockWin;
  }

  const dispatchMessage = (data, source) => {
    const event = source === undefined ? { data } : { data, source };
    for (const fn of [...(listeners.get('message') ?? [])]) {
      fn(event);
    }
  };

  return { mockWin, listeners, posted, dispatchMessage };
}

describe('plugin-api', () => {
  let hadWindow;
  let originalWindow;
  let env;

  beforeEach(() => {
    hadWindow = Object.hasOwn(globalThis, 'window');
    originalWindow = globalThis.window;
    env = createMockWindow();
    globalThis.window = env.mockWin;
  });

  afterEach(() => {
    if (hadWindow) {
      globalThis.window = originalWindow;
    } else {
      delete globalThis.window;
    }
  });

  describe('isEmbedMode', () => {
    it('returns true for ?embed=1 and bare ?embed query parameters', () => {
      globalThis.window = createMockWindow({ search: '?embed=1', inIframe: false }).mockWin;
      assert.equal(isEmbedMode(), true);

      globalThis.window = createMockWindow({ search: '?embed', inIframe: false }).mockWin;
      assert.equal(isEmbedMode(), true);
    });

    it('returns true when running inside an iframe (self !== top or cross-origin top)', () => {
      globalThis.window = createMockWindow({ search: '', inIframe: true }).mockWin;
      assert.equal(isEmbedMode(), true);

      globalThis.window = createMockWindow({ search: '', throwOnTop: true }).mockWin;
      assert.equal(isEmbedMode(), true);
    });

    it('returns false in a standalone top-level window without embed param', () => {
      globalThis.window = createMockWindow({ search: '?preset=crystal', inIframe: false }).mockWin;
      assert.equal(isEmbedMode(), false);

      globalThis.window = createMockWindow({ search: '', inIframe: false }).mockWin;
      assert.equal(isEmbedMode(), false);
    });

    it('returns false when window is undefined', () => {
      delete globalThis.window;
      assert.equal(isEmbedMode(), false);
    });
  });

  describe('postToHost', () => {
    it('delivers { type, ...payload } to window.parent.postMessage', () => {
      postToHost('voronoi:export-result', { format: 'svg', svg: '<svg></svg>' });

      assert.equal(env.posted.length, 1);
      assert.deepEqual(env.posted[0], {
        message: { type: 'voronoi:export-result', format: 'svg', svg: '<svg></svg>' },
        targetOrigin: '*',
      });
    });

    it('preserves explicit type over conflicting payload type and ignores invalid types', () => {
      postToHost('voronoi:ready', { type: 'spoofed', ok: true });
      postToHost('');
      postToHost(null);

      assert.equal(env.posted.length, 1);
      assert.deepEqual(env.posted[0].message, { type: 'voronoi:ready', ok: true });
    });
  });

  describe('initPluginBridge', () => {
    it('fires voronoi:ready on init and routes valid host commands to callbacks', () => {
      const loadedUrls = [];
      const paramUpdates = [];
      const exportFormats = [];

      const cleanup = initPluginBridge({
        onLoadImageDataUrl: (url) => loadedUrls.push(url),
        onSetParams: (params) => paramUpdates.push(params),
        onRequestExport: (format) => exportFormats.push(format),
      });

      assert.equal(env.posted.length, 1);
      assert.deepEqual(env.posted[0], {
        message: { type: 'voronoi:ready' },
        targetOrigin: '*',
      });

      env.dispatchMessage({ type: 'voronoi:load-image', dataUrl: 'data:image/png;base64,AAAA' });
      env.dispatchMessage({
        type: 'voronoi:set-params',
        params: { cellCount: 140, metric: 'manhattan', impact: { x: 0.25, y: 0.75 } },
      });
      env.dispatchMessage({ type: 'voronoi:export', format: 'svg' });
      env.dispatchMessage({ type: 'voronoi:export', format: 'png' });

      assert.deepEqual(loadedUrls, ['data:image/png;base64,AAAA']);
      assert.deepEqual(paramUpdates, [
        { cellCount: 140, metric: 'manhattan', impact: { x: 0.25, y: 0.75 } },
      ]);
      assert.deepEqual(exportFormats, ['svg', 'png']);

      cleanup();
    });

    it('strips prototype-pollution keys (__proto__, constructor, prototype) from voronoi:set-params', () => {
      const received = [];
      const cleanup = initPluginBridge({
        onSetParams: (params) => received.push(params),
      });

      const payload = JSON.parse(
        '{"__proto__":{"polluted":true},"constructor":{"prototype":{"pwned":true}},"prototype":{"bad":true},"cellCount":90,"impact":{"__proto__":{"nested":true},"x":0.4,"y":0.6}}'
      );
      env.dispatchMessage({ type: 'voronoi:set-params', params: payload });

      // Payload containing ONLY forbidden keys should be dropped entirely
      const onlyForbidden = JSON.parse('{"__proto__":{"polluted":true}}');
      env.dispatchMessage({ type: 'voronoi:set-params', params: onlyForbidden });

      assert.equal(received.length, 1);
      assert.deepEqual(received[0], { cellCount: 90, impact: { x: 0.4, y: 0.6 } });
      assert.equal(Object.hasOwn(received[0], '__proto__'), false);
      assert.equal(Object.hasOwn(received[0], 'constructor'), false);
      assert.equal(Object.hasOwn(received[0], 'prototype'), false);
      assert.equal(Object.hasOwn(received[0].impact, '__proto__'), false);
      assert.equal(({}).polluted, undefined);
      assert.equal(({}).pwned, undefined);
      assert.equal(({}).nested, undefined);

      cleanup();
    });

    it('safely ignores malformed, empty, and unknown messages', () => {
      let calls = 0;
      const cleanup = initPluginBridge({
        onLoadImageDataUrl: () => calls++,
        onSetParams: () => calls++,
        onRequestExport: () => calls++,
      });

      const invalidMessages = [
        null,
        undefined,
        'voronoi:export',
        42,
        {},
        { type: 123 },
        { type: 'voronoi:unknown', foo: 'bar' },
        { type: 'voronoi:load-image', dataUrl: '' },
        { type: 'voronoi:load-image', dataUrl: '   ' },
        { type: 'voronoi:load-image', dataUrl: 123 },
        { type: 'voronoi:set-params', params: null },
        { type: 'voronoi:set-params', params: ['cellCount'] },
        { type: 'voronoi:set-params', params: {} },
        { type: 'voronoi:export', format: '' },
        { type: 'voronoi:export', format: '   ' },
        { type: 'voronoi:export', format: null },
      ];

      for (const msg of invalidMessages) {
        env.dispatchMessage(msg);
      }

      assert.equal(calls, 0);
      cleanup();
    });

    it('removes the message listener when the cleanup function is called', () => {
      let calls = 0;
      const cleanup = initPluginBridge({
        onLoadImageDataUrl: () => calls++,
        onSetParams: () => calls++,
        onRequestExport: () => calls++,
      });

      assert.equal(env.listeners.get('message')?.size, 1);
      cleanup();
      assert.equal(env.listeners.get('message')?.size, 0);

      env.dispatchMessage({ type: 'voronoi:load-image', dataUrl: 'data:image/png;base64,BBBB' });
      env.dispatchMessage({ type: 'voronoi:set-params', params: { cellCount: 64 } });
      env.dispatchMessage({ type: 'voronoi:export', format: 'svg' });

      assert.equal(calls, 0);
    });

    it('ignores messages from foreign window sources when embedded, while accepting window.parent', () => {
      const received = [];
      const cleanup = initPluginBridge({
        onSetParams: (params) => received.push(params),
      });

      assert.notEqual(globalThis.window.parent, globalThis.window);

      env.dispatchMessage({ type: 'voronoi:set-params', params: { cellCount: 10 } }, {});
      assert.equal(received.length, 0);

      env.dispatchMessage(
        { type: 'voronoi:set-params', params: { cellCount: 75 } },
        globalThis.window.parent
      );
      assert.deepEqual(received, [{ cellCount: 75 }]);

      cleanup();
    });
  });
});
