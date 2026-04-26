import { describe, it, expect } from 'vitest';
import { sanitizeName, buildPrompt } from './prompts.js';
import { LEVEL_BABY, LEVEL_TEEN, LEVEL_LEGEND, NO_JOB } from './constants.js';

const ingredients = {
  animal:   'Cat',
  color:    'Galaxy Purple',
  wildcard: 'Wings',
  element:  'Fire',
};

// ── sanitizeName ───────────────────────────────────────────────────────────

describe('sanitizeName', () => {
  it('allows alphanumeric characters and basic punctuation', () => {
    expect(sanitizeName("Fluffy")).toBe("Fluffy");
    expect(sanitizeName("Spike Jr.")).toBe("Spike Jr.");
    expect(sanitizeName("Mr. Bits-a-lot")).toBe("Mr. Bits-a-lot");
  });

  it('strips disallowed characters', () => {
    expect(sanitizeName("Evil<script>")).toBe("Evilscript");
    expect(sanitizeName("Drop; Table")).toBe("Drop Table");
  });

  it('truncates to 30 characters', () => {
    const long = 'A'.repeat(50);
    expect(sanitizeName(long)).toHaveLength(30);
  });

  it('returns empty string for fully invalid input', () => {
    expect(sanitizeName("🔥💥🐉")).toBe("");
  });

  it('preserves leading/trailing spaces (sanitize does not trim)', () => {
    // Documenting current behavior: spaces are allowed, no trim is applied
    expect(sanitizeName("  Fluffy  ")).toBe("  Fluffy  ");
  });

  it('handles empty string input', () => {
    expect(sanitizeName("")).toBe("");
  });
});

// ── buildPrompt ────────────────────────────────────────────────────────────

describe('buildPrompt', () => {
  it('includes the animal in the output', () => {
    const prompt = buildPrompt(ingredients, LEVEL_BABY);
    expect(prompt).toContain('Cat');
  });

  it('includes color, wildcard, and element', () => {
    const prompt = buildPrompt(ingredients, LEVEL_BABY);
    expect(prompt).toContain('Galaxy Purple');
    expect(prompt).toContain('Wings');
    expect(prompt).toContain('Fire');
  });

  it('omits color/wildcard/element clauses when they are null', () => {
    const minimal = { animal: 'Frog', color: null, wildcard: null, element: null };
    const prompt = buildPrompt(minimal, LEVEL_BABY);
    expect(prompt).not.toContain('coloring');
    expect(prompt).not.toContain('accessory');
    expect(prompt).not.toContain('texture');
  });

  it('uses baby-level language for LEVEL_BABY', () => {
    const prompt = buildPrompt(ingredients, LEVEL_BABY);
    expect(prompt).toContain('baby');
  });

  it('uses teen-level language for LEVEL_TEEN', () => {
    const prompt = buildPrompt(ingredients, LEVEL_TEEN);
    expect(prompt).toContain('teenage');
  });

  it('uses legend-level language for LEVEL_LEGEND', () => {
    const prompt = buildPrompt(ingredients, LEVEL_LEGEND);
    expect(prompt).toContain('legendary');
  });

  it('includes job promptMod for a legend with a known job', () => {
    const prompt = buildPrompt(ingredients, LEVEL_LEGEND, 'wizard');
    expect(prompt).toContain('wizard robe');
  });

  it('includes NO_JOB promptMod when job is "none"', () => {
    const prompt = buildPrompt(ingredients, LEVEL_LEGEND, 'none');
    expect(prompt).toContain(NO_JOB.promptMod);
  });

  it('silently ignores an unknown job id (no crash, no job content added)', () => {
    const promptNoJob = buildPrompt(ingredients, LEVEL_LEGEND, null);
    const promptBadJob = buildPrompt(ingredients, LEVEL_LEGEND, 'bogus_job_id');
    // Both should produce the same base prompt since the unknown job adds nothing
    expect(promptBadJob).toBe(promptNoJob);
  });

  it('does not include job content for baby level even if job is set', () => {
    const prompt = buildPrompt(ingredients, LEVEL_BABY, 'wizard');
    expect(prompt).not.toContain('wizard robe');
  });

  it('appends refinementNotes when provided', () => {
    const prompt = buildPrompt(ingredients, LEVEL_BABY, null, 'add extra sparkles');
    expect(prompt).toContain('add extra sparkles');
  });

  it('does not append extra text when refinementNotes is empty string', () => {
    const withNotes    = buildPrompt(ingredients, LEVEL_BABY, null, '');
    const withoutNotes = buildPrompt(ingredients, LEVEL_BABY);
    expect(withNotes).toBe(withoutNotes);
  });

  it('specifies a magenta background for AI background removal', () => {
    const prompt = buildPrompt(ingredients, LEVEL_BABY);
    expect(prompt).toContain('#FF00FF');
  });

  it('instructs the creature to face right', () => {
    const prompt = buildPrompt(ingredients, LEVEL_BABY);
    expect(prompt).toContain('facing right');
  });

  it('requests an A-pose for sprite slicing compatibility', () => {
    const prompt = buildPrompt(ingredients, LEVEL_BABY);
    expect(prompt).toContain('A-pose');
  });

  it('produces a non-empty string for minimal ingredients', () => {
    const minimal = { animal: 'Frog', color: null, wildcard: null, element: null };
    const prompt = buildPrompt(minimal, LEVEL_BABY);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });
});
