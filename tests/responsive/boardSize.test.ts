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

  it('should compute specific viewports correctly and keep board size below viewport height', () => {
    // 1920x540
    const b1920x540 = calculateBoardSize(1920, 540);
    expect(b1920x540.size).toBeLessThan(540);
    expect(b1920x540.size).toBe(416);

    // 1920x620
    const b1920x620 = calculateBoardSize(1920, 620);
    expect(b1920x620.size).toBeLessThan(620);
    expect(b1920x620.size).toBe(496);

    // 2560x720
    // In desktop-wide, targetSize = Math.min(...) height limit (720 - 160) = 560
    const b2560x720 = calculateBoardSize(2560, 720);
    expect(b2560x720.size).toBeLessThan(720);
    expect(b2560x720.size).toBe(560);

    // 2560x1080
    const b2560x1080 = calculateBoardSize(2560, 1080);
    expect(b2560x1080.size).toBeLessThan(1080);
    expect(b2560x1080.size).toBe(800);

    // 1536x686
    const b1536x686 = calculateBoardSize(1536, 686);
    expect(b1536x686.size).toBeLessThan(686);
    expect(b1536x686.size).toBeLessThanOrEqual(686 - 120);

    // 1680x720
    const b1680x720 = calculateBoardSize(1680, 720);
    expect(b1680x720.size).toBeLessThan(720);
    expect(b1680x720.size).toBeLessThanOrEqual(720 - 120);
    
    // Explicit regression check to verify sizes strictly stay within height bounds on wide/desktop layouts
    const cases = [
      { w: 1920, h: 620 },
      { w: 2560, h: 720 },
      { w: 2560, h: 1080 },
      { w: 1536, h: 686 },
      { w: 1680, h: 720 }
    ];
    for (const c of cases) {
      const res = calculateBoardSize(c.w, c.h);
      expect(res.size).toBeLessThan(c.h);
      // For desktop layouts, margins and topbars are strictly expected. Ensure height-derived limit constraint works
      expect(res.size).toBeLessThanOrEqual(c.h - 120);
    }

    // 1366x768
    const b1366x768 = calculateBoardSize(1366, 768);
    expect(b1366x768.size).toBeLessThan(768);
    expect(b1366x768.size).toBe(600);

    // 1200x800
    const b1200x800 = calculateBoardSize(1200, 800);
    expect(b1200x800.size).toBeLessThan(800);
    expect(b1200x800.size).toBe(600);

    // 1199x800 -> desktop (since 1024 <= width < 1440)
    const b1199x800 = calculateBoardSize(1199, 800);
    expect(b1199x800.size).toBeLessThan(800);
    expect(b1199x800.size).toBe(600);

    // 768x1024 -> tablet
    const b768x1024 = calculateBoardSize(768, 1024);
    expect(b768x1024.size).toBeLessThan(1024);
    expect(b768x1024.size).toBe(600);

    // 390x844 -> mobile
    const b390x844 = calculateBoardSize(390, 844);
    expect(b390x844.size).toBeLessThan(844);
    expect(b390x844.size).toBe(352);
  });

  it('should guarantee that wide/short-height cases obey pure function contracts without delays and never exceed layout height limits', () => {
    // 1. Purity contract: Same inputs must produce exactly identical output immediately
    const inputs = [
      { w: 1600, h: 1000 },
      { w: 1600, h: 700 },
      { w: 900, h: 500 }, // short-height
      { w: 1200, h: 550 }, // short-height
    ];

    for (const tuple of inputs) {
      const first = calculateBoardSize(tuple.w, tuple.h);
      const second = calculateBoardSize(tuple.w, tuple.h);
      expect(first.size).toBe(second.size);
      expect(first.squareSize).toBe(second.squareSize);

      // Height upper limit constraints
      if (tuple.h === 500 || tuple.h === 550) {
        // short-height limits
        expect(first.size).toBeLessThanOrEqual(tuple.h - 80);
      } else {
        // wide limits
        expect(first.size).toBeLessThanOrEqual(tuple.h - 120);
      }
    }
  });
});

