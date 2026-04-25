import { Animated, Easing, StyleSheet } from 'react-native';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  getScreenMotionState,
  getScreenTransition,
  getScreenZIndex,
  hiddenScreenState,
  visibleScreenState,
  motionTokens,
} from '../motion.js';

function setAnimatedState(animatedState, state) {
  animatedState.opacity.setValue(state.opacity);
  animatedState.translateY.setValue(state.y ?? 0);
  animatedState.scale.setValue(state.scale ?? 1);
}

function getAnimatedEasing(ease) {
  if (!Array.isArray(ease) || ease.length !== 4) {
    return Easing.linear;
  }

  const [x1, y1, x2, y2] = ease;
  return Easing.bezier(x1, y1, x2, y2);
}

function buildAnimation(animatedState, targetState, transition) {
  const durationMs = Math.round((transition.duration ?? motionTokens.duration.fast) * 1000);

  if (durationMs <= 0) {
    setAnimatedState(animatedState, targetState);
    return null;
  }

  const easing = getAnimatedEasing(transition.ease ?? motionTokens.ease.ios);

  return Animated.parallel(
    [
      Animated.timing(animatedState.opacity, {
        duration: durationMs,
        easing,
        toValue: targetState.opacity,
        useNativeDriver: false,
      }),
      Animated.timing(animatedState.translateY, {
        duration: durationMs,
        easing,
        toValue: targetState.y ?? 0,
        useNativeDriver: false,
      }),
      Animated.timing(animatedState.scale, {
        duration: durationMs,
        easing,
        toValue: targetState.scale ?? 1,
        useNativeDriver: false,
      }),
    ],
    { stopTogether: true },
  );
}

export function RnwAuthRouteStage({
  children,
  currentScreen,
  navDir,
  reducedMotion = false,
  screenKey,
}) {
  const isActive = currentScreen === screenKey;
  const previousActiveRef = useRef(null);
  const animationRef = useRef(null);
  const frameRef = useRef(null);
  const animatedStateRef = useRef({
    opacity: new Animated.Value(isActive ? visibleScreenState.opacity : hiddenScreenState.opacity),
    translateY: new Animated.Value(isActive ? visibleScreenState.y : hiddenScreenState.y),
    scale: new Animated.Value(isActive ? visibleScreenState.scale : hiddenScreenState.scale),
  });
  const animatedState = animatedStateRef.current;
  const [isVisible, setIsVisible] = useState(isActive);
  const [zIndex, setZIndex] = useState(isActive ? 1 : 0);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }

      animationRef.current?.stop?.();
    },
    [],
  );

  useLayoutEffect(() => {
    let cancelled = false;

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    animationRef.current?.stop?.();
    animationRef.current = null;

    if (previousActiveRef.current === null) {
      previousActiveRef.current = isActive;
      setAnimatedState(animatedState, isActive ? visibleScreenState : hiddenScreenState);
      setIsVisible(isActive);
      setZIndex(isActive ? 1 : 0);
      return undefined;
    }

    if (previousActiveRef.current === isActive) {
      return undefined;
    }

    previousActiveRef.current = isActive;

    if (isActive) {
      const enterState = getScreenMotionState(navDir, 'enter', reducedMotion);
      const transition = getScreenTransition(navDir, reducedMotion, 'enter');

      setIsVisible(true);
      setZIndex(getScreenZIndex(navDir, true));
      setAnimatedState(animatedState, enterState);

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;

        if (cancelled) {
          return;
        }

        const animation = buildAnimation(animatedState, visibleScreenState, transition);

        if (!animation) {
          setZIndex(1);
          return;
        }

        animationRef.current = animation;
        animation.start(({ finished }) => {
          animationRef.current = null;

          if (!finished || cancelled) {
            return;
          }

          setAnimatedState(animatedState, visibleScreenState);
          setZIndex(1);
        });
      });
    } else {
      const exitState = getScreenMotionState(navDir, 'exit', reducedMotion);
      const transition = getScreenTransition(navDir, reducedMotion, 'exit');

      setZIndex(getScreenZIndex(navDir, false));

      const animation = buildAnimation(animatedState, exitState, transition);

      if (!animation) {
        setAnimatedState(animatedState, hiddenScreenState);
        setIsVisible(false);
        setZIndex(0);
        return undefined;
      }

      animationRef.current = animation;
      animation.start(({ finished }) => {
        animationRef.current = null;

        if (!finished || cancelled) {
          return;
        }

        setAnimatedState(animatedState, hiddenScreenState);
        setIsVisible(false);
        setZIndex(0);
      });
    }

    return () => {
      cancelled = true;

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      animationRef.current?.stop?.();
      animationRef.current = null;
    };
  }, [animatedState, isActive, navDir, reducedMotion]);

  return (
    <Animated.View
      style={[
        styles.screen,
        !isVisible && styles.screenHidden,
        {
          pointerEvents: isActive ? 'auto' : 'none',
          zIndex,
          opacity: animatedState.opacity,
          transform: [{ translateY: animatedState.translateY }, { scale: animatedState.scale }],
        },
      ]}
    >
      {children}
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
  screenHidden: {
    visibility: 'hidden',
  },
});
