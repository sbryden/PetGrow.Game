// ============================================================
//  PetGrow — IndexedDB Gallery Storage
//  Replaces localStorage for gallery to avoid the 5 MB limit.
// ============================================================
const PetDB = (() => {
  const DB_NAME = 'petgrow_db';
  const DB_VERSION = 1;
  const STORE = 'gallery';

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('petName', 'petName', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveCreature(creature) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const entry = { ...creature };
      if (!entry.id) delete entry.id; // let autoIncrement assign
      const req = store.add(entry);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  async function loadAll() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  async function deleteCreature(id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  async function getCreature(id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
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

  return { open, saveCreature, loadAll, deleteCreature, getCreature, migrateFromLocalStorage };
})();
