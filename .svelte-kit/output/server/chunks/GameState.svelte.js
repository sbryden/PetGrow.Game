import "clsx";
const LEVEL_BABY = "Baby";
const NEED_MAX = 100;
const NEED_WARN_THRESHOLD = 30;
const NEED_CRITICAL_THRESHOLD = 15;
const PLATFORM_ROOM_ID = "platform";
const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const ROOMS = [
  { id: PLATFORM_ROOM_ID, name: "The House", emoji: "🏠", actions: [] },
  { id: "lab", name: "Lab", emoji: "🧪", actions: [] },
  { id: "lab-science", name: "Science Room", emoji: "🔬", actions: [] },
  { id: "lab-mix", name: "Mix N' Mix", emoji: "🧬", actions: [] },
  { id: "lab-breeding", name: "Breeding", emoji: "💕", actions: [] },
  { id: "lab-potions", name: "Potions Room", emoji: "⚗️", actions: [] },
  { id: "lab-enhancement", name: "Enhancement", emoji: "⬆️", actions: [] },
  { id: "feeding", name: "Feeding Room", emoji: "🍖", actions: ["feed"] },
  { id: "bathroom", name: "Bathroom", emoji: "🧼", actions: ["clean"] },
  { id: "playroom", name: "Playroom", emoji: "🎾", actions: ["play"] },
  { id: "bedroom", name: "Bedroom", emoji: "🛏️", actions: ["sleep"] },
  { id: "breeding", name: "Breeding Room", emoji: "🥚", actions: ["breed"] }
];
const INGREDIENT_OPTIONS = {
  animal: ["Cat", "Frog", "Dragon", "Bunny", "Bear", "Fox", "Wolf", "Bird", "Fish", "Slime"],
  color: ["Galaxy Purple", "Slime Green", "Cotton Candy Pink", "Ocean Blue", "Lava Orange", "Arctic White", "Shadow Black", "Golden Yellow", "Rose Red", "Mint Teal"],
  wildcard: ["Top Hat", "Wings", "Horns", "Tail", "Mask", "Cape", "Spots", "Stripes", "Glow", "Crystals", "Crown", "Antennae", "Feathers", "Tentacles", "Claws", "Shell", "Spikes", "Halo", "Vines", "Goggles"],
  element: ["Fire", "Ice", "Lightning", "Nature", "Water", "Dark", "Light", "Earth", "Wind", "Void"]
};
const INGREDIENT_EMOJIS = {
  animal: { Cat: "😺", Frog: "🐸", Dragon: "🐉", Bunny: "🐰", Bear: "🐻", Fox: "🦊", Wolf: "🐺", Bird: "🐦", Fish: "🐟", Slime: "🫧" },
  color: { "Galaxy Purple": "🟣", "Slime Green": "🟢", "Cotton Candy Pink": "🩷", "Ocean Blue": "🔵", "Lava Orange": "🟠", "Arctic White": "⬜", "Shadow Black": "⬛", "Golden Yellow": "🟡", "Rose Red": "🔴", "Mint Teal": "🩵" },
  wildcard: { "Top Hat": "🎩", Wings: "🪽", Horns: "📯", Tail: "🦕", Mask: "🎭", Cape: "🧣", Spots: "🔵", Stripes: "🦓", Glow: "✨", Crystals: "💎", Crown: "👑", Antennae: "📡", Feathers: "🪶", Tentacles: "🦑", Claws: "🐾", Shell: "🐚", Spikes: "⚡", Halo: "😇", Vines: "🌿", Goggles: "🥽" },
  element: { Fire: "🔥", Ice: "❄️", Lightning: "⚡", Nature: "🌿", Water: "💧", Dark: "🌑", Light: "☀️", Earth: "🪨", Wind: "🌬️", Void: "🌀" }
};
const RARITY_LEVELS = [
  { name: "Common", cls: "common", min: 1 },
  { name: "Uncommon", cls: "uncommon", min: 2 },
  { name: "Rare", cls: "rare", min: 3 },
  { name: "Epic", cls: "epic", min: 4 }
];
function calculateRarity(ingredients) {
  const count = Object.values(ingredients).filter(Boolean).length;
  for (let i = RARITY_LEVELS.length - 1; i >= 0; i--) {
    if (count >= RARITY_LEVELS[i].min) return RARITY_LEVELS[i];
  }
  return RARITY_LEVELS[0];
}
function createInitialGameState() {
  return {
    ingredients: { animal: null, color: null, wildcard: null, element: null },
    petName: "",
    clicks: 0,
    level: LEVEL_BABY,
    cachedImages: {},
    lastDecayTime: Date.now(),
    createdAt: null,
    petX: null,
    petY: null,
    currentRoom: PLATFORM_ROOM_ID,
    needs: {
      hunger: NEED_MAX,
      cleanliness: NEED_MAX,
      fun: NEED_MAX,
      energy: NEED_MAX
    },
    lastNeedDecayTime: Date.now(),
    job: null,
    parentJobs: [],
    bgCleaned: {},
    renderModes: {},
    labFloor: 1,
    labElevatorScrolling: false
  };
}
const DB_NAME = "petgrow_db";
const DB_VERSION = 2;
const GALLERY_STORE = "gallery";
const ACTIVE_SAVE_STORE = "active_save";
const ACTIVE_SAVE_KEY = "current";
function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(GALLERY_STORE)) {
        const store = db.createObjectStore(GALLERY_STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("petName", "petName", { unique: false });
      }
      if (!db.objectStoreNames.contains(ACTIVE_SAVE_STORE)) {
        db.createObjectStore(ACTIVE_SAVE_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function saveActiveGame(gameState) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ACTIVE_SAVE_STORE, "readwrite");
    const store = tx.objectStore(ACTIVE_SAVE_STORE);
    const req = store.put({ key: ACTIVE_SAVE_KEY, data: gameState, updatedAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}
async function loadActiveGame() {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ACTIVE_SAVE_STORE, "readonly");
    const store = tx.objectStore(ACTIVE_SAVE_STORE);
    const req = store.get(ACTIVE_SAVE_KEY);
    req.onsuccess = () => resolve(req.result?.data || null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}
async function clearActiveGame() {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ACTIVE_SAVE_STORE, "readwrite");
    const store = tx.objectStore(ACTIVE_SAVE_STORE);
    const req = store.delete(ACTIVE_SAVE_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}
function snapshot(state) {
  return {
    ...state,
    ingredients: { ...state.ingredients },
    cachedImages: { ...state.cachedImages },
    needs: { ...state.needs },
    parentJobs: [...state.parentJobs || []],
    bgCleaned: { ...state.bgCleaned },
    renderModes: { ...state.renderModes }
  };
}
function hydrate(saved) {
  const base = createInitialGameState();
  return {
    ...base,
    ...saved,
    ingredients: { ...base.ingredients, ...saved.ingredients || {} },
    cachedImages: saved.cachedImages || {},
    needs: { ...base.needs, ...saved.needs || {} },
    parentJobs: saved.parentJobs || [],
    bgCleaned: saved.bgCleaned || {},
    renderModes: saved.renderModes || {},
    labElevatorScrolling: false
  };
}
class GameState {
  data = createInitialGameState();
  constructor() {
    this._saveTimer = null;
    this._pendingSave = Promise.resolve();
  }
  _persistNow(snap) {
    this._pendingSave = this._pendingSave.catch(() => {
    }).then(() => saveActiveGame(snap)).catch((err) => console.warn("Failed to save game:", err));
    return this._pendingSave;
  }
  _scheduleSave() {
    if (!this.data.createdAt) return;
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(
      () => {
        this._saveTimer = null;
        void this._persistNow(snapshot(this.data));
      },
      120
    );
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
const gameStore = new GameState();
export {
  INGREDIENT_EMOJIS as I,
  NEED_CRITICAL_THRESHOLD as N,
  PLATFORM_ROOM_ID as P,
  ROOMS as R,
  TRANSPARENT_PIXEL as T,
  NEED_WARN_THRESHOLD as a,
  INGREDIENT_OPTIONS as b,
  calculateRarity as c,
  gameStore as g
};
