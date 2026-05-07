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
  'WebkitBackfaceVisibility',
  'webkitBackfaceVisibility',
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
  'wordBreak',
  'touchAction',
  'caretColor',
  'fontVariationSettings',
  'backgroundImage',
  'fontSmoothing',
  'boxShadow',
  'boxSizing',
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
const PRETENDARD_FONT_FAMILIES = new Set([
  'Pretendard GOV Variable',
  'Pretendard GOV',
  'PretendardGOV-Regular',
  'PretendardGOV-Medium',
  'PretendardGOV-SemiBold',
  'PretendardGOV-Bold',
]);

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

function normalizeFontWeight(value) {
  if (value === undefined || value === null) {
    return 400;
  }

  if (typeof value === 'number') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'bold') {
    return 700;
  }
  if (normalized === 'normal') {
    return 400;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : 400;
}

export function getPretendardFontFamilyForWeight(value) {
  const weight = normalizeFontWeight(value);
  if (weight >= 700) {
    return 'PretendardGOV-Bold';
  }
  if (weight >= 600) {
    return 'PretendardGOV-SemiBold';
  }
  if (weight >= 500) {
    return 'PretendardGOV-Medium';
  }
  return 'PretendardGOV-Regular';
}

function isPretendardFontFamily(value) {
  if (value === undefined || value === null) {
    return false;
  }

  const fontFamily = String(value);
  if (PRETENDARD_FONT_FAMILIES.has(fontFamily)) {
    return true;
  }

  return /Pretendard\s*GOV|PretendardGOV-/i.test(fontFamily);
}

function shouldApplyPretendardWeight(style) {
  if (!Object.prototype.hasOwnProperty.call(style, 'fontWeight')) {
    return false;
  }

  const fontFamily = style.fontFamily;
  if (fontFamily === undefined || fontFamily === null) {
    return true;
  }

  return isPretendardFontFamily(fontFamily);
}

function looksLikeCssDimension(value) {
  return typeof value === 'string' && /^-?\d+\.?\d*(?:vh|vw|vmin|vmax|dvh|dvw)$/.test(value);
}

function adaptDimensionValue(value) {
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

  if (key === 'boxShadow') {
    return undefined;
  }

  if (startsWithCssGradient(value)) {
    return undefined;
  }

  return value;
}

function adaptDisplayValue(value) {
  if (value === 'flex' || value === 'none') {
    return value;
  }

  if (value === 'inline-flex') {
    return 'flex';
  }

  if (
    value === 'block' ||
    value === 'inline' ||
    value === 'inline-block' ||
    value === 'grid'
  ) {
    return undefined;
  }

  return value;
}

function adaptValue(key, value, theme) {
  if (UNSUPPORTED_STYLE_KEYS.has(key)) {
    return undefined;
  }

  if (key === 'display' && typeof value === 'string') {
    return adaptDisplayValue(value);
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
      return adaptDimensionValue(value);
    }
    if (value === 'currentColor' || value === 'inherit') {
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

  if (shouldApplyPretendardWeight(next)) {
    next.fontFamily = getPretendardFontFamilyForWeight(next.fontWeight);
    next.fontWeight = '400';
  } else if (isPretendardFontFamily(next.fontFamily)) {
    next.fontFamily = getPretendardFontFamilyForWeight(next.fontWeight);
  }

  return next;
}

let runtimeColorMode = Appearance.getColorScheme?.() === 'dark' ? 'dark' : 'light';

export function setRuntimeColorMode(colorMode) {
  const next = colorMode === 'dark' ? 'dark' : 'light';
  if (next === runtimeColorMode) {
    return;
  }
  runtimeColorMode = next;
  setActiveColorMode(next);
}

export function getRuntimeColorMode() {
  return runtimeColorMode;
}

function getRuntimeTheme() {
  return themes[runtimeColorMode] ?? themes.light;
}

// Cache of resolved style objects keyed first by the original sub-style object
// (via WeakMap), then by color mode. Each access returns the same resolved object
// for that theme so identity stays stable across renders within the same theme.
const resolvedStyleCache = new WeakMap();

function resolveAgainstActiveTheme(originalSubStyle) {
  let perStyle = resolvedStyleCache.get(originalSubStyle);
  if (!perStyle) {
    perStyle = new Map();
    resolvedStyleCache.set(originalSubStyle, perStyle);
  }
  if (perStyle.has(runtimeColorMode)) {
    return perStyle.get(runtimeColorMode);
  }
  const resolved = resolveStyleObject(originalSubStyle, getRuntimeTheme());
  perStyle.set(runtimeColorMode, resolved);
  return resolved;
}

let originalCreate = null;

export function patchStyleSheet() {
  if (originalCreate) {
    return;
  }

  originalCreate = StyleSheet.create.bind(StyleSheet);

  StyleSheet.create = (styles) => {
    if (!isPlainObject(styles)) {
      return originalCreate(styles);
    }

    const result = {};
    for (const key of Object.keys(styles)) {
      const sub = styles[key];

      if (isPlainObject(sub)) {
        Object.defineProperty(result, key, {
          enumerable: true,
          configurable: false,
          get() {
            return resolveAgainstActiveTheme(sub);
          },
        });
      } else {
        result[key] = sub;
      }
    }
    return result;
  };
}

setActiveColorMode(runtimeColorMode);
patchStyleSheet();

export function resolveInlineStyle(style) {
  const theme = getActiveTheme();

  if (Array.isArray(style)) {
    return style
      .map((entry) => resolveInlineStyle(entry))
      .filter((entry) => entry !== undefined && entry !== null && entry !== false);
  }

  if (!isPlainObject(style)) {
    return style;
  }

  return resolveStyleObject(style, theme);
}
