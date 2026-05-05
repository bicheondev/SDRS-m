import noImagePlaceholder from '../assets/noImagePlaceholder.js';

import { buildSearchIndex } from './search.js';
import { getVesselTypeFromBusiness } from './ships.js';

export const DEFAULT_FILE_META = {
  ship: { name: 'ship.csv', imported: false, modified: false },
  images: { name: 'images.zip', imported: false, modified: false },
};

export function createEmptyDatabaseState() {
  return {
    shipRecords: [],
    imageEntries: [],
    files: {
      ship: { ...DEFAULT_FILE_META.ship },
      images: { ...DEFAULT_FILE_META.images },
    },
  };
}

export function cloneDatabaseState(state) {
  return {
    shipRecords: Array.isArray(state?.shipRecords)
      ? state.shipRecords.map((record) => ({ ...record }))
      : [],
    imageEntries: Array.isArray(state?.imageEntries)
      ? state.imageEntries.map((entry) => ({ ...entry }))
      : [],
    files: {
      ship: { ...DEFAULT_FILE_META.ship, ...(state?.files?.ship ?? {}) },
      images: { ...DEFAULT_FILE_META.images, ...(state?.files?.images ?? {}) },
    },
  };
}

export function upgradeDatabaseState(state) {
  return cloneDatabaseState(state);
}

function buildFileRow(label, fileMeta) {
  if (!fileMeta?.imported) {
    return { label, value: '등록하기', tone: 'blue' };
  }

  return {
    label,
    value: fileMeta.modified ? `${fileMeta.name} (수정됨)` : fileMeta.name,
    tone: 'default',
  };
}

export function buildManageHomeRows(files) {
  return [
    buildFileRow('선박 DB (.csv)', files.ship),
    buildFileRow('이미지 압축 파일 (.zip)', files.images),
  ];
}

export function buildDisplayVessels(shipRecords) {
  return shipRecords.map((record, index) => ({
    id: record.id || `ship-${index}`,
    name: record.title,
    registration: record.registration,
    port: record.port,
    business: record.business,
    tonnage: record.tonnage,
    sonar: Boolean(record.sonar),
    detector: Boolean(record.detector),
    imageWide: record.image || noImagePlaceholder,
    imageCompact: record.image || noImagePlaceholder,
    searchIndex: buildSearchIndex([record.title]),
    vesselType: getVesselTypeFromBusiness(record.business),
  }));
}

export function buildHarborOptions(shipRecords) {
  const ports = Array.from(new Set(shipRecords.map((record) => record.port).filter(Boolean))).sort(
    (left, right) => left.localeCompare(right, 'ko'),
  );

  return ['전체 항포구', ...ports];
}
