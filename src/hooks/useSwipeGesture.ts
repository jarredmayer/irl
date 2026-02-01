import { useRef, useState, useCallback } from 'react';

interface SwipeState {
  deltaX: number;
  direction: 'left' | 'right' | null;
  isSwiping: boolean;
}

interface UseSwipeGestureOptions {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  enabled?: boolean;
}

export function useSwipeGesture({
  threshold = 100,
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
}: UseSwipeGestureOptions = {}) {
  const [swipeState, setSwipeState] = useState<SwipeState>({
    deltaX: 0,
    direction: null,
    isSwiping: false,
  });

  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const isHorizontal = useRef<boolean | null>(null);

  const reset = useCallback(() => {
    setSwipeState({ deltaX: 0, direction: null, isSwiping: false });
    startX.current = 0;
    startY.current = 0;
    isHorizontal.current = null;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      isHorizontal.current = null;
    },
    [enabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || startX.current === 0) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - startX.current;
      const deltaY = currentY - startY.current;

      // Determine direction on first significant move
      if (isHorizontal.current === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        isHorizontal.current = Math.abs(deltaX) > Math.abs(deltaY);
      }

      // Only process horizontal swipes
      if (isHorizontal.current !== true) return;

      // Prevent vertical scrolling during horizontal swipe
      e.preventDefault();

      setSwipeState({
        deltaX,
        direction: deltaX > 0 ? 'right' : deltaX < 0 ? 'left' : null,
        isSwiping: true,
      });
    },
    [enabled]
  );

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !swipeState.isSwiping) {
      reset();
      return;
    }

    const { deltaX, direction } = swipeState;

    if (Math.abs(deltaX) >= threshold) {
      // Trigger haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }

      if (direction === 'right' && onSwipeRight) {
        onSwipeRight();
      } else if (direction === 'left' && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    reset();
  }, [enabled, swipeState, threshold, onSwipeRight, onSwipeLeft, reset]);

  return {
    swipeState,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: reset,
    },
    reset,
  };
}
