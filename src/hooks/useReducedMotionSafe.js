import { AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';

export function useReducedMotionSafe() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handleChange = (event) => {
        setReducedMotion(event.matches);
      };

      setReducedMotion(mediaQuery.matches);

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }

      mediaQuery.addListener?.(handleChange);
      return () => mediaQuery.removeListener?.(handleChange);
    }

    let cancelled = false;

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
      subscription?.remove?.();
    };
  }, []);

  return reducedMotion;
}
