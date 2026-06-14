import { test, expect } from '@playwright/test';

test.describe('FEN Route Fallback and Empty State Prevention Tests', () => {
  test('should gracefully handle invalid FEN segments and render the custom PositionFallback fallback screen instead of failing with raw HTTP 404', async ({ page }) => {
    // 1. 형식 검증이 거부될 잘못된 FEN 세그먼트 전달
    const invalidFenSegment = 'invalid_syntactic_fen_at_evaluation_level';
    const response = await page.goto(`/fen/${invalidFenSegment}`);

    // SvelteKit 및 배포 인프라 단에서 완전히 연결을 끊거나 404를 반환하지 않고, 부드러운 fallback 렌더링을 해야 함
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);

    // 2. PositionFallback 에러 전용 컴포넌트 마운트 확인 (#position-fallback)
    await expect(page.locator('#position-fallback')).toBeVisible();

    // 3. 잘못된 상태이므로 정상 체스판 등은 보이지 않아야 함
    await expect(page.locator('#chess-board-card')).not.toBeVisible();
    await expect(page.locator('#candidate-move-container')).not.toBeVisible();

    // 4. 홈으로 되돌아가는 버튼 확인
    const homeBtn = page.locator('#fallback-home-btn');
    await expect(homeBtn).toBeVisible();
  });

  test('should ensure a valid FEN never freezes on an empty static background-only state, loading active chessboard elements', async ({ page }) => {
    // 1. 완벽히 검증되고 정식으로 호환되는 표준 FEN 접근
    const standardValidFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1';
    await page.goto(`/fen/${standardValidFen}`);

    // 2. 공통 배경에만 정착하거나 오류 화면이 뜨지 않아야 함을 단언
    await expect(page.locator('#position-fallback')).not.toBeVisible();

    // 3. 핵심 인터랙티브 바디 엘리먼트들이 확실히 마운트되어 활성화되었는지 입증
    await expect(page.locator('#position-page-shell')).toBeVisible();
    await expect(page.locator('#chess-board-card')).toBeVisible();
    await expect(page.locator('#chess-grid')).toBeVisible();
    await expect(page.locator('#candidate-move-container')).toBeVisible();

    // 4. 로딩 메트릭이나 공통 크래시 잔상이 없는 정상 보드 국면 검증
    await expect(page.locator('#loading-position-state')).not.toBeVisible();
  });
});
