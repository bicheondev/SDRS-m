import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLoginViewport } from './features/auth/useLoginViewport';
import { useReducedMotionSafe } from './hooks/useReducedMotionSafe.js';
import { RnwAuthScreen } from './auth/RnwAuthScreen.jsx';
import { RnwAuthRouteStage } from './auth/RnwAuthRouteStage.jsx';
import { scheduleIdleTask } from './platform/index';

const RnwMainAppShell = lazy(() => import('./app/RnwMainAppShell.jsx'));

function preloadRnwMainAppShell() {
  return import('./app/RnwMainAppShell.jsx');
}

export function RnwApp() {
  const reducedMotion = useReducedMotionSafe();
  const [route, setRoute] = useState('login');
  const [routeTransition, setRouteTransition] = useState('none');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hasEnteredApp, setHasEnteredApp] = useState(false);
  const [loginSubmitted, setLoginSubmitted] = useState(false);
  const loginViewport = useLoginViewport({ enabled: route === 'login' });
  const isFilled = username.trim() !== '' && password.trim() !== '';
  const isLogoutExit = routeTransition === 'logout' && route === 'login';

  useEffect(() => {
    const warmLoginSuccessPath = () => {
      preloadRnwMainAppShell();
    };

    return scheduleIdleTask(warmLoginSuccessPath, {
      fallbackDelay: 240,
      timeout: 900,
    });
  }, []);

  useEffect(() => {
    if (!isFilled) {
      return;
    }

    preloadRnwMainAppShell();
  }, [isFilled]);

  useEffect(() => {
    if (route === 'app') {
      setHasEnteredApp(true);
    }
  }, [route]);

  const handleEnterMainScreen = useCallback(() => {
    preloadRnwMainAppShell();
    setLoginSubmitted(true);
    setRouteTransition('loginToMain');
    setRoute('app');
  }, []);

  const handleLogout = useCallback(() => {
    setLoginSubmitted(false);
    setPassword('');
    setUsername('');
    setRouteTransition('logout');
    setRoute('login');
  }, []);

  return (
    <View style={styles.screenStack}>
      <RnwAuthRouteStage
        currentScreen={route}
        navDir={routeTransition}
        reducedMotion={reducedMotion}
        screenKey="login"
      >
        <RnwAuthScreen
          focusedField={loginViewport.focusedField}
          isFilled={isFilled}
          loginSubmitted={loginSubmitted}
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
              suppressShadows={isLogoutExit}
            />
          </Suspense>
        ) : null}
      </RnwAuthRouteStage>
    </View>
  );
}

const styles = StyleSheet.create({
  screenStack: {
    flex: 1,
    overflow: 'hidden',
  },
});
