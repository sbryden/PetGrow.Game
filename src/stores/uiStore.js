// ============================================================
//  PetGrow — UI State Store
//  Controls which screen is active and global overlay flags.
// ============================================================
import { writable } from 'svelte/store';

/** @type {'egg-lab' | 'hatching' | 'pet-game' | 'gallery'} */
export const currentScreen = writable('egg-lab');

/** True while the Gemini image is being generated */
export const isGenerating = writable(false);

/** Text shown inside the hatching/evolution overlay */
export const generatingText = writable('');

export function goTo(screen) {
  currentScreen.set(screen);
}
