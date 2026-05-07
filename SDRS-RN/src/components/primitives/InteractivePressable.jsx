import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../ThemeContext.js';
import { motionDurationsMs, motionTokens } from '../../motion.js';
import { getHighResolutionTime } from '../../platform/index';
import { resolveCssVariableString } from '../../theme.js';
import { resolveInlineStyle } from '../../themeRuntime.js';

const GUIDE_VARIANTS = {
  default: {
    backgroundColor: 'var(--slate-50)',
    inset: 0,
    radius: undefined,
  },
  danger: {
    backgroundColor: 'var(--slate-50)',
    inset: 0,
    radius: undefined,
  },
  dangerCircle: {
    backgroundColor: 'var(--color-bg-danger-soft)',
    inset: '2px',
    radius: 999,
  },
  equipment: {
    backgroundColor: 'var(--slate-50)',
    inset: '-6px -14px',
    radius: 'var(--radius-interaction)',
  },
  filled: {
    backgroundColor: 'var(--slate-50)',
    inset: 0,
    radius: undefined,
  },
  icon: {
    backgroundColor: 'var(--color-state-layer-strong)',
    inset: '-8px',
    radius: 'var(--radius-interaction)',
  },
  media: {
    backgroundColor: 'var(--slate-50)',
    inset: 0,
    radius: 'var(--motion-thumbnail-radius)',
  },
  option: {
    backgroundColor: 'var(--slate-50)',
    inset: '-4px -10px',
    radius: 'var(--radius-interaction)',
  },
  pill: {
    backgroundColor: 'var(--slate-50)',
    inset: '-6px -10px',
    radius: 'var(--radius-interaction)',
  },
  row: {
    backgroundColor: 'var(--slate-50)',
    inset: '2px 8px',
    radius: 'var(--radius-interaction)',
  },
  surface: {
    backgroundColor: 'var(--slate-50)',
    inset: 0,
    radius: 0,
  },
  tab: {
    backgroundColor: 'var(--slate-50)',
    inset: '-2px -12px',
    radius: 'var(--radius-interaction)',
  },
};

const PRESSABLE_VARIANT_CLASSES = new Set([
  'danger',
  'filled',
  'icon',
  'media',
  'option',
  'pill',
  'surface',
  'tab',
]);

const PRESS_GUIDE_MIN_VISIBLE_MS = 48;
const PRESS_EASING = Easing.bezier(...motionTokens.ease.ios);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function getPressScaleForVariant(variant) {
  if (variant === 'icon') {
    return motionTokens.scale.iconTap;
  }

  if (variant === 'media') {
    return motionTokens.scale.cardTap;
  }

  if (variant === 'option' || variant === 'row') {
    return motionTokens.scale.rowTap;
  }

  return motionTokens.scale.buttonTap;
}

function joinClassNames(...tokens) {
  return tokens.filter(Boolean).join(' ');
}

function toCssLength(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  return typeof value === 'number' ? `${value}px` : String(value);
}

function resolveCssInset(value) {
  const resolvedValue = value ?? 0;

  if (typeof resolvedValue === 'number') {
    return {
      bottom: resolvedValue,
      left: resolvedValue,
      right: resolvedValue,
      top: resolvedValue,
    };
  }

  const parts = String(resolvedValue).trim().split(/\s+/);
  const [top, right = top, bottom = top, left = right] = parts;

  return { bottom, left, right, top };
}

function resolvePressGuideVariables() {
  return {};
}

function resolveBorderRadius(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'number') {
    return value;
  }

  const stringValue = String(value);

  if (stringValue.startsWith('var(')) {
    const resolved = resolveCssVariableString(stringValue);
    return typeof resolved === 'number' ? resolved : Number.parseFloat(resolved) || undefined;
  }

  if (stringValue.endsWith('px')) {
    return Number.parseFloat(stringValue) || undefined;
  }

  return Number.parseFloat(stringValue) || undefined;
}

function resolveOverlayInset(insetValue) {
  const insetSides = resolveCssInset(insetValue);
  const result = {};

  for (const side of ['top', 'right', 'bottom', 'left']) {
    const raw = insetSides[side];
    if (raw === undefined || raw === null) {
      continue;
    }
    if (typeof raw === 'number') {
      result[side] = raw;
      continue;
    }
    const parsed = Number.parseFloat(String(raw));
    if (!Number.isNaN(parsed)) {
      result[side] = parsed;
    }
  }

  return result;
}

function resolvePressGuideOverlayStyle(variant, color, radius, inset) {
  const resolvedVariant = GUIDE_VARIANTS[variant] ?? GUIDE_VARIANTS.default;
  const rawColor = color ?? resolvedVariant.backgroundColor;
  const resolvedColor = resolveCssVariableString(rawColor);
  const resolvedRadius = resolveBorderRadius(radius ?? resolvedVariant.radius);
  const resolvedInset = resolveOverlayInset(inset ?? resolvedVariant.inset);

  return {
    ...resolvedInset,
    backgroundColor: resolvedColor,
    ...(resolvedRadius !== undefined ? { borderRadius: resolvedRadius } : null),
  };
}

function cancelScheduledTimeout(timeoutRef) {
  if (timeoutRef.current === null) {
    return;
  }

  clearTimeout(timeoutRef.current);
  timeoutRef.current = null;
}

export const InteractivePressable = forwardRef(function InteractivePressable(
  {
    children,
    className,
    disabled = false,
    onBlur,
    onPressIn,
    onPressOut,
    pressGuideColor,
    pressGuideInset,
    pressGuideRadius,
    pressGuideVariant = 'default',
    style,
    testOnly_pressed,
    ...props
  },
  ref,
) {
  const { resolvedColorMode } = useTheme();
  const [pressedFallback, setPressedFallback] = useState(false);
  const [pressGuideActive, setPressGuideActive] = useState(false);
  const forcedPressed = testOnly_pressed === true;
  const guideReleaseTimeoutRef = useRef(null);
  const guidePressStartedAtRef = useRef(0);
  const pressProgress = useSharedValue(forcedPressed ? 1 : 0);
  const pressScale = getPressScaleForVariant(pressGuideVariant);

  const cancelGuideRelease = useCallback(() => {
    cancelScheduledTimeout(guideReleaseTimeoutRef);
  }, []);

  useEffect(() => cancelGuideRelease, [cancelGuideRelease]);

  const handleBlur = useCallback(
    (event) => {
      cancelGuideRelease();
      setPressedFallback(false);
      setPressGuideActive(false);
      onBlur?.(event);
    },
    [cancelGuideRelease, onBlur],
  );

  const handlePressIn = useCallback(
    (event) => {
      cancelGuideRelease();
      guidePressStartedAtRef.current = getHighResolutionTime();
      setPressedFallback(true);
      setPressGuideActive(true);
      onPressIn?.(event);
    },
    [cancelGuideRelease, onPressIn],
  );

  const handlePressOut = useCallback(
    (event) => {
      cancelGuideRelease();
      setPressedFallback(false);

      const elapsed = getHighResolutionTime() - guidePressStartedAtRef.current;
      const releaseDelay = Math.max(0, PRESS_GUIDE_MIN_VISIBLE_MS - elapsed);

      guideReleaseTimeoutRef.current = setTimeout(() => {
        guideReleaseTimeoutRef.current = null;
        setPressedFallback(false);
        setPressGuideActive(false);
      }, releaseDelay);
      onPressOut?.(event);
    },
    [cancelGuideRelease, onPressOut],
  );

  const resolveInteractionState = useCallback(
    (interactionState) => ({
      ...interactionState,
      pressed: interactionState.pressed || pressedFallback || forcedPressed,
    }),
    [forcedPressed, pressedFallback],
  );

  const pressGuideStyle = useMemo(
    () =>
      resolvePressGuideVariables(
        pressGuideVariant,
        pressGuideColor,
        pressGuideRadius,
        pressGuideInset,
      ),
    [pressGuideColor, pressGuideInset, pressGuideRadius, pressGuideVariant],
  );

  const pressGuideOverlayStyle = useMemo(
    () =>
      resolvePressGuideOverlayStyle(
        pressGuideVariant,
        pressGuideColor,
        pressGuideRadius,
        pressGuideInset,
      ),
    [pressGuideColor, pressGuideInset, pressGuideRadius, pressGuideVariant, resolvedColorMode],
  );

  useEffect(() => {
    const active = !disabled && (forcedPressed || pressGuideActive);
    pressProgress.value = withTiming(active ? 1 : 0, {
      duration: motionDurationsMs.fast,
      easing: PRESS_EASING,
    });
  }, [disabled, forcedPressed, pressGuideActive, pressProgress]);

  const animatedPressableStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - pressScale) * pressProgress.value }],
  }));

  const animatedPressGuideStyle = useAnimatedStyle(() => ({
    opacity: pressProgress.value,
  }));

  const resolvedStyle = useMemo(() => {
    if (typeof style !== 'function') {
      return [pressGuideStyle, resolveInlineStyle(style), animatedPressableStyle];
    }

    return (interactionState) => [
      pressGuideStyle,
      resolveInlineStyle(style(resolveInteractionState(interactionState))),
      animatedPressableStyle,
    ];
  }, [
    animatedPressableStyle,
    pressGuideStyle,
    resolveInteractionState,
    resolvedColorMode,
    style,
  ]);

  const resolvedClassName = useMemo(
    () =>
      joinClassNames(
        'pressable-control',
        'pressable-control--with-overlay',
        PRESSABLE_VARIANT_CLASSES.has(pressGuideVariant) &&
          `pressable-control--${pressGuideVariant}`,
        className,
      ),
    [className, pressGuideVariant],
  );

  return (
    <AnimatedPressable
      className={resolvedClassName}
      disabled={disabled}
      onBlur={handleBlur}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      ref={ref}
      style={resolvedStyle}
      testOnly_pressed={testOnly_pressed}
      {...props}
    >
      {(state) => {
        const interactionState = resolveInteractionState(state);
        const showPressGuide = !disabled && (forcedPressed || pressGuideActive);

        return (
          <>
            <Animated.View
              className={joinClassNames(
                'pressable-control__overlay',
                showPressGuide && 'pressable-control__overlay--active',
              )}
              style={[
                styles.pressGuideOverlay,
                pressGuideOverlayStyle,
                animatedPressGuideStyle,
              ]}
            />
            {typeof children === 'function' ? children(interactionState) : children}
          </>
        );
      }}
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  pressGuideOverlay: {
    opacity: 0,
    pointerEvents: 'none',
    position: 'absolute',
    zIndex: 0,
  },
});
