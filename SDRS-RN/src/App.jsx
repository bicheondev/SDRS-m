import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';

import { RnwApp } from './RnwApp.jsx';
import { ThemeProvider, useTheme } from './ThemeContext.js';
import { themes } from './theme.js';

function AppShell() {
  const { resolvedColorMode, hydrated } = useTheme();
  const theme = themes[resolvedColorMode] ?? themes.light;
  const barStyle = resolvedColorMode === 'dark' ? 'light-content' : 'dark-content';

  const [fontsLoaded, fontError] = useFonts({
    'Pretendard GOV Variable': require('../assets/fonts/PretendardGOV-Regular.otf'),
    'PretendardGOV-Medium': require('../assets/fonts/PretendardGOV-Medium.otf'),
    'PretendardGOV-SemiBold': require('../assets/fonts/PretendardGOV-SemiBold.otf'),
    'PretendardGOV-Bold': require('../assets/fonts/PretendardGOV-Bold.otf'),
    MaterialSymbolsRounded: require('../assets/fonts/MaterialSymbolsRounded.ttf'),
    'MaterialIconsRound-Regular': require('../assets/fonts/MaterialIconsRound-Regular.otf'),
  });

  // Wait for both fonts and the persisted preference hydration before rendering
  // the tree. AsyncStorage usually resolves before fonts finish unpacking, so this
  // adds no extra splash latency; it just guarantees zero flash of unstyled theme.
  const ready = (fontsLoaded || fontError) && hydrated;

  if (!ready) {
    return (
      <View style={[styles.loading, { backgroundColor: theme['color-bg-app'] }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={barStyle} />
      <View style={[styles.container, { backgroundColor: theme['color-bg-app'] }]}>
        <RnwApp />
      </View>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider initialMode="system">
        <AppShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
