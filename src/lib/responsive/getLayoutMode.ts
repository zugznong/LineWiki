import type { LayoutMode } from './LayoutMode';

export function getLayoutMode(width: number, height: number): LayoutMode {
  if (width < 768) {
    if (width > height && height < 500) {
      return 'mobile-landscape';
    }
    return 'mobile';
  }
  
  const ratio = height > 0 ? width / height : 1.5;

  if (width >= 1024) {
    // 1. lowHeightDesktop: height >= 500 && height < 650 && ratio >= 1.9
    if (height >= 500 && height < 650 && ratio >= 1.9) {
      return 'lowHeightDesktop';
    }
    // 2. compactDesktop: width < 1200 && height >= 600 && height < 685 && ratio >= 1.5
    if (width < 1200 && height >= 600 && height < 685 && ratio >= 1.5) {
      return 'compactDesktop';
    }
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
