import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

export const DATABASE_NAME = 'ship-database-app';
export const STORE_NAME = 'app-state';
export const STATE_KEY = 'database-v1';
export const DATABASE_VERSION = 1;

const COLOR_MODE_STORAGE_KEY = 'sdrs:color-mode';
const STATE_TABLE_NAME = 'app_state';
const LEGACY_STATE_TABLE_NAME = 'app-state';

let databasePromise = null;

async function tableExists(database, tableName) {
  const row = await database.getFirstAsync(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?;",
    tableName,
  );

  return Boolean(row?.name);
}

async function initializeStateTable(database) {
  await database.execAsync(
    `CREATE TABLE IF NOT EXISTS ${STATE_TABLE_NAME} (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );`,
  );

  const hasLegacyTable = await tableExists(database, LEGACY_STATE_TABLE_NAME);

  if (!hasLegacyTable) {
    return;
  }

  try {
    const legacyRow = await database.getFirstAsync(
      'SELECT value FROM "app-state" WHERE key = ?;',
      STATE_KEY,
    );

    if (typeof legacyRow?.value === 'string') {
      await database.runAsync(
        `INSERT INTO ${STATE_TABLE_NAME} (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
        STATE_KEY,
        legacyRow.value,
      );
    }
  } catch (error) {
    console.warn('[storage] legacy state table migration skipped:', error);
  }

  try {
    await database.execAsync('DROP TABLE IF EXISTS "app-state";');
  } catch (error) {
    console.warn('[storage] legacy state table cleanup skipped:', error);
  }
}

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      const database = await SQLite.openDatabaseAsync(`${DATABASE_NAME}.db`);
      await initializeStateTable(database);
      return database;
    })().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

export async function openDatabase() {
  return getDatabase();
}

export async function loadStoredDatabaseState() {
  const database = await getDatabase();
  const row = await database.getFirstAsync(
    `SELECT value FROM ${STATE_TABLE_NAME} WHERE key = ?;`,
    STATE_KEY,
  );

  if (!row || typeof row.value !== 'string') {
    return null;
  }

  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

export async function saveStoredDatabaseState(state) {
  const database = await getDatabase();
  const serialized = JSON.stringify(state);
  await database.runAsync(
    `INSERT INTO ${STATE_TABLE_NAME} (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    STATE_KEY,
    serialized,
  );
}

export async function getColorModePreference() {
  try {
    return await AsyncStorage.getItem(COLOR_MODE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setColorModePreference(mode) {
  try {
    await AsyncStorage.setItem(COLOR_MODE_STORAGE_KEY, String(mode));
  } catch {
    // ignore — color-mode preference is best-effort
  }
}
