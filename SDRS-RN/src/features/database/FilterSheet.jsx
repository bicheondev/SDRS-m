import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../ThemeContext.js';
import { motionDurationsMs, motionTokens } from '../../motion.js';
import BottomTab from '../../components/layout/BottomTab.jsx';
import { interactiveStyles, getInteractiveScale } from '../../components/interactiveStyles.js';
import { InteractivePressable } from '../../components/primitives/InteractivePressable.jsx';
import { AppText as Text } from '../../components/primitives/AppTypography.jsx';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { measureNodeInWindow } from '../../utils/layout.js';
import { keepAllWordBreakText } from '../../utils/text.js';
import { resolveCssVariableString } from '../../theme.js';
import { TopBar } from './DatabaseTopBars.jsx';

const FILTER_COLUMN_TOP = 122;
const FILTER_COLUMN_EDGE = 18;
const FILTER_BUTTON_GAP = 24;
const FILTER_DISCLOSURE_WIDTH = 24;
const reverseBezier = ([x1, y1, x2, y2]) => [1 - x2, 1 - y2, 1 - x1, 1 - y1];
const IOS_EASING = Easing.bezier(...motionTokens.ease.ios);
const IOS_EASING_REVERSE = Easing.bezier(...reverseBezier(motionTokens.ease.ios));
const filterTextKeepAllStyle = Platform.OS === 'web'
  ? { wordBreak: 'keep-all' }
  : null;

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

function setMeasuredWidth(setter) {
  return (event) => {
    setter(Math.ceil(event.nativeEvent.layout.width));
  };
}

function updateMaxWidth(setter) {
  return (event) => {
    const nextWidth = Math.ceil(event.nativeEvent.layout.width);
    setter((current) => Math.max(current, nextWidth));
  };
}

export function FilterScreen({
  compact,
  filterMode,
  harborFilter,
  harborOptions,
  phase = 'open',
  blurTargetRef,
  onClose,
  onHarborSelect,
  onManageOpen,
  onMenuOpen,
  onSearchOpen,
  onToggleCompact,
  onVesselTypeSelect,
  vesselTypeFilter,
  vesselTypeOptions,
}) {
  const { resolvedColorMode } = useTheme();
  const isDark = resolvedColorMode === 'dark';
  const viewportDimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 0);
  const filterColumnTop = FILTER_COLUMN_TOP + topInset;
  const [naturalHarborLabelWidth, setNaturalHarborLabelWidth] = useState(0);
  const [naturalVesselTypeLabelWidth, setNaturalVesselTypeLabelWidth] = useState(0);
  const [harborOptionWidth, setHarborOptionWidth] = useState(0);
  const [vesselTypeOptionWidth, setVesselTypeOptionWidth] = useState(0);
  const [displayedHarborLabelWidth, setDisplayedHarborLabelWidth] = useState(0);
  const [displayedVesselTypeLabelWidth, setDisplayedVesselTypeLabelWidth] = useState(0);
  const [columnLayout, setColumnLayout] = useState({
    top: filterColumnTop,
    harborLeft: FILTER_COLUMN_EDGE,
    vesselTypeLeft: FILTER_COLUMN_EDGE,
  });
  const [columnLayoutReady, setColumnLayoutReady] = useState(false);
  const reducedMotion = useReducedMotionSafe();
  const shouldUseBlurTarget = Platform.OS !== 'web';
  const widthAnimationFrameRef = useRef(null);
  const widthPhaseRef = useRef('closed');
  const columnLayoutReadyRef = useRef(false);
  const layoutAnimationFrameRef = useRef(null);
  const panelRef = useRef(null);
  const harborButtonRef = useRef(null);
  const vesselTypeButtonRef = useRef(null);
  const openHarborFilterRef = useRef(harborFilter);
  const openVesselTypeFilterRef = useRef(vesselTypeFilter);
  const selectedDuringCloseRef = useRef({ harbor: false, vesselType: false });
  const harborWidthOptions = useMemo(
    () => harborOptions.filter((option) => option !== harborFilter),
    [harborFilter, harborOptions],
  );
  const vesselTypeWidthOptions = useMemo(
    () => vesselTypeOptions.filter((option) => option !== vesselTypeFilter),
    [vesselTypeFilter, vesselTypeOptions],
  );
  const harborColumnWidth = Math.max(naturalHarborLabelWidth, harborOptionWidth);
  const vesselTypeColumnWidth = Math.max(naturalVesselTypeLabelWidth, vesselTypeOptionWidth);
  const harborOptionsMeasured = harborWidthOptions.length === 0 || harborOptionWidth > 0;
  const vesselTypeOptionsMeasured = vesselTypeWidthOptions.length === 0 || vesselTypeOptionWidth > 0;
  const filterWidthsReady = naturalHarborLabelWidth > 0
    && naturalVesselTypeLabelWidth > 0
    && harborOptionsMeasured
    && vesselTypeOptionsMeasured;
  const filterOpenState = phase === 'closing' ? 'closed' : filterMode;
  const screenColor = resolveCssVariableString('var(--color-bg-screen)');
  const backdropBaseColor = colorWithAlpha(screenColor, 0);
  const backdropTopColor = colorWithAlpha(screenColor, 1);
  const backdropMidColor = colorWithAlpha(screenColor, 0.5);
  const activeBlurTargetRef = shouldUseBlurTarget && blurTargetRef
    ? blurTargetRef
    : null;
  const blurModeKey = activeBlurTargetRef ? 'targeted' : 'fallback';
  const nativeBlurProps = activeBlurTargetRef
    ? {
        blurMethod: 'dimezisBlurView',
        blurReductionFactor: 1.25,
        blurTarget: activeBlurTargetRef,
      }
    : null;
  const panelPointerEventsStyle = Platform.OS === 'web'
    ? styles.pointerEventsNone
    : styles.pointerEventsBoxNone;
  const columnsPointerEventsStyle = Platform.OS === 'web'
    ? styles.pointerEventsNone
    : styles.pointerEventsBoxNone;
  const columnPointerEventsStyle = Platform.OS === 'web'
    ? styles.pointerEventsAuto
    : null;
  const layerProgress = useSharedValue(phase === 'closing' ? 1 : 0);
  const panelProgress = useSharedValue(phase === 'closing' ? 1 : 0);
  const panelTranslateY = useSharedValue(phase === 'closing' ? 0 : motionTokens.offset.sheetLift);
  const layerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: layerProgress.value,
  }));
  const panelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: panelProgress.value,
    transform: [{ translateY: panelTranslateY.value }],
  }));
  const columnTopValue = useSharedValue(columnLayout.top);
  const harborColumnLeftValue = useSharedValue(columnLayout.harborLeft);
  const vesselTypeColumnLeftValue = useSharedValue(columnLayout.vesselTypeLeft);
  const harborColumnAnimatedStyle = useAnimatedStyle(() => ({
    top: columnTopValue.value,
    left: harborColumnLeftValue.value,
  }));
  const vesselTypeColumnAnimatedStyle = useAnimatedStyle(() => ({
    top: columnTopValue.value,
    left: vesselTypeColumnLeftValue.value,
  }));

  useEffect(
    () => () => {
      if (widthAnimationFrameRef.current !== null) {
        cancelAnimationFrame(widthAnimationFrameRef.current);
        widthAnimationFrameRef.current = null;
      }

      if (layoutAnimationFrameRef.current !== null) {
        cancelAnimationFrame(layoutAnimationFrameRef.current);
        layoutAnimationFrameRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    const opening = phase !== 'closing';
    const targetOpacity = opening ? 1 : 0;
    const targetPanelY = opening || reducedMotion ? 0 : motionTokens.offset.sheetLift;
    const easing = opening ? IOS_EASING : IOS_EASING_REVERSE;
    const layerCloseDelay = Math.max(0, motionDurationsMs.normal - motionDurationsMs.fast);

    if (reducedMotion) {
      layerProgress.value = targetOpacity;
      panelProgress.value = targetOpacity;
      panelTranslateY.value = targetPanelY;
      return;
    }

    layerProgress.value = opening
      ? withTiming(targetOpacity, {
          duration: motionDurationsMs.fast,
          easing,
        })
      : withDelay(
          layerCloseDelay,
          withTiming(targetOpacity, {
            duration: motionDurationsMs.fast,
            easing,
          }),
        );
    panelProgress.value = withTiming(targetOpacity, {
      duration: motionDurationsMs.normal,
      easing,
    });
    panelTranslateY.value = withTiming(targetPanelY, {
      duration: motionDurationsMs.normal,
      easing,
    });
  }, [
    layerProgress,
    panelProgress,
    panelTranslateY,
    phase,
    reducedMotion,
  ]);

  useEffect(() => {
    const easing = phase === 'closing' ? IOS_EASING_REVERSE : IOS_EASING;
    const timing = {
      duration: reducedMotion ? 0 : motionDurationsMs.normal,
      easing,
    };

    if (reducedMotion) {
      columnTopValue.value = columnLayout.top;
      harborColumnLeftValue.value = columnLayout.harborLeft;
      vesselTypeColumnLeftValue.value = columnLayout.vesselTypeLeft;
      return;
    }

    columnTopValue.value = withTiming(columnLayout.top, timing);
    harborColumnLeftValue.value = withTiming(columnLayout.harborLeft, timing);
    vesselTypeColumnLeftValue.value = withTiming(columnLayout.vesselTypeLeft, timing);
  }, [
    columnLayout.harborLeft,
    columnLayout.top,
    columnLayout.vesselTypeLeft,
    columnTopValue,
    harborColumnLeftValue,
    phase,
    reducedMotion,
    vesselTypeColumnLeftValue,
  ]);

  useEffect(() => {
    setHarborOptionWidth(0);
  }, [harborFilter, harborOptions]);

  useEffect(() => {
    setVesselTypeOptionWidth(0);
  }, [vesselTypeFilter, vesselTypeOptions]);

  useEffect(() => {
    if (phase !== 'closing') {
      openHarborFilterRef.current = harborFilter;
      openVesselTypeFilterRef.current = vesselTypeFilter;
    }
  }, [harborFilter, phase, vesselTypeFilter]);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useLayoutEffect(() => {
    if (widthAnimationFrameRef.current !== null) {
      cancelAnimationFrame(widthAnimationFrameRef.current);
      widthAnimationFrameRef.current = null;
    }

    const closedHarborLabelWidth = naturalHarborLabelWidth || harborColumnWidth;
    const closedVesselTypeLabelWidth = naturalVesselTypeLabelWidth || vesselTypeColumnWidth;
    const openHarborLabelWidth = harborColumnWidth || closedHarborLabelWidth;
    const openVesselTypeLabelWidth = vesselTypeColumnWidth || closedVesselTypeLabelWidth;

    if (!closedHarborLabelWidth || !closedVesselTypeLabelWidth) {
      return undefined;
    }

    if (phase === 'closing') {
      const harborChangedDuringClose =
        selectedDuringCloseRef.current.harbor || openHarborFilterRef.current !== harborFilter;
      const vesselTypeChangedDuringClose =
        selectedDuringCloseRef.current.vesselType || openVesselTypeFilterRef.current !== vesselTypeFilter;
      const closingHarborLabelWidth = harborChangedDuringClose
        ? Math.max(closedHarborLabelWidth, openHarborLabelWidth, displayedHarborLabelWidth)
        : closedHarborLabelWidth;
      const closingVesselTypeLabelWidth = vesselTypeChangedDuringClose
        ? Math.max(
            closedVesselTypeLabelWidth,
            openVesselTypeLabelWidth,
            displayedVesselTypeLabelWidth,
          )
        : closedVesselTypeLabelWidth;

      widthPhaseRef.current = 'closed';
      setDisplayedHarborLabelWidth(closingHarborLabelWidth);
      setDisplayedVesselTypeLabelWidth(closingVesselTypeLabelWidth);
      return undefined;
    }

    if (!filterWidthsReady) {
      if (widthPhaseRef.current === 'closed') {
        setDisplayedHarborLabelWidth(closedHarborLabelWidth);
        setDisplayedVesselTypeLabelWidth(closedVesselTypeLabelWidth);
      }
      return undefined;
    }

    if (reducedMotion || widthPhaseRef.current === 'open') {
      widthPhaseRef.current = 'open';
      setDisplayedHarborLabelWidth(openHarborLabelWidth);
      setDisplayedVesselTypeLabelWidth(openVesselTypeLabelWidth);
      return undefined;
    }

    widthPhaseRef.current = 'opening';
    setDisplayedHarborLabelWidth(closedHarborLabelWidth);
    setDisplayedVesselTypeLabelWidth(closedVesselTypeLabelWidth);

    widthAnimationFrameRef.current = requestAnimationFrame(() => {
      widthAnimationFrameRef.current = null;
      widthPhaseRef.current = 'open';
      setDisplayedHarborLabelWidth(openHarborLabelWidth);
      setDisplayedVesselTypeLabelWidth(openVesselTypeLabelWidth);
    });

    return () => {
      if (widthAnimationFrameRef.current !== null) {
        cancelAnimationFrame(widthAnimationFrameRef.current);
        widthAnimationFrameRef.current = null;
      }
    };
  }, [
    filterWidthsReady,
    harborFilter,
    harborColumnWidth,
    displayedHarborLabelWidth,
    displayedVesselTypeLabelWidth,
    naturalHarborLabelWidth,
    naturalVesselTypeLabelWidth,
    phase,
    reducedMotion,
    vesselTypeColumnWidth,
    vesselTypeFilter,
  ]);

  const updateColumnLayout = useCallback(async () => {
    if (!filterWidthsReady) {
      return;
    }

    const [panelRect, harborButtonRect] = await Promise.all([
      measureNodeInWindow(panelRef.current),
      measureNodeInWindow(harborButtonRef.current),
    ]);

    if (!panelRect || !harborButtonRect) {
      return;
    }

    const harborLeft = Math.max(FILTER_COLUMN_EDGE, harborButtonRect.left - panelRect.left);
    const vesselTypeLeft =
      harborLeft + harborColumnWidth + FILTER_DISCLOSURE_WIDTH + FILTER_BUTTON_GAP;

    const nextColumnLayout = {
      top: filterColumnTop,
      harborLeft,
      vesselTypeLeft,
    };

    if (!columnLayoutReadyRef.current) {
      columnLayoutReadyRef.current = true;
      columnTopValue.value = nextColumnLayout.top;
      harborColumnLeftValue.value = nextColumnLayout.harborLeft;
      vesselTypeColumnLeftValue.value = nextColumnLayout.vesselTypeLeft;
      setColumnLayoutReady(true);
    }

    setColumnLayout((current) => {
      const sameLayout =
        Math.abs(current.top - nextColumnLayout.top) < 0.5
        && Math.abs(current.harborLeft - nextColumnLayout.harborLeft) < 0.5
        && Math.abs(current.vesselTypeLeft - nextColumnLayout.vesselTypeLeft) < 0.5;

      return sameLayout ? current : nextColumnLayout;
    });
  }, [
    columnTopValue,
    filterWidthsReady,
    filterColumnTop,
    harborColumnLeftValue,
    harborColumnWidth,
    vesselTypeColumnLeftValue,
  ]);

  useLayoutEffect(() => {
    if (layoutAnimationFrameRef.current !== null) {
      cancelAnimationFrame(layoutAnimationFrameRef.current);
      layoutAnimationFrameRef.current = null;
    }

    layoutAnimationFrameRef.current = requestAnimationFrame(() => {
      layoutAnimationFrameRef.current = null;
      updateColumnLayout();
    });

    return () => {
      if (layoutAnimationFrameRef.current !== null) {
        cancelAnimationFrame(layoutAnimationFrameRef.current);
        layoutAnimationFrameRef.current = null;
      }
    };
  }, [
    compact,
    filterWidthsReady,
    filterMode,
    harborColumnWidth,
    harborFilter,
    filterColumnTop,
    updateColumnLayout,
    vesselTypeFilter,
    viewportDimensions.height,
    viewportDimensions.width,
  ]);

  return (
    <View style={[styles.layer, styles.filterScreen]}>
      <TopBar
        blurTargetRef={activeBlurTargetRef}
        blurViewOptions
        compact={compact}
        harborFilter={harborFilter}
        harborButtonRef={harborButtonRef}
        harborLabelWidth={displayedHarborLabelWidth || undefined}
        inFilterSheet
        onHarborFilterOpen={handleClose}
        onSearchOpen={onSearchOpen}
        onToggleCompact={onToggleCompact}
        onVesselTypeFilterOpen={handleClose}
        openState={filterOpenState}
        vesselTypeFilter={vesselTypeFilter}
        vesselTypeButtonRef={vesselTypeButtonRef}
        vesselTypeLabelWidth={displayedVesselTypeLabelWidth || undefined}
      />

      <Animated.View style={[styles.overlay, layerAnimatedStyle]}>
        <BlurView
          key={`filter-backdrop-${blurModeKey}`}
          {...nativeBlurProps}
          intensity={72}
          style={[styles.backdropBlur, styles.pointerEventsNone]}
          tint={isDark ? 'dark' : 'default'}
        />
        <LinearGradient
          colors={[backdropTopColor, backdropMidColor]}
          locations={[0, 1]}
          style={[styles.backdropGradient, styles.pointerEventsNone]}
        />
        <Pressable
          accessibilityLabel="필터 닫기"
          accessibilityRole="button"
          onPress={handleClose}
          style={[styles.backdrop, { backgroundColor: backdropBaseColor }]}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          panelPointerEventsStyle,
          styles.panelMeasureHost,
          panelAnimatedStyle,
          !columnLayoutReady && styles.panelHidden,
        ]}
        ref={panelRef}
      >
        <View
          style={[styles.columns, columnsPointerEventsStyle]}
        >
          <Animated.View
            style={[
              styles.column,
              columnPointerEventsStyle,
              harborColumnAnimatedStyle,
            ]}
          >
            {harborOptions.map((option) => (
              <InteractivePressable
                key={option}
                accessibilityRole="button"
                onLayout={harborFilter === option ? undefined : updateMaxWidth(setHarborOptionWidth)}
                onPress={() => {
                  selectedDuringCloseRef.current.harbor = true;
                  onHarborSelect(option);
                  handleClose();
                }}
                pressGuideVariant="option"
                style={({ focused, pressed }) => [
                  interactiveStyles.base,
                  styles.option,
                  harborFilter === option && styles.optionActive,
                  focused && interactiveStyles.focus,
                  { transform: [{ scale: pressed ? getInteractiveScale('row') : 1 }] },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.optionLabel,
                    filterTextKeepAllStyle,
                    harborFilter === option && styles.optionLabelActive,
                  ]}
                >
                  {keepAllWordBreakText(option)}
                </Text>
              </InteractivePressable>
            ))}
          </Animated.View>

          <Animated.View
            style={[
              styles.column,
              columnPointerEventsStyle,
              vesselTypeColumnAnimatedStyle,
            ]}
          >
            {vesselTypeOptions.map((option) => (
              <InteractivePressable
                key={option}
                accessibilityRole="button"
                onLayout={vesselTypeFilter === option ? undefined : updateMaxWidth(setVesselTypeOptionWidth)}
                onPress={() => {
                  selectedDuringCloseRef.current.vesselType = true;
                  onVesselTypeSelect(option);
                  handleClose();
                }}
                pressGuideVariant="option"
                style={({ focused, pressed }) => [
                  interactiveStyles.base,
                  styles.option,
                  vesselTypeFilter === option && styles.optionActive,
                  focused && interactiveStyles.focus,
                  { transform: [{ scale: pressed ? getInteractiveScale('row') : 1 }] },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.optionLabel,
                    filterTextKeepAllStyle,
                    vesselTypeFilter === option && styles.optionLabelActive,
                  ]}
                >
                  {keepAllWordBreakText(option)}
                </Text>
              </InteractivePressable>
            ))}
          </Animated.View>
        </View>
      </Animated.View>

      <View style={[styles.measurements, styles.pointerEventsNone]}>
        <Text
          onLayout={setMeasuredWidth(setNaturalHarborLabelWidth)}
          style={[styles.measurementFilterLabel, filterTextKeepAllStyle]}
        >
          {keepAllWordBreakText(harborFilter)}
        </Text>
        <Text
          onLayout={setMeasuredWidth(setNaturalVesselTypeLabelWidth)}
          style={[styles.measurementFilterLabel, filterTextKeepAllStyle]}
        >
          {keepAllWordBreakText(vesselTypeFilter)}
        </Text>
        <View style={styles.measurementColumn}>
          {harborWidthOptions.map((option) => (
            <Text
              key={`harbor-measure-${option}`}
              onLayout={updateMaxWidth(setHarborOptionWidth)}
              style={[styles.optionLabel, filterTextKeepAllStyle]}
            >
              {keepAllWordBreakText(option)}
            </Text>
          ))}
        </View>
        <View style={styles.measurementColumn}>
          {vesselTypeWidthOptions.map((option) => (
            <Text
              key={`vessel-type-measure-${option}`}
              onLayout={updateMaxWidth(setVesselTypeOptionWidth)}
              style={[styles.optionLabel, filterTextKeepAllStyle]}
            >
              {keepAllWordBreakText(option)}
            </Text>
          ))}
        </View>
      </View>

      <BottomTab
        activeTab="db"
        contained
        onDbClick={handleClose}
        onManageClick={onManageOpen}
        onMenuClick={onMenuOpen}
        style={styles.bottomTabUnderOverlay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 5,
  },
  filterScreen: {
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 3,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  backdropGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  backdropBlur: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  bottomTabUnderOverlay: {
    zIndex: 2,
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
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 200,
    elevation: 0,
    backgroundColor: 'transparent',
  },
  panelMeasureHost: {
    overflow: 'visible',
  },
  panelHidden: {
    opacity: 0,
  },
  columns: {
    position: 'relative',
    minHeight: '100%',
    zIndex: 200,
  },
  column: {
    position: 'absolute',
    zIndex: 200,
    elevation: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 24,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  option: {
    alignSelf: 'flex-start',
    minHeight: 24,
    justifyContent: 'center',
    paddingHorizontal: 0,
    textAlign: 'left',
    backgroundColor: 'transparent',
  },
  optionLabel: {
    color: 'var(--color-text-tertiary)',
    fontSize: 18,
    fontWeight: '700',
    opacity: 0.78,
  },
  optionActive: {},
  optionLabelActive: {
    color: 'var(--color-text-accent)',
    opacity: 1,
  },
  measurements: {
    position: 'absolute',
    top: -10000,
    left: -10000,
    opacity: 0,
    zIndex: -1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  measurementColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 24,
  },
  measurementFilterLabel: {
    color: 'var(--color-text-secondary)',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'left',
  },
});
