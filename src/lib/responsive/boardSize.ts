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
  } else if (mode === 'desktop') {
    // Multi-column grid spacing limits
    const sideReserved = 420; // Side column reserve spacer
    targetSize = clamp(width - sideReserved, 400, 600);
    // Let's also check height
    const heightLimit = height - 120;
    if (targetSize > heightLimit) {
      targetSize = clamp(heightLimit, 400, 600);
    }
  } else {
    // desktop-wide bento layout
    const sideReserved = 600;
    targetSize = clamp(width - sideReserved, 480, 800);
    const heightLimit = height - 160;
    if (targetSize > heightLimit) {
      targetSize = clamp(heightLimit, 480, 800);
    }
  }

  // Snap size to nearest chess grid standard multiple (8 squares) for pixel-perfect piece render boundaries
  const squareSize = Math.floor(targetSize / 8);
  const snapSize = squareSize * 8;

  return {
    size: snapSize,
    squareSize
  };
}
