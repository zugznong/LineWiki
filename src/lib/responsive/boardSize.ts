import { clamp } from '../utils/clamp';
import { getLayoutMode } from './getLayoutMode';

export interface BoardDimensions {
  size: number;
  squareSize: number;
}

export function calculateBoardSize(width: number, height: number): BoardDimensions {
  const mode = getLayoutMode(width, height);
  
  let targetSize = 400;

  if (mode === 'mobile') {
    // 90% of screen width with padding boundaries
    targetSize = clamp(width - 32, 280, 480);
  } else if (mode === 'mobile-landscape') {
    // Rely strictly on height boundaries to avoid scrolling
    targetSize = clamp(height - 48, 200, 360);
  } else if (mode === 'short-height') {
    targetSize = clamp(height - 80, 240, 440);
  } else if (mode === 'tablet') {
    targetSize = clamp(width - 80, 380, 600);
  } else if (mode === 'lowHeightDesktop') {
    targetSize = Math.max(280, Math.min(width - 320, height - 120, 420));
  } else if (mode === 'wideShortHeight') {
    // 360px rail constraint on the right, maximum 520px board size limit
    const availableHeight = height - 120;
    const sideLimit = width - 380;
    targetSize = Math.min(sideLimit, availableHeight, 520);
    targetSize = Math.max(160, targetSize);
  } else if (mode === 'extremeShortHeight') {
    // 극단적인 숏 하이트 환경 대응
    const availableHeight = height - 100;
    const sideLimit = width - 380;
    targetSize = Math.min(sideLimit, availableHeight, 400);
    targetSize = Math.max(120, targetSize);
  } else if (mode === 'compactDesktop') {
    if (width >= 1200) {
      targetSize = Math.max(360, Math.min(width - 360, height - 120, 520));
    } else {
      targetSize = Math.max(360, Math.min(width - 360, height - 130, 480));
    }
  } else if (mode === 'desktop') {
    // Multi-column grid spacing limits
    const sideReserved = 420; // Side column reserve spacer
    const minSize = height < 650 ? 280 : 400;
    targetSize = clamp(width - sideReserved, minSize, 600);
    // Let's also check height
    const heightLimit = height - 120;
    if (targetSize > heightLimit) {
      targetSize = clamp(heightLimit, minSize, 600);
    }
  } else {
    // desktop-wide layout
    // CSS가 제공하는 실제 컨테이너 크기를 우선하며, availableWidth와 availableHeight 중 작은 값에 즉시 clamp하는 정책으로 단순화합니다.
    const availableWidth = width >= 1000 ? width - 600 : width;
    const availableHeight = height - 160;
    targetSize = Math.min(availableWidth, availableHeight);
    targetSize = clamp(targetSize, height < 650 ? 280 : 480, 800);
  }

  // Ensure we do not exceed calculated availableHeight for short-height responsive modes before snapping
  if (mode === 'wideShortHeight' || mode === 'extremeShortHeight') {
    const availableHeight = mode === 'wideShortHeight' ? height - 120 : height - 100;
    if (targetSize > availableHeight) {
      targetSize = availableHeight;
    }
  }

  // Snap size to nearest chess grid standard multiple (8 squares) for pixel-perfect piece render boundaries
  let squareSize = Math.floor(targetSize / 8);
  let snapSize = squareSize * 8;

  // Ensure returning value completely obeys square containment contract (not exceeding input bounds)
  const maxAllowableSize = Math.min(width, height);
  if (snapSize > maxAllowableSize) {
    squareSize = Math.floor(maxAllowableSize / 8);
    snapSize = squareSize * 8;
  }

  return {
    size: snapSize,
    squareSize
  };
}
