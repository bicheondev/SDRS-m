import { startTransition, useCallback, useMemo, useState } from 'react';

function commitNavigation(deferred, update) {
  if (deferred) {
    startTransition(update);
    return;
  }

  update();
}

export function useRouteNavigation(initialScreen) {
  const [screen, setScreen] = useState(initialScreen);
  const [transition, setTransition] = useState('none');

  const navigate = useCallback((nextScreen, nextTransition = 'none', options = {}) => {
    commitNavigation(options.deferred, () => {
      setTransition(nextTransition);
      setScreen(nextScreen);
    });
  }, []);

  return useMemo(() => ({
    navigate,
    screen,
    transition,
  }), [navigate, screen, transition]);
}
