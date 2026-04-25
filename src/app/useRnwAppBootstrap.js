import { useEffect, useRef, useState } from 'react';

import {
  createEmptyDatabaseState,
  upgradeDatabaseState,
} from '../domain/databaseState.js';
import { applyImagesToShipRecords } from '../domain/ships.js';
import { loadStoredDatabaseState, saveStoredDatabaseState } from '../adapters/storage.web.js';

async function loadDefaultBundledDatabaseState() {
  const { loadBundledDatabaseState } = await import('../adapters/bundledSeed.web.js');
  return loadBundledDatabaseState();
}

async function loadBundledDatabaseOrEmpty({ loadBundledState, createEmptyState }) {
  try {
    return await loadBundledState();
  } catch {
    return createEmptyState();
  }
}

export async function resolveRnwInitialDatabaseState({
  createEmptyState = createEmptyDatabaseState,
  loadBundledState = loadDefaultBundledDatabaseState,
  loadStoredState = loadStoredDatabaseState,
  upgradeState = upgradeDatabaseState,
} = {}) {
  try {
    const storedState = await loadStoredState();

    if (storedState) {
      return upgradeState(storedState);
    }
  } catch {
    return loadBundledDatabaseOrEmpty({ createEmptyState, loadBundledState });
  }

  return loadBundledDatabaseOrEmpty({ createEmptyState, loadBundledState });
}

async function loadInitialDatabaseSnapshot() {
  let loadedStoredState = false;
  const nextDatabase = await resolveRnwInitialDatabaseState({
    loadStoredState: async () => {
      const storedState = await loadStoredDatabaseState();
      loadedStoredState = Boolean(storedState);
      return storedState;
    },
  });

  return {
    databaseState: {
      ...nextDatabase,
      shipRecords: applyImagesToShipRecords(nextDatabase.shipRecords, nextDatabase.imageEntries, {
        preserveExisting: true,
      }),
    },
    shouldPersistInitialState: !loadedStoredState,
  };
}

let initialDatabaseSnapshotPromise = null;

function getInitialDatabaseSnapshot() {
  if (!initialDatabaseSnapshotPromise) {
    initialDatabaseSnapshotPromise = loadInitialDatabaseSnapshot().catch((error) => {
      initialDatabaseSnapshotPromise = null;
      throw error;
    });
  }

  return initialDatabaseSnapshotPromise;
}

export function preloadRnwAppBootstrap() {
  void getInitialDatabaseSnapshot();
}

export function useRnwAppBootstrap() {
  const [databaseState, setDatabaseState] = useState(() => createEmptyDatabaseState());
  const [databaseReady, setDatabaseReady] = useState(false);
  const hasHandledInitialPersistRef = useRef(false);
  const shouldPersistInitialStateRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const initializeDatabase = async () => {
      const { databaseState: nextDatabase, shouldPersistInitialState } =
        await getInitialDatabaseSnapshot();

      if (cancelled) {
        return;
      }

      shouldPersistInitialStateRef.current = shouldPersistInitialState;
      setDatabaseState(nextDatabase);
      setDatabaseReady(true);
    };

    initializeDatabase().catch(() => {
      if (!cancelled) {
        setDatabaseState(createEmptyDatabaseState());
        setDatabaseReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!databaseReady) {
      return;
    }

    if (!hasHandledInitialPersistRef.current) {
      hasHandledInitialPersistRef.current = true;

      if (!shouldPersistInitialStateRef.current) {
        return;
      }
    }

    saveStoredDatabaseState(databaseState).catch(() => {});
  }, [databaseReady, databaseState]);

  return {
    databaseReady,
    databaseState,
    setDatabaseState,
  };
}
