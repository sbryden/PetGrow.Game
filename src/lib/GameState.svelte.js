// ============================================================
//  PetGrow — Game State (Svelte 5 Runes, class-based)
//  Replaces the old writable store in stores/gameStore.js.
//  Access state via gameStore.data.* — fully reactive in .svelte
//  files without any subscribe() / onDestroy() boilerplate.
// ============================================================
import { createInitialGameState } from '../systems/constants.js';
import { saveActiveGame, loadActiveGame, clearActiveGame } from './db.js';

/** Deep-copy the state into a serializable snapshot (no Proxy objects). */
function snapshot(state) {
  return {
    ...state,
    ingredients: { ...state.ingredients },
    cachedImages: { ...state.cachedImages },
    needs: { ...state.needs },
    parentJobs: [...(state.parentJobs || [])],
    bgCleaned: { ...state.bgCleaned },
    renderModes: { ...state.renderModes },
    heldItem: state.heldItem ? { ...state.heldItem } : null,
    mixSlots: [...(state.mixSlots || [null, null])].map(s => s ? { ...s } : null),
    feedingPickedIds: [...(state.feedingPickedIds || [])],
    droppedItems: Object.fromEntries(
      Object.entries(state.droppedItems || {}).map(([k, arr]) => [k, (arr || []).map(d => ({ ...d }))])
    ),
    journal: (state.journal || []).map(e => ({
      ...e,
      ingredients: (e.ingredients || []).map(i => ({ ...i })),
    })),
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
    heldItem: saved.heldItem || null,
    mixSlots: Array.isArray(saved.mixSlots) && saved.mixSlots.length === 2 ? saved.mixSlots : [null, null],
    feedingPickedIds: Array.isArray(saved.feedingPickedIds) ? saved.feedingPickedIds : [],
    droppedItems: saved.droppedItems && typeof saved.droppedItems === 'object' ? saved.droppedItems : {},
    journal: Array.isArray(saved.journal) ? saved.journal : [],
  };
}

class GameState {
  data = $state(createInitialGameState());

  constructor() {
    this._saveTimer = null;
    this._pendingSave = Promise.resolve();
  }

  _persistNow(snap) {
    this._pendingSave = this._pendingSave
      .catch(() => {})
      .then(() => saveActiveGame(snap))
      .catch((err) => console.warn('Failed to save game:', err));
    return this._pendingSave;
  }

  _scheduleSave() {
    if (!this.data.createdAt) return;
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      void this._persistNow(snapshot(this.data));
    }, 120);
  }

  /** Replace entire state and schedule save. */
  set(value) {
    this.data = value;
    this._scheduleSave();
  }

  /** Apply an updater function to the current state and schedule save. */
  update(fn) {
    this.data = fn(this.data);
    this._scheduleSave();
  }

  /** Save immediately (no debounce). */
  saveNow() {
    return this._persistNow(snapshot(this.data));
  }

  /** Load the active save from IndexedDB and hydrate. */
  async load() {
    const saved = await loadActiveGame();
    if (saved) this.data = hydrate(saved);
    return saved;
  }

  /** Clear the active save in IndexedDB and reset to initial state. */
  async reset() {
    await clearActiveGame();
    this.data = createInitialGameState();
  }
}

export const gameStore = new GameState();
