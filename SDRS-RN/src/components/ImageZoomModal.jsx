import { useEffect } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../ThemeContext.js';
import { motionTokens } from '../motion.js';
import { resolveCssVariableString } from '../theme.js';
import { AppIcon } from './Icons.jsx';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;
const DISMISS_DISTANCE_DP = 80;
const DISMISS_VELOCITY = 800;
const DISMISS_FADE_RANGE = 300;
const SPRING_CONFIG = {
  stiffness: motionTokens.spring.modal.stiffness,
  damping: motionTokens.spring.modal.damping,
  mass: motionTokens.spring.modal.mass,
};
const OPEN_DURATION_MS = Math.round(motionTokens.duration.image * 1000);
const IOS_EASE = motionTokens.ease.ios;

function clampWorklet(value, min, max) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function ImageZoomModalContent({ session, onClose }) {
  useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const vessels = session?.vessels ?? [];
  const initialIndex = clamp(session?.startIndex ?? 0, 0, Math.max(vessels.length - 1, 0));
  const vessel = vessels[initialIndex] ?? null;
  const imageUri = vessel?.imageWide || (typeof vessel?.image === 'string' ? vessel.image : null);

  const fromRect = session?.fromRect ?? session?.sourceRect ?? null;
  const hasFromRect =
    fromRect &&
    Number.isFinite(fromRect.width) &&
    Number.isFinite(fromRect.height) &&
    fromRect.width > 0 &&
    fromRect.height > 0;

  const targetRect = {
    top: 0,
    left: 0,
    width: screenWidth,
    height: screenHeight,
  };
  const initialScaleX = hasFromRect ? fromRect.width / targetRect.width : 1;
  const initialScaleY = hasFromRect ? fromRect.height / targetRect.height : 1;
  const initialTX = hasFromRect
    ? fromRect.left + fromRect.width / 2 - (targetRect.left + targetRect.width / 2)
    : 0;
  const initialTY = hasFromRect
    ? fromRect.top + fromRect.height / 2 - (targetRect.top + targetRect.height / 2)
    : 0;

  // FLIP container shared values: morph from thumbnail rect → fullscreen on open,
  // and back on close.
  const flipScaleX = useSharedValue(hasFromRect ? initialScaleX : 1);
  const flipScaleY = useSharedValue(hasFromRect ? initialScaleY : 1);
  const flipTX = useSharedValue(initialTX);
  const flipTY = useSharedValue(initialTY);
  const flipRadius = useSharedValue(hasFromRect ? motionTokens.radius.thumbnail : 0);
  const flipOpacity = useSharedValue(hasFromRect ? 1 : 0);

  // Backdrop dim overlay opacity (0 = transparent, 1 = full black).
  const backdropOpacity = useSharedValue(0);

  // Image gesture transforms (pinch/pan, double-tap zoom).
  const imageScale = useSharedValue(1);
  const imageTX = useSharedValue(0);
  const imageTY = useSharedValue(0);

  // Drag-to-dismiss vertical translate (only at 1x zoom).
  const dismissTY = useSharedValue(0);

  // Pinch/pan gesture state (worklet-only).
  const pinchStartScale = useSharedValue(1);
  const panStartTX = useSharedValue(0);
  const panStartTY = useSharedValue(0);

  // -------- Open animation --------
  useEffect(() => {
    const easing = Easing.bezier(IOS_EASE[0], IOS_EASE[1], IOS_EASE[2], IOS_EASE[3]);
    const timing = { duration: OPEN_DURATION_MS, easing };

    backdropOpacity.value = withTiming(1, timing);

    if (hasFromRect) {
      flipOpacity.value = 1;
      flipScaleX.value = withTiming(1, timing);
      flipScaleY.value = withTiming(1, timing);
      flipTX.value = withTiming(0, timing);
      flipTY.value = withTiming(0, timing);
      flipRadius.value = withTiming(0, timing);
    } else {
      flipOpacity.value = withTiming(1, timing);
    }

    return () => {
      cancelAnimation(backdropOpacity);
      cancelAnimation(flipOpacity);
      cancelAnimation(flipScaleX);
      cancelAnimation(flipScaleY);
      cancelAnimation(flipTX);
      cancelAnimation(flipTY);
      cancelAnimation(flipRadius);
    };
  }, [
    backdropOpacity,
    flipOpacity,
    flipRadius,
    flipScaleX,
    flipScaleY,
    flipTX,
    flipTY,
    hasFromRect,
  ]);

  // -------- Close animation --------
  const handleClose = () => {
    const easing = Easing.bezier(IOS_EASE[0], IOS_EASE[1], IOS_EASE[2], IOS_EASE[3]);
    const timing = { duration: OPEN_DURATION_MS, easing };

    // Reset image gestures so the close animation is purely the FLIP.
    imageScale.value = withTiming(1, timing);
    imageTX.value = withTiming(0, timing);
    imageTY.value = withTiming(0, timing);
    dismissTY.value = withTiming(0, timing);

    backdropOpacity.value = withTiming(0, timing);

    if (hasFromRect) {
      flipScaleX.value = withTiming(initialScaleX, timing);
      flipScaleY.value = withTiming(initialScaleY, timing);
      flipTX.value = withTiming(initialTX, timing);
      flipRadius.value = withTiming(motionTokens.radius.thumbnail, timing);
      flipTY.value = withTiming(initialTY, timing, (finished) => {
        'worklet';
        if (finished) {
          runOnJS(onClose)();
        }
      });
    } else {
      flipOpacity.value = withTiming(0, timing, (finished) => {
        'worklet';
        if (finished) {
          runOnJS(onClose)();
        }
      });
    }
  };

  // -------- Gestures --------
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(motionTokens.duration.fast * 1000 * 2)
    .onStart(() => {
      'worklet';
      if (imageScale.value > MIN_ZOOM + 0.01) {
        imageScale.value = withSpring(MIN_ZOOM, SPRING_CONFIG);
        imageTX.value = withSpring(0, SPRING_CONFIG);
        imageTY.value = withSpring(0, SPRING_CONFIG);
      } else {
        imageScale.value = withSpring(DOUBLE_TAP_ZOOM, SPRING_CONFIG);
      }
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(220)
    .onStart(() => {
      'worklet';
      if (imageScale.value <= MIN_ZOOM + 0.01) {
        runOnJS(handleClose)();
      }
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      'worklet';
      pinchStartScale.value = imageScale.value;
    })
    .onUpdate((event) => {
      'worklet';
      imageScale.value = clampWorklet(
        pinchStartScale.value * event.scale,
        MIN_ZOOM,
        MAX_ZOOM,
      );
    })
    .onEnd(() => {
      'worklet';
      if (imageScale.value < MIN_ZOOM) {
        imageScale.value = withSpring(MIN_ZOOM, SPRING_CONFIG);
        imageTX.value = withSpring(0, SPRING_CONFIG);
        imageTY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const pan = Gesture.Pan()
    .onStart(() => {
      'worklet';
      panStartTX.value = imageTX.value;
      panStartTY.value = imageTY.value;
    })
    .onUpdate((event) => {
      'worklet';
      if (imageScale.value > MIN_ZOOM + 0.01) {
        // Pan the image while zoomed in.
        const maxX = Math.max(0, (screenWidth * imageScale.value - screenWidth) / 2);
        const maxY = Math.max(0, (screenHeight * imageScale.value - screenHeight) / 2);
        imageTX.value = clampWorklet(panStartTX.value + event.translationX, -maxX, maxX);
        imageTY.value = clampWorklet(panStartTY.value + event.translationY, -maxY, maxY);
      } else if (event.translationY > 0) {
        // Drag-to-dismiss: only respond to downward drags at 1x zoom.
        dismissTY.value = event.translationY;
        const fadeProgress = Math.min(event.translationY / DISMISS_FADE_RANGE, 1);
        backdropOpacity.value = 1 - fadeProgress * 0.7;
      }
    })
    .onEnd((event) => {
      'worklet';
      if (imageScale.value > MIN_ZOOM + 0.01) {
        const maxX = Math.max(0, (screenWidth * imageScale.value - screenWidth) / 2);
        const maxY = Math.max(0, (screenHeight * imageScale.value - screenHeight) / 2);
        imageTX.value = withSpring(clampWorklet(imageTX.value, -maxX, maxX), SPRING_CONFIG);
        imageTY.value = withSpring(clampWorklet(imageTY.value, -maxY, maxY), SPRING_CONFIG);
        return;
      }

      if (
        event.translationY > DISMISS_DISTANCE_DP ||
        event.velocityY > DISMISS_VELOCITY
      ) {
        runOnJS(handleClose)();
      } else {
        dismissTY.value = withSpring(0, SPRING_CONFIG);
        backdropOpacity.value = withSpring(1, SPRING_CONFIG);
      }
    });

  const tapGroup = Gesture.Exclusive(doubleTap, singleTap);
  const composed = Gesture.Simultaneous(pinch, pan, tapGroup);

  // -------- Animated styles --------
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const flipContainerStyle = useAnimatedStyle(() => ({
    opacity: flipOpacity.value,
    borderRadius: flipRadius.value,
    transform: [
      { translateX: flipTX.value },
      { translateY: flipTY.value + dismissTY.value },
      { scaleX: flipScaleX.value },
      { scaleY: flipScaleY.value },
    ],
  }));

  const imageTransformStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: imageTX.value },
      { translateY: imageTY.value },
      { scale: imageScale.value },
    ],
  }));

  if (!session || !vessel) {
    return null;
  }

  const closeButtonTop = Math.max(insets.top, 0) + 24;
  const closeButtonRight = Math.max(insets.right, 0) + 19;
  const imageSource = imageUri ? { uri: imageUri } : vessel.image;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.backdrop,
          { backgroundColor: resolveCssVariableString('var(--color-bg-zoom)') },
          backdropStyle,
        ]}
      />

      <GestureDetector gesture={composed}>
        <Animated.View
          style={[
            styles.flipContainer,
            {
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
            },
            flipContainerStyle,
          ]}
        >
          <Animated.View style={[styles.imageWrap, imageTransformStyle]}>
            <Image
              accessibilityIgnoresInvertColors
              accessibilityLabel={vessel.name ? `${vessel.name} 선박 이미지` : undefined}
              resizeMode="contain"
              source={imageSource}
              style={styles.image}
            />
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      <Pressable
        accessibilityLabel="닫기"
        accessibilityRole="button"
        hitSlop={12}
        onPress={handleClose}
        style={[
          styles.closeButton,
          {
            top: closeButtonTop,
            right: closeButtonRight,
          },
        ]}
      >
        <AppIcon name="close" preset="modalClose" tone="slate-700" />
      </Pressable>
    </View>
  );
}

export default function ImageZoomModal(props) {
  return <ImageZoomModalContent {...props} />;
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'var(--color-bg-zoom)',
  },
  flipContainer: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  imageWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(241, 245, 249, 0.5)',
    zIndex: 10,
  },
});
