import { useEffect, useRef, useState } from 'react';

import {
  createEmptyDatabaseState,
  upgradeDatabaseState,
} from '../domain/databaseState.js';
import { applyImagesToShipRecords } from '../domain/ships.js';
import { loadStoredDatabaseState, saveStoredDatabaseState } from '../adapters/storage.web.js';
import { scheduleIdleTask } from '../platform/index';

async function loadDefaultBundledDatabaseState() {
  const { loadBundledDatabaseState } = await import('../adapters/bundledSeed.web.js');
  return loadBundledDatabaseState();
}

async function loadBundledDatabaseOrEmpty({ loadBundledState, createEmptyState }) {
  try {
    return await loadBundledState();
  } catch (error) {
    console.error('[bootstrap] bundled database load failed:', error);
    return createEmptyState();
  }
}

function hasUsableStoredDatabaseState(state) {
  return (
    Array.isArray(state?.shipRecords) &&
    state.shipRecords.length > 0
  ) || Boolean(state?.files?.ship?.imported || state?.files?.images?.imported);
}

export async function resolveRnwInitialDatabaseState({
  createEmptyState = createEmptyDatabaseState,
  loadBundledState = loadDefaultBundledDatabaseState,
  loadStoredState = loadStoredDatabaseState,
  upgradeState = upgradeDatabaseState,
} = {}) {
  try {
    const storedState = await loadStoredState();

    if (hasUsableStoredDatabaseState(storedState)) {
      return upgradeState(storedState);
    }
  } catch (error) {
    console.error('[bootstrap] stored database load failed:', error);
    return loadBundledDatabaseOrEmpty({ createEmptyState, loadBundledState });
  }

  return loadBundledDatabaseOrEmpty({ createEmptyState, loadBundledState });
}

async function loadInitialDatabaseSnapshot() {
  const nextDatabase = await resolveRnwInitialDatabaseState();

  return {
    databaseState: {
      ...nextDatabase,
      shipRecords: applyImagesToShipRecords(nextDatabase.shipRecords, nextDatabase.imageEntries, {
        preserveExisting: true,
      }),
    },
    shouldPersistInitialState: false,
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

    const runInitializeDatabase = () => {
      initializeDatabase().catch((error) => {
        console.error('[bootstrap] initial database failed:', error);
        if (!cancelled) {
          setDatabaseState(createEmptyDatabaseState());
          setDatabaseReady(true);
        }
      });
    };

    const cancelIdleLoad = scheduleIdleTask(runInitializeDatabase, {
      fallbackDelay: 280,
      timeout: 900,
    });

    return () => {
      cancelled = true;
      cancelIdleLoad();
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

    saveStoredDatabaseState(databaseState).catch((error) => {
      console.error('[bootstrap] database save failed:', error);
    });
  }, [databaseReady, databaseState]);

  return {
    databaseReady,
    databaseState,
    setDatabaseState,
  };
}
