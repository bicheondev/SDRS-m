import { memo } from 'react';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
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
      onPress={onPress}
      pressGuideInset="-4px -8px"
      pressGuideVariant="tab"
      style={({ focused, pressed }) => [
        interactiveStyles.base,
        styles.item,
        styles.itemColumn,
        active ? styles.itemActive : styles.itemInactive,
        focused && interactiveStyles.focus,
        { transform: [{ scale: pressed ? getInteractiveScale('button') : 1 }] },
      ]}
    >
      <AppIcon name={name} preset="tab" style={styles.icon} tone={tone} />
      <Text
        numberOfLines={1}
        style={[styles.label, active && styles.labelActive]}
      >
        {label}
      </Text>
    </InteractivePressable>
  );
}

function BottomTab({
  activeTab = 'db',
  blurred = false,
  blurTargetRef,
  contained = false,
  onDbClick,
  onManageClick,
  onMenuClick,
  style,
}) {
  const { resolvedColorMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const bottomInset = Math.max(insets.bottom, 0);
  const tabWidth = getScreenWidthForViewport(viewportWidth);
  const tabLeft = contained ? 0 : (viewportWidth - tabWidth) / 2;
  const itemTotalWidth = 70 * 3;
  const itemGap = Math.min(70, Math.max(0, (tabWidth - itemTotalWidth) / 4));
  const isDark = resolvedColorMode === 'dark';
  const blurTint = isDark ? 'dark' : 'default';
  const canTargetBlur = Platform.OS !== 'web' && blurTargetRef;
  const blurModeKey = canTargetBlur ? 'targeted' : 'fallback';
  const nativeBlurProps = blurred && canTargetBlur
    ? {
        blurMethod: 'dimezisBlurViewSdk31Plus',
        blurReductionFactor: 3,
        blurTarget: blurTargetRef,
      }
    : null;

  return (
    <View
      style={[
        styles.shell,
        blurred ? styles.pointerEventsBoxNone : styles.pointerEventsAuto,
        {
          left: tabLeft,
          width: tabWidth,
          height: 84 + bottomInset,
          paddingBottom: bottomInset,
          gap: itemGap,
          flexDirection: 'row',
        },
        style,
      ]}
    >
      <View
        style={[
          styles.backdrop,
          blurred ? styles.backdropBlurred : styles.backdropNormal,
          styles.pointerEventsNone,
        ]}
      >
        {blurred ? (
          <BlurView
            key={`bottom-tab-${blurModeKey}`}
            {...nativeBlurProps}
            intensity={52}
            style={[styles.backdropBlur, styles.pointerEventsNone]}
            tint={blurTint}
          />
        ) : null}
        {blurred ? (
          <>
            <View style={[styles.backdropFill, styles.backdropFillBlurred]} />
            <View style={[styles.backdropStroke, styles.backdropStrokeBlurred]} />
          </>
        ) : null}
      </View>
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
    overflow: 'hidden',
  },
  backdropNormal: {
    borderWidth: 1,
    borderColor: 'var(--color-border-subtle)',
    backgroundColor: 'var(--color-bg-tab)',
  },
  backdropBlurred: {
    backgroundColor: 'transparent',
  },
  backdropBlur: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  backdropFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'var(--color-bg-tab)',
  },
  backdropFillBlurred: {
    backgroundColor: 'var(--color-bg-tab-blur)',
  },
  backdropStroke: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 1,
    backgroundColor: 'var(--color-border-subtle)',
  },
  backdropStrokeBlurred: {
    backgroundColor: 'var(--color-border-tab-blur)',
  },
  pointerEventsNone: {
    pointerEvents: 'none',
  },
  pointerEventsBoxNone: {
    pointerEvents: 'box-none',
  },
  pointerEventsAuto: {
    pointerEvents: 'auto',
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
    paddingHorizontal: 0,
    gap: 4,
    borderWidth: 0,
    backgroundColor: 'transparent',
    opacity: 1,
    position: 'relative',
    zIndex: 1,
  },
  itemColumn: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  itemInactive: {
    color: 'var(--color-text-tertiary)',
  },
  itemActive: {
    color: 'var(--color-accent)',
  },
  icon: {
    height: 24,
  },
  label: {
    width: 70,
    flexShrink: 0,
    color: 'var(--color-text-tertiary)',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  labelActive: {
    color: 'var(--color-accent)',
  },
});
