import { useTheme } from '../ThemeContext.js';

// Native uses ThemeContext as the single source of truth for color mode so
// toggling from RnwMainAppShell propagates through the context and updates
// the StyleSheet runtime + AsyncStorage preference in one place.
export function useColorMode() {
  const { colorMode, resolvedColorMode, setColorMode, systemColorMode } = useTheme();

  return {
    colorMode,
    resolvedColorMode,
    setColorMode,
    systemColorMode,
  };
}
