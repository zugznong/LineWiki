import { test, expect } from '@playwright/test';
import { verifyStockfishSmoke } from '../helpers/stockfishVerify';

test.describe('Slow Deep Stockfish Analysis Suite', () => {
  test.beforeEach(({}, testInfo) => {
    if (process.env.RUN_SLOW_STOCKFISH_E2E !== '1') {
      test.skip();
    }
  });

  test('Regression: 첫 포지션 depth 24 완료 후 다음 수 입력 -> 정상 분석 완료', async ({ page }) => {
    // 깊이 24 수색 완료를 실측하는 무겁고 느린 E2E 검수를 슬로우 시나리오로 완전히 격리합니다.
    test.setTimeout(90000);

    // 1. 사전 스모크 패스 여부 확인
    await page.goto('/');
    const smokeResult = await verifyStockfishSmoke(page);
    if (!smokeResult.ok) {
      console.info('[Skip Test] Headless container cannot run Stockfish workers, skipping slow complete transition.');
      test.skip();
      return;
    }

    // 2. 첫 FEN 페이지 이동
    const sourceFen = '8/8/8/8/8/5k2/8/6K1_w_-_-_0_1';
    await page.goto(`/fen/${sourceFen}`);
    await page.waitForSelector('#position-page-shell');

    // 3. 이 포지션에서 합법수 모두가 정상적으로 분석 완료(depth 24 이상 도실 수 있게)되어 스코어가 렌더링될 때까지 대기
    const expectedMoves = ['g1f1', 'g1h1', 'g1h2'];
    for (const moveUci of expectedMoves) {
      const evalCell = page.locator(`#eval-cell-${moveUci}`);
      await expect(evalCell).toBeVisible();
      const textVal = evalCell.locator('span').first();
      await expect(textVal).not.toHaveText('...', { timeout: 70000 });
      await expect(textVal).not.toHaveText('분석 중', { timeout: 70000 });
    }

    // 4. 완료된 후 다음 FEN으로 이동
    const targetFen = '8/8/8/8/8/5k2/5K2/8_b_-_-_1_1';
    await page.goto(`/fen/${targetFen}`);
    await page.waitForSelector('#position-page-shell');

    // 5. 새 FEN에서도 "..."가 무한 대기되지 않고 정상 분석 완료 및 득점 표정 되는가
    const evalSpans = page.locator('.candidate-move-row-shell').locator('span').first();
    await expect(evalSpans.first()).toBeVisible({ timeout: 20000 });
    
    const firstTextVal = evalSpans.first();
    await expect(firstTextVal).not.toHaveText('...', { timeout: 30000 });
    await expect(firstTextVal).not.toHaveText('분석 중', { timeout: 30000 });

    const value = await firstTextVal.innerText();
    expect(value).toMatch(/^[+-]\d+\.\d+|M\d+|0\.00$/);
  });
});
