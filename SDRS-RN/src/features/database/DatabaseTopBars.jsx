import { memo, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Keyboard, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
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

const IOS_EASING = Easing.bezier(...motionTokens.ease.ios);

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

function FrostBackground({ filterSheet = false, scrollbarGutter = false, topInset = 0 }) {
  const { resolvedColorMode } = useTheme();
  const isDark = resolvedColorMode === 'dark';
  const screenColor = resolveCssVariableString('var(--color-bg-screen)');
  const topBand = colorWithAlpha(screenColor, 0.86);
  const midBand = colorWithAlpha(screenColor, 0.78);
  const fadeBand = colorWithAlpha(screenColor, 0);
  const filterTopBand = colorWithAlpha(screenColor, isDark ? 0.4 : 0.34);
  const filterMidBand = colorWithAlpha(screenColor, isDark ? 0.22 : 0.18);
  const filterLowBand = colorWithAlpha(screenColor, 0.04);
  const filterBackdropTop = colorWithAlpha(screenColor, 1);
  const filterBackdropLow = colorWithAlpha(screenColor, 0.5);

  return (
    <>
      <View
        className="top-bar__frost-layer"
        style={[
          styles.frostLayer,
          scrollbarGutter && styles.scrollbarGutterRight,
          styles.pointerEventsNone,
        ]}
      >
        <LinearGradient
          colors={[topBand, topBand, midBand, colorWithAlpha(screenColor, 0.1), fadeBand]}
          locations={[0, 0.52, 0.72, 0.92, 1]}
          pointerEvents="none"
          style={styles.frostGradient}
        />
      </View>
      {filterSheet ? (
        <View className="top-bar__filter-sheet-layer" style={[styles.filterSheetLayer, styles.pointerEventsNone]}>
          <LinearGradient
            colors={[filterBackdropTop, filterBackdropLow]}
            locations={[0, 1]}
            pointerEvents="none"
            style={styles.frostGradient}
          />
        </View>
      ) : null}
      <View
        className="top-bar__filters-frost-layer"
        style={[
          styles.filtersFrostLayer,
          { top: Math.max(0, topInset) + 52 },
          styles.pointerEventsNone,
        ]}
      >
        <LinearGradient
          colors={[filterLowBand, filterTopBand, filterMidBand, filterLowBand]}
          locations={[0, 0.24, 0.74, 1]}
          pointerEvents="none"
          style={styles.frostGradient}
        />
      </View>
    </>
  );
}

function FilterButtonLabel({ children, numberOfLines = 1, onLayout, width }) {
  const widthValue = useSharedValue(width ?? 0);
  const hasWidth = typeof width === 'number' && width > 0;

  useEffect(() => {
    if (!hasWidth) {
      return;
    }

    widthValue.value = withTiming(width, {
      duration: motionDurationsMs.normal,
      easing: IOS_EASING,
    });
  }, [hasWidth, width, widthValue]);

  const widthStyle = useAnimatedStyle(() => (
    hasWidth
      ? {
          width: widthValue.value,
        }
      : {}
  ));

  const label = (
    <Text
      className="filter-button__label"
      numberOfLines={numberOfLines}
      onLayout={onLayout}
      style={styles.filterLabel}
    >
      {children}
    </Text>
  );

  if (!hasWidth) {
    return label;
  }

  return (
    <Animated.View pointerEvents="none" style={[styles.filterLabelClip, widthStyle]}>
      {label}
    </Animated.View>
  );
}

function FiltersRow({
  blurViewOptions = false,
  compact,
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
  scrollbarGutter = false,
  vesselTypeLabel = '전체 선박',
  vesselTypeButtonRef,
  vesselTypeLabelWidth,
}) {
  const dropdownIconName = openState !== 'closed' ? 'keyboard_arrow_up' : 'keyboard_arrow_down';

  return (
    <View
      className={`top-bar__filters ${inFilterSheet ? 'top-bar__filters--filter-sheet' : ''}`.trim()}
      style={[styles.filters, inFilterSheet && styles.filtersInSheet]}
    >
      <View
        className="top-bar__filters-frost"
        style={[
          styles.filtersFrost,
          scrollbarGutter && styles.filtersFrostScrollbarGutter,
          styles.pointerEventsNone,
        ]}
      />
      <View className="filter-group" style={[styles.filterGroup, inFilterSheet && styles.filterGroupInSheet]}>
        <InteractivePressable
          accessibilityRole="button"
          className="filter-button pressable-control pressable-control--pill"
          onPress={onHarborClick}
          pressGuideColor="var(--color-press-overlay-slate-100-50)"
          pressGuideVariant="pill"
          ref={harborButtonRef}
          style={({ focused, pressed }) => [
            interactiveStyles.base,
            styles.filterButton,
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
          <AppIcon className="filter-button__icon" name={dropdownIconName} preset="disclosure" tone="slate-400" />
        </InteractivePressable>

        <InteractivePressable
          accessibilityRole="button"
          className="filter-button pressable-control pressable-control--pill"
          onPress={onVesselTypeClick}
          pressGuideColor="var(--color-press-overlay-slate-100-50)"
          pressGuideVariant="pill"
          ref={vesselTypeButtonRef}
          style={({ focused, pressed }) => [
            interactiveStyles.base,
            styles.filterButton,
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
          <AppIcon className="filter-button__icon" name={dropdownIconName} preset="disclosure" tone="slate-400" />
        </InteractivePressable>
      </View>

      <View
        accessibilityLabel="보기 옵션"
        className={`view-options ${blurViewOptions ? 'view-options--blurred' : ''}`.trim()}
        style={[
          styles.viewOptions,
          blurViewOptions && styles.viewOptionsBlurred,
          blurViewOptions ? styles.pointerEventsNone : styles.pointerEventsAuto,
        ]}
      >
        <InteractivePressable
          accessibilityLabel="요약 보기"
          accessibilityRole="button"
          className={`icon-button pressable-control pressable-control--icon ${
            compact ? 'icon-button--active' : ''
          }`.trim()}
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
            className="view-option-icon"
            name="event_list"
            preset="viewMode"
            tone={compact ? 'slate-500' : 'slate-300'}
          />
        </InteractivePressable>
        <InteractivePressable
          accessibilityLabel="카드 보기"
          accessibilityRole="button"
          className={`icon-button pressable-control pressable-control--icon ${
            compact ? '' : 'icon-button--active'
          }`.trim()}
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
            className="view-option-icon"
            name="view_stream"
            preset="viewMode"
            tone={compact ? 'slate-300' : 'slate-500'}
          />
        </InteractivePressable>
      </View>
    </View>
  );
}

export const TopBar = memo(function TopBar({
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
  scrollbarGutter = false,
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
      className={`top-bar top-bar--rnw-frost ${
        inFilterSheet ? 'top-bar--filter-sheet' : ''
      } ${scrollbarGutter ? 'top-bar--scrollbar-gutter' : ''}`.trim()}
      style={[
        styles.topBar,
        inFilterSheet && styles.topBarInSheet,
        { height: barHeight, paddingTop: topInset },
        topBarAnimatedStyle,
      ]}
    >
      <FrostBackground
        filterSheet={inFilterSheet}
        scrollbarGutter={scrollbarGutter}
        topInset={topInset}
      />

      <View
        className="top-bar__main"
        style={[
          styles.topBarMain,
          inFilterSheet ? styles.pointerEventsNone : styles.pointerEventsAuto,
        ]}
      >
        <Logo accessibilityLabel="SDRS" width={62.637} height={18} style={styles.logo} />
        <InteractivePressable
          accessibilityLabel="검색"
          accessibilityRole="button"
          className="icon-button pressable-control pressable-control--icon"
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
            className="top-bar__action-icon"
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
        scrollbarGutter={scrollbarGutter}
        vesselTypeLabel={vesselTypeFilter}
        vesselTypeButtonRef={vesselTypeButtonRef}
        vesselTypeLabelWidth={vesselTypeLabelWidth}
      />
    </Animated.View>
  );
});

export const SearchTopBar = memo(function SearchTopBar({
  compact,
  harborFilter,
  query,
  scrollbarGutter = false,
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
      className={`search-top-bar search-top-bar--rnw-frost ${
        scrollbarGutter ? 'search-top-bar--scrollbar-gutter' : ''
      }`.trim()}
      style={[styles.searchTopBar, { height: barHeight, paddingTop: topInset }]}
    >
      <FrostBackground scrollbarGutter={scrollbarGutter} topInset={topInset} />

      <View
        className="search-top-bar__main"
        style={[styles.searchMain, scrollbarGutter && styles.searchMainScrollbarGutter]}
      >
        <InteractivePressable
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
          className="search-top-bar__back pressable-control pressable-control--icon"
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
            className="search-top-bar__back-icon"
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
            className="search-top-bar__cancel pressable-control pressable-control--icon"
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
        scrollbarGutter={scrollbarGutter}
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
    width: '100%',
    zIndex: 2,
    height: 136,
    overflow: 'hidden',
    isolation: 'isolate',
    willChange: 'top',
    backgroundColor: 'transparent',
    WebkitBackfaceVisibility: 'hidden',
    backfaceVisibility: 'hidden',
  },
  topBarHidden: {
    top: -136,
  },
  topBarInSheet: {
    height: 108,
    zIndex: 4,
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
  frostBandTop: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: '46%',
  },
  frostBandMid: {
    position: 'absolute',
    top: '40%',
    right: 0,
    left: 0,
    height: '24%',
  },
  frostBandLow: {
    position: 'absolute',
    top: '61%',
    right: 0,
    left: 0,
    height: '18%',
  },
  frostBandFade: {
    position: 'absolute',
    top: '78%',
    right: 0,
    left: 0,
    bottom: 0,
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
    height: 70,
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
    width: '100%',
    zIndex: 2,
    height: 136,
    overflow: 'hidden',
    isolation: 'isolate',
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
    backgroundColor: 'transparent',
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
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.36,
    outlineStyle: 'none',
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
  filterGroup: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'row',
    gap: 24,
    flexShrink: 1,
    minWidth: 0,
  },
  filterGroupInSheet: {
    zIndex: 3,
  },
  filterButton: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    padding: 0,
    backgroundColor: 'transparent',
    flexShrink: 1,
  },
  filterLabel: {
    color: 'var(--color-text-secondary)',
    fontSize: 18,
    lineHeight: 23.4,
    fontWeight: '600',
    letterSpacing: -0.36,
    textAlign: 'left',
  },
  filterLabelClip: {
    overflow: 'hidden',
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
    opacity: 0.32,
  },
});
