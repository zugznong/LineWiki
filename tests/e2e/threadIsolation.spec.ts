import { test, expect } from '@playwright/test';

test.describe('시스템 보안 격리 및 멀티스레드 자원 가용성 테스트 (Thread Isolation E2E: Vite dev config header source)', () => {
  test('chromium-mt 프로젝트 및 환경에서의 가용성 보장 및 응답 헤더 검증', async ({ page, request }, testInfo) => {
    // 1. 프로젝트 분리 검증 및 스킵 규칙 적용
    if (testInfo.project.name !== 'chromium-mt') {
      test.skip(true, 'chromium-mt 프로젝트가 아니므로 이 격리도 테스트는 실행하지 않고 통과시킵니다.');
      return;
    }

    // 2. 메인 UI 페이지로 접속 및 응답 객체 확인
    const mainResponse = await page.goto('/');
    expect(mainResponse).not.toBeNull();

    // -------------------------------------------------------------------------
    // [4대 핵심 전제 요건 검격 개시]
    // -------------------------------------------------------------------------

    // 1 & 2. 브라우저 전역 변수 평가 (window.crossOriginIsolated, SharedArrayBuffer)
    const wasmCapabilities = await page.evaluate(() => {
      return {
        crossOriginIsolated: typeof window !== 'undefined' && window.crossOriginIsolated,
        sabExists: typeof SharedArrayBuffer !== 'undefined'
      };
    });

    // 3. /stockfish/stockfish-18-lite.js 헤더 검증
    let jsRes;
    let jsHeaders: any = {};
    let jsStatus = 0;
    try {
      jsRes = await request.get('/stockfish/stockfish-18-lite.js');
      jsStatus = jsRes.status();
      jsHeaders = jsRes.headers();
    } catch (err: any) {
      throw new Error(`[격리 요건 3 실패] /stockfish/stockfish-18-lite.js 네트워크 페치 오류: ${err.message}`);
    }

    const jsCoop = jsHeaders['cross-origin-opener-policy'];
    const jsCoep = jsHeaders['cross-origin-embedder-policy'];
    const jsCorp = jsHeaders['cross-origin-resource-policy'];
    const jsContentTypeOptions = jsHeaders['x-content-type-options'];

    const isJsCoopOk = jsCoop === 'same-origin';
    const isJsCoepOk = jsCoep === 'require-corp';
    const isJsCorpOk = jsCorp === 'same-origin';
    const isJsNoSniffOk = jsContentTypeOptions === 'nosniff';

    // 4. /stockfish/stockfish-18-lite.wasm 헤더 및 런타임 컴파일 검증
    let wasmRes;
    let wasmHeaders: any = {};
    let wasmStatus = 0;
    try {
      wasmRes = await request.get('/stockfish/stockfish-18-lite.wasm');
      wasmStatus = wasmRes.status();
      wasmHeaders = wasmRes.headers();
    } catch (err: any) {
      throw new Error(`[격리 요건 WASM 헤더 검증 실패] /stockfish/stockfish-18-lite.wasm 네트워크 페치 오류: ${err.message}`);
    }

    const wasmCoop = wasmHeaders['cross-origin-opener-policy'];
    const wasmCoep = wasmHeaders['cross-origin-embedder-policy'];
    const wasmCorp = wasmHeaders['cross-origin-resource-policy'];
    const wasmContentTypeOptions = wasmHeaders['x-content-type-options'];

    const isWasmCoopOk = wasmCoop === 'same-origin';
    const isWasmCoepOk = wasmCoep === 'require-corp';
    const isWasmCorpOk = wasmCorp === 'same-origin';
    const isWasmNoSniffOk = wasmContentTypeOptions === 'nosniff';

    const wasmCompileResult = await page.evaluate(async () => {
      try {
        const response = await fetch('/stockfish/stockfish-18-lite.wasm');
        if (!response.ok) {
          return { success: false, error: `HTTP ${response.status} ${response.statusText}`, contentType: '' };
        }
        const contentType = response.headers.get('content-type') || '';
        const buffer = await response.arrayBuffer();
        
        // 브라우저 런타임에서 직접 검사 컴파일 시도
        const compiled = await WebAssembly.compile(buffer);
        const isModule = compiled instanceof WebAssembly.Module;
        
        return { success: isModule, error: isModule ? '' : 'Compiled result is not WebAssembly.Module instance', contentType };
      } catch (err: any) {
        return { success: false, error: err.message || String(err), contentType: '' };
      }
    });

    const isWasmOk = wasmCompileResult.success && wasmCompileResult.contentType.includes('application/wasm');

    // 비정상적인 헤더(Vite 미들웨어 미적용 위험) 감지 메시지 구성
    const hasViteMiddlewareIssue = !isJsCoopOk || !isJsCoepOk || !isJsCorpOk || !isJsNoSniffOk || !isWasmCoopOk || !isWasmCoepOk || !isWasmCorpOk || !isWasmNoSniffOk;
    const viteMiddlewareMessage = hasViteMiddlewareIssue 
      ? "\n🚨 [Vite middleware 미적용] 필수 보안 응답 헤더가 발견되지 않았거나 값 조건이 다릅니다! `vite.config.ts`의 isolation-headers 미들웨어 바인딩 상태가 누락되었거나 우선순위(unshift)에서 배제되었을 위험이 대단히 높습니다."
      : "";

    const criteriaSummary = `
================================================================================
🚨 [4대 핵심 멀티스레드 격리 요건 불충족] ${viteMiddlewareMessage}
================================================================================
1. [window.crossOriginIsolated]: ${wasmCapabilities.crossOriginIsolated} (기댓값: true)
2. [SharedArrayBuffer 활성화]: ${wasmCapabilities.sabExists ? '활성화' : '비활성화'} (기댓값: 활성화)
3. [/stockfish/stockfish-18-lite.js 격리 헤더]:
   - HTTP status: ${jsStatus} (기댓값: 200)
   - Cross-Origin-Opener-Policy: ${jsCoop} (기댓값: same-origin)
   - Cross-Origin-Embedder-Policy: ${jsCoep} (기댓값: require-corp)
   - Cross-Origin-Resource-Policy: ${jsCorp} (기댓값: same-origin)
   - X-Content-Type-Options: ${jsContentTypeOptions} (기댓값: nosniff)
4. [/stockfish/stockfish-18-lite.wasm 격리 헤더 및 런타임 컴파일]:
   - HTTP status: ${wasmStatus} (기댓값: 200)
   - Cross-Origin-Opener-Policy: ${wasmCoop} (기댓값: same-origin)
   - Cross-Origin-Embedder-Policy: ${wasmCoep} (기댓값: require-corp)
   - Cross-Origin-Resource-Policy: ${wasmCorp} (기댓값: same-origin)
   - X-Content-Type-Options: ${wasmContentTypeOptions} (기댓값: nosniff)
   - WebAssembly.compile 성공: ${wasmCompileResult.success} (기댓값: true)
   - Content-Type: ${wasmCompileResult.contentType} (기댓값: application/wasm 포함)
   - 에러 보고: ${wasmCompileResult.error || '없음'}
================================================================================
    `;

    // 4대 절대 요건 단언 (하나라도 충족되지 못하면 후속 테스트는 전면 스킵되고 실패 종결합니다.)
    expect(wasmCapabilities.crossOriginIsolated, criteriaSummary).toBe(true);
    expect(wasmCapabilities.sabExists, criteriaSummary).toBe(true);
    expect(jsStatus, criteriaSummary).toBe(200);
    expect(wasmStatus, criteriaSummary).toBe(200);
    expect(isJsCoopOk && isJsCoepOk && isJsCorpOk && isJsNoSniffOk, criteriaSummary).toBe(true);
    expect(isWasmCoopOk && isWasmCoepOk && isWasmCorpOk && isWasmNoSniffOk, criteriaSummary).toBe(true);
    expect(isWasmOk, criteriaSummary).toBe(true);

    // 5. HTML 문서 상에서 실제 loaded 에셋 경로 분석 (Vite dev environment main or loaded chunks)
    const appAssetPath = await page.evaluate(() => {
      const script = Array.from(document.querySelectorAll('script')).find(s => s.src && s.src.includes('/src/'));
      if (script) {
        try {
          return new URL(script.src).pathname;
        } catch {
          return null;
        }
      }
      return null;
    });

    // 6. 검사 대상 리소스들의 배열 매칭 (실제 존재하는 메인 문서, Stockfish JS/WASM, 실제 worker chunk로 제한)
    const targets = [
      { name: 'Main Document', path: '/' },
      { name: 'Stockfish Worker JS', path: '/stockfish/stockfish-18-lite.js' },
      { name: 'Stockfish WASM Binary', path: '/stockfish/stockfish-18-lite.wasm' }
    ];
    if (appAssetPath) {
      targets.push({ name: 'App Main Module', path: appAssetPath });
    }

    // 7. 추가 리소스 헤더 정합성 체크
    const fetchResults = [];
    let hasHeaderFail = false;

    for (const target of targets) {
      try {
        const res = await request.get(target.path);
        const headers = res.headers();
        const coop = headers['cross-origin-opener-policy'];
        const coep = headers['cross-origin-embedder-policy'];
        const corp = headers['cross-origin-resource-policy'];

        const isCoopOk = coop === 'same-origin';
        const isCoepOk = coep === 'require-corp';
        const isCorpOk = corp === 'same-origin';

        if (!res.ok() || !isCoopOk || !isCoepOk || !isCorpOk) {
          hasHeaderFail = true;
        }

        fetchResults.push({
          name: target.name,
          path: target.path,
          status: res.status(),
          ok: res.ok(),
          coop,
          coep,
          corp,
          headers
        });
      } catch (err: any) {
        hasHeaderFail = true;
        fetchResults.push({
          name: target.name,
          path: target.path,
          status: 0,
          ok: false,
          coop: 'fetch-error',
          coep: 'fetch-error',
          corp: 'fetch-error',
          headers: { error: err.message }
        });
      }
    }

    if (hasHeaderFail) {
      const debugHeaderSummary = fetchResults.map(r => {
        return `[${r.name}] (${r.path})
  - HTTP Status: ${r.status} (OK: ${r.ok})
  - Cross-Origin-Opener-Policy: ${r.coop} (대응 기댓값: same-origin)
  - Cross-Origin-Embedder-Policy: ${r.coep} (대응 기댓값: require-corp)
  - Cross-Origin-Resource-Policy: ${r.corp} (대응 기댓값: same-origin)
  - Raw Headers: ${JSON.stringify(r.headers, null, 2)}`;
      }).join('\n\n');

      const appResourceErrorMessage = `
================================================================================
🚨 [앱 공통 에셋 격리 헤더 오류] 메인 셸 또는 SvelteKit App 에셋 헤더가 규격 미달입니다!
================================================================================
${debugHeaderSummary}
================================================================================
      `;
      expect(hasHeaderFail, appResourceErrorMessage).toBe(false);
    }

    // 성공한 경우 간결하게 테스트 콘솔을 정돈함
    console.info(`[Thread Isolation E2E PASS]
  - crossOriginIsolated = ${wasmCapabilities.crossOriginIsolated}
  - SharedArrayBuffer = ${wasmCapabilities.sabExists}
  - Assessed Assets: ${targets.map(t => t.name).join(', ')}
    `);

    expect(wasmCapabilities.crossOriginIsolated, "window.crossOriginIsolated는 반드시 true여야 합니다.").toBe(true);
    expect(wasmCapabilities.sabExists, "SharedArrayBuffer 정의 상태는 반드시 true여야 합니다.").toBe(true);
  });
});
