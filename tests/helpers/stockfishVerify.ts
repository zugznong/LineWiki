import type { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// SOURCES.json을 동적으로 읽어 하드코딩 경로를 완벽 제거합니다.
const sourcesPath = path.resolve(process.cwd(), 'static/stockfish/SOURCES.json');
const sourcesData = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));

const multiJs = sourcesData.files.find((f: any) => f.buildType.includes('Multi-Threaded JS')).filePath;
const multiWasm = sourcesData.files.find((f: any) => f.buildType.includes('Multi-Threaded WASM')).filePath;
const singleJs = sourcesData.files.find((f: any) => f.buildType.includes('Single-Threaded JS')).filePath;
const singleWasm = sourcesData.files.find((f: any) => f.buildType.includes('Single-Threaded WASM')).filePath;

export interface StockfishSmokeResult {
  ok: boolean;
  selectedBuild: 'multi' | 'single' | 'none';
  attemptedBuilds: ('multi' | 'single')[];
  failureReason?: string;
  failureType?: 'fetch' | 'hash' | 'compile' | 'worker-create' | 'uciok-timeout' | 'runtime-error' | 'unspecified';
  diagnostics?: {
    message?: string;
    filename?: string;
    lineno?: number;
    colno?: number;
    crossOriginIsolated?: boolean;
    sharedArrayBufferSupported?: boolean;
    jsHeaders?: Record<string, string>;
    wasmHeaders?: Record<string, string>;
    jsContentType?: string | null;
    wasmContentType?: string | null;
  };
}

/**
 * 전구적 정상 분석 시나리오와 대체 시나리오 전체에서 동일한 해시, WASM 컴파일성,
 * 그리고 실제 주엔진의 Web Worker 기동 후 uci -> uciok 수신 여부(UCI Smoke)를 동일 기준으로 판정하는 공용 E2E 검증 헬퍼입니다.
 * 만약 멀티스레드(MT) 환경을 지원하더라도 MT 검증에 실패 시 싱글스레드(ST) 검증을 연속 재시도하여 보정합니다.
 */
export async function verifyStockfishSmoke(page: Page): Promise<StockfishSmokeResult> {
  return await page.evaluate(async (args): Promise<StockfishSmokeResult> => {
    try {
      const isSharedArrayBufferSupported = typeof SharedArrayBuffer !== 'undefined' && typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
      
      const attemptedBuilds: ('multi' | 'single')[] = [];
      const buildsToTry: { type: 'multi' | 'single'; js: string; wasm: string }[] = [];
      
      if (isSharedArrayBufferSupported) {
        buildsToTry.push({ type: 'multi', js: args.multiJs, wasm: args.multiWasm });
      }
      buildsToTry.push({ type: 'single', js: args.singleJs, wasm: args.singleWasm });

      let lastErrorReason = '';
      let lastErrorType: StockfishSmokeResult['failureType'] = 'unspecified';
      let lastDiagnostics: StockfishSmokeResult['diagnostics'] = {};

      for (const build of buildsToTry) {
        attemptedBuilds.push(build.type);

        const tryOnce = async (): Promise<{ ok: boolean; reason?: string; failureType?: StockfishSmokeResult['failureType']; diag?: StockfishSmokeResult['diagnostics'] }> => {
          let jsHeaders: Record<string, string> = {};
          let wasmHeaders: Record<string, string> = {};
          let jsContentType: string | null = null;
          let wasmContentType: string | null = null;

          try {
            const jsRes = await fetch(build.js, { method: 'HEAD' });
            jsContentType = jsRes.headers.get('content-type');
            jsRes.headers.forEach((val, key) => { jsHeaders[key] = val; });
          } catch (e) {}

          try {
            const wasmRes = await fetch(build.wasm, { method: 'HEAD' });
            wasmContentType = wasmRes.headers.get('content-type');
            wasmRes.headers.forEach((val, key) => { wasmHeaders[key] = val; });
          } catch (e) {}

          const currentDiag: StockfishSmokeResult['diagnostics'] = {
            crossOriginIsolated: typeof crossOriginIsolated !== 'undefined' ? crossOriginIsolated : false,
            sharedArrayBufferSupported: isSharedArrayBufferSupported,
            jsHeaders,
            wasmHeaders,
            jsContentType,
            wasmContentType
          };

          // 1. Fetch WASM file
          let arrayBuffer: ArrayBuffer;
          try {
            const res = await fetch(build.wasm);
            if (!res.ok) {
              const msg = `WASM fetch failed (${res.status}) for ${build.wasm}`;
              console.warn(`[verifyStockfishSmoke] [${build.type}] ${msg}`);
              return { ok: false, reason: msg, failureType: 'fetch', diag: currentDiag };
            }
            arrayBuffer = await res.arrayBuffer();
          } catch (e: any) {
            const msg = `WASM fetch connection error for ${build.wasm}: ${e.message || e}`;
            console.warn(`[verifyStockfishSmoke] [${build.type}] ${msg}`);
            return { ok: false, reason: msg, failureType: 'fetch', diag: currentDiag };
          }

          // 2. Validate ByteLength
          const byteLength = arrayBuffer.byteLength;
          if (byteLength < 500000) {
            const msg = `WASM size underflow: ${byteLength} bytes for ${build.wasm}`;
            console.warn(`[verifyStockfishSmoke] [${build.type}] ${msg}`);
            return { ok: false, reason: msg, failureType: 'hash', diag: currentDiag };
          }

          // 3. Compile WASM
          try {
            await WebAssembly.compile(arrayBuffer);
          } catch (compileErr: any) {
            const msg = `WASM compile failed for ${build.wasm}: ${compileErr?.message || compileErr}`;
            console.warn(`[verifyStockfishSmoke] [${build.type}] ${msg}`);
            return { ok: false, reason: msg, failureType: 'compile', diag: currentDiag };
          }

          // 4. SHA-256 Hash Verification
          const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const sha256Hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          
          let expectedSha256 = '';
          try {
            const sourcesRes = await fetch('/stockfish/SOURCES.json');
            if (!sourcesRes.ok) {
              const msg = `SOURCES.json fetch failed (${sourcesRes.status})`;
              console.warn(`[verifyStockfishSmoke] [${build.type}] ${msg}`);
              return { ok: false, reason: msg, failureType: 'hash', diag: currentDiag };
            }
            const sourcesData = await sourcesRes.json();
            const wasmFileObj = sourcesData.files.find((f: any) => f.filePath === build.wasm);
            if (!wasmFileObj || !wasmFileObj.sha256) {
              const msg = `Missing SHA-256 entry in SOURCES.json for ${build.wasm}`;
              console.warn(`[verifyStockfishSmoke] [${build.type}] ${msg}`);
              return { ok: false, reason: msg, failureType: 'hash', diag: currentDiag };
            }
            expectedSha256 = wasmFileObj.sha256;
          } catch (err: any) {
            const msg = `Failed to load expected hash: ${err?.message || err}`;
            console.warn(`[verifyStockfishSmoke] [${build.type}] ${msg}`);
            return { ok: false, reason: msg, failureType: 'hash', diag: currentDiag };
          }

          if (sha256Hex !== expectedSha256) {
            const msg = `WASM hash mismatch for ${build.wasm}. Got: ${sha256Hex}, Expected: ${expectedSha256}`;
            console.warn(`[verifyStockfishSmoke] [${build.type}] ${msg}`);
            return { ok: false, reason: msg, failureType: 'hash', diag: currentDiag };
          }

          // 5. Instantiation and Handshake via Worker with strict absolute termination
          let tempWorker: Worker | null = null;
          try {
            tempWorker = new Worker(build.js);
          } catch (workerErr: any) {
            const msg = `Worker creation failed for ${build.js}: ${workerErr?.message || workerErr}`;
            console.warn(`[verifyStockfishSmoke] [${build.type}] ${msg}`);
            return { ok: false, reason: msg, failureType: 'worker-create', diag: currentDiag };
          }

          const handshakePromise = new Promise<{ ok: boolean; reason?: string; failureType?: StockfishSmokeResult['failureType']; diag?: StockfishSmokeResult['diagnostics'] }>((resolve) => {
            if (!tempWorker) {
              resolve({ ok: false, reason: 'tempWorker is null', failureType: 'worker-create', diag: currentDiag });
              return;
            }

            let resolved = false;
            let timeoutId: any = null;

            const cleanupAndResolve = (result: { ok: boolean; reason?: string; failureType?: StockfishSmokeResult['failureType']; diag?: StockfishSmokeResult['diagnostics'] }) => {
              if (resolved) return;
              resolved = true;
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
              if (tempWorker) {
                tempWorker.onmessage = null;
                tempWorker.onerror = null;
                try {
                  tempWorker.terminate();
                } catch {}
                tempWorker = null;
              }
              resolve(result);
            };

            tempWorker.onmessage = (ev) => {
              const msg = ev.data;
              if (typeof msg === 'string' && msg.includes('uciok')) {
                cleanupAndResolve({ ok: true, diag: currentDiag });
              }
            };

            tempWorker.onerror = (err: ErrorEvent | any) => {
              const errMsg = err?.message || 'Worker runtime error';
              const detailedDiag = {
                ...currentDiag,
                message: errMsg,
                filename: err?.filename,
                lineno: err?.lineno,
                colno: err?.colno
              };
              cleanupAndResolve({ ok: false, reason: errMsg, failureType: 'runtime-error', diag: detailedDiag });
            };

            try {
              tempWorker.postMessage('uci');
            } catch (postErr: any) {
              cleanupAndResolve({
                ok: false,
                reason: `postMessage uci failed: ${postErr?.message || postErr}`,
                failureType: 'runtime-error',
                diag: currentDiag
              });
              return;
            }

            // 5초 타임아웃
            timeoutId = setTimeout(() => {
              cleanupAndResolve({ ok: false, reason: 'uciok timeout (5000ms reached)', failureType: 'uciok-timeout', diag: currentDiag });
            }, 5000);
          });

          return await handshakePromise;
        };

        const res = await tryOnce();
        if (res.ok) {
          console.info(`[verifyStockfishSmoke] [${build.type}] 검증에 정상 성공하였습니다.`);
          return {
            ok: true,
            selectedBuild: build.type,
            attemptedBuilds,
            failureReason: undefined,
            failureType: undefined,
            diagnostics: res.diag
          };
        } else {
          lastErrorReason = res.reason || 'unspecified error';
          lastErrorType = res.failureType || 'unspecified';
          lastDiagnostics = res.diag;
        }
      }

      return {
        ok: false,
        selectedBuild: 'none',
        attemptedBuilds,
        failureReason: lastErrorReason,
        failureType: lastErrorType,
        diagnostics: lastDiagnostics
      };
    } catch (globalErr: any) {
      return {
        ok: false,
        selectedBuild: 'none',
        attemptedBuilds: [],
        failureReason: `Global exceptions in verifyStockfishSmoke: ${globalErr?.message || globalErr}`
      };
    }
  }, {
    multiJs,
    multiWasm,
    singleJs,
    singleWasm
  });
}
