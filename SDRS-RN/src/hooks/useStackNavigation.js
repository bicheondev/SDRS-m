import { startTransition, useCallback, useState } from 'react';

function commitNavigation(deferred, update) {
  if (deferred) {
    startTransition(update);
    return;
  }

  update();
}

export function useStackNavigation(initialScreen) {
  const [stack, setStack] = useState([initialScreen]);
  const [transition, setTransition] = useState('none');

  const push = useCallback((nextScreen, options = {}) => {
    commitNavigation(options.deferred, () => {
      setTransition('push');
      setStack((currentStack) => {
        if (currentStack[currentStack.length - 1] === nextScreen) {
          return currentStack;
        }

        return [...currentStack, nextScreen];
      });
    });
  }, []);

  const pop = useCallback((options = {}) => {
    commitNavigation(options.deferred, () => {
      setTransition('pop');
      setStack((currentStack) =>
        currentStack.length > 1 ? currentStack.slice(0, -1) : currentStack,
      );
    });
  }, []);

  const reset = useCallback(
    (nextScreen = initialScreen, nextTransition = 'none', options = {}) => {
      commitNavigation(options.deferred, () => {
        setTransition(nextTransition);
        setStack([nextScreen]);
      });
    },
    [initialScreen],
  );

  return {
    currentScreen: stack[stack.length - 1],
    pop,
    push,
    reset,
    stack,
    transition,
  };
}
