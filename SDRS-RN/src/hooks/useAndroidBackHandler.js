import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * Subscribe to the Android hardware/back-gesture button. The handler should
 * return `true` if it consumed the event (preventing the default app exit) or
 * `false` to let the system close the app.
 *
 * No-op on iOS and other platforms.
 */
export function useAndroidBackHandler(handler) {
  useEffect(() => {
    if (Platform.OS !== 'android' || typeof handler !== 'function') {
      return undefined;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      try {
        return Boolean(handler());
      } catch {
        return false;
      }
    });

    return () => subscription.remove();
  }, [handler]);
}
