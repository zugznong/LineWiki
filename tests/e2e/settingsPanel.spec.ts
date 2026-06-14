import { test, expect } from '@playwright/test';

test.describe('Settings Panel Activation and Scroll E2E Tests', () => {
  const startPositionFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1';
  const targetPageUrl = `/fen/${startPositionFen}`;

  test('should open settings panel in 1920x1080 desktop mode and show side-panel settings tab', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const response = await page.goto(targetPageUrl);
    expect(response!.status()).toBe(200);

    await page.waitForSelector('#position-page-shell');

    // 상단 "설정" 버튼 클릭
    const topBarBtn = page.locator('#topbar-settings-btn');
    await expect(topBarBtn).toBeVisible();
    await topBarBtn.click();

    // 설정 탭 버튼이 'aria-selected=true' 가 되는지 검증
    const settingsTab = page.locator('#tab-btn-settings');
    await expect(settingsTab).toBeVisible();
    await expect(settingsTab).toHaveAttribute('aria-selected', 'true');

    // 우측 사이드 패널 내부의 #settings-panel이 보이는지 확인
    const settingsPanel = page.locator('#desktop-side-panel-col #settings-panel');
    await expect(settingsPanel).toBeVisible();
  });

  const lowWidthSizes = [
    { name: 'Mobile', width: 400, height: 800 },
    { name: 'Tablet', width: 800, height: 900 },
    { name: 'Compact Desktop', width: 1100, height: 800 }
  ];

  for (const size of lowWidthSizes) {
    test(`should activate settings and ensure bottom panel scrolls into view on ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      const response = await page.goto(targetPageUrl);
      expect(response!.status()).toBe(200);

      await page.waitForSelector('#position-page-shell');

      // 상단 설정 버튼 클릭
      const topBarBtn = page.locator('#topbar-settings-btn');
      await expect(topBarBtn).toBeVisible();
      await topBarBtn.click();

      // 설정 탭 버튼 활성화 확인
      const settingsTab = page.locator('#tab-btn-settings');
      await expect(settingsTab).toBeVisible();
      await expect(settingsTab).toHaveAttribute('aria-selected', 'true');

      // 바텀 패널 컨테이너와 설정 패널 노드가 실재하는지 확인
      const bottomContainer = page.locator('#bottom-panel-container');
      const settingsPanel = page.locator('#bottom-panel-container #settings-panel');
      
      await expect(bottomContainer).toBeVisible();
      await expect(settingsPanel).toBeVisible();

      // 스크롤이 트리거되어 뷰포트 영역 안에 위치하는지 검사
      await expect(bottomContainer).toBeInViewport();
      await expect(settingsPanel).toBeInViewport();
    });

    test(`should scroll bottom panel into view via board shortcut settings button on ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      const response = await page.goto(targetPageUrl);
      expect(response!.status()).toBe(200);

      await page.waitForSelector('#position-page-shell');

      // 체스보드 상단/단축 설정 버튼 클릭
      const boardSettingsBtn = page.locator('#open-settings-shortcut-btn');
      await expect(boardSettingsBtn).toBeVisible();
      await boardSettingsBtn.click();

      // 설정 탭 버튼 활성화 확인
      const settingsTab = page.locator('#tab-btn-settings');
      await expect(settingsTab).toBeVisible();
      await expect(settingsTab).toHaveAttribute('aria-selected', 'true');

      // 바텀 패널 컨테이너와 설정 패널의 뷰포트 내 수용 검증
      const bottomContainer = page.locator('#bottom-panel-container');
      await expect(bottomContainer).toBeVisible();
      await expect(bottomContainer).toBeInViewport();
    });
  }
});
