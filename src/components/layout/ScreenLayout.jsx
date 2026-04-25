import { StyleSheet, useWindowDimensions, View } from 'react-native';

export function useCompactViewport() {
  return useWindowDimensions().width <= 480;
}

export function AppScreenShell({ children, shellStyle, screenStyle }) {
  const isCompactViewport = useCompactViewport();

  return (
    <View
      style={[
        screenLayoutStyles.appShell,
        isCompactViewport && screenLayoutStyles.appShellCompact,
        shellStyle,
      ]}
    >
      <View
        style={[
          screenLayoutStyles.phoneScreen,
          isCompactViewport && screenLayoutStyles.phoneScreenCompact,
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
    width: '100%',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'var(--color-bg-app)',
    backgroundImage: 'var(--gradient-app-shell)',
  },
  appShellCompact: {
    minHeight: '100dvh',
    height: '100dvh',
    display: 'block',
    padding: 0,
  },
  phoneScreen: {
    position: 'relative',
    width: 'min(100%, var(--screen-width))',
    minHeight: 'min(calc(100dvh - 40px), var(--screen-height))',
    height: 'min(calc(100dvh - 40px), var(--screen-height))',
    backgroundColor: 'var(--color-bg-screen)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-screen)',
  },
  phoneScreenCompact: {
    width: '100%',
    minHeight: '100dvh',
    height: '100dvh',
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
