import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '../Icons.jsx';
import { interactiveStyles, getInteractiveScale } from '../interactiveStyles.js';
import { InteractivePressable } from '../primitives/InteractivePressable.jsx';
import { AppText as Text } from '../primitives/AppTypography.jsx';

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

function BottomTab({ activeTab = 'db', onDbClick, onManageClick, onMenuClick }) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 0);

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.shell, { height: 84 + bottomInset, paddingBottom: bottomInset }]}
    >
      <View className="bottom-tab__backdrop" style={[styles.backdrop, styles.pointerEventsNone]} />
      <BottomTabButton
        active={activeTab === 'db'}
        label="DB"
        name="data_table"
        onPress={onDbClick}
        tone={activeTab === 'db' ? 'blue-500' : 'slate-400'}
      />
      <BottomTabButton
        active={activeTab === 'manage'}
        label="데이터 관리"
        name="database"
        onPress={onManageClick}
        tone={activeTab === 'manage' ? 'blue-500' : 'slate-400'}
      />
      <BottomTabButton
        active={activeTab === 'menu'}
        label="메뉴"
        name="dehaze"
        onPress={onMenuClick}
        tone={activeTab === 'menu' ? 'blue-500' : 'slate-400'}
      />
    </View>
  );
}

export default memo(BottomTab);

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 84,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 18,
    zIndex: 4,
    overflow: 'hidden',
    isolation: 'isolate',
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
    color: 'var(--blue-500)',
  },
  label: {
    color: 'var(--color-text-tertiary)',
    fontSize: 11,
    lineHeight: 11,
    fontWeight: '600',
    letterSpacing: -0.11,
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  labelActive: {
    color: 'var(--blue-500)',
  },
});
