import { Asset } from 'expo-asset';

import { loadBundledDatabaseStateFromFiles } from '../../domain/importExport/bundledData.js';
import { createImportError } from '../../domain/importExport/shared.js';

const SHIP_ASSET = require('../../../assets/data/ship.csv');
const IMAGES_ASSET = require('../../../assets/data/images.zip');

export const DEFAULT_BUNDLED_FILES = {
  ship: { asset: SHIP_ASSET, name: 'ship.csv', type: 'text/csv' },
  images: { asset: IMAGES_ASSET, name: 'images.zip', type: 'application/zip' },
};

async function fetchBundledAsset({ asset, name, type }) {
  const resolvedAsset = Asset.fromModule(asset);
  await resolvedAsset.downloadAsync();

  const uri = resolvedAsset.localUri || resolvedAsset.uri;

  if (!uri) {
    throw createImportError('기본 파일을 불러오지 못했어요.');
  }

  const response = await fetch(uri);

  if (!response.ok) {
    throw createImportError(`${name} 기본 파일을 불러오지 못했어요.`);
  }

  const blob = await response.blob();

  if (typeof File === 'function') {
    return new File([blob], name, { type: blob.type || type });
  }

  return {
    name,
    type: blob.type || type,
    arrayBuffer: () => blob.arrayBuffer(),
    text: () => blob.text(),
  };
}

export async function loadBundledDatabaseState(files = DEFAULT_BUNDLED_FILES) {
  const [shipFile, imagesFile] = await Promise.all([
    fetchBundledAsset(files.ship),
    fetchBundledAsset(files.images),
  ]);

  return loadBundledDatabaseStateFromFiles({ imagesFile, shipFile });
}
