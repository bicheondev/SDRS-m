import { useCallback, useEffect, useRef, useState } from 'react';

import {
  addVisualViewportEventListener,
  addWindowEventListener,
  getVisualViewport,
  getWindowInnerHeight,
  requestAnimationFrameTask,
} from '../../platform/index';

export function useLoginViewport({ enabled }) {
  const [focusedField, setFocusedField] = useState('');
  const [keyboardInset, setKeyboardInset] = useState(0);
  const blurTimeoutRef = useRef(null);
  const lastInsetRef = useRef(0);

  useEffect(
    () => () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled) {
      setFocusedField('');
      setKeyboardInset(0);
      lastInsetRef.current = 0;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const viewport = getVisualViewport();
    if (!viewport) {
      return undefined;
    }

    let baseline = getWindowInnerHeight();
    let cancelAnimationFrame = null;
    let pending = 0;

    const apply = () => {
      cancelAnimationFrame = null;
      setKeyboardInset((currentInset) => {
        if (currentInset === pending) {
          return currentInset;
        }

        return pending;
      });

      if (pending > 0) {
        lastInsetRef.current = pending;
      }
    };

    const update = () => {
      const viewportHeight = getWindowInnerHeight();

      if (viewportHeight > baseline) {
        baseline = viewportHeight;
      }

      const inset = Math.max(0, baseline - viewport.height - viewport.offsetTop);

      if (inset === pending && cancelAnimationFrame !== null) {
        return;
      }

      pending = inset;

      if (cancelAnimationFrame === null) {
        cancelAnimationFrame = requestAnimationFrameTask(apply);
      }
    };

    update();
    const removeViewportResize = addVisualViewportEventListener('resize', update);
    const removeViewportScroll = addVisualViewportEventListener('scroll', update);
    const removeWindowResize = addWindowEventListener('resize', update);
    const removeOrientationChange = addWindowEventListener('orientationchange', update);

    return () => {
      removeViewportResize();
      removeViewportScroll();
      removeWindowResize();
      removeOrientationChange();
      cancelAnimationFrame?.();
      setKeyboardInset(0);
    };
  }, [enabled]);

  const handleFieldFocus = useCallback((field) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    setFocusedField(field);

    if (lastInsetRef.current > 0) {
      setKeyboardInset(lastInsetRef.current);
    }
  }, []);

  const handleFieldBlur = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => {
      setFocusedField('');
      setKeyboardInset(0);
      blurTimeoutRef.current = null;
    }, 80);
  }, []);

  return {
    focusedField,
    handleFieldBlur,
    handleFieldFocus,
    keyboardInset,
  };
}
