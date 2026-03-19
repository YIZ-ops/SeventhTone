export interface AtlasSwipeTargetInput {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  activeIndex: number;
  slideCount: number;
  thresholdPx?: number;
  axisLockThresholdPx?: number;
}

function clampIndex(index: number, slideCount: number) {
  if (slideCount <= 0) return 0;
  return Math.max(0, Math.min(index, slideCount - 1));
}

export function getAtlasActiveIndex(scrollLeft: number, clientWidth: number, slideCount: number) {
  if (slideCount <= 0) return 0;
  const width = clientWidth || 1;
  return clampIndex(Math.round(scrollLeft / width), slideCount);
}

export function resolveAtlasSwipeTargetIndex({
  startX,
  startY,
  endX,
  endY,
  activeIndex,
  slideCount,
  thresholdPx = 56,
  axisLockThresholdPx = 6,
}: AtlasSwipeTargetInput) {
  const currentIndex = clampIndex(activeIndex, slideCount);
  if (slideCount <= 1) return currentIndex;

  const dx = endX - startX;
  const dy = endY - startY;

  if (Math.abs(dx) < axisLockThresholdPx && Math.abs(dy) < axisLockThresholdPx) {
    return currentIndex;
  }

  if (Math.abs(dx) <= Math.abs(dy)) {
    return currentIndex;
  }

  if (Math.abs(dx) < thresholdPx) {
    return currentIndex;
  }

  if (dx < 0) {
    return clampIndex(currentIndex + 1, slideCount);
  }

  return clampIndex(currentIndex - 1, slideCount);
}
