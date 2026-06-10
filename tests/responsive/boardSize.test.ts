import { describe, it, expect } from 'vitest';
import { calculateBoardSize } from '../../src/lib/responsive/boardSize';

describe('calculateBoardSize Tests', () => {
  it('should compute mobile size snapped to multiple of 8', () => {
    // Width 375, Height 812 (Mobile)
    // targetSize = clamp(375 - 32, 280, 480) = clamp(343, 280, 480) = 343
    // squareSize = Math.floor(343 / 8) = 42
    // size = 42 * 8 = 336
    const board = calculateBoardSize(375, 812);
    expect(board.squareSize).toBe(42);
    expect(board.size).toBe(336);
  });

  it('should compute small mobile size properly', () => {
    // Width 320, Height 568 (Small Mobile)
    // targetSize = clamp(320 - 32, 280, 480) = clamp(288, 280, 480) = 288
    // squareSize = Math.floor(288 / 8) = 36
    // size = 36 * 8 = 288
    const board = calculateBoardSize(320, 568);
    expect(board.squareSize).toBe(36);
    expect(board.size).toBe(288);
  });

  it('should compute mobile landscape layout size based on height constraint', () => {
    // Width 667, Height 375 (Mobile Landscape)
    // targetSize = clamp(375 - 48, 200, 360) = 327
    // squareSize = Math.floor(327 / 8) = 40
    // size = 320
    const board = calculateBoardSize(667, 375);
    expect(board.squareSize).toBe(40);
    expect(board.size).toBe(320);
  });

  it('should compute short-height layout size', () => {
    // Width 900, Height 500 (Short Height)
    // targetSize = clamp(500 - 80, 240, 440) = clamp(420, 240, 440) = 420
    // squareSize = Math.floor(420 / 8) = 52
    // size = 416
    const board = calculateBoardSize(900, 500);
    expect(board.squareSize).toBe(52);
    expect(board.size).toBe(416);
  });

  it('should compute tablet layout size', () => {
    // Width 800, Height 1200 (Tablet)
    // targetSize = clamp(800 - 80, 380, 600) = clamp(720, 380, 600) = 600
    // squareSize = Math.floor(600 / 8) = 75
    // size = 600
    const board = calculateBoardSize(800, 1200);
    expect(board.squareSize).toBe(75);
    expect(board.size).toBe(600);
  });

  it('should compute desktop size within normal restrictions', () => {
    // Width 1200, Height 800 (Desktop)
    // Mode is 'desktop'
    // targetSize = clamp(1200 - 420, 400, 600) = clamp(780, 400, 600) = 600
    // heightLimit = 800 - 120 = 680
    // since targetSize(600) <= heightLimit(680), targetSize remains 600
    // squareSize = Math.floor(600 / 8) = 75
    // size = 600
    const board = calculateBoardSize(1200, 800);
    expect(board.squareSize).toBe(75);
    expect(board.size).toBe(600);
  });

  it('should respect height restriction on desktop layout when height is low', () => {
    // Width 1210, Height 640
    // Mode is 'desktop'
    // targetSize = clamp(1210 - 420, 400, 600) = 600
    // heightLimit = 640 - 120 = 520
    // targetSize (600) > heightLimit (520) -> targetSize = clamp(520, 400, 600) = 520
    // squareSize = Math.floor(520 / 8) = 65
    // size = 520
    const board = calculateBoardSize(1210, 640);
    expect(board.squareSize).toBe(65);
    expect(board.size).toBe(520);
  });

  it('should compute desktop wide layout size', () => {
    // Width 1600, Height 1000 (Desktop Wide)
    // Mode is 'desktop-wide'
    // targetSize = clamp(1600 - 600, 480, 800) = 800
    // heightLimit = 1000 - 160 = 840
    // Since targetSize(800) <= heightLimit(840), targetSize remains 800
    // squareSize = 100
    // size = 800
    const board = calculateBoardSize(1600, 1000);
    expect(board.squareSize).toBe(100);
    expect(board.size).toBe(800);
  });

  it('should respect height restriction on desktop wide layout when height is low', () => {
    // Width 1600, Height 700 (Desktop Wide with low height)
    // Mode is 'desktop-wide'
    // targetSize = clamp(1600 - 600, 480, 800) = 800
    // heightLimit = 700 - 160 = 540
    // TargetSize (800) > heightLimit (540) -> targetSize = clamp(540, 480, 800) = 540
    // squareSize = Math.floor(540 / 8) = 67
    // size = 536
    const board = calculateBoardSize(1600, 700);
    expect(board.squareSize).toBe(67);
    expect(board.size).toBe(536);
  });

  it('should compute compactDesktop size without collapsing below minimum of 360', () => {
    // Width 1024, Height 600
    // targetSize = Math.max(360, Math.min(1024 - 360, 600 - 130, 480)) = 470
    // squareSize = Math.floor(470 / 8) = 58
    // size = 464
    const board = calculateBoardSize(1024, 600);
    expect(board.size).toBeGreaterThanOrEqual(360);
    expect(board.squareSize).toBe(58);
    expect(board.size).toBe(464);
  });

  it('should compute lowHeightDesktop size without collapsing below minimum of 280', () => {
    // Width 1366, Height 620
    // targetSize = Math.max(280, Math.min(1366 - 320, 620 - 120, 420)) = 420
    // squareSize = Math.floor(420 / 8) = 52
    // size = 416
    const board = calculateBoardSize(1366, 620);
    expect(board.size).toBeGreaterThanOrEqual(280);
    expect(board.squareSize).toBe(52);
    expect(board.size).toBe(416);
  });
});

