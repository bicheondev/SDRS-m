import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  getScreenMotionState,
  getScreenOverlayState,
  getScreenOverlayTransition,
  getScreenTransition,
  getScreenZIndex,
  hiddenScreenState,
  visibleScreenState,
  motionTokens,
} from '../../motion.js';

function toPx(value, dim) {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.endsWith('%')) {
    return (Number.parseFloat(value) / 100) * dim;
  }
  return 0;
}

function toEasing(ease) {
  if (Array.isArray(ease) && ease.length === 4) {
    const [x1, y1, x2, y2] = ease;
    return Easing.bezier(x1, y1, x2, y2);
  }
  return Easing.linear;
}

function pickPrimaryTransition(transition) {
  if (!transition) {
    return { duration: 0, ease: motionTokens.ease.linear };
  }
  if (typeof transition.duration === 'number') {
    return { duration: transition.duration, ease: transition.ease };
  }
  // Per-property transition map (e.g. { x: {...}, opacity: {...} }) — pick the longest entry.
  const entries = Object.values(transition).filter(Boolean);
  return entries.reduce(
    (longest, current) =>
      (current.duration ?? 0) > (longest.duration ?? 0) ? current : longest,
    entries[0] ?? { duration: 0, ease: motionTokens.ease.linear },
  );
}

export default function AnimatedScreen({
  children,
  currentScreen,
  fillMode = 'absolute',
  navDir,
  reducedMotion = false,
  screenKey,
}) {
  const isActive = currentScreen === screenKey;
  const previousActiveRef = useRef(null);
  const { width, height } = useWindowDimensions();

  const [interactive, setInteractive] = useState(isActive);
  const [zIndex, setZIndex] = useState(isActive ? 1 : 0);

  const opacity = useSharedValue(isActive ? visibleScreenState.opacity : hiddenScreenState.opacity);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (previousActiveRef.current === null) {
      // First mount — snap to the resting state for whichever side we're on.
      previousActiveRef.current = isActive;
      cancelAnimation(opacity);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(scale);
      cancelAnimation(overlayOpacity);
      opacity.value = isActive ? visibleScreenState.opacity : hiddenScreenState.opacity;
      translateX.value = 0;
      translateY.value = 0;
      scale.value = 1;
      overlayOpacity.value = 0;
      setInteractive(isActive);
      setZIndex(isActive ? 1 : 0);
      return undefined;
    }

    if (previousActiveRef.current === isActive) {
      return undefined;
    }
    previousActiveRef.current = isActive;

    const phase = isActive ? 'enter' : 'exit';
    const fromState = isActive
      ? getScreenMotionState(navDir, 'enter', reducedMotion)
      : visibleScreenState;
    const toState = isActive
      ? visibleScreenState
      : getScreenMotionState(navDir, 'exit', reducedMotion);
    const screenTransition = pickPrimaryTransition(
      getScreenTransition(navDir, reducedMotion, phase),
    );
    const overlayTransition = pickPrimaryTransition(
      getScreenOverlayTransition(navDir, reducedMotion),
    );
    const overlayState = getScreenOverlayState(navDir, phase, reducedMotion);

    const screenDurationMs = Math.max(0, Math.round((screenTransition.duration ?? 0) * 1000));
    const overlayDurationMs = Math.max(0, Math.round((overlayTransition.duration ?? 0) * 1000));
    const screenEasing = toEasing(screenTransition.ease);
    const overlayEasing = toEasing(overlayTransition.ease);

    setZIndex(getScreenZIndex(navDir, isActive));
    if (isActive) {
      setInteractive(true);
    }

    // Snap to the "from" pose, then animate to "to" so re-entries respect the directional offset.
    opacity.value = fromState.opacity ?? 1;
    translateX.value = toPx(fromState.x, width);
    translateY.value = toPx(fromState.y, height);
    scale.value = fromState.scale ?? 1;

    if (screenDurationMs <= 0) {
      opacity.value = toState.opacity ?? 1;
      translateX.value = toPx(toState.x, width);
      translateY.value = toPx(toState.y, height);
      scale.value = toState.scale ?? 1;
      if (!isActive) {
        setInteractive(false);
        setZIndex(0);
      }
    } else {
      const onFinishedJS = () => {
        if (!isActive) {
          setInteractive(false);
          setZIndex(0);
        }
      };

      opacity.value = withTiming(toState.opacity ?? 1, {
        duration: screenDurationMs,
        easing: screenEasing,
      });
      translateX.value = withTiming(toPx(toState.x, width), {
        duration: screenDurationMs,
        easing: screenEasing,
      });
      translateY.value = withTiming(toPx(toState.y, height), {
        duration: screenDurationMs,
        easing: screenEasing,
      });
      scale.value = withTiming(
        toState.scale ?? 1,
        { duration: screenDurationMs, easing: screenEasing },
        (finished) => {
          'worklet';
          if (finished) {
            runOnJS(onFinishedJS)();
          }
        },
      );
    }

    if (overlayDurationMs <= 0) {
      overlayOpacity.value = overlayState.opacity ?? 0;
    } else {
      overlayOpacity.value = withTiming(overlayState.opacity ?? 0, {
        duration: overlayDurationMs,
        easing: overlayEasing,
      });
    }

    return undefined;
  }, [
    height,
    isActive,
    navDir,
    opacity,
    overlayOpacity,
    reducedMotion,
    scale,
    translateX,
    translateY,
    width,
  ]);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <Animated.View
      pointerEvents={interactive ? 'auto' : 'none'}
      style={[styles.screen, { zIndex }, screenStyle]}
    >
      <Animated.View pointerEvents="none" style={[styles.overlay, overlayStyle]} />
      <View style={styles.body}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 2,
  },
  body: {
    flex: 1,
  },
});
