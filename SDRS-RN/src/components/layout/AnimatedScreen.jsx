import { useLayoutEffect, useRef } from 'react';

import {
  getScreenMotionState,
  getScreenOverlayState,
  getScreenOverlayTransition,
  getScreenShadowState,
  getScreenTransition,
  getScreenZIndex,
  hiddenScreenState,
  visibleScreenState,
} from '../../motion.js';
import { blurFocusedDescendant } from '../../platform/index';

const FLAT_APP_SHELL_GRADIENT = 'linear-gradient(var(--color-bg-app), var(--color-bg-app))';
const FLATTENED_BACKDROP_DIRECTIONS = new Set(['tabForward', 'tabBackward', 'push', 'pop']);

function toCssLength(value) {
  if (typeof value === 'number') {
    return `${value}px`;
  }

  return value ?? '0px';
}

function toCssEasing(ease) {
  if (Array.isArray(ease)) {
    return `cubic-bezier(${ease.join(', ')})`;
  }

  return ease ?? 'linear';
}

function getTransitionOptions(transition) {
  if (!transition || typeof transition.duration === 'number') {
    return {
      duration: Math.max(0, (transition?.duration ?? 0) * 1000),
      easing: toCssEasing(transition?.ease),
      fill: 'forwards',
    };
  }

  const propertyTransitions = Object.values(transition).filter(Boolean);
  const longestTransition =
    propertyTransitions.reduce((longest, current) => {
      if ((current.duration ?? 0) > (longest.duration ?? 0)) {
        return current;
      }

      return longest;
    }, propertyTransitions[0]) ?? {};

  return {
    duration: Math.max(0, (longestTransition.duration ?? 0) * 1000),
    easing: toCssEasing(longestTransition.ease),
    fill: 'forwards',
  };
}

function getScreenKeyframe(state) {
  const x = toCssLength(state.x ?? 0);
  const y = toCssLength(state.y ?? 0);
  const scale = state.scale ?? 1;

  return {
    opacity: state.opacity ?? 1,
    transform: `translate3d(${x}, ${y}, 0) scale(${scale})`,
    boxShadow: state.boxShadow ?? hiddenScreenState.boxShadow,
  };
}

function applyScreenState(element, state) {
  const keyframe = getScreenKeyframe(state);

  element.style.opacity = String(keyframe.opacity);
  element.style.transform = keyframe.transform;
  element.style.boxShadow = keyframe.boxShadow;
}

function applyOverlayState(element, state) {
  element.style.opacity = String(state.opacity ?? 0);
}

function playAnimation({ element, from, to, transition, toKeyframe, applyState }) {
  const options = getTransitionOptions(transition);

  applyState(element, from);

  if (options.duration <= 0 || typeof element.animate !== 'function') {
    applyState(element, to);
    return {
      cancel() {},
      finished: Promise.resolve(),
    };
  }

  const animation = element.animate([toKeyframe(from), toKeyframe(to)], options);
  const finished = animation.finished
    .then(() => {
      applyState(element, to);
    })
    .catch(() => {});

  return {
    cancel() {
      animation.cancel();
    },
    finished,
  };
}

function playScreenAnimation(element, from, to, transition) {
  return playAnimation({
    element,
    from,
    to,
    transition,
    toKeyframe: getScreenKeyframe,
    applyState: applyScreenState,
  });
}

function playOverlayAnimation(element, from, to, transition) {
  return playAnimation({
    element,
    from,
    to,
    transition,
    toKeyframe: (state) => ({ opacity: state.opacity ?? 0 }),
    applyState: applyOverlayState,
  });
}

function waitForNextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

function shouldFlattenTransitionBackdrop(direction) {
  return FLATTENED_BACKDROP_DIRECTIONS.has(direction);
}

function shouldFlattenScreen(direction, entering) {
  if (!shouldFlattenTransitionBackdrop(direction)) {
    return false;
  }

  if (direction === 'tabForward' || direction === 'tabBackward') {
    return !entering;
  }

  return true;
}

export default function AnimatedScreen({
  children,
  currentScreen,
  fillMode = 'fixed',
  navDir,
  reducedMotion = false,
  screenKey,
}) {
  const scope = useRef(null);
  const overlayRef = useRef(null);
  const isActive = currentScreen === screenKey;
  const previousActiveRef = useRef(null);

  useLayoutEffect(() => {
    const element = scope.current;
    const overlayElement = overlayRef.current;
    let cancelled = false;
    const activeAnimations = [];

    const resetScreenChrome = () => {
      if (element) {
        element.style.boxShadow = hiddenScreenState.boxShadow;
        element.style.removeProperty('--gradient-app-shell');
      }

      if (overlayElement) {
        overlayElement.style.opacity = '0';
      }
    };

    if (!element) {
      return undefined;
    }

    if (previousActiveRef.current === null) {
      previousActiveRef.current = isActive;
      element.style.visibility = isActive ? 'visible' : 'hidden';
      element.style.zIndex = isActive ? '1' : '0';

      if (!isActive) {
        applyScreenState(element, hiddenScreenState);
      } else {
        applyScreenState(element, visibleScreenState);
      }

      if (overlayElement) {
        applyOverlayState(overlayElement, { opacity: 0 });
      }

      resetScreenChrome();

      return undefined;
    }

    if (previousActiveRef.current === isActive) {
      return undefined;
    }

    previousActiveRef.current = isActive;
    if (!isActive) {
      blurFocusedDescendant(element);
    }
    element.style.willChange = 'transform, opacity, box-shadow';

    if (shouldFlattenScreen(navDir, isActive)) {
      element.style.setProperty('--gradient-app-shell', FLAT_APP_SHELL_GRADIENT);
    }

    if (overlayElement) {
      overlayElement.style.willChange = 'opacity';
    }

    if (reducedMotion) {
      if (isActive) {
        element.style.visibility = 'visible';
        element.style.zIndex = '1';
      }

      const phase = isActive ? 'enter' : 'exit';
      const animation = playScreenAnimation(
        element,
        isActive ? getScreenMotionState(navDir, phase, true) : visibleScreenState,
        {
          ...(isActive ? visibleScreenState : hiddenScreenState),
          boxShadow: getScreenShadowState(navDir, phase, true),
        },
        getScreenTransition(navDir, true, phase),
      );
      activeAnimations.push(animation);

      animation.finished.then(() => {
        if (cancelled || !element) {
          return;
        }

        if (isActive) {
          resetScreenChrome();
          element.style.zIndex = '1';
          element.style.willChange = '';
        } else {
          resetScreenChrome();
          element.style.visibility = 'hidden';
          element.style.zIndex = '0';
          element.style.willChange = '';
        }

        if (overlayElement) {
          overlayElement.style.opacity = '0';
          overlayElement.style.willChange = '';
        }
      });

      if (overlayElement) {
        const overlayAnimation = playOverlayAnimation(
          overlayElement,
          { opacity: 0 },
          getScreenOverlayState(navDir, phase, true),
          getScreenOverlayTransition(navDir, true),
        );
        activeAnimations.push(overlayAnimation);
      }

      return () => {
        cancelled = true;
        activeAnimations.forEach((animation) => animation.cancel());
        resetScreenChrome();
      };
    }

    if (isActive) {
      element.style.visibility = 'visible';
      element.style.zIndex = String(getScreenZIndex(navDir, true));

      if (overlayElement) {
        applyOverlayState(overlayElement, getScreenOverlayState(navDir, 'enter', reducedMotion));
      }

      const enterState = {
        ...getScreenMotionState(navDir, 'enter', reducedMotion),
        boxShadow: getScreenShadowState(navDir, 'enter', reducedMotion),
      };

      applyScreenState(element, enterState);

      waitForNextFrame().then(() => {
        if (cancelled || !element) {
          return;
        }

        const screenAnimation = playScreenAnimation(
          element,
          enterState,
          {
            ...visibleScreenState,
            boxShadow: hiddenScreenState.boxShadow,
          },
          getScreenTransition(navDir, reducedMotion, 'enter'),
        );
        activeAnimations.push(screenAnimation);

        screenAnimation.finished.then(() => {
          if (!cancelled && element) {
            resetScreenChrome();
            element.style.zIndex = '1';
            element.style.willChange = '';
            if (overlayElement) {
              overlayElement.style.opacity = '0';
              overlayElement.style.willChange = '';
            }
          }
        });

        if (overlayElement) {
          const overlayState = getScreenOverlayState(navDir, 'enter', reducedMotion);
          const overlayAnimation = playOverlayAnimation(
            overlayElement,
            overlayState,
            overlayState,
            getScreenOverlayTransition(navDir, reducedMotion),
          );
          activeAnimations.push(overlayAnimation);
        }
      });
    } else {
      element.style.zIndex = String(getScreenZIndex(navDir, false));

      if (overlayElement) {
        const overlayAnimation = playOverlayAnimation(
          overlayElement,
          { opacity: 0 },
          getScreenOverlayState(navDir, 'exit', reducedMotion),
          getScreenOverlayTransition(navDir, reducedMotion),
        );
        activeAnimations.push(overlayAnimation);
      }

      const screenAnimation = playScreenAnimation(
        element,
        visibleScreenState,
        {
          ...getScreenMotionState(navDir, 'exit', reducedMotion),
          boxShadow: getScreenShadowState(navDir, 'exit', reducedMotion),
        },
        getScreenTransition(navDir, reducedMotion, 'exit'),
      );
      activeAnimations.push(screenAnimation);

      screenAnimation.finished.then(() => {
        if (!cancelled && element) {
          applyScreenState(element, hiddenScreenState);
          resetScreenChrome();
          element.style.visibility = 'hidden';
          element.style.zIndex = '0';
          element.style.willChange = '';
          if (overlayElement) {
            overlayElement.style.opacity = '0';
            overlayElement.style.willChange = '';
          }
        }
      });
    }

    return () => {
      cancelled = true;
      activeAnimations.forEach((animation) => animation.cancel());
      resetScreenChrome();
    };
  }, [isActive, navDir, reducedMotion]);

  return (
    <div
      className="animated-screen"
      ref={scope}
      style={{
        position: fillMode,
        inset: 0,
        overflow: 'hidden',
        pointerEvents: isActive ? 'auto' : 'none',
      }}
      inert={!isActive}
    >
      <div
        ref={overlayRef}
        className="animated-screen__overlay"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--color-overlay-scrim)',
          pointerEvents: 'none',
          opacity: 0,
          zIndex: 2,
        }}
      />
      {children}
    </div>
  );
}
