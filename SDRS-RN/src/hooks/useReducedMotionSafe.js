import { AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';

import { getMediaQueryMatch, subscribeMediaQuery } from '../platform/index';

export function useReducedMotionSafe() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = '(prefers-reduced-motion: reduce)';

    if (getMediaQueryMatch(mediaQuery)) {
      setReducedMotion(true);
      return subscribeMediaQuery(mediaQuery, setReducedMotion);
    }

    let cancelled = false;
    const cleanupMediaQuery = subscribeMediaQuery(mediaQuery, setReducedMotion);

    AccessibilityInfo.isReduceMotionEnabled?.().then((enabled) => {
      if (!cancelled) {
        setReducedMotion(Boolean(enabled));
      }
    });

    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (enabled) => {
      setReducedMotion(Boolean(enabled));
    });

    return () => {
      cancelled = true;
      cleanupMediaQuery();
      subscription?.remove?.();
    };
  }, []);

  return reducedMotion;
}
