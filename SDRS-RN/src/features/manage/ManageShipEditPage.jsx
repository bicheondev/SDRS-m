import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  LayoutAnimation,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput as ReactNativeTextInput,
  UIManager,
  useWindowDimensions,
  Vibration,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../ThemeContext.js';
import { emptyManageShipCard, isPlaceholderImage } from '../../appDomain.js';
import { AppIcon } from '../../components/Icons.jsx';
import { NoImagePlaceholder } from '../../components/NoImagePlaceholder.jsx';
import { interactiveStyles, getInteractiveScale } from '../../components/interactiveStyles.js';
import { AppScreenShell, screenLayoutStyles } from '../../components/layout/ScreenLayout.jsx';
import { InteractivePressable } from '../../components/primitives/InteractivePressable.jsx';
import { AppText as Text, AppTextInput as TextInput } from '../../components/primitives/AppTypography.jsx';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { motionDurationsMs, motionTokens } from '../../motion.js';
import {
  getElementRectSnapshot,
} from '../../platform/index';
import {
  buildSearchIndex,
  compileSearchQuery,
  matchesCompiledSearchQuery,
} from '../../domain/search.js';
import { pickFile } from '../../services/filePicker.js';
import { resolveCssVariableString } from '../../theme.js';

const IOS_EASING = Easing.bezier(...motionTokens.ease.ios);
const LIST_ITEM_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const MANAGE_EDIT_CONTENT_PADDING_BOTTOM = 24;
const MANAGE_EDIT_REORDER_DIVIDER_HEIGHT = 16;
const REORDER_MOVE_EASING = Easing.bezier(0.16, 1, 0.3, 1);
const REORDER_MOVE_MS = 240;
const REORDER_MOVE_REDUCED_MS = 90;
const MANAGE_ITEM_ADD_MS = 220;
const MANAGE_ITEM_ADD_REDUCED_MS = 160;
const MANAGE_ITEM_REMOVE_MS = 140;
const MANAGE_ITEM_REMOVE_REDUCED_MS = 100;
const REORDER_AUTO_SCROLL_EDGE_PX = 88;
const REORDER_AUTO_SCROLL_MAX_STEP_PX = 24;
const MODAL_HORIZONTAL_MARGIN = 25;
const MODAL_CONTENT_WIDTH = 300;
const MODAL_PADDING = 20;
const MODAL_TOTAL_WIDTH = MODAL_CONTENT_WIDTH + MODAL_PADDING * 2;
const ADD_SCROLL_MAX_ATTEMPTS = 18;
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const WEB_TOAST_BLUR_STYLE = Platform.OS === 'web'
  ? {
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    }
  : null;
const WEB_BACKDROP_SCROLL_STYLE = Platform.OS === 'web'
  ? { transform: 'none' }
  : null;

function dismissNativeKeyboard() {
  ReactNativeTextInput.State?.currentlyFocusedInput?.()?.blur?.();
  Keyboard.dismiss();
}

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

function configureManageListLayoutAnimation(reducedMotion = false) {
  const duration = reducedMotion ? MANAGE_ITEM_REMOVE_REDUCED_MS : MANAGE_ITEM_REMOVE_MS;

  LayoutAnimation.configureNext({
    duration,
    create: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
    update: {
      type: LayoutAnimation.Types.easeInEaseOut,
    },
    delete: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
  });
}

function setCombinedRef(externalRef, node) {
  if (typeof externalRef === 'function') {
    externalRef(node);
    return;
  }

  if (externalRef) {
    externalRef.current = node;
  }
}

function ManageShipImage({ imageSource }) {
  if (isPlaceholderImage(imageSource)) {
    return <NoImagePlaceholder style={styles.manageShipImage} />;
  }

  return <Image resizeMode="cover" source={{ uri: imageSource }} style={styles.manageShipImage} />;
}

function moveItem(items, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return items;
  }

  const nextItems = items.slice();
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function useMountTransition(reducedMotion = false, enabled = true, animateReducedMotion = false) {
  const frameRef = useRef(null);
  const shouldPresentImmediately = reducedMotion && !animateReducedMotion;
  const [isPresented, setIsPresented] = useState(shouldPresentImmediately || !enabled);

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

    if (!enabled || shouldPresentImmediately) {
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
  }, [enabled, shouldPresentImmediately]);

  return isPresented;
}

function useModalAnimatedStyles(reducedMotion, visible = true) {
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: reducedMotion ? motionDurationsMs.instant : motionDurationsMs.normal,
      easing: IOS_EASING,
    });
  }, [progress, reducedMotion, visible]);

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

function getManageListEnterStyle({
  height = 0,
  isEntering = false,
  isPresented = true,
  reducedMotion = false,
}) {
  if (!isEntering) {
    return null;
  }

  return {
    height: isPresented ? height : 0,
    opacity: isPresented ? 1 : 0,
    overflow: 'hidden',
  };
}

function getManageListRemoveStyle({ isCollapsing = false, isRemoving = false, height = 0, reducedMotion = false }) {
  if (!isRemoving) {
    return null;
  }

  return {
    height: isCollapsing ? 0 : height,
    opacity: isCollapsing ? 0 : 1,
    overflow: 'hidden',
    pointerEvents: 'none',
  };
}

function getLayoutCenterY(layout) {
  return layout.y + layout.height / 2;
}

function getPointerContentY(clientY, contentTop, scrollY) {
  return clientY - contentTop + scrollY;
}

function getProjectedLayout(cardId, cards, itemLayouts, projectedIds) {
  const layout = itemLayouts.get(cardId);
  const projectedIndex = projectedIds.indexOf(cardId);
  const slotCard = projectedIndex >= 0 ? cards[projectedIndex] : null;
  const slotLayout = slotCard ? itemLayouts.get(slotCard.id) : null;

  if (!layout || !slotLayout) {
    return layout ?? null;
  }

  return {
    ...layout,
    y: slotLayout.y,
  };
}

function moveId(ids, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return ids;
  }

  const nextIds = ids.slice();
  const [movedId] = nextIds.splice(fromIndex, 1);
  nextIds.splice(toIndex, 0, movedId);
  return nextIds;
}

function getNextProjectedIds({
  cardId,
  cards,
  draggedMaxY,
  draggedMinY,
  itemLayouts,
  projectedIds,
  velocityY,
}) {
  if (!velocityY) {
    return projectedIds;
  }

  const nextOffset = velocityY > 0 ? 1 : velocityY < 0 ? -1 : 0;
  let nextProjectedIds = projectedIds;

  for (let step = 0; step < projectedIds.length; step += 1) {
    const currentIndex = nextProjectedIds.indexOf(cardId);
    const nextId = nextProjectedIds[currentIndex + nextOffset];
    const nextLayout = nextId
      ? getProjectedLayout(nextId, cards, itemLayouts, nextProjectedIds)
      : null;

    if (currentIndex === -1 || !nextLayout) {
      break;
    }

    const nextItemCenter = getLayoutCenterY(nextLayout);
    const shouldMoveDown = nextOffset === 1 && draggedMaxY > nextItemCenter;
    const shouldMoveUp = nextOffset === -1 && draggedMinY < nextItemCenter;

    if (!shouldMoveDown && !shouldMoveUp) {
      break;
    }

    nextProjectedIds = moveId(nextProjectedIds, currentIndex, currentIndex + nextOffset);
  }

  return nextProjectedIds;
}

function getReorderShiftOffset(cardId, cards, itemLayouts, dragState) {
  if (!dragState || dragState.cardId === cardId) {
    return 0;
  }

  const projectedIndex = dragState.projectedIds.indexOf(cardId);
  const slotCard = projectedIndex >= 0 ? cards[projectedIndex] : null;
  const layout = itemLayouts.get(cardId);
  const slotLayout = slotCard ? itemLayouts.get(slotCard.id) : null;

  if (!layout || !slotLayout) {
    return 0;
  }

  return slotLayout.y - layout.y;
}

function normalizeLayoutsToCardOrder(cards, itemLayouts) {
  if (!cards.length) {
    return itemLayouts;
  }

  let nextY = 0;
  const nextLayouts = new Map(itemLayouts);

  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    const layout = nextLayouts.get(card.id);

    if (!layout?.height) {
      return itemLayouts;
    }

    nextLayouts.set(card.id, {
      ...layout,
      y: nextY,
    });

    nextY += layout.height;

    if (index < cards.length - 1) {
      nextY += MANAGE_EDIT_REORDER_DIVIDER_HEIGHT;
    }
  }

  return nextLayouts;
}

function getMeasuredContentHeight(cards, itemLayouts) {
  return cards.reduce((height, card) => {
    const layout = itemLayouts.get(card.id);
    if (!layout) {
      return height;
    }

    return Math.max(height, layout.y + layout.height);
  }, 0) + MANAGE_EDIT_CONTENT_PADDING_BOTTOM;
}

function getScrollableElement(scrollNode) {
  if (!scrollNode) {
    return null;
  }

  if (typeof scrollNode.getScrollableNode === 'function') {
    return scrollNode.getScrollableNode();
  }

  return scrollNode;
}

function getElementRect(node) {
  const element = getScrollableElement(node);
  const rect = getElementRectSnapshot(element);

  if (!rect?.height) {
    return null;
  }

  return rect;
}

function measureElementInWindow(node, onMeasure) {
  const scrollableElement = getScrollableElement(node);
  const candidates = scrollableElement === node
    ? [node]
    : [scrollableElement, node];

  for (const candidate of candidates) {
    if (typeof candidate?.measureInWindow !== 'function') {
      continue;
    }

    candidate.measureInWindow((x, y, width, height) => {
      if (height > 0) {
        onMeasure({
          bottom: y + height,
          height,
          left: x,
          right: x + width,
          top: y,
          width,
        });
      }
    });
    return true;
  }

  return false;
}

function getScrollViewportRect(scrollNode) {
  const scrollableElement = getScrollableElement(scrollNode);
  const rect = getElementRectSnapshot(scrollableElement);

  if (!rect?.height) {
    return null;
  }

  return rect;
}

function getAutoScrollVelocity({ clientY, contentTop, maxScroll, scrollY, viewportHeight }) {
  if (!viewportHeight || maxScroll <= 0) {
    return 0;
  }

  const distanceFromTop = clientY - contentTop;
  const distanceFromBottom = viewportHeight - distanceFromTop;
  let velocity = 0;

  if (distanceFromTop < REORDER_AUTO_SCROLL_EDGE_PX) {
    const edgeRatio = Math.min(
      1,
      Math.max(0, (REORDER_AUTO_SCROLL_EDGE_PX - distanceFromTop) / REORDER_AUTO_SCROLL_EDGE_PX),
    );
    velocity = -Math.max(1, REORDER_AUTO_SCROLL_MAX_STEP_PX * edgeRatio * edgeRatio);
  } else if (distanceFromBottom < REORDER_AUTO_SCROLL_EDGE_PX) {
    const edgeRatio = Math.min(
      1,
      Math.max(0, (REORDER_AUTO_SCROLL_EDGE_PX - distanceFromBottom) / REORDER_AUTO_SCROLL_EDGE_PX),
    );
    velocity = Math.max(1, REORDER_AUTO_SCROLL_MAX_STEP_PX * edgeRatio * edgeRatio);
  }

  const atTop = scrollY <= 0;
  const atBottom = scrollY >= maxScroll;

  if ((velocity < 0 && atTop) || (velocity > 0 && atBottom)) {
    return 0;
  }

  return velocity;
}

function scrollToManageOffset(scrollNode, y, reducedMotion = false, canScroll = null) {
  if (
    !scrollNode ||
    typeof scrollNode.scrollTo !== 'function' ||
    (typeof canScroll === 'function' && !canScroll())
  ) {
    return;
  }

  const nextY = Math.max(0, y);

  if (typeof scrollNode.getScrollableNode === 'function') {
    if (typeof canScroll === 'function' && !canScroll()) {
      return;
    }
    scrollNode.scrollTo({ y: nextY, animated: !reducedMotion });
    return;
  }

  if (typeof canScroll === 'function' && !canScroll()) {
    return;
  }
  scrollNode.scrollTo({
    top: nextY,
    behavior: reducedMotion ? 'auto' : 'smooth',
  });
}

function getScrollTop(scrollNode, fallbackScrollY = 0) {
  const scrollableElement = getScrollableElement(scrollNode);

  if (typeof scrollableElement?.scrollTop === 'number') {
    return scrollableElement.scrollTop;
  }

  return fallbackScrollY;
}

function scrollLayoutIntoNearestView({
  canScroll,
  currentScrollY = 0,
  layout,
  reducedMotion = false,
  scrollNode,
  viewportHeight = 0,
}) {
  if (!layout || !scrollNode || viewportHeight <= 0) {
    return;
  }

  const viewportTop = scrollNode.scrollTop ?? currentScrollY;
  const viewportBottom = viewportTop + viewportHeight;
  const itemTop = layout.y;
  const itemBottom = layout.y + layout.height;
  let nextScrollY = viewportTop;

  if (itemTop < viewportTop) {
    nextScrollY = itemTop;
  } else if (itemBottom > viewportBottom) {
    nextScrollY = itemBottom - viewportHeight;
  }

  if (Math.abs(nextScrollY - viewportTop) > 0.5) {
    scrollToManageOffset(scrollNode, nextScrollY, reducedMotion, canScroll);
  }
}

function scrollElementIntoNearestManageView({
  canScroll,
  currentScrollY = 0,
  reducedMotion = false,
  scrollNode,
  target,
}) {
  const targetRect = getElementRect(target);
  const viewportRect = getScrollViewportRect(scrollNode);

  if (!targetRect || !viewportRect || !scrollNode) {
    return false;
  }

  const currentScrollTop = getScrollTop(scrollNode, currentScrollY);
  const viewportTop = viewportRect.top;
  const viewportBottom = viewportRect.bottom;
  let nextScrollY = currentScrollTop;

  if (targetRect.top < viewportTop) {
    nextScrollY += targetRect.top - viewportTop;
  } else if (targetRect.bottom > viewportBottom) {
    nextScrollY += targetRect.bottom - viewportBottom;
  }

  if (Math.abs(nextScrollY - currentScrollTop) > 0.5) {
    scrollToManageOffset(scrollNode, nextScrollY, reducedMotion, canScroll);
  }

  return true;
}

function getEventPoint(event, gestureState) {
  return {
    pageX:
      event?.nativeEvent?.pageX ??
      event?.nativeEvent?.clientX ??
      event?.pageX ??
      event?.clientX ??
      gestureState?.moveX ??
      gestureState?.x0 ??
      0,
    pageY:
      event?.nativeEvent?.pageY ??
      event?.nativeEvent?.clientY ??
      event?.pageY ??
      event?.clientY ??
      gestureState?.moveY ??
      gestureState?.y0 ??
      0,
  };
}

function keepAllWordBreakText(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value
    .split(/(\s+)/)
    .map((token) => (/\s+/.test(token) ? token : Array.from(token).join('\u2060')))
    .join('');
}

function getPressableStyle(state, kind, baseStyle) {
  return [
    interactiveStyles.base,
    baseStyle,
    { transform: [{ scale: state.pressed ? getInteractiveScale(kind) : 1 }] },
  ];
}

function useAnimatedTransformStyle({
  duration = motionDurationsMs.fast,
  easing = IOS_EASING,
  immediate = false,
  scale = 1,
  translateY = 0,
}) {
  const translateYValue = useSharedValue(translateY);
  const scaleValue = useSharedValue(scale);

  useEffect(() => {
    if (immediate || duration <= 0) {
      translateYValue.value = translateY;
      scaleValue.value = scale;
      return;
    }

    const config = {
      duration,
      easing,
    };
    translateYValue.value = withTiming(translateY, config);
    scaleValue.value = withTiming(scale, config);
  }, [duration, easing, immediate, scale, scaleValue, translateY, translateYValue]);

  return useAnimatedStyle(() => ({
    transform: [
      { translateY: translateYValue.value },
      { scale: scaleValue.value },
    ],
  }));
}

function useEditedBackgroundStyle(edited) {
  const progress = useSharedValue(edited ? 1 : 0);
  const idleBackground = resolveCssVariableString('var(--color-bg-surface-muted)');
  const editedBackground = resolveCssVariableString('var(--color-bg-accent-soft)');

  useEffect(() => {
    progress.value = withTiming(edited ? 1 : 0, {
      duration: motionDurationsMs.fast,
      easing: IOS_EASING,
    });
  }, [edited, progress]);

  return useAnimatedStyle(
    () => ({
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        [idleBackground, editedBackground],
      ),
    }),
    [editedBackground, idleBackground],
  );
}

function useEditedTextColorStyle(edited, idleColorToken = 'var(--color-text-tertiary)') {
  const progress = useSharedValue(edited ? 1 : 0);
  const idleColor = resolveCssVariableString(idleColorToken);
  const editedColor = resolveCssVariableString('var(--color-accent)');

  useEffect(() => {
    progress.value = withTiming(edited ? 1 : 0, {
      duration: motionDurationsMs.fast,
      easing: IOS_EASING,
    });
  }, [edited, progress]);

  return useAnimatedStyle(
    () => ({
      color: interpolateColor(
        progress.value,
        [0, 1],
        [idleColor, editedColor],
      ),
    }),
    [editedColor, idleColor],
  );
}

function useEditedStrokeStyle(edited) {
  const progress = useSharedValue(edited ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(edited ? 1 : 0, {
      duration: motionDurationsMs.fast,
      easing: IOS_EASING,
    });
  }, [edited, progress]);

  return useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
}

function SectionDivider({ style }) {
  return <View style={[styles.sectionDivider, style]} />;
}

function ManageSubpageTopBar({ saveActive = false, title, onAdd, onBack, onSave }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 0);

  return (
    <>
      <View
        style={[
          styles.manageSubpageTopBar,
          { height: 64 + topInset, paddingTop: topInset },
        ]}
      >
        <InteractivePressable
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
          onPress={onBack}
          pressGuideColor="var(--slate-50)"
          pressGuideVariant="icon"
          style={(state) => getPressableStyle(state, 'icon', styles.iconButton)}
        >
          <AppIcon
            name="arrow_back_ios_new"
            preset="iosArrow"
            style={styles.iconSlot24}
            tone="secondary"
            weight={700}
          />
        </InteractivePressable>

        <View style={styles.manageSubpageActions}>
          {onAdd ? (
            <InteractivePressable
              accessibilityLabel="추가"
              accessibilityRole="button"
              onPress={onAdd}
              pressGuideColor="var(--slate-50)"
              pressGuideVariant="icon"
              style={(state) => getPressableStyle(state, 'icon', styles.iconButton)}
            >
              <AppIcon
                name="add"
                preset="plus"
                style={styles.iconSlot24}
                tone="accent"
                weight={700}
              />
            </InteractivePressable>
          ) : null}

          <InteractivePressable
            accessibilityRole="button"
            disabled={!saveActive}
            onPress={saveActive ? onSave : undefined}
            pressGuideVariant="pill"
            style={(state) => getPressableStyle(state, 'button', styles.manageSaveButton)}
          >
            <Text style={[styles.manageSaveLabel, saveActive && styles.manageSaveLabelActive]}>
              저장
            </Text>
          </InteractivePressable>
        </View>
      </View>

      <Text style={[styles.manageScreenTitle, { paddingTop: 77 + topInset }]}>{title}</Text>
    </>
  );
}

function ManageSearchBar({ onChange, onClear, placeholder = '검색', value = '' }) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 0);

  return (
    <View
      style={[
        styles.manageSearchBar,
        { height: 64 + bottomInset, paddingBottom: bottomInset },
      ]}
    >
      <View style={styles.manageSearchIconSlot}>
        <AppIcon name="search" preset="search" tone="muted" />
      </View>
      <TextInput
        autoCorrect={false}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={resolveCssVariableString('var(--color-text-muted)')}
        selectionColor={resolveCssVariableString('var(--color-accent-solid)')}
        spellCheck={false}
        style={[styles.manageSearchInput, value ? styles.manageSearchInputFilled : null]}
        value={value}
      />
      {value ? (
        <InteractivePressable
          accessibilityLabel="검색 지우기"
          accessibilityRole="button"
          onPress={onClear}
          pressGuideVariant="icon"
          style={(state) => getPressableStyle(state, 'icon', styles.searchIconButton)}
        >
          <AppIcon name="cancel" preset="closeChip" tone="muted" />
        </InteractivePressable>
      ) : null}
    </View>
  );
}

function ManageFieldInput({ edited = false, onChange, readOnly = false, value }) {
  const editedBackgroundStyle = useEditedBackgroundStyle(edited);
  const editedTextColorStyle = useEditedTextColorStyle(edited);
  const editedStrokeStyle = useEditedStrokeStyle(edited);

  return (
    <Animated.View style={[styles.manageFieldPill, editedBackgroundStyle, edited && styles.manageFieldPillEdited]}>
      <AnimatedTextInput
        autoCorrect={false}
        editable={!readOnly}
        onChangeText={onChange}
        selectionColor={resolveCssVariableString('var(--color-accent-solid)')}
        spellCheck={false}
        style={[
          styles.manageFieldInput,
          editedTextColorStyle,
        ]}
        value={value}
      />
      <Animated.View style={[styles.editStrokeOverlay, styles.pointerEventsNone, editedStrokeStyle]} />
    </Animated.View>
  );
}

function ManageTextBox({
  active = false,
  edited = false,
  onChange,
  readOnly = false,
  value,
  variant = 'title',
}) {
  const editedBackgroundStyle = useEditedBackgroundStyle(edited);
  const editedTextColorStyle = useEditedTextColorStyle(edited, 'var(--color-text-tertiary)');
  const editedStrokeStyle = useEditedStrokeStyle(edited);

  return (
    <Animated.View
      style={[
        styles.manageTextBox,
        variant === 'title' ? styles.manageTextBoxTitle : styles.manageTextBoxSubtitle,
        editedBackgroundStyle,
        edited && styles.manageTextBoxEdited,
      ]}
    >
      <AnimatedTextInput
        autoCorrect={false}
        editable={!readOnly}
        onChangeText={onChange}
        selectionColor={resolveCssVariableString('var(--color-accent-solid)')}
        spellCheck={false}
        style={[
          styles.manageTextBoxInput,
          variant === 'title' ? styles.manageTextBoxInputTitle : styles.manageTextBoxInputSubtitle,
          editedTextColorStyle,
        ]}
        value={value}
      />
      <Animated.View style={[styles.editStrokeOverlay, styles.pointerEventsNone, editedStrokeStyle]} />
    </Animated.View>
  );
}

function ManageShipCard({
  card,
  editable = false,
  isDragging = false,
  originalCard,
  showDeleteButton = false,
  onDelete,
  onFieldChange,
  onImageChange,
}) {
  const baselineCard = originalCard ?? emptyManageShipCard;
  const titleEdited = editable ? card.title !== baselineCard.title : false;
  const registrationEdited = editable ? card.registration !== baselineCard.registration : false;
  const portEdited = editable ? card.port !== baselineCard.port : false;
  const businessEdited = editable ? card.business !== baselineCard.business : false;
  const tonnageEdited = editable ? card.tonnage !== baselineCard.tonnage : false;
  const sonarEdited = editable ? Boolean(card.sonar) !== Boolean(baselineCard.sonar) : false;
  const detectorEdited = editable
    ? Boolean(card.detector) !== Boolean(baselineCard.detector)
    : false;

  const handleImagePick = useCallback(async () => {
    const file = await pickFile({ accept: 'image/*' });
    if (file) {
      onImageChange?.(file);
    }
  }, [onImageChange]);

  const sonarTone = sonarEdited ? 'accent' : card.sonar ? 'violet' : 'violet-muted';
  const detectorTone = detectorEdited ? 'accent' : card.detector ? 'violet' : 'violet-muted';

  return (
    <View style={[styles.manageShipCard, isDragging && styles.manageShipCardDragging]}>
      <View style={styles.manageShipHero}>
        <View style={styles.manageShipIdentity}>
          <ManageTextBox
            edited={titleEdited}
            onChange={(nextValue) => onFieldChange?.('title', nextValue)}
            readOnly={!editable}
            value={card.title}
            variant="title"
          />
          <ManageTextBox
            active={card.selected}
            edited={registrationEdited}
            onChange={(nextValue) => onFieldChange?.('registration', nextValue)}
            readOnly={!editable}
            value={card.registration}
            variant="subtitle"
          />
        </View>

        {editable ? (
          <InteractivePressable
            accessibilityLabel="선박 이미지 선택"
            accessibilityRole="button"
            onPress={handleImagePick}
            pressGuideVariant="media"
            style={(state) => getPressableStyle(state, 'card', styles.manageShipImageButton)}
          >
            <ManageShipImage imageSource={card.image} />
          </InteractivePressable>
        ) : (
          <ManageShipImage imageSource={card.image} />
        )}
      </View>

      <View style={styles.manageShipDetails}>
        <View style={styles.manageShipRow}>
          <Text style={styles.manageShipLabel}>항포구</Text>
          <ManageFieldInput
            edited={portEdited}
            onChange={(nextValue) => onFieldChange?.('port', nextValue)}
            readOnly={!editable}
            value={card.port}
          />
        </View>
        <View style={styles.manageShipRow}>
          <Text style={styles.manageShipLabel}>업종</Text>
          <ManageFieldInput
            edited={businessEdited}
            onChange={(nextValue) => onFieldChange?.('business', nextValue)}
            readOnly={!editable}
            value={card.business}
          />
        </View>
        <View style={styles.manageShipRow}>
          <Text style={styles.manageShipLabel}>총톤수</Text>
          <ManageFieldInput
            edited={tonnageEdited}
            onChange={(nextValue) => onFieldChange?.('tonnage', nextValue)}
            readOnly={!editable}
            value={card.tonnage}
          />
        </View>
      </View>

      <View style={styles.manageShipRule} />

      <View style={styles.manageShipEquipment}>
        <InteractivePressable
          accessibilityLabel={`소나 ${card.sonar ? '켜짐' : '꺼짐'}`}
          accessibilityRole="button"
          onPress={() => onFieldChange?.('sonar', !card.sonar)}
          pressGuideVariant="equipment"
          style={(state) =>
            getPressableStyle(state, 'button', [
              styles.manageShipEquipmentItem,
              sonarEdited
                ? styles.manageShipEquipmentBlue
                : card.sonar
                  ? styles.manageShipEquipmentViolet
                  : styles.manageShipEquipmentMuted,
            ])
          }
        >
          <Text
            style={[
              styles.manageShipEquipmentLabel,
              sonarEdited
                ? styles.manageShipEquipmentLabelBlue
                : card.sonar
                  ? styles.manageShipEquipmentLabelViolet
                  : styles.manageShipEquipmentLabelMuted,
            ]}
          >
            소나
          </Text>
          <AppIcon
            glyphSize={18}
            name={card.sonar ? 'check' : 'close'}
            opticalSize={20}
            preset="statusSmall"
            slotSize={18}
            style={styles.iconSlot18}
            tone={sonarTone}
            weight={700}
          />
        </InteractivePressable>

        <InteractivePressable
          accessibilityLabel={`어군 탐지기 ${card.detector ? '켜짐' : '꺼짐'}`}
          accessibilityRole="button"
          onPress={() => onFieldChange?.('detector', !card.detector)}
          pressGuideVariant="equipment"
          style={(state) =>
            getPressableStyle(state, 'button', [
              styles.manageShipEquipmentItem,
              detectorEdited
                ? styles.manageShipEquipmentBlue
                : card.detector
                  ? styles.manageShipEquipmentViolet
                  : styles.manageShipEquipmentMuted,
            ])
          }
        >
          <Text
            style={[
              styles.manageShipEquipmentLabel,
              detectorEdited
                ? styles.manageShipEquipmentLabelBlue
                : card.detector
                  ? styles.manageShipEquipmentLabelViolet
                  : styles.manageShipEquipmentLabelMuted,
            ]}
          >
            어군 탐지기
          </Text>
          <AppIcon
            glyphSize={18}
            name={card.detector ? 'check' : 'close'}
            opticalSize={20}
            preset="statusSmall"
            slotSize={18}
            style={styles.iconSlot18}
            tone={detectorTone}
            weight={700}
          />
        </InteractivePressable>
      </View>

      {showDeleteButton ? (
        <InteractivePressable
          accessibilityLabel="선박 삭제"
          accessibilityRole="button"
          onPress={onDelete}
          pressGuideVariant="dangerCircle"
          style={(state) => getPressableStyle(state, 'button', styles.manageShipDeleteButton)}
        >
          <AppIcon
            glyphSize={24}
            name="delete"
            preset="action"
            style={styles.iconSlot24}
            tone="danger"
          />
        </InteractivePressable>
      ) : null}
    </View>
  );
}

function ManageShipReorderItem({
  card,
  dragOffset = 0,
  itemRef,
  isDragging = false,
  isEntering = false,
  isReorderActive = false,
  isSettlingDraggedCard = false,
  isSettling = false,
  removalState,
  onItemLayout,
  onDelete,
  onDragEnd,
  onDragMove,
  onDragStart,
  onFieldChange,
  onImageChange,
  originalCard,
  shiftOffset = 0,
  showDivider = false,
}) {
  const reducedMotion = useReducedMotionSafe();
  const isPresented = useMountTransition(reducedMotion, isEntering, true);
  const isRemoving = Boolean(removalState);
  const isCollapsing = Boolean(removalState?.collapsing);
  const [measuredEntryHeight, setMeasuredEntryHeight] = useState(0);
  const longPressTimerRef = useRef(null);
  const dragStartedRef = useRef(false);
  const [isArmed, setIsArmed] = useState(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const resetLongPressState = useCallback(() => {
    clearLongPressTimer();
    dragStartedRef.current = false;
    setIsArmed(false);
  }, [clearLongPressTimer]);

  useEffect(() => resetLongPressState, [resetLongPressState]);

  const handleMeasuredEntryLayout = useCallback((event) => {
    const nextHeight = event.nativeEvent.layout.height;

    if (nextHeight > 0) {
      setMeasuredEntryHeight((current) =>
        Math.abs(current - nextHeight) > 0.5 ? nextHeight : current,
      );
    }
  }, []);

  const handleReorderItemLayout = useCallback(
    (event) => {
      onItemLayout?.(event);
    },
    [onItemLayout],
  );

  const startDrag = useCallback(
    (clientY) => {
      dragStartedRef.current = true;
      setIsArmed(true);
      Vibration.vibrate?.(12);
      onDragStart({ cardId: card.id, clientY });
    },
    [card.id, onDragStart],
  );

  const finishDrag = useCallback(
    (clientY) => {
      if (dragStartedRef.current) {
        onDragEnd({ cardId: card.id, clientY });
        Vibration.vibrate?.(8);
      }

      resetLongPressState();
    },
    [card.id, onDragEnd, resetLongPressState],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: () => dragStartedRef.current,
        onPanResponderGrant: (event, gestureState) => {
          clearLongPressTimer();
          dragStartedRef.current = false;
          const startPoint = getEventPoint(event, gestureState);

          longPressTimerRef.current = setTimeout(() => {
            longPressTimerRef.current = null;
            startDrag(startPoint.pageY);
          }, 220);
        },
        onPanResponderMove: (event, gestureState) => {
          const point = getEventPoint(event, gestureState);
          const clientY = point.pageY || gestureState.y0 + gestureState.dy;

          if (!dragStartedRef.current) {
            if (Math.hypot(gestureState.dx, gestureState.dy) > 8) {
              clearLongPressTimer();
            }
            return;
          }

          onDragMove({ cardId: card.id, clientY });
        },
        onPanResponderRelease: (event, gestureState) => {
          const point = getEventPoint(event, gestureState);
          finishDrag(point.pageY || gestureState.y0 + gestureState.dy);
        },
        onPanResponderReject: resetLongPressState,
        onPanResponderTerminate: (event, gestureState) => {
          const point = getEventPoint(event, gestureState);
          finishDrag(point.pageY || gestureState.y0 + gestureState.dy);
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
      }),
    [card.id, clearLongPressTimer, finishDrag, onDragMove, resetLongPressState, startDrag],
  );

  const enteringTranslateY = !reducedMotion && isEntering && !isPresented ? 14 : 0;
  const enteringScale = !reducedMotion && isEntering && !isPresented ? 0.992 : 1;
  const removingTranslateY = !reducedMotion && isCollapsing ? -6 : 0;
  const removingScale = !reducedMotion && isCollapsing ? 0.994 : 1;
  const isDragActive = isDragging || isSettlingDraggedCard;
  const entryTranslateY = isRemoving
    ? 0
    : isDragActive
      ? 0
      : shiftOffset;
  const itemTranslateY = isDragActive && !isRemoving ? dragOffset + (reducedMotion ? 0 : -2) : 0;
  const itemScale = isDragActive && !reducedMotion && !isRemoving ? 1.012 : 1;
  const enteringHeight = measuredEntryHeight || 560;
  const itemTransitionDurationMs = isRemoving
    ? (reducedMotion ? MANAGE_ITEM_REMOVE_REDUCED_MS : MANAGE_ITEM_REMOVE_MS)
    : isReorderActive
      ? (reducedMotion ? REORDER_MOVE_REDUCED_MS : REORDER_MOVE_MS)
      : (reducedMotion ? MANAGE_ITEM_ADD_REDUCED_MS : MANAGE_ITEM_ADD_MS);
  const itemTransformTransitionDurationMs = isDragging
    || isSettling
    ? 0
    : (reducedMotion ? REORDER_MOVE_REDUCED_MS : REORDER_MOVE_MS);
  const entryAnimatedStyle = useAnimatedTransformStyle({
    duration: isDragging || isSettling ? 0 : itemTransitionDurationMs,
    easing: isReorderActive ? REORDER_MOVE_EASING : LIST_ITEM_EASING,
    immediate: reducedMotion || isDragging || isSettling,
    scale: enteringScale * removingScale,
    translateY: entryTranslateY + enteringTranslateY + removingTranslateY,
  });
  const itemAnimatedStyle = useAnimatedTransformStyle({
    duration: itemTransformTransitionDurationMs,
    easing: REORDER_MOVE_EASING,
    immediate: reducedMotion || isDragging,
    scale: itemScale,
    translateY: itemTranslateY,
  });
  const dividerAnimatedStyle = useAnimatedTransformStyle({
    duration: itemTransitionDurationMs,
    easing: REORDER_MOVE_EASING,
    immediate: reducedMotion || isDragging || isSettling,
    translateY: !isDragging && !isSettling ? shiftOffset : 0,
  });
  return (
    <>
      <Animated.View
        ref={itemRef}
        onLayout={handleReorderItemLayout}
        style={[
          styles.manageEditReorderEntry,
          isDragging && styles.manageEditReorderEntryDragging,
          getManageListEnterStyle({
            height: enteringHeight,
            isEntering,
            isPresented,
            reducedMotion,
          }),
          getManageListRemoveStyle({
            height: removalState?.height ?? 0,
            isCollapsing,
            isRemoving,
            reducedMotion,
          }),
          entryAnimatedStyle,
          {
            zIndex: isDragActive ? 24 : 0,
          },
        ]}
      >
        <View onLayout={handleMeasuredEntryLayout} style={styles.manageEditEntryMeasure}>
          <Animated.View
            style={[
              styles.manageEditReorderItem,
              isDragActive && styles.manageEditReorderItemDragging,
              itemAnimatedStyle,
            ]}
          >
            <View style={[styles.manageEditSection, isDragging && styles.manageEditSectionDragging]}>
            <View
              accessibilityLabel="길게 눌러 선박 순서 변경"
              accessibilityRole="button"
              style={[
                styles.reorderHandle,
                (isArmed || isDragging) && styles.reorderHandleDragging,
              ]}
              {...panResponder.panHandlers}
            >
              <AppIcon
                glyphSize={18}
                name="drag_indicator"
                opticalSize={20}
                preset="reorder"
                slotSize={18}
                style={styles.iconSlot18}
                tone={isArmed || isDragging ? 'accent' : 'muted'}
              />
              <Text
                style={[
                  styles.reorderLabel,
                  (isArmed || isDragging) && styles.reorderLabelActive,
                ]}
              >
                길게 눌러 순서 변경
              </Text>
            </View>

            <ManageShipCard
              card={card}
              editable
              isDragging={isDragging}
              originalCard={originalCard}
              showDeleteButton
              onDelete={() => onDelete(card.id)}
              onFieldChange={(field, value) => onFieldChange(card.id, field, value)}
              onImageChange={(file) => onImageChange(card.id, file)}
            />
            </View>
          </Animated.View>
        </View>
      </Animated.View>
      {showDivider ? (
        <Animated.View
          style={[
            styles.sectionDivider,
            styles.manageEditReorderDivider,
            isSettling && styles.manageEditReorderDividerSettling,
            dividerAnimatedStyle,
          ]}
        />
      ) : null}
    </>
  );
}

function ManageShipStaticItem({
  card,
  itemRef,
  isEntering = false,
  onDelete,
  onFieldChange,
  onImageChange,
  onItemLayout,
  originalCard,
  removalState,
  showDivider = false,
}) {
  const reducedMotion = useReducedMotionSafe();
  const isPresented = useMountTransition(reducedMotion, isEntering, true);
  const isRemoving = Boolean(removalState);
  const isCollapsing = Boolean(removalState?.collapsing);
  const [measuredEntryHeight, setMeasuredEntryHeight] = useState(0);
  const enteringTranslateY = !reducedMotion && isEntering && !isPresented ? 14 : 0;
  const enteringScale = !reducedMotion && isEntering && !isPresented ? 0.992 : 1;
  const removingTranslateY = !reducedMotion && isCollapsing ? -6 : 0;
  const removingScale = !reducedMotion && isCollapsing ? 0.994 : 1;
  const enteringHeight = measuredEntryHeight || 520;

  const handleMeasuredEntryLayout = useCallback((event) => {
    const nextHeight = event.nativeEvent.layout.height;

    if (nextHeight > 0) {
      setMeasuredEntryHeight((current) =>
        Math.abs(current - nextHeight) > 0.5 ? nextHeight : current,
      );
    }
  }, []);

  return (
    <View
      ref={itemRef}
      onLayout={onItemLayout}
      style={[
        styles.manageEditStaticEntry,
        getManageListEnterStyle({
          height: enteringHeight,
          isEntering,
          isPresented,
          reducedMotion,
        }),
        getManageListRemoveStyle({
          height: removalState?.height ?? 0,
          isCollapsing,
          isRemoving,
          reducedMotion,
        }),
        {
          transform: [
            { translateY: enteringTranslateY + removingTranslateY },
            { scale: enteringScale * removingScale },
          ],
          zIndex: 0,
        },
      ]}
    >
      <View onLayout={handleMeasuredEntryLayout} style={styles.manageEditEntryMeasure}>
        <View style={styles.manageEditSection}>
          <ManageShipCard
            card={card}
            editable
            originalCard={originalCard}
            showDeleteButton
            onDelete={() => onDelete(card.id)}
            onFieldChange={(field, value) => onFieldChange(card.id, field, value)}
            onImageChange={(file) => onImageChange(card.id, file)}
          />
        </View>
        {showDivider ? <SectionDivider /> : null}
      </View>
    </View>
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
  visible = true,
}) {
  const reducedMotion = useReducedMotionSafe();
  const { width: windowWidth } = useWindowDimensions();
  const modalAnimatedStyles = useModalAnimatedStyles(reducedMotion, visible);
  const modalCardContentWidth = Math.max(
    0,
    Math.min(MODAL_TOTAL_WIDTH, windowWidth - MODAL_HORIZONTAL_MARGIN * 2) - MODAL_PADDING * 2,
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
          { width: modalCardContentWidth },
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
              pressGuideColor="transparent"
              pressGuideVariant="filled"
              style={(state) =>
                getPressableStyle(state, 'button', [styles.modalButton, styles.modalButtonGhost])
              }
            >
              <Text style={styles.modalButtonGhostLabel}>{keepAllWordBreakText(cancelLabel)}</Text>
            </InteractivePressable>
          ) : null}

          <InteractivePressable
            accessibilityRole="button"
            onPress={onConfirm}
            pressGuideColor="transparent"
            pressGuideVariant="filled"
            style={(state) =>
              getPressableStyle(state, 'button', [
                styles.modalButton,
                confirmTone === 'danger' ? styles.modalButtonDanger : styles.modalButtonNeutral,
              ])
            }
          >
            <Text style={styles.modalButtonLabel}>{keepAllWordBreakText(confirmLabel)}</Text>
          </InteractivePressable>
        </View>
      </Animated.View>
    </View>
  );
}

function ManageAlertModalPresence({ visible, onCancel, onConfirm, ...modalProps }) {
  const reducedMotion = useReducedMotionSafe();
  const closeTimerRef = useRef(null);
  const pendingActionRef = useRef(null);
  const [mounted, setMounted] = useState(visible);
  const [presented, setPresented] = useState(visible);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const finishClose = useCallback(() => {
    closeTimerRef.current = null;
    setMounted(false);

    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    pendingAction?.();
  }, []);

  const requestClose = useCallback(
    (action) => {
      if (!presented) {
        return;
      }

      pendingActionRef.current = action;
      setPresented(false);
    },
    [presented],
  );

  useEffect(() => {
    if (visible) {
      clearCloseTimer();
      pendingActionRef.current = null;
      setMounted(true);
      setPresented(true);
      return;
    }

    if (mounted) {
      setPresented(false);
    }
  }, [clearCloseTimer, mounted, visible]);

  useEffect(() => {
    if (!mounted || presented) {
      return undefined;
    }

    clearCloseTimer();
    closeTimerRef.current = setTimeout(
      finishClose,
      reducedMotion ? motionDurationsMs.instant : motionDurationsMs.normal + 16,
    );

    return clearCloseTimer;
  }, [clearCloseTimer, finishClose, mounted, presented, reducedMotion]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  if (!mounted) {
    return null;
  }

  return (
    <ManageAlertModal
      {...modalProps}
      onCancel={() => requestClose(onCancel)}
      onConfirm={() => requestClose(onConfirm)}
      visible={presented}
    />
  );
}

function ManageSavedToast({ message, onDismiss, visible = true }) {
  const { resolvedColorMode } = useTheme();
  const isDark = resolvedColorMode === 'dark';
  const insets = useSafeAreaInsets();
  const maxVisibleDragOffset = 24;
  const dismissDragThreshold = 56;
  const reducedMotion = useReducedMotionSafe();
  const bottomInset = Math.max(insets.bottom, 0);
  const manualDismissDuration = reducedMotion ? 80 : 160;
  const toastProgress = useSharedValue(reducedMotion ? 1 : 0);
  const dragOffsetValue = useSharedValue(0);
  const fadeOpacityValue = useSharedValue(1);
  const [dragging, setDragging] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const toastBorderColor = isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(255, 255, 255, 0.55)';
  const toastBoxShadow = isDark
    ? '0 12px 24px -12px rgba(0, 0, 0, 0.6)'
    : '0 12px 24px -12px rgba(71, 85, 105, 0.4)';
  const toastShadowColor = isDark ? '#000000' : '#475569';
  const toastSurfaceColor = isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(241, 245, 249, 0.5)';
  const ToastBlurSurface = Platform.OS === 'web' ? View : BlurView;
  const toastBlurProps = Platform.OS === 'web'
    ? {}
    : { intensity: 40, tint: isDark ? 'dark' : 'default' };
  const dragDistanceRef = useRef(0);
  const draggingRef = useRef(false);
  const dismissFrameRef = useRef(null);
  const dismissTimeoutRef = useRef(null);

  const clearPendingDismiss = useCallback(() => {
    if (dismissFrameRef.current !== null) {
      cancelAnimationFrame(dismissFrameRef.current);
      dismissFrameRef.current = null;
    }

    if (dismissTimeoutRef.current !== null) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  }, []);

  const resetDragState = useCallback(() => {
    clearPendingDismiss();
    draggingRef.current = false;
    dragDistanceRef.current = 0;
    dragOffsetValue.value = withTiming(0, {
      duration: reducedMotion ? motionDurationsMs.instant : motionDurationsMs.fast,
      easing: IOS_EASING,
    });
    fadeOpacityValue.value = 1;
    setDragging(false);
  }, [clearPendingDismiss, dragOffsetValue, fadeOpacityValue, reducedMotion]);

  useEffect(() => clearPendingDismiss, [clearPendingDismiss]);

  useEffect(() => {
    toastProgress.value = withTiming(visible ? 1 : 0, {
      duration: reducedMotion ? motionDurationsMs.instant : motionDurationsMs.normal,
      easing: IOS_EASING,
    });
  }, [reducedMotion, toastProgress, visible]);

  const toastAnimatedStyle = useAnimatedStyle(() => ({
    opacity: toastProgress.value,
    transform: [
      { translateY: (1 - toastProgress.value) * motionTokens.offset.toastLift },
      {
        scale:
          motionTokens.scale.toastEnter +
          (1 - motionTokens.scale.toastEnter) * toastProgress.value,
      },
    ],
  }));

  const toastShellAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragOffsetValue.value }],
  }));

  const toastFadeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacityValue.value,
  }));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 2,
        onPanResponderGrant: () => {
          clearPendingDismiss();
          draggingRef.current = true;
          dragDistanceRef.current = 0;
          dragOffsetValue.value = 0;
          fadeOpacityValue.value = 1;
          setDismissing(false);
          setDragging(true);
        },
        onPanResponderMove: (_, gestureState) => {
          if (!draggingRef.current) {
            return;
          }

          const nextDragDistance = Math.max(0, gestureState.dy);
          const nextVisibleOffset = Math.min(maxVisibleDragOffset, nextDragDistance);
          dragDistanceRef.current = nextDragDistance;
          dragOffsetValue.value = nextVisibleOffset;
          fadeOpacityValue.value = 1 - nextVisibleOffset / maxVisibleDragOffset;
        },
        onPanResponderRelease: () => {
          draggingRef.current = false;

          if (dragDistanceRef.current > dismissDragThreshold) {
            const currentVisibleOffset = Math.min(maxVisibleDragOffset, dragDistanceRef.current);
            const currentOpacity = 1 - currentVisibleOffset / maxVisibleDragOffset;

            setDismissing(true);
            setDragging(false);
            dragOffsetValue.value = currentVisibleOffset;
            fadeOpacityValue.value = currentOpacity;
            dragDistanceRef.current = 0;

            dismissFrameRef.current = requestAnimationFrame(() => {
              dismissFrameRef.current = null;
              fadeOpacityValue.value = withTiming(0, {
                duration: manualDismissDuration,
                easing: IOS_EASING,
              });
            });
            dismissTimeoutRef.current = setTimeout(() => {
              dismissTimeoutRef.current = null;
              onDismiss();
            }, manualDismissDuration);
            return;
          }

          resetDragState();
        },
        onPanResponderTerminate: resetDragState,
        onStartShouldSetPanResponder: () => true,
      }),
    [
      clearPendingDismiss,
      dragOffsetValue,
      fadeOpacityValue,
      manualDismissDuration,
      onDismiss,
      resetDragState,
    ],
  );

  const toastBottom = 52 + bottomInset;

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        styles.toastShell,
        dragging && styles.toastShellDragging,
        dismissing && styles.toastShellDismissing,
        { bottom: toastBottom },
        toastShellAnimatedStyle,
      ]}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={[
          styles.toastFade,
          dismissing && styles.toastFadeDismissing,
          toastFadeAnimatedStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.toastShadow,
            {
              boxShadow: toastBoxShadow,
              shadowColor: toastShadowColor,
              shadowOpacity: isDark ? 0.6 : 0.4,
            },
            toastAnimatedStyle,
          ]}
        >
          <ToastBlurSurface
            {...toastBlurProps}
            style={[
              styles.toast,
              WEB_TOAST_BLUR_STYLE,
            ]}
          >
            <View
              style={[
                styles.toastSurfaceFill,
                styles.pointerEventsNone,
                { backgroundColor: toastSurfaceColor },
              ]}
            />
            <View
              style={[
                styles.toastInsetStroke,
                styles.pointerEventsNone,
                { borderColor: toastBorderColor },
              ]}
            />
            <AppIcon
              glyphSize={24}
              name="check_circle"
              preset="action"
              style={[styles.iconSlot24, styles.toastForeground]}
              tone="accent"
            />
            <Text style={styles.toastMessage}>{message}</Text>
          </ToastBlurSurface>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

function ManageSavedToastPresence({ toast, onDismiss }) {
  const reducedMotion = useReducedMotionSafe();
  const closeTimerRef = useRef(null);
  const [renderedToast, setRenderedToast] = useState(toast);
  const [visible, setVisible] = useState(Boolean(toast));

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (toast) {
      clearCloseTimer();
      setRenderedToast(toast);
      setVisible(true);
      return;
    }

    if (renderedToast) {
      setVisible(false);
      clearCloseTimer();
      closeTimerRef.current = setTimeout(
        () => {
          closeTimerRef.current = null;
          setRenderedToast(null);
        },
        reducedMotion ? motionDurationsMs.instant : motionDurationsMs.normal + 16,
      );
    }
  }, [clearCloseTimer, reducedMotion, renderedToast, toast]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  if (!renderedToast) {
    return null;
  }

  return (
    <ManageSavedToast
      key={renderedToast.id}
      message={renderedToast.message}
      onDismiss={onDismiss}
      visible={visible}
    />
  );
}

export function ManageShipEditPage({
  cards,
  contentRef: externalContentRef,
  dirty,
  originalCards,
  searchQuery,
  showDiscardModal,
  toast,
  onAdd,
  onBack,
  onConfirmDiscard,
  onDelete,
  onDismissDiscard,
  onDismissToast,
  onFieldChange,
  onImageChange,
  onReorder,
  onSave,
  onSearchChange,
  onSearchClear,
}) {
  useTheme();
  const reducedMotion = useReducedMotionSafe();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 0);
  const normalizedQuery = searchQuery.trim();
  const deferredSearchQuery = useDeferredValue(normalizedQuery);
  const reorderEnabled = normalizedQuery === '';
  const contentRef = useRef(null);
  const activeDragIdRef = useRef(null);
  const autoScrollFrameRef = useRef(null);
  const autoScrollVelocityRef = useRef(0);
  const contentSizeHeightRef = useRef(0);
  const contentTopRef = useRef(0);
  const dragMoveFrameRef = useRef(null);
  const dragStateRef = useRef(null);
  const isMountedRef = useRef(false);
  const itemRefs = useRef(new Map());
  const itemLayoutsRef = useRef(new Map());
  const lastDragPointRef = useRef(null);
  const onDeleteRef = useRef(onDelete);
  const pendingDragMoveRef = useRef(null);
  const previousCardIdsRef = useRef(cards.map((card) => card.id));
  const removalFrameRef = useRef(new Map());
  const removalTimerRef = useRef(new Map());
  const settleFrameRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const [recentlyAddedCardId, setRecentlyAddedCardId] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [removingCards, setRemovingCards] = useState(() => new Map());

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      contentRef.current = null;
    };
  }, []);

  const cardSearchIndexes = useMemo(() => {
    const nextIndexes = new Map();

    cards.forEach((card) => {
      nextIndexes.set(
        card.id,
        buildSearchIndex(
          [card.searchKey, card.title, card.registration, card.port, card.business],
          {
            choseongFields: [card.searchKey, card.title],
          },
        ),
      );
    });

    return nextIndexes;
  }, [cards]);
  const originalCardsById = useMemo(() => {
    const nextOriginalCards = new Map();

    originalCards.forEach((card) => {
      nextOriginalCards.set(card.id, card);
    });

    return nextOriginalCards;
  }, [originalCards]);
  const visibleCards = useMemo(() => {
    const compiledQuery = compileSearchQuery(deferredSearchQuery);

    if (!compiledQuery.normalizedQuery) {
      return cards;
    }

    return cards.filter((card) =>
      matchesCompiledSearchQuery(
        cardSearchIndexes.get(card.id),
        compiledQuery,
      ),
    );
  }, [cardSearchIndexes, cards, deferredSearchQuery]);
  const cardsAfterRemovals = useMemo(
    () => cards.filter((card) => !removingCards.has(card.id)),
    [cards, removingCards],
  );
  const cardsAfterRemovalsIndexById = useMemo(() => {
    const nextIndexes = new Map();

    cardsAfterRemovals.forEach((card, index) => {
      nextIndexes.set(card.id, index);
    });

    return nextIndexes;
  }, [cardsAfterRemovals]);
  const visibleCardsAfterRemovals = useMemo(
    () => visibleCards.filter((card) => !removingCards.has(card.id)),
    [removingCards, visibleCards],
  );
  const visibleCardsAfterRemovalsIndexById = useMemo(() => {
    const nextIndexes = new Map();

    visibleCardsAfterRemovals.forEach((card, index) => {
      nextIndexes.set(card.id, index);
    });

    return nextIndexes;
  }, [visibleCardsAfterRemovals]);
  const handleSave = useCallback(() => {
    dismissNativeKeyboard();
    onSave?.();
    requestAnimationFrame(() => {
      dismissNativeKeyboard();
    });
    setTimeout(dismissNativeKeyboard, 80);
  }, [onSave]);

  const measureScrollViewport = useCallback(() => {
    measureElementInWindow(contentRef.current, (rect) => {
      contentTopRef.current = rect.top;
      viewportHeightRef.current = rect.height;
    });
  }, []);

  const contentRefCallback = useCallback(
    (node) => {
      contentRef.current = node;
      setCombinedRef(externalContentRef, node);

      if (node) {
        requestAnimationFrame(measureScrollViewport);
      }
    },
    [externalContentRef, measureScrollViewport],
  );

  const setItemRef = useCallback(
    (cardId) => (node) => {
      if (node) {
        itemRefs.current.set(cardId, node);
        return;
      }

      itemRefs.current.delete(cardId);
    },
    [],
  );

  useEffect(() => {
    onDeleteRef.current = onDelete;
  }, [onDelete]);

  useEffect(() => {
    const previousIds = previousCardIdsRef.current;
    const currentIds = cards.map((card) => card.id);
    const addedIds = currentIds.filter((id) => !previousIds.includes(id));
    const idsChanged =
      currentIds.length !== previousIds.length ||
      currentIds.some((id, index) => id !== previousIds[index]);

    if (addedIds.length > 0) {
      setRecentlyAddedCardId(addedIds[addedIds.length - 1]);
    }

    if (idsChanged) {
      const currentIdSet = new Set(currentIds);
      itemLayoutsRef.current.forEach((_, cardId) => {
        if (!currentIdSet.has(cardId)) {
          itemLayoutsRef.current.delete(cardId);
        }
      });
      itemRefs.current.forEach((_, cardId) => {
        if (!currentIdSet.has(cardId)) {
          itemRefs.current.delete(cardId);
        }
      });
      setRemovingCards((current) => {
        let changed = false;
        const nextRemovingCards = new Map(current);

        current.forEach((_, cardId) => {
          if (!currentIdSet.has(cardId)) {
            const frameId = removalFrameRef.current.get(cardId);
            const timerId = removalTimerRef.current.get(cardId);

            if (frameId !== undefined) {
              cancelAnimationFrame(frameId);
              removalFrameRef.current.delete(cardId);
            }

            if (timerId !== undefined) {
              clearTimeout(timerId);
              removalTimerRef.current.delete(cardId);
            }

            nextRemovingCards.delete(cardId);
            changed = true;
          }
        });

        return changed ? nextRemovingCards : current;
      });
      contentSizeHeightRef.current = 0;
    }

    itemLayoutsRef.current = normalizeLayoutsToCardOrder(cards, itemLayoutsRef.current);
    previousCardIdsRef.current = currentIds;
  }, [cards]);

  useEffect(() => {
    if (!recentlyAddedCardId) {
      return;
    }

    let frameId = null;
    let scrollTimerId = null;
    let attemptCount = 0;
    let cancelled = false;

    const scheduleRetry = () => {
      if (attemptCount >= ADD_SCROLL_MAX_ATTEMPTS) {
        return;
      }

      attemptCount += 1;
      frameId = requestAnimationFrame(scrollToTarget);
    };

    const scrollToTarget = () => {
      if (cancelled) {
        return;
      }

      const target = itemRefs.current.get(recentlyAddedCardId);
      const targetLayout = itemLayoutsRef.current.get(recentlyAddedCardId);
      const scrollNode = contentRef.current;
      const canScroll = () => !cancelled && isMountedRef.current && contentRef.current === scrollNode;
      const targetRect = getElementRectSnapshot(target);
      const targetRectHeight = targetRect?.height ?? 0;
      const targetHeight = targetRectHeight > 0 ? targetRectHeight : (targetLayout?.height ?? 0);

      if (!target || !scrollNode || targetHeight <= 0) {
        scheduleRetry();
        return;
      }

      if (scrollElementIntoNearestManageView({
        canScroll,
        currentScrollY: scrollOffsetRef.current,
        reducedMotion,
        scrollNode,
        target,
      })) {
        return;
      }

      scrollLayoutIntoNearestView({
        canScroll,
        currentScrollY: scrollOffsetRef.current,
        layout: targetLayout,
        reducedMotion,
        scrollNode,
        viewportHeight: viewportHeightRef.current,
      });
    };

    scrollTimerId = setTimeout(() => {
      if (!cancelled) {
        frameId = requestAnimationFrame(scrollToTarget);
      }
    }, reducedMotion ? 0 : MANAGE_ITEM_ADD_MS);

    const clearTimerId = setTimeout(() => {
      setRecentlyAddedCardId((current) => (current === recentlyAddedCardId ? null : current));
    }, reducedMotion ? 120 : 420);

    return () => {
      cancelled = true;
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      clearTimeout(scrollTimerId);
      clearTimeout(clearTimerId);
    };
  }, [recentlyAddedCardId, reducedMotion, reorderEnabled]);

  const getScrollMetrics = useCallback(() => {
    const viewportHeight = viewportHeightRef.current;
    const measuredContentHeight = getMeasuredContentHeight(cards, itemLayoutsRef.current);
    const contentHeight = contentSizeHeightRef.current || measuredContentHeight;

    return {
      contentHeight,
      maxScroll: Math.max(0, contentHeight - viewportHeight),
      viewportHeight,
    };
  }, [cards]);

  const refreshScrollViewportMetrics = useCallback(() => {
    const viewportRect = getScrollViewportRect(contentRef.current);

    if (viewportRect) {
      contentTopRef.current = viewportRect.top;
      viewportHeightRef.current = viewportRect.height;
    } else {
      measureScrollViewport();
    }

    return {
      contentTop: contentTopRef.current,
      viewportHeight: viewportHeightRef.current,
    };
  }, [measureScrollViewport]);

  const syncItemLayoutsToCurrentOrder = useCallback(() => {
    const viewportMetrics = refreshScrollViewportMetrics();
    let nextLayouts = new Map(itemLayoutsRef.current);

    itemRefs.current.forEach((node, cardId) => {
      const rect = getElementRect(node);

      if (!rect) {
        return;
      }

      nextLayouts.set(cardId, {
        ...(nextLayouts.get(cardId) ?? {}),
        height: rect.height,
        y: rect.top - viewportMetrics.contentTop + scrollOffsetRef.current,
      });
    });

    nextLayouts = normalizeLayoutsToCardOrder(cards, nextLayouts);
    itemLayoutsRef.current = nextLayouts;
    return nextLayouts;
  }, [cards, refreshScrollViewportMetrics]);

  const stopAutoScroll = useCallback(() => {
    autoScrollVelocityRef.current = 0;
    lastDragPointRef.current = null;

    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }, []);

  const cancelSettleFrame = useCallback(() => {
    if (settleFrameRef.current !== null) {
      cancelAnimationFrame(settleFrameRef.current);
      settleFrameRef.current = null;
    }
  }, []);

  const scheduleDragSettleClear = useCallback(
    (cardId) => {
      cancelSettleFrame();

      settleFrameRef.current = requestAnimationFrame(() => {
        settleFrameRef.current = requestAnimationFrame(() => {
          settleFrameRef.current = null;

          if (dragStateRef.current?.cardId === cardId && dragStateRef.current.settling) {
            dragStateRef.current = null;
          }

          setDragState((current) =>
            current?.cardId === cardId && current.settling ? null : current,
          );
        });
      });
    },
    [cancelSettleFrame],
  );

  const updateDragTarget = useCallback(
    ({ cardId, clientY, scrollY }) => {
      const current = dragStateRef.current;

      if (!current || current.cardId !== cardId || activeDragIdRef.current !== cardId) {
        return;
      }

      const { contentTop } = refreshScrollViewportMetrics();
      const layout = itemLayoutsRef.current.get(cardId);

      if (!layout) {
        return;
      }

      const draggedMinY = getPointerContentY(clientY, contentTop, scrollY) - current.anchorY;
      const draggedMaxY = draggedMinY + layout.height;
      const offsetY = draggedMinY - layout.y;
      const movementY = offsetY - (current.offsetY ?? 0);
      const velocityY = Math.abs(movementY) > 0.01 ? movementY : 0;
      const projectedIds = getNextProjectedIds({
        cardId,
        cards,
        draggedMaxY,
        draggedMinY,
        itemLayouts: itemLayoutsRef.current,
        projectedIds: current.projectedIds,
        velocityY,
      });
      const targetIndex = projectedIds.indexOf(cardId);

      if (
        Math.abs(clientY - current.clientY) < 0.5 &&
        Math.abs(offsetY - (current.offsetY ?? 0)) < 0.5 &&
        targetIndex === current.targetIndex
      ) {
        return;
      }

      const nextDragState = {
        ...current,
        clientY,
        offsetY,
        projectedIds,
        scrollY,
        targetIndex,
      };

      dragStateRef.current = nextDragState;
      setDragState(nextDragState);
    },
    [cards, refreshScrollViewportMetrics],
  );

  const handleScroll = useCallback(
    (event) => {
      const nextScrollY = event.nativeEvent.contentOffset.y;
      scrollOffsetRef.current = nextScrollY;

      const dragPoint = lastDragPointRef.current;

      if (dragPoint && activeDragIdRef.current === dragPoint.cardId) {
        updateDragTarget({
          cardId: dragPoint.cardId,
          clientY: dragPoint.clientY,
          scrollY: nextScrollY,
        });
      }
    },
    [updateDragTarget],
  );

  const runAutoScroll = useCallback(() => {
    autoScrollFrameRef.current = null;

    const dragPoint = lastDragPointRef.current;
    const scrollNode = contentRef.current;

    if (
      !isMountedRef.current ||
      !dragPoint ||
      activeDragIdRef.current !== dragPoint.cardId ||
      !scrollNode
    ) {
      return;
    }

    const { contentTop, viewportHeight } = refreshScrollViewportMetrics();
    const { maxScroll } = getScrollMetrics();
    const velocity = getAutoScrollVelocity({
      clientY: dragPoint.clientY,
      contentTop,
      maxScroll,
      scrollY: scrollOffsetRef.current,
      viewportHeight,
    });

    autoScrollVelocityRef.current = velocity;

    if (!velocity) {
      return;
    }

    const currentScrollY = scrollOffsetRef.current;
    const nextScrollY = Math.min(maxScroll, Math.max(0, currentScrollY + velocity));

    if (nextScrollY !== currentScrollY) {
      if (!isMountedRef.current || contentRef.current !== scrollNode) {
        return;
      }

      scrollNode.scrollTo?.({ y: nextScrollY, animated: false });

      const observedScrollY = getScrollTop(scrollNode, currentScrollY);

      if (Math.abs(observedScrollY - currentScrollY) > 0.5) {
        scrollOffsetRef.current = observedScrollY;
        updateDragTarget({
          cardId: dragPoint.cardId,
          clientY: dragPoint.clientY,
          scrollY: observedScrollY,
        });
      }
    }

    if (
      autoScrollVelocityRef.current &&
      activeDragIdRef.current === dragPoint.cardId &&
      isMountedRef.current &&
      contentRef.current === scrollNode &&
      nextScrollY > 0 &&
      nextScrollY < maxScroll
    ) {
      autoScrollFrameRef.current = requestAnimationFrame(runAutoScroll);
    }
  }, [getScrollMetrics, refreshScrollViewportMetrics, updateDragTarget]);

  const updateAutoScroll = useCallback((dragPoint) => {
    if (activeDragIdRef.current !== dragPoint.cardId) {
      stopAutoScroll();
      return;
    }

    lastDragPointRef.current = dragPoint;

    const viewportMetrics = refreshScrollViewportMetrics();
    const { maxScroll, viewportHeight } = getScrollMetrics();
    const resolvedViewportHeight = viewportMetrics.viewportHeight || viewportHeight;

    if (!resolvedViewportHeight || maxScroll <= 0) {
      stopAutoScroll();
      return;
    }

    const velocity = getAutoScrollVelocity({
      clientY: dragPoint.clientY,
      contentTop: viewportMetrics.contentTop,
      maxScroll,
      scrollY: scrollOffsetRef.current,
      viewportHeight: resolvedViewportHeight,
    });

    autoScrollVelocityRef.current = velocity;

    if (velocity && autoScrollFrameRef.current === null) {
      autoScrollFrameRef.current = requestAnimationFrame(runAutoScroll);
    }

    if (!velocity && autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }, [getScrollMetrics, refreshScrollViewportMetrics, runAutoScroll, stopAutoScroll]);

  const cancelPendingDragMove = useCallback(() => {
    pendingDragMoveRef.current = null;

    if (dragMoveFrameRef.current !== null) {
      cancelAnimationFrame(dragMoveFrameRef.current);
      dragMoveFrameRef.current = null;
    }
  }, []);

  const flushDragMove = useCallback(() => {
    dragMoveFrameRef.current = null;

    const nextDragMove = pendingDragMoveRef.current;
    pendingDragMoveRef.current = null;

    if (!nextDragMove) {
      return;
    }

    updateDragTarget({
      cardId: nextDragMove.cardId,
      clientY: nextDragMove.clientY,
      scrollY: scrollOffsetRef.current,
    });

    if (dragStateRef.current?.cardId === nextDragMove.cardId) {
      updateAutoScroll({
        cardId: nextDragMove.cardId,
        clientY: nextDragMove.clientY,
      });
    }
  }, [updateAutoScroll, updateDragTarget]);

  useEffect(
    () => () => {
      cancelSettleFrame();
      cancelPendingDragMove();
      stopAutoScroll();
      activeDragIdRef.current = null;
      dragStateRef.current = null;
    },
    [cancelPendingDragMove, cancelSettleFrame, stopAutoScroll],
  );

  useEffect(
    () => () => {
      removalFrameRef.current.forEach((frameId, cardId) => {
        cancelAnimationFrame(frameId);
        onDeleteRef.current(cardId);
      });
      removalTimerRef.current.forEach((timerId, cardId) => {
        clearTimeout(timerId);
        onDeleteRef.current(cardId);
      });
      removalFrameRef.current.clear();
      removalTimerRef.current.clear();
    },
    [],
  );

  const handleDeleteRequest = useCallback(
    (cardId) => {
      if (removalFrameRef.current.has(cardId) || removalTimerRef.current.has(cardId)) {
        return;
      }

      cancelSettleFrame();
      cancelPendingDragMove();
      stopAutoScroll();
      setRecentlyAddedCardId((current) => (current === cardId ? null : current));

      if (dragStateRef.current?.cardId === cardId) {
        activeDragIdRef.current = null;
        dragStateRef.current = null;
        setDragState(null);
      }

      const removalRect = getElementRect(itemRefs.current.get(cardId));
      const removalHeight = removalRect?.height ?? itemLayoutsRef.current.get(cardId)?.height ?? 0;
      const removalList = reorderEnabled ? cards : visibleCards;
      const removalIndex = removalList.findIndex((card) => card.id === cardId);
      const showDividerAtRemoval =
        removalIndex >= 0 && removalIndex < removalList.length - 1;

      configureManageListLayoutAnimation(reducedMotion);
      setRemovingCards((current) => {
        if (current.has(cardId)) {
          return current;
        }

        const nextRemovingCards = new Map(current);
        nextRemovingCards.set(cardId, {
          collapsing: false,
          height: removalHeight,
          showDivider: showDividerAtRemoval,
        });
        return nextRemovingCards;
      });

      const frameId = requestAnimationFrame(() => {
        removalFrameRef.current.delete(cardId);
        configureManageListLayoutAnimation(reducedMotion);
        setRemovingCards((current) => {
          const removalState = current.get(cardId);

          if (!removalState) {
            return current;
          }

          const nextRemovingCards = new Map(current);
          nextRemovingCards.set(cardId, {
            ...removalState,
            collapsing: true,
          });
          return nextRemovingCards;
        });

        const timerId = setTimeout(() => {
          removalTimerRef.current.delete(cardId);
          configureManageListLayoutAnimation(reducedMotion);
          onDeleteRef.current(cardId);
          setRemovingCards((current) => {
            if (!current.has(cardId)) {
              return current;
            }

            const nextRemovingCards = new Map(current);
            nextRemovingCards.delete(cardId);
            return nextRemovingCards;
          });
        }, reducedMotion ? MANAGE_ITEM_REMOVE_REDUCED_MS : MANAGE_ITEM_REMOVE_MS);

        removalTimerRef.current.set(cardId, timerId);
      });

      removalFrameRef.current.set(cardId, frameId);
    },
    [
      cancelPendingDragMove,
      cancelSettleFrame,
      cards,
      reducedMotion,
      reorderEnabled,
      stopAutoScroll,
      visibleCards,
    ],
  );

  const handleDragStart = useCallback(
    ({ cardId, clientY }) => {
      cancelSettleFrame();
      cancelPendingDragMove();
      stopAutoScroll();

      const { contentTop } = refreshScrollViewportMetrics();
      const itemLayouts = syncItemLayoutsToCurrentOrder();
      const fromIndex = cards.findIndex((card) => card.id === cardId);
      const layout = itemLayouts.get(cardId);

      if (fromIndex < 0 || !layout) {
        return;
      }

      activeDragIdRef.current = cardId;
      const pointerContentY = getPointerContentY(clientY, contentTop, scrollOffsetRef.current);

      const nextDragState = {
        anchorY: pointerContentY - layout.y,
        cardId,
        clientY,
        fromIndex,
        offsetY: 0,
        projectedIds: cards.map((card) => card.id),
        scrollY: scrollOffsetRef.current,
        targetIndex: fromIndex,
      };

      dragStateRef.current = nextDragState;
      setDragState(nextDragState);
    },
    [
      cancelPendingDragMove,
      cancelSettleFrame,
      cards,
      refreshScrollViewportMetrics,
      stopAutoScroll,
      syncItemLayoutsToCurrentOrder,
    ],
  );

  const handleDragMove = useCallback(
    ({ cardId, clientY }) => {
      pendingDragMoveRef.current = { cardId, clientY };

      if (dragMoveFrameRef.current === null) {
        dragMoveFrameRef.current = requestAnimationFrame(flushDragMove);
      }
    },
    [flushDragMove],
  );

  const handleDragEnd = useCallback(
    ({ cardId, clientY }) => {
      cancelSettleFrame();
      cancelPendingDragMove();
      stopAutoScroll();
      updateDragTarget({
        cardId,
        clientY,
        scrollY: scrollOffsetRef.current,
      });

      const currentDragState = dragStateRef.current;
      activeDragIdRef.current = null;

      if (!currentDragState || currentDragState.cardId !== cardId) {
        dragStateRef.current = null;
        setDragState(null);
        return;
      }

      const targetIndex = currentDragState.projectedIds.indexOf(cardId);
      const shouldReorder = targetIndex >= 0 && targetIndex !== currentDragState.fromIndex;
      const nextCards = shouldReorder
        ? moveItem(cards, currentDragState.fromIndex, targetIndex)
        : cards;
      const nextLayouts = normalizeLayoutsToCardOrder(nextCards, itemLayoutsRef.current);
      const settleOffsets = {};

      nextCards.forEach((card) => {
        const currentLayout = itemLayoutsRef.current.get(card.id);
        const nextLayout = nextLayouts.get(card.id);

        if (!currentLayout || !nextLayout) {
          return;
        }

        const currentOffset = card.id === cardId
          ? (currentDragState.offsetY ?? 0)
          : getReorderShiftOffset(card.id, cards, itemLayoutsRef.current, currentDragState);

        settleOffsets[card.id] = currentLayout.y + currentOffset - nextLayout.y;
      });

      const settleOffsetY = settleOffsets[cardId] ?? (currentDragState.offsetY ?? 0);
      const nextDragState = {
        ...currentDragState,
        offsetY: settleOffsetY,
        settleOffsets,
        settling: true,
        targetIndex,
      };

      dragStateRef.current = nextDragState;

      setDragState(nextDragState);

      if (shouldReorder) {
        onReorder(nextCards);
      }

      scheduleDragSettleClear(cardId);
    },
    [
      cancelPendingDragMove,
      cancelSettleFrame,
      cards,
      onReorder,
      scheduleDragSettleClear,
      stopAutoScroll,
      updateDragTarget,
    ],
  );

  return (
    <AppScreenShell screenStyle={screenLayoutStyles.screenColumn}>
      <ManageSubpageTopBar
        title="선박 DB 편집하기"
        saveActive={dirty}
        onAdd={onAdd}
        onBack={onBack}
        onSave={dirty ? handleSave : undefined}
      />

      <ScrollView
        contentContainerStyle={styles.manageEditContentBody}
        onContentSizeChange={(_, height) => {
          contentSizeHeightRef.current = height;
        }}
        onLayout={(event) => {
          viewportHeightRef.current = event.nativeEvent.layout.height;
          contentTopRef.current = event.nativeEvent.layout.y;
          requestAnimationFrame(measureScrollViewport);
        }}
        onScroll={handleScroll}
        ref={contentRefCallback}
        scrollEventThrottle={16}
        scrollEnabled={!dragState || Boolean(dragState.settling)}
        showsVerticalScrollIndicator
        style={[
          styles.manageEditContent,
          WEB_BACKDROP_SCROLL_STYLE,
          { marginBottom: 64 + bottomInset },
        ]}
      >
        {reorderEnabled ? (
          <View style={styles.manageEditReorderList}>
            {cards.map((card, index) => {
              const isActiveDragCard = dragState?.cardId === card.id;
              const isReorderSettling = Boolean(dragState?.settling);
              const isSettlingDraggedCard = Boolean(isActiveDragCard && isReorderSettling);
              const isDragging = Boolean(isActiveDragCard && !isReorderSettling);
              const removalState = removingCards.get(card.id);
              const remainingIndex = cardsAfterRemovalsIndexById.get(card.id) ?? -1;
              const showDivider = removalState
                ? Boolean(removalState.showDivider)
                : remainingIndex >= 0 && remainingIndex < cardsAfterRemovals.length - 1;
              const settleOffset = dragState?.settleOffsets?.[card.id] ?? 0;
              const dragOffset = isActiveDragCard
                ? (isReorderSettling ? settleOffset : (dragState.offsetY ?? 0))
                : 0;
              const shiftOffset = isReorderSettling
                ? (isActiveDragCard ? 0 : settleOffset)
                : getReorderShiftOffset(
                    card.id,
                    cards,
                    itemLayoutsRef.current,
                    dragState,
                  );

              return (
                <ManageShipReorderItem
                  key={card.id}
                  card={card}
                  dragOffset={dragOffset}
                  itemRef={setItemRef(card.id)}
                  isDragging={isDragging}
                  isEntering={card.id === recentlyAddedCardId}
                  isReorderActive={Boolean(dragState)}
                  isSettling={isReorderSettling}
                  isSettlingDraggedCard={isSettlingDraggedCard}
                  originalCard={originalCardsById.get(card.id)}
                  removalState={removalState}
                  shiftOffset={shiftOffset}
                  showDivider={showDivider}
                  onDelete={handleDeleteRequest}
                  onDragEnd={handleDragEnd}
                  onDragMove={handleDragMove}
                  onDragStart={handleDragStart}
                  onFieldChange={onFieldChange}
                  onImageChange={onImageChange}
                  onItemLayout={(event) => {
                    if (removalState) {
                      return;
                    }

                    const nextLayout = {
                      ...(itemLayoutsRef.current.get(card.id) ?? {}),
                      height: event.nativeEvent.layout.height,
                      y: event.nativeEvent.layout.y,
                    };

                    itemLayoutsRef.current.set(card.id, nextLayout);
                  }}
                />
              );
            })}
          </View>
        ) : (
          visibleCards.map((card, index) => {
            const removalState = removingCards.get(card.id);
            const remainingIndex = visibleCardsAfterRemovalsIndexById.get(card.id) ?? -1;
            const showDivider = removalState
              ? Boolean(removalState.showDivider)
              : remainingIndex >= 0 && remainingIndex < visibleCardsAfterRemovals.length - 1;

            return (
              <ManageShipStaticItem
                key={card.id}
                card={card}
                itemRef={setItemRef(card.id)}
                isEntering={card.id === recentlyAddedCardId}
                originalCard={originalCardsById.get(card.id)}
                removalState={removalState}
                showDivider={showDivider}
                onDelete={handleDeleteRequest}
                onFieldChange={onFieldChange}
                onImageChange={onImageChange}
                onItemLayout={(event) => {
                  if (removalState) {
                    return;
                  }

                  const nextLayout = {
                    ...(itemLayoutsRef.current.get(card.id) ?? {}),
                    height: event.nativeEvent.layout.height,
                    y: event.nativeEvent.layout.y,
                  };

                  itemLayoutsRef.current.set(card.id, nextLayout);
                }}
              />
            );
          })
        )}
      </ScrollView>

      <ManageSearchBar value={searchQuery} onChange={onSearchChange} onClear={onSearchClear} />

      <ManageSavedToastPresence toast={toast} onDismiss={onDismissToast} />
      <ManageAlertModalPresence
        visible={showDiscardModal}
        onCancel={onDismissDiscard}
        onConfirm={onConfirmDiscard}
      />
    </AppScreenShell>
  );
}

const styles = StyleSheet.create({
  sectionDivider: {
    height: 16,
    backgroundColor: 'var(--color-bg-divider)',
  },
  iconSlot18: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconSlot24: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  manageSubpageTopBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 2,
    height: 64,
    paddingHorizontal: 18,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--color-bg-screen)',
  },
  manageSubpageActions: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  manageSaveButton: {
    minHeight: 20,
  },
  manageSaveLabel: {
    color: 'var(--color-text-muted)',
    fontSize: 18,
    fontWeight: '700',
  },
  manageSaveLabelActive: {
    color: 'var(--color-accent)',
  },
  manageEditContent: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
    marginTop: 28,
    marginBottom: 64,
  },
  manageEditContentBody: {
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: 24,
  },
  manageEditReorderList: {
    display: 'flex',
    flexDirection: 'column',
  },
  manageEditEntryMeasure: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  manageEditStaticEntry: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  manageEditSection: {
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  manageEditSectionDragging: {
    backgroundColor: 'transparent',
    shadowColor: 'var(--slate-700)',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
    elevation: 10,
  },
  manageEditReorderEntry: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  manageEditReorderEntryDragging: {
  },
  manageEditReorderItem: {
    position: 'relative',
    backgroundColor: 'var(--color-bg-screen)',
  },
  manageEditReorderItemDragging: {
    backgroundColor: 'transparent',
    zIndex: 24,
  },
  manageEditReorderDivider: {
  },
  manageEditReorderDividerSettling: {
  },
  reorderHandle: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    justifyContent: 'center',
    gap: 4,
    width: 'auto',
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 28,
    marginBottom: 12,
    paddingVertical: 0,
    paddingHorizontal: 10,
    borderWidth: 0,
    borderRadius: 999,
    backgroundColor: 'var(--color-bg-surface-muted)',
    color: 'var(--color-text-muted)',
  },
  reorderHandleDragging: {
    backgroundColor: 'var(--color-bg-accent-soft)',
    color: 'var(--color-accent)',
    transform: [{ translateY: -1 }],
    shadowOpacity: 0,
    elevation: 0,
  },
  reorderLabel: {
    color: 'var(--color-text-muted)',
    fontSize: 13,
    fontWeight: '600',
  },
  reorderLabelActive: {
    color: 'var(--color-accent)',
  },
  manageSearchBar: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
    flex: 0,
    height: 64,
    minHeight: 64,
    paddingRight: 18,
    paddingBottom: 0,
    paddingLeft: 18,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'var(--color-bg-toolbar)',
  },
  manageSearchInput: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 24,
    minHeight: 24,
    maxHeight: 24,
    padding: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    color: 'var(--color-text-muted)',
    fontSize: 18,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  manageSearchInputFilled: {
    color: 'var(--color-text-secondary)',
  },
  manageSearchIconSlot: {
    width: 24,
    height: 24,
    flexGrow: 0,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIconButton: {
    width: 24,
    height: 24,
    flexGrow: 0,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageTextBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'var(--color-bg-surface-muted)',
  },
  manageTextBoxTitle: {
    width: 160,
    height: 42,
  },
  manageTextBoxSubtitle: {
    width: 160,
    height: 26,
  },
  manageTextBoxEdited: {
  },
  manageTextBoxInput: {
    width: '100%',
    padding: 0,
    paddingVertical: 0,
    margin: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  manageTextBoxInputTitle: {
    color: 'var(--color-text-tertiary)',
    fontSize: 24,
    height: 31.2,
    fontWeight: '700',
  },
  manageTextBoxInputSubtitle: {
    color: 'var(--color-text-tertiary)',
    fontSize: 15,
    height: 19.5,
    fontWeight: '400',
  },
  manageTextBoxInputActive: {
    color: 'var(--color-text-primary)',
  },
  manageTextBoxInputEdited: {
    color: 'var(--color-accent)',
  },
  manageFieldPill: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    gap: 2,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: '100%',
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'var(--color-bg-surface-muted)',
    color: 'var(--color-text-tertiary)',
    fontSize: 18,
    fontWeight: '500',
    ...Platform.select({
      web: {
        height: 24,
        minHeight: 24,
        maxHeight: 24,
        paddingVertical: 4,
      },
      default: {
        height: 32,
        minHeight: 32,
        maxHeight: 32,
        paddingVertical: 2,
      },
    }),
  },
  manageFieldPillEdited: {
  },
  manageFieldInput: {
    width: '100%',
    height: Platform.OS === 'web' ? 24 : 28,
    minHeight: 0,
    maxHeight: Platform.OS === 'web' ? 24 : 28,
    minWidth: 0,
    maxWidth: '100%',
    flexShrink: 1,
    padding: 0,
    color: 'var(--color-text-tertiary)',
    fontSize: 18,
    fontWeight: '500',
    backgroundColor: 'transparent',
    borderWidth: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  manageFieldInputEdited: {
    color: 'var(--color-accent)',
  },
  editStrokeOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 1,
    borderColor: 'var(--color-border-accent-soft)',
    borderRadius: 8,
  },
  manageShipCard: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  manageShipCardDragging: {
    opacity: 0.5,
  },
  manageShipHero: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  manageShipIdentity: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 0,
  },
  manageShipImage: {
    width: 150,
    height: 90,
    borderRadius: 6,
    flexShrink: 0,
  },
  manageShipImageButton: {
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    flexShrink: 0,
    borderRadius: 6,
    overflow: 'hidden',
  },
  manageShipDetails: {
    width: '100%',
    marginTop: 36,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  manageShipRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  manageShipLabel: {
    width: 126,
    flexShrink: 0,
    color: 'var(--color-text-tertiary)',
    fontSize: 18,
    fontWeight: '700',
  },
  manageShipRule: {
    width: '100%',
    height: 1,
    marginTop: 24,
    backgroundColor: 'var(--color-border-subtle)',
  },
  manageShipEquipment: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 24,
    width: '100%',
  },
  manageShipEquipmentItem: {
    width: 144,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 0,
    backgroundColor: 'transparent',
    textAlign: 'left',
  },
  manageShipEquipmentLabel: {
    width: 126,
    fontSize: 18,
    fontWeight: '700',
  },
  manageShipEquipmentLabelMuted: {
    color: 'var(--color-text-violet-muted)',
  },
  manageShipEquipmentLabelBlue: {
    color: 'var(--color-accent)',
  },
  manageShipEquipmentLabelViolet: {
    color: 'var(--color-text-violet)',
  },
  manageShipEquipmentMuted: {
    color: 'var(--color-text-violet-muted)',
  },
  manageShipEquipmentBlue: {
    color: 'var(--color-accent)',
  },
  manageShipEquipmentViolet: {
    color: 'var(--color-text-violet)',
  },
  manageShipDeleteButton: {
    width: 48,
    height: 48,
    marginTop: 24,
    borderRadius: 999,
    backgroundColor: 'var(--color-bg-danger-soft)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  modalShell: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 6,
    display: 'flex',
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
  modalCard: {
    position: 'relative',
    maxWidth: MODAL_CONTENT_WIDTH,
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
    display: 'flex',
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
  toastShell: {
    position: 'absolute',
    right: 0,
    left: 0,
    alignItems: 'center',
    zIndex: 4,
  },
  toastShellDragging: {
  },
  toastShellDismissing: {
  },
  toastFade: {
    display: 'flex',
  },
  toastFadeDismissing: {
  },
  toastShadow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 14,
  },
  toast: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 999,
    position: 'relative',
    overflow: 'hidden',
  },
  toastSurfaceFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,
  },
  toastInsetStroke: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 1,
    borderRadius: 999,
  },
  pointerEventsNone: {
    pointerEvents: 'none',
  },
  toastForeground: {
    position: 'relative',
    zIndex: 1,
  },
  toastMessage: {
    color: 'var(--color-text-toast)',
    fontSize: 18,
    fontWeight: '500',
    includeFontPadding: false,
    position: 'relative',
    textAlignVertical: 'center',
    zIndex: 1,
  },
});
