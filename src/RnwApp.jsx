import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLoginViewport } from './features/auth/useLoginViewport.js';
import { useReducedMotionSafe } from './hooks/useReducedMotionSafe.js';
import { getMotionCssVariables } from './motion.js';
import { RnwAuthScreen } from './auth/RnwAuthScreen.jsx';
import { RnwAuthRouteStage } from './auth/RnwAuthRouteStage.jsx';

const RnwMainAppShell = lazy(() => import('./app/RnwMainAppShell.jsx'));
let rnwAppBootstrapModulePromise = null;

function preloadRnwMainAppShell() {
  return import('./app/RnwMainAppShell.jsx');
}

function preloadRnwAppBootstrap() {
  if (!rnwAppBootstrapModulePromise) {
    rnwAppBootstrapModulePromise = import('./app/useRnwAppBootstrap.js');
  }

  void rnwAppBootstrapModulePromise.then((module) => module.preloadRnwAppBootstrap());
}

export function RnwApp() {
  const reducedMotion = useReducedMotionSafe();
  const [route, setRoute] = useState('login');
  const [routeTransition, setRouteTransition] = useState('none');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hasEnteredApp, setHasEnteredApp] = useState(false);
  const loginViewport = useLoginViewport({ enabled: route === 'login' });
  const isFilled = username.trim() !== '' && password.trim() !== '';

  useEffect(() => {
    let timeoutId = null;
    let idleCallbackId = null;

    const warmLoginSuccessPath = () => {
      preloadRnwMainAppShell();
    };

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      idleCallbackId = window.requestIdleCallback(warmLoginSuccessPath, {
        timeout: 900,
      });
    } else {
      timeoutId = window.setTimeout(warmLoginSuccessPath, 240);
    }

    return () => {
      if (idleCallbackId !== null && typeof window !== 'undefined') {
        window.cancelIdleCallback?.(idleCallbackId);
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    if (!isFilled) {
      return;
    }

    preloadRnwMainAppShell();
    preloadRnwAppBootstrap();
  }, [isFilled]);

  useEffect(() => {
    if (route === 'app') {
      setHasEnteredApp(true);
    }
  }, [route]);

  const handleEnterMainScreen = useCallback(() => {
    preloadRnwMainAppShell();
    preloadRnwAppBootstrap();
    setRouteTransition('loginToMain');
    setRoute('app');
  }, []);

  const handleLogout = useCallback(() => {
    setPassword('');
    setUsername('');
    setRouteTransition('logout');
    setRoute('login');
  }, []);

  return (
    <View style={[styles.screenStack, getMotionCssVariables(reducedMotion)]}>
      <RnwAuthRouteStage
        currentScreen={route}
        navDir={routeTransition}
        reducedMotion={reducedMotion}
        screenKey="login"
      >
        <RnwAuthScreen
          focusedField={loginViewport.focusedField}
          isFilled={isFilled}
          keyboardInset={loginViewport.keyboardInset}
          onFieldBlur={loginViewport.handleFieldBlur}
          onFieldFocus={loginViewport.handleFieldFocus}
          onPasswordChange={setPassword}
          onSubmit={handleEnterMainScreen}
          onUsernameChange={setUsername}
          password={password}
          username={username}
        />
      </RnwAuthRouteStage>

      <RnwAuthRouteStage
        currentScreen={route}
        navDir={routeTransition}
        reducedMotion={reducedMotion}
        screenKey="app"
      >
        {hasEnteredApp ? (
          <Suspense fallback={null}>
            <RnwMainAppShell
              isActive={route === 'app'}
              onLogout={handleLogout}
              reducedMotion={reducedMotion}
            />
          </Suspense>
        ) : null}
      </RnwAuthRouteStage>
    </View>
  );
}

const styles = StyleSheet.create({
  screenStack: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
});
