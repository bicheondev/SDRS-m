import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { motionDurationsMs, motionTokens } from '../motion.js';
import { measureNodeInWindow } from '../utils/layout.js';

const MIN_ZOOM_SCALE = 1;
const MAX_ZOOM_SCALE = 4;
const DOUBLE_TAP_ZOOM_SCALE = 2.5;
const TAP_MAX_DURATION = 220;
const DOUBLE_TAP_DELAY = 280;
const TAP_MOVE_TOLERANCE = 12;
const GESTURE_MIN_ZOOM_SCALE = 0.85;
const GESTURE_MAX_ZOOM_SCALE = 4.5;
const PAN_ELASTICITY = 0.24;
const CLOSE_TO_THUMBNAIL_DURATION = motionDurationsMs.image;
const THUMBNAIL_REVEAL_LEAD_MS = 24;
const DISMISS_CLOSE_DISTANCE = 140;
const DISMISS_CLOSE_VELOCITY = 0.45;
const DISMISS_MAX_OFFSET = 260;
let lastAnimatedOpenSessionKey = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getDistance(pointA, pointB) {
  return Math.hypot(pointA.clientX - pointB.clientX, pointA.clientY - pointB.clientY);
}

function getMidpoint(pointA, pointB) {
  return {
    clientX: (pointA.clientX + pointB.clientX) / 2,
    clientY: (pointA.clientY + pointB.clientY) / 2,
  };
}

function applyElasticity(value, max) {
  if (max <= 0) {
    return value * PAN_ELASTICITY;
  }

  if (Math.abs(value) <= max) {
    return value;
  }

  return Math.sign(value) * (max + (Math.abs(value) - max) * PAN_ELASTICITY);
}

function toSerializableRect(rect) {
  if (!rect) {
    return null;
  }

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function isHTMLElement(node) {
  return typeof HTMLElement !== 'undefined' && node instanceof HTMLElement;
}

function getDomRectSnapshot(node) {
  const rect = node?.getBoundingClientRect?.();

  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return toSerializableRect(rect);
}

async function measureRect(node) {
  const domRect = getDomRectSnapshot(node);

  if (domRect) {
    return domRect;
  }

  return toSerializableRect(await measureNodeInWindow(node));
}

function escapeAttributeValue(value) {
  const rawValue = String(value ?? '');

  if (typeof CSS !== 'undefined' && CSS.escape) {
    return CSS.escape(rawValue);
  }

  return rawValue.replace(/["\\]/g, '\\$&');
}

function findVisibleThumbnailTarget(vesselId) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return null;
  }

  const escapedId = escapeAttributeValue(vesselId);
  const candidates = Array.from(document.querySelectorAll(`[data-vessel-thumb-id="${escapedId}"]`));
  let bestArea = 0;
  let bestTarget = null;

  candidates.forEach((node) => {
    if (!isHTMLElement(node)) {
      return;
    }

    if (node.closest('.zoom-modal') || node.closest('[aria-hidden="true"]')) {
      return;
    }

    const style = window.getComputedStyle(node);
    if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') {
      return;
    }

    const rect = node.getBoundingClientRect();
    const isVisible =
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth;

    if (!isVisible) {
      return;
    }

    const area = rect.width * rect.height;
    if (area > bestArea) {
      bestArea = area;
      bestTarget = {
        node,
        rect: toSerializableRect(rect),
      };
    }
  });

  return bestTarget;
}

function findSourceThumbnailTarget(sourceThumbToken) {
  if (typeof document === 'undefined' || !sourceThumbToken) {
    return null;
  }

  const escapedToken = escapeAttributeValue(sourceThumbToken);
  const node = document.querySelector(`[data-zoom-thumb-source="${escapedToken}"]`);

  if (!isHTMLElement(node)) {
    return null;
  }

  return {
    node,
    rect: toSerializableRect(node.getBoundingClientRect()),
  };
}

function getPointerSnapshot(event) {
  const nativeEvent = event?.nativeEvent ?? event ?? {};
  const pointerId = nativeEvent.pointerId ?? event?.pointerId ?? 0;

  return {
    pointerId,
    clientX:
      nativeEvent.clientX ??
      event?.clientX ??
      nativeEvent.pageX ??
      event?.pageX ??
      nativeEvent.locationX ??
      event?.locationX ??
      0,
    clientY:
      nativeEvent.clientY ??
      event?.clientY ??
      nativeEvent.pageY ??
      event?.pageY ??
      nativeEvent.locationY ??
      event?.locationY ??
      0,
    pointerType: nativeEvent.pointerType ?? event?.pointerType ?? 'mouse',
    button: nativeEvent.button ?? event?.button ?? 0,
  };
}

export default function ImageZoomModal({ session, onClose }) {
  const imageWrapRef = useRef(null);
  const imageRef = useRef(null);
  const pointersRef = useRef(new Map());
  const gestureRef = useRef(null);
  const lastTapRef = useRef(null);
  const renderFrameRef = useRef(null);
  const presentFrameRef = useRef(null);
  const finalizeCloseFrameRef = useRef(null);
  const openTimeoutRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const dismissOffsetRef = useRef(0);
  const transformRef = useRef({ scale: MIN_ZOOM_SCALE, x: 0, y: 0 });
  const hiddenThumbnailRef = useRef(null);
  const reducedMotion = useReducedMotion() ?? false;
  const initialIndex = clamp(
    session?.startIndex ?? 0,
    0,
    Math.max((session?.vessels?.length ?? 0) - 1, 0),
  );
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [transform, setTransform] = useState(transformRef.current);
  const [dismissOffset, setDismissOffset] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isPresented, setIsPresented] = useState(false);
  const [openingSourceRect, setOpeningSourceRect] = useState(null);
  const [openingSnapshot, setOpeningSnapshot] = useState(null);
  const [closingSnapshot, setClosingSnapshot] = useState(null);

  const vessels = session?.vessels ?? [];
  const boundedIndex = clamp(currentIndex, 0, Math.max(vessels.length - 1, 0));
  const vessel = vessels[boundedIndex] ?? null;
  const isClosing = Boolean(closingSnapshot);
  const closeToThumbnailDuration = reducedMotion
    ? motionDurationsMs.instant
    : CLOSE_TO_THUMBNAIL_DURATION;
  const thumbnailRevealDelay = Math.max(closeToThumbnailDuration - THUMBNAIL_REVEAL_LEAD_MS, 0);

  const scheduleVisualCommit = useCallback(() => {
    if (renderFrameRef.current) {
      return;
    }

    renderFrameRef.current = requestAnimationFrame(() => {
      renderFrameRef.current = null;
      setTransform(transformRef.current);
      setDismissOffset(dismissOffsetRef.current);
    });
  }, []);

  const setViewport = useCallback(
    (nextTransform) => {
      transformRef.current = nextTransform;
      scheduleVisualCommit();
    },
    [scheduleVisualCommit],
  );

  const setDismiss = useCallback(
    (nextOffset) => {
      dismissOffsetRef.current = nextOffset;
      scheduleVisualCommit();
    },
    [scheduleVisualCommit],
  );

  const clearOpenAnimation = useCallback(() => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
  }, []);

  const clearCloseAnimation = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (finalizeCloseFrameRef.current) {
      cancelAnimationFrame(finalizeCloseFrameRef.current);
      finalizeCloseFrameRef.current = null;
    }
  }, []);

  const releaseHiddenThumbnail = useCallback(() => {
    const hiddenThumbnail = hiddenThumbnailRef.current;

    if (!isHTMLElement(hiddenThumbnail)) {
      hiddenThumbnailRef.current = null;
      return;
    }

    delete hiddenThumbnail.dataset.zoomThumbHidden;
    delete hiddenThumbnail.dataset.zoomThumbSource;
    hiddenThumbnailRef.current = null;
  }, []);

  const syncHiddenThumbnail = useCallback(
    (vesselId, sourceThumbToken = null) => {
      const nextTarget =
        findSourceThumbnailTarget(sourceThumbToken) ?? findVisibleThumbnailTarget(vesselId);
      const nextThumbnail = nextTarget?.node ?? null;

      if (hiddenThumbnailRef.current === nextThumbnail) {
        return nextTarget;
      }

      releaseHiddenThumbnail();

      if (isHTMLElement(nextThumbnail)) {
        nextThumbnail.dataset.zoomThumbHidden = 'true';
        hiddenThumbnailRef.current = nextThumbnail;
      }

      return nextTarget;
    },
    [releaseHiddenThumbnail],
  );

  const resetInteractionState = useCallback(() => {
    pointersRef.current.clear();
    gestureRef.current = null;
    lastTapRef.current = null;
    clearCloseAnimation();
    setDismiss(0);
    setViewport({ scale: MIN_ZOOM_SCALE, x: 0, y: 0 });
    setIsInteracting(false);
    setClosingSnapshot(null);
  }, [clearCloseAnimation, setDismiss, setViewport]);

  const getBounds = (scale) => {
    const wrapRect = imageWrapRef.current?.getBoundingClientRect?.();
    const imageNode = imageRef.current;

    if (!wrapRect || !imageNode) {
      return { maxX: 0, maxY: 0 };
    }

    const imageRect = imageNode.getBoundingClientRect?.();
    const imageWidth = imageNode.offsetWidth || imageRect?.width || 0;
    const imageHeight = imageNode.offsetHeight || imageRect?.height || 0;
    const activeScale = Math.max(scale, MIN_ZOOM_SCALE);

    return {
      maxX: Math.max(0, (imageWidth * activeScale - wrapRect.width) / 2),
      maxY: Math.max(0, (imageHeight * activeScale - wrapRect.height) / 2),
    };
  };

  const commitTransform = (
    nextScale,
    nextX,
    nextY,
    { allowElastic = false, allowScaleElastic = false } = {},
  ) => {
    const minScale = allowScaleElastic ? GESTURE_MIN_ZOOM_SCALE : MIN_ZOOM_SCALE;
    const maxScale = allowScaleElastic ? GESTURE_MAX_ZOOM_SCALE : MAX_ZOOM_SCALE;
    const scale = clamp(nextScale, minScale, maxScale);

    if (scale <= MIN_ZOOM_SCALE) {
      const resetTransform = { scale, x: 0, y: 0 };
      setViewport(resetTransform);
      return resetTransform;
    }

    const { maxX, maxY } = getBounds(scale);
    const nextTransform = {
      scale,
      x: allowElastic ? applyElasticity(nextX, maxX) : clamp(nextX, -maxX, maxX),
      y: allowElastic ? applyElasticity(nextY, maxY) : clamp(nextY, -maxY, maxY),
    };

    setViewport(nextTransform);
    return nextTransform;
  };

  const settleTransform = (nextTransform = transformRef.current) => {
    const finalScale = clamp(nextTransform.scale, MIN_ZOOM_SCALE, MAX_ZOOM_SCALE);

    if (finalScale <= MIN_ZOOM_SCALE) {
      setViewport({ scale: MIN_ZOOM_SCALE, x: 0, y: 0 });
      return;
    }

    commitTransform(finalScale, nextTransform.x, nextTransform.y);
  };

  const requestClose = useCallback(async () => {
    if (isClosing) {
      return;
    }

    clearOpenAnimation();
    clearCloseAnimation();
    setIsInteracting(false);
    setOpeningSourceRect(null);
    setOpeningSnapshot(null);

    const fromRect = await measureRect(imageRef.current);
    const thumbnailTarget =
      isHTMLElement(hiddenThumbnailRef.current) && hiddenThumbnailRef.current.isConnected
        ? {
            node: hiddenThumbnailRef.current,
            rect: toSerializableRect(hiddenThumbnailRef.current.getBoundingClientRect()),
          }
        : syncHiddenThumbnail(vessel?.id, session?.sourceThumbToken);
    const toRect = thumbnailTarget?.rect ?? null;

    if (reducedMotion || !fromRect || !toRect || !vessel) {
      onClose();
      return;
    }

    setClosingSnapshot({
      fromRect,
      src: vessel.imageWide,
      toRect,
    });

    closeTimeoutRef.current = setTimeout(() => {
      closeTimeoutRef.current = null;
      releaseHiddenThumbnail();
      finalizeCloseFrameRef.current = requestAnimationFrame(() => {
        finalizeCloseFrameRef.current = requestAnimationFrame(() => {
          finalizeCloseFrameRef.current = null;
          onClose();
        });
      });
    }, thumbnailRevealDelay);
  }, [
    clearCloseAnimation,
    clearOpenAnimation,
    isClosing,
    onClose,
    reducedMotion,
    releaseHiddenThumbnail,
    session?.sourceThumbToken,
    syncHiddenThumbnail,
    thumbnailRevealDelay,
    vessel,
  ]);

  const zoomAtPoint = (targetScale, clientX, clientY) => {
    const wrapRect = imageWrapRef.current?.getBoundingClientRect?.();

    if (!wrapRect) {
      return;
    }

    if (targetScale <= MIN_ZOOM_SCALE) {
      setDismiss(0);
      setViewport({ scale: MIN_ZOOM_SCALE, x: 0, y: 0 });
      return;
    }

    const centerX = wrapRect.left + wrapRect.width / 2;
    const centerY = wrapRect.top + wrapRect.height / 2;
    const { scale, x, y } = transformRef.current;
    const localX = (clientX - centerX - x) / scale;
    const localY = (clientY - centerY - y) / scale;
    const nextX = clientX - centerX - targetScale * localX;
    const nextY = clientY - centerY - targetScale * localY;

    setDismiss(0);
    commitTransform(targetScale, nextX, nextY);
  };

  const beginSingleGesture = (
    pointer,
    mode = transformRef.current.scale > MIN_ZOOM_SCALE ? 'pan' : 'undecided',
  ) => {
    gestureRef.current = {
      type: 'single',
      mode,
      pointerId: pointer.pointerId,
      pointerType: pointer.pointerType,
      startX: pointer.clientX,
      startY: pointer.clientY,
      lastX: pointer.clientX,
      lastY: pointer.clientY,
      lastTime: performance.now(),
      velocityX: 0,
      velocityY: 0,
      startedAt: performance.now(),
      moved: false,
      startTranslate: {
        x: transformRef.current.x,
        y: transformRef.current.y,
      },
      startDismissOffset: dismissOffsetRef.current,
    };
    setIsInteracting(true);
  };

  const beginPinchGesture = () => {
    const activePointers = Array.from(pointersRef.current.values());
    const wrapRect = imageWrapRef.current?.getBoundingClientRect?.();

    if (activePointers.length < 2 || !wrapRect) {
      return;
    }

    const [firstPointer, secondPointer] = activePointers;
    const midpoint = getMidpoint(firstPointer, secondPointer);
    const centerX = wrapRect.left + wrapRect.width / 2;
    const centerY = wrapRect.top + wrapRect.height / 2;
    const { scale, x, y } = transformRef.current;

    setDismiss(0);
    gestureRef.current = {
      type: 'pinch',
      initialScale: scale,
      initialDistance: Math.max(getDistance(firstPointer, secondPointer), 1),
      localMidpoint: {
        x: (midpoint.clientX - centerX - x) / scale,
        y: (midpoint.clientY - centerY - y) / scale,
      },
    };
    setIsInteracting(true);
  };

  useEffect(() => {
    if (!session || !vessel) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        requestClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestClose, session, vessel]);

  useLayoutEffect(() => {
    if (!session) {
      return;
    }

    setCurrentIndex(initialIndex);
  }, [initialIndex, session]);

  useLayoutEffect(() => {
    if (!session) {
      releaseHiddenThumbnail();
      setIsPresented(false);
      setOpeningSourceRect(null);
      setOpeningSnapshot(null);
      setClosingSnapshot(null);
      if (presentFrameRef.current) {
        cancelAnimationFrame(presentFrameRef.current);
        presentFrameRef.current = null;
      }
      clearOpenAnimation();
      clearCloseAnimation();
      return;
    }

    if (reducedMotion) {
      setOpeningSourceRect(null);
      setOpeningSnapshot(null);
      setClosingSnapshot(null);
      setIsPresented(true);
      return;
    }

    setOpeningSourceRect(null);
    setOpeningSnapshot(null);
    setClosingSnapshot(null);
    setIsPresented(false);

    return () => {
      if (presentFrameRef.current) {
        cancelAnimationFrame(presentFrameRef.current);
        presentFrameRef.current = null;
      }

      clearOpenAnimation();
      clearCloseAnimation();
    };
  }, [clearCloseAnimation, clearOpenAnimation, reducedMotion, releaseHiddenThumbnail, session]);

  useLayoutEffect(() => {
    if (!session || !vessel || isClosing) {
      return undefined;
    }

    const targetIndex = clamp(session.startIndex ?? 0, 0, Math.max(vessels.length - 1, 0));
    const openSessionKey = `${session.openedAt ?? 'no-opened-at'}:${targetIndex}:${vessel.id}`;

    if (boundedIndex !== targetIndex) {
      return undefined;
    }

    const thumbnailTarget = syncHiddenThumbnail(vessel.id, session.sourceThumbToken);
    const sourceRect = session.sourceRect ?? thumbnailTarget?.rect ?? null;

    if (reducedMotion || openingSourceRect || openingSnapshot || isPresented) {
      return undefined;
    }

    if (lastAnimatedOpenSessionKey === openSessionKey) {
      setIsPresented(true);
      return undefined;
    }

    if (!sourceRect) {
      lastAnimatedOpenSessionKey = openSessionKey;
      if (!presentFrameRef.current) {
        presentFrameRef.current = requestAnimationFrame(() => {
          presentFrameRef.current = null;
          setIsPresented(true);
        });
      }

      return undefined;
    }

    lastAnimatedOpenSessionKey = openSessionKey;
    setOpeningSourceRect(sourceRect);
    setIsPresented(true);

    return undefined;
  }, [
    boundedIndex,
    isClosing,
    isPresented,
    openingSourceRect,
    openingSnapshot,
    reducedMotion,
    session,
    syncHiddenThumbnail,
    vessel,
    vessels.length,
  ]);

  useLayoutEffect(() => {
    if (!openingSourceRect || openingSnapshot || !isPresented || !imageRef.current) {
      return undefined;
    }

    const frameId = requestAnimationFrame(async () => {
      const rawToRect = await measureRect(imageRef.current);

      if (!rawToRect || rawToRect.width <= 0 || rawToRect.height <= 0) {
        setOpeningSourceRect(null);
        return;
      }

      setOpeningSnapshot({
        fromRect: openingSourceRect,
        src: vessel?.imageWide ?? '',
        toRect: rawToRect,
      });
      openTimeoutRef.current = setTimeout(() => {
        openTimeoutRef.current = null;
        setOpeningSnapshot(null);
        setOpeningSourceRect(null);
      }, closeToThumbnailDuration);
    });

    return () => cancelAnimationFrame(frameId);
  }, [closeToThumbnailDuration, isPresented, openingSourceRect, openingSnapshot, vessel]);

  useEffect(() => {
    if (!session) {
      return;
    }

    resetInteractionState();
  }, [currentIndex, resetInteractionState, session]);

  useEffect(
    () => () => {
      if (renderFrameRef.current) {
        cancelAnimationFrame(renderFrameRef.current);
        renderFrameRef.current = null;
      }

      if (presentFrameRef.current) {
        cancelAnimationFrame(presentFrameRef.current);
        presentFrameRef.current = null;
      }

      if (finalizeCloseFrameRef.current) {
        cancelAnimationFrame(finalizeCloseFrameRef.current);
        finalizeCloseFrameRef.current = null;
      }

      clearOpenAnimation();
      clearCloseAnimation();
      releaseHiddenThumbnail();
    },
    [clearCloseAnimation, clearOpenAnimation, releaseHiddenThumbnail],
  );

  if (!session || !vessel) {
    return null;
  }

  const handlePointerDown = (event) => {
    const pointer = getPointerSnapshot(event);

    if (pointer.pointerType === 'mouse' && pointer.button !== 0) {
      return;
    }

    event.currentTarget?.setPointerCapture?.(pointer.pointerId);
    pointersRef.current.set(pointer.pointerId, pointer);

    if (pointersRef.current.size >= 2) {
      lastTapRef.current = null;
      beginPinchGesture();
      return;
    }

    beginSingleGesture(pointer);
  };

  const handlePointerMove = (event) => {
    const pointer = getPointerSnapshot(event);

    if (!pointersRef.current.has(pointer.pointerId)) {
      return;
    }

    pointersRef.current.set(pointer.pointerId, pointer);

    const activePointers = Array.from(pointersRef.current.values());

    if (activePointers.length >= 2) {
      if (gestureRef.current?.type !== 'pinch') {
        beginPinchGesture();
      }

      const pinchGesture = gestureRef.current;
      const wrapRect = imageWrapRef.current?.getBoundingClientRect?.();

      if (!pinchGesture || pinchGesture.type !== 'pinch' || !wrapRect) {
        return;
      }

      const [firstPointer, secondPointer] = activePointers;
      const midpoint = getMidpoint(firstPointer, secondPointer);
      const centerX = wrapRect.left + wrapRect.width / 2;
      const centerY = wrapRect.top + wrapRect.height / 2;
      const nextScale =
        pinchGesture.initialScale *
        (getDistance(firstPointer, secondPointer) / pinchGesture.initialDistance);
      const nextX = midpoint.clientX - centerX - nextScale * pinchGesture.localMidpoint.x;
      const nextY = midpoint.clientY - centerY - nextScale * pinchGesture.localMidpoint.y;

      commitTransform(nextScale, nextX, nextY, {
        allowElastic: true,
        allowScaleElastic: true,
      });
      return;
    }

    const singleGesture = gestureRef.current;
    if (
      !singleGesture ||
      singleGesture.type !== 'single' ||
      singleGesture.pointerId !== pointer.pointerId
    ) {
      return;
    }

    const now = performance.now();
    const deltaX = pointer.clientX - singleGesture.startX;
    const deltaY = pointer.clientY - singleGesture.startY;
    const movedDistance = Math.hypot(deltaX, deltaY);

    if (movedDistance > TAP_MOVE_TOLERANCE) {
      singleGesture.moved = true;
    }

    const deltaTime = Math.max(now - singleGesture.lastTime, 1);
    singleGesture.velocityX = (pointer.clientX - singleGesture.lastX) / deltaTime;
    singleGesture.velocityY = (pointer.clientY - singleGesture.lastY) / deltaTime;
    singleGesture.lastX = pointer.clientX;
    singleGesture.lastY = pointer.clientY;
    singleGesture.lastTime = now;

    if (singleGesture.mode === 'undecided') {
      if (transformRef.current.scale > MIN_ZOOM_SCALE) {
        singleGesture.mode = 'pan';
      } else if (movedDistance > TAP_MOVE_TOLERANCE) {
        if (Math.abs(deltaY) > Math.abs(deltaX) && singleGesture.pointerType === 'touch') {
          singleGesture.mode = 'dismiss';
        } else {
          singleGesture.mode = 'ignore';
        }
      }
    }

    if (singleGesture.mode === 'pan') {
      event.preventDefault?.();
      commitTransform(
        transformRef.current.scale,
        singleGesture.startTranslate.x + deltaX,
        singleGesture.startTranslate.y + deltaY,
        { allowElastic: true },
      );
      return;
    }

    if (singleGesture.mode === 'dismiss') {
      event.preventDefault?.();
      setDismiss(
        clamp(singleGesture.startDismissOffset + deltaY, -DISMISS_MAX_OFFSET, DISMISS_MAX_OFFSET),
      );
    }
  };

  const finishPointerInteraction = (event, { cancelled = false } = {}) => {
    const pointer = getPointerSnapshot(event);
    const activePointer = pointersRef.current.get(pointer.pointerId) ?? pointer;

    if (!pointersRef.current.has(pointer.pointerId)) {
      return;
    }

    if (event.currentTarget?.hasPointerCapture?.(pointer.pointerId)) {
      event.currentTarget.releasePointerCapture(pointer.pointerId);
    }

    const activePointerCount = pointersRef.current.size;
    const currentGesture = gestureRef.current;
    pointersRef.current.delete(pointer.pointerId);

    if (activePointerCount >= 2) {
      const remainingPointers = Array.from(pointersRef.current.values());

      if (remainingPointers.length >= 2) {
        beginPinchGesture();
        return;
      }

      if (remainingPointers.length === 1) {
        settleTransform();
        beginSingleGesture(
          remainingPointers[0],
          transformRef.current.scale > MIN_ZOOM_SCALE ? 'pan' : 'undecided',
        );
        return;
      }

      gestureRef.current = null;
      setIsInteracting(false);
      settleTransform();
      return;
    }

    gestureRef.current = null;
    setIsInteracting(false);

    if (cancelled) {
      lastTapRef.current = null;
      setDismiss(0);
      settleTransform();
      return;
    }

    if (
      !currentGesture ||
      currentGesture.type !== 'single' ||
      currentGesture.pointerId !== pointer.pointerId
    ) {
      settleTransform();
      return;
    }

    if (currentGesture.mode === 'dismiss') {
      const shouldClose =
        Math.abs(dismissOffsetRef.current) >= DISMISS_CLOSE_DISTANCE ||
        Math.abs(currentGesture.velocityY) >= DISMISS_CLOSE_VELOCITY;

      if (shouldClose) {
        requestClose();
        return;
      }

      setDismiss(0);
      setViewport({ scale: MIN_ZOOM_SCALE, x: 0, y: 0 });
      return;
    }

    settleTransform();

    const interactionDuration = performance.now() - currentGesture.startedAt;
    if (currentGesture.moved || interactionDuration > TAP_MAX_DURATION) {
      lastTapRef.current = null;
      return;
    }

    const previousTap = lastTapRef.current;
    const currentTap = {
      time: performance.now(),
      clientX: activePointer.clientX,
      clientY: activePointer.clientY,
      pointerType: currentGesture.pointerType,
    };

    if (
      previousTap &&
      previousTap.pointerType === currentTap.pointerType &&
      currentTap.time - previousTap.time <= DOUBLE_TAP_DELAY &&
      getDistance(previousTap, currentTap) <= TAP_MOVE_TOLERANCE * 2
    ) {
      lastTapRef.current = null;
      const targetScale =
        transformRef.current.scale > MIN_ZOOM_SCALE ? MIN_ZOOM_SCALE : DOUBLE_TAP_ZOOM_SCALE;
      zoomAtPoint(targetScale, activePointer.clientX, activePointer.clientY);
      return;
    }

    lastTapRef.current = currentTap;
  };

  const dismissProgress = clamp(Math.abs(dismissOffset) / DISMISS_MAX_OFFSET, 0, 1);
  const backdropOpacity = transform.scale > MIN_ZOOM_SCALE ? 1 : 1 - dismissProgress * 0.7;
  const presentedBackdropOpacity = isPresented ? backdropOpacity : 0;
  const effectiveBackdropOpacity = isClosing ? 0 : presentedBackdropOpacity;
  const stageScale = transform.scale > MIN_ZOOM_SCALE ? 1 : 1 - dismissProgress * 0.08;
  const imageWrapHidden = openingSourceRect || openingSnapshot || isClosing;
  const imageWrapClassName = [
    'zoom-modal__image-wrap',
    transform.scale > MIN_ZOOM_SCALE ? 'zoom-modal__image-wrap--zoomed' : '',
    isInteracting && transform.scale > MIN_ZOOM_SCALE ? 'zoom-modal__image-wrap--dragging' : '',
    imageWrapHidden ? 'zoom-modal__image-wrap--hidden' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const transitionSnapshot = openingSnapshot ?? closingSnapshot;

  return (
    <div
      className="zoom-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`${vessel.name} 이미지 확대`}
      style={{
        '--zoom-close-duration': `${closeToThumbnailDuration}ms`,
        backgroundColor: `rgba(0, 0, 0, ${effectiveBackdropOpacity})`,
      }}
    >
      <button
        className="zoom-modal__backdrop interaction-reset"
        type="button"
        aria-label="확대 이미지 닫기"
        onClick={requestClose}
      />

      <div className="zoom-modal__frame">
        <button
          className="zoom-modal__close pressable-control pressable-control--icon"
          type="button"
          aria-label="닫기"
          onClick={requestClose}
          style={{ opacity: openingSnapshot || isClosing ? 0 : presentedBackdropOpacity }}
        >
          <span
            aria-hidden="true"
            className="app-icon material-symbols-rounded app-icon--tone-current zoom-modal__close-icon"
            style={{
              '--app-icon-glyph-size': '20px',
              '--app-icon-offset-x': '0px',
              '--app-icon-offset-y': '0px',
              '--app-icon-opsz': '24',
              '--app-icon-slot-size': '20px',
            }}
          >
            close
          </span>
        </button>

        <div
          ref={imageWrapRef}
          className={imageWrapClassName}
          onPointerCancel={(event) => finishPointerInteraction(event, { cancelled: true })}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerInteraction}
        >
          <div
            className={`zoom-modal__image-stage ${
              !isInteracting ? 'zoom-modal__image-stage--settling' : ''
            }`.trim()}
            style={{
              transform: `translate3d(0, ${dismissOffset}px, 0) scale(${stageScale})`,
            }}
          >
            <div
              className={`zoom-modal__image-pan ${
                !isInteracting ? 'zoom-modal__image-pan--settling' : ''
              }`.trim()}
              style={{ transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }}
            >
              <img
                ref={imageRef}
                className={`zoom-modal__image ${
                  !isInteracting ? 'zoom-modal__image--settling' : ''
                }`.trim()}
                src={vessel.imageWide}
                alt={`${vessel.name} 선박 이미지`}
                draggable={false}
                loading="eager"
                style={{ transform: `scale(${transform.scale})` }}
              />
            </div>
          </div>
        </div>

        {transitionSnapshot ? (
          <motion.div
            className="zoom-modal__transition-image"
            initial={{
              top: transitionSnapshot.fromRect.top,
              left: transitionSnapshot.fromRect.left,
              width: transitionSnapshot.fromRect.width,
              height: transitionSnapshot.fromRect.height,
              borderRadius: openingSnapshot ? motionTokens.radius.thumbnail : 0,
            }}
            animate={{
              top: transitionSnapshot.toRect.top,
              left: transitionSnapshot.toRect.left,
              width: transitionSnapshot.toRect.width,
              height: transitionSnapshot.toRect.height,
              borderRadius: openingSnapshot ? 0 : motionTokens.radius.thumbnail,
            }}
            transition={{
              duration: closeToThumbnailDuration / 1000,
              ease: reducedMotion ? motionTokens.ease.linear : motionTokens.ease.ios,
            }}
          >
            <img src={transitionSnapshot.src} alt="" />
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
