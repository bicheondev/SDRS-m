import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../ThemeContext.js';
import { AppIcon } from '../../components/Icons.jsx';
import { interactiveStyles, getInteractiveScale } from '../../components/interactiveStyles.js';
import { InteractivePressable } from '../../components/primitives/InteractivePressable.jsx';
import { AppText as Text } from '../../components/primitives/AppTypography.jsx';

export function MenuSubpageTopBar({ title, onBack }) {
  useTheme();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 0);

  return (
    <>
      <View style={[styles.topBar, { height: 64 + topInset, paddingTop: topInset }]}>
        <InteractivePressable
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
          onPress={onBack}
          pressGuideColor="var(--slate-50)"
          pressGuideVariant="icon"
          style={({ focused, pressed }) => [
            interactiveStyles.base,
            styles.backButton,
            focused && interactiveStyles.focus,
            { transform: [{ scale: pressed ? getInteractiveScale('icon') : 1 }] },
          ]}
        >
          <AppIcon
            name="arrow_back_ios_new"
            preset="iosArrow"
            tone="secondary"
            weight={700}
          />
        </InteractivePressable>
      </View>
      <Text style={[styles.title, { paddingTop: 77 + topInset }]}>{title}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    width: '100%',
    height: 64,
    paddingHorizontal: 18,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  backButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    margin: 0,
    paddingTop: 77,
    paddingHorizontal: 18,
    color: 'var(--slate-700)',
    fontSize: 26,
    fontWeight: '600',
  },
});
