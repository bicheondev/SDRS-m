import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
  const [pressedFallback, setPressedFallback] = useState(false);
  const [pressGuideActive, setPressGuideActive] = useState(false);
  const forcedPressed = testOnly_pressed === true;
  const guideReleaseTimeoutRef = useRef(null);
  const guidePressStartedAtRef = useRef(0);

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
    [pressGuideColor, pressGuideInset, pressGuideRadius, pressGuideVariant],
  );

  const resolvedStyle = useMemo(() => {
    if (typeof style !== 'function') {
      return [pressGuideStyle, resolveInlineStyle(style)];
    }

    return (interactionState) => [
      pressGuideStyle,
      resolveInlineStyle(style(resolveInteractionState(interactionState))),
    ];
  }, [pressGuideStyle, resolveInteractionState, style]);

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
    <Pressable
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
            <View
              className={joinClassNames(
                'pressable-control__overlay',
                showPressGuide && 'pressable-control__overlay--active',
              )}
              style={[
                styles.pressGuideOverlay,
                pressGuideOverlayStyle,
                showPressGuide && styles.pressGuideOverlayActive,
              ]}
            />
            {typeof children === 'function' ? children(interactionState) : children}
          </>
        );
      }}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressGuideOverlay: {
    opacity: 0,
    pointerEvents: 'none',
    position: 'absolute',
    transitionDuration: 'var(--motion-duration-fast)',
    transitionProperty: 'opacity, background-color',
    transitionTimingFunction: 'var(--motion-ease-standard)',
    zIndex: 0,
  },
  pressGuideOverlayActive: {
    opacity: 1,
  },
});
