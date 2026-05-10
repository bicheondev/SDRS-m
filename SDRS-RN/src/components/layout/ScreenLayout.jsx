import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useTheme } from '../../ThemeContext.js';

export const SCREEN_WIDTH = 390;
export const SCREEN_HEIGHT = 844;

export function getScreenWidthForViewport(viewportWidth) {
  return viewportWidth;
}

export function useCompactViewport() {
  return useWindowDimensions().width <= 480;
}

export function AppShellGradient({ style }) {
  const { resolvedColorMode } = useTheme();
  const isDark = resolvedColorMode === 'dark';

  return (
    <LinearGradient
      colors={isDark ? ['#0f172a', '#0f172a', '#020617'] : ['#ffffff', '#ffffff']}
      locations={isDark ? [0, 0.3, 1] : [0, 1]}
      style={[screenLayoutStyles.appShellGradient, style]}
    />
  );
}

export function AppScreenShell({ children, shellStyle, screenStyle }) {
  useTheme();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const screenWidth = getScreenWidthForViewport(viewportWidth);
  const screenHeight = viewportHeight;
  const shellExtentStyle = Platform.OS === 'web'
    ? { height: screenHeight, minHeight: screenHeight }
    : { flex: 1, minHeight: 0 };
  const screenExtentStyle = Platform.OS === 'web'
    ? { height: screenHeight, minHeight: screenHeight }
    : { flex: 1, minHeight: 0 };

  return (
    <View
      style={[
        screenLayoutStyles.appShell,
        {
          width: viewportWidth,
          padding: 0,
          justifyContent: 'flex-start',
        },
        shellExtentStyle,
        shellStyle,
      ]}
    >
      <AppShellGradient />
      <View
        style={[
          screenLayoutStyles.phoneScreen,
          {
            width: screenWidth,
          },
          screenExtentStyle,
          screenStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export const screenLayoutStyles = StyleSheet.create({
  appShell: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    backgroundColor: 'var(--color-bg-app)',
    overflow: 'hidden',
  },
  appShellGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: 'none',
  },
  appShellCompact: {
    padding: 0,
  },
  phoneScreen: {
    position: 'relative',
    backgroundColor: 'var(--color-bg-screen)',
    overflow: 'hidden',
  },
  bottomSafeAreaFill: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'var(--color-bg-screen)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  phoneScreenCompact: {
    width: '100%',
  },
  screenColumn: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--color-bg-screen)',
  },
  title: {
    margin: 0,
    paddingTop: 77,
    paddingHorizontal: 18,
    color: 'var(--slate-700)',
    fontSize: 26,
    fontWeight: '600',
  },
  subpageTitle: {
    paddingTop: 77,
  },
});
