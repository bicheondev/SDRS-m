import { Buffer } from 'buffer';
import iconv from 'iconv-lite';

import { stripBom } from './shared.js';

export function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export function parseCsvDocument(text) {
  const lines = stripBom(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return headers.reduce((record, header, index) => {
      record[header] = values[index] ?? '';
      return record;
    }, {});
  });

  return { headers, rows };
}

export function encodeCsvValue(value) {
  const normalized = String(value ?? '');
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function serializeCsv(headers, rows) {
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => encodeCsvValue(row[header] ?? '')).join(',')),
  ];

  return lines.join('\r\n');
}

function normalizeArrayBuffer(buffer) {
  if (buffer instanceof ArrayBuffer) {
    return new Uint8Array(buffer);
  }

  if (ArrayBuffer.isView(buffer)) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }

  return new Uint8Array(buffer);
}

function decodeWithTextDecoder(bytes, encoding) {
  if (typeof TextDecoder !== 'function') {
    return null;
  }

  try {
    return new TextDecoder(encoding, { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function decodeWithIconv(bytes, encoding) {
  try {
    return iconv.decode(Buffer.from(bytes), encoding);
  } catch {
    return null;
  }
}

export function decodeCsvBuffer(buffer) {
  const bytes = normalizeArrayBuffer(buffer);
  const utf8Text = decodeWithTextDecoder(bytes, 'utf-8');

  if (utf8Text !== null) {
    return utf8Text;
  }

  const eucKrText = decodeWithTextDecoder(bytes, 'euc-kr');

  if (eucKrText !== null) {
    return eucKrText;
  }

  const cp949Text = decodeWithIconv(bytes, 'cp949') ?? decodeWithIconv(bytes, 'euc-kr');

  if (cp949Text !== null) {
    return cp949Text;
  }

  if (typeof TextDecoder === 'function') {
    return new TextDecoder().decode(bytes);
  }

  return Buffer.from(bytes).toString('utf8');
}
