import { test, expect } from '@playwright/test';
import { STORAGE_KEYS } from '../../src/lib/config/appConfig';

test.describe('Engine Performance Settings E2E Tests', () => {
  const targetFen = '8/8/8/8/8/5k2/8/6K1_w_-_-_0_1';
  const targetPageUrl = `/fen/${targetFen}`;

  test('should store settings successfully and update real-time specs monitors upon modification', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const response = await page.goto(targetPageUrl);
    expect(response!.status()).toBe(200);

    await page.waitForSelector('#position-page-shell');

    // 1. 상단 '설정' 탭 실행하여 수색 성능 제어판 활성화
    const topBarBtn = page.locator('#topbar-settings-btn');
    await expect(topBarBtn).toBeVisible();
    await topBarBtn.click();

    const settingsPanel = page.locator('#desktop-side-panel-col #settings-panel');
    await expect(settingsPanel).toBeVisible();

    // 2. 분석 예산을 balanced (기본이 balanced 이거나 active)에서 '노드 제한' (~20만 노드)으로 변경
    // fast key의 버튼을 눌러 예산을 변경해 줍니다.
    const fastBudgetBtn = settingsPanel.locator('button', { hasText: '노드 제한' });
    await expect(fastBudgetBtn).toBeVisible();
    await fastBudgetBtn.click();

    // 3. 해시 셀렉터 버튼에서 '32M' 클릭
    const hashBtn32 = settingsPanel.locator('button', { hasText: '32M' });
    await expect(hashBtn32).toBeVisible();
    await hashBtn32.click();

    // 4. 스레드 셀렉터 버튼에서 '2' 클릭 (일반 멀티스레드 허용 환경 대비)
    const threadsBtn2 = settingsPanel.locator('button', { hasText: '2' }).first();
    await expect(threadsBtn2).toBeVisible();
    await threadsBtn2.click();

    // 5. 스토리지 저장 후 실시간 수색 지표 상태(Specs) 테이블에 즉각 등사 반영되는지 점검
    // 실제 배정 해시 / 중단 조건이 "32MB / 20만 노드 도달" 포맷 등으로 갱신되어야 함
    const specCard = settingsPanel.locator('div', { hasText: '배정 해시 / 중단 조건' });
    await expect(specCard.locator('span', { hasText: '32MB' })).toBeVisible();

    // localStorage에 정상 보존 및 지속성이 인계되었는지 점검
    const savedSettingsStr = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEYS.ENGINE_SETTINGS);
    expect(savedSettingsStr).not.toBeNull();
    const saved = JSON.parse(savedSettingsStr || '{}');
    expect(saved.hash).toBe(32);
    expect(saved.budget).toBe('fast');
  });

  test('should debounce engine restarts when modifying multiple settings sequentially', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // 재생 시 Stockfish 18 기동 로그 횟수를 가늠 및 계측
    let restartCount = 0;
    page.on('console', (msg) => {
      if (msg.text().includes('실제 Stockfish 18 분석 기동 시도')) {
        restartCount++;
      }
    });

    const response = await page.goto(targetPageUrl);
    expect(response!.status()).toBe(200);

    await page.waitForSelector('#position-page-shell');

    // 설정 개관 클릭
    await page.locator('#topbar-settings-btn').click();

    const settingsPanel = page.locator('#desktop-side-panel-col #settings-panel');
    await expect(settingsPanel).toBeVisible();

    // 최초 로드 기동 카운트를 배제하기 위한 영점 조율
    await page.waitForTimeout(600);
    restartCount = 0;

    // 1) 예산 변경
    await settingsPanel.locator('button', { hasText: '노드 제한' }).click();
    // 2) 해시 변경
    await settingsPanel.locator('button', { hasText: '64M' }).click();
    // 3) 스레드 변경 (500ms 디바운스 타임 프레임 이내 초고속 순차 수행)
    await settingsPanel.locator('button', { hasText: '2' }).first().click();

    // 디바운스 기한(500ms) 만료와 실제 기동이 가동 및 안착되기까지 넉넉히 대기
    await page.waitForTimeout(1200);

    // 설정은 3차례 변개되었으나, 실제 엔진의 리스타트 행위는 단 1회만 기폭되어 수렴해야 함!
    try {
      expect(restartCount).toBe(1);
    } catch (err: any) {
      // 진단 속성 추적 수율 증강을 위한 데이터 포집
      const diag = await page.evaluate(() => (window as any).__stockfish_diagnostics__ || null);
      const status = await page.evaluate(() => {
        const el = document.getElementById('engine-status-text') || document.querySelector('[data-status]');
        return el ? (el.getAttribute('data-status') || el.textContent) : 'unknown';
      });
      const buildType = await page.evaluate(() => {
        const el = document.getElementById('engine-build-type-text') || document.querySelector('[data-engine-build-type]');
        return el ? (el.getAttribute('data-engine-build-type') || el.textContent) : 'unknown';
      });
      err.message = `${err.message || ''}\n[E2E Debounce Test Timeout Diagnostics]:
- restartCount: ${restartCount}
- __stockfish_diagnostics__: ${JSON.stringify(diag, null, 2)}
- data-status: ${status}
- data-engine-build-type: ${buildType}
- engineState: ${diag?.handshakePhase || 'unknown'}`;
      throw err;
    }
  });

  test('should display single-threaded alternate fallback UI appropriately in environment without SharedArrayBuffer', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'chromium-mt') {
      test.skip();
    }

    // SharedArrayBuffer가 미지원인 기밀 가상 브라우저 차단 상태를 세팅
    await page.addInitScript(() => {
      // SharedArrayBuffer 은폐 처리
      Object.defineProperty(window, 'SharedArrayBuffer', {
        value: undefined,
        writable: true,
        configurable: true
      });
      // crossOriginIsolated 상태도 거절 시뮬레이트
      Object.defineProperty(window, 'crossOriginIsolated', {
        value: false,
        writable: true,
        configurable: true
      });
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
    const response = await page.goto(targetPageUrl);
    expect(response!.status()).toBe(200);

    await page.waitForSelector('#position-page-shell');

    // 설정 기동
    await page.locator('#topbar-settings-btn').click();

    const settingsPanel = page.locator('#desktop-side-panel-col #settings-panel');
    await expect(settingsPanel).toBeVisible();

    // 4스레드 선택해 멀티스레딩이 좌절되는 트리거 유도
    const threadsBtn4 = settingsPanel.locator('button', { hasText: '4' }).first();
    await expect(threadsBtn4).toBeVisible();
    await threadsBtn4.click();

    // 1. 멀티스레드 물리 자원 가동 불가 경고 배너가 시각적으로 표출되어 있는지 확인 (ID 및 텍스트)
    const warningLabel = settingsPanel.locator('#settings-thread-blocked-warning');
    await expect(warningLabel).toBeVisible();
    await expect(warningLabel).toContainText('멀티스레드 물리 자원 가동 불가 Warning');

    // 2. 실제 적용 스레드 사양이 정상 반전 및 매칭되어 있는지 검증 (요청: 4스레드 / 실제: 1스레드)
    await expect(warningLabel).toContainText('요청: 4스레드 / 실제: 1스레드');
  });
});
