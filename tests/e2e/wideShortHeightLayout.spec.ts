import { test, expect } from '@playwright/test';
import { STORAGE_KEYS } from '../../src/lib/config/appConfig';

test.describe('Wide Short Height & Extreme Short Height Layout E2E Tests', () => {
  const startPositionFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1';
  const targetPageUrl = `/fen/${startPositionFen}`;

  const viewports = [
    { width: 1440, height: 600 },
    { width: 1440, height: 500 }
  ];

  for (const vp of viewports) {
    test(`should verify that at ${vp.width}x${vp.height} move history strip is fully integrated within screen bounds`, async ({ page }) => {
      // 1. 뷰포트 크기 및 화면 설정
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const response = await page.goto(targetPageUrl);
      expect(response!.status()).toBe(200);

      // 체스보드 및 기보 컨테이너 마운트 완료 확인
      await page.waitForSelector('#position-page-shell');
      await page.waitForSelector('#chess-board-card');

      // 2. 공통 기보 스트립 렌더링 확인
      const historyStrip = page.locator('#move-history-strip');
      await expect(historyStrip).toBeVisible();

      // 3. 기보 스트립 하단 좌표 또는 위치 경계 점검
      const stripBox = await historyStrip.boundingBox();
      expect(stripBox).not.toBeNull();
      
      const board = page.locator('#chess-board-card');
      const boardBox = await board.boundingBox();
      expect(boardBox).not.toBeNull();

      // 경계(Viewport) 비교 단언 - x, y, right(x+width), bottom(y+height)
      expect(boardBox!.x).toBeGreaterThanOrEqual(0);
      expect(boardBox!.x + boardBox!.width).toBeLessThanOrEqual(vp.width);
      expect(boardBox!.y).toBeGreaterThanOrEqual(0);
      expect(boardBox!.y + boardBox!.height).toBeLessThanOrEqual(vp.height);

      expect(stripBox!.x).toBeGreaterThanOrEqual(0);
      expect(stripBox!.x + stripBox!.width).toBeLessThanOrEqual(vp.width);
      expect(stripBox!.y).toBeGreaterThanOrEqual(0);
      expect(stripBox!.y + stripBox!.height).toBeLessThanOrEqual(vp.height);
    });
  }

  test('should verify scroll behavior and content presence in extremeShortHeight (height = 360 and 410)', async ({ page }) => {
    // 1600 x 360 extreme low height viewport
    await page.setViewportSize({ width: 1600, height: 360 });
    let response = await page.goto(targetPageUrl);
    expect(response!.status()).toBe(200);

    await page.waitForSelector('#position-page-shell');

    // 스크롤이 실제 가능하고 기보 슬롯을 안전하게 마주할 수 있는지 입증
    const historyStrip = page.locator('#move-history-strip');
    await historyStrip.scrollIntoViewIfNeeded();
    await expect(historyStrip).toBeVisible();

    let stripBox = await historyStrip.boundingBox();
    expect(stripBox).not.toBeNull();
    // 가로 폭 한계선 내 존재유무 실질 비교 (세로는 스크롤 허용)
    expect(stripBox!.x + stripBox!.width).toBeLessThanOrEqual(1600);

    // 1600 x 410 extreme low height viewport
    await page.setViewportSize({ width: 1600, height: 410 });
    response = await page.goto(targetPageUrl);
    expect(response!.status()).toBe(200);
    await page.waitForSelector('#position-page-shell');
    await historyStrip.scrollIntoViewIfNeeded();
    await expect(historyStrip).toBeVisible();

    stripBox = await historyStrip.boundingBox();
    expect(stripBox).not.toBeNull();
    expect(stripBox!.x + stripBox!.width).toBeLessThanOrEqual(1600);
  });

  test('should guarantee move history strip keeps height static and only increases scrollWidth even with lengthy SAN sequences', async ({ page }) => {
    // 1. 긴 기보 수순데이터(60수 초과)를 기입하기 전, 빈 기보 상태의 초기 높이 취득
    await page.setViewportSize({ width: 1920, height: 500 });
    await page.goto(targetPageUrl);
    await page.waitForSelector('#chess-board-card');

    const historyStrip = page.locator('#move-history-strip');
    await expect(historyStrip).toBeVisible();
    const initialBox = await historyStrip.boundingBox();
    expect(initialBox).not.toBeNull();
    const initialHeight = initialBox!.height;

    // 2. 가상 sessionStorage 인공 기보 대량 주입(70수 수준 수공 조립 기록)
    await page.addInitScript((key) => {
      const items = [];
      const startPosition = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      items.push({ fen: startPosition, moveSan: null, from: null, to: null });
      
      for (let i = 0; i < 70; i++) {
        const fen = i % 2 === 0 
          ? 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1' 
          : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        items.push({
          fen: fen,
          moveSan: i % 2 === 0 ? 'e4' : 'e5',
          from: i % 2 === 0 ? 'e2' : 'e7',
          to: i % 2 === 0 ? 'e4' : 'e5'
        });
      }
      sessionStorage.setItem(key, JSON.stringify(items));
    }, STORAGE_KEYS.SESSION_HISTORY);

    // 3. 주입 상태 적용을 위해 재시동
    await page.reload();
    await page.waitForSelector('#chess-board-card');

    const loadedStrip = page.locator('#move-history-strip');
    const loadedBox = await loadedStrip.boundingBox();
    expect(loadedBox).not.toBeNull();
    
    // 세로 높이가 기보 양에 상관 없이 스태틱하게 안정 유지되는지 단언 (오차 5px 이내)
    expect(Math.abs(loadedBox!.height - initialHeight)).toBeLessThan(5);

    // 4. 가로 scrollWidth가 clientWidth를 대폭 초과하여 스크롤 팽창이 가속되었는지 정정 검정
    const scrollContainer = page.locator('#move-history-strip .overflow-x-auto, #move-history-strip[class*="overflow-x"], #desktop-history-slot [class*="overflow-x"]').first();
    await expect(scrollContainer).toBeVisible();

    const scrollWidth = await scrollContainer.evaluate((el: HTMLElement) => el.scrollWidth);
    const clientWidth = await scrollContainer.evaluate((el: HTMLElement) => el.clientWidth);

    // 대량 기보가 기입되어 수평이 팽창되었으므로 scrollWidth가 clientWidth보다 커야 함!!
    expect(scrollWidth).toBeGreaterThan(clientWidth);
  });
});
