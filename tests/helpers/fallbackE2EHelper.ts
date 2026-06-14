import { expect, type Page } from '@playwright/test';

const isFastMode = typeof process !== 'undefined' && process.env.PLAYWRIGHT_FAST_E2E !== 'false';
const DEFAULT_TIMEOUT = isFastMode ? 3500 : 10000;

/**
 * 0. engine-panel이 터미널 상태('completed', 'fallback-disabled', 'analysis-unavailable', 'error', 'stopped' 등)에 도달할 때까지 기다리는 헬퍼 함수입니다.
 */
export async function waitForTerminalEngineState(page: Page, timeoutMs?: number): Promise<void> {
  const currentTimeout = timeoutMs ?? (isFastMode ? 5000 : 10000);
  const terminalStates = [
    'completed', 
    'fallback-disabled', 
    'analysis-unavailable', 
    'error', 
    'stopped', 
    'stockfish-failed', 
    'fallback-failed'
  ];
  await expect.poll(async () => {
    const snap = await captureEnginePanelSnapshot(page);
    return terminalStates.includes(snap.status || '');
  }, {
    message: 'Engine did not reach a terminal state',
    timeout: currentTimeout,
    intervals: isFastMode ? [50, 100] : [100, 200, 500]
  }).toBe(true);
}

/**
 * 1. 특정 후보수 셀에 유효한 평가 스코어 점수가 표시되는지 종합 단언하는 검증 함수입니다.
 */
export async function expectEvalCellHasScore(page: Page, moveUci: string, expectedScore?: string, timeoutMs?: number): Promise<void> {
  const currentTimeout = timeoutMs ?? DEFAULT_TIMEOUT;
  const evalCell = page.locator(`#eval-cell-${moveUci}`);
  
  try {
    await expect(evalCell).toBeVisible();

    const textVal = evalCell.locator('span').first();
    await expect(textVal).not.toHaveText('...', { timeout: currentTimeout });
    await expect(textVal).not.toHaveText('분석 중', { timeout: currentTimeout });

    if (expectedScore) {
      await expect(textVal).toHaveText(expectedScore);
    } else {
      const value = await textVal.innerText();
      expect(value).toMatch(/^[+-]\d+\.\d+|M\d+|0\.00$/);
    }
  } catch (err: any) {
    if (isFastMode) {
      const rootMoves = await page.evaluate(() => (window as any).__MOCK_STOCKFISH_ROOT_MOVES__ || null);
      const diag = await page.evaluate(() => (window as any).__stockfish_diagnostics__ || null);
      err.message = `${err.message || ''}\n[Fast Mode Debug Info] Fake Worker configuration:
- __MOCK_STOCKFISH_ROOT_MOVES__: ${JSON.stringify(rootMoves)}
- lastGoCommand: ${diag?.lastGoCommand || 'none'}`;
    }
    throw err;
  }
}

/**
 * 2. 특정 후보수 셀이 "분석 불가" 상태로 수렴하였는지 세부 단언하는 검증 함수입니다.
 */
export async function expectEvalCellUnavailable(page: Page, moveUci: string, timeoutMs?: number): Promise<void> {
  const currentTimeout = timeoutMs ?? DEFAULT_TIMEOUT;
  const evalCell = page.locator(`#eval-cell-${moveUci}`);
  await expect(evalCell).toBeVisible();

  const textVal = evalCell.locator('span').first();
  await expect(textVal).toHaveText('분석 불가', { timeout: currentTimeout });
}

/**
 * 3. 특정 후보수 셀에 매칭되는 소스(db, fallback, none) 뱃지의 장착 여부를 검사하는 함수입니다.
 */
export async function expectEvalCellSource(page: Page, moveUci: string, source: 'db' | 'fallback' | 'none'): Promise<void> {
  const evalCell = page.locator(`#eval-cell-${moveUci}`);
  await expect(evalCell).toBeVisible();

  if (source === 'db') {
    const dbTag = evalCell.locator('span', { hasText: 'db' });
    await expect(dbTag).toBeVisible();
  } else if (source === 'fallback') {
    const fallbackTag = evalCell.locator('span', { hasText: 'fallback' });
    await expect(fallbackTag).toBeVisible();
  } else {
    // db나 fallback태그 모두 보이지 않아야 함
    const dbTag = evalCell.locator('span', { hasText: 'db' });
    const fallbackTag = evalCell.locator('span', { hasText: 'fallback' });
    await expect(dbTag).not.toBeVisible();
    await expect(fallbackTag).not.toBeVisible();
  }
}

export interface EnginePanelSnapshot {
  engineMode: string | null;
  status: string | null;
  fallbackReason: string | null;
  lastErrorKind: string | null;
  rows: {
    uci: string;
    source: string | null;
    score: string | null;
    rank: string | null;
    cellText: string | null;
    cellTitle: string | null;
  }[];
}

/**
 * 4. 반복적인 evaluate 블록을 캡슐화한 엔진 정보 구조체 스냅샷 수집 헬퍼 함수입니다.
 */
export async function captureEnginePanelSnapshot(page: Page): Promise<EnginePanelSnapshot> {
  return await page.evaluate(() => {
    const ep = document.querySelector('#engine-panel');
    const rows = Array.from(document.querySelectorAll('.candidate-move-row-shell')).map((el) => {
      const uci = el.getAttribute('data-uci') || '';
      const cell = el.querySelector('[id^="eval-cell-"]');
      const cellSpan = cell ? cell.querySelector('span') : null;
      return {
        uci,
        source: el.getAttribute('data-source'),
        score: el.getAttribute('data-score'),
        rank: el.getAttribute('data-rank'),
        cellText: cellSpan ? cellSpan.textContent : 'none',
        cellTitle: cellSpan ? cellSpan.getAttribute('title') : 'none'
      };
    });

    return {
      engineMode: ep ? ep.getAttribute('data-engine-mode') : 'unknown',
      status: ep ? ep.getAttribute('data-status') : 'unknown',
      fallbackReason: ep ? ep.getAttribute('data-fallback-reason') : 'unknown',
      lastErrorKind: ep ? ep.getAttribute('data-last-engine-error') : 'unknown',
      rows
    };
  });
}
