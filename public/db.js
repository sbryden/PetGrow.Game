// ============================================================
//  PetGrow — IndexedDB Storage
//  Stores gallery entries and the active game state off the main
//  thread so large image payloads do not block interactions.
// ============================================================
const PetDB = (() => {
  const DB_NAME = 'petgrow_db';
  const DB_VERSION = 2;
  const GALLERY_STORE = 'gallery';
  const ACTIVE_SAVE_STORE = 'active_save';
  const ACTIVE_SAVE_KEY = 'current';

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(GALLERY_STORE)) {
          const store = db.createObjectStore(GALLERY_STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('petName', 'petName', { unique: false });
        }
        if (!db.objectStoreNames.contains(ACTIVE_SAVE_STORE)) {
          db.createObjectStore(ACTIVE_SAVE_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveCreature(creature) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GALLERY_STORE, 'readwrite');
      const store = tx.objectStore(GALLERY_STORE);
      const entry = { ...creature };
      if (!entry.id) delete entry.id; // let autoIncrement assign
      const req = store.add(entry);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    });
  }

  async function loadAll() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GALLERY_STORE, 'readonly');
      const store = tx.objectStore(GALLERY_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    });
  }

  async function deleteCreature(id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GALLERY_STORE, 'readwrite');
      const store = tx.objectStore(GALLERY_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    });
  }

  async function getCreature(id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GALLERY_STORE, 'readonly');
      const store = tx.objectStore(GALLERY_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    });
  }

  async function saveActiveGame(gameState) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ACTIVE_SAVE_STORE, 'readwrite');
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
      const tx = db.transaction(ACTIVE_SAVE_STORE, 'readonly');
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
      const tx = db.transaction(ACTIVE_SAVE_STORE, 'readwrite');
      const store = tx.objectStore(ACTIVE_SAVE_STORE);
      const req = store.delete(ACTIVE_SAVE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    });
  }

  /** One‑time migration from the old localStorage gallery */
  async function migrateFromLocalStorage() {
    try {
      const raw = localStorage.getItem('petgrow_gallery');
      if (!raw) return;
      const gallery = JSON.parse(raw);
      if (!Array.isArray(gallery) || gallery.length === 0) return;

      // Don't re-migrate if IndexedDB already has data
      const existing = await loadAll();
      if (existing.length > 0) return;

      for (const creature of gallery) {
        await saveCreature(creature);
      }
      localStorage.removeItem('petgrow_gallery');
      console.log(`✅ Migrated ${gallery.length} creatures from localStorage → IndexedDB`);
    } catch (err) {
      console.warn('Gallery migration failed:', err);
    }
  }

  async function migrateActiveGameFromLocalStorage(saveKey) {
    try {
      const existing = await loadActiveGame();
      if (existing) return;

      const raw = localStorage.getItem(saveKey);
      if (!raw) return;

      const saved = JSON.parse(raw);
      await saveActiveGame(saved);
      localStorage.removeItem(saveKey);
      console.log('✅ Migrated active save from localStorage → IndexedDB');
    } catch (err) {
      console.warn('Active save migration failed:', err);
    }
  }

  return {
    open,
    saveCreature,
    loadAll,
    deleteCreature,
    getCreature,
    saveActiveGame,
    loadActiveGame,
    clearActiveGame,
    migrateFromLocalStorage,
    migrateActiveGameFromLocalStorage,
  };
})();
