import { describe, it, expect } from 'vitest';
import {
  calculateRarity,
  RARITY_LEVELS,
  LEVEL_BABY,
  LEVEL_TEEN,
  LEVEL_LEGEND,
  TEEN_THRESHOLD,
  LEGEND_THRESHOLD,
  createInitialGameState,
  NEED_MAX,
} from './constants.js';

// ── calculateRarity ────────────────────────────────────────────────────────

describe('calculateRarity', () => {
  it('returns Common for 1 ingredient', () => {
    const r = calculateRarity({ animal: 'Cat', color: null, wildcard: null, element: null });
    expect(r.name).toBe('Common');
    expect(r.cls).toBe('common');
  });

  it('returns Uncommon for 2 ingredients', () => {
    const r = calculateRarity({ animal: 'Cat', color: 'Fire Red', wildcard: null, element: null });
    expect(r.name).toBe('Uncommon');
  });

  it('returns Rare for 3 ingredients', () => {
    const r = calculateRarity({ animal: 'Cat', color: 'Fire Red', wildcard: 'Wings', element: null });
    expect(r.name).toBe('Rare');
  });

  it('returns Epic for all 4 ingredients', () => {
    const r = calculateRarity({ animal: 'Cat', color: 'Fire Red', wildcard: 'Wings', element: 'Fire' });
    expect(r.name).toBe('Epic');
  });

  // Documenting edge-case: 0 ingredients falls through the loop and returns Common via fallback
  it('returns the Common fallback for 0 ingredients (all null)', () => {
    const r = calculateRarity({ animal: null, color: null, wildcard: null, element: null });
    expect(r).toBe(RARITY_LEVELS[0]);
    expect(r.name).toBe('Common');
  });

  it('returns the Common fallback for an empty object', () => {
    const r = calculateRarity({});
    expect(r.name).toBe('Common');
  });

  it('ignores falsy values (null, undefined, empty string) when counting', () => {
    const r = calculateRarity({ animal: 'Cat', color: '', wildcard: undefined, element: null });
    // Only 'Cat' is truthy → count = 1 → Common
    expect(r.name).toBe('Common');
  });

  it('always returns an object with name, cls, and min properties', () => {
    const cases = [
      { animal: null, color: null, wildcard: null, element: null },
      { animal: 'Cat', color: null, wildcard: null, element: null },
      { animal: 'Cat', color: 'Red', wildcard: 'Wings', element: 'Fire' },
    ];
    for (const ingredients of cases) {
      const r = calculateRarity(ingredients);
      expect(r).toHaveProperty('name');
      expect(r).toHaveProperty('cls');
      expect(r).toHaveProperty('min');
    }
  });
});

// ── level thresholds ───────────────────────────────────────────────────────

describe('level threshold constants', () => {
  it('TEEN_THRESHOLD is less than LEGEND_THRESHOLD', () => {
    expect(TEEN_THRESHOLD).toBeLessThan(LEGEND_THRESHOLD);
  });

  it('TEEN_THRESHOLD is positive', () => {
    expect(TEEN_THRESHOLD).toBeGreaterThan(0);
  });

  it('level constants are distinct strings', () => {
    expect(LEVEL_BABY).not.toBe(LEVEL_TEEN);
    expect(LEVEL_TEEN).not.toBe(LEVEL_LEGEND);
    expect(LEVEL_BABY).not.toBe(LEVEL_LEGEND);
  });
});

// ── createInitialGameState ─────────────────────────────────────────────────

describe('createInitialGameState', () => {
  it('returns a state with all four ingredient slots as null', () => {
    const state = createInitialGameState();
    expect(state.ingredients.animal).toBeNull();
    expect(state.ingredients.color).toBeNull();
    expect(state.ingredients.wildcard).toBeNull();
    expect(state.ingredients.element).toBeNull();
  });

  it('starts at LEVEL_BABY', () => {
    const state = createInitialGameState();
    expect(state.level).toBe(LEVEL_BABY);
  });

  it('starts with 0 clicks', () => {
    const state = createInitialGameState();
    expect(state.clicks).toBe(0);
  });

  it('starts all needs at NEED_MAX', () => {
    const state = createInitialGameState();
    expect(state.needs.hunger).toBe(NEED_MAX);
    expect(state.needs.cleanliness).toBe(NEED_MAX);
    expect(state.needs.fun).toBe(NEED_MAX);
    expect(state.needs.energy).toBe(NEED_MAX);
  });

  it('produces independent state objects on each call (no shared references)', () => {
    const a = createInitialGameState();
    const b = createInitialGameState();
    a.needs.hunger = 0;
    expect(b.needs.hunger).toBe(NEED_MAX);
  });

  it('createdAt is null by default (pre-hatch)', () => {
    const state = createInitialGameState();
    expect(state.createdAt).toBeNull();
  });
});
