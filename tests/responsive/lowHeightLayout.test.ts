import { describe, it, expect } from 'vitest';
import { getLayoutMode } from '../../src/lib/responsive/getLayoutMode';
import { calculateBoardSize } from '../../src/lib/responsive/boardSize';

describe('lowHeightLayout Regression Tests', () => {
  it('should verify layoutMode and boardSize for 1024x600 (compactDesktop)', () => {
    // 1024x600
    const mode = getLayoutMode(1024, 600);
    const board = calculateBoardSize(1024, 600);

    expect(mode).toBe('compactDesktop');
    expect(board.squareSize).toBe(58);
    expect(board.size).toBe(464);
  });

  it('should verify layoutMode and boardSize for 1180x640 (compactDesktop)', () => {
    // 1180x640
    const mode = getLayoutMode(1180, 640);
    const board = calculateBoardSize(1180, 640);

    expect(mode).toBe('compactDesktop');
    expect(board.squareSize).toBe(60);
    expect(board.size).toBe(480);
  });

  it('should verify layoutMode and boardSize for 1366x620 (lowHeightDesktop)', () => {
    // 1366x620
    const mode = getLayoutMode(1366, 620);
    const board = calculateBoardSize(1366, 620);

    expect(mode).toBe('lowHeightDesktop');
    expect(board.squareSize).toBe(52);
    expect(board.size).toBe(416);
  });

  it('should verify layoutMode and boardSize for 390x844 (mobile)', () => {
    // 390x844
    const mode = getLayoutMode(390, 844);
    const board = calculateBoardSize(390, 844);

    expect(mode).toBe('mobile');
    expect(board.squareSize).toBe(44);
    expect(board.size).toBe(352);
  });
});
