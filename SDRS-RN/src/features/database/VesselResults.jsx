import { forwardRef, memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FlatList, Image, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../ThemeContext.js';
import { AppIcon } from '../../components/Icons.jsx';
import { NoImagePlaceholder } from '../../components/NoImagePlaceholder.jsx';
import { interactiveStyles, getInteractiveScale } from '../../components/interactiveStyles.js';
import { InteractivePressable } from '../../components/primitives/InteractivePressable.jsx';
import { AppText as Text } from '../../components/primitives/AppTypography.jsx';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { motionTokens } from '../../motion.js';
import { isPlaceholderImage } from '../../appDomain.js';
import { measureNodeInWindow } from '../../utils/layout.js';

const VIEW_MODE_TRANSITION_MS = 180;
const VIEW_MODE_EASING = Easing.bezier(...motionTokens.ease.ios);

function isObjectLike(value) {
  return (typeof value === 'object' || typeof value === 'function') && value !== null;
}

function getScrollableNode(node) {
  if (!isObjectLike(node)) {
    return null;
  }

  return node.getScrollableNode?.() ?? node.getScrollableRef?.() ?? node;
}

function scrollNodeToY(node, y) {
  if (!node) {
    return;
  }

  const scrollableNode = getScrollableNode(node);

  if (isObjectLike(scrollableNode) && 'scrollTop' in scrollableNode) {
    scrollableNode.scrollTop = y;
  }

  if (isObjectLike(node) && typeof node.scrollToOffset === 'function') {
    try {
      node.scrollToOffset({ offset: y, animated: false });
      return;
    } catch {
      // Some scroll targets use the ScrollView-style overload below.
    }
  }

  if (isObjectLike(node) && typeof node.scrollTo === 'function') {
    try {
      node.scrollTo({ y, animated: false });
    } catch {
      // Some scroll targets use the browser-style overload below.
    }
  }

  if (
    isObjectLike(scrollableNode) &&
    scrollableNode !== node &&
    typeof scrollableNode.scrollTo === 'function'
  ) {
    try {
      scrollableNode.scrollTo({ top: y, left: 0, behavior: 'auto' });
    } catch {
      // Native scroll refs may not accept DOM-style scroll options.
    }
  }
}

function VesselImage({ imageSource, style }) {
  if (isPlaceholderImage(imageSource)) {
    return <NoImagePlaceholder style={style} />;
  }

  return <Image resizeMode="cover" source={{ uri: imageSource }} style={style} />;
}

function useViewModeTransition(compact, reducedMotion) {
  const previousCompactRef = useRef(compact);
  const timeoutRef = useRef(null);
  const [animationId, setAnimationId] = useState(0);

  useEffect(() => {
    if (previousCompactRef.current === compact) {
      return undefined;
    }

    previousCompactRef.current = compact;

    if (reducedMotion) {
      setAnimationId(0);
      return undefined;
    }

    setAnimationId((current) => current + 1);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
    }, VIEW_MODE_TRANSITION_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [compact, reducedMotion]);

  return reducedMotion ? 0 : animationId;
}

function InfoTable({ vessel }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <View
          style={[
            styles.infoCell,
            styles.tableLabelCell,
            styles.infoLabelCell,
            styles.infoBorderRight,
          ]}
        >
          <Text style={[styles.tableText, styles.tableLabelText]}>항포구</Text>
        </View>
        <View style={[styles.infoCell, styles.tableValueCell, styles.infoValueCell]}>
          <Text style={[styles.tableText, styles.tableValueText]}>{vessel.port}</Text>
        </View>
      </View>
      <View style={styles.tableRow}>
        <View
          style={[
            styles.infoCell,
            styles.tableLabelCell,
            styles.infoLabelCell,
            styles.infoBorderRight,
            styles.infoTopBorder,
          ]}
        >
          <Text style={[styles.tableText, styles.tableLabelText]}>업종</Text>
        </View>
        <View
          style={[styles.infoCell, styles.tableValueCell, styles.infoValueCell, styles.infoTopBorder]}
        >
          <Text style={[styles.tableText, styles.tableValueText]}>{vessel.business}</Text>
        </View>
      </View>
      <View style={styles.tableRow}>
        <View
          style={[
            styles.infoCell,
            styles.tableLabelCell,
            styles.infoLabelCell,
            styles.infoBorderRight,
            styles.infoTopBorder,
          ]}
        >
          <Text style={[styles.tableText, styles.tableLabelText]}>총톤수</Text>
        </View>
        <View
          style={[styles.infoCell, styles.tableValueCell, styles.infoValueCell, styles.infoTopBorder]}
        >
          <Text style={[styles.tableText, styles.tableValueText]}>{vessel.tonnage}</Text>
        </View>
      </View>
    </View>
  );
}

function EquipmentTable({ vessel }) {
  return (
    <View style={[styles.table, styles.equipmentTable]}>
      <View style={styles.tableRow}>
        <View
          style={[
            styles.equipmentCell,
            styles.tableLabelCell,
            styles.equipmentLabelCell,
            styles.equipmentBorderRight,
          ]}
        >
          <Text style={[styles.tableText, styles.equipmentLabelText]}>소나</Text>
        </View>
        <View style={[styles.equipmentCell, styles.tableValueCell, styles.equipmentValueCell]}>
          <AppIcon
            name={vessel.sonar ? 'check' : 'close'}
            preset="statusSmall"
            tone="violet"
          />
        </View>
      </View>
      <View style={styles.tableRow}>
        <View
          style={[
            styles.equipmentCell,
            styles.tableLabelCell,
            styles.equipmentLabelCell,
            styles.equipmentBorderRight,
            styles.equipmentTopBorder,
          ]}
        >
          <Text style={[styles.tableText, styles.equipmentLabelText]}>어군 탐지기</Text>
        </View>
        <View
          style={[
            styles.equipmentCell,
            styles.tableValueCell,
            styles.equipmentValueCell,
            styles.equipmentTopBorder,
          ]}
        >
          <AppIcon
            name={vessel.detector ? 'check' : 'close'}
            preset="statusSmall"
            tone="violet"
          />
        </View>
      </View>
    </View>
  );
}

async function handleImagePress(buttonRef, vessel, onImageClick) {
  const sourceThumbnail = buttonRef.current;
  const rect = await measureNodeInWindow(sourceThumbnail);

  onImageClick(vessel, rect
    ? {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }
    : null);
}

export const VesselCard = memo(function VesselCard({ hiddenThumbnail = false, vessel, onImageClick }) {
  useTheme();
  const imageButtonRef = useRef(null);

  return (
    <View style={styles.vesselCard}>
      <InteractivePressable
        ref={imageButtonRef}
        accessibilityLabel={`${vessel.name} 이미지 확대`}
        accessibilityRole="button"
        dataSet={{ vesselThumbId: String(vessel.id) }}
        onPress={() => handleImagePress(imageButtonRef, vessel, onImageClick)}
        pressGuideVariant="media"
        style={({ focused, pressed }) => [
          interactiveStyles.base,
          styles.cardImageButton,
          hiddenThumbnail && styles.hiddenThumbnail,
          focused && interactiveStyles.focus,
          { transform: [{ scale: pressed ? getInteractiveScale('card') : 1 }] },
        ]}
      >
        <VesselImage imageSource={vessel.imageWide} style={styles.vesselCardImage} />
      </InteractivePressable>

      <View style={styles.vesselCardBody}>
        <View style={styles.vesselCardHeader}>
          <Text style={styles.vesselName}>{vessel.name}</Text>
          <Text style={styles.registration}>{vessel.registration}</Text>
        </View>

        <View style={styles.vesselTables}>
          <InfoTable vessel={vessel} />
          <EquipmentTable vessel={vessel} />
        </View>
      </View>
    </View>
  );
});

function CompactRow({ label, value }) {
  return (
    <View style={styles.compactDetailRow}>
      <Text style={styles.compactDetailLabel}>{label}</Text>
      <Text style={styles.compactDetailValue}>{value}</Text>
    </View>
  );
}

function CompactEquipment({ active, label }) {
  return (
    <View style={styles.compactEquipmentItem}>
      <Text style={[styles.compactEquipmentLabel, active && styles.compactEquipmentLabelActive]}>
        {label}
      </Text>
      <AppIcon
        name={active ? 'check' : 'close'}
        preset="statusCompact"
        tone={active ? 'violet' : 'violet-muted'}
      />
    </View>
  );
}

export const CompactVesselCard = memo(function CompactVesselCard({
  hiddenThumbnail = false,
  vessel,
  onImageClick,
}) {
  useTheme();
  const imageButtonRef = useRef(null);

  return (
    <View style={styles.compactCard}>
      <View style={styles.compactSummary}>
        <View style={styles.compactTitleGroup}>
          <Text style={styles.vesselName}>{vessel.name}</Text>
          <Text style={styles.registration}>{vessel.registration}</Text>
        </View>
        <InteractivePressable
          ref={imageButtonRef}
          accessibilityLabel={`${vessel.name} 이미지 확대`}
          accessibilityRole="button"
          dataSet={{ vesselThumbId: String(vessel.id) }}
          onPress={() => handleImagePress(imageButtonRef, vessel, onImageClick)}
          pressGuideVariant="media"
          style={({ focused, pressed }) => [
            interactiveStyles.base,
            styles.compactImageButton,
            hiddenThumbnail && styles.hiddenThumbnail,
            focused && interactiveStyles.focus,
            { transform: [{ scale: pressed ? getInteractiveScale('card') : 1 }] },
          ]}
        >
          <VesselImage imageSource={vessel.imageCompact} style={styles.compactImage} />
        </InteractivePressable>
      </View>

      <View style={styles.compactDetails}>
        <CompactRow label="항포구" value={vessel.port} />
        <CompactRow label="업종" value={vessel.business} />
        <CompactRow label="총톤수" value={vessel.tonnage} />
      </View>

      <View style={styles.compactDivider} />

      <View style={styles.compactEquipment}>
        <CompactEquipment label="소나" active={vessel.sonar} />
        <CompactEquipment label="어군 탐지기" active={vessel.detector} />
      </View>
    </View>
  );
});

export function VesselEmptyState() {
  useTheme();
  return (
    <View style={styles.emptyState}>
      <AppIcon
        name="sticky_note_2"
        preset="emptyState"
        tone="muted"
      />
      <Text style={styles.emptyStateText}>조건에 맞는 선박을 찾지 못했어요.</Text>
    </View>
  );
}

function ResultsSeparator() {
  return <View style={styles.sectionDivider} />;
}

function getVesselKey(vessel) {
  return String(vessel.id);
}

const VesselResultsBase = forwardRef(function VesselResults(
  {
    compact,
    contentBottomPadding = 0,
    contentTopPadding = 88,
    hiddenThumbnailId = null,
    initialScrollY = 0,
    onImageClick,
    onScroll,
    scrollResetKey,
    style,
    vessels,
  },
  ref,
) {
  useTheme();
  const reducedMotion = useReducedMotionSafe();
  const modeAnimationId = useViewModeTransition(compact, reducedMotion);
  const modeProgress = useSharedValue(1);
  const scrollRef = useRef(null);
  const mountedRef = useRef(false);
  const scrollGenerationRef = useRef(0);
  const setScrollRef = useCallback(
    (node) => {
      scrollGenerationRef.current += 1;
      scrollRef.current = node;

      if (typeof ref === 'function') {
        ref(node);
        return;
      }

      if (ref) {
        ref.current = node;
      }
    },
    [ref],
  );

  const handleImageClick = useCallback(
    (selectedVessel, sourceRect) => {
      onImageClick(selectedVessel, vessels, sourceRect);
    },
    [onImageClick, vessels],
  );
  const renderVesselItem = useCallback(
    ({ item }) => (
      compact ? (
        <CompactVesselCard
          hiddenThumbnail={hiddenThumbnailId === item.id}
          vessel={item}
          onImageClick={handleImageClick}
        />
      ) : (
        <VesselCard
          hiddenThumbnail={hiddenThumbnailId === item.id}
          vessel={item}
          onImageClick={handleImageClick}
        />
      )
    ),
    [compact, handleImageClick, hiddenThumbnailId],
  );

  const initialScrollAppliedRef = useRef(false);
  const initialScrollFrameRef = useRef(null);

  useLayoutEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      scrollGenerationRef.current += 1;
      scrollRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const targetY = initialScrollAppliedRef.current ? 0 : initialScrollY;
    const shouldReapplyInitialScroll = !initialScrollAppliedRef.current && targetY > 0;
    const scrollGeneration = scrollGenerationRef.current;
    initialScrollAppliedRef.current = true;

    if (initialScrollFrameRef.current !== null) {
      cancelAnimationFrame(initialScrollFrameRef.current);
      initialScrollFrameRef.current = null;
    }

    const scrollCurrentNodeToTarget = () => {
      if (!mountedRef.current || scrollGenerationRef.current !== scrollGeneration) {
        return;
      }

      scrollNodeToY(scrollRef.current, targetY);
    };

    scrollCurrentNodeToTarget();

    if (shouldReapplyInitialScroll) {
      initialScrollFrameRef.current = requestAnimationFrame(() => {
        scrollCurrentNodeToTarget();
        initialScrollFrameRef.current = requestAnimationFrame(() => {
          scrollCurrentNodeToTarget();
          initialScrollFrameRef.current = null;
        });
      });
    }

    return () => {
      if (initialScrollFrameRef.current !== null) {
        cancelAnimationFrame(initialScrollFrameRef.current);
        initialScrollFrameRef.current = null;
      }
    };
  }, [initialScrollY, scrollResetKey]);

  useEffect(() => {
    if (reducedMotion || modeAnimationId === 0) {
      modeProgress.value = 1;
      return;
    }

    modeProgress.value = 0;
    modeProgress.value = withTiming(1, {
      duration: VIEW_MODE_TRANSITION_MS,
      easing: VIEW_MODE_EASING,
    });
  }, [modeAnimationId, modeProgress, reducedMotion]);

  const modeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 0.76 + modeProgress.value * 0.24,
    transform: [
      { translateY: (1 - modeProgress.value) * motionTokens.offset.tabLift },
      { scale: 0.996 + modeProgress.value * 0.004 },
    ],
  }));

  return (
    <Animated.View
      key={`${compact ? 'compact' : 'card'}-${modeAnimationId}`}
      style={[styles.resultsMode, modeAnimatedStyle]}
    >
      <FlatList
        ref={setScrollRef}
        contentOffset={initialScrollY ? { x: 0, y: initialScrollY } : undefined}
        contentContainerStyle={[
          styles.mainContentContainer,
          {
            paddingTop: contentTopPadding,
            paddingBottom: contentBottomPadding,
          },
        ]}
        data={vessels}
        extraData={hiddenThumbnailId}
        initialNumToRender={compact ? 8 : 4}
        ItemSeparatorComponent={ResultsSeparator}
        keyExtractor={getVesselKey}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={VesselEmptyState}
        maxToRenderPerBatch={compact ? 8 : 4}
        onScroll={onScroll}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={renderVesselItem}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator
        style={[
          styles.mainContent,
          style,
        ]}
        updateCellsBatchingPeriod={32}
        windowSize={compact ? 7 : 5}
      />
    </Animated.View>
  );
});

export const VesselResults = memo(VesselResultsBase);

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'var(--color-bg-card)',
  },
  mainContentContainer: {
    flexGrow: 1,
  },
  resultsMode: {
    flex: 1,
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
    paddingVertical: 24,
    paddingHorizontal: 18,
    paddingBottom: 96,
  },
  emptyStateText: {
    color: 'var(--color-text-muted)',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionDivider: {
    height: 16,
    backgroundColor: 'var(--color-bg-divider)',
  },
  hiddenThumbnail: {
    opacity: 0,
  },
  vesselCard: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  cardImageButton: {
    width: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  vesselCardImage: {
    width: '100%',
    height: 180,
    borderRadius: 6,
  },
  vesselCardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  vesselCardHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vesselName: {
    color: 'var(--slate-700)',
    fontSize: 24,
    fontWeight: '600',
  },
  registration: {
    color: 'var(--color-text-tertiary)',
    fontSize: 15,
    fontWeight: '400',
  },
  vesselTables: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  table: {
    alignSelf: 'stretch',
    overflow: 'hidden',
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'var(--color-text-tertiary)',
  },
  equipmentTable: {
    borderColor: 'var(--color-text-violet)',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    alignSelf: 'stretch',
    minHeight: 38,
  },
  infoCell: {
    height: 38,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 0,
    paddingHorizontal: 12,
    color: 'var(--color-text-tertiary)',
  },
  equipmentCell: {
    height: 38,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 0,
    paddingHorizontal: 12,
    color: 'var(--color-text-violet)',
  },
  tableLabelCell: {
    flexBasis: 120,
    flexGrow: 0,
    flexShrink: 0,
  },
  infoLabelCell: {
    backgroundColor: 'var(--slate-50)',
  },
  infoValueCell: {
    backgroundColor: 'var(--color-bg-surface-elevated)',
  },
  equipmentLabelCell: {
    backgroundColor: 'var(--color-bg-violet-soft)',
  },
  equipmentValueCell: {
    backgroundColor: 'var(--color-bg-surface-elevated)',
  },
  tableValueCell: {
    flex: 1,
    minWidth: 0,
  },
  infoBorderRight: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'var(--color-text-tertiary)',
  },
  equipmentBorderRight: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'var(--color-text-violet)',
  },
  infoTopBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'var(--color-text-tertiary)',
  },
  equipmentTopBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'var(--color-text-violet)',
  },
  tableText: {
    fontSize: 15,
    textAlign: 'left',
  },
  tableLabelText: {
    color: 'var(--color-text-tertiary)',
    fontWeight: '600',
  },
  tableValueText: {
    color: 'var(--color-text-tertiary)',
    fontWeight: '500',
  },
  equipmentLabelText: {
    color: 'var(--color-text-violet)',
    fontWeight: '600',
  },
  compactCard: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  compactSummary: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactTitleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  compactImageButton: {
    width: 150,
    flexShrink: 0,
    borderRadius: 6,
    overflow: 'hidden',
  },
  compactImage: {
    width: 150,
    height: 90,
    borderRadius: 6,
  },
  compactDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  compactDetailRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  compactDetailLabel: {
    width: 126,
    color: 'var(--color-text-tertiary)',
    fontSize: 18,
    fontWeight: '600',
  },
  compactDetailValue: {
    color: 'var(--color-text-tertiary)',
    fontSize: 18,
    fontWeight: '500',
  },
  compactDivider: {
    height: 1,
    width: '100%',
    backgroundColor: 'var(--color-border-subtle)',
  },
  compactEquipment: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactEquipmentItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactEquipmentLabel: {
    width: 126,
    color: 'var(--color-text-violet-muted)',
    fontSize: 18,
    fontWeight: '600',
  },
  compactEquipmentLabelActive: {
    color: 'var(--color-text-violet)',
  },
});
