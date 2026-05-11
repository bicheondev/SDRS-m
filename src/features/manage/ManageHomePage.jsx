import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { manageHomeSecondaryRows } from '../../assets/assets.js';
import { AppIcon } from '../../components/Icons.jsx';
import { AppScreenShell, screenLayoutStyles } from '../../components/layout/ScreenLayout.jsx';
import { AppText as Text } from '../../components/primitives/AppTypography.jsx';
import { InteractivePressable } from '../../components/primitives/InteractivePressable.jsx';
import { getInteractiveScale, interactiveStyles } from '../../components/interactiveStyles.js';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { motionDurationsMs, motionTokens } from '../../motion.js';
import { pickFile } from '../../services/filePicker.js';

const IOS_EASE = `cubic-bezier(${motionTokens.ease.ios.join(', ')})`;

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
  const isPresented = useMountTransition(reducedMotion);

  return (
    <View className="manage-discard-modal">
      <View
        className="manage-discard-modal__scrim"
        style={[
          {
            opacity: isPresented ? 1 : 0,
            transitionDuration: `${motionDurationsMs.fast}ms`,
            transitionProperty: 'opacity',
            transitionTimingFunction: IOS_EASE,
          },
        ]}
      />
      <View
        className="manage-discard-modal__card"
        style={[
          {
            opacity: isPresented ? 1 : 0,
            transform: [
              { translateY: reducedMotion || isPresented ? 0 : motionTokens.offset.modalLift },
              { scale: reducedMotion || isPresented ? 1 : motionTokens.scale.modalEnter },
            ],
            transitionDuration: `${motionDurationsMs.normal}ms`,
            transitionProperty: 'opacity, transform',
            transitionTimingFunction: IOS_EASE,
          },
        ]}
      >
        <Text className="manage-discard-modal__title">{title}</Text>
        <Text className="manage-discard-modal__copy">{copy}</Text>
        <View className="manage-discard-modal__actions">
          {!hideCancel ? (
            <InteractivePressable
              accessibilityRole="button"
              className="manage-discard-modal__button manage-discard-modal__button--ghost pressable-control pressable-control--surface"
              onPress={onCancel}
              pressGuideVariant="surface"
              style={({ pressed }) => getPressScaleStyle(pressed, 'button')}
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
            style={({ pressed }) => getPressScaleStyle(pressed, 'button')}
          >
            <Text style={styles.modalButtonLabel}>{confirmLabel}</Text>
          </InteractivePressable>
        </View>
      </View>
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
  const isPresented = useMountTransition(reducedMotion);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef(null);
  const isVisible = isPresented && !isClosing;

  useEffect(
    () => () => {
      if (closeTimeoutRef.current !== null) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    },
    [],
  );

  const handleDismiss = useCallback(() => {
    if (isClosing) {
      return;
    }

    if (reducedMotion) {
      onDismiss?.();
      return;
    }

    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      closeTimeoutRef.current = null;
      onDismiss?.();
    }, motionDurationsMs.normal);
  }, [isClosing, onDismiss, reducedMotion]);

  return (
    <View className="manage-discard-modal">
      <Pressable
        accessibilityLabel="선박 DB 불러오기 닫기"
        accessibilityRole="button"
        className="manage-discard-modal__scrim-button interaction-reset"
        onPress={handleDismiss}
        style={[
          {
            opacity: isVisible ? 1 : 0,
            transitionDuration: `${motionDurationsMs.fast}ms`,
            transitionProperty: 'opacity',
            transitionTimingFunction: IOS_EASE,
          },
        ]}
      />
      <View
        className="manage-discard-modal__card"
        style={[
          {
            opacity: isVisible ? 1 : 0,
            transform: [
              { translateY: reducedMotion || isVisible ? 0 : motionTokens.offset.modalLift },
              { scale: reducedMotion || isVisible ? 1 : motionTokens.scale.modalEnter },
            ],
            transitionDuration: `${motionDurationsMs.normal}ms`,
            transitionProperty: 'opacity, transform',
            transitionTimingFunction: IOS_EASE,
          },
        ]}
      >
        <View className="manage-ship-import-modal__content">
          <View className="manage-ship-import-modal__header">
            <Text className="manage-discard-modal__title">선박 DB 불러오기</Text>
            <Text className="manage-discard-modal__copy">기존에 있던 데이터는 삭제할까요?</Text>
          </View>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: replaceSameRegistration }}
            className="manage-ship-import-modal__checkbox-row interaction-reset"
            onPress={() => onReplaceSameRegistrationChange(!replaceSameRegistration)}
          >
            <View
              className={joinClassNames(
                'manage-ship-import-modal__checkbox-icon-wrap',
                replaceSameRegistration
                  ? 'manage-ship-import-modal__checkbox-icon-wrap--checked'
                  : 'manage-ship-import-modal__checkbox-icon-wrap--unchecked',
              )}
            >
              <AppIcon
                className="manage-ship-import-modal__checkbox-icon manage-ship-import-modal__checkbox-icon--unchecked"
                name="check_box_outline_blank"
                preset="checkbox"
                tone="muted"
              />
              <AppIcon
                className="manage-ship-import-modal__checkbox-icon manage-ship-import-modal__checkbox-icon--checked"
                name="check_box"
                preset="checkbox"
                tone="accent"
              />
            </View>
            <Text className="manage-ship-import-modal__checkbox-label">어선정보가 같은 어선은 대체하기</Text>
          </Pressable>
        </View>

        <View className="manage-discard-modal__actions">
          <InteractivePressable
            accessibilityRole="button"
            className="manage-discard-modal__button manage-ship-import-modal__button manage-ship-import-modal__button--overwrite pressable-control pressable-control--surface"
            onPress={onReplaceAll}
            pressGuideVariant="surface"
            style={({ pressed }) => getPressScaleStyle(pressed, 'button')}
          >
            <Text style={styles.importOverwriteLabel}>기존 데이터 삭제</Text>
          </InteractivePressable>
          <InteractivePressable
            accessibilityRole="button"
            className="manage-discard-modal__button manage-ship-import-modal__button manage-ship-import-modal__button--keep pressable-control pressable-control--filled"
            onPress={onKeepExisting}
            pressGuideVariant="filled"
            style={({ pressed }) => getPressScaleStyle(pressed, 'button')}
          >
            <Text style={styles.modalButtonLabel}>기존 데이터 유지</Text>
          </InteractivePressable>
        </View>
      </View>
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
        contentContainerStyle={styles.manageHomeContentBody}
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
    transitionDuration: `${motionDurationsMs.fast}ms`,
    transitionProperty: 'opacity, transform',
    transitionTimingFunction: IOS_EASE,
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
    paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))',
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
