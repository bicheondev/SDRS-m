import { useEffect, useMemo, useRef, useState } from 'react';

import { buildManageHomeRows, cloneDatabaseState } from '../../domain/databaseState.js';
import {
  applyImagesToShipRecords,
  areImageEntriesEqual,
  areManageShipCardsEqual,
  cloneManageItems,
  emptyManageShipCard,
  mergeImportedShipRecords,
  normalizeShipCardsForStorage,
  rebuildImageEntriesFromShips,
} from '../../domain/ships.js';

export function useShipEditor({
  databaseState,
  onShipsChanged,
  setDatabaseState,
}) {
  const [manageShipCardsState, setManageShipCardsState] = useState([]);
  const [manageShipSavedState, setManageShipSavedState] = useState([]);
  const [manageShipDirty, setManageShipDirty] = useState(false);
  const [manageShipSearch, setManageShipSearch] = useState('');
  const [manageDiscardTarget, setManageDiscardTarget] = useState(null);
  const [manageImportAlert, setManageImportAlert] = useState(null);
  const [pendingShipImport, setPendingShipImport] = useState(null);
  const [manageSaveToast, setManageSaveToast] = useState(null);
  const manageSaveToastTimeoutRef = useRef(null);

  const manageHomePrimaryRows = useMemo(
    () => buildManageHomeRows(databaseState.files),
    [databaseState.files],
  );

  useEffect(
    () => () => {
      if (manageSaveToastTimeoutRef.current) {
        clearTimeout(manageSaveToastTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    setManageShipDirty(!areManageShipCardsEqual(manageShipCardsState, manageShipSavedState));
  }, [manageShipCardsState, manageShipSavedState]);

  useEffect(() => {
    const nextCards = cloneManageItems(databaseState.shipRecords);
    setManageShipSavedState(nextCards);
    setManageShipCardsState(cloneManageItems(databaseState.shipRecords));
    setManageShipDirty(false);
    setManageShipSearch('');
  }, [databaseState.shipRecords]);

  const hideManageSaveToast = () => {
    if (manageSaveToastTimeoutRef.current) {
      clearTimeout(manageSaveToastTimeoutRef.current);
      manageSaveToastTimeoutRef.current = null;
    }

    setManageSaveToast(null);
  };

  const showManageSaveToast = (message) => {
    const id = Date.now();

    if (manageSaveToastTimeoutRef.current) {
      clearTimeout(manageSaveToastTimeoutRef.current);
    }

    setManageSaveToast({ id, message });
    manageSaveToastTimeoutRef.current = setTimeout(() => {
      setManageSaveToast((current) => (current?.id === id ? null : current));
      manageSaveToastTimeoutRef.current = null;
    }, 2200);
  };

  const syncShipEditor = (shipRecords) => {
    const savedCards = cloneManageItems(shipRecords);
    setManageShipSavedState(savedCards);
    setManageShipCardsState(cloneManageItems(shipRecords));
    setManageShipDirty(false);
    setManageShipSearch('');
  };

  const resetSession = () => {
    syncShipEditor(databaseState.shipRecords);
    setManageDiscardTarget(null);
    setManageImportAlert(null);
    setPendingShipImport(null);
    hideManageSaveToast();
  };

  const restoreManageShipSaved = () => {
    setManageShipCardsState(cloneManageItems(manageShipSavedState));
    setManageShipDirty(false);
  };

  const showImportAlert = (error, fallbackCopy) => {
    setManageImportAlert({
      title: '불러오기 실패',
      copy: error instanceof Error && error.message ? error.message : fallbackCopy,
    });
  };

  const handleManageShipFieldChange = (cardId, field, value) => {
    hideManageSaveToast();
    setManageShipCardsState((current) =>
      current.map((card) =>
        card.id === cardId
          ? {
              ...card,
              ...(field === 'title' ? { searchKey: value } : {}),
              [field]: value,
              selected: true,
            }
          : card,
      ),
    );
    setManageShipDirty(true);
  };

  const handleManageShipAdd = () => {
    hideManageSaveToast();
    setManageShipCardsState((current) => [
      ...current.map((card) => (card.selected ? { ...card, selected: false } : card)),
      {
        id: `ship-${Date.now()}`,
        ...emptyManageShipCard,
        selected: true,
      },
    ]);
    setManageShipDirty(true);
    setManageShipSearch('');
  };

  const handleManageShipDelete = (cardId) => {
    hideManageSaveToast();
    setManageShipCardsState((current) => current.filter((card) => card.id !== cardId));
  };

  const handleManageShipImageChange = (cardId, file) => {
    if (!file || !file.type.startsWith('image/')) {
      return;
    }

    hideManageSaveToast();
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return;
      }

      setManageShipCardsState((current) =>
        current.map((card) =>
          card.id === cardId
            ? {
                ...card,
                image: reader.result,
                imageFileName: file.name,
                imageMimeType: file.type || '',
                selected: true,
              }
            : card,
        ),
      );
    };
    reader.readAsDataURL(file);
  };

  const handleManageShipReorder = (nextCards) => {
    hideManageSaveToast();
    setManageShipCardsState(nextCards);
  };

  const handleManageShipSave = () => {
    const nextShipRecords = normalizeShipCardsForStorage(manageShipCardsState);
    const nextImageEntries = rebuildImageEntriesFromShips(nextShipRecords);
    const nextDatabase = cloneDatabaseState(databaseState);
    const shipImported = nextDatabase.files.ship.imported || nextShipRecords.length > 0;
    const imagesImported = nextDatabase.files.images.imported || nextImageEntries.length > 0;
    const imagesChanged = !areImageEntriesEqual(nextImageEntries, nextDatabase.imageEntries);

    nextDatabase.imageEntries = nextImageEntries;
    nextDatabase.shipRecords = applyImagesToShipRecords(nextShipRecords, nextImageEntries, {
      preserveExisting: true,
    });
    nextDatabase.files.ship = {
      ...nextDatabase.files.ship,
      imported: shipImported,
      modified: shipImported,
    };
    nextDatabase.files.images = {
      ...nextDatabase.files.images,
      imported: imagesImported,
      modified: imagesImported && imagesChanged,
    };

    setDatabaseState(nextDatabase);
    syncShipEditor(nextDatabase.shipRecords);
    showManageSaveToast('DB가 업데이트되었어요.');
  };

  const handleShipImport = async (file) => {
    if (!file) {
      return;
    }

    setManageImportAlert(null);
    setPendingShipImport(null);

    try {
      const { importShipCsvFile } = await import('../../domain/importExport/shipCsv.js');
      const { fileName, shipRecords } = await importShipCsvFile(file, databaseState.imageEntries);

      if (databaseState.shipRecords.length === 0) {
        const nextDatabase = cloneDatabaseState(databaseState);

        nextDatabase.shipRecords = shipRecords;
        nextDatabase.files.ship = {
          name: fileName,
          imported: true,
          modified: false,
        };

        setDatabaseState(nextDatabase);
        syncShipEditor(nextDatabase.shipRecords);
        onShipsChanged?.();
        return;
      }

      setPendingShipImport({
        fileName,
        shipRecords,
        replaceSameRegistration: true,
      });
    } catch (error) {
      showImportAlert(error, '선박 DB를 불러오지 못했어요.\n파일 형식을 확인해 주세요.');
    }
  };

  const applyPendingShipImport = ({ keepExisting }) => {
    if (!pendingShipImport) {
      return;
    }

    const nextDatabase = cloneDatabaseState(databaseState);
    const nextShipRecords = mergeImportedShipRecords(
      nextDatabase.shipRecords,
      pendingShipImport.shipRecords,
      {
        keepExisting,
        replaceSameRegistration: keepExisting && pendingShipImport.replaceSameRegistration,
      },
    );

    nextDatabase.shipRecords = applyImagesToShipRecords(
      nextShipRecords,
      nextDatabase.imageEntries,
      {
        preserveExisting: true,
      },
    );
    nextDatabase.files.ship = {
      name: pendingShipImport.fileName,
      imported: true,
      modified: keepExisting,
    };

    setDatabaseState(nextDatabase);
    syncShipEditor(nextDatabase.shipRecords);
    setPendingShipImport(null);
    onShipsChanged?.();
  };

  const handleImagesImport = async (file) => {
    if (!file) {
      return;
    }

    setManageImportAlert(null);

    try {
      const { importImagesZipFile } = await import('../../domain/importExport/imagesZip.js');
      const { fileName, imageEntries } = await importImagesZipFile(file);
      const nextDatabase = cloneDatabaseState(databaseState);

      nextDatabase.imageEntries = imageEntries;
      nextDatabase.shipRecords = applyImagesToShipRecords(nextDatabase.shipRecords, imageEntries);
      nextDatabase.files.images = {
        name: fileName,
        imported: true,
        modified: false,
      };

      setDatabaseState(nextDatabase);
      syncShipEditor(nextDatabase.shipRecords);
    } catch (error) {
      showImportAlert(error, '이미지 압축 파일을 불러오지 못했어요.\n파일 형식을 확인해 주세요.');
    }
  };

  const handleExportDatabase = async () => {
    const [{ buildDatabaseExportBlob }, { downloadBlob }] = await Promise.all([
      import('../../domain/importExport/databaseExport.js'),
      import('../../services/fileDownload.js'),
    ]);
    const exportBlob = await buildDatabaseExportBlob(databaseState);
    downloadBlob(exportBlob, 'db_export.zip');
  };

  return {
    applyPendingShipImport,
    handleExportDatabase,
    handleImagesImport,
    handleManageShipAdd,
    handleManageShipDelete,
    handleManageShipFieldChange,
    handleManageShipImageChange,
    handleManageShipReorder,
    handleManageShipSave,
    handleShipImport,
    hideManageSaveToast,
    manageDiscardTarget,
    manageHomePrimaryRows,
    manageImportAlert,
    manageSaveToast,
    manageShipCardsState,
    manageShipDirty,
    manageShipSavedState,
    manageShipSearch,
    pendingShipImport,
    resetSession,
    restoreManageShipSaved,
    setManageDiscardTarget,
    setManageImportAlert,
    setManageShipSearch,
    setPendingShipImport,
    syncShipEditor,
  };
}
