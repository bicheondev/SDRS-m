import JSZip from 'jszip';

import { createId, createImportError } from './shared.js';
import { SUPPORTED_IMAGE_EXTENSIONS, SHIP_IMAGE_MATCH_REGEXP } from './sharedConstants.js';
import { isPlaceholderImage } from '../ships.js';

export function getMimeTypeFromFileName(fileName) {
  const lowered = fileName.toLowerCase();

  if (lowered.endsWith('.png')) {
    return 'image/png';
  }
  if (lowered.endsWith('.webp')) {
    return 'image/webp';
  }
  if (lowered.endsWith('.svg')) {
    return 'image/svg+xml';
  }
  if (lowered.endsWith('.gif')) {
    return 'image/gif';
  }
  if (lowered.endsWith('.jpg') || lowered.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  return '';
}

export function getExtensionFromFileName(fileName) {
  const parts = String(fileName ?? '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

export function arrayBufferToDataUrl(buffer, mimeType) {
  let binary = '';
  const bytes = new Uint8Array(buffer);

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return `data:${mimeType};base64,${btoa(binary)}`;
}

export function dataUrlToUint8Array(dataUrl) {
  const [, payload = ''] = String(dataUrl ?? '').split(',');
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export async function importImagesZipFile(file) {
  let zip;

  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw createImportError(
      '이미지 압축 파일 형식이 올바르지 않아요.\nZIP 파일만 불러올 수 있어요.',
    );
  }

  const imageEntries = [];

  await Promise.all(
    Object.values(zip.files).map(async (entry) => {
      if (entry.dir) {
        return;
      }

      const mimeType = getMimeTypeFromFileName(entry.name);
      const extension = getExtensionFromFileName(entry.name);

      if (!SUPPORTED_IMAGE_EXTENSIONS.has(extension) || !mimeType.startsWith('image/')) {
        throw createImportError(
          '이미지 압축 파일 형식이 올바르지 않아요.\nZIP 안에는 이미지 파일만 넣어 주세요.',
        );
      }

      const dataUrl = arrayBufferToDataUrl(await entry.async('arraybuffer'), mimeType);

      imageEntries.push({
        id: createId('image'),
        fileName: entry.name.split('/').pop() ?? entry.name,
        registration: '',
        dataUrl,
        mimeType,
      });
    }),
  );

  imageEntries.sort((left, right) => left.fileName.localeCompare(right.fileName, 'ko'));

  return {
    fileName: file.name || 'images.zip',
    imageEntries: imageEntries.map((entry) => {
      const normalized = { ...entry };
      const registrationMatch = normalized.fileName.match(SHIP_IMAGE_MATCH_REGEXP);
      normalized.registration = registrationMatch?.[0] ?? '';
      return normalized;
    }),
  };
}

export async function buildImagesArchive(imageEntries) {
  const imagesZip = new JSZip();

  for (const entry of imageEntries) {
    if (isPlaceholderImage(entry.dataUrl)) {
      continue;
    }

    imagesZip.file(entry.fileName, dataUrlToUint8Array(entry.dataUrl));
  }

  return imagesZip.generateAsync({ type: 'uint8array' });
}
