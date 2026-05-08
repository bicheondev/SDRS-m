import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

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
      colors={isDark ? ['#0f172a', '#0f172a', '#020617'] : ['#f3f7fd', '#edf3fa', '#dde6f2']}
      locations={isDark ? [0, 0.3, 1] : [0, 0.24, 1]}
      pointerEvents="none"
      style={[screenLayoutStyles.appShellGradient, style]}
    />
  );
}

export function AppScreenShell({ children, shellStyle, screenStyle }) {
  useTheme();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const screenWidth = getScreenWidthForViewport(viewportWidth);
  const screenHeight = viewportHeight;

  return (
    <View
      style={[
        screenLayoutStyles.appShell,
        {
          width: viewportWidth,
          height: viewportHeight,
          minHeight: viewportHeight,
          padding: 0,
          justifyContent: 'flex-start',
        },
        shellStyle,
      ]}
    >
      <AppShellGradient />
      <View
        style={[
          screenLayoutStyles.phoneScreen,
          {
            width: screenWidth,
            height: screenHeight,
            minHeight: screenHeight,
          },
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
  },
  appShellCompact: {
    padding: 0,
  },
  phoneScreen: {
    position: 'relative',
    backgroundColor: 'var(--color-bg-screen)',
    overflow: 'hidden',
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
    lineHeight: 33.8,
    fontWeight: '600',
    letterSpacing: -0.78,
  },
  subpageTitle: {
    paddingTop: 77,
  },
});
