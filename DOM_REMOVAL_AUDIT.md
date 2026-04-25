# DOM Removal Audit

## Outcome

- The app source is now RN/RNW-first end to end.
- Plain DOM scene wrappers under `src/dom/` were removed.
- Screen rendering, tabs, menu, database, manage flows, and image zoom now render through `View`, `Text`, `TextInput`, `Pressable`, `Image`, `ScrollView`, and RN/RNW animation/state patterns.
- Remaining direct DOM usage is isolated to the browser bootstrap and browser-only file pick/download boundaries.

## Audit Notes

- At audit time, `src/auth/RnwAuthScreen.jsx` was already using RNW primitives, so the login-screen parity work in this migration centered on shared staging, keyboard inset plumbing, theme plumbing, and keeping the documented contract intact.
- Browser APIs that remain for parity, such as `visualViewport`, `requestIdleCallback`, keyboard listeners, and pointer capture, are not used through raw DOM tags or DOM wrapper screens.

## Migration Map

| File(s) | DOM dependency found | RN/RNW replacement | Parity risk |
| --- | --- | --- | --- |
| `src/components/layout/AnimatedScreen.jsx` and deleted `src/dom/AnimatedScreenDom.jsx` | DOM wrapper screen, `aria-hidden`, `inert`, direct host style mutation | RNW `View` screen stage with motion token-driven styles, `pointerEvents`, and `display: 'none'` for inactive screens | Screen transition timing and hidden-screen behavior |
| `src/app/RnwMainAppShell.jsx` | DOM wrapper imports and `HTMLElement`-style image zoom entry assumptions | Direct RNW feature imports, RNW `View` stack containers, measured rect objects only | App/login handoff and zoom open origin |
| `src/components/layout/BottomTab.jsx` | `nav`, buttons, span/icon wrappers | `View`, `Pressable`, `Text`, `AppIcon` | Bottom tab spacing and focus feel |
| `src/components/Icons.jsx` | DOM text/span icon host assumptions | RNW `Text` icon renderer with Material font families and preset metrics | Icon optical alignment |
| `src/features/menu/MenuShared.jsx`, `MenuPage.jsx`, `MenuModePage.jsx`, `MenuInfoPage.jsx` | DOM layout rows, buttons, image wrappers | `AppScreenShell`, `View`, `Text`, `Pressable`, `Image`, `AppIcon` | Row spacing, checkmark placement, image/logo sizing |
| `src/features/database/DatabasePage.jsx`, `DatabaseTopBars.jsx`, `FilterSheet.jsx`, `VesselResults.jsx`, `useDatabaseFilters.js` | DOM search/filter shell, DOM scroll assumptions, DOM rect reads for thumbnails, DOM close-state staging | RNW primitives, `ScrollView`, `measureNodeInWindow()`, RNW scroll APIs, explicit filter close phase | Search-bar width feel, filter-sheet close timing, thumbnail zoom origin |
| `src/components/ImageZoomModal.jsx` | DOM modal shell, DOM query/rect measurement, direct element inspection | RNW `View`, `Pressable`, `Image`, RNW refs, measured snapshots, explicit transition state | Pinch/pan/dismiss feel and open/close thumbnail transition fidelity |
| `src/components/ManageScreens.jsx` | DOM screens, hidden file inputs, DOM `scrollIntoView`, Framer reorder/DOM list assumptions | RNW primitives, `pickFile()`, `ScrollView.scrollTo()`, measured layout map, long-press pointer reorder | Drag-reorder feel, save/discard modal timing, bottom search bar placement |
| `src/hooks/useColorMode.js` and new `src/theme.js` | `document.documentElement` theme mutation and host style writes | `Appearance`-driven state plus app-shell CSS-variable style injection | Dark-theme token parity |
| `src/features/auth/useLoginViewport.js` | Prior login plan called out root CSS variable injection for keyboard lift | Explicit `keyboardInset` return value consumed by RNW styles/state | Keyboard lift timing across mobile browsers |
| `src/hooks/useReducedMotionSafe.js` | `framer-motion` hook dependency in shared RNW path | Native/browser reduced-motion detection via `AccessibilityInfo` and `matchMedia` | None expected |
| Deleted `src/dom/AnimatedScreenDom.jsx`, `BottomTabDom.jsx`, `DatabaseDom.jsx`, `ImageZoomDom.jsx`, `ManageHomeDom.jsx`, `ManageShipEditDom.jsx`, `MenuDom.jsx`, `MenuInfoDom.jsx`, `MenuModeDom.jsx` | DOM-only wrapper layer | Removed; callers now import RNW-safe implementations directly | Import/path drift during migration |

## Remaining Intentional DOM Boundary

| File | Why it remains |
| --- | --- |
| `src/main.jsx` | Browser bootstrap still needs `document.getElementById('root')` to mount the RNW app into the Vite HTML shell. This is the thinnest practical RNW web bootstrap boundary. |
| `src/services/filePicker.js` | Browser file selection still requires a programmatic `<input type="file">`. It is isolated behind `pickFile()` so scene code stays RNW-safe. |
| `src/services/fileDownload.js` | Browser file download still requires an anchor click/object URL flow. It is isolated behind `downloadBlob()` and not used as a rendering primitive. |

## Removed Wrapper Layer

- `src/dom/AnimatedScreenDom.jsx`
- `src/dom/BottomTabDom.jsx`
- `src/dom/DatabaseDom.jsx`
- `src/dom/ImageZoomDom.jsx`
- `src/dom/ManageHomeDom.jsx`
- `src/dom/ManageShipEditDom.jsx`
- `src/dom/MenuDom.jsx`
- `src/dom/MenuInfoDom.jsx`
- `src/dom/MenuModeDom.jsx`

## Fonts

- No new font files were required.
- Exact local font assets already present in `assets/fonts/` were retained and continue to load through `src/styles.css`.
