export function getDocument() {
  return typeof document === 'undefined' ? null : document;
}

export function getWindow() {
  return typeof window === 'undefined' ? null : window;
}

export function canUseDom() {
  return Boolean(getDocument() && getWindow());
}

export function getRootElement(id = 'root') {
  return getDocument()?.getElementById(id) ?? null;
}

export function getVisualViewport() {
  return getWindow()?.visualViewport ?? null;
}

export function getWindowInnerHeight() {
  return getWindow()?.innerHeight ?? 0;
}

export function getWindowInnerWidth() {
  return getWindow()?.innerWidth ?? 0;
}

export function scheduleIdleTask(callback, options = {}) {
  const { fallbackDelay = 240, timeout = 900 } = options;
  const browserWindow = getWindow();

  if (browserWindow?.requestIdleCallback) {
    const idleCallbackId = browserWindow.requestIdleCallback(callback, { timeout });
    return () => browserWindow.cancelIdleCallback?.(idleCallbackId);
  }

  const timeoutId = setTimeout(callback, fallbackDelay);
  return () => clearTimeout(timeoutId);
}

export function setDocumentTheme(theme) {
  const root = getDocument()?.documentElement;

  if (root) {
    root.dataset.theme = theme;
  }
}

export function getPreferredColorScheme() {
  const mediaQuery = getWindow()?.matchMedia?.('(prefers-color-scheme: dark)');

  if (!mediaQuery) {
    return null;
  }

  return mediaQuery.matches ? 'dark' : 'light';
}

export function subscribePreferredColorScheme(callback) {
  const mediaQuery = getWindow()?.matchMedia?.('(prefers-color-scheme: dark)');

  if (!mediaQuery) {
    return () => {};
  }

  const handleChange = () => callback(getPreferredColorScheme());

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }

  mediaQuery.addListener?.(handleChange);
  return () => mediaQuery.removeListener?.(handleChange);
}

export function getMediaQueryMatch(query) {
  return Boolean(getWindow()?.matchMedia?.(query).matches);
}

export function subscribeMediaQuery(query, callback) {
  const mediaQuery = getWindow()?.matchMedia?.(query);

  if (!mediaQuery) {
    return () => {};
  }

  const handleChange = () => callback(Boolean(mediaQuery.matches));

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }

  mediaQuery.addListener?.(handleChange);
  return () => mediaQuery.removeListener?.(handleChange);
}

export function readLocalStorageValue(key) {
  try {
    return getWindow()?.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeLocalStorageValue(key, value) {
  try {
    getWindow()?.localStorage?.setItem(key, value);
  } catch {}
}

export function isHostElement(node) {
  const HostElement = getWindow()?.HTMLElement ?? globalThis.HTMLElement;
  return Boolean(HostElement && node instanceof HostElement);
}

export function getElementRectSnapshot(node) {
  const rect = node?.getBoundingClientRect?.();

  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
  };
}

export function setElementDataAttribute(node, name, value) {
  if (isHostElement(node)) {
    node.dataset[name] = value;
  }
}

export function removeElementDataAttribute(node, name) {
  if (isHostElement(node)) {
    delete node.dataset[name];
  }
}

export function findClosestElement(node, selector) {
  return isHostElement(node) ? node.closest(selector) : null;
}

export function escapeCssIdentifier(value) {
  const rawValue = String(value ?? '');

  if (typeof CSS !== 'undefined' && CSS.escape) {
    return CSS.escape(rawValue);
  }

  return rawValue.replace(/["\\]/g, '\\$&');
}

export function capturePointer(element, pointerId) {
  try {
    element?.setPointerCapture?.(pointerId);
  } catch {
    // Pointer capture is a browser enhancement; gestures still work without it.
  }
}

export function releasePointerCapture(element, pointerId) {
  try {
    if (element?.hasPointerCapture?.(pointerId) ?? true) {
      element?.releasePointerCapture?.(pointerId);
    }
  } catch {
    // The pointer may already be released when a gesture is cancelled.
  }
}

export function blurFocusedDescendant(element) {
  const activeElement = getDocument()?.activeElement;

  if (activeElement && activeElement !== getDocument()?.body && element?.contains(activeElement)) {
    activeElement.blur?.();
  }
}

export function getComputedStyleValue(element, propertyName) {
  const getComputedStyle = getWindow()?.getComputedStyle;

  if (!element || typeof getComputedStyle !== 'function') {
    return '';
  }

  return getComputedStyle(element)[propertyName] ?? '';
}

export function querySelector(selector) {
  return getDocument()?.querySelector(selector) ?? null;
}

export function querySelectorAll(selector) {
  return Array.from(getDocument()?.querySelectorAll(selector) ?? []);
}

export function addWindowEventListener(type, listener, options) {
  const browserWindow = getWindow();

  if (!browserWindow) {
    return () => {};
  }

  browserWindow.addEventListener(type, listener, options);
  return () => browserWindow.removeEventListener(type, listener, options);
}

export function addVisualViewportEventListener(type, listener, options) {
  const viewport = getVisualViewport();

  if (!viewport) {
    return () => {};
  }

  viewport.addEventListener(type, listener, options);
  return () => viewport.removeEventListener(type, listener, options);
}

export function requestAnimationFrameTask(callback) {
  const browserWindow = getWindow();

  if (browserWindow?.requestAnimationFrame) {
    const frameId = browserWindow.requestAnimationFrame(callback);
    return () => browserWindow.cancelAnimationFrame?.(frameId);
  }

  const timeoutId = setTimeout(callback, 16);
  return () => clearTimeout(timeoutId);
}

export function getHighResolutionTime() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}
