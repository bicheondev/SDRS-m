import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../ThemeContext.js';
import { filterVessels } from '../../domain/ships.js';
import { motionDurationsMs, motionTokens } from '../../motion.js';
import BottomTab from '../../components/layout/BottomTab.jsx';
import { AppScreenShell, screenLayoutStyles } from '../../components/layout/ScreenLayout.jsx';
import { interactiveStyles, getInteractiveScale } from '../../components/interactiveStyles.js';
import { InteractivePressable } from '../../components/primitives/InteractivePressable.jsx';
import { AppText as Text } from '../../components/primitives/AppTypography.jsx';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { measureNodeInWindow } from '../../utils/layout.js';
import { resolveCssVariableString } from '../../theme.js';
import { applySearchQuery } from './useVesselSearch.js';
import { TopBar } from './DatabaseTopBars.jsx';
import { VesselResults } from './VesselResults.jsx';

const FILTER_COLUMN_TOP = 122;
const FILTER_COLUMN_EDGE = 18;
const FILTER_BUTTON_GAP = 24;
const FILTER_DISCLOSURE_WIDTH = 24;
const reverseBezier = ([x1, y1, x2, y2]) => [1 - x2, 1 - y2, 1 - x1, 1 - y1];
const IOS_EASING = Easing.bezier(...motionTokens.ease.ios);
const IOS_EASING_REVERSE = Easing.bezier(...reverseBezier(motionTokens.ease.ios));

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
  query = '',
  vessels,
  onClose,
  onHarborSelect,
  onImageClick,
  onManageOpen,
  onMenuOpen,
  onSearchOpen,
  onToggleCompact,
  onVesselTypeSelect,
  vesselTypeFilter,
  vesselTypeOptions,
}) {
  useTheme();
  const viewportDimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const filterColumnTop = FILTER_COLUMN_TOP + Math.max(insets.top, 0);
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
  const reducedMotion = useReducedMotionSafe();
  const enterFrameRef = useRef(null);
  const widthAnimationFrameRef = useRef(null);
  const layoutAnimationFrameRef = useRef(null);
  const panelRef = useRef(null);
  const harborButtonRef = useRef(null);
  const vesselTypeButtonRef = useRef(null);
  const [visualPhase, setVisualPhase] = useState(() =>
    reducedMotion ? (phase === 'closing' ? 'closed' : 'open') : phase === 'closing' ? 'closing' : 'closed',
  );
  const filteredVessels = useMemo(
    () => applySearchQuery(filterVessels(vessels, harborFilter, vesselTypeFilter), query),
    [harborFilter, query, vesselTypeFilter, vessels],
  );
  const harborColumnWidth = Math.max(naturalHarborLabelWidth, harborOptionWidth);
  const vesselTypeColumnWidth = Math.max(naturalVesselTypeLabelWidth, vesselTypeOptionWidth);
  const filterScrollResetKey = `${harborFilter}:${vesselTypeFilter}`;
  const filterOpenState = phase === 'closing' ? 'closed' : filterMode;
  const harborMenuLeft = columnLayout.harborLeft;
  const vesselTypeMenuLeft = columnLayout.vesselTypeLeft;
  const screenColor = resolveCssVariableString('var(--color-bg-screen)');
  const backdropBaseColor = colorWithAlpha(screenColor, 0.5);
  const backdropTopColor = colorWithAlpha(screenColor, 1);
  const backdropMidColor = colorWithAlpha(screenColor, 0.5);
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

  useEffect(
    () => () => {
      if (enterFrameRef.current !== null) {
        cancelAnimationFrame(enterFrameRef.current);
        enterFrameRef.current = null;
      }

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

    if (reducedMotion) {
      layerProgress.value = targetOpacity;
      panelProgress.value = targetOpacity;
      panelTranslateY.value = targetPanelY;
      return;
    }

    layerProgress.value = withTiming(targetOpacity, {
      duration: motionDurationsMs.fast,
      easing,
    });
    panelProgress.value = withTiming(targetOpacity, {
      duration: motionDurationsMs.normal,
      easing,
    });
    panelTranslateY.value = withTiming(targetPanelY, {
      duration: motionDurationsMs.normal,
      easing,
    });
  }, [layerProgress, panelProgress, panelTranslateY, phase, reducedMotion]);

  useEffect(() => {
    setHarborOptionWidth(0);
  }, [harborOptions]);

  useEffect(() => {
    setVesselTypeOptionWidth(0);
  }, [vesselTypeOptions]);

  useLayoutEffect(() => {
    if (enterFrameRef.current !== null) {
      cancelAnimationFrame(enterFrameRef.current);
      enterFrameRef.current = null;
    }

    if (reducedMotion) {
      setVisualPhase(phase === 'closing' ? 'closed' : 'open');
      return undefined;
    }

    if (phase === 'closing') {
      setVisualPhase('closing');
      return undefined;
    }

    setVisualPhase('closed');
    enterFrameRef.current = requestAnimationFrame(() => {
      enterFrameRef.current = null;
      setVisualPhase('open');
    });

    return () => {
      if (enterFrameRef.current !== null) {
        cancelAnimationFrame(enterFrameRef.current);
        enterFrameRef.current = null;
      }
    };
  }, [phase, reducedMotion]);

  useLayoutEffect(() => {
    if (widthAnimationFrameRef.current !== null) {
      cancelAnimationFrame(widthAnimationFrameRef.current);
      widthAnimationFrameRef.current = null;
    }

    const closedHarborLabelWidth = naturalHarborLabelWidth || harborColumnWidth;
    const closedVesselTypeLabelWidth = naturalVesselTypeLabelWidth || vesselTypeColumnWidth;
    const openHarborLabelWidth = harborColumnWidth || closedHarborLabelWidth;
    const openVesselTypeLabelWidth = vesselTypeColumnWidth || closedVesselTypeLabelWidth;

    if (reducedMotion) {
      setDisplayedHarborLabelWidth(phase === 'closing' ? closedHarborLabelWidth : openHarborLabelWidth);
      setDisplayedVesselTypeLabelWidth(
        phase === 'closing' ? closedVesselTypeLabelWidth : openVesselTypeLabelWidth,
      );
      return undefined;
    }

    if (phase === 'closing') {
      setDisplayedHarborLabelWidth(closedHarborLabelWidth);
      setDisplayedVesselTypeLabelWidth(closedVesselTypeLabelWidth);
      return undefined;
    }

    setDisplayedHarborLabelWidth(closedHarborLabelWidth);
    setDisplayedVesselTypeLabelWidth(closedVesselTypeLabelWidth);

    widthAnimationFrameRef.current = requestAnimationFrame(() => {
      widthAnimationFrameRef.current = null;
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
    harborColumnWidth,
    naturalHarborLabelWidth,
    naturalVesselTypeLabelWidth,
    phase,
    reducedMotion,
    vesselTypeColumnWidth,
  ]);

  const updateColumnLayout = useCallback(async () => {
    const [panelRect, harborButtonRect] = await Promise.all([
      measureNodeInWindow(panelRef.current),
      measureNodeInWindow(harborButtonRef.current),
    ]);

    if (!panelRect || !harborButtonRect) {
      return;
    }

    const harborLeft = Math.max(FILTER_COLUMN_EDGE, harborButtonRect.left - panelRect.left);

    setColumnLayout({
      top: filterColumnTop,
      harborLeft,
      vesselTypeLeft: harborLeft + harborColumnWidth + FILTER_DISCLOSURE_WIDTH + FILTER_BUTTON_GAP,
    });
  }, [filterColumnTop, harborColumnWidth]);

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
    <AppScreenShell
      shellStyle={styles.layer}
      screenStyle={[screenLayoutStyles.screenColumn, styles.filterScreen]}
    >
      <TopBar
        blurViewOptions
        compact={compact}
        harborFilter={harborFilter}
        harborButtonRef={harborButtonRef}
        harborLabelWidth={displayedHarborLabelWidth || undefined}
        inFilterSheet
        onHarborFilterOpen={onClose}
        onSearchOpen={onSearchOpen}
        onToggleCompact={onToggleCompact}
        onVesselTypeFilterOpen={onClose}
        openState={filterOpenState}
        vesselTypeFilter={vesselTypeFilter}
        vesselTypeButtonRef={vesselTypeButtonRef}
        vesselTypeLabelWidth={displayedVesselTypeLabelWidth || undefined}
      />

      <View className="filter-screen__results" style={[styles.resultsShell, styles.pointerEventsNone]}>
        <VesselResults
          compact={compact}
          contentTopPadding={0}
          onImageClick={onImageClick}
          scrollResetKey={filterScrollResetKey}
          style={styles.filterResults}
          vessels={filteredVessels}
        />
      </View>

      <Animated.View className="filter-screen__overlay" style={[styles.overlay, layerAnimatedStyle]}>
        <Pressable
          accessibilityLabel="필터 닫기"
          accessibilityRole="button"
          className="filter-screen__backdrop interaction-reset"
          onPress={onClose}
          style={[styles.backdrop, { backgroundColor: backdropBaseColor }]}
        >
          <LinearGradient
            colors={[backdropTopColor, backdropMidColor]}
            locations={[0, 1]}
            pointerEvents="none"
            style={styles.backdropGradient}
          />
        </Pressable>
      </Animated.View>

      <Animated.View
        className="filter-screen__panel"
        pointerEvents="box-none"
        style={[
          styles.panel,
          styles.pointerEventsBoxNone,
          styles.panelMeasureHost,
          panelAnimatedStyle,
        ]}
        ref={panelRef}
      >
        <View
          className="filter-screen__columns"
          pointerEvents="box-none"
          style={[styles.columns, styles.pointerEventsBoxNone]}
        >
          <View
            className="filter-screen__column"
            style={[
              styles.column,
              {
                top: columnLayout.top,
                left: harborMenuLeft,
              },
            ]}
          >
            {harborOptions.map((option) => (
              <InteractivePressable
                key={option}
                accessibilityRole="button"
                className={`filter-screen__option pressable-control pressable-control--option ${
                  harborFilter === option ? 'filter-screen__option--active' : ''
                }`.trim()}
                onLayout={updateMaxWidth(setHarborOptionWidth)}
                onPress={() => {
                  onHarborSelect(option);
                  onClose();
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
                  className="filter-screen__option-label filter-button__label"
                  numberOfLines={1}
                  style={[styles.optionLabel, harborFilter === option && styles.optionLabelActive]}
                >
                  {option}
                </Text>
              </InteractivePressable>
            ))}
          </View>

          <View
            className="filter-screen__column"
            style={[
              styles.column,
              {
                top: columnLayout.top,
                left: vesselTypeMenuLeft,
              },
            ]}
          >
            {vesselTypeOptions.map((option) => (
              <InteractivePressable
                key={option}
                accessibilityRole="button"
                className={`filter-screen__option pressable-control pressable-control--option ${
                  vesselTypeFilter === option ? 'filter-screen__option--active' : ''
                }`.trim()}
                onLayout={updateMaxWidth(setVesselTypeOptionWidth)}
                onPress={() => {
                  onVesselTypeSelect(option);
                  onClose();
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
                  className="filter-screen__option-label filter-button__label"
                  numberOfLines={1}
                  style={[
                    styles.optionLabel,
                    vesselTypeFilter === option && styles.optionLabelActive,
                  ]}
                >
                  {option}
                </Text>
              </InteractivePressable>
            ))}
          </View>
        </View>
      </Animated.View>

      <View style={[styles.measurements, styles.pointerEventsNone]}>
        <Text onLayout={setMeasuredWidth(setNaturalHarborLabelWidth)} style={styles.measurementFilterLabel}>
          {harborFilter}
        </Text>
        <Text
          onLayout={setMeasuredWidth(setNaturalVesselTypeLabelWidth)}
          style={styles.measurementFilterLabel}
        >
          {vesselTypeFilter}
        </Text>
        <View style={styles.measurementColumn}>
          {harborOptions.map((option) => (
            <Text key={`harbor-measure-${option}`} onLayout={updateMaxWidth(setHarborOptionWidth)} style={styles.optionLabel}>
              {option}
            </Text>
          ))}
        </View>
        <View style={styles.measurementColumn}>
          {vesselTypeOptions.map((option) => (
            <Text
              key={`vessel-type-measure-${option}`}
              onLayout={updateMaxWidth(setVesselTypeOptionWidth)}
              style={styles.optionLabel}
            >
              {option}
            </Text>
          ))}
        </View>
      </View>

      <BottomTab activeTab="db" onDbClick={onClose} onManageClick={onManageOpen} onMenuClick={onMenuOpen} />
    </AppScreenShell>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 5,
  },
  filterScreen: {
    display: 'block',
  },
  resultsShell: {
    position: 'relative',
    minHeight: 'min(calc(100dvh - 40px), var(--screen-height))',
    paddingTop: 108,
    opacity: 0.72,
  },
  filterResults: {
    overflow: 'hidden',
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
  backdropTop: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: '42%',
  },
  backdropMid: {
    position: 'absolute',
    top: '42%',
    right: 0,
    left: 0,
    height: '26%',
  },
  pointerEventsNone: {
    pointerEvents: 'none',
  },
  pointerEventsBoxNone: {
    pointerEvents: 'box-none',
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
  columns: {
    position: 'relative',
    minHeight: '100%',
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
    lineHeight: 23.4,
    fontWeight: '700',
    letterSpacing: -0.36,
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
    letterSpacing: -0.36,
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
});
