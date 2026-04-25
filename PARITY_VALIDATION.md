# Parity Validation

## Validation Run

- Date: `2026-04-23`
- `npm run build`: passed
- `npm run dev -- --host 127.0.0.1`: Vite started successfully at `http://127.0.0.1:5173/`
- `npm run test:run`: no test files exist in this repo

## DOM-Free Verification

- Source audit no longer finds plain DOM scene tags or the deleted `src/dom/*` wrapper imports in app code.
- Remaining direct DOM usage is intentionally limited to:
  - `src/main.jsx`
  - `src/services/filePicker.js`
  - `src/services/fileDownload.js`

## Login Parity Contract

- Exact Korean title text and line break remain unchanged in `src/auth/RnwAuthScreen.jsx`.
- Accent styling remains nested inside `Text`, not rewritten.
- Input shell dimensions remain parity-locked:
  - height `52`
  - horizontal padding `16`
  - radius `14`
- Version text remains centered above the CTA and still fades when a field is focused.
- Bottom CTA remains pinned and keeps height `64`.
- Username submit still focuses password via `passwordInputRef.current?.focus()`.
- Password submit and button press still call the same submit path only when credentials are filled.
- Login button lift still uses explicit keyboard inset state: `transform: [{ translateY: -keyboardInset }]`.

## Input, Focus, and Keyboard Inset

- `src/features/auth/useLoginViewport.js` still uses `visualViewport` to preserve the existing keyboard-lift behavior.
- The old root CSS-variable write path is gone; the hook now returns explicit values to the RNW tree.
- Blur/focus timing remains state-driven and still uses the same delayed blur reset pattern.

## Transition Parity

- Login/app route staging keeps the same motion token source in `src/motion.js` and now runs through `src/auth/RnwAuthRouteStage.jsx`.
- Shared screen staging keeps the same motion token source and now runs through `src/components/layout/AnimatedScreen.jsx`.
- Image zoom open/close transitions still use measured origin/target rects and the existing motion duration/ease tokens.

## Typography Parity

- Exact local font files retained:
  - `assets/fonts/PretendardGOV-Regular.otf`
  - `assets/fonts/PretendardGOV-Medium.otf`
  - `assets/fonts/PretendardGOV-SemiBold.otf`
  - `assets/fonts/PretendardGOV-Bold.otf`
  - `assets/fonts/MaterialIconsRound-Regular.otf`
  - `assets/fonts/MaterialSymbolsRounded.ttf`
- Fonts are loaded through `src/styles.css` `@font-face` declarations.
- App text continues to use the Pretendard GOV family stack via `APP_FONT_FAMILY`.
- App icons now render through RNW `Text` while keeping the Material font assets local and bundled.
- Production build output still emits the Pretendard and Material font files, so no silent fallback was introduced.

## Default Seed Data Parity

- Default bundled seed loading is still driven by `src/domain/importExport/bundledData.js`.
- `ship.csv` remains bundled through `ship.csv?url`.
- `images.zip` remains bundled through `images.zip?url`.
- `no-image.svg` remains in use through:
  - `src/domain/ships.js`
  - `src/domain/databaseState.js`
  - `src/domain/importExport/shipCsv.js`
- Production build still emits `images.zip`.
- Production build keeps `ship.csv` bundled as a Vite-resolved URL in the generated JS output.

## Screen Coverage Checked

- Login route layout and interaction contract: source/value audit completed
- App route build path: production build completed
- Menu/Database/Manage/Image Zoom route code paths: compile-validated after RNW migration
- Seed-data bootstrap path: source audit completed through bundled import flow

## Residual Risk

- No screenshot diff or browser-driven visual regression suite exists in this repo, so parity verification here is code-level plus build/dev smoke validation rather than pixel-diff automation.
- The highest remaining manual-check items are gesture feel in `ImageZoomModal` and long-press drag reorder feel in `ManageScreens`, because those depend on live pointer interaction timing.

## Font Adjustment Note

- No new font files were added during this migration.
- Existing exact local font assets were already present and were preserved as the runtime source of truth.
