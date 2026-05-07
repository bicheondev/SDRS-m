import { memo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../ThemeContext.js';
import { AppIcon } from '../Icons.jsx';
import { interactiveStyles, getInteractiveScale } from '../interactiveStyles.js';
import { InteractivePressable } from '../primitives/InteractivePressable.jsx';
import { AppText as Text } from '../primitives/AppTypography.jsx';
import { getScreenWidthForViewport } from './ScreenLayout.jsx';

function BottomTabButton({ active, label, name, onPress, tone }) {
  return (
    <InteractivePressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`bottom-tab__item pressable-control pressable-control--tab ${
        active ? 'bottom-tab__item--active' : ''
      }`.trim()}
      onPress={onPress}
      pressGuideInset="-4px -8px"
      pressGuideVariant="tab"
      style={({ focused, pressed }) => [
        interactiveStyles.base,
        styles.item,
        active ? styles.itemActive : styles.itemInactive,
        focused && interactiveStyles.focus,
        { transform: [{ scale: pressed ? getInteractiveScale('button') : 1 }] },
      ]}
    >
      <AppIcon className="bottom-tab__icon" name={name} preset="tab" tone={tone} />
      <Text
        className="bottom-tab__label"
        numberOfLines={1}
        style={[styles.label, active && styles.labelActive]}
      >
        {label}
      </Text>
    </InteractivePressable>
  );
}

function BottomTab({ activeTab = 'db', contained = false, onDbClick, onManageClick, onMenuClick }) {
  useTheme();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const bottomInset = Math.max(insets.bottom, 0);
  const tabWidth = getScreenWidthForViewport(viewportWidth);
  const tabLeft = contained ? 0 : (viewportWidth - tabWidth) / 2;
  const itemTotalWidth = 70 * 3;
  const itemGap = Math.min(70, Math.max(0, (tabWidth - itemTotalWidth) / 4));

  return (
    <View
      style={[
        styles.shell,
        {
          left: tabLeft,
          width: tabWidth,
          height: 84 + bottomInset,
          paddingBottom: bottomInset,
          gap: itemGap,
        },
      ]}
    >
      <View className="bottom-tab__backdrop" style={[styles.backdrop, styles.pointerEventsNone]} />
      <BottomTabButton
        active={activeTab === 'db'}
        label="DB"
        name="data_table"
        onPress={onDbClick}
        tone={activeTab === 'db' ? 'accent' : 'muted'}
      />
      <BottomTabButton
        active={activeTab === 'manage'}
        label="데이터 관리"
        name="database"
        onPress={onManageClick}
        tone={activeTab === 'manage' ? 'accent' : 'muted'}
      />
      <BottomTabButton
        active={activeTab === 'menu'}
        label="메뉴"
        name="dehaze"
        onPress={onMenuClick}
        tone={activeTab === 'menu' ? 'accent' : 'muted'}
      />
    </View>
  );
}

export default memo(BottomTab);

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 84,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 8,
    zIndex: 4,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 1,
    borderColor: 'var(--color-border-subtle)',
    backgroundColor: 'var(--color-bg-tab)',
  },
  pointerEventsNone: {
    pointerEvents: 'none',
  },
  item: {
    alignSelf: 'flex-start',
    display: 'flex',
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    minWidth: 70,
    minHeight: 44,
    height: 44,
    paddingVertical: 0,
    paddingHorizontal: 12,
    gap: 4,
    borderWidth: 0,
    backgroundColor: 'transparent',
    opacity: 1,
    position: 'relative',
    zIndex: 1,
  },
  itemInactive: {
    color: 'var(--color-text-tertiary)',
  },
  itemActive: {
    color: 'var(--color-accent)',
  },
  label: {
    color: 'var(--color-text-tertiary)',
    fontSize: 11,
    lineHeight: 11,
    fontWeight: '600',
    letterSpacing: -0.11,
    textAlign: 'center',
  },
  labelActive: {
    color: 'var(--color-accent)',
  },
});
