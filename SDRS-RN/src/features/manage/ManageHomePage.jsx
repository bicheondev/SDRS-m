import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../ThemeContext.js';
import { manageHomeSecondaryRows } from '../../assets/assets.js';
import { AppIcon } from '../../components/Icons.jsx';
import { AppScreenShell, screenLayoutStyles } from '../../components/layout/ScreenLayout.jsx';
import { AppText as Text } from '../../components/primitives/AppTypography.jsx';
import { InteractivePressable } from '../../components/primitives/InteractivePressable.jsx';
import { getInteractiveScale, interactiveStyles } from '../../components/interactiveStyles.js';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { motionDurationsMs, motionTokens } from '../../motion.js';
import { pickFile } from '../../services/filePicker.js';

const IOS_EASING = Easing.bezier(...motionTokens.ease.ios);
const ANDROID_CHECKBOX_EASING = Easing.bezier(...motionTokens.ease.stack);
const ANDROID_CHECKBOX_DURATION_MS = 160;
const MODAL_HORIZONTAL_MARGIN = 25;
const MODAL_CARD_WIDTH = 340;
const MODAL_PADDING = 20;

function keepAllWordBreakText(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value
    .split(/(\s+)/)
    .map((token) => (/\s+/.test(token) ? token : Array.from(token).join('\u2060')))
    .join('');
}

function getRowPressableStyle(pressed, focused) {
  return [
    interactiveStyles.base,
    focused && interactiveStyles.focus,
    { transform: [{ scale: pressed ? getInteractiveScale('row') : 1 }] },
  ];
}

function getPressScaleStyle(pressed, kind = 'button', enabled = true) {
  if (!pressed || !enabled) {
    return null;
  }

  return {
    transform: [{ scale: getInteractiveScale(kind) }],
  };
}

function useMountTransition(reducedMotion = false) {
  const frameRef = useRef(null);
  const [isPresented, setIsPresented] = useState(reducedMotion);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    },
    [],
  );

  useLayoutEffect(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (reducedMotion) {
      setIsPresented(true);
      return undefined;
    }

    setIsPresented(false);
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      setIsPresented(true);
    });

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [reducedMotion]);

  return isPresented;
}

function useModalAnimatedStyles(reducedMotion) {
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: reducedMotion ? motionDurationsMs.instant : motionDurationsMs.normal,
      easing: IOS_EASING,
    });
  }, [progress, reducedMotion]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * motionTokens.offset.modalLift },
      {
        scale:
          motionTokens.scale.modalEnter +
          (1 - motionTokens.scale.modalEnter) * progress.value,
      },
    ],
  }));

  const close = useCallback(
    (onClosed) => {
      if (reducedMotion) {
        onClosed?.();
        return;
      }

      progress.value = withTiming(0, {
        duration: motionDurationsMs.normal,
        easing: IOS_EASING,
      }, (finished) => {
        if (finished && onClosed) {
          runOnJS(onClosed)();
        }
      });
    },
    [progress, reducedMotion],
  );

  return { cardStyle, close, scrimStyle };
}

function SectionDivider() {
  return <View style={styles.sectionDivider} />;
}

function DataManagementHomeRow({ label, onPress, tone = 'default', value }) {
  const content = (
    <>
      <Text style={styles.manageHomeLabel}>{label}</Text>
      {value ? (
        <View style={styles.manageHomeValueGroup}>
          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
            style={[styles.manageHomeValue, tone === 'blue' && styles.manageHomeValueBlue]}
          >
            {value}
          </Text>
          <AppIcon
            name="arrow_forward_ios"
            preset="iosArrow"
            tone="muted"
          />
        </View>
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.manageHomeRow}>{content}</View>;
  }

  return (
    <InteractivePressable
      accessibilityRole="button"
      onPress={onPress}
      pressGuideVariant="row"
      style={({ focused, pressed }) => [styles.manageHomeRow, ...getRowPressableStyle(pressed, focused)]}
    >
      {content}
    </InteractivePressable>
  );
}

function ImportCheckboxIcon({ checked }) {
  const reducedMotion = useReducedMotionSafe();
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, {
      duration: reducedMotion ? motionDurationsMs.instant : ANDROID_CHECKBOX_DURATION_MS,
      easing: ANDROID_CHECKBOX_EASING,
    });
  }, [checked, progress, reducedMotion]);

  const uncheckedStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: 0.84 + 0.16 * (1 - progress.value) }],
  }));

  const checkedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.84 + 0.16 * progress.value }],
  }));

  return (
    <Animated.View style={styles.importCheckboxIcon}>
      <Animated.View style={[styles.importCheckboxIconLayer, uncheckedStyle]}>
        <AppIcon
          name="check_box_outline_blank"
          preset="checkbox"
          style={styles.importCheckboxSymbol}
          tone="muted"
        />
      </Animated.View>
      <Animated.View style={[styles.importCheckboxIconLayer, checkedStyle]}>
        <AppIcon
          name="check_box"
          preset="checkbox"
          style={styles.importCheckboxSymbol}
          tone="accent"
        />
      </Animated.View>
    </Animated.View>
  );
}

function ManageAlertModal({
  cancelLabel = '아니요',
  confirmLabel = '네',
  confirmTone = 'danger',
  copy = '저장되지 않은 사항은 모두 삭제돼요.\n진행하시겠어요?',
  hideCancel = false,
  onCancel,
  onConfirm,
  title = '경고 사항',
}) {
  const reducedMotion = useReducedMotionSafe();
  const { width: windowWidth } = useWindowDimensions();
  const modalAnimatedStyles = useModalAnimatedStyles(reducedMotion);
  const modalCardWidth = Math.max(
    0,
    Math.min(MODAL_CARD_WIDTH, windowWidth - MODAL_HORIZONTAL_MARGIN * 2),
  );

  return (
    <View style={styles.modalShell}>
      <Animated.View
        style={[
          styles.modalScrim,
          modalAnimatedStyles.scrimStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.modalCard,
          { width: modalCardWidth },
          modalAnimatedStyles.cardStyle,
        ]}
      >
        <Text style={styles.modalTitle}>{keepAllWordBreakText(title)}</Text>
        <Text style={styles.modalCopy}>{keepAllWordBreakText(copy)}</Text>
        <View style={styles.modalActions}>
          {!hideCancel ? (
            <InteractivePressable
              accessibilityRole="button"
              onPress={onCancel}
              pressGuideVariant="surface"
              style={({ pressed }) => [
                styles.modalButton,
                styles.modalButtonGhost,
                getPressScaleStyle(pressed, 'button'),
              ]}
            >
              <Text style={styles.modalButtonGhostLabel}>
                {keepAllWordBreakText(cancelLabel)}
              </Text>
            </InteractivePressable>
          ) : null}
          <InteractivePressable
            accessibilityRole="button"
            onPress={onConfirm}
            pressGuideVariant="filled"
            style={({ pressed }) => [
              styles.modalButton,
              confirmTone === 'danger' ? styles.modalButtonDanger : styles.modalButtonNeutral,
              getPressScaleStyle(pressed, 'button'),
            ]}
          >
            <Text style={styles.modalButtonLabel}>{keepAllWordBreakText(confirmLabel)}</Text>
          </InteractivePressable>
        </View>
      </Animated.View>
    </View>
  );
}

function ManageShipImportModal({
  onDismiss,
  onKeepExisting,
  onReplaceAll,
  onReplaceSameRegistrationChange,
  replaceSameRegistration = true,
}) {
  const reducedMotion = useReducedMotionSafe();
  const { width: windowWidth } = useWindowDimensions();
  const modalAnimatedStyles = useModalAnimatedStyles(reducedMotion);
  const dismissingRef = useRef(false);
  const modalCardWidth = Math.max(
    0,
    Math.min(MODAL_CARD_WIDTH, windowWidth - MODAL_HORIZONTAL_MARGIN * 2),
  );
  const handleDismiss = useCallback(() => {
    if (dismissingRef.current) {
      return;
    }

    dismissingRef.current = true;
    modalAnimatedStyles.close(onDismiss);
  }, [modalAnimatedStyles, onDismiss]);

  return (
    <View style={styles.modalShell}>
      <Animated.View
        style={[
          styles.modalScrimButton,
          modalAnimatedStyles.scrimStyle,
        ]}
      >
        <Pressable
          accessibilityLabel="선박 DB 불러오기 닫기"
          accessibilityRole="button"
          onPress={handleDismiss}
          style={styles.modalScrimPressable}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.modalCard,
          { width: modalCardWidth },
          modalAnimatedStyles.cardStyle,
        ]}
      >
        <View style={styles.importContent}>
          <View style={styles.importHeader}>
            <Text style={styles.modalTitle}>{keepAllWordBreakText('선박 DB 불러오기')}</Text>
            <Text style={styles.modalCopy}>
              {keepAllWordBreakText('기존에 있던 데이터는 삭제할까요?')}
            </Text>
          </View>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: replaceSameRegistration }}
            onPress={() => onReplaceSameRegistrationChange(!replaceSameRegistration)}
            style={styles.importCheckboxRow}
          >
            <ImportCheckboxIcon checked={replaceSameRegistration} />
            <Text style={styles.importCheckboxLabel}>
              {keepAllWordBreakText('어선정보가 같은 어선은 대체하기')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.modalActions}>
          <InteractivePressable
            accessibilityRole="button"
            onPress={onReplaceAll}
            pressGuideVariant="surface"
            style={({ pressed }) => [
              styles.modalButton,
              styles.importOverwriteButton,
              getPressScaleStyle(pressed, 'button'),
            ]}
          >
            <Text style={styles.importOverwriteLabel}>
              {keepAllWordBreakText('기존 데이터 삭제')}
            </Text>
          </InteractivePressable>
          <InteractivePressable
            accessibilityRole="button"
            onPress={onKeepExisting}
            pressGuideVariant="filled"
            style={({ pressed }) => [
              styles.modalButton,
              styles.modalButtonNeutral,
              getPressScaleStyle(pressed, 'button'),
            ]}
          >
            <Text style={styles.modalButtonLabel}>
              {keepAllWordBreakText('기존 데이터 유지')}
            </Text>
          </InteractivePressable>
        </View>
      </Animated.View>
    </View>
  );
}

export function ManageHomePage({
  importAlert,
  pendingShipImport,
  rows,
  onExport,
  onImagesImport,
  onImportAlertDismiss,
  onPendingShipImportDismiss,
  onPendingShipImportKeepExisting,
  onPendingShipImportReplaceAll,
  onPendingShipImportReplaceSameRegistrationChange,
  onShipEditOpen,
  onShipImport,
}) {
  useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 0);
  const handleShipImport = useCallback(async () => {
    const file = await pickFile({ accept: '.csv,text/csv' });
    if (file) {
      onShipImport(file);
    }
  }, [onShipImport]);

  const handleImagesImport = useCallback(async () => {
    const file = await pickFile({ accept: '.zip,application/zip' });
    if (file) {
      onImagesImport(file);
    }
  }, [onImagesImport]);

  const primaryRowActions = {
    '선박 DB (.csv)': handleShipImport,
    '이미지 압축 파일 (.zip)': handleImagesImport,
  };

  return (
    <AppScreenShell screenStyle={screenLayoutStyles.screenColumn}>
      <Text style={styles.manageScreenTitle}>데이터 관리</Text>

      <ScrollView
        contentContainerStyle={[
          styles.manageHomeContentBody,
          { paddingBottom: 84 + bottomInset },
        ]}
        showsVerticalScrollIndicator={false}
        style={styles.manageHomeContent}
      >
        <View style={styles.manageHomeGroup}>
          {rows.map((row) => (
            <DataManagementHomeRow
              key={row.label}
              label={row.label}
              onPress={primaryRowActions[row.label]}
              tone={row.tone}
              value={row.value}
            />
          ))}
        </View>

        <SectionDivider />

        <View style={styles.manageHomeGroup}>
          {manageHomeSecondaryRows.map((label) => (
            <DataManagementHomeRow
              key={label}
              label={label}
              onPress={label === '선박 DB 편집하기' ? onShipEditOpen : onExport}
            />
          ))}
        </View>
      </ScrollView>

      {importAlert ? (
        <ManageAlertModal
          title={importAlert.title}
          copy={importAlert.copy}
          confirmLabel="확인"
          confirmTone="neutral"
          hideCancel
          onConfirm={onImportAlertDismiss}
        />
      ) : null}

      {pendingShipImport ? (
        <ManageShipImportModal
          onDismiss={onPendingShipImportDismiss}
          onKeepExisting={onPendingShipImportKeepExisting}
          onReplaceAll={onPendingShipImportReplaceAll}
          onReplaceSameRegistrationChange={onPendingShipImportReplaceSameRegistrationChange}
          replaceSameRegistration={pendingShipImport.replaceSameRegistration}
        />
      ) : null}
    </AppScreenShell>
  );
}

const styles = StyleSheet.create({
  manageScreenTitle: {
    position: 'relative',
    zIndex: 1,
    margin: 0,
    paddingTop: 77,
    paddingHorizontal: 18,
    color: 'var(--slate-700)',
    fontSize: 26,
    fontWeight: '600',
  },
  manageHomeContent: {
    flex: 1,
    minHeight: 0,
    marginTop: 28,
  },
  manageHomeContentBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    alignSelf: 'stretch',
  },
  manageHomeGroup: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    alignSelf: 'stretch',
  },
  manageHomeRow: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 52,
    paddingVertical: 16,
    paddingHorizontal: 24,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  manageHomeLabel: {
    color: 'var(--color-text-tertiary)',
    flexShrink: 0,
    minWidth: 0,
    fontSize: 18,
    fontWeight: '500',
  },
  manageHomeValueGroup: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 12,
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  manageHomeValue: {
    color: 'var(--color-text-tertiary)',
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '400',
  },
  manageHomeValueBlue: {
    color: 'var(--color-accent)',
  },
  sectionDivider: {
    height: 16,
    backgroundColor: 'var(--color-bg-divider)',
  },
  modalShell: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: MODAL_HORIZONTAL_MARGIN,
  },
  modalScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'var(--color-overlay-scrim)',
  },
  modalScrimButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'var(--color-overlay-scrim)',
  },
  modalScrimPressable: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  modalCard: {
    position: 'relative',
    maxWidth: MODAL_CARD_WIDTH,
    borderRadius: 20,
    backgroundColor: 'var(--color-bg-modal)',
    shadowColor: 'var(--slate-700)',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 12,
    padding: MODAL_PADDING,
  },
  modalTitle: {
    color: 'var(--color-text-primary)',
    fontSize: 20,
    fontWeight: '700',
  },
  modalCopy: {
    marginTop: 10,
    color: 'var(--color-text-tertiary)',
    fontSize: 17,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonGhost: {
    backgroundColor: 'var(--color-bg-danger-soft)',
  },
  modalButtonDanger: {
    backgroundColor: 'var(--color-danger-solid)',
  },
  modalButtonNeutral: {
    backgroundColor: 'var(--color-accent-solid)',
  },
  importContent: {
    gap: 18,
  },
  importHeader: {
    gap: 0,
  },
  importCheckboxRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  importCheckboxIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importCheckboxIconLayer: {
    position: 'absolute',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importCheckboxSymbol: {
    height: 24,
    lineHeight: 24,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  importCheckboxLabel: {
    flex: 1,
    color: 'var(--color-text-tertiary)',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  importOverwriteButton: {
    backgroundColor: 'var(--color-bg-accent-soft)',
  },
  modalButtonGhostLabel: {
    color: 'var(--color-text-danger)',
    fontSize: 17,
    fontWeight: '600',
  },
  modalButtonLabel: {
    color: 'var(--color-text-on-accent)',
    fontSize: 17,
    fontWeight: '600',
  },
  importOverwriteLabel: {
    color: 'var(--color-accent-hover)',
    fontSize: 17,
    fontWeight: '600',
  },
});
