import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

import { loadBundledDatabaseStateFromFiles } from '../domain/importExport/bundledData.js';
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
  const binary = globalThis.atob(base64);
  const length = binary.length;
  const bytes = new Uint8Array(length);

  for (let index = 0; index < length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

async function ensureAssetReady(assetSource) {
  const asset = Asset.fromModule(assetSource);

  if (!asset.localUri) {
    await asset.downloadAsync();
  }

  if (!asset.localUri) {
    throw createImportError('기본 파일을 불러오지 못했어요.');
  }

  return asset.localUri;
}

async function loadAssetAsFileLike({ asset, name, type }) {
  const localUri = await ensureAssetReady(asset);
  const isCsv = type === 'text/csv';

  return {
    name,
    type,
    _uri: localUri,
    async text() {
      return FileSystem.readAsStringAsync(localUri, {
        encoding: UTF8_ENCODING,
      });
    },
    async arrayBuffer() {
      if (isCsv) {
        const text = await FileSystem.readAsStringAsync(localUri, {
          encoding: UTF8_ENCODING,
        });
        return new TextEncoder().encode(text).buffer;
      }

      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: BASE64_ENCODING,
      });
      return base64ToArrayBuffer(base64);
    },
  };
}

export async function loadBundledDatabaseState(files = DEFAULT_BUNDLED_FILES) {
  const [shipFile, imagesFile] = await Promise.all([
    loadAssetAsFileLike(files.ship),
    loadAssetAsFileLike(files.images),
  ]);

  return loadBundledDatabaseStateFromFiles({ imagesFile, shipFile });
}
