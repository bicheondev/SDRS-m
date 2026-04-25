import { useAnimate } from 'framer-motion';
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

const FLAT_APP_SHELL_GRADIENT = 'linear-gradient(var(--color-bg-app), var(--color-bg-app))';
const FLATTENED_BACKDROP_DIRECTIONS = new Set(['tabForward', 'tabBackward', 'push', 'pop']);

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

function blurFocusedDescendant(element) {
  if (typeof document === 'undefined' || !element) {
    return;
  }

  const activeElement = document.activeElement;

  if (activeElement && activeElement !== document.body && element.contains(activeElement)) {
    activeElement.blur?.();
  }
}

export default function AnimatedScreen({
  children,
  currentScreen,
  fillMode = 'fixed',
  navDir,
  reducedMotion = false,
  screenKey,
}) {
  const [scope, animate] = useAnimate();
  const overlayRef = useRef(null);
  const isActive = currentScreen === screenKey;
  const previousActiveRef = useRef(null);

  useLayoutEffect(() => {
    const element = scope.current;
    const overlayElement = overlayRef.current;
    let cancelled = false;

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
        animate(element, hiddenScreenState, { duration: 0 });
      } else {
        animate(element, visibleScreenState, { duration: 0 });
      }

      if (overlayElement) {
        animate(overlayElement, { opacity: 0 }, { duration: 0 });
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

      animate(
        element,
        {
          ...(isActive ? visibleScreenState : hiddenScreenState),
          boxShadow: getScreenShadowState(navDir, phase, true),
        },
        getScreenTransition(navDir, true, phase),
      ).then(() => {
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
        animate(
          overlayElement,
          getScreenOverlayState(navDir, phase, true),
          getScreenOverlayTransition(navDir, true),
        );
      }

      return () => {
        cancelled = true;
        resetScreenChrome();
      };
    }

    if (isActive) {
      element.style.visibility = 'visible';
      element.style.zIndex = String(getScreenZIndex(navDir, true));

      if (overlayElement) {
        animate(overlayElement, getScreenOverlayState(navDir, 'enter', reducedMotion), {
          duration: 0,
        });
      }

      animate(
        element,
        {
          ...getScreenMotionState(navDir, 'enter', reducedMotion),
          boxShadow: getScreenShadowState(navDir, 'enter', reducedMotion),
        },
        { duration: 0 },
      ).then(async () => {
        await waitForNextFrame();

        if (cancelled || !element) {
          return;
        }

        animate(
          element,
          {
            ...visibleScreenState,
            boxShadow: hiddenScreenState.boxShadow,
          },
          getScreenTransition(navDir, reducedMotion, 'enter'),
        ).then(() => {
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
          animate(
            overlayElement,
            getScreenOverlayState(navDir, 'enter', reducedMotion),
            getScreenOverlayTransition(navDir, reducedMotion),
          );
        }
      });
    } else {
      element.style.zIndex = String(getScreenZIndex(navDir, false));

      if (overlayElement) {
        animate(
          overlayElement,
          getScreenOverlayState(navDir, 'exit', reducedMotion),
          getScreenOverlayTransition(navDir, reducedMotion),
        );
      }

      animate(
        element,
        {
          ...getScreenMotionState(navDir, 'exit', reducedMotion),
          boxShadow: getScreenShadowState(navDir, 'exit', reducedMotion),
        },
        getScreenTransition(navDir, reducedMotion, 'exit'),
      ).then(() => {
        if (!cancelled && element) {
          animate(element, hiddenScreenState, { duration: 0 });
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
      resetScreenChrome();
    };
  }, [animate, isActive, navDir, reducedMotion, scope]);

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
