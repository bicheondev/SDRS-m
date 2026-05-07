function rgb(r, g, b, a = 1) {
  if (a >= 1) {
    return `rgb(${r}, ${g}, ${b})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const lightPalette = {
  'blue-50': '#eff6ff',
  'blue-500': '#2b7fff',
  'blue-600': '#155dfc',
  'blue-700': '#5d718c',
  'red-50': '#fef2f2',
  'red-500': '#fb2c36',
  'red-600': '#dc2626',
  'emerald-50': '#ecfdf5',
  'emerald-500': '#10b981',
  'teal-50': '#f0fdfa',
  'amber-50': '#fffbeb',
  'amber-400': '#fbbf24',
  'slate-50': '#f8fafc',
  'slate-100': '#f1f5f9',
  'slate-200': '#e2e8f0',
  'slate-300': '#cbd5e1',
  'slate-400': '#94a3b8',
  'slate-500': '#64748b',
  'slate-600': '#475569',
  'slate-700': '#334155',
  'violet-50': '#f5f3ff',
  'violet-300': '#c4b5fd',
  'violet-400': '#a78bfa',
  'violet-500': '#8b5cf6',
};

const darkPalette = {
  'blue-50': rgb(30, 58, 138, 0.36),
  'blue-500': '#60a5fa',
  'blue-600': '#93c5fd',
  'blue-700': '#bfdbfe',
  'red-50': rgb(127, 29, 29, 0.32),
  'red-500': '#f87171',
  'red-600': '#fca5a5',
  'emerald-50': rgb(6, 78, 59, 0.32),
  'emerald-500': '#34d399',
  'teal-50': rgb(19, 78, 74, 0.32),
  'amber-50': rgb(120, 53, 15, 0.3),
  'amber-400': '#fbbf24',
  'slate-50': '#1e293b',
  'slate-100': '#1e293b',
  'slate-200': '#334155',
  'slate-300': '#64748b',
  'slate-400': '#94a3b8',
  'slate-500': '#cbd5e1',
  'slate-600': '#e2e8f0',
  'slate-700': '#f1f5f9',
  'violet-50': rgb(76, 29, 149, 0.32),
  'violet-300': '#ddd6fe',
  'violet-400': '#c4b5fd',
  'violet-500': '#a78bfa',
};

function buildLightTheme() {
  const p = lightPalette;
  return {
    ...p,
    'color-bg-body': '#ffffff',
    'color-bg-app': '#ffffff',
    'color-bg-screen': '#ffffff',
    'color-bg-toolbar': p['slate-50'],
    'color-bg-surface': '#ffffff',
    'color-bg-surface-muted': p['slate-50'],
    'color-bg-surface-elevated': '#ffffff',
    'color-bg-surface-pressed': p['slate-200'],
    'color-bg-divider': p['slate-100'],
    'color-bg-input': p['slate-50'],
    'color-bg-input-focus': p['blue-50'],
    'color-bg-card': '#ffffff',
    'color-bg-tab': '#ffffff',
    'color-bg-tab-blur': rgb(255, 255, 255, 0.62),
    'color-bg-modal': '#ffffff',
    'color-bg-toast': rgb(241, 245, 249, 0.5),
    'color-bg-toast-border': rgb(255, 255, 255, 0.55),
    'color-text-toast': rgb(69, 85, 108),
    'color-bg-zoom': '#000000',
    'color-bg-accent-soft': p['blue-50'],
    'color-bg-violet-soft': p['violet-50'],
    'color-bg-danger-soft': p['red-50'],
    'color-bg-success-soft': p['emerald-50'],
    'color-bg-warning-soft': p['amber-50'],
    'color-text-primary': p['slate-700'],
    'color-text-secondary': p['slate-600'],
    'color-text-tertiary': p['slate-500'],
    'color-text-muted': p['slate-400'],
    'color-text-disabled': p['slate-400'],
    'color-text-accent': p['blue-500'],
    'color-text-accent-strong': p['blue-600'],
    'color-text-on-accent': '#ffffff',
    'color-text-danger': p['red-600'],
    'color-text-success': p['emerald-500'],
    'color-text-warning': '#d97706',
    'color-text-violet': p['violet-500'],
    'color-text-violet-muted': p['violet-300'],
    'color-accent': p['blue-500'],
    'color-accent-solid': p['blue-500'],
    'color-accent-hover': p['blue-600'],
    'color-accent-pressed': p['blue-600'],
    'color-accent-soft': p['blue-50'],
    'color-danger': p['red-600'],
    'color-danger-solid': p['red-500'],
    'color-danger-soft': p['red-50'],
    'color-success': p['emerald-500'],
    'color-success-soft': p['emerald-50'],
    'color-warning': '#d97706',
    'color-warning-soft': p['amber-50'],
    'color-border-subtle': p['slate-200'],
    'color-border-strong': p['slate-400'],
    'color-border-tab-blur': rgb(226, 232, 240, 0.9),
    'color-border-accent-focus': rgb(43, 127, 255, 0.12),
    'color-border-accent-soft': rgb(43, 127, 255, 0.08),
    'color-border-violet': p['violet-400'],
    'color-press-overlay-slate-100-50': rgb(241, 245, 249, 0.5),
    'color-overlay-frost': rgb(255, 255, 255, 0.52),
    'color-overlay-scrim': rgb(0, 0, 0, 0.3),
    'color-state-layer-neutral': rgb(15, 23, 42, 0.06),
    'color-state-layer-strong': rgb(15, 23, 42, 0.1),
    'color-state-layer-filled': rgb(2, 6, 23, 0.1),
    'color-state-layer-media': rgb(2, 6, 23, 0.12),
    'color-state-layer-accent': rgb(2, 6, 23, 0.12),
    'color-state-layer-inverse': rgb(255, 255, 255, 0.16),
    'shadow-screen': null,
    'shadow-screen-stack': null,
    'shadow-focus': null,
    'shadow-edit': null,
    'shadow-zoom': null,
    'shadow-zoom-closing': null,
    'shadow-modal': null,
    'shadow-toast': null,
    'gradient-app-shell': null,
    'gradient-top-bar': null,
    'gradient-top-bar-frost': null,
    'gradient-top-bar-frost-soft': null,
    'gradient-filter-backdrop': null,
    'icon-filter-neutral': null,
    'icon-filter-strong': null,
    'logo-filter': null,
    'screen-width': 390,
    'screen-height': 844,
    'db-scrollbar-gutter': 0,
    'radius-interaction': 12,
    'space-screen-edge': 18,
    'space-section-gap': 28,
    'space-card-gap': 12,
    'z-screen-base': 1,
    'z-screen-top-bar': 2,
    'z-screen-tab': 4,
    'z-screen-overlay': 5,
    'z-screen-zoom': 20,
    'motion-thumbnail-radius': 6,
    'motion-press-scale-button': 0.986,
    'motion-press-scale-row': 0.992,
    'motion-duration-fast': 180,
    'motion-duration-normal': 240,
    'motion-duration-screen': 320,
    'motion-duration-image': 280,
    'motion-ease-standard': 'ease-in-out',
    'motion-ease-soft-exit': 'ease-out',
  };
}

function buildDarkTheme() {
  const light = buildLightTheme();
  const p = darkPalette;
  return {
    ...light,
    ...p,
    'color-bg-body': '#020617',
    'color-bg-app': '#020617',
    'color-bg-screen': '#0f172a',
    'color-bg-toolbar': '#0f172a',
    'color-bg-surface': '#0f172a',
    'color-bg-surface-muted': '#1e293b',
    'color-bg-surface-elevated': '#1e293b',
    'color-bg-surface-pressed': '#334155',
    'color-bg-divider': rgb(148, 163, 184, 0.12),
    'color-bg-input': '#1e293b',
    'color-bg-input-focus': rgb(30, 58, 138, 0.4),
    'color-bg-card': '#1e293b',
    'color-bg-tab': rgb(15, 23, 42, 0.96),
    'color-bg-tab-blur': rgb(15, 23, 42, 0.72),
    'color-bg-modal': '#1e293b',
    'color-bg-toast': rgb(30, 41, 59, 0.7),
    'color-bg-toast-border': rgb(148, 163, 184, 0.12),
    'color-text-toast': rgb(226, 232, 240, 0.92),
    'color-bg-accent-soft': p['blue-50'],
    'color-bg-violet-soft': p['violet-50'],
    'color-bg-danger-soft': p['red-50'],
    'color-bg-success-soft': p['emerald-50'],
    'color-bg-warning-soft': p['amber-50'],
    'color-text-primary': '#f1f5f9',
    'color-text-secondary': '#e2e8f0',
    'color-text-tertiary': '#cbd5e1',
    'color-text-muted': '#94a3b8',
    'color-text-disabled': '#64748b',
    'color-text-accent': '#60a5fa',
    'color-text-accent-strong': '#93c5fd',
    'color-text-on-accent': '#0b1220',
    'color-text-danger': '#f87171',
    'color-text-success': '#34d399',
    'color-text-warning': '#fbbf24',
    'color-text-violet': '#c4b5fd',
    'color-text-violet-muted': '#ddd6fe',
    'color-accent': '#60a5fa',
    'color-accent-solid': '#60a5fa',
    'color-accent-hover': '#93c5fd',
    'color-accent-pressed': '#3b82f6',
    'color-accent-soft': p['blue-50'],
    'color-danger': '#f87171',
    'color-danger-solid': '#f87171',
    'color-danger-soft': p['red-50'],
    'color-success': '#34d399',
    'color-success-soft': p['emerald-50'],
    'color-warning': '#fbbf24',
    'color-warning-soft': p['amber-50'],
    'color-border-subtle': rgb(148, 163, 184, 0.14),
    'color-border-strong': rgb(148, 163, 184, 0.34),
    'color-border-tab-blur': rgb(148, 163, 184, 0.16),
    'color-border-accent-focus': rgb(96, 165, 250, 0.34),
    'color-border-accent-soft': rgb(96, 165, 250, 0.18),
    'color-border-violet': '#a78bfa',
    'color-press-overlay-slate-100-50': rgb(248, 250, 252, 0.06),
    'color-overlay-frost': rgb(15, 23, 42, 0.72),
    'color-overlay-scrim': rgb(2, 6, 23, 0.7),
    'color-state-layer-neutral': rgb(248, 250, 252, 0.06),
    'color-state-layer-strong': rgb(248, 250, 252, 0.12),
    'color-state-layer-filled': rgb(248, 250, 252, 0.14),
    'color-state-layer-media': rgb(2, 6, 23, 0.36),
    'color-state-layer-accent': rgb(2, 6, 23, 0.24),
    'color-state-layer-inverse': rgb(2, 6, 23, 0.24),
    'shadow-screen': '0 24px 60px rgb(0 0 0 / 0.5)',
    'shadow-screen-stack':
      '-10px 0 28px -18px rgb(0 0 0 / 0.6), -2px 0 8px rgb(0 0 0 / 0.32)',
    'shadow-focus': '0 0 0 1px var(--color-border-accent-focus)',
    'shadow-edit': '0 0 0 1px var(--color-border-accent-soft)',
    'shadow-zoom': '0 24px 48px rgb(0 0 0 / 0.6)',
    'shadow-zoom-closing': '0 12px 20px rgb(0 0 0 / 0.42)',
    'shadow-modal':
      'inset 0 0 0 1px rgb(148 163 184 / 0.1), 0 10px 30px -3px rgb(0 0 0 / 0.4), 0 15px 80px -5px rgb(0 0 0 / 0.6)',
    'shadow-toast':
      'inset 0 0 0 1px var(--color-bg-toast-border), 0 12px 24px -12px rgb(0 0 0 / 0.6)',
    'gradient-app-shell':
      'radial-gradient(circle at top, #0f172a 0%, #020617 60%, #020617 100%)',
    'gradient-top-bar':
      'linear-gradient(180deg, rgb(15 23 42) 0%, rgb(15 23 42) 64%, rgb(15 23 42 / 0) 100%)',
    'gradient-top-bar-frost':
      'linear-gradient(180deg, rgb(15 23 42 / 0.86) 0%, rgb(15 23 42 / 0.78) 64%, rgb(15 23 42 / 0.1) 100%)',
    'gradient-top-bar-frost-soft':
      'linear-gradient(180deg, rgb(15 23 42 / 0.4) 0%, rgb(15 23 42 / 0.22) 68%, rgb(15 23 42 / 0.04) 100%)',
    'gradient-filter-backdrop':
      'linear-gradient(180deg, rgb(15 23 42) 0%, rgb(15 23 42 / 0.5) 100%)',
    'icon-filter-neutral':
      'brightness(0) saturate(100%) invert(72%) sepia(12%) saturate(391%) hue-rotate(178deg) brightness(95%) contrast(92%)',
    'icon-filter-strong':
      'brightness(0) saturate(100%) invert(92%) sepia(8%) saturate(462%) hue-rotate(179deg) brightness(103%) contrast(98%)',
    'logo-filter':
      'brightness(0) saturate(100%) invert(94%) sepia(8%) saturate(368%) hue-rotate(177deg) brightness(102%) contrast(97%)',
  };
}

export const themes = {
  light: buildLightTheme(),
  dark: buildDarkTheme(),
};

export const APP_FONT_FAMILY = 'Pretendard GOV Variable';

let activeColorMode = 'light';

export function setActiveColorMode(colorMode) {
  activeColorMode = colorMode === 'dark' ? 'dark' : 'light';
}

export function getActiveColorMode() {
  return activeColorMode;
}

export function getActiveTheme() {
  return themes[activeColorMode] ?? themes.light;
}

const VAR_PATTERN = /^var\(--([a-z0-9-]+)(?:,\s*(.+?))?\)$/i;

export function resolveCssVariableString(value, theme = getActiveTheme()) {
  if (typeof value !== 'string') {
    return value;
  }

  const match = value.match(VAR_PATTERN);
  if (!match) {
    return value;
  }

  const tokenName = match[1];
  const fallback = match[2]?.trim();

  if (Object.prototype.hasOwnProperty.call(theme, tokenName)) {
    const resolved = theme[tokenName];
    return resolved === null ? undefined : resolved;
  }

  return fallback ?? value;
}

export function getThemeCssVariables() {
  return {};
}
