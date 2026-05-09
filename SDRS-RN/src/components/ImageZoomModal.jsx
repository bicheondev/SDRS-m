import { useEffect, useRef, useState } from 'react';
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
  withDelay,
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
const GESTURE_MIN_ZOOM = 0.85;
const GESTURE_MAX_ZOOM = 4.5;
const PAN_ELASTICITY = 0.24;
const DISMISS_DISTANCE_DP = 140;
const DISMISS_VELOCITY = 450;
const DISMISS_FADE_RANGE = 260;
const THUMBNAIL_REVEAL_LEAD_MS = 24;
const SPRING_CONFIG = {
  stiffness: motionTokens.spring.modal.stiffness,
  damping: motionTokens.spring.modal.damping,
  mass: motionTokens.spring.modal.mass,
};
const OPEN_DURATION_MS = Math.round(motionTokens.duration.image * 1000);
const CONTROL_FADE_DURATION_MS = Math.round(motionTokens.duration.fast * 1000);
const IOS_EASE = motionTokens.ease.ios;

function clampWorklet(value, min, max) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function applyElasticityWorklet(value, max) {
  'worklet';
  if (max <= 0) {
    return value * PAN_ELASTICITY;
  }

  if (Math.abs(value) <= max) {
    return value;
  }

  return Math.sign(value) * (max + (Math.abs(value) - max) * PAN_ELASTICITY);
}

function getContainRect(containerWidth, containerHeight, aspectRatio) {
  const safeAspectRatio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const containerAspectRatio = containerWidth / containerHeight;
  const width = safeAspectRatio >= containerAspectRatio
    ? containerWidth
    : containerHeight * safeAspectRatio;
  const height = safeAspectRatio >= containerAspectRatio
    ? containerWidth / safeAspectRatio
    : containerHeight;

  return {
    top: (containerHeight - height) / 2,
    left: (containerWidth - width) / 2,
    width,
    height,
  };
}

function ImageZoomModalContent({ renderChromeOverlay, session, onClose, onThumbnailReveal }) {
  useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 0);
  const isClosingRef = useRef(false);
  const thumbnailRevealTimeoutRef = useRef(null);

  const vessels = session?.vessels ?? [];
  const initialIndex = clamp(session?.startIndex ?? 0, 0, Math.max(vessels.length - 1, 0));
  const vessel = vessels[initialIndex] ?? null;
  const imageUri = vessel?.imageWide || (typeof vessel?.image === 'string' ? vessel.image : null);
  const [imageSizeReady, setImageSizeReady] = useState(false);
  const [naturalImageSize, setNaturalImageSize] = useState(null);

  const fromRect = session?.fromRect ?? session?.sourceRect ?? null;
  const hasFromRect =
    fromRect &&
    Number.isFinite(fromRect.width) &&
    Number.isFinite(fromRect.height) &&
    fromRect.width > 0 &&
    fromRect.height > 0;
  const [isThumbnailTransitionLayer, setIsThumbnailTransitionLayer] = useState(hasFromRect);
  const [showChromeOverlay, setShowChromeOverlay] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setImageSizeReady(!imageUri);
    setNaturalImageSize(null);
    isClosingRef.current = false;
    setIsThumbnailTransitionLayer(hasFromRect);
    setShowChromeOverlay(false);

    if (!imageUri) {
      return undefined;
    }

    Image.getSize(
      imageUri,
      (width, height) => {
        if (!cancelled && width > 0 && height > 0) {
          setNaturalImageSize({ width, height });
          setImageSizeReady(true);
        }
      },
      () => {
        if (!cancelled) {
          setImageSizeReady(true);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  useEffect(
    () => () => {
      if (thumbnailRevealTimeoutRef.current !== null) {
        clearTimeout(thumbnailRevealTimeoutRef.current);
        thumbnailRevealTimeoutRef.current = null;
      }
    },
    [],
  );

  const fallbackAspectRatio = hasFromRect ? fromRect.width / fromRect.height : screenWidth / screenHeight;
  const imageAspectRatio = naturalImageSize
    ? naturalImageSize.width / naturalImageSize.height
    : fallbackAspectRatio;
  const displayRect = getContainRect(screenWidth, screenHeight, imageAspectRatio);
  const shouldWaitForOpeningImageSize = hasFromRect && imageUri && !imageSizeReady;
  // FLIP container shared values: morph from thumbnail rect → fullscreen on open,
  // and back on close.
  const transitionLeft = useSharedValue(hasFromRect ? fromRect.left : displayRect.left);
  const transitionTop = useSharedValue(hasFromRect ? fromRect.top : displayRect.top);
  const transitionWidth = useSharedValue(hasFromRect ? fromRect.width : displayRect.width);
  const transitionHeight = useSharedValue(hasFromRect ? fromRect.height : displayRect.height);
  const flipRadius = useSharedValue(hasFromRect ? motionTokens.radius.thumbnail : 0);
  const flipOpacity = useSharedValue(hasFromRect ? 1 : 0);
  const contentOpacity = useSharedValue(hasFromRect ? 0 : 1);
  const closeButtonOpacity = useSharedValue(hasFromRect ? 0 : 1);

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
    const controlFadeTiming = { duration: CONTROL_FADE_DURATION_MS, easing };

    closeButtonOpacity.value = hasFromRect ? 0 : 1;

    if (hasFromRect) {
      if (shouldWaitForOpeningImageSize) {
        transitionLeft.value = fromRect.left;
        transitionTop.value = fromRect.top;
        transitionWidth.value = fromRect.width;
        transitionHeight.value = fromRect.height;
        flipRadius.value = motionTokens.radius.thumbnail;
        flipOpacity.value = 1;
        contentOpacity.value = 0;
        closeButtonOpacity.value = 0;
        backdropOpacity.value = 0;
        return undefined;
      }

      backdropOpacity.value = 0;
      transitionLeft.value = fromRect.left;
      transitionTop.value = fromRect.top;
      transitionWidth.value = fromRect.width;
      transitionHeight.value = fromRect.height;
      flipOpacity.value = 1;
      backdropOpacity.value = withTiming(1, timing);
      transitionLeft.value = withTiming(displayRect.left, timing);
      transitionTop.value = withTiming(displayRect.top, timing);
      transitionWidth.value = withTiming(displayRect.width, timing);
      transitionHeight.value = withTiming(displayRect.height, timing, (finished) => {
        'worklet';
        if (finished) {
          runOnJS(setIsThumbnailTransitionLayer)(false);
        }
      });
      flipRadius.value = withTiming(0, timing);
      flipOpacity.value = withDelay(
        OPEN_DURATION_MS,
        withTiming(0, { duration: 1, easing }),
      );
      contentOpacity.value = withDelay(
        OPEN_DURATION_MS,
        withTiming(1, { duration: 1, easing }),
      );
      closeButtonOpacity.value = withDelay(
        OPEN_DURATION_MS,
        withTiming(1, controlFadeTiming),
      );
    } else {
      backdropOpacity.value = withTiming(1, timing);
      flipOpacity.value = 0;
      transitionLeft.value = displayRect.left;
      transitionTop.value = displayRect.top;
      transitionWidth.value = displayRect.width;
      transitionHeight.value = displayRect.height;
      contentOpacity.value = withTiming(1, timing);
      closeButtonOpacity.value = withTiming(1, controlFadeTiming);
    }

    return () => {
      cancelAnimation(backdropOpacity);
      cancelAnimation(closeButtonOpacity);
      cancelAnimation(flipOpacity);
      cancelAnimation(transitionLeft);
      cancelAnimation(transitionTop);
      cancelAnimation(transitionWidth);
      cancelAnimation(transitionHeight);
      cancelAnimation(flipRadius);
      cancelAnimation(contentOpacity);
    };
  }, [
    backdropOpacity,
    closeButtonOpacity,
    contentOpacity,
    flipOpacity,
    flipRadius,
    hasFromRect,
    imageSizeReady,
    session?.openedAt,
    shouldWaitForOpeningImageSize,
    transitionHeight,
    transitionLeft,
    transitionTop,
    transitionWidth,
  ]);

  // -------- Close animation --------
  const handleClose = () => {
    if (isClosingRef.current) {
      return;
    }

    isClosingRef.current = true;
    const easing = Easing.bezier(IOS_EASE[0], IOS_EASE[1], IOS_EASE[2], IOS_EASE[3]);
    const timing = { duration: OPEN_DURATION_MS, easing };
    const controlFadeTiming = { duration: CONTROL_FADE_DURATION_MS, easing };

    if (thumbnailRevealTimeoutRef.current !== null) {
      clearTimeout(thumbnailRevealTimeoutRef.current);
      thumbnailRevealTimeoutRef.current = null;
    }

    // Reset image gestures so the close animation is purely the FLIP.
    imageScale.value = withTiming(1, timing);
    imageTX.value = withTiming(0, timing);
    imageTY.value = withTiming(0, timing);
    dismissTY.value = withTiming(0, timing);

    if (hasFromRect) {
      backdropOpacity.value = 1;
    }
    backdropOpacity.value = withTiming(0, timing);
    closeButtonOpacity.value = withTiming(0, controlFadeTiming);

    if (hasFromRect) {
      setShowChromeOverlay(true);
      setIsThumbnailTransitionLayer(true);

      if (typeof onThumbnailReveal === 'function') {
        thumbnailRevealTimeoutRef.current = setTimeout(() => {
          thumbnailRevealTimeoutRef.current = null;
          onThumbnailReveal();
        }, Math.max(OPEN_DURATION_MS - THUMBNAIL_REVEAL_LEAD_MS, 0));
      }

      contentOpacity.value = 0;
      flipOpacity.value = 1;
      transitionLeft.value = displayRect.left;
      transitionTop.value = displayRect.top;
      transitionWidth.value = displayRect.width;
      transitionHeight.value = displayRect.height;
      flipRadius.value = 0;
      transitionLeft.value = withTiming(fromRect.left, timing);
      transitionTop.value = withTiming(fromRect.top, timing);
      transitionWidth.value = withTiming(fromRect.width, timing);
      flipRadius.value = withTiming(motionTokens.radius.thumbnail, timing);
      transitionHeight.value = withTiming(fromRect.height, timing, (finished) => {
        'worklet';
        if (finished) {
          runOnJS(onClose)();
        }
      });
    } else {
      flipOpacity.value = withTiming(0, timing);
      contentOpacity.value = withTiming(0, timing, (finished) => {
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
    .onStart((event) => {
      'worklet';
      if (imageScale.value > MIN_ZOOM + 0.01) {
        imageScale.value = withSpring(MIN_ZOOM, SPRING_CONFIG);
        imageTX.value = withSpring(0, SPRING_CONFIG);
        imageTY.value = withSpring(0, SPRING_CONFIG);
      } else {
        const targetScale = DOUBLE_TAP_ZOOM;
        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;
        const tapX = event.absoluteX ?? centerX;
        const tapY = event.absoluteY ?? centerY;
        const localX = (tapX - centerX - imageTX.value) / imageScale.value;
        const localY = (tapY - centerY - imageTY.value) / imageScale.value;
        const nextX = tapX - centerX - targetScale * localX;
        const nextY = tapY - centerY - targetScale * localY;
        const maxX = Math.max(0, (displayRect.width * targetScale - screenWidth) / 2);
        const maxY = Math.max(0, (displayRect.height * targetScale - screenHeight) / 2);

        imageScale.value = withSpring(targetScale, SPRING_CONFIG);
        imageTX.value = withSpring(clampWorklet(nextX, -maxX, maxX), SPRING_CONFIG);
        imageTY.value = withSpring(clampWorklet(nextY, -maxY, maxY), SPRING_CONFIG);
      }
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(220)
    .onStart((event) => {
      'worklet';
      const withinImage =
        event.x >= displayRect.left &&
        event.x <= displayRect.left + displayRect.width &&
        event.y >= displayRect.top &&
        event.y <= displayRect.top + displayRect.height;

      if (!withinImage && imageScale.value <= MIN_ZOOM + 0.01) {
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
        GESTURE_MIN_ZOOM,
        GESTURE_MAX_ZOOM,
      );
    })
    .onEnd(() => {
      'worklet';
      if (imageScale.value < MIN_ZOOM) {
        imageScale.value = withSpring(MIN_ZOOM, SPRING_CONFIG);
        imageTX.value = withSpring(0, SPRING_CONFIG);
        imageTY.value = withSpring(0, SPRING_CONFIG);
      } else if (imageScale.value > MAX_ZOOM) {
        imageScale.value = withSpring(MAX_ZOOM, SPRING_CONFIG);
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
        const maxX = Math.max(0, (displayRect.width * imageScale.value - screenWidth) / 2);
        const maxY = Math.max(0, (displayRect.height * imageScale.value - screenHeight) / 2);
        imageTX.value = applyElasticityWorklet(panStartTX.value + event.translationX, maxX);
        imageTY.value = applyElasticityWorklet(panStartTY.value + event.translationY, maxY);
      } else if (Math.abs(event.translationY) > Math.abs(event.translationX)) {
        // Drag-to-dismiss: RNW allows vertical dismissal in either direction at 1x zoom.
        dismissTY.value = clampWorklet(
          event.translationY,
          -DISMISS_FADE_RANGE,
          DISMISS_FADE_RANGE,
        );
        const fadeProgress = Math.min(Math.abs(event.translationY) / DISMISS_FADE_RANGE, 1);
        backdropOpacity.value = 1 - fadeProgress * 0.7;
      }
    })
    .onEnd((event) => {
      'worklet';
      if (imageScale.value > MIN_ZOOM + 0.01) {
        const finalScale = Math.min(imageScale.value, MAX_ZOOM);
        const maxX = Math.max(0, (displayRect.width * finalScale - screenWidth) / 2);
        const maxY = Math.max(0, (displayRect.height * finalScale - screenHeight) / 2);
        if (imageScale.value > MAX_ZOOM) {
          imageScale.value = withSpring(MAX_ZOOM, SPRING_CONFIG);
        }
        imageTX.value = withSpring(clampWorklet(imageTX.value, -maxX, maxX), SPRING_CONFIG);
        imageTY.value = withSpring(clampWorklet(imageTY.value, -maxY, maxY), SPRING_CONFIG);
        return;
      }

      const hasVerticalDismissIntent = Math.abs(event.translationY) > Math.abs(event.translationX);
      if (
        hasVerticalDismissIntent &&
        (
          Math.abs(event.translationY) > DISMISS_DISTANCE_DP ||
          Math.abs(event.velocityY) > DISMISS_VELOCITY
        )
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

  const transitionImageStyle = useAnimatedStyle(() => ({
    opacity: flipOpacity.value,
    top: transitionTop.value,
    left: transitionLeft.value,
    width: transitionWidth.value,
    height: transitionHeight.value,
    borderRadius: flipRadius.value,
    transform: [{ translateY: dismissTY.value }],
  }));

  const imageStageStyle = useAnimatedStyle(() => {
    const dismissProgress = Math.min(Math.abs(dismissTY.value) / DISMISS_FADE_RANGE, 1);
    return {
      opacity: contentOpacity.value,
      transform: [
        { translateY: dismissTY.value },
        { scale: imageScale.value > MIN_ZOOM + 0.01 ? 1 : 1 - dismissProgress * 0.08 },
      ],
    };
  });

  const imageTransformStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: imageTX.value },
      { translateY: imageTY.value },
      { scale: imageScale.value },
    ],
  }));

  const closeButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: closeButtonOpacity.value * backdropOpacity.value,
  }));

  if (!session || !vessel) {
    return null;
  }

  const closeButtonTop = topInset + 24;
  const closeButtonRight = Math.max(insets.right, 0) + 19;
  const imageSource = imageUri ? { uri: imageUri } : vessel.image;
  const zoomBackdropColor = resolveCssVariableString('var(--color-bg-zoom)');
  const chromeOverlay = showChromeOverlay && typeof renderChromeOverlay === 'function'
    ? renderChromeOverlay()
    : null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.modal]}>
      <Animated.View
        style={[
          styles.backdrop,
          { backgroundColor: zoomBackdropColor },
          backdropStyle,
        ]}
      />

      <GestureDetector gesture={composed}>
        <Animated.View style={styles.gestureSurface}>
          <Animated.View
            style={[
              styles.imageStage,
              {
                top: displayRect.top,
                left: displayRect.left,
                width: displayRect.width,
                height: displayRect.height,
              },
              imageStageStyle,
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
        </Animated.View>
      </GestureDetector>

      {isThumbnailTransitionLayer ? (
        <View
          style={[
            styles.transitionFrame,
            styles.pointerEventsNone,
          ]}
        >
          <Animated.View
            style={[
              styles.transitionImage,
              styles.pointerEventsNone,
              transitionImageStyle,
            ]}
          >
            <Image resizeMode="cover" source={imageSource} style={styles.image} />
          </Animated.View>
        </View>
      ) : null}

      {chromeOverlay ? (
        <View style={[StyleSheet.absoluteFill, styles.chromeOverlay, styles.pointerEventsNone]}>
          {chromeOverlay}
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.closeButton,
          closeButtonAnimatedStyle,
          {
            top: closeButtonTop,
            right: closeButtonRight,
          },
        ]}
      >
        <Pressable
          accessibilityLabel="닫기"
          accessibilityRole="button"
          hitSlop={12}
          onPress={handleClose}
          style={styles.closeButtonPressable}
        >
          <AppIcon name="close" preset="modalClose" tone="slate-700" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

export default function ImageZoomModal(props) {
  return <ImageZoomModalContent {...props} />;
}

const styles = StyleSheet.create({
  modal: {
    zIndex: 30,
    elevation: 30,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'var(--color-bg-zoom)',
  },
  gestureSurface: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  imageStage: {
    position: 'absolute',
  },
  transitionFrame: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'visible',
    zIndex: 2,
  },
  transitionImage: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  chromeOverlay: {
    zIndex: 8,
  },
  pointerEventsNone: {
    pointerEvents: 'none',
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
  closeButtonPressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
