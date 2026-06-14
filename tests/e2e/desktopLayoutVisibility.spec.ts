import { test, expect } from '@playwright/test';

test.describe('Desktop Layout Visibility and Responsiveness Tests', () => {
  const startPositionFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1';
  const targetPageUrl = `/fen/${startPositionFen}`;

  const desktopSizes = [
    { width: 1536, height: 820 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 }
  ];

  for (const size of desktopSizes) {
    test(`should verify layout boundaries at ${size.width}x${size.height}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      const response = await page.goto(targetPageUrl);
      expect(response!.status()).toBe(200);

      await page.waitForSelector('#position-page-shell');
      await page.waitForSelector('#position-topbar');
      await page.waitForSelector('#desktop-3-column-layout');

      const topBarBox = await page.locator('#position-topbar').boundingBox();
      const layoutBox = await page.locator('#desktop-3-column-layout').boundingBox();

      expect(topBarBox).not.toBeNull();
      expect(layoutBox).not.toBeNull();

      // 1) #desktop-3-column-layout의 상단이 #position-topbar 아래에 존재함 확인
      expect(layoutBox!.y).toBeGreaterThanOrEqual(topBarBox!.y + topBarBox!.height);

      // 2) layout의 하단이 뷰포트 안에 완벽히 들어오는지 확인 (y + height <= 뷰포트 세로 크기)
      expect(layoutBox!.y + layoutBox!.height).toBeLessThanOrEqual(size.height);
    });
  }

  test('should verify layout re-flow and container visibility when resizing from mobile to desktop', async ({ page }) => {
    // 1. 모바일 크기(375x667)로 시작
    await page.setViewportSize({ width: 375, height: 667 });
    const response = await page.goto(targetPageUrl);
    expect(response!.status()).toBe(200);

    await page.waitForSelector('#position-page-shell');

    // 2. 데스크톱 크기(1920x1080)로 리사이즈
    await page.setViewportSize({ width: 1920, height: 1080 });

    // 리사이즈 렌더링을 기다리기 위해 잠시 대기
    await page.waitForTimeout(300);

    // 보드, 후보수, 사이드 패널 각 컬럼 디텍션
    const boardCol = page.locator('#desktop-board-col');
    const candidateCol = page.locator('#desktop-candidate-col');
    const sidePanelCol = page.locator('#desktop-side-panel-col');

    await expect(boardCol).toBeVisible();
    await expect(candidateCol).toBeVisible();
    await expect(sidePanelCol).toBeVisible();

    const boardBox = await boardCol.boundingBox();
    const candidateBox = await candidateCol.boundingBox();
    const sideBox = await sidePanelCol.boundingBox();

    expect(boardBox).not.toBeNull();
    expect(candidateBox).not.toBeNull();
    expect(sideBox).not.toBeNull();

    // 1920x1080 뷰포트 내에 포함되는지 좌표 점검 (잘리거나 밖으로 벗어남 방지)
    expect(boardBox!.y + boardBox!.height).toBeLessThanOrEqual(1080);
    expect(candidateBox!.y + candidateBox!.height).toBeLessThanOrEqual(1080);
    expect(sideBox!.y + sideBox!.height).toBeLessThanOrEqual(1080);

    expect(boardBox!.y).toBeGreaterThanOrEqual(0);
    expect(candidateBox!.y).toBeGreaterThanOrEqual(0);
    expect(sideBox!.y).toBeGreaterThanOrEqual(0);
  });
});
