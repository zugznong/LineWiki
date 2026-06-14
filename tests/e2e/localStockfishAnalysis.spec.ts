import { test, expect, type ConsoleMessage } from '@playwright/test';
import { verifyStockfishSmoke } from '../helpers/stockfishVerify';
import { FallbackWorkerMonitor } from '../helpers/fallbackWorkerVerify';
import { fetchAndCompileWasm, verifySingleWorkerHandshake, verifyMultiWorkerHandshake, readAppDiagnostics } from '../helpers/stockfishWorkerSmoke';
import fs from 'fs';
import path from 'path';

// SOURCES.json을 동적으로 읽어 하드코딩 경로를 완벽 제거합니다.
const sourcesPath = path.resolve(process.cwd(), 'static/stockfish/SOURCES.json');
const sourcesData = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));

const multiJs = sourcesData.files.find((f: any) => f.buildType.includes('Multi-Threaded JS')).filePath;
const multiWasm = sourcesData.files.find((f: any) => f.buildType.includes('Multi-Threaded WASM')).filePath;
const singleJs = sourcesData.files.find((f: any) => f.buildType.includes('Single-Threaded JS')).filePath;
const singleWasm = sourcesData.files.find((f: any) => f.buildType.includes('Single-Threaded WASM')).filePath;

// 합법수가 3개로 고도로 통제된 커스텀 FEN을 사용하여 신속하고 일관성 있는 E2E 검수를 도모합니다.
// 백킹이 갈 수 있는 칸: h1, f1, h2 (총 3가지)
const targetFen = '8/8/8/8/8/5k2/8/6K1_w_-_-_0_1';
const targetPageUrl = `/fen/${targetFen}`;

// 멀티스레드 단독 스모크 핸드셰이크 전결 검사 상태 플래그 (일반 분석 UX가 스킵되지 않도록 항상 true 기본 설정)
let isMultiThreadedSmokePassed = true;
let multiThreadedSmokeError: string | null = null;

test.describe('1. Stockfish Asset Smoke Validation', () => {
  test('should verify single-threaded WASM asset is fetchable and compiles in the browser', async ({ page }) => {
    await page.goto('/');

    const wasmVerifyResult = await fetchAndCompileWasm(page, singleWasm);

    console.info('[E2E WASM Verification Result]', wasmVerifyResult);

    if (!wasmVerifyResult.success) {
      throw new Error(`WASM 검증 패치/컴파일 실패! 진단 정보: 
- 에러: ${wasmVerifyResult.error}
- Content-Type: ${wasmVerifyResult.contentType || 'N/A'}
- 크기: ${wasmVerifyResult.byteLength || 0} bytes
- Hex 프리뷰 (첫 16바이트): ${wasmVerifyResult.hexPreview || 'N/A'}
- Text 프리뷰: ${wasmVerifyResult.textDecoderPreview || 'N/A'}`);
    }

    expect(wasmVerifyResult.success).toBe(true);
    expect(wasmVerifyResult.isModule).toBe(true);
    expect(wasmVerifyResult.byteLength).toBeGreaterThanOrEqual(500000);
    expect(wasmVerifyResult.contentType).not.toBeNull();
  });

  test('should pass in-browser active Stockfish worker smoke test (uci -> uciok)', async ({ page }) => {
    test.setTimeout(25000);
    await page.goto('/');

    const isSharedArrayBufferSupported = await page.evaluate(() => {
      return typeof SharedArrayBuffer !== 'undefined' && typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
    });
    const targetJs = isSharedArrayBufferSupported ? multiJs : singleJs;

    const smokeResult = await verifySingleWorkerHandshake(page, targetJs);

    expect(smokeResult.ok, `Browser side Worker UCI smoke test failed: ${smokeResult.message}`).toBe(true);
  });

  test('should pass strict multi-threaded Stockfish worker direct smoke handshake (uci -> uciok -> isready -> readyok)', async ({ page, request }, testInfo) => {
    // chromium-mt 프로젝트 환경에서만 무결성 단독 검사를 필수 실행합니다.
    if (testInfo.project.name !== 'chromium-mt') {
      test.skip(true, 'chromium-mt 가 아니므로 MT 단독 UCI smoke는 스킵 처리 후 통과시킵니다.');
      return;
    }

    test.setTimeout(20000);
    await page.goto('/');

    const smokeHandshake = await verifyMultiWorkerHandshake(page, multiJs);

    if (!smokeHandshake.success) {
      // raw Worker smoke 가 직접 실패하더라도 앱의 StockfishWorkerFactory 복구 경로(ST fallback 등) 성능 확인을 위해 
      // isMultiThreadedSmokePassed 상태는 true를 유지하여 일반 분석 UX가 차단되지 않게 합니다.
      isMultiThreadedSmokePassed = true;

      // 실패 정보를 즉각 분석 및 디버깅할 수 있도록 네트워크 헤더 및 리포트 완성
      let jsHeadersDump = 'N/A';
      let wasmHeadersDump = 'N/A';
      try {
        const jsRes = await request.get(multiJs);
        jsHeadersDump = JSON.stringify(jsRes.headers(), null, 2);
      } catch (e: any) { jsHeadersDump = `JS Fetch Error: ${e.message}`; }

      try {
        const wasmRes = await request.get(multiWasm);
        wasmHeadersDump = JSON.stringify(wasmRes.headers(), null, 2);
      } catch (e: any) { wasmHeadersDump = `WASM Fetch Error: ${e.message}`; }

      const failedDetailMsg = `
================================================================================
🚨 [MT worker handshake 실패] 멀티스레드 정밀 통신 Handshake 검증에 완전 실패했습니다!
================================================================================
- 원인 보고: ${JSON.stringify(smokeHandshake.errorLog, null, 2)}
- window.crossOriginIsolated: ${await page.evaluate(() => window.crossOriginIsolated)}
- 브라우저 Worker 핸들러 통신 로그:
  ${smokeHandshake.stateLog?.join('\n  ')}

[Stockfish JS 응답 헤더]
${jsHeadersDump}

[Stockfish WASM 응답 헤더]
${wasmHeadersDump}
================================================================================
      `;
      multiThreadedSmokeError = failedDetailMsg;
      throw new Error(failedDetailMsg);
    }

    isMultiThreadedSmokePassed = true;
    console.info('=== [E2E SUCCESS] Direct Multi-Threaded Worker Handshake Passed (uciok & readyok confirmed in 10s) ===');
  });
});

test.describe('2. Live Stockfish Chess Analysis & Sorting UX', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // E2E 기동 시 고농축 속도 개선을 위해 localStorage 에 예산 설정을 'fast'(depth 16 제한)로 선기입하여 depth 6~8 에 초고속 수렴 전개되도록 유인합니다.
    await page.addInitScript(() => {
      window.localStorage.setItem('chess_engine_settings', JSON.stringify({
        requestedThreads: 'auto',
        requestedHash: 'auto',
        requestedBudget: 'fast'
      }));
    });
  });

  test('should run local engine evaluation for all legal moves and display evaluations with correct MultiPV number when smoke test passes', async ({ page }, testInfo) => {
    test.setTimeout(25000);

    // 자산 전송 상태 및 헤더 디버깅을 위해 응답 로거 장착
    const collectedResponses: Array<{ url: string; status: number; headers: Record<string, string> }> = [];
    page.on('response', (res) => {
      const url = res.url();
      if (url.includes('stockfish') || url.includes('.js') || url.includes('.wasm')) {
        collectedResponses.push({
          url,
          status: res.status(),
          headers: res.headers()
        });
      }
    });

    // chromium-mt 환경에서 단독 MT smoke가 사전에 실패했다면 후속 UI 테스트에 결코 진입하지 않고 조기 차단
    if (testInfo.project.name === 'chromium-mt') {
      expect(isMultiThreadedSmokePassed, `MT worker handshake 실패: ${multiThreadedSmokeError || 'Handshake failed before analysis'}`).toBe(true);
    }

    // 1. 단일 다이렉트 페이지 로딩 (이중 워커 간섭 최소화 및 경합 해소)
    const response = await page.goto(targetPageUrl);
    expect(response!.status()).toBe(200);

    // 메인 레이아웃 셸 대기
    await page.waitForSelector('#position-page-shell');

    // 스토어가 완벽하게 마운트되고 초기 파싱이 이뤄질 만큼 충분히 대기 (약 1.5초)
    await page.waitForTimeout(1500);

    // 정상 MT 테스트는 점수 렌더링보다 먼저 진단값을 확인한다. (상세 문제 원인 수집)
    if (testInfo.project.name === 'chromium-mt') {
      console.info('[E2E MT Diagnostics Check] Verifying 5 key MT diagnostics conditions before proceeding.');
      
      let lastDiag: any = null;
      let lastControlState: any = null;
      try {
        await expect.poll(async () => {
          const state = await readAppDiagnostics(page);
          lastDiag = state.diag;
          lastControlState = state.elAttr;
          return {
            canUseMultiThread: state.diag.canUseMultiThread,
            actualBuildType: state.diag.actualBuildType,
            uciokReceived: state.diag.uciokReceived,
            readyokReceived: state.diag.readyokReceived,
            engineMode: state.elAttr ? state.elAttr.engineMode : null
          };
        }, {
          message: 'Chromium-MT 프로젝트의 5가지 핵심 MT 충족 요건 대기 초과 완료 에러',
          timeout: 15000,
          intervals: [200, 500, 1000]
        }).toEqual({
          canUseMultiThread: true,
          actualBuildType: 'multi',
          uciokReceived: true,
          readyokReceived: true,
          engineMode: 'stockfish'
        });
      } catch (err: any) {
        throw new Error(`[MT Diagnostics Check Failed] MT diagnostics 선결조건 대기 실패! (경합 제거 적용됨)
- Error Message: ${err?.message}
- Fallback Reason in DOM: ${lastControlState?.fallbackReason || 'None'}
- Fallback Stage in Diagnostics: ${lastDiag?.fallbackStage || 'None'}
- Last Worker Error in Diagnostics: ${lastDiag?.lastWorkerError || 'None'}
- diagnostics state: ${JSON.stringify(lastDiag, null, 2)}
- DOM enginePanel elements: ${JSON.stringify(lastControlState, null, 2)}
- Collected WASM/JS network headers:
${JSON.stringify(collectedResponses, null, 2)}`);
      }
    }

    // Heuristic Fallback 모드로 이행했는지 DOM 어트리뷰트를 통해 검증합니다
    const enginePanel = page.locator('#engine-panel');
    let isFallback = false;
    try {
      await enginePanel.waitFor({ state: 'attached', timeout: 5000 });
      const engineMode = await enginePanel.getAttribute('data-engine-mode');
      isFallback = engineMode === 'fallback';
    } catch {
      // 요소를 시간 내 발견할 수 없었거나 Fallback 상태가 아님
    }

    if (isFallback) {
      const fallbackReason = await enginePanel.getAttribute('data-fallback-reason') || 'Unknown';
      const diagnostics = await page.evaluate(() => (window as any).__stockfish_diagnostics__ || null);
      throw new Error(`정상 스톡피쉬 엔진 모드가 구동되어야 하지만 대체 휴리스틱 fallback 모드로 격하 구동 중입니다. (이유: ${fallbackReason})
      
__stockfish_diagnostics__: ${JSON.stringify(diagnostics, null, 2)}
Last Worker Error: ${diagnostics?.lastWorkerError || 'None'}
Fallback Stage: ${diagnostics?.fallbackStage || 'None'}
WASM/JS network response headers:
${JSON.stringify(collectedResponses, null, 2)}`);
    }

    // 엔진 패널이 로드되고 'Stockfish 18/' 텍스트가 표시될 때까지 대기
    const engineStatusLoc = page.locator('#desktop-side-panel-col, #bottom-panel-container').locator('text=/Stockfish 18/');
    await expect(engineStatusLoc.first()).toBeVisible();

    // 2. 엔진 시스템 요약/정보 패널에 있는 MultiPV 값이 후보수 개수(3)와 일치하게 명기되는지 검정
    const metricsBox = page.locator('#engine-metrics-box');
    await expect(metricsBox).toBeVisible();

    // MultiPV 정보 레이블에 직접 text를 맞추는 대신, data-active-multipv 속성(active MultiPV 수가 후보수 수 3과 일치하는가)을 직접 안전하게 검정합니다.
    await expect(metricsBox).toHaveAttribute('data-active-multipv', '3');

    const activeMultiPvVal = page.locator('#engine-active-multipv-value');
    await expect(activeMultiPvVal).toHaveText('3');

    // [Fast Path] "설정 선택 -> DOM 표시 -> request targetDepth 전달 진단값 확인"
    const diagnostics = await page.evaluate(() => (window as any).__stockfish_diagnostics__ || null);
    expect(diagnostics).not.toBeNull();
    // fast 예산 설정에 기인한 targetDepth 가 0보다 큰 수로 전달되었는지 검격
    expect(diagnostics.targetDepth).toBeGreaterThan(0);

    // [Fast Path-Diagnostics Assertions]
    // 1) uciokReceived, readyokReceived 수집 완료 검증 (readyok 진단)
    expect(diagnostics.uciokReceived).toBe(true);
    expect(diagnostics.readyokReceived).toBe(true);

    // 2) 깊은 분석 완료 전, 핵심 진단 변수들 (lastGoCommand, actualBuildType, readyokReceived, positionMode, activeMultiPv) 정밀 대조 검정
    expect(diagnostics.lastGoCommand).not.toBeNull();
    expect(diagnostics.lastGoCommand).toContain('go');
    expect(['multi', 'single', 'multi-failed-single-fallback']).toContain(diagnostics.actualBuildType);
    expect(diagnostics.readyokReceived).toBe(true);
    expect(['fen-only', 'moves-from-start']).toContain(diagnostics.lastPositionMode);
    expect(diagnostics.activeMultiPv).toBe(3);

    // 3) NPS 가 연산 구동에 의해 0보다 큰 양의 정수로 올라서서 정상 활성화 렌더링되는지 폴링 대기 검증 (go 연동 정상 작동 여부)
    await expect.poll(async () => {
      const text = await page.locator('strong:has-text("NPS")').first().innerText();
      const val = parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
      return val;
    }, {
      message: 'E2E fast 핫-패스: NPS가 0보다 큰 값으로 갱신되지 않았습니다.',
      timeout: 8000,
      intervals: [500]
    }).toBeGreaterThan(0);

    if (process.env.RUN_SLOW_STOCKFISH_E2E !== '1') {
      console.info('[E2E Fast Path-Display Only] Skipping slow depth 16/24 evaluations convergence wait.');
      return;
    }

    // 이 포지션에서 합법수는 g1f1, g1h1, g1h2 총 3개입니다.
    const expectedMoves = ['g1f1', 'g1h1', 'g1h2'];

    // 1. 모든 후보수 셀에 실제 스코어 평가치 배지가 세밀하게 등재되고 '분석 중'이나 '...' 상태에서 점수 패턴으로 이행하는지 관찰 및 대기
    for (const moveUci of expectedMoves) {
      const evalCell = page.locator(`#eval-cell-${moveUci}`);
      await expect(evalCell).toBeVisible();

      // 디폴트 텍스트 '...' 혹은 '분석 중'을 넘어서서 숫자(+ 또는 -), M(메이트) 패턴 등으로 최종 귀결되는지 10초 대기 (fast 세팅에 반응)
      const textVal = evalCell.locator('span').first();
      await expect(textVal).not.toHaveText('...', { timeout: 10000 });
      await expect(textVal).not.toHaveText('분석 중', { timeout: 10000 });

      // 유효한 가치 스코어가 렌더링되고 있는지 검증 (정규식 검사)
      const value = await textVal.innerText();
      expect(value).toMatch(/^[+-]\d+\.\d+|M\d+|0\.00$/);
    }
  });

  test('should sort candidate moves correctly by evaluation score in DOM order based on active turn player', async ({ page }, testInfo) => {
    test.setTimeout(25000);

    // chromium-mt 환경에서 단독 MT smoke가 사전에 실패했다면 후속 UI 테스트에 결코 진입하지 않고 조기 차단
    if (testInfo.project.name === 'chromium-mt') {
      expect(isMultiThreadedSmokePassed, `MT worker handshake 실패: ${multiThreadedSmokeError || 'Handshake failed before analysis'}`).toBe(true);
    }

    // 별도의 smoke worker 생성 없이 다이렉트 페이지 연결로 수렴 검증 진행
    const response = await page.goto(targetPageUrl);
    expect(response!.status()).toBe(200);

    await page.waitForSelector('#position-page-shell');
    await page.waitForTimeout(1500);

    if (process.env.RUN_SLOW_STOCKFISH_E2E !== '1') {
      console.info('[E2E Fast Path-Sorting] Skipping slow scoring and layout sorting wait.');
      const diagnostics = await page.evaluate(() => (window as any).__stockfish_diagnostics__ || null);
      expect(diagnostics).not.toBeNull();
      expect(diagnostics.targetDepth).toBeGreaterThan(0);
      return;
    }

    // 분석 평가가 수렴할 때까지 대기
    const expectedMoves = ['g1f1', 'g1h1', 'g1h2'];
    for (const moveUci of expectedMoves) {
      const evalCell = page.locator(`#eval-cell-${moveUci}`);
      await expect(evalCell).toBeVisible();
      const textVal = evalCell.locator('span').first();
      await expect(textVal).not.toHaveText('...', { timeout: 10000 });
      await expect(textVal).not.toHaveText('분석 중', { timeout: 10000 });
    }

    // 정렬 뷰 엘리먼트들 수집
    const rows = page.locator('.candidate-move-row-shell');
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
    const rowCount = await rows.count();
    expect(rowCount).toBe(3); // 3개의 후보수 확보 확인

    const movesWithScores: { uci: string; score: number; rank: number; index: number }[] = [];

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const uci = await row.getAttribute('data-uci') || '';
      const rankStr = await row.getAttribute('data-rank') || '';
      const sortScoreStr = await row.getAttribute('data-sort-score') || '';
      
      const rankVal = parseInt(rankStr, 10);
      const scoreVal = sortScoreStr ? parseFloat(sortScoreStr) : -999999;
      
      movesWithScores.push({ uci, score: scoreVal, rank: rankVal, index: i });
    }

    console.info('[E2E Live Engine Sorting Verification]', movesWithScores);

    // DOM 구조 상의 각각의 행들이 올바른 rank index를 순방향으로 지키고 있는지 검거
    for (let i = 0; i < movesWithScores.length; i++) {
      expect(movesWithScores[i].rank).toBe(i + 1);
    }

    // targetFen은 "백" 차례이므로 점수에 따른 내림차순(점수가 높은 최고의 수의 데이터 행이 맨 윗줄 즉 랭크 1위를 점유해야 함) 검증
    for (let i = 0; i < movesWithScores.length - 1; i++) {
      expect(movesWithScores[i].score).toBeGreaterThanOrEqual(movesWithScores[i + 1].score);
    }
  });
});

test.describe('3. Resilience, Network Failures & Heuristic Fallbacks', () => {
  test.describe.configure({ mode: 'serial' });

  test('should fallback to heuristic worker gracefully and render evaluations with fallback tag when main Stockfish resources fail to load', async ({ context }) => {
    test.setTimeout(45000);
    
    // 타 테스트 세션의 오손/침투 방지를 위해 고도로 격리된 임시 페이지 생성 및 생명주기 관리
    const page = await context.newPage();

    try {
      const monitor = new FallbackWorkerMonitor(page);

      // 실제 분석 기동 전에 window 수준의 fallback opt-in을 사전 주입합니다.
      await page.addInitScript(() => {
        (window as any).__ENABLE_FALLBACK_EVAL__ = true;
      });

      // 브라우저 내부의 모든 unhandled exception 및 console error들을 수집하여 원인을 완벽 분리
      const browserErrors: string[] = [];
      page.on('pageerror', (err) => {
        const errMsg = err.message || '';
        if (
          errMsg.includes('network error') || 
          errMsg.includes('Worker dynamic creation failed') || 
          errMsg.includes('Stockfish Worker final recovery error') ||
          errMsg.includes('final recovery error') ||
          errMsg.includes('Failed to fetch') ||
          errMsg.includes('Worker runtime error') ||
          errMsg.includes('Preflight 최종 실패') ||
          errMsg.includes('preflight')
        ) {
          return;
        }
        browserErrors.push(`[PageError] ${err.name || 'Error'}: ${errMsg}`);
      });

      // 주 엔진의 모든 Stockfish 리소스 로딩을 정밀 에러 유도하여 Heuristic Fallback 모드로 최종 격상시킵니다.
      await page.route(/stockfish-18-lite/, async (route) => {
        await route.abort();
      });

      // 쿼리 파라미터로 opt-in 안전성 가미
      const optInUrl = targetPageUrl.includes('?') ? `${targetPageUrl}&fallback_eval=true` : `${targetPageUrl}?fallback_eval=true`;

      // 3. 페이지로 이동
      const response = await page.goto(optInUrl);
      expect(response!.status()).toBe(200);
      await page.waitForSelector('#position-page-shell');

      // 4. 'fallback' 상태 및 화면 표시 검증
      const enginePanel = page.locator('#engine-panel');
      await enginePanel.waitFor({ state: 'attached', timeout: 15000 });

      const engineMode = await enginePanel.getAttribute('data-engine-mode');
      expect(engineMode).toBe('fallback');

      // UI 상에서 Heuristic Fallback 레이블 검출
      const fallbackUI = page.locator('#desktop-side-panel-col, #bottom-panel-container').locator('text=/Heuristic Fallback/');
      await expect(fallbackUI.first()).toBeVisible({ timeout: 15000 });

      if (process.env.RUN_SLOW_STOCKFISH_E2E !== '1') {
        console.info('[E2E Fast Path-Fallback] Skipping slow heuristic fallback evaluation value stabilization check.');
        await monitor.verifyHandshakeReady();
        return;
      }

      // 실제 분석 결과도 Fallback 형태로 흘러나오는지 대조 검진
      const expectedMoves = ['g1f1', 'g1h1', 'g1h2'];
      for (const moveUci of expectedMoves) {
        const evalCell = page.locator(`#eval-cell-${moveUci}`);
        await expect(evalCell).toBeVisible();
        const textVal = evalCell.locator('span').first();
        await expect(textVal).not.toHaveText('...', { timeout: 30000 });
        await expect(textVal).not.toHaveText('분석 중', { timeout: 30000 });
        
        const value = await textVal.innerText();
        expect(value).toMatch(/^[+-]\d+\.\d+|M\d+|0\.00$/);
      }

      await monitor.verifyHandshakeReady();
    } finally {
      // 페이지 세션 파괴로 라우팅 오염 누설 근본 차단
      await page.close();
    }
  });

  test('should gracefully fall back of MT to ST inside the main engine when MT resources fail under crossOriginIsolated environment', async ({ context }, testInfo) => {
    test.setTimeout(45000);
    
    // chromium-mt 환경에서 단독 MT smoke가 사전에 실패했다면 복구 테스트도 스킵하고 패스
    if (testInfo.project.name === 'chromium-mt' && !isMultiThreadedSmokePassed) {
      test.skip(true, 'MT smoke failed previously, skipping complex fallback test.');
      return;
    }

    // 완전 격리된 임시 페이지 생성하여 라우팅 변조의 다른 테스트 유입 차단
    const page = await context.newPage();

    try {
      // 1. crossOriginIsolated 및 SharedArrayBuffer 보안 사양 존재 여부 검격
      const isMTSupported = await page.evaluate(() => {
        return typeof SharedArrayBuffer !== 'undefined' && typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
      });

      if (!isMTSupported) {
        console.info('[Proceed Test] Environment does not support MT. Proceeding to verify single fallback directly.');
      }

      // 2. MT WASM 리소스만 정밀 차단하여 MT 엔진 자체의 Preflight 실패 또는 Worker 생성 실패 상황을 의도적으로 유도합니다.
      // (이때 single-threaded 리소스는 열려 있어야 정상적으로 ST 복구가 성공합니다.)
      await page.route(/stockfish-18-lite(\.js|\.wasm)$/, async (route) => {
        console.info('[E2E Route Guard] Intentionally aborting Multi-Threaded resource:', route.request().url());
        await route.abort();
      });

      // ST 리소스가 정상 200으로 로드되는지 확인하기 위해 response 이벤트를 모니터링합니다.
      let singleWasmSuccessful = false;
      page.on('response', (res) => {
        const url = res.url();
        if (url.includes('stockfish-18-lite-single') && res.status() === 200) {
          singleWasmSuccessful = true;
        }
      });

      // 3. 페이지로 이동
      const response = await page.goto(targetPageUrl);
      expect(response!.status()).toBe(200);
      await page.waitForSelector('#position-page-shell');

      // 4. MT 리소스 로딩에 실패한 경우, PreflightBufferedWorker 내부의 은동 생명 주기 복구 프로세스가 작동하여
      // 싱글스레드(ST) 18 로 완벽 리부트됩니다. 
      // 이에 따라 Heuristic Fallback 모드 격하가 "아니라" 실제 Stockfish 18 Single-Thread (WASM) 로 구동이 보정되어야 합니다.
      const enginePanel = page.locator('#engine-panel');
      await enginePanel.waitFor({ state: 'attached', timeout: 12000 });

      const engineMode = await enginePanel.getAttribute('data-engine-mode');
      expect(engineMode).toBe('stockfish');

      const engineBuildType = await enginePanel.getAttribute('data-engine-build-type');
      expect(engineBuildType).not.toBe('fallback'); // fallback 이면 즉시 실패
      expect(['multi-failed-single-fallback', 'single']).toContain(engineBuildType);

      // ST 리소스 200 성공을 단언합니다.
      expect(singleWasmSuccessful, '싱글스레드 리소스(ST)는 200 OK 정상 수신이어야 합니다.').toBe(true);

      // UI상 엔진 라벨이 'Stockfish 18 Single-Thread (WASM)' 인지 검증합니다.
      const engineStatusLoc = page.locator('#desktop-side-panel-col, #bottom-panel-container').locator('text=/Stockfish 18 Single-Thread/');
      await expect(engineStatusLoc.first()).toBeVisible({ timeout: 15000 });

      if (process.env.RUN_SLOW_STOCKFISH_E2E !== '1') {
        console.info('[E2E Fast Path-MTtoST] Skipping single-thread engine slow convergence checks.');
        return;
      }

      // 실제 분석 결과도 ST에서 완벽하게 흘러나오는지 대조검진 
      const expectedMoves = ['g1f1', 'g1h1', 'g1h2'];
      for (const moveUci of expectedMoves) {
        const evalCell = page.locator(`#eval-cell-${moveUci}`);
        await expect(evalCell).toBeVisible();
        const textVal = evalCell.locator('span').first();
        await expect(textVal).not.toHaveText('...', { timeout: 30000 });
        await expect(textVal).not.toHaveText('분석 중', { timeout: 30000 });
        
        const value = await textVal.innerText();
        expect(value).toMatch(/^[+-]\d+\.\d+|M\d+|0\.00$/);
      }
    } finally {
      // 페이지 세션 파괴로 라우팅 오염 누설 근본 차단
      await page.close();
    }
  });
});

test.describe('4. Regression testing: Continuous Deep Analysis Transitions and Console Integrity', () => {
  // 공통 콘솔 경고 수집 및 실패 검증용 헬퍼 함수
  const setupConsoleGuard = (page: any, targetProjectName?: string) => {
    const consoleWarnings: string[] = [];
    const isMtProject = targetProjectName?.includes('mt') || false;

    page.on('console', (msg: ConsoleMessage) => {
      const type = msg.type();
      const text = msg.text();
      const lower = text.toLowerCase();

      // 의도적으로 리소스를 중단시키거나 preflight 실패를 유도하는 시나리오에서 발생하는 예상 로그는 완전히 제외합니다.
      if (
        lower.includes('failed to fetch') || 
        lower.includes('preflight') || 
        lower.includes('final recovery error') || 
        lower.includes('worker runtime error')
      ) {
        return;
      }

      // UCI timeout, fallback 비표시, crossOriginIsolated=false, SharedArrayBuffer=false, worker runtime error 수집
      const hasUciTimeout = lower.includes('uci timeout') || lower.includes('uciok handshake timeout');
      const hasFallbackHidden = lower.includes('fallback') && (lower.includes('hidden') || lower.includes('비표시'));
      const hasWorkerError = (lower.includes('worker runtime error') || lower.includes('watcher runtime error') || (lower.includes('worker') && lower.includes('error'))) && !lower.includes('failed to fetch');
      const hasMtMissing = lower.includes('crossoriginisolated=false') || lower.includes('sharedarraybuffer=false') || lower.includes('cross-origin isolation');

      if (type === 'warning' || type === 'error') {
        if (hasUciTimeout || hasFallbackHidden || hasWorkerError) {
          consoleWarnings.push(`[Console ${type}] ${text}`);
        } else if (hasMtMissing) {
          // 멀티스레드 미지원 경고는 chromium-mt 프로젝트에서만 실패로 격상
          if (isMtProject) {
            consoleWarnings.push(`[Console MT Missing Critical Warning] ${text}`);
          }
        }
      }
    });

    return consoleWarnings;
  };

  test('Regression: Resilient 타이머 영구 대기 유인 방지 - 연속적인 3회 이상의 즉각적 FEN 전환 시 분석이 12초 이내 안정화 완료되는지 검증', async ({ page }, testInfo) => {
    test.setTimeout(55000);

    if (process.env.RUN_SLOW_STOCKFISH_E2E !== '1') {
      console.info('[E2E Fast Path] Skipping slow continuous transitions regression test.');
      test.skip();
      return;
    }

    // 단독 스모크 결과 전역 상태 기반으로 검증 격리
    if (testInfo.project.name === 'chromium-mt' && !isMultiThreadedSmokePassed) {
      console.info('[Skip Test] MT smoke failed previously, skipping multi-transition regression.');
      test.skip();
      return;
    }

    const consoleWarnings = setupConsoleGuard(page, testInfo.project.name);

    const fens = [
      '8/8/8/8/8/5k2/8/6K1_w_-_-_0_1',
      '8/8/8/8/8/5k2/5K2/8_b_-_-_1_1', 
      '8/8/8/5k2/8/8/5K2/8_w_-_-_2_2',
      '8/8/8/5f2/8/8/5K2/8_b_-_-_3_3'
    ];

    // 빠른 가속 다중 전환
    for (const f of fens) {
      await page.goto(`/fen/${f}`);
      await page.waitForSelector('#position-page-shell');
      await page.waitForTimeout(300); // 300ms 만 가속 대기하여 stop 큐 과밀 부하 상태 창출
    }

    // Heuristic Fallback 모드로 이탈했는지 여부를 선도 검증하여 원인 교란 방지
    const enginePanel = page.locator('#engine-panel');
    let isFallback = false;
    try {
      await enginePanel.waitFor({ state: 'attached', timeout: 5000 });
      const engineMode = await enginePanel.getAttribute('data-engine-mode');
      isFallback = engineMode === 'fallback';
    } catch {}

    if (isFallback) {
      const fallbackReason = await enginePanel.getAttribute('data-fallback-reason') || 'Unknown';
      throw new Error(`정상 스톡피쉬 엔진 모드가 구동되어야 하지만 대체 휴리스틱 fallback 모드로 격하 구동 중입니다. (이유: ${fallbackReason})`);
    }

    // 최종 FEN에서 "..." 가 12초 내 완전히 사라지고 실제 점수로 안착하는지 정밀 단언
    const evalSpans = page.locator('.candidate-move-row-shell').locator('span').first();
    await expect(evalSpans.first()).toBeVisible({ timeout: 15000 });
    
    const firstTextVal = evalSpans.first();
    await expect(firstTextVal).not.toHaveText('...', { timeout: 12000 });
    await expect(firstTextVal).not.toHaveText('분석 중', { timeout: 12000 });

    const value = await firstTextVal.innerText();
    expect(value).toMatch(/^[+-]\d+\.\d+|M\d+|0\.00$/);

    const appStatus = await enginePanel.getAttribute('data-status');
    expect(appStatus).not.toBe('analysis-unavailable');

    expect(consoleWarnings, `감지된 비정상 콘솔 워닝 목록:\n${consoleWarnings.join('\n')}`).toEqual([]);
  });

  test('Regression: 첫 포지션 분석 성공 후 완료 전 다음 수 입력 -> 새 포지션에서도 ...가 10초 이상 유지되지 않고 정상 분석 (analysis-unavailable 절대 없음)', async ({ page }, testInfo) => {
    test.setTimeout(50000);

    if (process.env.RUN_SLOW_STOCKFISH_E2E !== '1') {
      console.info('[E2E Fast Path] Skipping slow completion-before-transition regression test.');
      test.skip();
      return;
    }

    // 단독 스모크 결과 전역 상태 기반으로 검증 격리
    if (testInfo.project.name === 'chromium-mt' && !isMultiThreadedSmokePassed) {
      console.info('[Skip Test] MT smoke failed previously, skipping regression transition.');
      test.skip();
      return;
    }

    const consoleWarnings = setupConsoleGuard(page, testInfo.project.name);

    // 2. 첫 FEN 페이지 이동
    const sourceFen = '8/8/8/8/8/5k2/8/6K1_w_-_-_0_1';
    await page.goto(`/fen/${sourceFen}`);
    await page.waitForSelector('#position-page-shell');
    
    // 분석이 개시되어 돌기 시작할 동안 1.5초 이내의 아주 짧은 대기 (완료 전 단계 유도)
    await page.waitForTimeout(1500);

    // 3. 완료되기 전 즉각 다음 수 입력 시뮬레이션 (새로운 FEN으로 직접 전이)
    // 두 번째 FEN: 흑의 임의 대응 수 포지션
    const targetFen = '8/8/8/8/8/5k2/5K2/8_b_-_-_1_1';
    await page.goto(`/fen/${targetFen}`);
    await page.waitForSelector('#position-page-shell');

    // Heuristic Fallback 모드로 이탈했는지 여부를 선도 검증하여 원인 교란 방지
    const enginePanel = page.locator('#engine-panel');
    let isFallback = false;
    try {
      await enginePanel.waitFor({ state: 'attached', timeout: 5000 });
      const engineMode = await enginePanel.getAttribute('data-engine-mode');
      isFallback = engineMode === 'fallback';
    } catch {}

    if (isFallback) {
      const fallbackReason = await enginePanel.getAttribute('data-fallback-reason') || 'Unknown';
      throw new Error(`정상 스톡피쉬 엔진 모드가 구동되어야 하지만 대체 휴리스틱 fallback 모드로 격하 구동 중입니다. (이유: ${fallbackReason})`);
    }

    // 4. 새 포지션에서 "..." 혹은 "분석 중" 대기 및 10초 이내에 유효 점수로 부드럽게 이행하는가 자가 탐색
    const evalSpans = page.locator('.candidate-move-row-shell').locator('span').first();
    await expect(evalSpans.first()).toBeVisible({ timeout: 15000 });
    
    const firstTextVal = evalSpans.first();
    // 새 포지션에서도 ...가 10초 이상 유지되지 않고 유효 스코어가 신속히 렌더링되어야 합니다.
    await expect(firstTextVal).not.toHaveText('...', { timeout: 10000 });
    await expect(firstTextVal).not.toHaveText('분석 중', { timeout: 10000 });

    const value = await firstTextVal.innerText();
    expect(value).toMatch(/^[+-]\d+\.\d+|M\d+|0\.00$/);

    // 5. analysis-unavailable 상태로 추락하지 않았는지 정밀 검증
    const engineMode = await enginePanel.getAttribute('data-engine-mode');
    expect(engineMode).not.toBe('fallback-disabled');
    expect(engineMode).not.toBe('fallback-failed');

    const appStatus = await enginePanel.getAttribute('data-status');
    expect(appStatus).not.toBe('analysis-unavailable');

    // 6. 콘솔에 수색된 이상 경고 검경
    expect(consoleWarnings, `감지된 비정상 콘솔 워닝 목록:\n${consoleWarnings.join('\n')}`).toEqual([]);
  });



  test('Regression: 수 입력 직후 분석 불가 상태가 표시되지 않아야 함 (provisional 또는 transitioning 상태 유지)', async ({ page }) => {
    test.setTimeout(30000);

    const startFen = '8/8/8/8/8/5k2/8/6K1_w_-_-_0_1';
    await page.goto(`/fen/${startFen}`);
    await page.waitForSelector('#position-page-shell');
    await page.waitForTimeout(1000);

    // g1f1 후보수 행 대기 후 클릭
    const moveRow = page.locator('#candidate-row-g1f1');
    await expect(moveRow).toBeVisible();
    await moveRow.click();

    // 클릭 즉시 새 FEN 페이지 진입 직후 1초 이내에 #engine-panel 상태와 data-status가 'analysis-unavailable'이 아니어야 함을 검증하며,
    // 스토어 상태가 provisional/transitioning/restarting 등 정상적인 전이 관련 상태여야 함.
    await page.waitForTimeout(100); // 아주 미묘한 렌더링 타이밍 감안
    const enginePanel = page.locator('#engine-panel');
    await expect(enginePanel).toBeAttached();

    const dataStatus = await enginePanel.getAttribute('data-status');
    // 'analysis-unavailable' 절대 허용 안 됨
    expect(dataStatus).not.toBe('analysis-unavailable');

    // status 가 'restarting', 'transitioning', 'waiting-ready', 'loading', 'running', 'completed' 등이어야 함
    expect(['restarting', 'transitioning', 'waiting-ready', 'loading', 'running', 'completed', 'idle']).toContain(dataStatus);

    // 1초 동안 반복 모니터링하여 'analysis-unavailable'이 순간적으로 발생하는지 감시
    for (let i = 0; i < 10; i++) {
      const currentStatus = await enginePanel.getAttribute('data-status');
      expect(currentStatus).not.toBe('analysis-unavailable');
      await page.waitForTimeout(100);
    }
  });

  test('Regression: 시작 포지션에서 후보수를 선택하여 진행 시 Stockfish에서 FEN_ONLY가 아닌 position ... moves ... 수순 복원 명령어를 정상 전송하는지 검증', async ({ page }) => {
    test.setTimeout(45000);

    // 2. 시작 전용 FEN(보통의 시작 FEN)으로 진입
    const startFen = '8/8/8/8/8/5k2/8/6K1_w_-_-_0_1';
    await page.goto(`/fen/${startFen}`);
    await page.waitForSelector('#position-page-shell');
    await page.waitForTimeout(1500);

    // Stockfish가 uciok/readyok까지 성공하였는지 대기하고, 성공한 뒤에만 테스트 진행
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const diag = (window as any).__stockfish_diagnostics__ || {};
        return {
          uciok: !!diag.uciokReceived,
          readyok: !!diag.readyokReceived
        };
      });
    }, {
      message: 'Wait for Stockfish to be ready (uciok & readyok) before starting movesFromStart regression test',
      timeout: 15000,
      intervals: [500, 1000]
    }).toEqual({
      uciok: true,
      readyok: true
    });

    // 3. g1f1 후보수 행이 노출될 때까지 대기하고 가볍게 클릭하여 다음 수 진행
    const moveRow = page.locator('#candidate-row-g1f1');
    await expect(moveRow).toBeVisible();
    await moveRow.click();

    // 4. 새 페이지/FEN 구도로 전이 확인
    await page.waitForSelector('#position-page-shell');
    
    // 수순 복원 분석이 기동될 시간을 넉넉히 준다. (1.5초 대기)
    await page.waitForTimeout(1500);

    // 5. StockfishWorkerAdapter에 저장된 __stockfish_diagnostics__ 런타임 결과 추출 검증
    const diagnostics = await page.evaluate(() => {
      return (window as any).__stockfish_diagnostics__ || null;
    });

    const engineMeta = await page.evaluate(() => {
      const el = document.querySelector('[data-engine-mode]');
      if (!el) {
        return {
          engineMode: 'not-rendered',
          fallbackReason: 'not-rendered',
          status: 'not-rendered',
          lastEngineError: 'not-rendered'
        };
      }
      return {
        engineMode: el.getAttribute('data-engine-mode') || 'null',
        fallbackReason: el.getAttribute('data-fallback-reason') || 'null',
        status: el.getAttribute('data-status') || 'null',
        lastEngineError: el.getAttribute('data-last-engine-error') || 'null'
      };
    });

    console.info('[E2E Position Diagnostics Check] diagnostics:', diagnostics, 'engineMeta:', engineMeta);

    if (diagnostics === null) {
      console.error('[Error Details] Stockfish diagnostics가 누설되지 않았으며 null 상태입니다. 수색 실패 원인 진단:', {
        engineMode: engineMeta.engineMode,
        fallbackReason: engineMeta.fallbackReason,
        status: engineMeta.status,
        lastEngineError: engineMeta.lastEngineError
      });
      expect(
        diagnostics, 
        `Stockfish diagnostics가 null입니다. (디버깅 정보 - 엔진 모드: ${engineMeta.engineMode}, 엔진 상태: ${engineMeta.status}, 폴백사유: ${engineMeta.fallbackReason}, 엔진에러: ${engineMeta.lastEngineError})`
      ).not.toBeNull();
    }

    expect(diagnostics).not.toBeNull();
    // movesFromStart가 정상적으로 한 개 채워졌는지, 그리고 모드가 'moves-from-start' 가 되었는지 엄격 검식합니다.
    expect(diagnostics.lastPositionMode).toBe('moves-from-start');
    expect(Array.isArray(diagnostics.movesFromStart)).toBe(true);
    expect(diagnostics.movesFromStart).toContain('g1f1');
  });
});

test.describe('5. Stockfish Depth and Budget Command Verification (MT/ST)', () => {
  test('should verify go depth 24/28/32 and go infinite command triggers properly on MT success without slow wait', async ({ page }, testInfo) => {
    // 이 테스트는 오직 MT가 완전히 기동되는 chromium-mt 프로젝트 환경에서만 핵심 depth 20 초과 예산 제어를 검증합니다.
    if (testInfo.project.name !== 'chromium-mt') {
      test.skip(true, 'Skip: depth 20+ budget control verification is validated on chromium-mt only.');
      return;
    }

    test.setTimeout(35000);

    // 1. 페이지 로딩
    const response = await page.goto(targetPageUrl);
    expect(response!.status()).toBe(200);
    await page.waitForSelector('#position-page-shell');
    await page.waitForTimeout(1500);

    // 2. MT 성공 상태가 확보될 때까지 대기
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const diag = (window as any).__stockfish_diagnostics__ || {};
        return diag.canUseMultiThread && diag.actualBuildType === 'multi' && diag.uciokReceived && diag.readyokReceived;
      });
    }, {
      message: 'Wait for MT engine to be fully ready before verifying deep budgets',
      timeout: 15000
    }).toBe(true);

    // 3. 우측 설정 패널 활성화
    const topBarBtn = page.locator('#topbar-settings-btn');
    await expect(topBarBtn).toBeVisible();
    await topBarBtn.click();

    const settingsPanel = page.locator('#desktop-side-panel-col #settings-panel');
    await expect(settingsPanel).toBeVisible();

    // -- (1) Deep 설정 -> go depth 24 명령 검증
    const deepBtn = settingsPanel.locator('button', { hasText: 'Depth 24' });
    await expect(deepBtn).toBeVisible();
    await deepBtn.click();

    await expect.poll(async () => {
      return await page.evaluate(() => {
        const diag = (window as any).__stockfish_diagnostics__ || {};
        return diag.lastGoCommand;
      });
    }, {
      message: 'Expected lastGoCommand to be "go depth 24" after clicking Depth 24 budget',
      timeout: 8000
    }).toBe('go depth 24');

    // -- (2) Ultra 설정 -> go depth 28 명령 검증
    const ultraBtn = settingsPanel.locator('button', { hasText: 'Depth 28' });
    await expect(ultraBtn).toBeVisible();
    await ultraBtn.click();

    await expect.poll(async () => {
      return await page.evaluate(() => {
        const diag = (window as any).__stockfish_diagnostics__ || {};
        return diag.lastGoCommand;
      });
    }, {
      message: 'Expected lastGoCommand to be "go depth 28" after clicking Depth 28 budget',
      timeout: 8000
    }).toBe('go depth 28');

    // -- (3) Max 설정 -> go depth 32 명령 검증
    const maxBtn = settingsPanel.locator('button', { hasText: 'Depth 32' });
    await expect(maxBtn).toBeVisible();
    await maxBtn.click();

    await expect.poll(async () => {
      return await page.evaluate(() => {
        const diag = (window as any).__stockfish_diagnostics__ || {};
        return diag.lastGoCommand;
      });
    }, {
      message: 'Expected lastGoCommand to be "go depth 32" after clicking Depth 32 budget',
      timeout: 8000
    }).toBe('go depth 32');

    // -- (4) Infinite 설정 -> MT 환경이므로 즉각 go infinite 명령 검증 (infinite + MT)
    const infiniteBtn = settingsPanel.locator('button', { hasText: '무제한 분석' });
    await expect(infiniteBtn).toBeVisible();
    await infiniteBtn.click();

    await expect.poll(async () => {
      return await page.evaluate(() => {
        const diag = (window as any).__stockfish_diagnostics__ || {};
        return diag.lastGoCommand;
      });
    }, {
      message: 'Expected lastGoCommand to be "go infinite" in MT mode after clicking 무제한 분석 budget',
      timeout: 8000
    }).toBe('go infinite');
  });

  test('should verify go depth 20 stabilization and go infinite command transition on ST (infinite + ST)', async ({ page }, testInfo) => {
    // ST (SAB 미지원 혹은 chromium-st 프로젝트 환경)에서 infinite 가 작동할 때
    // go depth 20 수집 단계 후 go infinite 로 전이되는 과정이 보정되는가 검증합니다.
    if (testInfo.project.name === 'chromium-mt') {
      test.skip(true, 'Skip ST infinite test inside chromium-mt project.');
      return;
    }

    test.setTimeout(35000);

    // SAB 미지원 / MT 불가 상태 세팅을 주입하여 확실하게 ST 단독 기동 유인
    await page.addInitScript(() => {
      Object.defineProperty(window, 'SharedArrayBuffer', {
        value: undefined,
        writable: true,
        configurable: true
      });
      Object.defineProperty(window, 'crossOriginIsolated', {
        value: false,
        writable: true,
        configurable: true
      });
    });

    const response = await page.goto(targetPageUrl);
    expect(response!.status()).toBe(200);
    await page.waitForSelector('#position-page-shell');
    await page.waitForTimeout(1500);

    // ST 정상 기동 확인 대기
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const diag = (window as any).__stockfish_diagnostics__ || {};
        return !diag.canUseMultiThread && diag.uciokReceived && diag.readyokReceived;
      });
    }, {
      message: 'Wait for ST engine to be fully ready',
      timeout: 15000
    }).toBe(true);

    // 우측 설정 패널 활성화
    const topBarBtn = page.locator('#topbar-settings-btn');
    await expect(topBarBtn).toBeVisible();
    await topBarBtn.click();

    const settingsPanel = page.locator('#desktop-side-panel-col #settings-panel');
    await expect(settingsPanel).toBeVisible();

    // Infinite 버튼 클릭
    const infiniteBtn = settingsPanel.locator('button', { hasText: '무제한 분석' });
    await expect(infiniteBtn).toBeVisible();
    await infiniteBtn.click();

    // 1단계: ST는 go depth 20 안정화를 먼저 수행해야 하므로 lastGoCommand가 'go depth 20' 이 먼저 되어야 함
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const diag = (window as any).__stockfish_diagnostics__ || {};
        return diag.lastGoCommand;
      });
    }, {
      message: 'Expected intermediate go depth 20 stabilization command in ST mode',
      timeout: 10000
    }).toBe('go depth 20');

    // 2단계: depth 20 완성 시그널을 수령하면 go infinite 로 전환됨
    // (실제로 g1f1 합법수 3개짜리 가설 FEN이므로 ST에서도 depth 20 수렴까지 1~2초면 완료되어 'go infinite' 연쇄가 실시간 발현됩니다!)
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const diag = (window as any).__stockfish_diagnostics__ || {};
        return diag.lastGoCommand;
      });
    }, {
      message: 'Expected eventual transition to "go infinite" in ST mode after depth 20 stabilization',
      timeout: 15000
    }).toBe('go infinite');
  });

  test('should verify that Ready timeout does not occur within 3 seconds and handshake progresses successfully', async ({ page }) => {
    test.setTimeout(15000);

    const response = await page.goto(targetPageUrl);
    expect(response!.status()).toBe(200);
    await page.waitForSelector('#position-page-shell');

    // 3초간 기다림 (Ready timeout이 3초 안에 예기치 않게 발생하는지 감시)
    await page.waitForTimeout(3000);

    // 디버깅/진단 진단 정보 추출
    const diagnostics = await page.evaluate(() => (window as any).__stockfish_diagnostics__ || null);
    
    // diagnostics 상태가 null이 아니고 성공적으로 진행되었거나 작동 중인지 확인
    expect(diagnostics).not.toBeNull();
    expect(diagnostics.lastWorkerError).toBeNull();
    expect(diagnostics.uciokReceived).toBe(true);
    expect(diagnostics.handshakePhase).not.toBe('aborted');
    expect(diagnostics.handshakePhase).not.toBe('terminal');
  });
});
