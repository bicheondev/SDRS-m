import { Appearance } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

import {
  getPreferredColorScheme,
  readLocalStorageValue,
  subscribePreferredColorScheme,
  writeLocalStorageValue,
} from '../platform/index';

const COLOR_MODE_STORAGE_KEY = 'sdrs:color-mode';
const VALID_COLOR_MODES = new Set(['system', 'light', 'dark']);

function normalizeColorMode(colorMode, fallback = 'light') {
  return VALID_COLOR_MODES.has(colorMode) ? colorMode : fallback;
}

function getSystemColorMode() {
  return getPreferredColorScheme() ?? (Appearance.getColorScheme?.() === 'dark' ? 'dark' : 'light');
}

function getStoredColorMode(initialMode) {
  return normalizeColorMode(readLocalStorageValue(COLOR_MODE_STORAGE_KEY), initialMode);
}

export function useColorMode(initialMode = 'light') {
  const [colorMode, setColorModeState] = useState(() => getStoredColorMode(initialMode));
  const [systemColorMode, setSystemColorMode] = useState(getSystemColorMode);

  const resolvedColorMode = colorMode === 'system' ? systemColorMode : colorMode;

  useEffect(() => {
    const updateSystemColorMode = (colorScheme) => {
      if (colorScheme !== 'dark' && colorScheme !== 'light') {
        setSystemColorMode(getSystemColorMode());
        return;
      }

      setSystemColorMode(colorScheme === 'dark' ? 'dark' : 'light');
    };

    updateSystemColorMode(getSystemColorMode());
    const cleanupMatchMedia = subscribePreferredColorScheme(updateSystemColorMode);

    const subscription = Appearance.addChangeListener?.(({ colorScheme }) => {
      updateSystemColorMode(colorScheme);
    });

    return () => {
      cleanupMatchMedia?.();
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    writeLocalStorageValue(COLOR_MODE_STORAGE_KEY, colorMode);
  }, [colorMode]);

  const setColorMode = useCallback((nextColorMode) => {
    setColorModeState(normalizeColorMode(nextColorMode));
  }, []);

  return {
    colorMode,
    resolvedColorMode,
    setColorMode,
    systemColorMode,
  };
}
