import { forwardRef, memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { AppIcon } from '../../components/Icons.jsx';
import { interactiveStyles, getInteractiveScale } from '../../components/interactiveStyles.js';
import { InteractivePressable } from '../../components/primitives/InteractivePressable.jsx';
import { AppText as Text } from '../../components/primitives/AppTypography.jsx';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { isHostElement } from '../../platform/index';
import { measureNodeInWindow } from '../../utils/layout.js';

const VIEW_MODE_TRANSITION_MS = 180;

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
            className="status-icon status-icon--equipment-small"
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
            className="status-icon status-icon--equipment-small"
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

  if (isHostElement(sourceThumbnail)) {
    onImageClick(vessel, sourceThumbnail);
    return;
  }

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
  const imageButtonRef = useRef(null);

  return (
    <View style={styles.vesselCard}>
      <InteractivePressable
        ref={imageButtonRef}
        accessibilityLabel={`${vessel.name} 이미지 확대`}
        accessibilityRole="button"
        className="vessel-card__image-button pressable-control pressable-control--media"
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
        <Image source={{ uri: vessel.imageWide }} style={styles.vesselCardImage} />
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
        className="status-icon status-icon--compact"
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
          className="compact-card__image-button pressable-control pressable-control--media"
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
          <Image source={{ uri: vessel.imageCompact }} style={styles.compactImage} />
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
  return (
    <View style={styles.emptyState}>
      <AppIcon
        className="vessel-empty-state__icon"
        name="sticky_note_2"
        preset="emptyState"
        tone="muted"
      />
      <Text style={styles.emptyStateText}>조건에 맞는 선박을 찾지 못했어요.</Text>
    </View>
  );
}

const VesselResultsBase = forwardRef(function VesselResults(
  {
    chromeScrollbar = false,
    compact,
    hiddenThumbnailId = null,
    onImageClick,
    onScroll,
    scrollResetKey,
    style,
    vessels,
  },
  ref,
) {
  const reducedMotion = useReducedMotionSafe();
  const modeAnimationId = useViewModeTransition(compact, reducedMotion);
  const scrollRef = useRef(null);
  const setScrollRef = useCallback(
    (node) => {
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

  useLayoutEffect(() => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
  }, [scrollResetKey]);

  return (
    <ScrollView
      className={`main-content ${chromeScrollbar ? 'main-content--chrome-scrollbar' : ''}`.trim()}
      ref={setScrollRef}
      contentContainerStyle={styles.mainContentContainer}
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator
      style={[styles.mainContent, chromeScrollbar && styles.mainContentChromeScrollbar, style]}
    >
      <View
        key={`${compact ? 'compact' : 'card'}-${modeAnimationId}`}
      >
        {vessels.length === 0 ? (
          <VesselEmptyState />
        ) : compact ? (
          vessels.map((vessel, index) => (
            <View key={vessel.id}>
              <CompactVesselCard
                hiddenThumbnail={hiddenThumbnailId === vessel.id}
                vessel={vessel}
                onImageClick={handleImageClick}
              />
              {index < vessels.length - 1 ? <View style={styles.sectionDivider} /> : null}
            </View>
          ))
        ) : (
          vessels.map((vessel, index) => (
            <View key={vessel.id}>
              <VesselCard
                hiddenThumbnail={hiddenThumbnailId === vessel.id}
                vessel={vessel}
                onImageClick={handleImageClick}
              />
              {index < vessels.length - 1 ? <View style={styles.sectionDivider} /> : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
});

export const VesselResults = memo(VesselResultsBase);

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    minHeight: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
    msOverflowStyle: 'auto',
    scrollbarWidth: 'auto',
    backgroundColor: 'var(--color-bg-card)',
    paddingTop: 88,
  },
  mainContentChromeScrollbar: {
    marginBottom: 84,
  },
  mainContentContainer: {
    flexGrow: 1,
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
    letterSpacing: -0.36,
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
    objectFit: 'cover',
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
    letterSpacing: -0.72,
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
    overflow: 'hidden',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'var(--color-text-tertiary)',
  },
  equipmentTable: {
    borderColor: 'var(--color-text-violet)',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
  },
  infoCell: {
    height: 38,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: 'var(--color-text-tertiary)',
  },
  equipmentCell: {
    height: 38,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: 'var(--color-text-violet)',
  },
  tableLabelCell: {
    width: 120,
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
  },
  infoBorderRight: {
    borderRightWidth: 1,
    borderRightColor: 'var(--color-text-tertiary)',
  },
  equipmentBorderRight: {
    borderRightWidth: 1,
    borderRightColor: 'var(--color-text-violet)',
  },
  infoTopBorder: {
    borderTopWidth: 1,
    borderTopColor: 'var(--color-text-tertiary)',
  },
  equipmentTopBorder: {
    borderTopWidth: 1,
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
    objectFit: 'cover',
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
