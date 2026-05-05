import { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';

import { RnwApp } from './RnwApp.jsx';
import { getActiveTheme } from './theme.js';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'Pretendard GOV Variable': require('../assets/fonts/PretendardGOV-Regular.otf'),
    'PretendardGOV-Medium': require('../assets/fonts/PretendardGOV-Medium.otf'),
    'PretendardGOV-SemiBold': require('../assets/fonts/PretendardGOV-SemiBold.otf'),
    'PretendardGOV-Bold': require('../assets/fonts/PretendardGOV-Bold.otf'),
    MaterialSymbolsRounded: require('../assets/fonts/MaterialSymbolsRounded.ttf'),
    'MaterialIconsRound-Regular': require('../assets/fonts/MaterialIconsRound-Regular.otf'),
  });

  const [statusBarStyle, setStatusBarStyle] = useState(() =>
    getActiveTheme()['color-bg-app'] === '#020617' ? 'light-content' : 'dark-content',
  );

  useEffect(() => {
    setStatusBarStyle(
      getActiveTheme()['color-bg-app'] === '#020617' ? 'light-content' : 'dark-content',
    );
  }, []);

  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaProvider>
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={statusBarStyle} />
      <View style={styles.container}>
        <RnwApp />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: getActiveTheme()['color-bg-app'],
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: getActiveTheme()['color-bg-app'],
  },
});
