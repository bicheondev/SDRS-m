import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

const BASE64_ENCODING = 'base64';
const UTF8_ENCODING = 'utf8';

function base64ToArrayBuffer(base64) {
  const binary = globalThis.atob(base64);
  const length = binary.length;
  const bytes = new Uint8Array(length);

  for (let index = 0; index < length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function uint8ArrayToBase64(bytes) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return globalThis.btoa(binary);
}

async function arrayBufferLikeToBase64(value) {
  if (value instanceof Uint8Array) {
    return uint8ArrayToBase64(value);
  }

  if (value instanceof ArrayBuffer) {
    return uint8ArrayToBase64(new Uint8Array(value));
  }

  if (typeof value === 'string') {
    return globalThis.btoa(value);
  }

  if (value && typeof value.arrayBuffer === 'function') {
    const buffer = await value.arrayBuffer();
    return uint8ArrayToBase64(new Uint8Array(buffer));
  }

  throw new Error('Unsupported binary value passed to downloadBlob.');
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
    const mimeTypes = accept
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0 && entry.includes('/'));

    if (mimeTypes.length === 1) {
      options.type = mimeTypes[0];
    } else if (mimeTypes.length > 1) {
      options.type = mimeTypes;
    }
  }

  return options;
}

export async function pickFile({ accept = '', multiple = false } = {}) {
  const result = await DocumentPicker.getDocumentAsync(
    buildDocumentPickerOptions({ accept, multiple }),
  );

  if (result.canceled) {
    return multiple ? [] : null;
  }

  const assets = Array.isArray(result.assets) ? result.assets : [];
  const files = assets.map(makePickedFile);

  return multiple ? files : files[0] ?? null;
}

export async function downloadBlob(blob, fileName) {
  const safeFileName = fileName && fileName.length > 0 ? fileName : 'download.bin';
  const base64 = await arrayBufferLikeToBase64(blob);
  const fileUri = `${FileSystem.cacheDirectory}${safeFileName}`;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: BASE64_ENCODING,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: blob?.type || undefined,
      dialogTitle: safeFileName,
      UTI: undefined,
    });
  } else {
    console.warn(
      `[platform/files.native] Sharing is unavailable; saved file at ${fileUri}.`,
    );
  }
}

export async function readFileAsDataUrl(file) {
  if (!file || !file.type?.startsWith('image/')) {
    return null;
  }

  const uri = file._uri ?? file.uri;

  if (!uri) {
    return null;
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: BASE64_ENCODING,
  });

  return `data:${file.type};base64,${base64}`;
}
