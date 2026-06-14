import { 
  STOCKFISH_MULTI_JS_PATH, 
  STOCKFISH_SINGLE_JS_PATH,
  STOCKFISH_MULTI_WASM_PATH,
  STOCKFISH_SINGLE_WASM_PATH
} from '../../../config/runtimeConfig';
import { engineSettingsStore } from '../../../stores/engineSettingsStore.svelte';
import { localAnalysisStore } from '../../../stores/localAnalysisStore.svelte';

export interface WorkerLike {
  onmessage: ((this: any, ev: MessageEvent) => any) | null;
  onerror: ((this: any, ev: ErrorEvent) => any) | null;
  onmessageerror: ((this: any, ev: MessageEvent) => any) | null;
  postMessage(message: any, transfer?: any[] | Transferable): void;
  terminate(): void;
  addEventListener(type: string, listener: any, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: any, options?: boolean | EventListenerOptions): void;
  dispatchEvent(event: Event): boolean;
}

export class PreflightBufferedWorker implements WorkerLike {
  public workerLifecycleId: string = Math.random().toString(36).substring(2, 11) + '-' + Date.now();
  public fallbackAttemptCount: number = 0;
  private queue: { message: any; transfer?: any[] }[] = [];
  private replayableInitMessages: { message: any; transfer?: any[] }[] = [];
  private isPreflightOk = false;
  private isDestroyed = false;
  private realWorker: Worker | null = null;
  private _onmessage: ((this: any, ev: MessageEvent) => any) | null = null;
  private _onerror: ((this: any, ev: ErrorEvent) => any) | null = null;
  private _onmessageerror: ((this: any, ev: MessageEvent) => any) | null = null;
  private listeners: { type: string; listener: any; options?: any }[] = [];

  // 빌드 타입 실시간 노출
  public buildType: 'multi' | 'single' = 'multi';
  private hasFallbackToSingle = false;

  public get buildTypeState(): 'multi' | 'single' | 'multi-failed-single-fallback' {
    if (this.hasFallbackToSingle) {
      return 'multi-failed-single-fallback';
    }
    return this.buildType;
  }

  constructor(
    private canUseMultiThread: boolean,
    private runPreflightFn: (wasmPath: string, jsPath: string, key: string) => Promise<void>,
    private diagnoseFn: (err: ErrorEvent, buildType: 'multi-threaded' | 'single-threaded', jsPath: string, wasmPath: string) => void,
    private onSingleThreadFallback: (reason: 'multi-preflight-failed' | 'multi-runtime-failed') => void,
    private onGeneralError: (err: ErrorEvent) => void,
    private onPreflightSuccess?: () => void
  ) {
    this.initiateLifecycle();
  }

  private async initiateLifecycle() {
    if (this.canUseMultiThread && !this.hasFallbackToSingle) {
      this.buildType = 'multi';
      try {
        console.info('[PreflightBufferedWorker] 멀티스레드 무결성 및 컴파일 검증(Preflight)을 시작합니다. 상태: buildType = multi');
        await this.runPreflightFn(
          STOCKFISH_MULTI_WASM_PATH,
          STOCKFISH_MULTI_JS_PATH,
          '/stockfish/stockfish-18-lite.wasm'
        );
        if (this.isDestroyed) return;
        console.info('[PreflightBufferedWorker] 멀티스레드 Preflight 성공. 멀티스레드 워커를 가동합니다.');
        this.launchWorker(STOCKFISH_MULTI_JS_PATH, 'multi-threaded', STOCKFISH_MULTI_WASM_PATH);
      } catch (err: any) {
        if (this.isDestroyed) return;
        console.warn('[PreflightBufferedWorker] 멀티스레드 Preflight 실패. 싱글스레드 복구를 시도합니다.', err);
        this.handleFallbackToSingle('multi-preflight-failed', err);
      }
    } else {
      this.buildType = 'single';
      console.info('[PreflightBufferedWorker] 멀티스레드 가용 자원 기준 불충족. 싱글스레드(single)로 우회합니다.');
      this.launchSingleLifecycle();
    }
  }

  private async launchSingleLifecycle() {
    this.buildType = 'single';
    try {
      console.info('[PreflightBufferedWorker] 싱글스레드 무결성 및 컴파일 검증(Preflight)을 시작합니다.');
      await this.runPreflightFn(
        STOCKFISH_SINGLE_WASM_PATH,
        STOCKFISH_SINGLE_JS_PATH,
        '/stockfish/stockfish-18-lite-single.wasm'
      );
      if (this.isDestroyed) return;
      this.launchWorker(STOCKFISH_SINGLE_JS_PATH, 'single-threaded', STOCKFISH_SINGLE_WASM_PATH);
    } catch (err: any) {
      if (this.isDestroyed) return;
      console.error('[PreflightBufferedWorker] 싱글스레드 Preflight 최종 실패.', err);
      this.triggerFinalFailure(err);
    }
  }

  private launchWorker(jsPath: string, label: 'multi-threaded' | 'single-threaded', wasmPath: string) {
    try {
      if (this.realWorker) {
        try { this.realWorker.terminate(); } catch {}
        this.realWorker = null;
      }

      this.realWorker = new Worker(jsPath);
      this.isPreflightOk = true;

      if (this.onPreflightSuccess) {
        try { this.onPreflightSuccess(); } catch (e) {
          console.warn('[PreflightBufferedWorker] onPreflightSuccess 콜백 내부 오류 무시:', e);
        }
      }

      this.realWorker.onmessage = (ev) => {
        if (this._onmessage) this._onmessage.call(this, ev);
      };

      this.realWorker.onerror = (errEvent) => {
        if (this.isDestroyed) return;
        
        // 브라우저 기본 전단 버블링 차단 및 전역 예외 처리 왜곡 현상 무인화
        if (errEvent && typeof errEvent.preventDefault === 'function') {
          errEvent.preventDefault();
        }

        this.diagnoseFn(errEvent, label, jsPath, wasmPath);

        if (label === 'multi-threaded' && !this.hasFallbackToSingle) {
          console.warn('[PreflightBufferedWorker] 멀티스레드 런타임 오류 감지. 싱글스레드 복구를 단행합니다.');
          this.handleFallbackToSingle('multi-runtime-failed', errEvent);
        } else {
          console.error('[PreflightBufferedWorker] 싱글스레드 런타임 오류 감지. 최종 실패를 전송합니다.');
          this.triggerFinalFailure(errEvent);
        }
      };

      this.realWorker.onmessageerror = (ev) => {
        if (this._onmessageerror) this._onmessageerror.call(this, ev);
      };

      for (const l of this.listeners) {
        this.realWorker.addEventListener(l.type, l.listener, l.options);
      }

      if (this.hasFallbackToSingle) {
        console.info('[PreflightBufferedWorker] 싱글스레드 복구 워커 구동에 따라 보관된 초기화 메시지들을 리플레이합니다:', this.replayableInitMessages.map(m => m.message));
        for (const item of this.replayableInitMessages) {
          this.realWorker.postMessage(item.message, item.transfer || []);
        }
      }

      while (this.queue.length > 0) {
        const item = this.queue.shift();
        if (item) {
          this.realWorker.postMessage(item.message, item.transfer || []);
        }
      }
    } catch (creationErr: any) {
      if (this.isDestroyed) return;
      const errMsg = `Worker 생성 오류 [${label}]: ${creationErr.message || creationErr}`;
      const errEvent = typeof ErrorEvent !== 'undefined'
        ? new ErrorEvent('error', { message: errMsg })
        : ({ type: 'error', message: errMsg } as any);

      this.diagnoseFn(errEvent, label, jsPath, wasmPath);

      if (label === 'multi-threaded' && !this.hasFallbackToSingle) {
        console.warn('[PreflightBufferedWorker] 멀티스레드 워커 인스턴스화 차단. 싱글스레드 복구 가동합니다.');
        this.handleFallbackToSingle('multi-runtime-failed', errEvent);
      } else {
        this.triggerFinalFailure(errEvent);
      }
    }
  }

  private handleFallbackToSingle(reason: 'multi-preflight-failed' | 'multi-runtime-failed', triggeringErr: any) {
    this.hasFallbackToSingle = true;
    this.buildType = 'single';
    this.isPreflightOk = false;
    this.fallbackAttemptCount = 1;
    this.workerLifecycleId = Math.random().toString(36).substring(2, 11) + '-' + Date.now() + '-fallback-st';
    
    console.info(`[PreflightBufferedWorker] [Fallback 단행] 실제 작동 모드를 싱글스레드(single)로 격하하고 복구 로직을 가동합니다. 사유: ${reason}`);
    
    try {
      engineSettingsStore.notifyFallbackToSingleThread();
    } catch (e) {
      console.warn('[PreflightBufferedWorker] Fallback 스토어 상태 통보 예외 무시:', e);
    }

    // fallback 직전 기존 realWorker의 완벽한 교체(terminate & null화)를 행렬 순서에 맞춰 선제 진행하여
    // 후속 복구 이벤트 콜백 내부에서 유기적으로 uci 재전송을 보장받을 수 있게 조형합니다.
    if (this.realWorker) {
      try { this.realWorker.terminate(); } catch {}
      this.realWorker = null;
    }

    // replayableInitMessages 와 queue를 깨끗하게 청소해 새 handshake 시 꼬이지 않게 합니다.
    this.replayableInitMessages = [];
    this.queue = [];

    try {
      this.onSingleThreadFallback(reason);
    } catch (e) {
      console.warn('[PreflightBufferedWorker] onSingleThreadFallback 콜백 내부 오류 무시:', e);
    }

    this.launchSingleLifecycle();
  }

  private hasReportedFailure = false;

  private triggerFinalFailure(errEvent: any) {
    if (this.hasReportedFailure) return;
    this.hasReportedFailure = true;

    this.terminate();
    
    let detailType = 'instantiation failed';
    const msg = errEvent.message || '';
    if (msg.includes('compile') || msg.includes('WASM') || errEvent.errorType === 'COMPILE_FAILURE') {
      detailType = 'compile failed';
    } else if (errEvent.errorType === 'HASH_MISMATCH') {
      detailType = 'hash mismatch';
    } else if (errEvent.errorType === 'UCI_TIMEOUT') {
      detailType = 'uciok timeout';
    }

    if (errEvent) {
      errEvent.failureStep = 'single-runtime-failed';
    }
    
    try {
      localAnalysisStore.setEngineError(detailType);
    } catch (e) {}

    // Adapter에 최종 통보
    // onGeneralError와 _onerror가 중복 호출되지 않도록 단일 오류 채널로 정제합니다.
    if (this._onerror) {
      this._onerror.call(this, errEvent);
    } else if (this.onGeneralError) {
      this.onGeneralError(errEvent);
    }
  }

  set onmessage(cb: ((this: any, ev: MessageEvent) => any) | null) {
    this._onmessage = cb;
    if (this.realWorker) {
      this.realWorker.onmessage = cb;
    }
  }

  get onmessage() {
    return this._onmessage;
  }

  set onerror(cb: ((this: any, ev: ErrorEvent) => any) | null) {
    this._onerror = cb;
  }

  get onerror() {
    return this._onerror;
  }

  set onmessageerror(cb: ((this: any, ev: MessageEvent) => any) | null) {
    this._onmessageerror = cb;
    if (this.realWorker) {
      this.realWorker.onmessageerror = cb;
    }
  }

  get onmessageerror() {
    return this._onmessageerror;
  }

  postMessage(message: any, transfer?: any[] | Transferable): void {
    if (this.isDestroyed) return;

    if (typeof message === 'string') {
      const trimmed = message.trim();
      const isUci = trimmed === 'uci';
      const isSetoption = trimmed.startsWith('setoption');
      const isIsready = trimmed === 'isready';

      if (isUci || isSetoption || isIsready) {
        const alreadyHas = this.replayableInitMessages.some(
          item => typeof item.message === 'string' && item.message.trim() === trimmed
        );
        if (!alreadyHas) {
          this.replayableInitMessages.push({ message, transfer: transfer as any[] });
        }
      }
    }

    if (this.isPreflightOk && this.realWorker) {
      if (transfer) {
        this.realWorker.postMessage(message, transfer as any);
      } else {
        this.realWorker.postMessage(message);
      }
    } else {
      this.queue.push({ message, transfer: transfer as any[] });
    }
  }

  terminate(): void {
    this.isDestroyed = true;
    this.queue = [];
    this.replayableInitMessages = [];
    if (this.realWorker) {
      try {
        this.realWorker.terminate();
      } catch (e) {}
    }
  }

  addEventListener(type: string, listener: any, options?: boolean | AddEventListenerOptions): void {
    if (this.realWorker) {
      this.realWorker.addEventListener(type, listener, options);
    } else {
      this.listeners.push({ type, listener, options });
    }
  }

  removeEventListener(type: string, listener: any, options?: boolean | EventListenerOptions): void {
    if (this.realWorker) {
      this.realWorker.removeEventListener(type, listener, options);
    } else {
      this.listeners = this.listeners.filter(l => !(l.type === type && l.listener === listener));
    }
  }

  dispatchEvent(event: Event): boolean {
    if (this.realWorker) {
      return this.realWorker.dispatchEvent(event);
    }
    return false;
  }
}

export class StockfishWorkerFactory {
  private static preflightCache = new Map<string, { jsPath: string; wasmPath: string; sha256: string }>();
  private static sourcesCache: any = null;

  private static async fetchSources(): Promise<any> {
    if (this.sourcesCache) {
      return this.sourcesCache;
    }
    const sourcesRes = await fetch('/stockfish/SOURCES.json');
    if (!sourcesRes.ok) {
      throw new Error(`SOURCES.json fetch failed with status ${sourcesRes.status}`);
    }
    this.sourcesCache = await sourcesRes.json();
    return this.sourcesCache;
  }

  /**
   * 에러 이벤트 상세 속성과 빌드 유형을 분석하여 구체적인 원인 진단 보고서를 출력합니다.
   */
  private static diagnoseWorkerError(
    err: ErrorEvent, 
    buildType: 'multi-threaded' | 'single-threaded', 
    jsPath: string, 
    wasmPath: string
  ): void {
    const msg = err.message || '';
    const filename = err.filename || '';
    
    let reason = '알 수 없는 웹 워커 실행 오류';
    
    if (msg.includes('not found') || msg.includes('404') || filename.includes('404')) {
      reason = `[파일 없음 (404)] Stockfish JS 스크립트 파일을 지정된 경로(${jsPath})에서 찾을 수 없거나 로드에 실패했습니다.`;
    } else if (msg.includes('hash') || msg.includes('Hash') || msg.includes('integrity') || msg.includes('HASH_MISMATCH')) {
      reason = `[손상 또는 hash mismatch] 로컬 WASM 엔진 파일이 무결성 검증을 통과하지 못했습니다 (Hash mismatch detected).`;
    } else if (msg.includes('mime') || msg.includes('MIME')) {
      reason = `[MIME 형식 불일치] 브라우저가 스크립트 또는 웹 어셈블리 파일을 응답받는 중 올바른 MIME 타입을 획득하지 못했습니다. (서버 MIME 헤더 재설정 필요)`;
    } else if (
      msg.includes('WebAssembly') || 
      msg.includes('compile') || 
      msg.includes('wasm') || 
      msg.includes('instantiate') || 
      msg.includes('Type') || 
      msg.includes('past end')
    ) {
      reason = `[WASM compile 실패] 브라우저 웹 어셈블리 컴파일러가 바이너리(${wasmPath})를 컴파일하는 중 실패 발생 (파일 손상 혹은 브라우저 제약)`;
    } else if (msg.includes('SharedArrayBuffer') || msg.includes('cross-origin') || msg.includes('COOP') || msg.includes('COEP') || msg.includes('isolated')) {
      reason = `[보안 컨텍스트 오류] 멀티스레드 동작에 필수적인 COOP/COEP 헤더 설정이나 교차 출처 분리(CrossOriginIsolated) 보안 요건이 브라우저에서 미흡합니다.`;
    } else {
      reason = `[상세 런타임 오류] ${msg} (위치: ${filename}:${err.lineno}:${err.colno})`;
    }

    console.error(`[StockfishWorkerFactory - ${buildType}] 작동 실패 정밀 진단 보고서:`, {
      reason,
      buildType,
      jsPath,
      wasmPath,
      errorMessage: msg,
      errorFilename: filename,
      errorLine: err.lineno,
      errorDetails: err.error
    });

    // 에러 객체에 진단 결과 수납
    (err as any).diagnostics = {
      reason,
      buildType,
      jsPath,
      wasmPath
    };

    try {
      if (msg.includes('WebAssembly') || msg.includes('compile') || msg.includes('instantiate') || msg.includes('Type') || msg.includes('past end') || msg.includes('wasm')) {
        localAnalysisStore.setEngineError('compile failed');
      } else if (msg.includes('SharedArrayBuffer') || msg.includes('cross-origin')) {
        localAnalysisStore.setEngineError('security isolation failed');
      } else if (msg.includes('not found') || msg.includes('404') || filename.includes('404')) {
        localAnalysisStore.setEngineError('assets missing');
      } else {
        localAnalysisStore.setEngineError('runtime crash');
      }
    } catch (e) {}
  }

  /**
   * multi/single 빌드 선택 후 해당 JS/WASM 쌍을 각각 무결하게 preflight 검격합니다.
   * SOURCES.json 조회 실패 또는 해시가 다를 때 fallback 우회 없이 명시 검증 에러로 실패 처리합니다.
   */
  private static async runPreflight(
    wasmPath: string,
    jsPath: string,
    expectedWasmPathInSources: string
  ): Promise<void> {
    const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    const isWebRuntime = typeof window !== 'undefined' && typeof location !== 'undefined' && location.protocol.startsWith('http');
    const skipPreflight = isTestEnv || !isWebRuntime;

    if (skipPreflight) return;

    // 수십 밀리초 이내 완료되는 SOURCES.json 데이터를 선제 페치하여, 캐시 히트 조건(WASM 해시 일치 여부)을 평가합니다.
    let expectedSha256 = '';
    try {
      const sourcesData = await this.fetchSources();
      const fileEntry = sourcesData.files.find((f: any) => f.filePath === expectedWasmPathInSources);
      if (fileEntry && fileEntry.sha256) {
        expectedSha256 = fileEntry.sha256;
        const cacheKey = `${jsPath}|${wasmPath}`;
        const cached = this.preflightCache.get(cacheKey);
        if (cached && cached.sha256 === expectedSha256) {
          console.info(`[StockfishWorkerFactory Preflight] Cache Hit (Memory Key Pairing) for ${cacheKey}. Expected hash matches: ${expectedSha256}`);
          return;
        }
      }
    } catch (e) {
      console.warn('[StockfishWorkerFactory Preflight] 선제 캐싱 평가 실패 (WASM fetch 본 코스로 우회):', e);
    }

    console.info(`[StockfishWorkerFactory Preflight] Initiating preflight for wasm: ${wasmPath} and js: ${jsPath}`);
    
    // 1. Fetch WASM file
    const response = await fetch(wasmPath);
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      const err: any = new Error(`HTTP ${response.status} ${response.statusText} fetching WASM from ${wasmPath}`);
      err.wasmPath = wasmPath;
      err.contentType = contentType;
      err.errorType = 'FETCH_FAILURE';
      throw err;
    }

    const arrayBuffer = await response.arrayBuffer();
    const byteLength = arrayBuffer.byteLength;

    if (byteLength < 250000) {
      const err: any = new Error(`WASM resource is too short: ${byteLength} bytes at ${wasmPath}. Expected >= 250KB.`);
      err.wasmPath = wasmPath;
      err.byteLength = byteLength;
      err.contentType = contentType;
      err.errorType = 'SIZE_MISMATCH';
      throw err;
    }

    // 2. Validate Magic Bytes
    const first4Bytes = new Uint8Array(arrayBuffer.slice(0, 4));
    const isMagicValid = first4Bytes[0] === 0x00 && first4Bytes[1] === 0x61 && first4Bytes[2] === 0x73 && first4Bytes[3] === 0x6d;
    if (!isMagicValid) {
      let previewText = '';
      try {
        previewText = new TextDecoder('utf-8').decode(new Uint8Array(arrayBuffer.slice(0, 100)));
      } catch (e) {
        previewText = 'decode error';
      }
      const err: any = new Error(`Validation failed. WASM magic bytes invalid at ${wasmPath}! Resolved content-type: ${contentType}. Preview of first 100 bytes: ${previewText}`);
      err.wasmPath = wasmPath;
      err.byteLength = byteLength;
      err.contentType = contentType;
      err.firstBytes = Array.from(first4Bytes);
      err.errorType = 'MAGIC_MISMATCH';
      throw err;
    }

    // 3. Compile WebAssembly
    try {
      await WebAssembly.compile(arrayBuffer);
      console.info(`[StockfishWorkerFactory Preflight] WebAssembly.compile test passed successfully for ${wasmPath}.`);
    } catch (compileErr: any) {
      const err: any = new Error(`WebAssembly compile failed for ${wasmPath}: ${compileErr.message || compileErr}`);
      err.wasmPath = wasmPath;
      err.byteLength = byteLength;
      err.contentType = contentType;
      err.firstBytes = Array.from(first4Bytes);
      err.compileError = compileErr.message || String(compileErr);
      err.errorType = 'COMPILE_FAILURE';
      throw err;
    }

    // 4. SHA-256 hash integrity check pairing with SOURCES.json
    try {
      const sourcesData = await this.fetchSources();
      const fileEntry = sourcesData.files.find((f: any) => f.filePath === expectedWasmPathInSources);
      if (!fileEntry || !fileEntry.sha256) {
        throw new Error(`SOURCES.json is missing hash definition entry for ${expectedWasmPathInSources}`);
      }
      expectedSha256 = fileEntry.sha256;
    } catch (e: any) {
      // SOURCES.json 조회 실패 또는 해시 부적합 시 하드코딩 대체 없이 강력 우회불가 실패 처리 추진
      const err: any = new Error(`SOURCES.json 검증 정보 조회 실패로 무결성을 측정할 수 없습니다: ${e.message}`);
      err.wasmPath = wasmPath;
      err.byteLength = byteLength;
      err.contentType = contentType;
      err.errorType = 'HASH_MISMATCH';
      throw err;
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const actualSha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (actualSha256 !== expectedSha256) {
      const hashErr: any = new Error(`런타임 엔진 해시 무결성 검증 실패 (Hash mismatch detected) for ${wasmPath}: expected [${expectedSha256}], got [${actualSha256}]. 파일이 손상되었거나 인코딩이 파괴되었습니다.`);
      hashErr.wasmPath = wasmPath;
      hashErr.byteLength = byteLength;
      hashErr.contentType = contentType;
      hashErr.firstBytes = Array.from(first4Bytes);
      hashErr.errorType = 'HASH_MISMATCH';
      throw hashErr;
    }
    console.info(`[StockfishWorkerFactory Preflight] SHA-256 해시 무결성 검증 통과 for ${wasmPath}: ${actualSha256}`);
    const cacheKey = `${jsPath}|${wasmPath}`;
    this.preflightCache.set(cacheKey, { jsPath, wasmPath, sha256: actualSha256 });
  }

  /**
   * 브라우저 격리 보안 사양과 SharedArrayBuffer 가용성을 분석하여 멀티스레드 또는 싱글스레드 워커를 생성합니다.
   * 모든 로딩, 해시 체크, 컴파일, 런타임 자가 진단 및 복구 전향(multi -> single)은
   * PreflightBufferedWorker 내부의 은닉 생명 주기에서 캡슐화되어 동작하므로 우클릭 간결화됩니다.
   */
  public static createWorker(
    onSingleThreadFallback: (reason: 'multi-preflight-failed' | 'multi-runtime-failed') => void,
    onGeneralError: (err: ErrorEvent) => void,
    onPreflightSuccess?: () => void
  ): WorkerLike {
    if (typeof window === 'undefined') {
      throw new Error('Web Workers are only available inside run-time browser processes.');
    }

    if ((window as any).__MOCK_STOCKFISH_FORCE_ERROR__) {
      return new BrowserFailingStockfishWorker();
    }

    if ((window as any).__MOCK_STOCKFISH_WORKER__) {
      return new BrowserFakeStockfishWorker(onPreflightSuccess);
    }

    const supportsSharedArray = typeof SharedArrayBuffer !== 'undefined';
    const isIsolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
    const canUseMultiThread = supportsSharedArray && isIsolated;

    const wrapped = new PreflightBufferedWorker(
      canUseMultiThread,
      this.runPreflight.bind(this),
      this.diagnoseWorkerError.bind(this),
      onSingleThreadFallback,
      onGeneralError,
      onPreflightSuccess
    );

    return wrapped;
  }
}

class BrowserFailingStockfishWorker implements WorkerLike {
  public onmessage: ((this: any, ev: MessageEvent) => any) | null = null;
  public onerror: ((this: any, ev: ErrorEvent) => any) | null = null;
  public onmessageerror: ((this: any, ev: MessageEvent) => any) | null = null;

  public readonly buildType = 'failing';
  public readonly buildTypeState = 'failing';
  public readonly isRecoverableByWrapper = false;

  constructor() {
    console.info('[BrowserFailingStockfishWorker] 강제 에러 가상 워커가 기동되었습니다. (메시지 통신 시점에 에러 이벤트를 트리거합니다)');
  }

  public postMessage(message: any, transfer?: any[] | Transferable): void {
    console.info('[BrowserFailingStockfishWorker] postMessage 수신:', message);
    if (typeof message === 'string' && message.trim() === 'uci') {
      setTimeout(() => {
        if (this.onerror) {
          console.warn('[BrowserFailingStockfishWorker] postMessage("uci") 조건에 맞춰 정상적으로 강제 에러 이벤트를 발송합니다.');
          this.onerror(new ErrorEvent('error', { message: 'Forced Stockfish load error for test on uci send' }));
        }
      }, 10);
    }
  }

  public terminate(): void {
    // do nothing
  }

  public addEventListener(type: string, listener: any, options?: boolean | AddEventListenerOptions): void {}
  public removeEventListener(type: string, listener: any, options?: boolean | EventListenerOptions): void {}
  public dispatchEvent(event: Event): boolean { return false; }
}

class BrowserFakeStockfishWorker implements WorkerLike {
  public onmessage: ((this: any, ev: MessageEvent) => any) | null = null;
  public onerror: ((this: any, ev: ErrorEvent) => any) | null = null;
  public onmessageerror: ((this: any, ev: MessageEvent) => any) | null = null;

  private activeMultiPv = 1;
  private currentDepth = 0;
  private maxTargetDepth = 20;
  private isGoInfinite = false;
  private timer: any = null;
  private rootMoves: string[] = ['e2e4'];

  constructor(onPreflightSuccess?: () => void) {
    console.info('[BrowserFakeStockfishWorker] 가상 스모크 엔진 워커가 브라우저 내에 정상 바이패스 탑재되었습니다.');
    if (onPreflightSuccess) {
      setTimeout(() => {
        try { onPreflightSuccess(); } catch (e) {}
      }, 0);
    }
  }

  public postMessage(message: any, transfer?: any[] | Transferable): void {
    if (typeof message !== 'string') return;
    const trimmed = message.trim();

    if (trimmed === 'uci') {
      setTimeout(() => {
        this.emit('id name Stockfish 18 Fake');
        this.emit('uciok');
      }, 5);
    } else if (trimmed === 'isready') {
      setTimeout(() => {
        this.emit('readyok');
      }, 5);
    } else if (trimmed.startsWith('setoption name MultiPV value')) {
      const parts = trimmed.split(' ');
      this.activeMultiPv = parseInt(parts[parts.length - 1], 10) || 1;
    } else if (trimmed.startsWith('go')) {
      let parsedRootMoves: string[] = [];

      const hasSearchMoves = trimmed.includes('searchmoves');

      // 1. "go ... searchmoves ..." 파싱 결과 (1순위)
      const searchMovesIdx = trimmed.indexOf('searchmoves');
      if (searchMovesIdx !== -1) {
        const tail = trimmed.substring(searchMovesIdx + 'searchmoves'.length).trim();
        const tokens = tail.split(/\s+/).filter(Boolean);
        const movesList: string[] = [];
        const goKeywords = ['depth', 'wtime', 'btime', 'winc', 'binc', 'movestogo', 'nodes', 'mate', 'movetime', 'infinite', 'ponder', 'byoyomi'];
        for (const token of tokens) {
          if (goKeywords.includes(token)) {
            break;
          }
          movesList.push(token);
        }
        if (movesList.length > 0) {
          parsedRootMoves = movesList;
        }
      }

      // 2. window.__MOCK_STOCKFISH_ROOT_MOVES__ (2순위, go 명령에 searchmoves 가 지정되지 않았을 때만 폴백으로 허용)
      if (!hasSearchMoves && parsedRootMoves.length === 0 && typeof window !== 'undefined' && (window as any).__MOCK_STOCKFISH_ROOT_MOVES__) {
        parsedRootMoves = (window as any).__MOCK_STOCKFISH_ROOT_MOVES__;
      }

      // 3. 기본값 순서 (3순위)
      if (parsedRootMoves.length === 0) {
        parsedRootMoves = ['e2e4', 'd2d4', 'g1f3', 'c2c4'];
      }

      this.rootMoves = parsedRootMoves;

      const parts = trimmed.split(' ');
      if (trimmed.includes('depth')) {
        const depthIdx = parts.indexOf('depth');
        const depth = parseInt(parts[depthIdx + 1], 10) || 20;
        this.maxTargetDepth = depth;
        this.isGoInfinite = false;
      } else if (trimmed.includes('infinite')) {
        this.maxTargetDepth = 99;
        this.isGoInfinite = true;
      } else {
        this.maxTargetDepth = 20;
        this.isGoInfinite = false;
      }

      this.simulateSearch();
    } else if (trimmed === 'stop') {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      setTimeout(() => {
        const best = this.rootMoves[0] || 'e2e4';
        this.emit(`bestmove ${best}`);
      }, 5);
    }
  }

  private emit(data: string) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent);
    }
  }

  private simulateSearch() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.currentDepth = 1;
    this.timer = setInterval(() => {
      if (this.currentDepth > this.maxTargetDepth) {
        clearInterval(this.timer);
        this.timer = null;
        if (!this.isGoInfinite) {
          const best = this.rootMoves[0] || 'e2e4';
          this.emit(`bestmove ${best}`);
        }
        return;
      }

      for (let pv = 1; pv <= this.activeMultiPv; pv++) {
        const score = 30 - pv * 5;
        const nodes = this.currentDepth * 50000;
        const currentMove = this.rootMoves[pv - 1];
        if (!currentMove) {
          continue;
        }
        this.emit(`info depth ${this.currentDepth} multipv ${pv} score cp ${score} nodes ${nodes} nps 100000 time 500 pv ${currentMove}`);
      }

      this.currentDepth++;
    }, 2);
  }

  public terminate(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public addEventListener(type: string, listener: any, options?: boolean | AddEventListenerOptions): void {}
  public removeEventListener(type: string, listener: any, options?: boolean | EventListenerOptions): void {}
  public dispatchEvent(event: Event): boolean { return false; }
}
