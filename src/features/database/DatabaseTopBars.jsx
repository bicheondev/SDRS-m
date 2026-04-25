import { memo, useEffect, useRef } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '../../components/Icons.jsx';
import { AppText as Text, AppTextInput as TextInput } from '../../components/primitives/AppTypography.jsx';
import { InteractivePressable } from '../../components/primitives/InteractivePressable.jsx';
import { interactiveStyles, getInteractiveScale } from '../../components/interactiveStyles.js';
import logo from '../../assets/ui/logo.svg';

function FrostBackground({ filterSheet = false, scrollbarGutter = false }) {
  return (
    <>
      <View
        className="top-bar__frost-layer"
        style={[
          styles.frostLayer,
          scrollbarGutter && styles.scrollbarGutterRight,
          styles.pointerEventsNone,
        ]}
      />
      {filterSheet ? (
        <View className="top-bar__filter-sheet-layer" style={[styles.filterSheetLayer, styles.pointerEventsNone]} />
      ) : null}
    </>
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
          <Text
            className="filter-button__label"
            onLayout={onHarborLabelLayout}
            style={[styles.filterLabel, harborLabelWidth ? { width: harborLabelWidth } : null]}
          >
            {harborLabel}
          </Text>
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
          <Text
            className="filter-button__label"
            onLayout={onVesselTypeLabelLayout}
            style={[styles.filterLabel, vesselTypeLabelWidth ? { width: vesselTypeLabelWidth } : null]}
          >
            {vesselTypeLabel}
          </Text>
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
  const topBarTransform = hidden
    ? [{ translateX: '-50%' }, { translateY: '-100%' }]
    : [{ translateX: '-50%' }, { translateY: 0 }];

  return (
    <View
      className={`top-bar ${hidden ? 'top-bar--hidden' : ''} ${
        inFilterSheet ? 'top-bar--filter-sheet' : ''
      } ${scrollbarGutter ? 'top-bar--scrollbar-gutter' : ''}`.trim()}
      style={[
        styles.topBar,
        inFilterSheet && styles.topBarInSheet,
        { transform: topBarTransform },
      ]}
    >
      <FrostBackground filterSheet={inFilterSheet} scrollbarGutter={scrollbarGutter} />

      <View
        className="top-bar__main"
        style={[
          styles.topBarMain,
          inFilterSheet ? styles.pointerEventsNone : styles.pointerEventsAuto,
        ]}
      >
        <Image accessibilityLabel="SDRS" source={{ uri: logo }} style={styles.logo} />
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
    </View>
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
  const inputRef = useRef(null);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      inputRef.current?.focus?.();
    });

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <View
      className={`search-top-bar ${scrollbarGutter ? 'search-top-bar--scrollbar-gutter' : ''}`.trim()}
      style={[styles.searchTopBar, styles.screenAligned]}
    >
      <FrostBackground scrollbarGutter={scrollbarGutter} />

      <View
        className="search-top-bar__main"
        style={[styles.searchMain, scrollbarGutter && styles.searchMainScrollbarGutter]}
      >
        <InteractivePressable
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
          className="search-top-bar__back pressable-control pressable-control--icon"
          onPress={onBack}
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
          placeholderTextColor="var(--color-text-muted)"
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
        onHarborClick={onHarborFilterOpen}
        onToggleCompact={onToggleCompact}
        onVesselTypeClick={onVesselTypeFilterOpen}
        openState="closed"
        scrollbarGutter={scrollbarGutter}
        vesselTypeLabel={vesselTypeFilter}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  topBar: {
    position: 'fixed',
    left: '50%',
    top: 0,
    width: 'min(100%, var(--screen-width))',
    zIndex: 2,
    height: 136,
    overflow: 'hidden',
    isolation: 'isolate',
    transitionDuration: 'var(--motion-duration-fast)',
    transitionProperty: 'transform',
    transitionTimingFunction: 'var(--motion-ease-standard)',
    willChange: 'transform',
    backgroundColor: 'transparent',
    WebkitBackfaceVisibility: 'hidden',
    backfaceVisibility: 'hidden',
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
    backgroundImage: 'var(--gradient-top-bar-frost)',
    backdropFilter: 'blur(22px) saturate(160%)',
    WebkitBackdropFilter: 'blur(22px) saturate(160%)',
    maskImage:
      'linear-gradient(180deg, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 1) 52%, rgb(0 0 0 / 0.78) 72%, rgb(0 0 0 / 0) 100%)',
    WebkitMaskImage:
      'linear-gradient(180deg, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 1) 52%, rgb(0 0 0 / 0.78) 72%, rgb(0 0 0 / 0) 100%)',
    zIndex: 0,
  },
  filterSheetLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'transparent',
    backgroundImage: 'var(--gradient-filter-backdrop)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    zIndex: 2,
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
    position: 'fixed',
    left: '50%',
    top: 0,
    width: 'min(100%, var(--screen-width))',
    zIndex: 2,
    height: 136,
    overflow: 'hidden',
    isolation: 'isolate',
    backgroundColor: 'transparent',
  },
  screenAligned: {
    transform: [{ translateX: '-50%' }],
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
    filter: 'var(--logo-filter)',
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
    backgroundImage: 'var(--gradient-top-bar-frost-soft)',
    backdropFilter: 'blur(10px) saturate(145%)',
    WebkitBackdropFilter: 'blur(10px) saturate(145%)',
    maskImage:
      'linear-gradient(180deg, rgb(0 0 0 / 0) 0%, rgb(0 0 0 / 0.94) 24%, rgb(0 0 0 / 0.9) 74%, rgb(0 0 0 / 0) 100%)',
    WebkitMaskImage:
      'linear-gradient(180deg, rgb(0 0 0 / 0) 0%, rgb(0 0 0 / 0.94) 24%, rgb(0 0 0 / 0.9) 74%, rgb(0 0 0 / 0) 100%)',
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
  },
  filterGroupInSheet: {
    zIndex: 3,
  },
  filterButton: {
    display: 'inline-flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    padding: 0,
    backgroundColor: 'transparent',
  },
  filterLabel: {
    display: 'inline-block',
    color: 'var(--color-text-secondary)',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.36,
    textAlign: 'left',
    whiteSpace: 'nowrap',
    transitionDuration: 'var(--motion-duration-normal)',
    transitionProperty: 'width',
    transitionTimingFunction: 'var(--motion-ease-standard)',
  },
  viewOptions: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewOptionsBlurred: {
    opacity: 0.32,
    filter: 'blur(6px)',
  },
});
