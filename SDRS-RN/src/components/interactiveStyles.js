import { StyleSheet } from 'react-native';

import { motionTokens } from '../motion.js';

export const interactiveStyles = StyleSheet.create({
  base: {
    position: 'relative',
  },
  focus: {
  },
});

export function getInteractiveScale(kind = 'button') {
  if (kind === 'icon') {
    return motionTokens.scale.iconTap;
  }

  if (kind === 'row') {
    return motionTokens.scale.rowTap;
  }

  if (kind === 'card') {
    return motionTokens.scale.cardTap;
  }

  return motionTokens.scale.buttonTap;
}
