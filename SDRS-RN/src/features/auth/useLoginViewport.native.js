import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';

const SHOW_EVENT = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE_EVENT = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

export function useLoginViewport({ enabled }) {
  const [focusedField, setFocusedField] = useState('');
  const [keyboardInset, setKeyboardInset] = useState(0);
  const blurTimeoutRef = useRef(null);
  const lastInsetRef = useRef(0);
  const { height: viewportHeight } = useWindowDimensions();

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

    const handleShow = (event) => {
      const screenY = event?.endCoordinates?.screenY;
      const explicitHeight = event?.endCoordinates?.height ?? 0;

      // The CTA is positioned with bottom: keyboardHeight, so prefer the native
      // keyboard height and only fall back to the measured viewport gap.
      const viewportInset =
        typeof screenY === 'number' && viewportHeight > 0
          ? Math.max(0, viewportHeight - screenY)
          : 0;
      const inset = explicitHeight > 0 ? Math.max(0, explicitHeight) : viewportInset;

      lastInsetRef.current = inset;
      setKeyboardInset(inset);
    };

    const handleHide = () => {
      lastInsetRef.current = 0;
      setKeyboardInset(0);
    };

    const showSub = Keyboard.addListener(SHOW_EVENT, handleShow);
    const hideSub = Keyboard.addListener(HIDE_EVENT, handleHide);

    return () => {
      showSub.remove();
      hideSub.remove();
      setKeyboardInset(0);
    };
  }, [enabled, viewportHeight]);

  const handleFieldFocus = useCallback((field) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    setFocusedField(field);

    if (lastInsetRef.current > 0) {
      setKeyboardInset(lastInsetRef.current);
      return;
    }

    const metrics = typeof Keyboard.metrics === 'function' ? Keyboard.metrics() : null;
    const metricsHeight = metrics?.height ?? 0;
    if (metricsHeight > 0) {
      lastInsetRef.current = metricsHeight;
      setKeyboardInset(metricsHeight);
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
