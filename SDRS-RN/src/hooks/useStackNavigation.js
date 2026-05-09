import { startTransition, useCallback, useState } from 'react';

function commitNavigation(deferred, update) {
  if (deferred) {
    startTransition(update);
    return;
  }

  update();
}

export function useStackNavigation(initialScreen) {
  const [navigationState, setNavigationState] = useState({
    stack: [initialScreen],
    transition: 'none',
    transitionFrom: null,
    transitionTo: initialScreen,
  });

  const push = useCallback((nextScreen, options = {}) => {
    commitNavigation(options.deferred, () => {
      setNavigationState((current) => {
        const currentStack = current.stack;
        const currentScreen = currentStack[currentStack.length - 1];
        if (currentStack[currentStack.length - 1] === nextScreen) {
          return current;
        }

        return {
          stack: [...currentStack, nextScreen],
          transition: 'push',
          transitionFrom: currentScreen,
          transitionTo: nextScreen,
        };
      });
    });
  }, []);

  const pop = useCallback((options = {}) => {
    commitNavigation(options.deferred, () => {
      setNavigationState((current) => {
        const currentStack = current.stack;
        if (currentStack.length <= 1) {
          return current;
        }

        return {
          stack: currentStack.slice(0, -1),
          transition: 'pop',
          transitionFrom: currentStack[currentStack.length - 1],
          transitionTo: currentStack[currentStack.length - 2],
        };
      });
    });
  }, []);

  const reset = useCallback(
    (nextScreen = initialScreen, nextTransition = 'none', options = {}) => {
      commitNavigation(options.deferred, () => {
        setNavigationState((current) => ({
          stack: [nextScreen],
          transition: nextTransition,
          transitionFrom: current.stack[current.stack.length - 1] ?? null,
          transitionTo: nextScreen,
        }));
      });
    },
    [initialScreen],
  );
  const stack = navigationState.stack;

  return {
    currentScreen: stack[stack.length - 1],
    pop,
    push,
    reset,
    stack,
    transition: navigationState.transition,
    transitionFrom: navigationState.transitionFrom,
    transitionTo: navigationState.transitionTo,
  };
}
