import { Appearance } from 'react-native';
import { useEffect, useState } from 'react';

function getAppearanceColorMode() {
  return Appearance.getColorScheme?.() === 'dark' ? 'dark' : 'light';
}

export function useColorMode(initialMode = 'light') {
  const [colorMode, setColorMode] = useState(initialMode);
  const [systemColorMode, setSystemColorMode] = useState(getAppearanceColorMode);

  const resolvedColorMode = colorMode === 'system' ? systemColorMode : colorMode;

  useEffect(() => {
    const subscription = Appearance.addChangeListener?.(({ colorScheme }) => {
      setSystemColorMode(colorScheme === 'dark' ? 'dark' : 'light');
    });

    setSystemColorMode(getAppearanceColorMode());

    return () => {
      subscription?.remove?.();
    };
  }, []);

  return {
    colorMode,
    resolvedColorMode,
    setColorMode,
    systemColorMode,
  };
}
