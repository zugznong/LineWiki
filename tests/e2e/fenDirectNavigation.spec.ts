import { test, expect } from '@playwright/test';

test.describe('FEN Direct Navigation & Routing Integrity Tests', () => {
  const validFenSegment = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1';
  const targetFenUrl = `/fen/${validFenSegment}`;

  test('should verify directly navigation to valid FEN yields HTTP 200 and loads core chessboard elements', async ({ page }) => {
    // 1. 서버 시작 후 시작 포지션 URL로 직접 접속
    const response = await page.goto(targetFenUrl);
    
    // 2. HTTP 에러 상태가 아닌 200 OK 여야 함 (동적 Cloudflare/SvelteKit 라우트 동작 확인)
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);

    // 3. PositionPageShell, 보드, 후보수 영역이 렌더링되는지 확인
    await expect(page.locator('#position-page-shell')).toBeVisible();
    await expect(page.locator('#chess-board-card')).toBeVisible();
    await expect(page.locator('#candidate-move-container')).toBeVisible();
  });

  test('should verify client-side SPA navigation to example FEN from start page does not yield 404', async ({ page }) => {
    // 1. 시작 페이지(/) 접속
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);

    // 2. 추천 오프닝 예시 버튼 클릭을 통한 FEN 페이지 이동
    const firstExampleBtn = page.locator('#example-position-list button').first();
    await expect(firstExampleBtn).toBeVisible();

    // 3. SPA 이동 트리거 및 목적지 확인
    await firstExampleBtn.click();
    await expect(page).toHaveURL(/\/fen\//);

    // 4. 컴포넌트 마운트 재확인 및 404 유실 화면이 나타나지 않음을 단언
    await expect(page.locator('#position-page-shell')).toBeVisible();
    await expect(page.locator('#chess-board-card')).toBeVisible();
    await expect(page.locator('#position-fallback')).not.toBeVisible();
  });

  test('should guarantee page survival and no 404 on browser reload, re-entry, and back-and-forth browser history', async ({ page }) => {
    // 1. 유효 FEN URL 직접 접속
    const initialResponse = await page.goto(targetFenUrl);
    expect(initialResponse!.status()).toBe(200);
    await expect(page.locator('#position-page-shell')).toBeVisible();

    // 2. 브라우저 새로고침(reload)을 통한 정적/동적 영속성 점검
    const reloadResponse = await page.reload();
    expect(reloadResponse).not.toBeNull();
    expect(reloadResponse!.status()).toBe(200);
    await expect(page.locator('#position-page-shell')).toBeVisible();

    // 3. 홈 페이지 이동 후 브라우저 뒤로 가기로 재진입하여 404 감지 차단
    await page.goto('/');
    await expect(page.locator('#start-page-shell')).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(targetFenUrl));
    await expect(page.locator('#position-page-shell')).toBeVisible();
    await expect(page.locator('#chess-board-card')).toBeVisible();

    // 4. 앞으로 가기 및 뒤로 가기 세션 연속 작동 가능 상태 검사
    await page.goForward();
    await expect(page.locator('#start-page-shell')).toBeVisible();

    await page.goBack();
    await expect(page.locator('#position-page-shell')).toBeVisible();
    await expect(page.locator('#chess-board-card')).toBeVisible();
  });
});
