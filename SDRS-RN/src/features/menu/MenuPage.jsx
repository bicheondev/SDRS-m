import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../ThemeContext.js';
import { colorModeLabels } from '../../assets/assets.js';
import { AppIcon } from '../../components/Icons.jsx';
import { interactiveStyles, getInteractiveScale } from '../../components/interactiveStyles.js';
import { AppScreenShell, screenLayoutStyles } from '../../components/layout/ScreenLayout.jsx';
import { InteractivePressable } from '../../components/primitives/InteractivePressable.jsx';
import { AppText as Text } from '../../components/primitives/AppTypography.jsx';

function MenuRow({ children, detail, onPress, showArrow = false }) {
  return (
    <InteractivePressable
      accessibilityRole="button"
      className="menu-row pressable-control pressable-control--surface"
      onPress={onPress}
      pressGuideVariant="row"
      style={({ focused, pressed }) => [
        interactiveStyles.base,
        styles.row,
        focused && interactiveStyles.focus,
        { transform: [{ scale: pressed ? getInteractiveScale('row') : 1 }] },
      ]}
    >
      <Text style={styles.rowLabel}>{children}</Text>
      {detail || showArrow ? (
        <View style={styles.detailGroup}>
          {detail ? <Text style={styles.detailText}>{detail}</Text> : null}
          <AppIcon
            className="menu-row__arrow"
            name="arrow_forward_ios"
            preset="iosArrow"
            tone="muted"
          />
        </View>
      ) : null}
    </InteractivePressable>
  );
}

export function MenuPage({ colorMode, onColorModeOpen, onInfoOpen, onLogout }) {
  useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 0);
  return (
    <AppScreenShell screenStyle={screenLayoutStyles.screenColumn}>
      <Text style={screenLayoutStyles.title}>메뉴</Text>

      <View style={[styles.content, { paddingBottom: 24 + bottomInset }]}>
        <MenuRow detail={colorModeLabels[colorMode]} onPress={onColorModeOpen}>
            화면 모드
          </MenuRow>

        <View style={styles.divider} />

        <View style={styles.group}>
          <MenuRow showArrow onPress={onInfoOpen}>
            앱 정보
          </MenuRow>
          <MenuRow onPress={onLogout}>로그아웃</MenuRow>
        </View>
      </View>
    </AppScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    paddingTop: 28,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
  },
  divider: {
    height: 16,
    backgroundColor: 'var(--color-bg-divider)',
  },
  row: {
    width: '100%',
    minHeight: 52,
    paddingVertical: 16,
    paddingHorizontal: 24,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  rowLabel: {
    color: 'var(--slate-500)',
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.36,
  },
  detailGroup: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    color: 'var(--color-text-tertiary)',
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: -0.36,
  },
});
