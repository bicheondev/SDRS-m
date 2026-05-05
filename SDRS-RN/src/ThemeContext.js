import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance } from 'react-native';

import { setRuntimeColorMode } from './themeRuntime.js';
import { getColorModePreference, setColorModePreference } from './platform/storage';

const VALID_COLOR_MODES = new Set(['system', 'light', 'dark']);

function detectSystemColorMode() {
  return Appearance.getColorScheme?.() === 'dark' ? 'dark' : 'light';
}

function normalize(mode, fallback = 'light') {
  return VALID_COLOR_MODES.has(mode) ? mode : fallback;
}

const ThemeContext = createContext({
  colorMode: 'system',
  resolvedColorMode: detectSystemColorMode(),
  setColorMode: () => {},
  systemColorMode: detectSystemColorMode(),
  hydrated: false,
});

export function ThemeProvider({ children, initialMode = 'system' }) {
  const [colorMode, setColorModeState] = useState(() => normalize(initialMode));
  const [systemColorMode, setSystemColorMode] = useState(detectSystemColorMode);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getColorModePreference()
      .then((stored) => {
        if (cancelled) return;
        if (VALID_COLOR_MODES.has(stored)) {
          setColorModeState(stored);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener?.(({ colorScheme }) => {
      setSystemColorMode(colorScheme === 'dark' ? 'dark' : 'light');
    });

    return () => subscription?.remove?.();
  }, []);

  const resolvedColorMode = colorMode === 'system' ? systemColorMode : colorMode;

  // Push the resolved mode into the StyleSheet runtime synchronously during render
  // so that descendants reading `styles.x` getters in the same commit see the new theme.
  setRuntimeColorMode(resolvedColorMode);

  // Backup: re-assert after commit in case a concurrent-mode render was discarded
  // and a later branch overwrote the module-level holder with stale state.
  useLayoutEffect(() => {
    setRuntimeColorMode(resolvedColorMode);
  }, [resolvedColorMode]);

  const setColorMode = useCallback((nextMode) => {
    const next = normalize(nextMode, null);
    if (!next) return;

    setColorModeState(next);
    void setColorModePreference(next).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      colorMode,
      resolvedColorMode,
      setColorMode,
      systemColorMode,
      hydrated,
    }),
    [colorMode, resolvedColorMode, setColorMode, systemColorMode, hydrated],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
