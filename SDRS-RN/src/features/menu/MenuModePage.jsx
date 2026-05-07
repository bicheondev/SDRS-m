import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../ThemeContext.js';
import { AppIcon } from '../../components/Icons.jsx';
import { interactiveStyles, getInteractiveScale } from '../../components/interactiveStyles.js';
import { AppScreenShell, screenLayoutStyles } from '../../components/layout/ScreenLayout.jsx';
import { InteractivePressable } from '../../components/primitives/InteractivePressable.jsx';
import { AppText as Text } from '../../components/primitives/AppTypography.jsx';
import { MenuSubpageTopBar } from './MenuShared.jsx';

export function MenuModePage({ colorMode, onBack, onSelectMode }) {
  useTheme();
  const modeOptions = [
    { value: 'system', label: '시스템 설정' },
    { value: 'light', label: '라이트' },
    { value: 'dark', label: '다크' },
  ];

  return (
    <AppScreenShell screenStyle={screenLayoutStyles.screenColumn}>
        <MenuSubpageTopBar title="화면 모드" onBack={onBack} />

      <View style={styles.section}>
          {modeOptions.map((modeOption) => (
            <InteractivePressable
              key={modeOption.value}
              accessibilityRole="button"
              className="menu-subpage__row menu-subpage__row--button pressable-control pressable-control--surface"
              onPress={() => onSelectMode(modeOption.value)}
              pressGuideVariant="row"
              style={({ focused, pressed }) => [
                interactiveStyles.base,
                styles.row,
                focused && interactiveStyles.focus,
                { transform: [{ scale: pressed ? getInteractiveScale('row') : 1 }] },
              ]}
            >
              <Text style={styles.label}>{modeOption.label}</Text>
              {colorMode === modeOption.value ? (
                <AppIcon
                  className="menu-subpage__check"
                  name="check"
                  preset="checkbox"
                  tone="accent"
                />
              ) : null}
            </InteractivePressable>
          ))}
      </View>
    </AppScreenShell>
  );
}

const styles = StyleSheet.create({
  section: {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 28,
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
  label: {
    color: 'var(--slate-500)',
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.36,
  },
});
