import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
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
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function joinClassNames(...tokens) {
  return tokens.filter(Boolean).join(' ');
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

  return { cardStyle, scrimStyle };
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
          <Text style={[styles.manageHomeValue, tone === 'blue' && styles.manageHomeValueBlue]}>
            {value}
          </Text>
          <AppIcon
            className="manage-home__chevron"
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
      className="manage-home__row manage-home__row--button pressable-control pressable-control--surface"
      onPress={onPress}
      pressGuideVariant="row"
      style={({ focused, pressed }) => [styles.manageHomeRow, ...getRowPressableStyle(pressed, focused)]}
    >
      {content}
    </InteractivePressable>
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
  const modalAnimatedStyles = useModalAnimatedStyles(reducedMotion);

  return (
    <View className="manage-discard-modal" style={styles.modalShell}>
      <Animated.View
        className="manage-discard-modal__scrim"
        style={[
          styles.modalScrim,
          modalAnimatedStyles.scrimStyle,
        ]}
      />
      <Animated.View
        className="manage-discard-modal__card"
        style={[
          styles.modalCard,
          modalAnimatedStyles.cardStyle,
        ]}
      >
        <Text className="manage-discard-modal__title" style={styles.modalTitle}>{title}</Text>
        <Text className="manage-discard-modal__copy" style={styles.modalCopy}>{copy}</Text>
        <View className="manage-discard-modal__actions" style={styles.modalActions}>
          {!hideCancel ? (
            <InteractivePressable
              accessibilityRole="button"
              className="manage-discard-modal__button manage-discard-modal__button--ghost pressable-control pressable-control--surface"
              onPress={onCancel}
              pressGuideVariant="surface"
              style={({ pressed }) => [
                styles.modalButton,
                styles.modalButtonGhost,
                getPressScaleStyle(pressed, 'button'),
              ]}
            >
              <Text style={styles.modalButtonGhostLabel}>{cancelLabel}</Text>
            </InteractivePressable>
          ) : null}
          <InteractivePressable
            accessibilityRole="button"
            className={joinClassNames(
              'manage-discard-modal__button',
              confirmTone === 'danger'
                ? 'manage-discard-modal__button--danger'
                : 'manage-discard-modal__button--neutral',
              'pressable-control',
              'pressable-control--filled',
            )}
            onPress={onConfirm}
            pressGuideVariant="filled"
            style={({ pressed }) => [
              styles.modalButton,
              confirmTone === 'danger' ? styles.modalButtonDanger : styles.modalButtonNeutral,
              getPressScaleStyle(pressed, 'button'),
            ]}
          >
            <Text style={styles.modalButtonLabel}>{confirmLabel}</Text>
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
  const modalAnimatedStyles = useModalAnimatedStyles(reducedMotion);

  return (
    <View className="manage-discard-modal" style={styles.modalShell}>
      <AnimatedPressable
        accessibilityLabel="선박 DB 불러오기 닫기"
        accessibilityRole="button"
        className="manage-discard-modal__scrim-button interaction-reset"
        onPress={onDismiss}
        style={[
          styles.modalScrimButton,
          modalAnimatedStyles.scrimStyle,
        ]}
      />
      <Animated.View
        className="manage-discard-modal__card"
        style={[
          styles.modalCard,
          modalAnimatedStyles.cardStyle,
        ]}
      >
        <View className="manage-ship-import-modal__content" style={styles.importContent}>
          <View className="manage-ship-import-modal__header" style={styles.importHeader}>
            <Text className="manage-discard-modal__title" style={styles.modalTitle}>선박 DB 불러오기</Text>
            <Text className="manage-discard-modal__copy" style={styles.modalCopy}>기존에 있던 데이터는 삭제할까요?</Text>
          </View>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: replaceSameRegistration }}
            className="manage-ship-import-modal__checkbox-row interaction-reset"
            onPress={() => onReplaceSameRegistrationChange(!replaceSameRegistration)}
            style={styles.importCheckboxRow}
          >
            <View
              className={joinClassNames(
                'manage-ship-import-modal__checkbox-box',
                replaceSameRegistration && 'manage-ship-import-modal__checkbox-box--checked',
              )}
              style={[
                styles.importCheckboxBox,
                replaceSameRegistration && styles.importCheckboxBoxChecked,
              ]}
            >
              {replaceSameRegistration ? (
                <AppIcon
                  className="manage-ship-import-modal__checkbox-icon"
                  name="check_small"
                  preset="checkbox"
                  tone="on-accent"
                />
              ) : null}
            </View>
            <Text className="manage-ship-import-modal__checkbox-label" style={styles.importCheckboxLabel}>어선정보가 같은 어선은 대체하기</Text>
          </Pressable>
        </View>

        <View className="manage-discard-modal__actions" style={styles.modalActions}>
          <InteractivePressable
            accessibilityRole="button"
            className="manage-discard-modal__button manage-ship-import-modal__button manage-ship-import-modal__button--overwrite pressable-control pressable-control--surface"
            onPress={onReplaceAll}
            pressGuideVariant="surface"
            style={({ pressed }) => [
              styles.modalButton,
              styles.importOverwriteButton,
              getPressScaleStyle(pressed, 'button'),
            ]}
          >
            <Text style={styles.importOverwriteLabel}>기존 데이터 삭제</Text>
          </InteractivePressable>
          <InteractivePressable
            accessibilityRole="button"
            className="manage-discard-modal__button manage-ship-import-modal__button manage-ship-import-modal__button--keep pressable-control pressable-control--filled"
            onPress={onKeepExisting}
            pressGuideVariant="filled"
            style={({ pressed }) => [
              styles.modalButton,
              styles.modalButtonNeutral,
              getPressScaleStyle(pressed, 'button'),
            ]}
          >
            <Text style={styles.modalButtonLabel}>기존 데이터 유지</Text>
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
    lineHeight: 33.8,
    fontWeight: '600',
    letterSpacing: -0.78,
  },
  manageHomeContent: {
    flex: 1,
    minHeight: 0,
    marginTop: 28,
    msOverflowStyle: 'none',
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  manageHomeContentBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  manageHomeGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  manageHomeRow: {
    width: '100%',
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
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.36,
  },
  manageHomeValueGroup: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  manageHomeValue: {
    color: 'var(--color-text-tertiary)',
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: -0.36,
    whiteSpace: 'nowrap',
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
    paddingHorizontal: 25,
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
  modalCard: {
    position: 'relative',
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    backgroundColor: 'var(--color-bg-modal)',
    boxShadow: 'var(--shadow-modal)',
    shadowColor: 'var(--slate-700)',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 12,
    padding: 20,
  },
  modalTitle: {
    color: 'var(--color-text-primary)',
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  modalCopy: {
    marginTop: 10,
    color: 'var(--color-text-tertiary)',
    fontSize: 17,
    lineHeight: 21.75,
    fontWeight: '500',
    letterSpacing: -0.34,
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
    gap: 10,
  },
  importCheckboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'var(--color-border-subtle)',
    backgroundColor: 'var(--color-bg-surface)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  importCheckboxBoxChecked: {
    borderColor: 'var(--color-accent-solid)',
    backgroundColor: 'var(--color-accent-solid)',
  },
  importCheckboxLabel: {
    flex: 1,
    color: 'var(--color-text-tertiary)',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.32,
  },
  importOverwriteButton: {
    backgroundColor: 'var(--color-bg-accent-soft)',
  },
  modalButtonGhostLabel: {
    color: 'var(--color-text-danger)',
    fontSize: 17,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.34,
  },
  modalButtonLabel: {
    color: 'var(--color-text-on-accent)',
    fontSize: 17,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.34,
  },
  importOverwriteLabel: {
    color: 'var(--color-accent-hover)',
    fontSize: 17,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.34,
  },
});
