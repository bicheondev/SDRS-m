import noImagePlaceholder from '../../assets/noImagePlaceholder.js';
import { decodeCsvBuffer, parseCsvDocument, serializeCsv } from './csv.js';
import { createId, createImportError } from './shared.js';
import { findImageEntryForRegistration } from '../ships.js';

export const SHIP_HEADERS = [
  '번호',
  '어선번호',
  '어선명',
  '어선총톤수',
  '성명',
  '연락처',
  '업종',
  '선적항',
  '소나',
  '어군 탐지기',
];

function isBlank(value) {
  return String(value ?? '').trim() === '';
}

function isIntegerLike(value) {
  return /^\d+$/.test(String(value ?? '').trim());
}

function isNumberLike(value) {
  return /^\d+(?:\.\d+)?$/.test(String(value ?? '').trim());
}

function isPhoneLike(value) {
  return /^[\d\s()+-]+$/.test(String(value ?? '').trim());
}

function isBinaryLike(value) {
  return /^[01]$/.test(String(value ?? '').trim());
}

export function formatPhoneNumber(value) {
  const digits = String(value ?? '').replace(/\D/g, '');

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return String(value ?? '');
}

export function compactPhoneNumber(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function validateHeaders(actualHeaders, expectedHeaders, label) {
  const hasExactHeaderMatch =
    actualHeaders.length === expectedHeaders.length &&
    expectedHeaders.every((header, index) => actualHeaders[index] === header);

  if (!hasExactHeaderMatch) {
    throw createImportError(
      `${label} 형식이 올바르지 않아요.\n내보낸 DB 헤더와 같은 CSV 파일만 불러올 수 있어요.`,
    );
  }
}

export function validateShipRows(rows) {
  rows.forEach((row, index) => {
    const lineNumber = index + 2;

    if (!isBlank(row['번호']) && !isIntegerLike(row['번호'])) {
      throw createImportError(
        `선박 DB ${lineNumber}행의 번호 형식이 올바르지 않아요.\n숫자만 입력되어 있는지 확인해 주세요.`,
      );
    }

    if (!isBlank(row['어선총톤수']) && !isNumberLike(row['어선총톤수'])) {
      throw createImportError(
        `선박 DB ${lineNumber}행의 어선총톤수 형식이 올바르지 않아요.\n숫자 형식인지 확인해 주세요.`,
      );
    }

    if (!isBlank(row['연락처']) && !isPhoneLike(row['연락처'])) {
      throw createImportError(
        `선박 DB ${lineNumber}행의 연락처 형식이 올바르지 않아요.\n전화번호 형식만 사용할 수 있어요.`,
      );
    }

    if (!isBlank(row['소나']) && !isBinaryLike(row['소나'])) {
      throw createImportError(
        `선박 DB ${lineNumber}행의 소나 값이 올바르지 않아요.\n0 또는 1만 사용할 수 있어요.`,
      );
    }

    if (!isBlank(row['어군 탐지기']) && !isBinaryLike(row['어군 탐지기'])) {
      throw createImportError(
        `선박 DB ${lineNumber}행의 어군 탐지기 값이 올바르지 않아요.\n0 또는 1만 사용할 수 있어요.`,
      );
    }
  });
}

export function createShipRecord(row, imageEntries) {
  const registration = String(row['어선번호'] ?? '').trim();
  const matchedImage = findImageEntryForRegistration(imageEntries, registration);

  return {
    id: createId('ship'),
    rowNumber: String(row['번호'] ?? '').trim(),
    searchKey: String(row['어선명'] ?? '').trim(),
    title: String(row['어선명'] ?? '').trim(),
    registration,
    ownerName: String(row['성명'] ?? '').trim(),
    ownerPhone: formatPhoneNumber(row['연락처'] ?? ''),
    port: String(row['선적항'] ?? '').trim(),
    business: String(row['업종'] ?? '').trim(),
    tonnage: String(row['어선총톤수'] ?? '').trim(),
    image: matchedImage?.dataUrl ?? noImagePlaceholder,
    imageFileName: matchedImage?.fileName ?? '',
    imageMimeType: matchedImage?.mimeType ?? '',
    sonar: String(row['소나'] ?? '').trim() === '1',
    detector: String(row['어군 탐지기'] ?? '').trim() === '1',
    selected: false,
  };
}

export async function importShipCsvFile(file, imageEntries = []) {
  const buffer = await file.arrayBuffer();
  const { headers, rows } = parseCsvDocument(decodeCsvBuffer(buffer));

  validateHeaders(headers, SHIP_HEADERS, '선박 DB');
  validateShipRows(rows);

  return {
    fileName: file.name || 'ship.csv',
    shipRecords: rows.map((row) => createShipRecord(row, imageEntries)),
  };
}

export function buildShipCsvText(shipRecords) {
  const shipRows = shipRecords.map((record, index) => ({
    번호: index + 1,
    어선번호: record.registration,
    어선명: record.title,
    어선총톤수: record.tonnage,
    성명: record.ownerName,
    연락처: compactPhoneNumber(record.ownerPhone),
    업종: record.business,
    선적항: record.port,
    소나: record.sonar ? '1' : '0',
    '어군 탐지기': record.detector ? '1' : '0',
  }));

  return `\uFEFF${serializeCsv(SHIP_HEADERS, shipRows)}`;
}
