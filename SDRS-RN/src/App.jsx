import { ActivityIndicator, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';

import { RnwApp } from './RnwApp.jsx';
import { ThemeProvider, useTheme } from './ThemeContext.js';
import { themes } from './theme.js';

const MATERIAL_SYMBOLS_ROUNDED_FONT = require('../assets/fonts/MaterialSymbolsRounded.ttf');
const MATERIAL_ICONS_ROUND_FONT = require('../assets/fonts/MaterialIconsRound-Regular.otf');

const WEB_FONT_SMOOTHING_STYLE = Platform.OS === 'web'
  ? { WebkitFontSmoothing: 'antialiased' }
  : null;

function AppShell() {
  const { resolvedColorMode, hydrated } = useTheme();
  const theme = themes[resolvedColorMode] ?? themes.light;
  const barStyle = resolvedColorMode === 'dark' ? 'light-content' : 'dark-content';

  const [fontsLoaded] = useFonts({
    'Pretendard GOV Variable': require('../assets/fonts/PretendardGOV-Regular.otf'),
    'PretendardGOV-Regular': require('../assets/fonts/PretendardGOV-Regular.otf'),
    'PretendardGOV-Medium': require('../assets/fonts/PretendardGOV-Medium.otf'),
    'PretendardGOV-SemiBold': require('../assets/fonts/PretendardGOV-SemiBold.otf'),
    'PretendardGOV-Bold': require('../assets/fonts/PretendardGOV-Bold.otf'),
    MaterialSymbolsRounded: MATERIAL_SYMBOLS_ROUNDED_FONT,
    'Material Symbols Rounded Filled 48pt': MATERIAL_SYMBOLS_ROUNDED_FONT,
    'MaterialSymbolsRoundedFilled48pt-Regular': MATERIAL_SYMBOLS_ROUNDED_FONT,
    'MaterialIconsRound-Regular': MATERIAL_ICONS_ROUND_FONT,
    'Material Icons Round': MATERIAL_ICONS_ROUND_FONT,
  });

  // Wait for both fonts and the persisted preference hydration before rendering
  // the tree. AsyncStorage usually resolves before fonts finish unpacking, so this
  // adds no extra splash latency; it just guarantees zero flash of unstyled theme.
  const ready = fontsLoaded && hydrated;

  if (!ready) {
    return (
      <View style={[styles.loading, { backgroundColor: theme['color-bg-app'] }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar backgroundColor="transparent" barStyle={barStyle} translucent />
      <View style={[styles.container, { backgroundColor: theme['color-bg-app'] }]}>
        <RnwApp />
      </View>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={[styles.root, WEB_FONT_SMOOTHING_STYLE]}>
      <SafeAreaProvider>
        <ThemeProvider initialMode="system">
          <AppShell />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
