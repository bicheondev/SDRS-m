import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const BASE64_ENCODING = 'base64';

let storageAccessSavePromise = null;

function uint8ArrayToBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

function getMimeTypeForFileName(fileName) {
  const lowered = String(fileName ?? '').toLowerCase();

  if (lowered.endsWith('.zip')) {
    return 'application/zip';
  }

  if (lowered.endsWith('.csv')) {
    return 'text/csv;charset=utf-8';
  }

  return 'application/octet-stream';
}

async function arrayBufferLikeToBase64(value) {
  if (value instanceof Uint8Array) {
    return uint8ArrayToBase64(value);
  }

  if (value instanceof ArrayBuffer) {
    return uint8ArrayToBase64(new Uint8Array(value));
  }

  if (typeof value === 'string') {
    return Buffer.from(value, 'utf8').toString('base64');
  }

  if (value && typeof value.arrayBuffer === 'function') {
    const buffer = await value.arrayBuffer();
    return uint8ArrayToBase64(new Uint8Array(buffer));
  }

  throw new Error('Unsupported binary value passed to downloadBlob.');
}

function isUnfinishedPermissionRequestError(error) {
  return String(error?.message ?? error).includes('unfinished permission request');
}

async function saveBlobWithStorageAccessFrameworkOnce({ base64, fileName, mimeType }) {
  const storageAccess = FileSystem.StorageAccessFramework;

  if (!storageAccess?.requestDirectoryPermissionsAsync || !storageAccess?.createFileAsync) {
    throw new Error('File save dialog is unavailable.');
  }

  const permissions = await storageAccess.requestDirectoryPermissionsAsync();

  if (!permissions.granted) {
    return null;
  }

  const fileUri = await storageAccess.createFileAsync(
    permissions.directoryUri,
    fileName,
    mimeType,
  );

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: BASE64_ENCODING,
  });

  return fileUri;
}

async function saveBlobWithStorageAccessFramework(options) {
  if (storageAccessSavePromise) {
    return storageAccessSavePromise;
  }

  storageAccessSavePromise = saveBlobWithStorageAccessFrameworkOnce(options)
    .catch((error) => {
      if (isUnfinishedPermissionRequestError(error)) {
        return null;
      }

      throw error;
    })
    .finally(() => {
      storageAccessSavePromise = null;
    });

  return storageAccessSavePromise;
}

async function saveBlobToAppDocuments({ base64, fileName }) {
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: BASE64_ENCODING,
  });

  return fileUri;
}

export async function downloadBlob(blob, fileName) {
  const safeFileName = fileName && fileName.length > 0 ? fileName : 'download.bin';
  const base64 = await arrayBufferLikeToBase64(blob);
  const mimeType = blob?.type || getMimeTypeForFileName(safeFileName);

  if (Platform.OS === 'android') {
    return saveBlobWithStorageAccessFramework({
      base64,
      fileName: safeFileName,
      mimeType,
    });
  }

  return saveBlobToAppDocuments({
    base64,
    fileName: safeFileName,
  });
}
