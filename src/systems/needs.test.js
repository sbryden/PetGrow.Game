import { describe, it, expect, vi } from 'vitest';
import {
  clampNeed,
  getClickValue,
  applyNeedDecay,
  calcMissedNeedTicks,
  doFeed,
  doClean,
  doPlay,
  doSleep,
} from './needs.js';
import { NEED_MAX, NEED_DECAY_AMOUNT, NEED_ACTION_RESTORE, NEED_CRITICAL_THRESHOLD, NEED_DECAY_INTERVAL_MS } from './constants.js';

const fullNeeds    = () => ({ hunger: 100, cleanliness: 100, fun: 100, energy: 100 });
const criticalNeeds = () => ({ hunger: NEED_CRITICAL_THRESHOLD, cleanliness: 100, fun: 100, energy: 100 });
const zeroNeeds    = () => ({ hunger: 0, cleanliness: 0, fun: 0, energy: 0 });

// ── clampNeed ──────────────────────────────────────────────────────────────

describe('clampNeed', () => {
  it('returns value unchanged when within bounds', () => {
    expect(clampNeed(50)).toBe(50);
  });

  it('clamps to 0 when below minimum', () => {
    expect(clampNeed(-10)).toBe(0);
  });

  it('clamps to NEED_MAX when above maximum', () => {
    expect(clampNeed(NEED_MAX + 50)).toBe(NEED_MAX);
  });

  it('rounds fractional values', () => {
    expect(clampNeed(50.7)).toBe(51);
    expect(clampNeed(50.2)).toBe(50);
  });

  it('returns NEED_MAX for NEED_MAX exactly', () => {
    expect(clampNeed(NEED_MAX)).toBe(NEED_MAX);
  });

  it('returns 0 for 0 exactly', () => {
    expect(clampNeed(0)).toBe(0);
  });
});

// ── getClickValue ──────────────────────────────────────────────────────────

describe('getClickValue', () => {
  it('returns 1 when all needs are healthy', () => {
    expect(getClickValue(fullNeeds())).toBe(1);
  });

  // Exact boundary: threshold itself should be critical
  it('returns 0.5 when a need is exactly at NEED_CRITICAL_THRESHOLD', () => {
    expect(getClickValue(criticalNeeds())).toBe(0.5);
  });

  // One above threshold should be healthy
  it('returns 1 when all needs are one above NEED_CRITICAL_THRESHOLD', () => {
    const needs = { hunger: NEED_CRITICAL_THRESHOLD + 1, cleanliness: 100, fun: 100, energy: 100 };
    expect(getClickValue(needs)).toBe(1);
  });

  it('returns 0.5 when a single need is critical, others healthy', () => {
    expect(getClickValue({ ...fullNeeds(), hunger: 10 })).toBe(0.5);
  });

  it('returns 0.5 when a need is 1 (non-zero but critical)', () => {
    expect(getClickValue({ ...fullNeeds(), fun: 1 })).toBe(0.5);
  });

  it('returns 0 when any need is zero', () => {
    expect(getClickValue({ ...fullNeeds(), fun: 0 })).toBe(0);
  });

  it('returns 0 for all-zero needs', () => {
    expect(getClickValue(zeroNeeds())).toBe(0);
  });

  it('uses the minimum — one bad need overrules three healthy ones', () => {
    // If minimum is critical, result is 0.5 regardless of other values
    expect(getClickValue({ hunger: 5, cleanliness: 100, fun: 100, energy: 100 })).toBe(0.5);
    // If minimum is zero, result is 0 regardless of other values
    expect(getClickValue({ hunger: 0, cleanliness: 100, fun: 100, energy: 100 })).toBe(0);
  });
});

// ── applyNeedDecay ─────────────────────────────────────────────────────────

describe('applyNeedDecay', () => {
  it('reduces each need by NEED_DECAY_AMOUNT for 1 tick', () => {
    const result = applyNeedDecay(fullNeeds(), 1);
    expect(result.hunger).toBe(NEED_MAX - NEED_DECAY_AMOUNT);
    expect(result.cleanliness).toBe(NEED_MAX - NEED_DECAY_AMOUNT);
    expect(result.fun).toBe(NEED_MAX - NEED_DECAY_AMOUNT);
    expect(result.energy).toBe(NEED_MAX - NEED_DECAY_AMOUNT);
  });

  it('applies multiplicative decay for multiple ticks', () => {
    const result = applyNeedDecay(fullNeeds(), 3);
    expect(result.hunger).toBe(NEED_MAX - NEED_DECAY_AMOUNT * 3);
  });

  it('caps at NEED_MAX_MISSED_TICKS (20) — excess ticks are ignored', () => {
    const capped = applyNeedDecay(fullNeeds(), 20);
    const over   = applyNeedDecay(fullNeeds(), 999);
    expect(capped.hunger).toBe(over.hunger);
  });

  it('never goes below 0', () => {
    const result = applyNeedDecay(zeroNeeds(), 5);
    expect(result.hunger).toBe(0);
    expect(result.energy).toBe(0);
  });

  it('defaults to 1 tick when missedTicks is omitted', () => {
    const result = applyNeedDecay(fullNeeds());
    expect(result.hunger).toBe(NEED_MAX - NEED_DECAY_AMOUNT);
  });

  it('does not mutate the input needs object', () => {
    const original = fullNeeds();
    applyNeedDecay(original, 2);
    expect(original.hunger).toBe(100);
  });
});

// ── calcMissedNeedTicks ────────────────────────────────────────────────────

describe('calcMissedNeedTicks', () => {
  it('returns 0 when last decay was just now', () => {
    expect(calcMissedNeedTicks(Date.now())).toBe(0);
  });

  it('returns 1 for exactly one interval elapsed', () => {
    expect(calcMissedNeedTicks(Date.now() - NEED_DECAY_INTERVAL_MS)).toBe(1);
  });

  it('returns 2 for 2.5 intervals elapsed (floors fractional ticks)', () => {
    expect(calcMissedNeedTicks(Date.now() - NEED_DECAY_INTERVAL_MS * 2.5)).toBe(2);
  });

  it('returns 5 for 5 intervals elapsed', () => {
    expect(calcMissedNeedTicks(Date.now() - NEED_DECAY_INTERVAL_MS * 5)).toBe(5);
  });
});

// ── action resolvers ───────────────────────────────────────────────────────

describe('doFeed', () => {
  it('restores hunger and costs energy', () => {
    const needs = fullNeeds();
    const { needs: out } = doFeed(needs, 0);
    expect(out.hunger).toBe(Math.min(NEED_MAX, needs.hunger + NEED_ACTION_RESTORE));
    expect(out.energy).toBe(needs.energy - 3);
  });

  it('awards a click when healthy', () => {
    const { clicks } = doFeed(fullNeeds(), 5);
    expect(clicks).toBe(6);
  });

  // Regression: tooSad was previously cv <= 0, which missed critical state
  it('tooSad is false when all needs are healthy', () => {
    expect(doFeed(fullNeeds(), 0).tooSad).toBe(false);
  });

  it('tooSad is true when a need is critical (≤ NEED_CRITICAL_THRESHOLD)', () => {
    expect(doFeed(criticalNeeds(), 0).tooSad).toBe(true);
  });

  it('tooSad is true when any need is zero', () => {
    expect(doFeed(zeroNeeds(), 0).tooSad).toBe(true);
  });

  it('does not award a click when all needs are zero', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // force worst-case random
    const { clicks } = doFeed(zeroNeeds(), 5);
    expect(clicks).toBe(5);
    vi.restoreAllMocks();
  });

  it('does not mutate the input needs object', () => {
    const needs = fullNeeds();
    doFeed(needs, 0);
    expect(needs.hunger).toBe(100);
    expect(needs.energy).toBe(100);
  });
});

describe('doClean', () => {
  it('restores cleanliness and costs energy', () => {
    const needs = { ...fullNeeds(), cleanliness: 50 };
    const { needs: out } = doClean(needs, 0);
    expect(out.cleanliness).toBe(50 + NEED_ACTION_RESTORE);
    expect(out.energy).toBe(NEED_MAX - 3);
  });

  it('awards a click when healthy', () => {
    const { clicks } = doClean(fullNeeds(), 0);
    expect(clicks).toBe(1);
  });

  // Regression: critical state must flag tooSad
  it('tooSad is true in critical state', () => {
    expect(doClean(criticalNeeds(), 0).tooSad).toBe(true);
  });
});

describe('doPlay', () => {
  it('restores fun and costs more energy than other actions', () => {
    const needs = fullNeeds();
    const { needs: out } = doPlay(needs, 0);
    expect(out.fun).toBe(Math.min(NEED_MAX, needs.fun + NEED_ACTION_RESTORE));
    expect(out.energy).toBe(needs.energy - 5);
  });

  // Regression: critical state must flag tooSad
  it('tooSad is true in critical state', () => {
    expect(doPlay(criticalNeeds(), 0).tooSad).toBe(true);
  });
});

describe('doSleep', () => {
  it('restores energy by NEED_ACTION_RESTORE + 10 and costs hunger', () => {
    const needs = fullNeeds();
    const { needs: out } = doSleep(needs, 0);
    expect(out.energy).toBe(Math.min(NEED_MAX, needs.energy + NEED_ACTION_RESTORE + 10));
    expect(out.hunger).toBe(needs.hunger - 3);
  });

  // Regression: critical state must flag tooSad
  it('tooSad is true in critical state', () => {
    expect(doSleep(criticalNeeds(), 0).tooSad).toBe(true);
  });
});
