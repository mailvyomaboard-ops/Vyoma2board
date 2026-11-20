/**
 * Unified Device & Viewport Detection
 * Enforces the VyomaBoard Mobile Policy:
 * Phones (<= 768px) are view-only devices for shared documents.
 */

export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  const isNarrowScreen = window.innerWidth <= 768;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return isNarrowScreen && hasTouch;
}

export function isTabletDevice() {
  if (typeof window === 'undefined') return false;
  const width = window.innerWidth;
  const isTabletWidth = width > 768 && width <= 1024;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return isTabletWidth && hasTouch;
}

export function isDesktopDevice() {
  return !isMobileDevice();
}

export function getDeviceType() {
  if (isMobileDevice()) return 'mobile';
  if (isTabletDevice()) return 'tablet';
  return 'desktop';
}
