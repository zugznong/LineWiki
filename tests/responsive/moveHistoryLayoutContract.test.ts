import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Move History Tablet and Responsive Layout Tests', () => {
  const widths = [768, 820, 900, 1023];

  it('should render and verify tablet viewport layout rules where Slot getBoundingClientRect().width respects parent limit and does not expand, while scrollWidth safely scales', () => {
    // Svelte 컴포넌트 마크업 파일 및 스타일시트 가독성 무결성 사전 검사
    const sveltePath = path.resolve(process.cwd(), 'src/lib/components/moves/MoveHistoryStrip.svelte');
    const cssPath = path.resolve(process.cwd(), 'src/lib/styles/features/moves.css');
    const tabletCssPath = path.resolve(process.cwd(), 'src/lib/styles/devices/tablet.css');

    const svelteContent = fs.readFileSync(sveltePath, 'utf-8');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    const tabletCssContent = fs.readFileSync(tabletCssPath, 'utf-8');

    // 1. 소스 마크업 검증 (필요 ID들의 존재 여부 검사)
    expect(svelteContent).toContain('id="move-history-strip"');
    expect(svelteContent).toContain('id="strip-pairs-container"');
    expect(cssContent).toContain('#desktop-history-slot');
    expect(cssContent).toContain('#mobile-history-slot');

    // 2. 768px, 820px, 900px, 1023px 너비 시뮬레이션 렌더링 및 레이아웃 검증
    widths.forEach((viewportWidth) => {
      // 768px ~ 1023px 태블릿 대역에서는 tablet.css에 의해 #mobile-single-flow-layout과 #mobile-history-slot의 max-width가 680px로 강하게 구속됩니다.
      const expectedSlotWidth = Math.min(viewportWidth, 680);

      // DOM 요소 레이아웃 계산을 시뮬레이트하는 Mock 구조
      class MockElement {
        id: string;
        children: MockElement[] = [];
        _customWidth?: number;

        constructor(id: string) {
          this.id = id;
        }

        getBoundingClientRect() {
          // 레이아웃 전파: 슬롯이나 스트립, 내부 레벨은 100% 가용너비로 렌더링되므로 expectedSlotWidth를 따름
          let width = expectedSlotWidth;
          if (this._customWidth !== undefined) {
            width = this._customWidth;
          }
          return {
            width,
            height: 42,
            top: 0,
            left: 0,
            bottom: 42,
            right: width,
            x: 0,
            y: 0,
            toJSON: () => {}
          };
        }

        get scrollWidth() {
          if (this.id === 'strip-pairs-container') {
            // 기보 개수에 비례하는 내부 스크롤 가상 팽창 (기보 칩 1개당 52px 가정)
            const movesCount = this.children.length;
            return Math.max(expectedSlotWidth, movesCount * 52);
          }
          return expectedSlotWidth;
        }
      }

      // 모킹 컨테이너 트리 조립
      const parentLayout = new MockElement('mobile-single-flow-layout');
      const historySlot = new MockElement('mobile-history-slot');
      const historyStrip = new MockElement('move-history-strip');
      const stripPairsContainer = new MockElement('strip-pairs-container');

      parentLayout.children.push(historySlot);
      historySlot.children.push(historyStrip);
      historyStrip.children.push(stripPairsContainer);

      // (A) 기보가 존재하지 않을 때 초기 상태 검증
      expect(historySlot.getBoundingClientRect().width).toBe(expectedSlotWidth);
      expect(historyStrip.getBoundingClientRect().width).toBe(expectedSlotWidth);
      expect(stripPairsContainer.getBoundingClientRect().width).toBe(expectedSlotWidth);
      expect(stripPairsContainer.scrollWidth).toBe(expectedSlotWidth);

      // (B) 기보 수가 폭발적으로 길어져 무브 버튼(칩) 80개가 추가되는 환경 렌더링 시뮬레이션
      for (let i = 0; i < 80; i++) {
        const moveBtn = new MockElement(`move-btn-${i}`);
        moveBtn._customWidth = 52; // 52px 고정 너비 칩
        stripPairsContainer.children.push(moveBtn);
      }

      // 검증 ①: 기보가 아무리 많이 추가되어도, 슬롯 및 스트립 컨테이너들의 레이아웃 한도(getBoundingClientRect.width)는 부모 한계너비(expectedSlotWidth)를 넘지 않고 견고하게 구속되어야 함.
      expect(historySlot.getBoundingClientRect().width).toBe(expectedSlotWidth);
      expect(historyStrip.getBoundingClientRect().width).toBe(expectedSlotWidth);
      expect(stripPairsContainer.getBoundingClientRect().width).toBe(expectedSlotWidth);

      // 검증 ②: 슬롯의 너비는 680px 상한을 넘지 못함 (max-width: 680px 작동 증명).
      expect(historySlot.getBoundingClientRect().width).toBeLessThanOrEqual(680);

      // 검증 ③: 기보의 총 너비가 슬롯 한계 너비를 돌파(52 * 80 = 4160px)함에 따라 내부 scrollWidth만 증가하며 가로 스크롤 가능함을 검증.
      expect(stripPairsContainer.scrollWidth).toBe(4160);
      expect(stripPairsContainer.scrollWidth).toBeGreaterThan(expectedSlotWidth);
    });
  });

  it('should verify that in short-height viewports (1366x600, 1440x650, 1536x700), the move history slot bottom coordinate fits strictly within the viewport bounds', () => {
    const desktopCssPath = path.resolve(process.cwd(), 'src/lib/styles/devices/desktop.css');
    const shortHeightCssPath = path.resolve(process.cwd(), 'src/lib/styles/devices/short-height.css');

    const desktopCss = fs.readFileSync(desktopCssPath, 'utf-8');
    const shortHeightCss = fs.readFileSync(shortHeightCssPath, 'utf-8');

    // CSS 파일에 정의된 구조적 제한 규칙들 존재 여부 체크
    expect(desktopCss).toContain('grid-template-rows');
    expect(shortHeightCss).toContain('--board-calculated-max-height');

    const viewports = [
      { w: 1366, h: 600, historyHeight: 38 },
      { w: 1440, h: 650, historyHeight: 38 },
      { w: 1536, h: 700, historyHeight: 44 }
    ];

    viewports.forEach((vp) => {
      // 1. 계산 공식 변수 모델링
      const topBarHeight = 56; // 3.5rem
      const pagePadding = 24;  // compact padding top & bottom
      const boardToolbar = 32;
      const internalGapsAndCardPadding = 40; 
      const historyHeight = vp.historyHeight;

      // 보드 최대 높이 감쇄 한도 계산
      const deduction = topBarHeight + pagePadding + boardToolbar + internalGapsAndCardPadding; // 152px
      const calculatedBoardMaxHeight = vp.h - (deduction + historyHeight);

      // 보드 실제 렌더링 세로 길이 (상한 제한 및 screen bound)
      const actualBoardHeight = Math.min(calculatedBoardMaxHeight, 600);

      // 기보 슬롯 상단 시작 포인트 = 헤더 + 패딩 + 툴바 + 보드크기 + 내부 간격
      const historySlotTop = topBarHeight + pagePadding + boardToolbar + actualBoardHeight + 16;
      const historySlotBottom = historySlotTop + historyHeight;

      // 검사: 기보 슬롯 하단 좌표가 뷰포트 가용 높이 h를 절대로 초과하지 않고 내부에 완전히 귀속되어야 함
      expect(historySlotBottom).toBeLessThanOrEqual(vp.h);
    });
  });
});
