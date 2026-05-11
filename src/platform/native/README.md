# Native Platform Boundary

These files are placeholders for a future Expo / pure React Native target. The current production target is React Native Web through Vite, so active runtime implementations live in `src/platform/web/`.

Expected native replacements:

- `index.native.js`: React Native `Dimensions`, `Appearance`, measurement, and gesture helpers.
- `files.native.js`: `expo-document-picker` and `expo-file-system` Storage Access Framework.
- `storage.native.js`: Expo SQLite, AsyncStorage, or filesystem-backed persistence.
- `bundledData.native.js`: Expo Asset loading for the default `ship.csv`, `images.zip`, and `no-image.svg`.

Do not import these native placeholders from the web build.
