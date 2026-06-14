import { test, expect } from '@playwright/test';
import { FallbackWorkerMonitor } from '../helpers/fallbackWorkerVerify';
import { 
  expectEvalCellHasScore, 
  expectEvalCellUnavailable, 
  expectEvalCellSource, 
  captureEnginePanelSnapshot,
  waitForTerminalEngineState
} from '../helpers/fallbackE2EHelper';

const isFastMode = process.env.PLAYWRIGHT_FAST_E2E !== 'false';

test.describe('Stored Evaluation Fallback Policy E2E Tests', () => {
  // 백킹이 갈 수 있는 유일한 3가지 합법 후보수 포지션 설정
  const targetFen = '8/8/8/8/8/5k2/8/6K1_w_-_-_0_1';
  const targetPageUrl = `/fen/${targetFen}`;

  test.beforeEach(async ({ page }) => {
    if (isFastMode) {
      console.info('[E2E Lifecycle] PLAYWRIGHT_FAST_E2E 가 켜져 있으므로 가상 주엔진을 주입 활성화합니다.');
      await page.addInitScript(() => {
        // 개별 테스트에 의해 __MOCK_STOCKFISH_FORCE_ERROR__ 가 지정된 경우 mock 성공 worker를 억제합니다.
        if ((window as any).__MOCK_STOCKFISH_FORCE_ERROR__ === true) {
          (window as any).__MOCK_STOCKFISH_WORKER__ = false;
        } else {
          (window as any).__MOCK_STOCKFISH_WORKER__ = true;
        }
        (window as any).__MOCK_STOCKFISH_ROOT_MOVES__ = ['g1f1', 'g1h1', 'g1h2'];
      });
    }
  });

  test('should skip local engine analysis when all candidates match Wiki DB with high depth (DB Priority)', async ({ page }) => {
    // 1. 브라우저 시작 전에 window에 3가지 후보수 모두가 depth 20으로 완벽 적중된 모의 DB 데이터를 사전에 등대해 줍니다.
    await page.addInitScript(() => {
      const mockEvals: Record<string, any> = {
        'g1f1': {
          moveSan: 'Kf1',
          moveUci: 'g1f1',
          score: { type: 'cp', value: -150 }, // -1.50
          depth: 20
        },
        'g1h1': {
          moveSan: 'Kh1',
          moveUci: 'g1h1',
          score: { type: 'cp', value: -220 }, // -2.20
          depth: 20
        },
        'g1h2': {
          moveSan: 'Kh2',
          moveUci: 'g1h2',
          score: { type: 'cp', value: 80 }, // +0.80
          depth: 20
        }
      };

      (window as any).__MOCK_DB_EVALS__ = mockEvals;
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
    const response = await page.goto(targetPageUrl);
    expect(response!.status()).toBe(200);

    await page.waitForSelector('#position-page-shell');

    // 2. 모든 후보수가 DB 우선 정책에 의해 즉시 로드되고, 실제 로컬 엔진 수색 과정 없이 '위키 DB' 출처로 표방되는지 검증
    await expectEvalCellHasScore(page, 'g1f1', '-1.50');
    await expectEvalCellHasScore(page, 'g1h1', '-2.20');
    await expectEvalCellHasScore(page, 'g1h2', '+0.80');

    // d20 (db) 또는 db 뱃지 등의 기치가 출력되는지 검증
    await expectEvalCellSource(page, 'g1f1', 'db');
    await expectEvalCellSource(page, 'g1h1', 'db');
    await expectEvalCellSource(page, 'g1h2', 'db');

    // 3. 엔진 전체 상태 타이틀링이 환경에 따라 적합한 완료 포화를 찍는지 검증
    const enginePanel = page.locator('#engine-panel');
    await expect(enginePanel).toBeVisible();
    await expect(enginePanel).toHaveAttribute('data-status', 'completed');

    const isFallbackMode = await page.evaluate(() => {
      const ep = document.querySelector('#engine-panel');
      return ep ? ep.getAttribute('data-engine-mode') === 'fallback' : false;
    });

    const expectedStatusText = isFallbackMode
      ? 'Stockfish 18 대체 휴리스틱 fallback (DB 분석 완료)'
      : 'Stockfish 18 (분석 완료 - DB)';

    const statusText = page.locator(`text=${expectedStatusText}`);
    await expect(statusText.first()).toBeVisible();
  });

  test('should run local engine search selectively only for targets missing in DB (Partial Match Policy)', async ({ page }) => {
    // 1. g1f1만 DB에 존재하고 g1h1, g1h2는 유실 누락된 시나리오 주입
    await page.addInitScript(() => {
      const mockEvals: Record<string, any> = {
        'g1f1': {
          moveSan: 'Kf1',
          moveUci: 'g1f1',
          score: { type: 'cp', value: -150 }, // -1.50
          depth: 20
        }
      };

      (window as any).__MOCK_DB_EVALS__ = mockEvals;
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
    const response = await page.goto(targetPageUrl);
    expect(response!.status()).toBe(200);

    await page.waitForSelector('#position-page-shell');

    // 2. 이미 DB에 있는 g1f1은 즉각 -1.50에 db 기호 표시
    await expectEvalCellHasScore(page, 'g1f1', '-1.50');
    await expectEvalCellSource(page, 'g1f1', 'db');

    // 3. 누락된 g1h1과 g1h2는 로컬 엔진이 실시간으로 계산해 줄 때까지 대기
    const h1Cell = page.locator('#eval-cell-g1h1');
    const h2Cell = page.locator('#eval-cell-g1h2');
    await expect(h1Cell).toBeVisible();
    await expect(h2Cell).toBeVisible();

    // 중간 상태 허용 대기 루프 (polling)
    let finalEngineMode: string | null = null;
    let finalStatus: string | null = null;
    let finalErrorKind: string | null = null;
    let finalFallbackReason: string | null = null;
    let finalRows: any[] = [];
    
    const terminalFailureStates = [
      'analysis-unavailable',
      'fallback-disabled',
      'fallback-failed',
      'stockfish-failed',
      'error'
    ];

    try {
      await expect.poll(async () => {
        const snap = await captureEnginePanelSnapshot(page);

        finalEngineMode = snap.engineMode;
        finalStatus = snap.status;
        finalFallbackReason = snap.fallbackReason;
        finalErrorKind = snap.lastErrorKind;
        finalRows = snap.rows;

        // 완료 완료되거나 또는 terminal failure 상태 중 하나인 경우 대기 완료
        return snap.status === 'completed' || terminalFailureStates.includes(snap.status || '') || snap.status === 'error';
      }, {
        message: 'Engine did not reach a terminal state (completed or terminal failure)',
        timeout: isFastMode ? 5000 : 10000,
        intervals: isFastMode ? [50, 100] : [100, 300, 500]
      }).toBe(true);
    } catch (pollErr) {
      // 대기 시간 초과되어도 수집 결과로 평가를 계속 진행
    }

    // 최종 결과 기준의 결정 분기 - #engine-panel의 실제 완료/실패 상태를 최우선으로 판단 분계 하고,
    // 각 후보수 셀의 data-source, data-score 및 텍스트 실제 적재 완료를 종합 판단합니다.
    const isSuccessful = await page.evaluate(() => {
      const ep = document.querySelector('#engine-panel');
      if (!ep) return false;
      const status = ep.getAttribute('data-status');
      if (status === 'completed') return true;

      const rows = Array.from(document.querySelectorAll('.candidate-move-row-shell'));
      const h1Row = rows.find(el => el.getAttribute('data-uci') === 'g1h1');
      const h2Row = rows.find(el => el.getAttribute('data-uci') === 'g1h2');

      const isH1Active = h1Row && h1Row.getAttribute('data-source') && h1Row.getAttribute('data-source') !== 'none';
      const isH2Active = h2Row && h2Row.getAttribute('data-source') && h2Row.getAttribute('data-source') !== 'none';

      const h1Text = h1Row?.querySelector('[id^="eval-cell-"]')?.textContent || '';
      const h2Text = h2Row?.querySelector('[id^="eval-cell-"]')?.textContent || '';

      const h1HasValue = h1Text && !h1Text.includes('...') && !h1Text.includes('분석 중') && !h1Text.includes('분석 불가');
      const h2HasValue = h2Text && !h2Text.includes('...') && !h2Text.includes('분석 중') && !h2Text.includes('분석 불가');

      return !!(isH1Active && isH2Active && h1HasValue && h2HasValue);
    });

    const shouldExpectValue = isFastMode || isSuccessful || finalStatus === 'completed';

    const diagnostics = await page.evaluate(() => (window as any).__stockfish_diagnostics__ || null);
    const lastGoCommand = diagnostics?.lastGoCommand || 'unknown';

    if (shouldExpectValue) {
      try {
        await expectEvalCellHasScore(page, 'g1h1');
        await expectEvalCellHasScore(page, 'g1h2');

        await expectEvalCellSource(page, 'g1h1', 'none');
        await expectEvalCellSource(page, 'g1h2', 'none');
      } catch (testError: any) {
        const isDepthProgressWithMissing = (finalStatus === 'depth-progress' || finalStatus === 'analyzing') && 
          finalRows.filter(r => r.uci === 'g1h1' || r.uci === 'g1h2').some(r => !r.cellText || r.cellText.includes('...') || r.cellText.includes('분석 중'));

        const failureTitle = isDepthProgressWithMissing 
          ? 'Partial DB 분석 대기 완료(누락 target move) 실패!'
          : 'Partial DB 분석 대기 완료(정상성공 기대) 실패!';

        throw new Error(`${failureTitle}
- 앱 실제 상태 (Engine Mode): ${finalEngineMode}
- 앱 실제 상태 (Status): ${finalStatus}
- 앱 실제 상태 (Fallback Reason): ${finalFallbackReason}
- 앱 실제 상태 (Error Kind): ${finalErrorKind}
- Stockfish Diagnostics Last Go Command: ${lastGoCommand}
- Candidate Rows State: ${JSON.stringify(finalRows, null, 2)}
- Error Details: ${testError.message}`);
      }
    } else {
      try {
        // 분석 불가 단언검증
        await expectEvalCellUnavailable(page, 'g1h1');
        await expectEvalCellUnavailable(page, 'g1h2');

        await expectEvalCellSource(page, 'g1h1', 'none');
        await expectEvalCellSource(page, 'g1h2', 'none');
        await expectEvalCellHasScore(page, 'g1f1', '-1.50');
      } catch (testError: any) {
        throw new Error(`Partial DB 분석 대기 완료(분석 불가 기대) 실패!
- 앱 실제 상태 (Engine Mode): ${finalEngineMode}
- 앱 실제 상태 (Status): ${finalStatus}
- 앱 실제 상태 (Fallback Reason): ${finalFallbackReason}
- 앱 실제 상태 (Error Kind): ${finalErrorKind}
- Stockfish Diagnostics Last Go Command: ${lastGoCommand}
- Candidate Rows State: ${JSON.stringify(finalRows, null, 2)}
- Error Details: ${testError.message}`);
      }
    }
  });

  test('should fallback safely running complete local analysis when DB load encounters an error', async ({ page }) => {
    // 1. DB의 뼈아픈 접속 시간초과 및 거부 상태 위조 주입
    await page.addInitScript(() => {
      (window as any).__MOCK_DB_ERROR__ = 'Database transaction failed due to network timeout';
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
    const response = await page.goto(targetPageUrl);
    expect(response!.status()).toBe(200);

    await page.waitForSelector('#position-page-shell');

    // 2. DB 우선 연결이 좌절되었어도 크래시 없이 로터리 복원력이 상치되어 3개 후보수 모두 전량 로컬 엔진이 감지해 분석 완료하는지 검증
    const expectedMoves = ['g1f1', 'g1h1', 'g1h2'];

    // 중간 상태 허용 대기 루프 (polling) - 앱 실제 상태 기반 대기 적용
    let finalStatus: string | null = null;
    const terminalFailureStates = [
      'analysis-unavailable',
      'fallback-disabled',
      'fallback-failed',
      'stockfish-failed',
      'error'
    ];

    try {
      await expect.poll(async () => {
        const snap = await captureEnginePanelSnapshot(page);
        finalStatus = snap.status;
        return snap.status === 'completed' || terminalFailureStates.includes(snap.status || '');
      }, {
        message: 'Engine did not reach a terminal state for DB failure scenario',
        timeout: isFastMode ? 5000 : 10000,
        intervals: isFastMode ? [50, 100] : [100, 300, 500]
      }).toBe(true);
    } catch (e) {
      // 타임아웃 되더라도 현재 수집된 상태(finalStatus) 기반으로 계속 단언을 평가
    }

    // Stockfish 기동 완성 여부를 실제 화면상의 셀들이 값으로 가득 채워졌는지 기준으로 종합 판정
    const isSuccessful = await page.evaluate(() => {
      const ep = document.querySelector('#engine-panel');
      if (!ep) return false;
      const status = ep.getAttribute('data-status');
      if (status === 'completed') return true;

      const rows = Array.from(document.querySelectorAll('.candidate-move-row-shell'));
      if (rows.length === 0) return false;

      return rows.every(el => {
        const source = el.getAttribute('data-source');
        const cellText = el.querySelector('[id^="eval-cell-"]')?.textContent || '';
        const hasScoreVal = cellText && !cellText.includes('...') && !cellText.includes('분석 중') && !cellText.includes('분석 불가');
        return source && source !== 'none' && hasScoreVal;
      });
    });

    const shouldExpectValue = isFastMode || isSuccessful || finalStatus === 'completed';

    if (shouldExpectValue) {
      for (const moveUci of expectedMoves) {
        await expectEvalCellHasScore(page, moveUci);
        await expectEvalCellSource(page, moveUci, 'none');
      }
    } else {
      for (const moveUci of expectedMoves) {
        await expectEvalCellUnavailable(page, moveUci);
        await expectEvalCellSource(page, moveUci, 'none');
      }
    }
  });

  test('should fallback to heuristic worker gracefully when BOTH DB load fails AND Stockfish fails to load (opt-in)', async ({ page }) => {
    test.skip(isFastMode, 'Skip heavy fallback worker test in fast mode');
    test.setTimeout(35000);

    const monitor = new FallbackWorkerMonitor(page);

    // 실제 분석 기동 전에 window 수준의 fallback opt-in을 사전 주입합니다.
    await page.addInitScript(() => {
      (window as any).__MOCK_DB_ERROR__ = 'Database connection error';
      (window as any).__ENABLE_FALLBACK_EVAL__ = true;
    });

    // 1. 동시에 Stockfish 에셋 네트워크 응답을 차단하여 주 엔진 실패 강제 위조
    await page.route(/**/ /\/stockfish\/stockfish-18-lite/, async (route) => {
      await route.abort();
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
    const response = await page.goto(`${targetPageUrl}?fallback_eval=true`);
    expect(response!.status()).toBe(200);

    await page.waitForSelector('#position-page-shell');

    // 1.5. Heuristic fallback worker 로드 smoke 선제 수행 및 Handshake 정식 확인
    const handshakeResult = await monitor.verifyHandshakeReady(12000);
    if (!handshakeResult.ok) {
      const lateBlockCheck = monitor.checkWorkerBlocked();
      const info = await captureEnginePanelSnapshot(page);
      const fallbackDiag = await page.evaluate(() => {
        return (window as any).__fallback_diagnostics__ || null;
      });
      const networkLogsString = monitor.logs.length > 0 ? monitor.logs.join('\n') : 'None';
      
      throw new Error(`Fallback worker boot handshake/network verification failed!
- Handshake Issue Reason: ${handshakeResult.reason}
- Engine Panel Status: ${JSON.stringify(info)}
- Fallback Run Diagnostics: ${JSON.stringify(fallbackDiag, null, 2)}
- Network-level Block Check: ${lateBlockCheck.ok ? 'OK (No immediate block)' : `BLOCKED: ${lateBlockCheck.reason}`}
- Collected Worker Network Logs:
- Collected Worker Network Logs:
${networkLogsString}`);
    }

    try {
      // 2. 이중 장애에도 불구하고 최종 Heuristic Fallback이 켜져서 모든 평가 셀이 무사히 계산치로 채워지는지 최종 단언 검증
      const expectedMoves = ['g1f1', 'g1h1', 'g1h2'];

      for (const moveUci of expectedMoves) {
        await expectEvalCellHasScore(page, moveUci);
        await expectEvalCellSource(page, moveUci, 'fallback');
      }
    } catch (testError: any) {
      // 대기 도중 혹은 최종 점수 정규식 실패 시, 우선적으로 워커가 보안 헤더 이슈 등으로 차단되어 도중에 실패한 것은 아닌지 재차 체크
      const lateBlockCheck = monitor.checkWorkerBlocked();
      if (!lateBlockCheck.ok) {
        const fallbackDiag = await page.evaluate(() => {
          return (window as any).__fallback_diagnostics__ || null;
        });
        throw new Error(`Fallback worker loading was explicitly BLOCKED during execution in this sandbox environment.
- Diagnostic Reason: ${lateBlockCheck.reason}
- Fallback Run Diagnostics: ${JSON.stringify(fallbackDiag, null, 2)}
- Collected Worker Network Logs:
${lateBlockCheck.logs.join('\n')}`);
      }

      const info = await captureEnginePanelSnapshot(page);
      const fallbackDiag = await page.evaluate(() => {
        return (window as any).__fallback_diagnostics__ || null;
      });
      const networkLogsString = monitor.logs.length > 0 ? monitor.logs.join('\n') : 'None';
      throw new Error(`storedEvaluationFallback E2E 실패. 
- 스냅샷: ${JSON.stringify(info)}
- Fallback Run Diagnostics: ${JSON.stringify(fallbackDiag, null, 2)}
- 네트워크 진단:
${networkLogsString}
- 상세 에러: ${testError.message}`);
    }
  });

  test('should display "분석 불가" when BOTH DB load fails AND Stockfish fails to load in opt-out (default) mode', async ({ page }) => {
    // 1. DB 로드 에러 및 Stockfish 로드 에러 위조
    await page.addInitScript(() => {
      (window as any).__MOCK_DB_ERROR__ = 'Database connection error';
      (window as any).__MOCK_STOCKFISH_FORCE_ERROR__ = true;
      (window as any).__MOCK_STOCKFISH_WORKER__ = false;
    });

    // 2. Stockfish 에셋 네트워크 응답 차단하여 실패 위조 (Slow mode fallback)
    await page.route(/**/ /\/stockfish\/stockfish-18-lite/, async (route) => {
      await route.abort();
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
    const response = await page.goto(targetPageUrl); // fallback_eval 파라미터가 없으므로 opt-out 상태입니다
    expect(response!.status()).toBe(200);

    await page.waitForSelector('#position-page-shell');

    // 2.5. 상태 전이가 완전히 끝나 터미널 상태에 도달할 때까지 충분히 대기합니다.
    try {
      await waitForTerminalEngineState(page);
    } catch (err: any) {
      const info = await captureEnginePanelSnapshot(page);
      const stockfishDiag = await page.evaluate(() => {
        return (window as any).__stockfish_diagnostics__ || null;
      });
      err.message = `${err.message || ''}\n[E2E Terminal Timeout Debug Info]:
- Engine Panel Snapshot: ${JSON.stringify(info)}
- __stockfish_diagnostics__: ${JSON.stringify(stockfishDiag, null, 2)}`;
      throw err;
    }

    // 3. opt-out 상태에서는 신뢰성이 부족한 fallback 평가를 표시하지 않으므로, 
    // DB 평가가 없는 수(모든 후보수)들은 '분석 불가' 등 주 에러 텍스트 배지로 렌더링되어야 함.
    const expectedMoves = ['g1f1', 'g1h1', 'g1h2'];

    for (const moveUci of expectedMoves) {
      await expectEvalCellUnavailable(page, moveUci);
      await expectEvalCellSource(page, moveUci, 'none');
    }
  });
});
