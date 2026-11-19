import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cloneHistoryParams, paramsEqual, createHistory } from '../src/lib/history.js';

function makeParams(overrides = {}) {
  return {
    cellCount: 120,
    jitter: 65,
    refraction: 25,
    bevel: 40,
    dispersion: 15,
    borderWidth: 1.5,
    borderColor: '#111113',
    metric: 'euclidean',
    transparentBorder: false,
    wireframe: false,
    seed: 42,
    impact: { x: 0.4, y: 0.6 },
    blendMode: 'normal',
    blendOpacity: 0,
    ...overrides,
  };
}

describe('cloneHistoryParams', () => {
  it('deep-clones impact so mutating original or clone does not affect the other', () => {
    const original = makeParams({ impact: { x: 0.25, y: 0.75 }, extraIgnoredField: 'temp' });
    const cloned = cloneHistoryParams(original);

    assert.deepEqual(cloned, makeParams({ impact: { x: 0.25, y: 0.75 } }));
    assert.notEqual(cloned, original);
    assert.notEqual(cloned.impact, original.impact);
    assert.equal('extraIgnoredField' in cloned, false);

    original.impact.x = 0.99;
    original.cellCount = 999;
    assert.equal(cloned.impact.x, 0.25);
    assert.equal(cloned.cellCount, 120);

    cloned.impact.y = 0.01;
    assert.equal(original.impact.y, 0.75);
  });

  it('normalizes null, undefined, and invalid impact values to null', () => {
    const withNull = cloneHistoryParams(makeParams({ impact: null }));
    const withUndefined = cloneHistoryParams(makeParams({ impact: undefined }));
    const withInvalid = cloneHistoryParams(makeParams({ impact: { x: 'bad', y: 0.5 } }));

    assert.equal(withNull.impact, null);
    assert.equal(withUndefined.impact, null);
    assert.equal(withInvalid.impact, null);
  });
});

describe('paramsEqual', () => {
  it('returns true for identical references and structurally equal clones', () => {
    const base = makeParams();
    const clone = cloneHistoryParams(base);
    const upperHex = makeParams({ borderColor: '#AABBCC' });
    const lowerHex = makeParams({ borderColor: '#aabbcc' });

    assert.equal(paramsEqual(base, base), true);
    assert.equal(paramsEqual(base, clone), true);
    assert.equal(paramsEqual(upperHex, lowerHex), true);
    assert.equal(paramsEqual(makeParams({ impact: null }), makeParams({ impact: null })), true);
    assert.equal(paramsEqual(null, null), true);
    assert.equal(paramsEqual(base, null), false);
    assert.equal(paramsEqual(null, base), false);
  });

  it('detects differences across all scalar fields', () => {
    const base = makeParams();
    const mutations = [
      { cellCount: 121 },
      { jitter: 66 },
      { refraction: 26 },
      { bevel: 41 },
      { dispersion: 16 },
      { borderWidth: 2 },
      { borderColor: '#ffffff' },
      { metric: 'manhattan' },
      { transparentBorder: true },
      { wireframe: true },
      { seed: 43 },
      { blendMode: 'multiply' },
      { blendOpacity: 50 },
    ];

    for (const patch of mutations) {
      assert.equal(
        paramsEqual(base, makeParams(patch)),
        false,
        `expected paramsEqual to detect change in ${Object.keys(patch).join(', ')}`
      );
    }
  });

  it('detects changes in impact coordinates and nullability', () => {
    const withImpact = makeParams({ impact: { x: 0.4, y: 0.6 } });
    const withoutImpact = makeParams({ impact: null });

    assert.equal(paramsEqual(withImpact, withoutImpact), false);
    assert.equal(paramsEqual(withoutImpact, withImpact), false);
    assert.equal(paramsEqual(withImpact, makeParams({ impact: { x: 0.41, y: 0.6 } })), false);
    assert.equal(paramsEqual(withImpact, makeParams({ impact: { x: 0.4, y: 0.61 } })), false);
    assert.equal(paramsEqual(withImpact, makeParams({ impact: { x: 0.4, y: 0.6 } })), true);
  });
});

describe('createHistory', () => {
  it('starts with a single cloned initial entry and cannot undo or redo', () => {
    const initial = makeParams({ cellCount: 50, impact: { x: 0.2, y: 0.3 } });
    const history = createHistory(initial);

    assert.equal(history.canUndo(), false);
    assert.equal(history.canRedo(), false);
    assert.equal(history.length(), 1);
    assert.equal(history.undo(), null);
    assert.equal(history.redo(), null);

    // Mutating source object after initialization must not mutate stored entry
    initial.cellCount = 999;
    initial.impact.x = 0.9;
    assert.deepEqual(history.current(), makeParams({ cellCount: 50, impact: { x: 0.2, y: 0.3 } }));
  });

  it('deduplicates identical snapshots on push', () => {
    const p0 = makeParams({ cellCount: 80, borderColor: '#112233' });
    const history = createHistory(p0);

    assert.equal(history.push(makeParams({ cellCount: 80, borderColor: '#112233' })), false);
    assert.equal(history.push(makeParams({ cellCount: 80, borderColor: '#112233'.toUpperCase() })), false);
    assert.equal(history.length(), 1);
    assert.equal(history.canUndo(), false);

    assert.equal(history.push(makeParams({ cellCount: 90, borderColor: '#112233' })), true);
    assert.equal(history.length(), 2);
    assert.equal(history.canUndo(), true);
  });

  it('steps accurately with undo() and redo() and returns isolated clones', () => {
    const p0 = makeParams({ cellCount: 40, impact: { x: 0.1, y: 0.2 } });
    const p1 = makeParams({ cellCount: 80, impact: { x: 0.5, y: 0.5 } });
    const p2 = makeParams({ cellCount: 160, impact: null });
    const history = createHistory(p0);

    assert.equal(history.push(p1), true);
    assert.equal(history.push(p2), true);
    assert.equal(history.length(), 3);
    assert.equal(history.canUndo(), true);
    assert.equal(history.canRedo(), false);

    const stepBack1 = history.undo();
    assert.deepEqual(stepBack1, p1);
    assert.equal(history.canUndo(), true);
    assert.equal(history.canRedo(), true);

    // Mutating returned snapshot must not corrupt stored history entry
    stepBack1.cellCount = 777;
    stepBack1.impact.x = 0.99;
    assert.deepEqual(history.current(), p1);

    const stepBack2 = history.undo();
    assert.deepEqual(stepBack2, p0);
    assert.equal(history.canUndo(), false);
    assert.equal(history.canRedo(), true);
    assert.equal(history.undo(), null);

    const stepFwd1 = history.redo();
    assert.deepEqual(stepFwd1, p1);
    stepFwd1.impact.y = 0.01;
    assert.deepEqual(history.current(), p1);

    const stepFwd2 = history.redo();
    assert.deepEqual(stepFwd2, p2);
    assert.equal(history.canRedo(), false);
    assert.equal(history.redo(), null);
  });

  it('truncates the redo branch when pushing after undo()', () => {
    const p0 = makeParams({ seed: 1 });
    const p1 = makeParams({ seed: 2 });
    const p2 = makeParams({ seed: 3 });
    const p3 = makeParams({ seed: 4 });
    const branch = makeParams({ seed: 99 });

    const history = createHistory(p0);
    history.push(p1);
    history.push(p2);
    history.push(p3);

    assert.deepEqual(history.undo(), p2);
    assert.deepEqual(history.undo(), p1);
    assert.equal(history.canRedo(), true);

    assert.equal(history.push(branch), true);
    assert.equal(history.canRedo(), false);
    assert.equal(history.redo(), null);
    assert.equal(history.length(), 3);
    assert.deepEqual(history.current(), branch);
    assert.deepEqual(history.undo(), p1);
    assert.deepEqual(history.undo(), p0);
    assert.equal(history.canUndo(), false);
  });

  it('caps stored entries cleanly at maxLength', () => {
    const history = createHistory(makeParams({ seed: 0 }), 3);

    history.push(makeParams({ seed: 1 }));
    history.push(makeParams({ seed: 2 }));
    history.push(makeParams({ seed: 3 }));
    history.push(makeParams({ seed: 4 }));

    assert.equal(history.length(), 3);
    assert.deepEqual(history.current(), makeParams({ seed: 4 }));
    assert.deepEqual(history.undo(), makeParams({ seed: 3 }));
    assert.deepEqual(history.undo(), makeParams({ seed: 2 }));
    assert.equal(history.canUndo(), false);
    assert.equal(history.undo(), null);
  });

  it('reset() clears the stack to a single fresh cloned entry', () => {
    const history = createHistory(makeParams({ seed: 1 }));
    history.push(makeParams({ seed: 2 }));
    history.push(makeParams({ seed: 3 }));
    history.undo();

    assert.equal(history.canUndo(), true);
    assert.equal(history.canRedo(), true);

    const fresh = makeParams({ seed: 500, impact: { x: 0.7, y: 0.8 } });
    history.reset(fresh);

    assert.equal(history.length(), 1);
    assert.equal(history.canUndo(), false);
    assert.equal(history.canRedo(), false);
    assert.equal(history.undo(), null);
    assert.equal(history.redo(), null);

    fresh.impact.x = 0.0;
    assert.deepEqual(history.current(), makeParams({ seed: 500, impact: { x: 0.7, y: 0.8 } }));
  });
});
