import type { LayoutMode } from './LayoutMode';

export function getLayoutMode(width: number, height: number): LayoutMode {
  if (width < 768) {
    if (width > height && height < 500) {
      return 'mobile-landscape';
    }
    return 'mobile';
  }
  
  const ratio = height > 0 ? width / height : 1.5;

  // 1. 넓은 데스크톱 비율을 유지하는 낮은 화면 판정 (우선 배치)
  if (width >= 1440 && ratio >= 2) {
    // 콘텐츠의 최소 필요 높이(예: 420px)보다 낮은 경우에만 extremeShortHeight로 분류
    if (height < 420) {
      return 'extremeShortHeight';
    }
    // 700px 미만인 넓은 화면을 wideShortHeight로 분류 (높이가 500px보다 낮아도 먼저 일치됨)
    if (height < 700) {
      return 'wideShortHeight';
    }
  }

  // 2. 일반적인 극단적 숏 하이트 (앞선 넓은 화면 판정 조건에 걸리지 않은 경우)
  if (height < 600) {
    return 'short-height';
  }

  // 3. lowHeightDesktop: height >= 500 && height < 650 && ratio >= 1.9
  if (width >= 1024) {
    if (height >= 500 && height < 650 && ratio >= 1.9) {
      return 'lowHeightDesktop';
    }
  }

  // 데스크톱 1200px 이상 구간: 높이(height >= 700)와 화면비(ratio >= 1.4) 조건을 결합하여 일반 데스크톱 적용 판단
  if (width >= 1200) {
    if (height >= 700 && ratio >= 1.4) {
      if (width >= 1440) {
        return 'desktop-wide';
      }
      return 'desktop';
    } else {
      return 'compactDesktop';
    }
  }

  // 1024px 이상 1200px 미만 구간
  if (width >= 1024) {
    if (height >= 600 && height < 685 && ratio >= 1.5) {
      return 'compactDesktop';
    }
    return 'desktop';
  }

  if (width >= 768 && width < 1024) {
    return 'tablet';
  }

  return 'desktop';
}
