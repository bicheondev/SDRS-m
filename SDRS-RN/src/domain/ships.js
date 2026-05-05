import noImagePlaceholder from '../assets/noImagePlaceholder.js';

export { noImagePlaceholder };

export const emptyManageShipCard = {
  searchKey: '',
  title: '',
  registration: '',
  ownerName: '',
  ownerPhone: '',
  port: '',
  business: '',
  tonnage: '',
  image: noImagePlaceholder,
  imageFileName: '',
  imageMimeType: '',
  sonar: false,
  detector: true,
  selected: true,
};

export function cloneManageItems(items) {
  return items.map((item) => ({ ...item }));
}

export function areImageEntriesEqual(entriesA, entriesB) {
  if (entriesA.length !== entriesB.length) {
    return false;
  }

  return entriesA.every((entry, index) => {
    const otherEntry = entriesB[index];

    if (!otherEntry) {
      return false;
    }

    return (
      entry.fileName === otherEntry.fileName &&
      entry.registration === otherEntry.registration &&
      entry.dataUrl === otherEntry.dataUrl &&
      entry.mimeType === otherEntry.mimeType
    );
  });
}

export function normalizeShipCardsForStorage(cards) {
  return cards.map((card, index) => ({
    ...emptyManageShipCard,
    ...card,
    rowNumber: String(index + 1),
    searchKey: card.title,
    selected: false,
  }));
}

export function getVesselTypeFromBusiness(business) {
  return business === '연안통발어업' || business === '수하식양식업' ? '어선' : '보트';
}

export function filterVessels(vessels, harborFilter, vesselTypeFilter) {
  return vessels.filter((vessel) => {
    const matchesHarbor = harborFilter === '전체 항포구' || vessel.port === harborFilter;
    const matchesType =
      vesselTypeFilter === '전체 선박' ||
      (vessel.vesselType ?? getVesselTypeFromBusiness(vessel.business)) === vesselTypeFilter;

    return matchesHarbor && matchesType;
  });
}

export function areManageShipCardsEqual(cardsA, cardsB) {
  if (cardsA.length !== cardsB.length) {
    return false;
  }

  return cardsA.every((card, index) => {
    const otherCard = cardsB[index];

    if (!otherCard) {
      return false;
    }

    return (
      card.id === otherCard.id &&
      card.title === otherCard.title &&
      card.registration === otherCard.registration &&
      card.port === otherCard.port &&
      card.business === otherCard.business &&
      card.tonnage === otherCard.tonnage &&
      (card.image ?? '') === (otherCard.image ?? '') &&
      Boolean(card.sonar) === Boolean(otherCard.sonar) &&
      Boolean(card.detector) === Boolean(otherCard.detector)
    );
  });
}

function normalizeRegistrationKey(value) {
  return String(value ?? '').trim();
}

export function mergeImportedShipRecords(existingShipRecords, importedShipRecords, options = {}) {
  const { keepExisting = false, replaceSameRegistration = false } = options;

  if (!keepExisting) {
    return importedShipRecords;
  }

  if (!replaceSameRegistration) {
    return [...existingShipRecords.map((record) => ({ ...record })), ...importedShipRecords];
  }

  const importedRegistrations = new Set(
    importedShipRecords
      .map((record) => normalizeRegistrationKey(record.registration))
      .filter(Boolean),
  );
  const preservedExisting = existingShipRecords.filter((record) => {
    const registration = normalizeRegistrationKey(record.registration);
    return !(registration && importedRegistrations.has(registration));
  });

  return [...preservedExisting.map((record) => ({ ...record })), ...importedShipRecords];
}

export function findImageEntryForRegistration(imageEntries, registration) {
  const key = String(registration ?? '').trim();
  if (!key) {
    return null;
  }

  return (
    imageEntries.find((entry) => entry.registration === key) ??
    imageEntries.find((entry) => entry.fileName.includes(key)) ??
    null
  );
}

export function isPlaceholderImage(value) {
  return !value || value === noImagePlaceholder;
}

export function getMimeTypeFromDataUrl(dataUrl) {
  const match = /^data:([^;]+);/i.exec(String(dataUrl ?? ''));
  return match?.[1] ?? 'image/jpeg';
}

export function getExtensionFromFileName(fileName) {
  const parts = String(fileName ?? '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

export function getExtensionFromMimeType(mimeType) {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
}

function sanitizeFileSegment(value, fallback) {
  const sanitized = String(value ?? '')
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized || fallback;
}

export function applyImagesToShipRecords(shipRecords, imageEntries, options = {}) {
  const { preserveExisting = false } = options;

  return shipRecords.map((record) => {
    const matchedImage = findImageEntryForRegistration(imageEntries, record.registration);
    const hasExistingImage = !isPlaceholderImage(record.image);

    if (!matchedImage && preserveExisting && hasExistingImage) {
      return {
        ...record,
        image: record.image,
        imageFileName: record.imageFileName ?? '',
        imageMimeType: record.imageMimeType || getMimeTypeFromDataUrl(record.image),
      };
    }

    return {
      ...record,
      image: matchedImage?.dataUrl ?? noImagePlaceholder,
      imageFileName: matchedImage?.fileName ?? '',
      imageMimeType:
        matchedImage?.mimeType ??
        (matchedImage ? getMimeTypeFromDataUrl(matchedImage.dataUrl) : ''),
    };
  });
}

export function rebuildImageEntriesFromShips(shipRecords) {
  return shipRecords
    .filter((record) => !isPlaceholderImage(record.image))
    .map((record) => {
      const mimeType = record.imageMimeType || getMimeTypeFromDataUrl(record.image);
      const extension =
        getExtensionFromFileName(record.imageFileName) || getExtensionFromMimeType(mimeType);
      const baseName = sanitizeFileSegment(
        record.registration,
        sanitizeFileSegment(record.title, 'ship-image'),
      );
      const fileName =
        record.imageFileName && record.imageFileName.includes(record.registration)
          ? record.imageFileName
          : `${baseName}.${extension}`;

      return {
        id: createShipImageId(),
        fileName,
        registration: record.registration,
        dataUrl: record.image,
        mimeType,
      };
    });
}

function createShipImageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `image-${crypto.randomUUID()}`;
  }

  return `image-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
