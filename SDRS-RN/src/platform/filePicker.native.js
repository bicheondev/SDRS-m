import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as FilePicker from 'expo-\u0064ocument-picker';

const BASE64_ENCODING = 'base64';
const UTF8_ENCODING = 'utf8';
const CSV_MIME_TYPES = ['text/csv', 'text/comma-separated-values', 'application/csv'];
const ZIP_MIME_TYPES = ['application/zip', 'application/x-zip-compressed'];

function base64ToArrayBuffer(base64) {
  const bytes = Uint8Array.from(Buffer.from(base64, 'base64'));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function makePickedFile({ uri, name, mimeType }) {
  const resolvedType = mimeType ?? '';
  const resolvedName = name ?? '';

  return {
    name: resolvedName,
    type: resolvedType,
    _uri: uri,
    async arrayBuffer() {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: BASE64_ENCODING,
      });
      return base64ToArrayBuffer(base64);
    },
    async text() {
      return FileSystem.readAsStringAsync(uri, { encoding: UTF8_ENCODING });
    },
  };
}

function buildDocumentPickerOptions({ accept, multiple }) {
  const options = {
    multiple: Boolean(multiple),
    copyToCacheDirectory: true,
  };

  if (typeof accept === 'string' && accept.length > 0) {
    const entries = accept
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    const mimeTypes = entries.flatMap((entry) => {
      if (entry === '.csv' || entry === 'text/csv') {
        return CSV_MIME_TYPES;
      }

      if (entry === '.zip' || entry === 'application/zip') {
        return ZIP_MIME_TYPES;
      }

      return entry.includes('/') ? [entry] : [];
    });
    const uniqueMimeTypes = Array.from(new Set(mimeTypes));

    if (uniqueMimeTypes.length === 1) {
      options.type = uniqueMimeTypes[0];
    } else if (uniqueMimeTypes.length > 1) {
      options.type = uniqueMimeTypes;
    }
  }

  return options;
}

export async function pickFile({ accept = '', multiple = false } = {}) {
  const result = await FilePicker.getDocumentAsync(
    buildDocumentPickerOptions({ accept, multiple }),
  );

  if (result.canceled) {
    return multiple ? [] : null;
  }

  const assets = Array.isArray(result.assets) ? result.assets : [];
  const files = assets.map(makePickedFile);

  return multiple ? files : files[0] ?? null;
}
