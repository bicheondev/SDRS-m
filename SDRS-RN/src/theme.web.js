export const APP_FONT_FAMILY =
  'Pretendard GOV Variable, Pretendard GOV, -apple-system, BlinkMacSystemFont, system-ui, Roboto, Helvetica Neue, Segoe UI, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, sans-serif';

const DARK_THEME_CSS_VARIABLES = {
  '--slate-50': '#1e293b',
  '--slate-100': '#1e293b',
  '--slate-200': '#334155',
  '--slate-300': '#64748b',
  '--slate-400': '#94a3b8',
  '--slate-500': '#cbd5e1',
  '--slate-600': '#e2e8f0',
  '--slate-700': '#f1f5f9',
  '--blue-50': 'rgb(30 58 138 / 0.36)',
  '--blue-500': '#60a5fa',
  '--blue-600': '#93c5fd',
  '--blue-700': '#bfdbfe',
  '--red-50': 'rgb(127 29 29 / 0.32)',
  '--red-500': '#f87171',
  '--red-600': '#fca5a5',
  '--emerald-50': 'rgb(6 78 59 / 0.32)',
  '--emerald-500': '#34d399',
  '--teal-50': 'rgb(19 78 74 / 0.32)',
  '--amber-50': 'rgb(120 53 15 / 0.3)',
  '--amber-400': '#fbbf24',
  '--violet-50': 'rgb(76 29 149 / 0.32)',
  '--violet-300': '#ddd6fe',
  '--violet-400': '#c4b5fd',
  '--violet-500': '#a78bfa',
  '--color-bg-body': '#020617',
  '--color-bg-app': '#020617',
  '--color-bg-screen': '#0f172a',
  '--color-bg-toolbar': '#0f172a',
  '--color-bg-surface': '#0f172a',
  '--color-bg-surface-muted': '#1e293b',
  '--color-bg-surface-elevated': '#1e293b',
  '--color-bg-surface-pressed': '#334155',
  '--color-bg-divider': 'rgb(148 163 184 / 0.12)',
  '--color-bg-input': '#1e293b',
  '--color-bg-input-focus': 'rgb(30 58 138 / 0.4)',
  '--color-bg-card': '#1e293b',
  '--color-bg-tab': 'rgb(15 23 42 / 0.96)',
  '--color-bg-tab-blur': 'rgb(15 23 42 / 0.72)',
  '--color-bg-modal': '#1e293b',
  '--color-bg-toast': 'rgb(30 41 59 / 0.7)',
  '--color-bg-toast-border': 'rgb(148 163 184 / 0.12)',
  '--color-text-toast': 'rgb(226 232 240 / 0.92)',
  '--color-bg-accent-soft': 'var(--blue-50)',
  '--color-bg-violet-soft': 'var(--violet-50)',
  '--color-bg-danger-soft': 'var(--red-50)',
  '--color-bg-success-soft': 'var(--emerald-50)',
  '--color-bg-warning-soft': 'var(--amber-50)',
  '--color-text-primary': '#f1f5f9',
  '--color-text-secondary': '#e2e8f0',
  '--color-text-tertiary': '#cbd5e1',
  '--color-text-muted': '#94a3b8',
  '--color-text-disabled': '#64748b',
  '--color-text-accent': '#60a5fa',
  '--color-text-accent-strong': '#93c5fd',
  '--color-text-on-accent': '#0b1220',
  '--color-text-danger': '#f87171',
  '--color-text-success': '#34d399',
  '--color-text-warning': '#fbbf24',
  '--color-text-violet': '#c4b5fd',
  '--color-text-violet-muted': '#ddd6fe',
  '--color-accent': 'var(--color-text-accent)',
  '--color-accent-solid': 'var(--color-text-accent)',
  '--color-accent-hover': 'var(--color-text-accent-strong)',
  '--color-accent-pressed': '#3b82f6',
  '--color-accent-soft': 'var(--color-bg-accent-soft)',
  '--color-danger': 'var(--color-text-danger)',
  '--color-danger-solid': '#f87171',
  '--color-danger-soft': 'var(--color-bg-danger-soft)',
  '--color-success': 'var(--color-text-success)',
  '--color-success-soft': 'var(--color-bg-success-soft)',
  '--color-warning': 'var(--color-text-warning)',
  '--color-warning-soft': 'var(--color-bg-warning-soft)',
  '--color-border-subtle': 'rgb(148 163 184 / 0.14)',
  '--color-border-strong': 'rgb(148 163 184 / 0.34)',
  '--color-border-tab-blur': 'rgb(148 163 184 / 0.16)',
  '--color-border-accent-focus': 'rgb(96 165 250 / 0.34)',
  '--color-border-accent-soft': 'rgb(96 165 250 / 0.18)',
  '--color-border-violet': '#a78bfa',
  '--color-press-overlay-slate-100-50': 'rgb(248 250 252 / 0.06)',
  '--color-overlay-frost': 'rgb(15 23 42 / 0.72)',
  '--color-overlay-scrim': 'rgb(2 6 23 / 0.7)',
  '--color-state-layer-neutral': 'rgb(248 250 252 / 0.06)',
  '--color-state-layer-strong': 'rgb(248 250 252 / 0.12)',
  '--color-state-layer-filled': 'rgb(248 250 252 / 0.14)',
  '--color-state-layer-media': 'rgb(2 6 23 / 0.36)',
  '--color-state-layer-accent': 'rgb(2 6 23 / 0.24)',
  '--color-state-layer-inverse': 'rgb(2 6 23 / 0.24)',
  '--shadow-screen': '0 24px 60px rgb(0 0 0 / 0.5)',
  '--shadow-screen-stack':
    '-10px 0 28px -18px rgb(0 0 0 / 0.6), -2px 0 8px rgb(0 0 0 / 0.32)',
  '--shadow-focus': '0 0 0 1px var(--color-border-accent-focus)',
  '--shadow-edit': '0 0 0 1px var(--color-border-accent-soft)',
  '--shadow-zoom': '0 24px 48px rgb(0 0 0 / 0.6)',
  '--shadow-zoom-closing': '0 12px 20px rgb(0 0 0 / 0.42)',
  '--shadow-modal':
    'inset 0 0 0 1px rgb(148 163 184 / 0.1), 0 10px 30px -3px rgb(0 0 0 / 0.4), 0 15px 80px -5px rgb(0 0 0 / 0.6)',
  '--shadow-toast':
    'inset 0 0 0 1px var(--color-bg-toast-border), 0 12px 24px -12px rgb(15 23 42 / 0.5)',
  '--gradient-app-shell':
    'radial-gradient(circle at top, rgb(15 23 42) 0%, rgb(15 23 42) 30%, rgb(2 6 23) 100%)',
  '--gradient-top-bar':
    'linear-gradient(180deg, rgb(255 255 255 / .86) 0%, rgb(255 255 255 / .78) 64%, rgb(255 255 255 / .1) 100%)',
  '--gradient-top-bar-frost':
    'linear-gradient(180deg, rgb(15 23 42 / 0.84) 0%, rgb(15 23 42 / 0.74) 64%, rgb(15 23 42 / 0.08) 100%)',
  '--gradient-top-bar-frost-soft':
    'linear-gradient(180deg, rgb(15 23 42 / 0.38) 0%, rgb(15 23 42 / 0.22) 68%, rgb(15 23 42 / 0.04) 100%)',
  '--gradient-filter-backdrop':
    'linear-gradient(180deg, rgb(15 23 42) 0%, rgb(15 23 42 / 0.5) 100%)',
  '--icon-filter-neutral':
    'brightness(0) saturate(100%) invert(72%) sepia(12%) saturate(391%) hue-rotate(178deg) brightness(95%) contrast(92%)',
  '--icon-filter-strong':
    'brightness(0) saturate(100%) invert(92%) sepia(8%) saturate(462%) hue-rotate(179deg) brightness(103%) contrast(98%)',
  '--logo-filter':
    'brightness(0) saturate(100%) invert(94%) sepia(8%) saturate(368%) hue-rotate(177deg) brightness(102%) contrast(97%)',
};

export function getThemeCssVariables(colorMode = 'light') {
  if (colorMode === 'dark') {
    return {
      ...DARK_THEME_CSS_VARIABLES,
      colorScheme: 'dark',
    };
  }

  return {
    colorScheme: 'light',
  };
}
