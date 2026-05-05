export const DATABASE_NAME = 'ship-database-app';
export const STORE_NAME = 'app-state';
export const STATE_KEY = 'database-v1';
export const DATABASE_VERSION = 1;

const COLOR_MODE_STORAGE_KEY = 'sdrs:color-mode';

function closeDatabase(database) {
  if (database) {
    database.close();
  }
}

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        closeDatabase(database);
      };
      resolve(database);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB connection was blocked.'));
  });
}

export async function loadStoredDatabaseState() {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(STATE_KEY);

    const finalize = () => {
      closeDatabase(database);
    };

    request.onsuccess = () => {
      resolve(request.result ?? null);
    };
    request.onerror = () => {
      reject(request.error);
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB read transaction was aborted.'));
    };
    transaction.oncomplete = finalize;
    transaction.onerror = finalize;
  });
}

export async function getColorModePreference() {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(COLOR_MODE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setColorModePreference(mode) {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, String(mode));
  } catch {
    // ignore storage failures (e.g. private mode quota errors)
  }
}

export async function saveStoredDatabaseState(state) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    transaction.oncomplete = () => {
      closeDatabase(database);
      resolve();
    };
    transaction.onerror = () => {
      closeDatabase(database);
      reject(transaction.error ?? new Error('IndexedDB write transaction failed.'));
    };
    transaction.onabort = () => {
      closeDatabase(database);
      reject(transaction.error ?? new Error('IndexedDB write transaction was aborted.'));
    };

    store.put(state, STATE_KEY);
  });
}
