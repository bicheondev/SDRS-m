import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../ThemeContext.js';
import { AppIcon } from '../../components/Icons.jsx';
import { AppText as Text, AppTextInput as TextInput } from '../../components/primitives/AppTypography.jsx';
import { InteractivePressable } from '../../components/primitives/InteractivePressable.jsx';
import { interactiveStyles, getInteractiveScale } from '../../components/interactiveStyles.js';
import Logo from '../../assets/ui/logo';
import { resolveCssVariableString } from '../../theme.js';
import { motionDurationsMs, motionTokens } from '../../motion.js';
import { keepAllWordBreakText } from '../../utils/text.js';

const IOS_EASING = Easing.bezier(...motionTokens.ease.ios);
const filterLabelNoWrapStyle = Platform.OS === 'web'
  ? { whiteSpace: 'nowrap', wordBreak: 'keep-all' }
  : null;
const IS_ANDROID = Platform.OS === 'android';
const TOP_BAR_FROST_MASK =
  'linear-gradient(180deg, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 1) 52%, rgb(0 0 0 / 0.78) 72%, rgb(0 0 0 / 0) 100%)';
const FILTERS_FROST_MASK =
  'linear-gradient(180deg, rgb(0 0 0 / 0) 0%, rgb(0 0 0 / 0.94) 24%, rgb(0 0 0 / 0.9) 74%, rgb(0 0 0 / 0) 100%)';
const WEB_TOP_BAR_SHELL_STYLE = Platform.OS === 'web'
  ? {
      backfaceVisibility: 'hidden',
      isolation: 'isolate',
      WebkitBackfaceVisibility: 'hidden',
    }
  : null;
const WEB_TOP_BAR_FROST_STYLE = Platform.OS === 'web'
  ? {
      backdropFilter: 'blur(22px) saturate(160%)',
      maskImage: TOP_BAR_FROST_MASK,
      WebkitBackdropFilter: 'blur(22px) saturate(160%)',
      WebkitMaskImage: TOP_BAR_FROST_MASK,
    }
  : null;
const WEB_FILTERS_FROST_STYLE = Platform.OS === 'web'
  ? {
      backdropFilter: 'blur(10px) saturate(145%)',
      maskImage: FILTERS_FROST_MASK,
      WebkitBackdropFilter: 'blur(10px) saturate(145%)',
      WebkitMaskImage: FILTERS_FROST_MASK,
    }
  : null;
const WEB_FILTER_SHEET_FROST_STYLE = Platform.OS === 'web'
  ? {
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
    }
  : null;
const TOP_BAR_BLUR_MASK_SEGMENTS = [
  { key: 'top-opaque', top: '0%', height: '52%', opacity: 1 },
  { key: 'top-52', top: '52%', height: '6%', opacity: 0.96 },
  { key: 'top-58', top: '58%', height: '6%', opacity: 0.88 },
  { key: 'top-64', top: '64%', height: '8%', opacity: 0.78 },
  { key: 'top-72', top: '72%', height: '7%', opacity: 0.62 },
  { key: 'top-79', top: '79%', height: '7%', opacity: 0.42 },
  { key: 'top-86', top: '86%', height: '6%', opacity: 0.24 },
  { key: 'top-92', top: '92%', height: '5%', opacity: 0.1 },
  { key: 'top-tail', top: '97%', bottom: 0, opacity: 0.03 },
];
const FILTERS_BLUR_MASK_SEGMENTS = [
  { key: 'filters-0', top: '0%', height: '6%', opacity: 0.06 },
  { key: 'filters-6', top: '6%', height: '6%', opacity: 0.28 },
  { key: 'filters-12', top: '12%', height: '6%', opacity: 0.56 },
  { key: 'filters-18', top: '18%', height: '6%', opacity: 0.84 },
  { key: 'filters-core', top: '24%', height: '50%', opacity: 0.9 },
  { key: 'filters-74', top: '74%', height: '6%', opacity: 0.76 },
  { key: 'filters-80', top: '80%', height: '6%', opacity: 0.56 },
  { key: 'filters-86', top: '86%', height: '6%', opacity: 0.34 },
  { key: 'filters-92', top: '92%', height: '5%', opacity: 0.14 },
  { key: 'filters-tail', top: '97%', bottom: 0, opacity: 0.04 },
];

function colorWithAlpha(color, alpha) {
  if (typeof color !== 'string') {
    return color;
  }

  const nextAlpha = Math.max(0, Math.min(1, alpha));
  const hexMatch = color.match(/^#([a-f0-9]{3}|[a-f0-9]{6})$/i);
  if (hexMatch) {
    const value = hexMatch[1];
    const expanded = value.length === 3
      ? value.split('').map((char) => `${char}${char}`).join('')
      : value;
    const r = Number.parseInt(expanded.slice(0, 2), 16);
    const g = Number.parseInt(expanded.slice(2, 4), 16);
    const b = Number.parseInt(expanded.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${nextAlpha})`;
  }

  const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const channels = rgbMatch[1]
      .split(',')
      .map((part) => Number.parseFloat(part.trim()))
      .filter((part) => Number.isFinite(part));

    if (channels.length >= 3) {
      return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${nextAlpha})`;
    }
  }

  return color;
}

function FadingBlur({ backgroundImage, blurModeKey, intensity, mode = 'top', nativeBlurProps, tint }) {
  const segments = mode === 'filters'
    ? FILTERS_BLUR_MASK_SEGMENTS
    : TOP_BAR_BLUR_MASK_SEGMENTS;
  const blurProps = nativeBlurProps ?? {};

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.blurFadeStack,
          mode === 'filters' ? WEB_FILTERS_FROST_STYLE : WEB_TOP_BAR_FROST_STYLE,
          { backgroundImage },
          styles.pointerEventsNone,
        ]}
      />
    );
  }

  return (
    <View style={[styles.blurFadeStack, styles.pointerEventsNone]}>
      {segments.map(({ key, ...segmentStyle }) => (
        <BlurView
          key={`${key}-${blurModeKey}`}
          {...blurProps}
          intensity={intensity}
          style={[styles.frostBlurSegment, segmentStyle, styles.pointerEventsNone]}
          tint={tint}
        />
      ))}
    </View>
  );
}

function FrostBackground({ blurTargetRef, filterSheet = false, topInset = 0 }) {
  const { resolvedColorMode } = useTheme();
  const isDark = resolvedColorMode === 'dark';
  const blurTint = isDark ? 'dark' : 'default';
  const canTargetBlur = Platform.OS !== 'web' && blurTargetRef;
  const blurModeKey = canTargetBlur ? 'targeted' : 'fallback';
  const nativeBlurProps = canTargetBlur
    ? {
        blurMethod: 'dimezisBlurView',
        blurReductionFactor: IS_ANDROID ? 1.5 : 2,
        blurTarget: blurTargetRef,
      }
    : null;
  const screenColor = resolveCssVariableString('var(--color-bg-screen)');

  if (IS_ANDROID) {
    const androidFrostHeight = Math.max(0, topInset) + (filterSheet ? 108 : 136);

    return (
      <View
        style={[
          styles.frostLayer,
          { bottom: undefined, height: androidFrostHeight },
          styles.pointerEventsNone,
        ]}
      >
        <FadingBlur
          backgroundImage=""
          blurModeKey={blurModeKey}
          intensity={54}
          nativeBlurProps={nativeBlurProps}
          tint={blurTint}
        />
        <LinearGradient
          colors={[
            colorWithAlpha(screenColor, 1),
            colorWithAlpha(screenColor, 0.98),
            colorWithAlpha(screenColor, 0.9),
            colorWithAlpha(screenColor, 0.68),
            colorWithAlpha(screenColor, 0.32),
            colorWithAlpha(screenColor, 0.08),
            colorWithAlpha(screenColor, 0),
          ]}
          locations={[0, 0.28, 0.5, 0.68, 0.82, 0.93, 1]}
          style={[styles.frostGradient, styles.pointerEventsNone]}
        />
      </View>
    );
  }

  const topFrostStart = colorWithAlpha(screenColor, 0.86);
  const topFrostMid = colorWithAlpha(screenColor, 0.78);
  const topFrostEnd = colorWithAlpha(screenColor, 0.1);
  const nativeTopFrostColors = IS_ANDROID
    ? [
        colorWithAlpha(screenColor, 1),
        colorWithAlpha(screenColor, 1),
        colorWithAlpha(screenColor, 0.92),
        colorWithAlpha(screenColor, 0.36),
        colorWithAlpha(screenColor, 0),
      ]
    : [
        colorWithAlpha(screenColor, 0.86),
        colorWithAlpha(screenColor, 0.86),
        colorWithAlpha(screenColor, 0.74),
        colorWithAlpha(screenColor, 0),
      ];
  const nativeTopFrostLocations = IS_ANDROID
    ? [0, 0.5, 0.68, 0.84, 1]
    : [0, 0.52, 0.72, 1];
  const filterFrostStart = colorWithAlpha(screenColor, isDark ? 0.4 : 0.34);
  const filterFrostMid = colorWithAlpha(screenColor, isDark ? 0.22 : 0.18);
  const filterFrostEnd = colorWithAlpha(screenColor, 0.04);
  const nativeFilterFrostColors = IS_ANDROID
    ? [
        colorWithAlpha(screenColor, isDark ? 0.42 : 0.52),
        colorWithAlpha(screenColor, isDark ? 0.64 : 0.78),
        colorWithAlpha(screenColor, isDark ? 0.48 : 0.68),
        colorWithAlpha(screenColor, isDark ? 0.16 : 0.22),
        colorWithAlpha(screenColor, 0),
      ]
    : [
        colorWithAlpha(screenColor, 0),
        colorWithAlpha(screenColor, isDark ? 0.4 : 0.34),
        colorWithAlpha(screenColor, isDark ? 0.22 : 0.18),
        colorWithAlpha(screenColor, 0),
      ];
  const nativeFilterFrostLocations = IS_ANDROID
    ? [0, 0.22, 0.6, 0.88, 1]
    : [0, 0.24, 0.74, 1];
  const filterBackdropTop = colorWithAlpha(screenColor, 1);
  const filterBackdropLow = colorWithAlpha(screenColor, 0.5);
  const topFrostGradient =
    `linear-gradient(180deg, ${topFrostStart} 0%, ${topFrostMid} 64%, ${topFrostEnd} 100%)`;
  const filterFrostGradient =
    `linear-gradient(180deg, ${filterFrostStart} 0%, ${filterFrostMid} 68%, ${filterFrostEnd} 100%)`;
  const filterBackdropGradient =
    `linear-gradient(180deg, ${filterBackdropTop} 0%, ${filterBackdropLow} 100%)`;
  const androidTopFrostStyle = IS_ANDROID
    ? { bottom: undefined, height: Math.max(0, topInset) + 72 }
    : null;
  const filtersFrostLayerStyle = IS_ANDROID
    ? { top: Math.max(0, topInset) + 64, height: 56 }
    : { top: Math.max(0, topInset) + 52 };

  return (
    <>
      <View
        style={[
          styles.frostLayer,
          androidTopFrostStyle,
          styles.pointerEventsNone,
        ]}
      >
        <FadingBlur
          backgroundImage={topFrostGradient}
          blurModeKey={blurModeKey}
          intensity={IS_ANDROID ? 46 : 82}
          nativeBlurProps={nativeBlurProps}
          tint={blurTint}
        />
        {Platform.OS === 'web' ? null : (
          <LinearGradient
            colors={nativeTopFrostColors}
            locations={nativeTopFrostLocations}
            style={[styles.frostGradient, styles.pointerEventsNone]}
          />
        )}
      </View>
      {filterSheet ? (
        <View style={[styles.filterSheetLayer, styles.pointerEventsNone]}>
          {Platform.OS === 'web' ? (
            <View
              key={`filter-sheet-frost-${blurModeKey}`}
              style={[
                styles.frostBlur,
                WEB_FILTER_SHEET_FROST_STYLE,
                { backgroundImage: filterBackdropGradient },
                styles.pointerEventsNone,
              ]}
            />
          ) : (
            <BlurView
              key={`filter-sheet-frost-${blurModeKey}`}
              {...(nativeBlurProps ?? {})}
              intensity={56}
              style={[styles.frostBlur, styles.pointerEventsNone]}
              tint={blurTint}
            />
          )}
          {Platform.OS === 'web' ? null : (
            <LinearGradient
              colors={[filterBackdropTop, filterBackdropLow]}
              locations={[0, 1]}
              style={[styles.frostGradient, styles.pointerEventsNone]}
            />
          )}
        </View>
      ) : null}
      {Platform.OS === 'web' ? null : (
        <View
          style={[
            styles.filtersFrostLayer,
            filtersFrostLayerStyle,
            styles.pointerEventsNone,
          ]}
        >
          <FadingBlur
            backgroundImage={filterFrostGradient}
            blurModeKey={blurModeKey}
            intensity={IS_ANDROID ? 18 : 40}
            mode="filters"
            nativeBlurProps={nativeBlurProps}
            tint={blurTint}
          />
          <LinearGradient
            colors={nativeFilterFrostColors}
            locations={nativeFilterFrostLocations}
            style={[styles.frostGradient, styles.pointerEventsNone]}
          />
        </View>
      )}
    </>
  );
}

function FilterButtonLabel({ children, numberOfLines = 1, onLayout, width }) {
  const widthValue = useSharedValue(width ?? 0);
  const hasWidth = typeof width === 'number' && width > 0;
  const hadMeasuredWidthRef = useRef(hasWidth);
  const lastWidthRef = useRef(width ?? 0);
  const displayedChildrenRef = useRef(children);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const commitDisplayedChildren = useCallback((nextChildren) => {
    displayedChildrenRef.current = nextChildren;
    setDisplayedChildren(nextChildren);
  }, []);

  useEffect(() => {
    if (!hasWidth) {
      hadMeasuredWidthRef.current = false;
      lastWidthRef.current = 0;
      commitDisplayedChildren(children);
      return;
    }

    if (!hadMeasuredWidthRef.current) {
      hadMeasuredWidthRef.current = true;
      lastWidthRef.current = width;
      widthValue.value = width;
      commitDisplayedChildren(children);
      return;
    }

    const previousWidth = lastWidthRef.current || width;
    const expanding = width > previousWidth + 0.5;
    const textChanged = displayedChildrenRef.current !== children;
    lastWidthRef.current = width;

    const timingConfig = {
      duration: motionDurationsMs.normal,
      easing: IOS_EASING,
    };

    if (expanding && textChanged) {
      widthValue.value = withTiming(width, timingConfig, (finished) => {
        if (finished) {
          runOnJS(commitDisplayedChildren)(children);
        }
      });
      return;
    }

    widthValue.value = withTiming(width, timingConfig);
    commitDisplayedChildren(children);
  }, [children, commitDisplayedChildren, hasWidth, width, widthValue]);

  const widthStyle = useAnimatedStyle(() => (
    hasWidth
      ? {
          width: widthValue.value,
        }
      : {}
  ));

  const label = (
    <Text
      ellipsizeMode={Platform.OS === 'web' ? undefined : 'clip'}
      numberOfLines={Platform.OS === 'web' ? undefined : numberOfLines}
      onLayout={onLayout}
      style={[
        styles.filterLabel,
        styles.pointerEventsNone,
        filterLabelNoWrapStyle,
        hasWidth && Platform.OS !== 'web' ? { width } : null,
      ]}
    >
      {keepAllWordBreakText(displayedChildren)}
    </Text>
  );

  if (!hasWidth) {
    return label;
  }

  return (
    <Animated.View style={[styles.filterLabelClip, styles.pointerEventsNone, widthStyle]}>
      {label}
    </Animated.View>
  );
}

export function FiltersRow({
  blurViewOptions = false,
  compact,
  containerStyle,
  harborLabel = '전체 항포구',
  harborButtonRef,
  harborLabelWidth,
  inFilterSheet = false,
  onHarborClick,
  onHarborLabelLayout,
  onToggleCompact,
  onVesselTypeClick,
  onVesselTypeLabelLayout,
  openState = 'closed',
  showFilterGroup = true,
  showFrost = true,
  showViewOptions = true,
  vesselTypeLabel = '전체 선박',
  vesselTypeButtonRef,
  vesselTypeLabelWidth,
}) {
  const { resolvedColorMode } = useTheme();
  const dropdownIconName = openState !== 'closed' ? 'keyboard_arrow_up' : 'keyboard_arrow_down';
  const isDark = resolvedColorMode === 'dark';
  const screenColor = resolveCssVariableString('var(--color-bg-screen)');
  const filterFrostStart = colorWithAlpha(screenColor, isDark ? 0.4 : 0.34);
  const filterFrostMid = colorWithAlpha(screenColor, isDark ? 0.22 : 0.18);
  const filterFrostEnd = colorWithAlpha(screenColor, 0.04);
  const filterFrostWebStyle = Platform.OS === 'web'
    ? {
        backgroundImage:
          `linear-gradient(180deg, ${filterFrostStart} 0%, ${filterFrostMid} 68%, ${filterFrostEnd} 100%)`,
      }
    : null;

  return (
    <View
      style={[
        styles.filters,
        inFilterSheet && styles.filtersInSheet,
        !showFilterGroup && showViewOptions && styles.filtersViewOnly,
        containerStyle,
      ]}
    >
      {showFrost ? (
        <View
          style={[
            styles.filtersFrost,
            WEB_FILTERS_FROST_STYLE,
            filterFrostWebStyle,
            styles.pointerEventsNone,
          ]}
        />
      ) : null}
      {showFilterGroup ? (
      <View style={[styles.filterGroup, inFilterSheet && styles.filterGroupInSheet]}>
        <InteractivePressable
          accessibilityRole="button"
          onPress={onHarborClick}
          pressGuideColor="var(--color-press-overlay-slate-100-50)"
          pressGuideVariant="pill"
          ref={harborButtonRef}
          style={({ focused, pressed }) => [
            interactiveStyles.base,
            styles.filterButton,
            styles.filterButtonRow,
            focused && interactiveStyles.focus,
            { transform: [{ scale: pressed ? getInteractiveScale('button') : 1 }] },
          ]}
        >
          <FilterButtonLabel
            onLayout={onHarborLabelLayout}
            width={harborLabelWidth}
          >
            {harborLabel}
          </FilterButtonLabel>
          <AppIcon
            name={dropdownIconName}
            preset="disclosure"
            style={styles.pointerEventsNone}
            tone="slate-400"
          />
        </InteractivePressable>

        <InteractivePressable
          accessibilityRole="button"
          onPress={onVesselTypeClick}
          pressGuideColor="var(--color-press-overlay-slate-100-50)"
          pressGuideVariant="pill"
          ref={vesselTypeButtonRef}
          style={({ focused, pressed }) => [
            interactiveStyles.base,
            styles.filterButton,
            styles.filterButtonRow,
            focused && interactiveStyles.focus,
            { transform: [{ scale: pressed ? getInteractiveScale('button') : 1 }] },
          ]}
        >
          <FilterButtonLabel
            onLayout={onVesselTypeLabelLayout}
            width={vesselTypeLabelWidth}
          >
            {vesselTypeLabel}
          </FilterButtonLabel>
          <AppIcon
            name={dropdownIconName}
            preset="disclosure"
            style={styles.pointerEventsNone}
            tone="slate-400"
          />
        </InteractivePressable>
      </View>
      ) : null}

      {showViewOptions ? (
      <View
        accessibilityLabel="보기 옵션"
        style={[
          styles.viewOptions,
          blurViewOptions && styles.viewOptionsBlurred,
          blurViewOptions ? styles.pointerEventsNone : styles.pointerEventsAuto,
        ]}
      >
        <InteractivePressable
          accessibilityLabel="요약 보기"
          accessibilityRole="button"
          onPress={() => onToggleCompact(true)}
          pressGuideColor="var(--color-press-overlay-slate-100-50)"
          pressGuideVariant="icon"
          style={({ focused, pressed }) => [
            interactiveStyles.base,
            styles.iconButton,
            focused && interactiveStyles.focus,
            { transform: [{ scale: pressed ? getInteractiveScale('icon') : 1 }] },
          ]}
        >
          <AppIcon
            name="event_list"
            preset="viewMode"
            tone={compact ? 'slate-500' : 'slate-300'}
          />
        </InteractivePressable>
        <InteractivePressable
          accessibilityLabel="카드 보기"
          accessibilityRole="button"
          onPress={() => onToggleCompact(false)}
          pressGuideColor="var(--color-press-overlay-slate-100-50)"
          pressGuideVariant="icon"
          style={({ focused, pressed }) => [
            interactiveStyles.base,
            styles.iconButton,
            focused && interactiveStyles.focus,
            { transform: [{ scale: pressed ? getInteractiveScale('icon') : 1 }] },
          ]}
        >
          <AppIcon
            name="view_stream"
            preset="viewMode"
            tone={compact ? 'slate-300' : 'slate-500'}
          />
        </InteractivePressable>
      </View>
      ) : null}
    </View>
  );
}

export const TopBar = memo(function TopBar({
  blurTargetRef,
  blurViewOptions = false,
  compact,
  harborFilter,
  harborButtonRef,
  harborLabelWidth,
  hidden,
  inFilterSheet = false,
  onHarborFilterOpen,
  onHarborLabelLayout,
  onSearchOpen,
  onToggleCompact,
  onVesselTypeFilterOpen,
  onVesselTypeLabelLayout,
  openState = 'closed',
  vesselTypeFilter,
  vesselTypeButtonRef,
  vesselTypeLabelWidth,
}) {
  useTheme();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 0);
  const barHeight = (inFilterSheet ? 108 : 136) + topInset;
  const hiddenProgress = useSharedValue(hidden ? 1 : 0);

  useEffect(() => {
    hiddenProgress.value = withTiming(hidden ? 1 : 0, {
      duration: motionDurationsMs.fast,
      easing: IOS_EASING,
    });
  }, [hidden, hiddenProgress]);

  const topBarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -barHeight * hiddenProgress.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.topBar,
        inFilterSheet && styles.topBarInSheet,
        WEB_TOP_BAR_SHELL_STYLE,
        { height: barHeight, paddingTop: topInset },
        topBarAnimatedStyle,
      ]}
    >
      <FrostBackground
        blurTargetRef={blurTargetRef}
        topInset={topInset}
      />

      <View
        style={[
          styles.topBarMain,
          inFilterSheet ? styles.pointerEventsNone : styles.pointerEventsAuto,
        ]}
      >
        <Logo accessibilityLabel="SDRS" width={62.637} height={18} style={styles.logo} />
        <InteractivePressable
          accessibilityLabel="검색"
          accessibilityRole="button"
          onPress={onSearchOpen}
          pressGuideColor="var(--color-press-overlay-slate-100-50)"
          pressGuideVariant="icon"
          style={({ focused, pressed }) => [
            interactiveStyles.base,
            styles.iconButton,
            focused && interactiveStyles.focus,
            { transform: [{ scale: pressed ? getInteractiveScale('icon') : 1 }] },
          ]}
        >
          <AppIcon
            name="search"
            preset="search"
            tone="muted"
            weight={700}
          />
        </InteractivePressable>
      </View>

      <FiltersRow
        blurViewOptions={blurViewOptions}
        compact={compact}
        harborLabel={harborFilter}
        harborButtonRef={harborButtonRef}
        harborLabelWidth={harborLabelWidth}
        inFilterSheet={inFilterSheet}
        onHarborClick={onHarborFilterOpen}
        onHarborLabelLayout={onHarborLabelLayout}
        onToggleCompact={onToggleCompact}
        onVesselTypeClick={onVesselTypeFilterOpen}
        onVesselTypeLabelLayout={onVesselTypeLabelLayout}
        openState={openState}
        showFilterGroup={!inFilterSheet}
        vesselTypeLabel={vesselTypeFilter}
        vesselTypeButtonRef={vesselTypeButtonRef}
        vesselTypeLabelWidth={vesselTypeLabelWidth}
      />
    </Animated.View>
  );
});

export const SearchTopBar = memo(function SearchTopBar({
  blurTargetRef,
  compact,
  harborFilter,
  query,
  vesselTypeFilter,
  onBack,
  onClear,
  onHarborFilterOpen,
  onQueryChange,
  onToggleCompact,
  onVesselTypeFilterOpen,
}) {
  useTheme();
  const inputRef = useRef(null);
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 0);
  const barHeight = 136 + topInset;

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      inputRef.current?.focus?.();
    });

    return () => {
      cancelAnimationFrame(frameId);
      inputRef.current?.blur?.();
      Keyboard.dismiss();
    };
  }, []);

  const handleBack = () => {
    inputRef.current?.blur?.();
    Keyboard.dismiss();
    onBack();
  };

  const handleFilterOpen = (openFilter) => {
    inputRef.current?.blur?.();
    Keyboard.dismiss();
    openFilter?.();
  };

  return (
    <View
      style={[
        styles.searchTopBar,
        WEB_TOP_BAR_SHELL_STYLE,
        { height: barHeight, paddingTop: topInset },
      ]}
    >
      <FrostBackground blurTargetRef={blurTargetRef} topInset={topInset} />

      <View
        style={styles.searchMain}
      >
        <InteractivePressable
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
          onPress={handleBack}
          pressGuideColor="var(--slate-50)"
          pressGuideVariant="icon"
          style={({ focused, pressed }) => [
            interactiveStyles.base,
            styles.iconButton,
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

        <TextInput
          ref={inputRef}
          autoFocus
          autoCorrect={false}
          enterKeyHint="search"
          inputMode="search"
          onChangeText={onQueryChange}
          placeholder="검색"
          placeholderTextColor={resolveCssVariableString('var(--color-text-muted)')}
          spellCheck={false}
          style={[styles.searchInput, query ? styles.searchInputFilled : null]}
          value={query}
        />

        {query ? (
          <InteractivePressable
            accessibilityLabel="검색 지우기"
            accessibilityRole="button"
            onPress={onClear}
            pressGuideColor="var(--slate-50)"
            pressGuideVariant="icon"
            style={({ focused, pressed }) => [
              interactiveStyles.base,
              styles.iconButton,
              focused && interactiveStyles.focus,
              { transform: [{ scale: pressed ? getInteractiveScale('icon') : 1 }] },
            ]}
          >
            <AppIcon name="cancel" preset="closeChip" tone="muted" />
          </InteractivePressable>
        ) : (
          <View style={styles.cancelPlaceholder} />
        )}
      </View>

      <FiltersRow
        compact={compact}
        harborLabel={harborFilter}
        onHarborClick={() => handleFilterOpen(onHarborFilterOpen)}
        onToggleCompact={onToggleCompact}
        onVesselTypeClick={() => handleFilterOpen(onVesselTypeFilterOpen)}
        openState="closed"
        vesselTypeLabel={vesselTypeFilter}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    right: 0,
    left: 0,
    top: 0,
    zIndex: 2,
    height: 136,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  topBarHidden: {
    top: -136,
  },
  topBarInSheet: {
    height: 108,
    zIndex: 1,
  },
  frostLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'transparent',
    zIndex: 0,
    overflow: 'hidden',
  },
  frostGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  frostBlur: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  frostBlurSegment: {
    position: 'absolute',
    right: 0,
    left: 0,
  },
  blurFadeStack: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  filterSheetLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'transparent',
    zIndex: 2,
    overflow: 'hidden',
  },
  filterBackdropTop: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: '58%',
  },
  filterBackdropLow: {
    position: 'absolute',
    top: '58%',
    right: 0,
    bottom: 0,
    left: 0,
  },
  filtersFrostLayer: {
    position: 'absolute',
    top: 52,
    right: 0,
    left: 0,
    height: 84,
    zIndex: 0,
    overflow: 'hidden',
  },
  filterFrostTop: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: '32%',
  },
  filterFrostMid: {
    position: 'absolute',
    top: '22%',
    right: 0,
    left: 0,
    height: '44%',
  },
  filterFrostLow: {
    position: 'absolute',
    top: '60%',
    right: 0,
    bottom: 0,
    left: 0,
  },
  pointerEventsNone: {
    pointerEvents: 'none',
  },
  pointerEventsAuto: {
    pointerEvents: 'auto',
  },
  topBarMain: {
    position: 'relative',
    zIndex: 1,
    height: 64,
    paddingHorizontal: 18,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  searchTopBar: {
    position: 'absolute',
    right: 0,
    left: 0,
    top: 0,
    zIndex: 2,
    height: 136,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  searchMain: {
    position: 'relative',
    zIndex: 1,
    height: 64,
    paddingHorizontal: 18,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'var(--slate-50)',
  },
  iconButton: {
    width: 24,
    height: 24,
    padding: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cancelPlaceholder: {
    width: 24,
    height: 24,
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    padding: 0,
    color: 'var(--color-text-muted)',
    fontSize: 18,
    fontWeight: '500',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  searchInputFilled: {
    color: 'var(--color-text-secondary)',
  },
  logo: {
    width: 62.637,
    height: 18,
  },
  filters: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  filtersFrost: {
    position: 'absolute',
    top: -12,
    right: -18,
    bottom: 0,
    left: -18,
    backgroundColor: 'transparent',
    zIndex: 0,
  },
  filtersInSheet: {
    zIndex: 3,
    paddingBottom: 0,
  },
  filtersViewOnly: {
    justifyContent: 'flex-end',
  },
  filterGroup: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'row',
    gap: 24,
    flexShrink: 0,
    minWidth: 0,
  },
  filterGroupInSheet: {
    zIndex: 3,
  },
  filterButton: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 0,
    padding: 0,
    backgroundColor: 'transparent',
    flexShrink: 0,
  },
  filterButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    color: 'var(--color-text-secondary)',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'left',
    flexShrink: 0,
  },
  filterLabelClip: {
    overflow: 'hidden',
    flexShrink: 0,
  },
  viewOptions: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  viewOptionsBlurred: {
    opacity: 0.2,
  },
});
