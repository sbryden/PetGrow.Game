import { describe, it, expect, vi, afterEach } from 'vitest';
import { mixIngredients, pickOffspringJobPool } from './breeding.js';

afterEach(() => vi.restoreAllMocks());

const parentA = {
  animal:   'Cat',
  color:    'Galaxy Purple',
  wildcard: 'Wings',
  element:  'Fire',
};

const parentB = {
  animal:   'Dragon',
  color:    'Ocean Blue',
  wildcard: 'Horns',
  element:  'Ice',
};

// ── mixIngredients ─────────────────────────────────────────────────────────

describe('mixIngredients', () => {
  it('returns an object with all four ingredient keys', () => {
    const result = mixIngredients(parentA, parentB);
    expect(result).toHaveProperty('animal');
    expect(result).toHaveProperty('color');
    expect(result).toHaveProperty('wildcard');
    expect(result).toHaveProperty('element');
  });

  it('inherits parentA values when random is always < 0.5 (no mutation)', () => {
    // roll=0.10 → above mutation threshold (0.05), 50/50 branch; 0.10 < 0.5 → picks parentA
    vi.spyOn(Math, 'random').mockReturnValue(0.10);
    const result = mixIngredients(parentA, parentB);
    expect(result.animal).toBe(parentA.animal);
    expect(result.color).toBe(parentA.color);
    expect(result.wildcard).toBe(parentA.wildcard);
    expect(result.element).toBe(parentA.element);
  });

  it('inherits parentB values when random is always ≥ 0.5 (no mutation)', () => {
    // roll=0.60 → no mutation; second random 0.60 ≥ 0.5 → picks parentB
    vi.spyOn(Math, 'random').mockReturnValue(0.60);
    const result = mixIngredients(parentA, parentB);
    expect(result.animal).toBe(parentB.animal);
    expect(result.element).toBe(parentB.element);
  });

  it('uses mutation pool when first random roll < 0.05', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.01)  // mutation roll for 'animal' (< 0.05 → mutate)
      .mockReturnValueOnce(0.0)   // picks index 0 from animal options ('Cat')
      .mockReturnValue(0.10);     // remaining rolls: no mutation, pick parentA
    const result = mixIngredients(parentA, parentB);
    // Index 0 of the animal array is 'Cat'
    expect(result.animal).toBe('Cat');
    expect(result.color).toBe(parentA.color);
  });


  it('returns null for a slot when both parents have null for it', () => {
    const a = { ...parentA, wildcard: null };
    const b = { ...parentB, wildcard: null };
    const result = mixIngredients(a, b);
    expect(result.wildcard).toBeNull();
  });

  it('inherits the non-null parent value when one parent slot is null (no mutation)', () => {
    // roll=0.10 → no mutation, and a.wildcard is null → falls to b
    vi.spyOn(Math, 'random').mockReturnValue(0.10);
    const a = { ...parentA, wildcard: null };
    const result = mixIngredients(a, parentB);
    expect(result.wildcard).toBe(parentB.wildcard);
  });

  it('does not mutate either parent object', () => {
    const aCopy = { ...parentA };
    const bCopy = { ...parentB };
    mixIngredients(parentA, parentB);
    expect(parentA).toEqual(aCopy);
    expect(parentB).toEqual(bCopy);
  });

  it('always returns string values (never undefined) for slots with at least one parent value', () => {
    for (let i = 0; i < 100; i++) {
      const result = mixIngredients(parentA, parentB);
      expect(typeof result.animal).toBe('string');
      expect(typeof result.element).toBe('string');
    }
  });
});

// ── pickOffspringJobPool ───────────────────────────────────────────────────

const allJobs = [
  { id: 'knight' },
  { id: 'wizard' },
  { id: 'chef' },
  { id: 'ninja' },
  { id: 'healer' },
];

describe('pickOffspringJobPool', () => {
  it('returns exactly 3 jobs when enough are available', () => {
    const pool = pickOffspringJobPool(['knight', 'wizard'], allJobs);
    expect(pool).toHaveLength(3);
  });

  it('excludes parent job ids', () => {
    const parentJobIds = ['knight', 'wizard'];
    const pool = pickOffspringJobPool(parentJobIds, allJobs);
    for (const job of pool) {
      expect(parentJobIds).not.toContain(job.id);
    }
  });

  it('returns exactly the available count when fewer than 3 remain', () => {
    // Excluding 3 of 5 leaves exactly 2 available — not ≤ 2, exactly 2
    const pool = pickOffspringJobPool(['knight', 'wizard', 'chef'], allJobs);
    expect(pool).toHaveLength(2);
  });

  it('returns empty array when all jobs are excluded', () => {
    const allIds = allJobs.map(j => j.id);
    const pool = pickOffspringJobPool(allIds, allJobs);
    expect(pool).toHaveLength(0);
  });

  it('returns no duplicate jobs', () => {
    const pool = pickOffspringJobPool(['knight'], allJobs);
    const ids = pool.map(j => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('works when parent has no jobs (empty exclusion list)', () => {
    const pool = pickOffspringJobPool([], allJobs);
    expect(pool).toHaveLength(3);
  });

  it('does not mutate the allJobs array', () => {
    const originalOrder = allJobs.map(j => j.id);
    pickOffspringJobPool(['knight'], allJobs);
    expect(allJobs.map(j => j.id)).toEqual(originalOrder);
  });

  it('returns job object references from allJobs (not copies)', () => {
    const pool = pickOffspringJobPool([], allJobs);
    for (const job of pool) {
      expect(allJobs).toContain(job);
    }
  });
});
