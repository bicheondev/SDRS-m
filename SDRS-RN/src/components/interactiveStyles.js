import { StyleSheet } from 'react-native';

import { motionDurationsMs, motionTokens } from '../motion.js';

const IOS_EASE = `cubic-bezier(${motionTokens.ease.ios.join(', ')})`;

export const interactiveStyles = StyleSheet.create({
  base: {
    isolation: 'isolate',
    position: 'relative',
    transitionDuration: `${motionDurationsMs.fast}ms`,
    transitionProperty: 'transform, opacity, background-color, color, box-shadow',
    transitionTimingFunction: IOS_EASE,
    WebkitTapHighlightColor: 'transparent',
    WebkitTouchCallout: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  focus: {
    outlineStyle: 'none',
    boxShadow: 'none',
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
