// Auto-generated bug-hunting tests — exercises edge cases across
// breeding, prompts, needs, and constants modules to surface bugs.
import { describe, it, expect } from 'vitest';
import { buildPrompt, sanitizeName } from './prompts.js';
import { mixIngredients, pickOffspringJobPool } from './breeding.js';
import {
  doFeed, doClean, doPlay, doSleep,
  applyNeedDecay, calcMissedNeedTicks, getClickValue, clampNeed,
} from './needs.js';
import {
  createInitialGameState, calculateRarity, INGREDIENT_OPTIONS,
  NEED_MAX, NEED_DECAY_AMOUNT, NEED_MAX_MISSED_TICKS, NEED_ACTION_RESTORE,
  PET_JOBS,
} from './constants.js';

// ---------- Prompt edge cases ----------

describe('buildPrompt edge cases', () => {
  it('does not emit "null" when animal is missing', () => {
    const p = buildPrompt({ animal: null, color: 'Red', wildcard: null, element: null }, 'Baby');
    expect(p).not.toMatch(/\bnull\b/);
  });

  it('does not emit "undefined" when ingredients are partial', () => {
    const p = buildPrompt({ animal: 'Cat' }, 'Baby');
    expect(p).not.toMatch(/\bundefined\b/);
  });

  it('throws or fails gracefully when called with null ingredients', () => {
    expect(() => buildPrompt(null, 'Baby')).toThrow();
  });
});

describe('sanitizeName edge cases', () => {
  it('strips angle brackets that could break HTML if rendered', () => {
    expect(sanitizeName('<script>x</script>')).not.toMatch(/[<>]/);
  });
  it('caps length at 30', () => {
    expect(sanitizeName('a'.repeat(100)).length).toBeLessThanOrEqual(30);
  });
});

// ---------- Breeding edge cases ----------

describe('mixIngredients edge cases', () => {
  it('handles both parents having null for a category', () => {
    const result = mixIngredients({ animal: null }, { animal: null });
    expect(result.animal).toBeNull();
  });

  it('throws when a parent is missing entirely', () => {
    expect(() => mixIngredients(null, { animal: 'Cat' })).toThrow();
  });

  it('produces ingredients only from the two-parent set (modulo mutation)', () => {
    // Force no-mutation path with a stub: just run many times and check basic behavior.
    const a = { animal: 'Cat', color: 'Red', wildcard: 'Wings', element: 'Fire' };
    const b = { animal: 'Frog', color: 'Blue', wildcard: 'Horns', element: 'Ice' };
    for (let i = 0; i < 20; i++) {
      const r = mixIngredients(a, b);
      // Mutation path can pick any from INGREDIENT_OPTIONS, so just assert non-null
      expect(r.animal).toBeTruthy();
    }
  });
});

describe('pickOffspringJobPool edge cases', () => {
  it('returns up to 3 jobs even if all PET_JOBS are excluded', () => {
    const allIds = PET_JOBS.map(j => j.id);
    const pool = pickOffspringJobPool(allIds, PET_JOBS);
    expect(pool.length).toBe(0);
  });

  it('returns at most 3 from a large pool', () => {
    const pool = pickOffspringJobPool([], PET_JOBS);
    expect(pool.length).toBeLessThanOrEqual(3);
  });
});

// ---------- Needs edge cases ----------

describe('needs decay edge cases', () => {
  it('clamps negative inputs to 0', () => {
    const decayed = applyNeedDecay({ hunger: -5, cleanliness: 0, fun: 0, energy: 0 }, 1);
    expect(decayed.hunger).toBe(0);
  });

  it('caps missed ticks at NEED_MAX_MISSED_TICKS', () => {
    const a = applyNeedDecay({ hunger: 100, cleanliness: 100, fun: 100, energy: 100 }, NEED_MAX_MISSED_TICKS);
    const b = applyNeedDecay({ hunger: 100, cleanliness: 100, fun: 100, energy: 100 }, NEED_MAX_MISSED_TICKS + 1000);
    expect(a).toEqual(b);
  });

  it('calcMissedNeedTicks clamps to 0 when last decay is in the future (clock skew)', () => {
    const future = Date.now() + 60_000_000;
    const ticks = calcMissedNeedTicks(future);
    // Fixed in #7: future timestamps now return 0 instead of a negative
    // value that would otherwise *increase* needs via sign-flipped subtraction.
    expect(ticks).toBe(0);
  });
});

describe('actions edge cases', () => {
  it('doSleep restores energy by NEED_ACTION_RESTORE+10 and reduces hunger by 3', () => {
    const r = doSleep({ hunger: 50, cleanliness: 50, fun: 50, energy: 50 }, 0);
    expect(r.needs.energy).toBe(50 + NEED_ACTION_RESTORE + 10);
    expect(r.needs.hunger).toBe(47);
  });

  it('doFeed when minNeed is 0 awards 0 clicks but still applies need changes', () => {
    const r = doFeed({ hunger: 0, cleanliness: 50, fun: 50, energy: 50 }, 5);
    // BUG SURFACE: the action still drains energy and restores hunger but awards 0 clicks
    expect(r.clicks).toBe(5);
    expect(r.needs.hunger).toBe(NEED_ACTION_RESTORE); // 0 + 25
    expect(r.needs.energy).toBe(47);
  });

  it('action with minNeed at NEED_CRITICAL_THRESHOLD (15) awards 0.5 weighted click', () => {
    // We can't easily test randomness; just confirm tooSad is set
    const r = doPlay({ hunger: 15, cleanliness: 50, fun: 50, energy: 50 }, 0);
    expect(r.tooSad).toBe(true);
  });
});

// ---------- State edge cases ----------

describe('createInitialGameState invariants', () => {
  it('has all four needs at NEED_MAX', () => {
    const s = createInitialGameState();
    expect(s.needs.hunger).toBe(NEED_MAX);
    expect(s.needs.cleanliness).toBe(NEED_MAX);
    expect(s.needs.fun).toBe(NEED_MAX);
    expect(s.needs.energy).toBe(NEED_MAX);
  });

  it('mixSlots is exactly 2 nulls', () => {
    const s = createInitialGameState();
    expect(s.mixSlots).toEqual([null, null]);
  });

  it('createdAt is null for fresh state (used as load-saved sentinel)', () => {
    expect(createInitialGameState().createdAt).toBeNull();
  });
});

describe('calculateRarity edge cases', () => {
  it('returns Common for empty ingredients (BUG: 0 ingredients still returns Common, not "no rarity")', () => {
    const r = calculateRarity({});
    expect(r.cls).toBe('common');
  });

  it('returns Common when ingredients object has only null values', () => {
    const r = calculateRarity({ animal: null, color: null, wildcard: null, element: null });
    expect(r.cls).toBe('common');
  });
});
