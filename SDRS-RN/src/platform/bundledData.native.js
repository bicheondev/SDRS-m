import { Buffer } from 'buffer';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

import { loadBundledDatabaseStateFromFiles } from '../domain/importExport/bundledData.js';
import { decodeCsvBuffer } from '../domain/importExport/csv.js';
import { createImportError } from '../domain/importExport/shared.js';

const BASE64_ENCODING = 'base64';
const UTF8_ENCODING = 'utf8';

const SHIP_ASSET = require('../../assets/data/ship.csv');
const IMAGES_ASSET = require('../../assets/data/images.zip');

// NOTE: paths above resolve relative to src/platform/ → ../../assets points to project-root /assets,
// which is where we copied ship.csv and images.zip via the Expo asset bundler.

export const DEFAULT_BUNDLED_FILES = {
  ship: { asset: SHIP_ASSET, name: 'ship.csv', type: 'text/csv' },
  images: { asset: IMAGES_ASSET, name: 'images.zip', type: 'application/zip' },
};

function base64ToArrayBuffer(base64) {
  const bytes = Buffer.from(base64, 'base64');

  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function ensureAssetReady(assetSource, assetName) {
  const asset = Asset.fromModule(assetSource);

  try {
    await asset.downloadAsync();
  } catch (error) {
    console.error(`[bundledData] ${assetName} download failed:`, error);
    throw error;
  }

  const localUri = asset.localUri;
  console.log(`[bundledData] ${assetName} asset localUri:`, localUri);

  if (!localUri) {
    throw createImportError('기본 파일을 불러오지 못했어요.');
  }

  return localUri;
}

async function logCsvAssetPreview(localUri) {
  try {
    const csv = await FileSystem.readAsStringAsync(localUri);
    console.log(
      '[bundledData] csv length:',
      csv.length,
      'first 100:',
      csv.slice(0, 100),
    );
  } catch (error) {
    console.error('[bundledData] csv preview failed:', error);
  }
}

async function loadAssetAsFileLike({ asset, name, type }) {
  const localUri = await ensureAssetReady(asset, name);

  if (type === 'text/csv') {
    await logCsvAssetPreview(localUri);
  }

  const readBase64 = () =>
    FileSystem.readAsStringAsync(localUri, {
      encoding: BASE64_ENCODING,
    });

  return {
    name,
    type,
    _uri: localUri,
    async text() {
      if (type !== 'text/csv') {
        return FileSystem.readAsStringAsync(localUri, {
          encoding: UTF8_ENCODING,
        });
      }

      return decodeCsvBuffer(base64ToArrayBuffer(await readBase64()));
    },
    async arrayBuffer() {
      return base64ToArrayBuffer(await readBase64());
    },
  };
}

export async function loadBundledDatabaseState(files = DEFAULT_BUNDLED_FILES) {
  try {
    const [shipFile, imagesFile] = await Promise.all([
      loadAssetAsFileLike(files.ship),
      loadAssetAsFileLike(files.images),
    ]);

    return await loadBundledDatabaseStateFromFiles({ imagesFile, shipFile });
  } catch (error) {
    console.error('[bundledData] FAILED:', error);
    throw error;
  }
}
