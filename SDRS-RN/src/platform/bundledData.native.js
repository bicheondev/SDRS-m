import { Buffer } from 'buffer';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

import { loadBundledDatabaseStateFromFiles } from '../domain/importExport/bundledData.js';
import { decodeCsvBuffer } from '../domain/importExport/csv.js';
import { createImportError } from '../domain/importExport/shared.js';

const BASE64_ENCODING = 'base64';
const UTF8_ENCODING = 'utf8';
const SHOULD_LOG_BUNDLED_DATA =
  typeof __DEV__ !== 'undefined'
    ? __DEV__
    : typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

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

  if (SHOULD_LOG_BUNDLED_DATA) {
    console.log(`[bundledData] ${assetName} asset localUri:`, localUri);
  }

  if (!localUri) {
    throw createImportError('기본 파일을 불러오지 못했어요.');
  }

  return localUri;
}

async function loadAssetAsFileLike({ asset, name, type }) {
  const localUri = await ensureAssetReady(asset, name);
  let cachedBase64 = null;
  let cachedText = null;

  const readBase64 = () =>
    cachedBase64
      ? Promise.resolve(cachedBase64)
      : FileSystem.readAsStringAsync(localUri, {
          encoding: BASE64_ENCODING,
        }).then((base64) => {
          cachedBase64 = base64;
          return base64;
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

      if (!cachedText) {
        cachedText = decodeCsvBuffer(base64ToArrayBuffer(await readBase64()));
      }

      return cachedText;
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

    if (SHOULD_LOG_BUNDLED_DATA) {
      try {
        const csvText = await shipFile.text();
        const firstLine = csvText.split(/\r?\n/, 1)[0] ?? '';
        console.log('[bundledData] decoded csv first line:', firstLine);
        console.log('[bundledData] decoded csv first 100:', csvText.slice(0, 100));
      } catch (error) {
        console.error('[bundledData] decoded csv preview failed:', error);
      }
    }

    const databaseState = await loadBundledDatabaseStateFromFiles({ imagesFile, shipFile });

    if (SHOULD_LOG_BUNDLED_DATA) {
      console.log('[bundledData] parsed ship rows:', databaseState.shipRecords.length);
    }

    return databaseState;
  } catch (error) {
    console.error('[bundledData] FAILED:', error);
    throw error;
  }
}
