import { UIManager, findNodeHandle } from 'react-native';

export function measureNodeInWindow(node) {
  return new Promise((resolve) => {
    if (!node) {
      resolve(null);
      return;
    }

    if (typeof node.measureInWindow === 'function') {
      node.measureInWindow((left, top, width, height) => {
        if (!width || !height) {
          resolve(null);
          return;
        }

        resolve({ left, top, width, height });
      });
      return;
    }

    const handle = findNodeHandle(node);
    if (!handle) {
      resolve(null);
      return;
    }

    UIManager.measureInWindow(handle, (left, top, width, height) => {
      if (!width || !height) {
        resolve(null);
        return;
      }

      resolve({ left, top, width, height });
    });
  });
}
