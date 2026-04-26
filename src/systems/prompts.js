// ============================================================
//  PetGrow — Prompt Builder
//  Pure JS — no Svelte imports.
// ============================================================
import { LEVEL_BABY, LEVEL_TEEN, LEVEL_LEGEND, PET_JOBS, NO_JOB } from './constants.js';

/** Strip characters that could confuse the AI prompt */
export function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9 \-_'.!]/g, '').slice(0, 30);
}

/**
 * Build a Gemini image-generation prompt for the given level.
 * @param {object} ingredients - { animal, color, wildcard, element }
 * @param {string} level - LEVEL_BABY | LEVEL_TEEN | LEVEL_LEGEND
 * @param {string|null} job - job id or null
 * @param {string} refinementNotes - extra instructions for retry passes
 */
export function buildPrompt(ingredients, level, job = null, refinementNotes = '') {
  const { animal, color, wildcard, element } = ingredients;

  let sizeWord, vibe;
  if (level === LEVEL_BABY) {
    sizeWord = 'tiny, small, baby';
    vibe = 'cute, chibi, adorable, round, big sparkly eyes, wobbly';
  } else if (level === LEVEL_TEEN) {
    sizeWord = 'medium-sized, teenage, growing';
    vibe = 'confident, cool, energetic, slightly tougher, showing personality';
  } else {
    sizeWord = 'massive, majestic, legendary, fully-evolved';
    vibe = 'epic, powerful, wearing a crown or armor, boss-level';
    if (job) {
      const jobData = job === NO_JOB.id
        ? NO_JOB
        : PET_JOBS.find(j => j.id === job);
      if (jobData) vibe += ', ' + jobData.promptMod;
    }
  }

  let desc = `A ${sizeWord} ${animal}`;
  if (color)    desc += ` with ${color} coloring`;
  if (wildcard) desc += `, featuring a ${wildcard} as part of its body or as an accessory`;
  if (element)  desc += `, with a ${element} texture`;

  let prompt =
    `Draw a single cute Tamagotchi-style virtual pet creature. The creature is: ${desc}. ` +
    `Style: ${vibe}. The art style should be colorful digital illustration, like a modern Tamagotchi or virtual pet game sprite. ` +
    `Draw the creature LARGE so it fills at least 80% of the image — do not leave large empty margins. ` +
    `Place the creature on a plain solid bright magenta (#FF00FF) background with absolutely no gradients, patterns, or scenery — just a flat uniform magenta fill behind the sprite. ` +
    `The creature should be centered, facing right (the creature's face and body should point toward the right side of the image), ` +
    `standing upright in an A-pose with arms, fins, or limbs slightly spread away from the body. ` +
    `The head should be clearly distinct from the torso with a visible neck or narrowing between them. ` +
    `All limbs and appendages should have clear separation from the torso — no limbs pressed flat against the body. ` +
    `Full body visible including all limbs, fins, tentacles, or appendages. No text in the image.`;

  if (refinementNotes) prompt += ` ${refinementNotes}`;

  return prompt;
}


