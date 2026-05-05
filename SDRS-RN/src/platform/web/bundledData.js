export const DEFAULT_BUNDLED_FILES = {
  ship: { name: 'ship.csv', type: 'text/csv' },
  images: { name: 'images.zip', type: 'application/zip' },
};

export async function loadBundledDatabaseState() {
  throw new Error(
    'Web bundled seed loading is not configured in this Expo build. The native variant is loaded automatically on iOS and Android.',
  );
}
