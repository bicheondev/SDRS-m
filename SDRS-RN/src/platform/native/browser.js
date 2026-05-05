import { Appearance, Dimensions } from 'react-native';

const unsupported = () => null;
const noopCleanup = () => {};

export function getDocument() {
  return null;
}

export function getWindow() {
  return null;
}

export function canUseDom() {
  return false;
}

export function getRootElement() {
  return null;
}

export function getVisualViewport() {
  return null;
}

export function getWindowInnerHeight() {
  return Dimensions.get('window').height;
}

export function getWindowInnerWidth() {
  return Dimensions.get('window').width;
}

export function scheduleIdleTask(callback) {
  const timeoutId = setTimeout(callback, 0);
  return () => clearTimeout(timeoutId);
}

export function setDocumentTheme() {}

export function getPreferredColorScheme() {
  return Appearance.getColorScheme?.() === 'dark' ? 'dark' : 'light';
}

export function subscribePreferredColorScheme(callback) {
  const subscription = Appearance.addChangeListener?.(({ colorScheme }) => {
    callback(colorScheme === 'dark' ? 'dark' : 'light');
  });

  return () => subscription?.remove?.();
}

export function getMediaQueryMatch() {
  return false;
}

export function subscribeMediaQuery() {
  return noopCleanup;
}

export const readLocalStorageValue = unsupported;
export function writeLocalStorageValue() {}
export function isHostElement() {
  return false;
}
export const getElementRectSnapshot = unsupported;
export function setElementDataAttribute() {}
export function removeElementDataAttribute() {}
export const findClosestElement = unsupported;
export function escapeCssIdentifier(value) {
  return String(value ?? '').replace(/["\\]/g, '\\$&');
}
export function capturePointer() {}
export function releasePointerCapture() {}
export function blurFocusedDescendant() {}
export function getComputedStyleValue() {
  return '';
}
export const querySelector = unsupported;
export function querySelectorAll() {
  return [];
}
export function addWindowEventListener() {
  return noopCleanup;
}
export function addVisualViewportEventListener() {
  return noopCleanup;
}
export function requestAnimationFrameTask(callback) {
  const frameId = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(frameId);
}
export function getHighResolutionTime() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}
