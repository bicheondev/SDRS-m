import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useTheme } from '../../ThemeContext.js';

export const SCREEN_WIDTH = 390;
export const SCREEN_HEIGHT = 844;

export function getScreenWidthForViewport(viewportWidth) {
  return Math.min(viewportWidth, SCREEN_WIDTH);
}

export function useCompactViewport() {
  return useWindowDimensions().width <= 480;
}

export function AppScreenShell({ children, shellStyle, screenStyle }) {
  useTheme();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const isCompactViewport = useCompactViewport();
  const screenWidth = getScreenWidthForViewport(viewportWidth);
  const screenHeight = isCompactViewport
    ? viewportHeight
    : Math.min(Math.max(viewportHeight - 40, 1), SCREEN_HEIGHT);

  return (
    <View
      style={[
        screenLayoutStyles.appShell,
        {
          width: viewportWidth,
          height: viewportHeight,
          minHeight: viewportHeight,
          padding: isCompactViewport ? 0 : 20,
          justifyContent: isCompactViewport ? 'flex-start' : 'center',
        },
        shellStyle,
      ]}
    >
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
    alignItems: 'center',
    backgroundColor: 'var(--color-bg-app)',
  },
  appShellCompact: {
    padding: 0,
  },
  phoneScreen: {
    position: 'relative',
    backgroundColor: 'var(--color-bg-screen)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-screen)',
  },
  phoneScreenCompact: {
    width: '100%',
    boxShadow: 'none',
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
