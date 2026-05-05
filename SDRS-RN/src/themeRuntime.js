import { Appearance, StyleSheet } from 'react-native';

import {
  getActiveTheme,
  resolveCssVariableString,
  setActiveColorMode,
  themes,
} from './theme.js';

const UNSUPPORTED_STYLE_KEYS = new Set([
  'filter',
  'backdropFilter',
  'WebkitBackdropFilter',
  'webkitBackdropFilter',
  'colorScheme',
  'cursor',
  'outline',
  'outlineWidth',
  'outlineColor',
  'outlineStyle',
  'userSelect',
  'WebkitUserSelect',
  'webkitUserSelect',
  'WebkitTouchCallout',
  'webkitTouchCallout',
  'WebkitFontSmoothing',
  'webkitFontSmoothing',
  'MozOsxFontSmoothing',
  'mozOsxFontSmoothing',
  'WebkitTapHighlightColor',
  'webkitTapHighlightColor',
  'WebkitOverflowScrolling',
  'webkitOverflowScrolling',
  'WebkitTextFillColor',
  'webkitTextFillColor',
  'WebkitMaskImage',
  'webkitMaskImage',
  'WebkitBackgroundClip',
  'webkitBackgroundClip',
  'maskImage',
  'maskMode',
  'maskRepeat',
  'maskSize',
  'overscrollBehavior',
  'overscrollBehaviorY',
  'overscrollBehaviorX',
  'scrollbarGutter',
  'scrollbarColor',
  'scrollbarWidth',
  'transition',
  'transitionDuration',
  'transitionProperty',
  'transitionTimingFunction',
  'animation',
  'animationDuration',
  'animationName',
  'animationTimingFunction',
  'willChange',
  'contain',
  'isolation',
  'mixBlendMode',
  'visibility',
  'whiteSpace',
  'touchAction',
  'caretColor',
  'fontVariationSettings',
  'backgroundImage',
  'fontSmoothing',
  'boxShadow',
  'boxSizing',
  'WebkitOverflowScrolling',
  'overflowAnchor',
  'fontStretch',
  'background',
]);

const CSS_FUNCTION_PREFIXES = [
  'min(',
  'max(',
  'clamp(',
  'calc(',
  'env(',
  'linear-gradient(',
  'radial-gradient(',
  'conic-gradient(',
  'inset(',
  'fit-content(',
];

function isUnresolvableCssFunctionString(value) {
  if (typeof value !== 'string') {
    return false;
  }
  return CSS_FUNCTION_PREFIXES.some((prefix) => value.startsWith(prefix));
}

const POSITION_FIXED_KEYS = new Set(['position']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isCssVarString(value) {
  return typeof value === 'string' && value.startsWith('var(');
}

function startsWithCssGradient(value) {
  return (
    typeof value === 'string' &&
    (value.startsWith('linear-gradient') ||
      value.startsWith('radial-gradient') ||
      value.startsWith('conic-gradient'))
  );
}

function looksLikeCssDimension(value) {
  return typeof value === 'string' && /^-?\d+\.?\d*(?:vh|vw|vmin|vmax|dvh|dvw)$/.test(value);
}

function adaptDimensionValue(value, key) {
  if (!looksLikeCssDimension(value)) {
    return value;
  }

  const numeric = parseFloat(value);

  if (value.endsWith('vh') || value.endsWith('dvh')) {
    return `${numeric}%`;
  }

  if (value.endsWith('vw') || value.endsWith('dvw')) {
    return `${numeric}%`;
  }

  return numeric;
}

function adaptShadowOrFilter(key, value) {
  if (typeof value !== 'string') {
    return value;
  }

  if (key === 'boxShadow' || key === 'shadowOffset' || key === 'shadowColor') {
    return undefined;
  }

  if (startsWithCssGradient(value)) {
    return undefined;
  }

  return value;
}

function adaptValue(key, value, theme) {
  if (UNSUPPORTED_STYLE_KEYS.has(key)) {
    return undefined;
  }

  if (isCssVarString(value)) {
    const resolved = resolveCssVariableString(value, theme);
    if (resolved === undefined || resolved === null) {
      return undefined;
    }
    return adaptValue(key, resolved, theme);
  }

  if (POSITION_FIXED_KEYS.has(key) && value === 'fixed') {
    return 'absolute';
  }

  if (typeof value === 'string') {
    if (isUnresolvableCssFunctionString(value)) {
      return undefined;
    }
    if (startsWithCssGradient(value)) {
      return undefined;
    }
    if ((key === 'boxShadow' || key === 'shadow') && /[a-z]/i.test(value)) {
      return undefined;
    }
    if (looksLikeCssDimension(value)) {
      return adaptDimensionValue(value, key);
    }
    if (value === 'currentColor') {
      return undefined;
    }
  }

  return adaptShadowOrFilter(key, value);
}

function resolveStyleObject(style, theme) {
  if (!isPlainObject(style)) {
    return style;
  }

  const next = {};
  for (const key of Object.keys(style)) {
    const value = style[key];

    if (isPlainObject(value)) {
      const inner = resolveStyleObject(value, theme);
      if (inner !== undefined) {
        next[key] = inner;
      }
      continue;
    }

    if (Array.isArray(value)) {
      const arr = value
        .map((entry) => (isPlainObject(entry) ? resolveStyleObject(entry, theme) : entry))
        .filter((entry) => entry !== undefined && entry !== null);
      next[key] = arr;
      continue;
    }

    const adapted = adaptValue(key, value, theme);
    if (adapted !== undefined) {
      next[key] = adapted;
    }
  }

  return next;
}

function resolveStyles(styles, theme) {
  if (!isPlainObject(styles)) {
    return styles;
  }

  const resolved = {};
  for (const key of Object.keys(styles)) {
    const inner = styles[key];
    resolved[key] = isPlainObject(inner) ? resolveStyleObject(inner, theme) : inner;
  }
  return resolved;
}

let originalCreate = null;
let activeStyleSheetTheme = themes.light;

export function patchStyleSheet(colorMode = 'light') {
  activeStyleSheetTheme = themes[colorMode === 'dark' ? 'dark' : 'light'];

  if (originalCreate) {
    return;
  }

  originalCreate = StyleSheet.create.bind(StyleSheet);

  StyleSheet.create = (styles) => {
    const resolved = resolveStyles(styles, activeStyleSheetTheme);
    return originalCreate(resolved);
  };
}

const detectedColorScheme = Appearance.getColorScheme?.() === 'dark' ? 'dark' : 'light';
setActiveColorMode(detectedColorScheme);
patchStyleSheet(detectedColorScheme);

export function resolveInlineStyle(style) {
  const theme = getActiveTheme();

  if (Array.isArray(style)) {
    return style
      .map((entry) => resolveInlineStyle(entry))
      .filter((entry) => entry !== undefined && entry !== null);
  }

  if (!isPlainObject(style)) {
    return style;
  }

  return resolveStyleObject(style, theme);
}
