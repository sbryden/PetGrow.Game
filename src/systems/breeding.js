// ============================================================
//  PetGrow — Breeding System
//  Pure JS — no Svelte imports.
// ============================================================

const INGREDIENT_OPTIONS = {
  animal:   ['Cat', 'Frog', 'Dragon', 'Bunny', 'Bear', 'Fox', 'Wolf', 'Bird', 'Fish', 'Slime'],
  color:    ['Galaxy Purple', 'Slime Green', 'Cotton Candy Pink', 'Ocean Blue', 'Lava Orange', 'Arctic White', 'Shadow Black', 'Golden Yellow', 'Rose Red', 'Mint Teal'],
  wildcard: ['Top Hat', 'Wings', 'Horns', 'Tail', 'Mask', 'Cape', 'Spots', 'Stripes', 'Glow', 'Crystals'],
  element:  ['Fire', 'Ice', 'Lightning', 'Nature', 'Water', 'Dark', 'Light', 'Earth', 'Wind', 'Void'],
};

/**
 * Mix two parents' ingredients to produce offspring ingredients.
 * Each slot has a 50/50 chance to come from either parent, with a
 * small random mutation chance.
 */
export function mixIngredients(parentA, parentB) {
  const result = {};

  for (const [category, options] of Object.entries(INGREDIENT_OPTIONS)) {
    const a = parentA[category];
    const b = parentB[category];

    if (!a && !b) {
      result[category] = null;
      continue;
    }

    const roll = Math.random();
    if (roll < 0.05) {
      // 5% mutation: pick a random option from the category
      result[category] = options[Math.floor(Math.random() * options.length)];
    } else if (!a) {
      result[category] = b;
    } else if (!b) {
      result[category] = a;
    } else {
      result[category] = Math.random() < 0.5 ? a : b;
    }
  }

  return result;
}

/**
 * Pick a random subset of jobs for the offspring to inherit,
 * excluding parent jobs so job diversity increases over generations.
 */
export function pickOffspringJobPool(parentJobIds, allJobs) {
  return allJobs
    .filter(j => !parentJobIds.includes(j.id))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
}
