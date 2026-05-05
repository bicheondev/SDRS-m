import { StyleSheet, View } from 'react-native';

import MenuInfoLogo from '../../assets/ui/menuInfoLogo.svg';
import MenuInfoMark from '../../assets/ui/menuInfoMark.svg';
import { AppScreenShell, screenLayoutStyles } from '../../components/layout/ScreenLayout.jsx';
import { AppText as Text } from '../../components/primitives/AppTypography.jsx';
import { MenuSubpageTopBar } from './MenuShared.jsx';

export function MenuInfoPage({ onBack }) {
  return (
    <AppScreenShell screenStyle={screenLayoutStyles.screenColumn}>
        <MenuSubpageTopBar title="앱 정보" onBack={onBack} />

      <View style={styles.info}>
        <View style={[styles.background, styles.pointerEventsNone]} />
        <View style={styles.content}>
          <MenuInfoMark accessibilityLabel="" style={styles.mark} />
          <View style={styles.logoWrap}>
            <MenuInfoLogo
              accessibilityLabel="SDRS 선박DB조회체계"
              width={120}
              height={48}
              style={styles.logo}
            />
          </View>
          <Text style={styles.version}>버전 1.0</Text>
        </View>
      </View>
    </AppScreenShell>
  );
}

const styles = StyleSheet.create({
  info: {
    position: 'relative',
    flex: 1,
    marginTop: 28,
    overflow: 'hidden',
  },
  background: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'var(--color-bg-surface-muted)',
  },
  pointerEventsNone: {
    pointerEvents: 'none',
  },
  content: {
    position: 'relative',
    alignSelf: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 36,
    width: 233,
    marginTop: 94,
  },
  mark: {
    width: 73.901,
    height: 64,
  },
  logoWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 48,
  },
  version: {
    margin: 0,
    color: 'var(--color-text-muted)',
    fontSize: 15,
    lineHeight: 15,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
});
