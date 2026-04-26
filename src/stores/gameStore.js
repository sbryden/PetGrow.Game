// ============================================================
//  PetGrow — Game State Store
//  Writable Svelte store. Auto-saves to IndexedDB with a 120ms
//  debounce on every change.
// ============================================================
import { writable, get } from 'svelte/store';
import { createInitialGameState } from '../systems/constants.js';
import { saveActiveGame, loadActiveGame, clearActiveGame } from '../lib/db.js';

let saveTimer = null;
let pendingSave = Promise.resolve();

function persistNow(snapshot) {
  pendingSave = pendingSave
    .catch(() => {})
    .then(() => saveActiveGame(snapshot))
    .catch((err) => console.warn('Failed to save game:', err));
  return pendingSave;
}

function createGameStore() {
  const { subscribe, set, update } = writable(createInitialGameState());

  // Auto-save on every update (debounced 120ms)
  subscribe((state) => {
    if (!state.createdAt) return; // don't save the empty pre-hatch state
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void persistNow(snapshot(state));
    }, 120);
  });

  return {
    subscribe,
    set,
    update,

    /** Save immediately (no debounce) */
    saveNow() {
      const state = get({ subscribe });
      return persistNow(snapshot(state));
    },

    /** Load the active save from IndexedDB and hydrate the store. */
    async load() {
      const saved = await loadActiveGame();
      if (saved) set(hydrate(saved));
      return saved;
    },

    /** Clear the active save in IndexedDB and reset to the initial state. */
    async reset() {
      await clearActiveGame();
      set(createInitialGameState());
    },
  };
}

/** Deep-copy the state into a serializable snapshot. */
function snapshot(state) {
  return {
    ...state,
    ingredients: { ...state.ingredients },
    cachedImages: { ...state.cachedImages },
    needs: { ...state.needs },
    parentJobs: [...state.parentJobs],
    bgCleaned: { ...state.bgCleaned },
    renderModes: { ...state.renderModes },
  };
}

/** Merge a raw DB record into a fresh initial state (safe defaults). */
function hydrate(saved) {
  const base = createInitialGameState();
  return {
    ...base,
    ...saved,
    ingredients: { ...base.ingredients, ...(saved.ingredients || {}) },
    cachedImages: saved.cachedImages || {},
    needs: { ...base.needs, ...(saved.needs || {}) },
    parentJobs: saved.parentJobs || [],
    bgCleaned: saved.bgCleaned || {},
    renderModes: saved.renderModes || {},
    labElevatorScrolling: false,
  };
}

export const gameStore = createGameStore();
