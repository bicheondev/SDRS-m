function createNativeAdapterError(featureName, packageNames) {
  return new Error(
    `${featureName} requires a native adapter. Use ${packageNames.join(', ')} in the Expo port.`,
  );
}

export async function pickFile() {
  throw createNativeAdapterError('Document picking', ['expo-document-picker']);
}

export async function downloadBlob() {
  throw createNativeAdapterError('Database export', ['expo-file-system StorageAccessFramework']);
}

export async function readFileAsDataUrl() {
  throw createNativeAdapterError('Image file reading', ['expo-file-system']);
}
