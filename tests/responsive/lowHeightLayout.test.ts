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

  it('should verify layoutMode and boardSize for 1024x768 (desktop bounds)', () => {
    const mode = getLayoutMode(1024, 768);
    const board = calculateBoardSize(1024, 768);
    expect(mode).toBe('desktop');
    expect(board.squareSize).toBe(75);
    expect(board.size).toBe(600);
  });

  it('should verify layoutMode and boardSize for 1180x800 (desktop bounds)', () => {
    const mode = getLayoutMode(1180, 800);
    const board = calculateBoardSize(1180, 800);
    expect(mode).toBe('desktop');
    expect(board.squareSize).toBe(75);
    expect(board.size).toBe(600);
  });

  it('should verify layoutMode and boardSize for 1280x720 (desktop bounds)', () => {
    const mode = getLayoutMode(1280, 720);
    const board = calculateBoardSize(1280, 720);
    expect(mode).toBe('desktop');
    expect(board.squareSize).toBe(75);
    expect(board.size).toBe(600);
  });

  it('should verify layoutMode and boardSize for 667x375 (mobile-landscape)', () => {
    const mode = getLayoutMode(667, 375);
    const board = calculateBoardSize(667, 375);
    expect(mode).toBe('mobile-landscape');
    expect(board.squareSize).toBe(40);
    expect(board.size).toBe(320);
  });

  it('should verify that we do not use 3-column layout policy under 1200px width (1024px to 1199px)', () => {
    // 1024 <= width < 1200 should have useThreeColumnLayout as false.
    // Let's model the condition: viewportStore.isDesktop && viewportStore.width >= 1200
    const checkThreeColumnLayout = (width: number, height: number): boolean => {
      const mode = getLayoutMode(width, height);
      const isDesktop = (mode === 'desktop' || mode === 'desktop-wide' || mode === 'compactDesktop' || mode === 'lowHeightDesktop');
      return isDesktop && width >= 1200;
    };

    // Width 1199 should not use 3-column layout
    expect(checkThreeColumnLayout(1199, 800)).toBe(false);
    expect(checkThreeColumnLayout(1024, 768)).toBe(false);

    // Width 1200 should use 3-column layout
    expect(checkThreeColumnLayout(1200, 800)).toBe(true);
    expect(checkThreeColumnLayout(1440, 900)).toBe(true);
  });

  it('should verify boundary tests for 699px and 700px heights for wideShortHeight', () => {
    // 699px height triggers wideShortHeight if width >= 1440 and ratio >= 2
    expect(getLayoutMode(1440, 699)).toBe('wideShortHeight'); // ratio = 2.06 >= 2, height = 699 < 700
    expect(getLayoutMode(1920, 699)).toBe('wideShortHeight'); // ratio = 2.74 >= 2, height = 699 < 700

    // 700px height falls back to desktop-wide because height >= 700
    expect(getLayoutMode(1440, 700)).toBe('desktop-wide');
    expect(getLayoutMode(1920, 700)).toBe('desktop-wide');

    // 500px보다 조금 낮은 높이이더라도 넓은 화면 비율을 유지한다면 wideShortHeight로 정상 분류
    expect(getLayoutMode(1440, 499)).toBe('wideShortHeight');

    // 최소 필요 높이(420px) 미만으로 극단적으로 낮아지는 경우에만 extremeShortHeight로 전환
    expect(getLayoutMode(1440, 410)).toBe('extremeShortHeight');
  });

  it('should verify standard desktop viewports are not misidentified as wideShortHeight', () => {
    expect(getLayoutMode(1920, 1080)).not.toBe('wideShortHeight');
    expect(getLayoutMode(1900, 900)).not.toBe('wideShortHeight');
    expect(getLayoutMode(1680, 1050)).not.toBe('wideShortHeight');
    expect(getLayoutMode(1280, 800)).not.toBe('wideShortHeight');
  });
});
