import type { LayoutMode } from './LayoutMode';

export function getLayoutMode(width: number, height: number): LayoutMode {
  if (width < 768) {
    if (width > height && height < 500) {
      return 'mobile-landscape';
    }
    return 'mobile';
  }
  
  if (height < 600) {
    return 'short-height';
  }

  if (width >= 768 && width < 1024) {
    return 'tablet';
  }

  if (width >= 1024 && width < 1440) {
    return 'desktop';
  }

  return 'desktop-wide';
}
