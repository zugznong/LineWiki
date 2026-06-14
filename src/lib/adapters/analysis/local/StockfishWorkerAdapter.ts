import type { LocalAnalysisPort } from '$lib/ports/LocalAnalysisPort';
import { isBrowser } from '$lib/config/runtimeConfig';
import { localAnalysisStore } from '$lib/stores/localAnalysisStore.svelte.ts';
import { StockfishCommandBuilder, UnsafeUciCommandError } from './StockfishCommandBuilder';
import { StockfishMessageParser } from './StockfishMessageParser';
import { EvalScore } from '$lib/domain/analysis/EvalScore';
import { normalizeToWhitePerspective } from '$lib/domain/analysis/EvalPerspective';
import { StockfishWorkerFactory, type WorkerLike } from './StockfishWorkerFactory';
import type { LocalAnalysisRequest } from '$lib/domain/analysis/LocalAnalysisRequest';
import { evaluationStore } from '../../../stores/evaluationStore.svelte';

export class StockfishWorkerAdapter implements LocalAnalysisPort {
  private worker: WorkerLike | null = null;
  private onResultCallback: ((res: any) => void) | null = null;
  private currentFen: string = '';
  private previousFen: string = '';
  private activeGeneration: number = 0;
  private readonly parser = new StockfishMessageParser();
  private hasFailed: boolean = false;
  private onReadyCallback: (() => void) | null = null;
  private generation: number = 0;
  private isAnalysisActive: boolean = false;

  // 엔진 기본 옵션 백업 버퍼
  private lastRequest: LocalAnalysisRequest | null = null;
  private lastActiveHashSize: number = 0;
  private onFailureCallback: (() => void) | null = null;
  private onRestartStartedCallback: (() => void) | null = null;
  private onFallbackToSingleCallback: (() => void) | null = null;
  private uciokTimeoutId: any = null;

  // 명시적 7단계 천이 상태 머신 변수들
  private engineState: 'uninitialized' | 'uci_sent' | 'uciok_received' | 'isready_sent' | 'readyok_received' | 'analyzing' | 'stopping-for-restart' | 'aborted' | 'terminal' = 'uninitialized';
  public currentAnalysisId: string | null = null;
  private pendingRequest: LocalAnalysisRequest | null = null;
  private queuedRestartRequest: LocalAnalysisRequest | null = null;

  // 싱글스레드 무제한 분석 과열 가드용 단계형 MultiPV 상태 변수
  private isStaircaseActive: boolean = false;
  private staircaseStep: 'stabilizing' | 'transitioning' | 'expanded' = 'stabilizing';

  // 진단 정밀화용 추적 필드
  private lastGoCommand: string = '';
  private activeMultiPv: number = 1;
  private lastReceivedMultiPvRoots: Record<number, string> = {};

  /**
   * 실제로 가동되고 있는 물리적 MultiPV 설정 값을 리턴합니다 (단계형 완화 가드 상태 고려)
   */
  public getActiveMultiPvCount(): number {
    const req = this.lastRequest;
    if (!req) return 1;
    if (this.isStaircaseActive && this.staircaseStep === 'stabilizing') {
      return Math.min(req.targetMoves.length, 3);
    }
    return Math.min(req.targetMoves.length, 500);
  }

  public onReady(callback: () => void): void {
    this.onReadyCallback = callback;
  }

  public onFailure(callback: () => void): void {
    this.onFailureCallback = callback;
  }

  public onRestartStarted(callback: () => void): void {
    this.onRestartStartedCallback = callback;
  }

  public onFallbackToSingle(callback: () => void): void {
    this.onFallbackToSingleCallback = callback;
  }

  constructor() {
    // Lazy initialization of Web Worker inside start or send
  }

  private handleUciInitializationFailure(reason: string): void {
    if (this.uciokTimeoutId) {
      clearTimeout(this.uciokTimeoutId);
      this.uciokTimeoutId = null;
    }
    this.hasFailed = true;
    this.engineState = 'aborted';
    
    this.updateDiagnostics({
      fallbackStage: 'single-runtime-failed',
      lastWorkerError: reason,
      actualBuildType: 'fallback'
    });

    this.clearOnFailure();
    localAnalysisStore.setError(`로컬 Stockfish 엔진 기동 실패: ${reason}`);
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch (e) {}
      this.worker = null;
    }
  }

  private handleWorkerRuntimeCrash(err: any): void {
    // hasFailed는 ST 최종 실패에서만 true로 지정합니다. MT 오류가 복구 과정 중에 오동작을 일으키지 않도록 사전에 철저히 가드합니다.
    const actBuildType = this.worker ? ((this.worker as any).buildTypeState || (this.worker as any).buildType || 'multi') : 'multi';
    const isSingle = actBuildType === 'single' || actBuildType === 'multi-failed-single-fallback';
    const isRecoverableWrapper = this.worker && (
      typeof (this.worker as any).onFallbackToSingle === 'function' || 
      'hasFallbackToSingle' in (this.worker as any)
    );

    if (!isSingle && isRecoverableWrapper) {
      console.warn('[StockfishWorkerAdapter] handleWorkerRuntimeCrash 가 호출되었으나, 현재 멀티스레드 복구 가용한 상태이므로 hasFailed를 우회하고 이벤트를 유보합니다.');
      return;
    }

    this.hasFailed = true;
    this.isAnalysisActive = false;
    this.lastActiveHashSize = 0; // Transposition Table 연속 활용 비축 완전히 파괴 및 리셋
    
    const errMsg = err?.message || String(err);
    const diagDetails = err?.diagnostics || {};
    const filename = err?.filename || diagDetails.jsPath || 'Unknown';
    const buildType = diagDetails.buildType || 'Unknown';
    const wasmPath = diagDetails.wasmPath || 'Unknown';
    const reason = diagDetails.reason || 'Unknown';

    const detailMsg = `Msg: ${errMsg}, File: ${filename}, BuildType: ${buildType}, WASM: ${wasmPath}, Reason: ${reason}`;
    
    this.updateDiagnostics({
      fallbackStage: 'single-runtime-failed',
      lastWorkerError: detailMsg,
      actualBuildType: 'fallback'
    });

    if (this.worker) {
      try {
        this.worker.onmessage = null;
        this.worker.onerror = null;
        this.worker.terminate();
      } catch {}
      this.worker = null;
    }
    this.staircaseStep = 'stabilizing';
    localAnalysisStore.setError(`로컬 Stockfish 엔진 런타임 크래시 감지: ${errMsg}`);
    this.clearOnFailure();
  }

  private initWorker(): void {
    if (this.hasFailed) return;
    
    if (this.uciokTimeoutId) {
      clearTimeout(this.uciokTimeoutId);
      this.uciokTimeoutId = null;
    }

    this.updateDiagnostics({
      uciokReceived: false,
      readyokReceived: false,
      lastWorkerError: null,
      fallbackStage: null,
      actualBuildType: localAnalysisStore.engineMode === 'fallback' ? 'fallback' : (localAnalysisStore.engineBuildType || 'multi'),
      handshakeStartedAt: Date.now()
    });

    try {
      const w = StockfishWorkerFactory.createWorker(
        (failureReason) => {
          console.warn(`[StockfishWorkerAdapter] 가동 중 싱글스레드 대체 복구가 트리거되었습니다. 원인: ${failureReason}`);
          
          localAnalysisStore.setEngineMode('stockfish');
          localAnalysisStore.setEngineBuildType('multi-failed-single-fallback');

          this.updateDiagnostics({
            fallbackStage: failureReason,
            actualBuildType: 'multi-failed-single-fallback',
            handshakeStartedAt: Date.now()
          });

          if (this.onFallbackToSingleCallback) {
            try { this.onFallbackToSingleCallback(); } catch (e) {}
          }

          if (this.uciokTimeoutId) {
            clearTimeout(this.uciokTimeoutId);
          }

          // [ST fallback 보장 로직]: 어떤 상태였든 새 worker이므로 항상 새 lifecycle handshake를 시작해야 합니다.
          console.info('[StockfishWorkerAdapter] Fallback 전개 완료 -> 상태 무관하게 새로운 ST 워커용 lifecycle handshake 기동 (uci 송출)');
          
          if (this.lastRequest) {
            this.pendingRequest = this.lastRequest;
          }

          this.engineState = 'uci_sent';
          this.send(StockfishCommandBuilder.uci());

          // 싱글스레드로의 복구 시에는 uci_sent 재시작 타임아웃을 안전하게 리부팅
          this.uciokTimeoutId = setTimeout(() => {
            if (this.engineState === 'uci_sent') {
              this.handleUciInitializationFailure('대체 싱글스레드 엔진 UCI 초기화 초과 실패 (uciok 무수신)');
            }
          }, 8000); // 넉넉히 연장
        },
        (err) => {
          console.error('Stockfish Worker final recovery error:', err);
          const diagDetails = (err as any)?.diagnostics || {};
          const filename = (err as any)?.filename || diagDetails.jsPath || 'Unknown';
          const buildType = diagDetails.buildType || 'Unknown';
          const wasmPath = diagDetails.wasmPath || 'Unknown';
          const reason = diagDetails.reason || 'Unknown';
          const errMsg = err?.message || String(err);
          const detailMsg = `Recovery Error: ${errMsg}, File: ${filename}, BuildType: ${buildType}, WASM: ${wasmPath}, Reason: ${reason}`;
          this.handleUciInitializationFailure(detailMsg);
        },
        () => {
          console.info('[StockfishWorkerAdapter] Preflight 성공 및 실물 워커 생성 완료 -> UCI 타이머 최적화 리셋 및 시동');
          if (this.uciokTimeoutId) {
            clearTimeout(this.uciokTimeoutId);
          }
          const isSingle = (w as any).buildType === 'single';
          this.uciokTimeoutId = setTimeout(() => {
            if (this.engineState === 'uci_sent') {
              this.handleUciInitializationFailure(
                isSingle 
                ? '싱글스레드 복구 엔진 물리적 UCI 초기화 초과 실패 (uciok 무수신)' 
                : '메인 멀티스레드 엔진 물리적 UCI 초기화 초과 실패 (uciok 무수신)'
              );
            }
          }, isSingle ? 8000 : 4000);
        }
      );

      this.worker = w;
      
      const syncBuild = (force = false) => {
        const bt = (w as any).buildTypeState || (w as any).buildType || 'multi';
        if (force || localAnalysisStore.engineBuildType !== bt) {
          if (force) {
            console.info(`[StockfishWorkerAdapter] 신규 세션 엔진 빌드 유형 동적 고정 설정: ${bt}`);
          } else {
            console.info(`[StockfishWorkerAdapter] 비동기 빌드 격하 실시간 싱크: ${bt}`);
          }
          localAnalysisStore.setEngineBuildType(bt);
          if (bt === 'multi-failed-single-fallback') {
            localAnalysisStore.setEngineMode('stockfish');
          }
        }
        
        const isFallbackMode = localAnalysisStore.engineMode === 'fallback';
        this.updateDiagnostics({
          actualBuildType: isFallbackMode ? 'fallback' : bt
        });
      };

      syncBuild(true);

      w.onmessage = (event) => {
        syncBuild();
        const message = event.data;
        this.handleWorkerMessage(message);
      };
      w.onerror = (errEvent: any) => {
        syncBuild();
        const activeBuildType = (w as any).buildType || 'multi';
        const hasFallback = (w as any).buildTypeState === 'multi-failed-single-fallback';
        
        // 실제로 이 워커가 복구 가능한 wrapper(PreflightBufferedWorker)인지 안전하게 판정합니다.
        const isRecoverableWrapper = (
          typeof (w as any).onFallbackToSingle === 'function' || 
          typeof (w as any).onSingleThreadFallback === 'function' ||
          'hasFallbackToSingle' in w
        ) && (w as any).isRecoverableByWrapper !== false;

        console.warn(`[StockfishWorkerAdapter] 워커 런타임 오류 수신 (빌드: ${activeBuildType}, fallback 여부: ${hasFallback}, 복구지원여부: ${isRecoverableWrapper}):`, errEvent);
        
        // 멀티스레드 물리 워커 동작 중 발생한 오류가 실제로 복구 가능한 Wrapper 워커 내부에서 일어난 경우에만 
        // 싱글스레드 복구 메커니즘을 신뢰하여 최종 실패 지정을 안전하게 판단 보류합니다.
        if (activeBuildType === 'multi' && !hasFallback && isRecoverableWrapper) {
          console.info('[StockfishWorkerAdapter] 멀티스레드 실행 시간 에러는 싱글스레드 복구 메커니즘이 가동되므로 어댑터 파괴를 안전하게 보류합니다.');
          return;
        }
        
        this.handleWorkerRuntimeCrash(errEvent);
      };
      
      // Preflight가 비동기로 가동되어 WASM 컴파일을 단행하는 연산 보호 기간 동안의 안정보호막 (20초)
      // 물리 워커 생성이 실시간 성공하면 onPreflightSuccess 에 의해 즉각 4초/8초 타이머로 세련되게 치환됩니다.
      this.uciokTimeoutId = setTimeout(() => {
        if (this.engineState === 'uci_sent') {
          this.handleUciInitializationFailure('메인 엔진 UCI 초기화 초과 실패 (uciok 무수신)');
        }
      }, 20000);

      this.engineState = 'uci_sent';
      this.send(StockfishCommandBuilder.uci());
    } catch (err: any) {
      console.error('Failed to initialize Stockfish worker:', err);
      this.handleUciInitializationFailure(err.message || String(err));
    }
  }

  private clearOnFailure(): void {
    this.isAnalysisActive = false;
    localAnalysisStore.stopAnalysis();
    if (this.onFailureCallback) {
      this.onFailureCallback();
    }
  }

  private send(cmd: string): void {
    if (this.hasFailed) return;
    if (!this.worker && isBrowser) {
      this.initWorker();
    }
    if (this.worker) {
      this.updateDiagnostics({
        lastSentCommand: cmd
      });
      this.worker.postMessage(cmd);
    }
  }

  private updateDiagnostics(extra: Partial<any> = {}): void {
    if (typeof window === 'undefined') return;
    
    const supportsSharedArray = typeof SharedArrayBuffer !== 'undefined';
    const isIsolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
    const canUseMultiThread = supportsSharedArray && isIsolated;

    const baseDiag = (window as any).__stockfish_diagnostics__ || {
      lastPositionMode: 'none',
      movesFromStart: [],
      baseFen: '',
      staircaseActive: false,
      staircaseStep: 'none',
      targetDepth: 0,
      actualBuildType: 'none',
      requestedThreads: 0,
      actualThreads: 0,
      budget: 'none',
      lastGoCommand: '',
      canUseMultiThread,
      crossOriginIsolated: isIsolated,
      sharedArrayBufferAvailable: supportsSharedArray,
      fallbackStage: null,
      lastWorkerError: null,
      uciokReceived: false,
      readyokReceived: false,
      workerLifecycleId: 'none',
      
      handshakePhase: 'none',
      lastSentCommand: 'none',
      lastReceivedMessage: 'none',
      physicalBuildType: 'none',
      fallbackAttemptCount: 0,
      handshakeStartedAt: Date.now()
    };

    (window as any).__stockfish_diagnostics__ = {
      ...baseDiag,
      canUseMultiThread,
      crossOriginIsolated: isIsolated,
      sharedArrayBufferAvailable: supportsSharedArray,
      workerLifecycleId: (this.worker as any)?.workerLifecycleId || 'none',
      handshakePhase: this.engineState,
      physicalBuildType: (this.worker as any)?.buildType || 'multi',
      fallbackAttemptCount: (this.worker as any)?.fallbackAttemptCount ?? 0,
      targetMoves: this.lastRequest?.targetMoves || [],
      lastGoCommand: this.lastGoCommand,
      activeMultiPv: this.activeMultiPv,
      lastReceivedMultiPvRoots: { ...this.lastReceivedMultiPvRoots },
      ...extra
    };
  }

  private sendPositionCommand(fen: string, movesFromStart?: string[], initialFen?: string): boolean {
    try {
      if (movesFromStart) {
        const baseFen = initialFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        console.info('[StockfishWorkerAdapter] movesFromStart 수순을 적용하여 position startpos moves ... 경로로 기본 전송합니다.', movesFromStart);
        this.updateDiagnostics({
          lastPositionMode: 'moves-from-start',
          movesFromStart: [...movesFromStart],
          baseFen: baseFen
        });
        this.send(StockfishCommandBuilder.setPositionWithMoves(baseFen, movesFromStart));
      } else {
        console.info('[StockfishWorkerAdapter] FEN_ONLY: 단일 position fen 명령어를 전송합니다.');
        this.updateDiagnostics({
          lastPositionMode: 'fen-only',
          movesFromStart: [],
          baseFen: fen
        });
        this.send(StockfishCommandBuilder.setPosition(fen));
      }
      return true;
    } catch (err) {
      if (err instanceof UnsafeUciCommandError) {
        console.error('[로컬 분석 보안 가드] 안전하지 않은 FEN이 감지되어 UCI position 명령 생성을 차단했습니다.');
        this.hasFailed = true;
        localAnalysisStore.setError('안전하지 않은 FEN 입력이 감지되어 로컬 분석을 중단했습니다.');
        this.clearOnFailure();
        return false;
      }
      throw err;
    }
  }

  public prepare(settings: { threads: number; hash: number; multiPv?: number }): void {
    // 옵션 지정 준서 보장을 위해 isready_sent 격상 처리 후 post 처리 함구
    this.engineState = 'isready_sent';
    this.send(StockfishCommandBuilder.setThreads(settings.threads));
    this.send(StockfishCommandBuilder.setHash(settings.hash));
    this.send(StockfishCommandBuilder.setMultiPv(settings.multiPv || 1));
    this.send(StockfishCommandBuilder.isReady());
  }

  public start(requestOrFen: LocalAnalysisRequest | string, legacyMoves: any[] = []): { started: boolean; queued: boolean } {
    if (this.hasFailed) {
      console.warn('[StockfishWorkerAdapter] 이전에 발생한 실패 기록을 완전히 정화하고, 새로운 워커 개조 복구를 실현합니다.');
      this.hasFailed = false;
      this.lastActiveHashSize = 0;
      if (this.worker) {
        try {
          this.worker.onmessage = null;
          this.worker.onerror = null;
          this.worker.terminate();
        } catch {}
        this.worker = null;
      }
    }

    if (!this.worker && isBrowser) {
      this.initWorker();
    }

    this.generation++;
    this.currentAnalysisId = 'analysis_' + this.generation + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    this.isAnalysisActive = false; // 일시적 비액티브

    this.lastReceivedMultiPvRoots = {};

    let request: LocalAnalysisRequest;
    if (typeof requestOrFen === 'string') {
      const uciMoves = legacyMoves.map((m: any) => m.uci).filter(Boolean);
      request = {
        fen: requestOrFen,
        allCandidateMoves: legacyMoves,
        targetMoves: uciMoves,
        threads: 1,
        hash: 16,
        multiPv: uciMoves.length,
        nodes: undefined,
        fenOnly: true
      };
      (request as any)._legacyQuickPass = true;
    } else {
      request = requestOrFen;
    }

    this.updateDiagnostics({
      targetDepth: request.targetDepth
    });

    // 엔진이 현재 분석 중이거나 이미 중단 대기 중인 경우, 분석이 완전히 멈출 때(bestmove 수신 시)까지 새 세션 요청을 보류합니다.
    if (this.engineState === 'analyzing' || this.engineState === 'stopping-for-restart') {
      this.queuedRestartRequest = request;
      this.isAnalysisActive = false;
      this.pendingRequest = null;
      console.info(`[StockfishWorkerAdapter] 분석 중(engineState == "${this.engineState}") 새 FEN 유입 -> stop 시그널 발송 및 대기열 임시 배치`);
      if (this.engineState === 'analyzing') {
        this.engineState = 'stopping-for-restart';
        if (this.worker) {
          this.worker.postMessage(StockfishCommandBuilder.stop());
        }
      }
      return { started: false, queued: true };
    }

    // this.currentFen = request.fen; // applySettingsAndIsReady 및 isReady 수신 이후에만 안정 갱신하도록 뒤로 미룸
    this.activeGeneration = evaluationStore.generation;
    this.lastRequest = request;
    this.pendingRequest = request;

    // 싱글스레드 무제한 분석 시, 다량 MultiPV에 의한 CPU 및 워커 채널 락 현상을 원점 예방하는 계단식 정책 적용
    const isSingleThread = request.threads === 1;
    const isInfiniteAndProne = (request.budget === 'infinite' || request.analysisMode === 'infinite') && isSingleThread;
    const totalTargetCount = request.targetMoves.length;

    if (isInfiniteAndProne && totalTargetCount > 3) {
      this.isStaircaseActive = true;
      this.staircaseStep = 'stabilizing';
      localAnalysisStore.setStaircaseStep('stabilizing');
      this.updateDiagnostics({
        staircaseActive: true,
        staircaseStep: 'stabilizing'
      });
      console.info(`[StockfishWorkerAdapter] 싱글스레드 무제한 분석 안전 장치(단계형 MultiPV)가 개입합니다. (1단계: MultiPV=3, TargetDepth=20)`);
    } else {
      this.isStaircaseActive = false;
      this.staircaseStep = 'stabilizing';
      localAnalysisStore.setStaircaseStep('none');
      this.updateDiagnostics({
        staircaseActive: false,
        staircaseStep: 'none'
      });
    }

    const multiPvCount = Math.min(request.targetMoves.length, 500);

    if (multiPvCount === 0) {
      localAnalysisStore.stopAnalysis();
      return { started: false, queued: false };
    }

    this.isAnalysisActive = true;
    
    // 가동 중인 실제 물리 빌드 유형 추출 및 실시간 동기화
    if (this.worker) {
      const actualBt = (this.worker as any).buildType || 'multi';
      localAnalysisStore.setEngineBuildType(actualBt);
    }
    console.info(`[StockfishWorkerAdapter] 로컬 분석 엔진 시동 완료. (실제 가동 빌드 유형: ${localAnalysisStore.engineBuildType || 'multi'})`);

    const isBrowserAvailable = typeof window !== 'undefined';
    if (!this.worker && isBrowserAvailable) {
      this.initWorker();
    } else if (this.worker) {
      // 이미 준비되었거나 진행 상태일 경우 새 옵션을 발사하여 readyok를 다시 기대하게 함
      if (
        this.engineState === 'uciok_received' ||
        this.engineState === 'readyok_received'
      ) {
        this.applySettingsAndIsReady(request);
      }
    }
    return { started: true, queued: false };
  }

  public restart(request: LocalAnalysisRequest): { started: boolean; queued: boolean } {
    console.info('[StockfishWorkerAdapter] 단일 restart()가 호출되어 최적의 직렬화 대기열 패턴으로 진입합니다.');
    const isEngineActive = 
      this.engineState === 'uci_sent' ||
      this.engineState === 'uciok_received' ||
      this.engineState === 'isready_sent' ||
      this.engineState === 'readyok_received' ||
      this.engineState === 'analyzing' ||
      this.engineState === 'stopping-for-restart';

    if (isEngineActive) {
      this.queuedRestartRequest = request;
      this.isAnalysisActive = false;
      this.pendingRequest = null;
      console.info(`[StockfishWorkerAdapter] restart() 수집 - 엔진 작동 감지(engineState == "${this.engineState}") -> 큐 대기 전환 및 stop 발송`);
      if (this.engineState === 'analyzing' || this.engineState === 'uci_sent' || this.engineState === 'isready_sent' || this.engineState === 'readyok_received') {
        this.engineState = 'stopping-for-restart';
        if (this.worker) {
          this.worker.postMessage(StockfishCommandBuilder.stop());
        }
      }
      return { started: false, queued: true };
    }

    return this.start(request);
  }

  private isRelatedFen(fen1: string, fen2: string): boolean {
    if (!fen1 || !fen2) return false;
    const b1 = fen1.split(' ')[0];
    const b2 = fen2.split(' ')[0];
    if (Math.abs(b1.length - b2.length) > 10) return false;

    let diffCount = 0;
    const maxLen = Math.max(b1.length, b2.length);
    for (let i = 0; i < maxLen; i++) {
      if (b1[i] !== b2[i]) {
        diffCount++;
      }
    }
    return diffCount < 25;
  }

  private applySettingsAndIsReady(request: LocalAnalysisRequest) {
    if (!this.worker) return;
    this.engineState = 'isready_sent';
    
    let multiPvCount = Math.min(request.targetMoves.length, 500);
    // 단계형 분석 1단계(stabilizing) 작동 중일 때는 MultiPV 폭을 3으로 억제
    if (this.isStaircaseActive && this.staircaseStep === 'stabilizing') {
      multiPvCount = Math.min(request.targetMoves.length, 3);
    }
    this.activeMultiPv = multiPvCount;

    const actBuildType = (this.worker as any).buildType || 'multi';
    const threadsToSend = actBuildType === 'single' ? 1 : request.threads;

    this.worker.postMessage(StockfishCommandBuilder.setThreads(threadsToSend));
    this.worker.postMessage(StockfishCommandBuilder.setHash(request.hash));
    this.worker.postMessage(StockfishCommandBuilder.setMultiPv(multiPvCount));

    const isHashUnchanged = this.lastActiveHashSize === request.hash;
    
    const previousFen = this.previousFen;
    const isFenRelated = this.isRelatedFen(previousFen, request.fen);
    const isFenOnly = !!request.fenOnly || !request.movesFromStart;

    // 같은 라인에서 수를 둔 경우 (movesFromStart가 존재하고 fenOnly가 아닌 경우)
    // ucinewgame 및 clear hash를 수행하지 않고 이전 해시(Transposition Table)를 유지합니다.
    const hasActiveLine = request.movesFromStart !== undefined && !request.fenOnly;
    const shouldResetEngine = hasActiveLine ? false : (!isFenRelated || isFenOnly);

    if (shouldResetEngine) {
      console.info(`[StockfishWorkerAdapter] ucinewgame 전송 (이유: FEN 무관계=${!isFenRelated}, FEN_ONLY=${isFenOnly}, 활성라인여부=${hasActiveLine})`);
      this.worker.postMessage(StockfishCommandBuilder.uciNewGame());
    }

    if (!isHashUnchanged || shouldResetEngine) {
      console.info(`[StockfishWorkerAdapter] Clear Hash 실행 (이유: Hash 변경=${!isHashUnchanged}, 엔진 리셋=${shouldResetEngine})`);
      this.worker.postMessage(StockfishCommandBuilder.clearHash());
    } else {
      console.info('[StockfishWorkerAdapter] 이전 분석 캐시(Transposition Table)를 연속 활용합니다.');
    }

    this.lastActiveHashSize = request.hash;
    
    // 설정 적용 및 ucinewgame 등이 끝난 시점에서 비로서 currentFen과 previousFen을 업데이트합니다.
    this.previousFen = request.fen;
    this.currentFen = request.fen;
    
    this.worker.postMessage(StockfishCommandBuilder.isReady());
  }

  private sendPositionAndGo(request: LocalAnalysisRequest) {
    if (!this.worker) return;
    this.engineState = 'analyzing';

    // 2단계 확장 가동(expanded) 전이 시에는 startAnalysis가 수행되어 기존 1단계 획득 평가 리스트가 초기화되는 것을 보관 수호합니다.
    if (this.isStaircaseActive && this.staircaseStep === 'expanded') {
      localAnalysisStore.setStatus('analyzing');
    } else {
      localAnalysisStore.startAnalysis(request.allCandidateMoves, request.fen, this.activeGeneration, request.targetDepth);
    }

    if (!this.sendPositionCommand(request.fen, request.movesFromStart, request.initialFen)) return;

    const useSearchmoves = request.targetMoves.length < request.allCandidateMoves.length;
    
    const isLegacyQuickPass = (request as any)._legacyQuickPass;
    let goDepth: number | undefined = isLegacyQuickPass ? 3 : (request.targetDepth ?? 24);
    let goNodes: number | undefined = isLegacyQuickPass ? undefined : request.nodes;
    let goMode = isLegacyQuickPass ? 'depth' : (request.analysisMode ?? 'depth');

    if (this.isStaircaseActive && this.staircaseStep === 'stabilizing') {
      goDepth = 20;
      goNodes = undefined;
      goMode = 'depth';
    } else if (this.isStaircaseActive && this.staircaseStep === 'expanded') {
      goDepth = undefined;
      goNodes = undefined;
      goMode = 'infinite';
    } else if (request.budget === 'infinite') {
      goDepth = undefined;
      goNodes = undefined;
      goMode = 'infinite';
    } else if (request.budget === 'custom' && request.customDepth !== undefined) {
      goDepth = request.customDepth;
      goNodes = undefined;
      goMode = 'depth';
    }

    const goCmd = StockfishCommandBuilder.go({
      nodes: goNodes,
      depth: goDepth,
      analysisMode: goMode,
      searchmoves: useSearchmoves ? request.targetMoves : undefined
    });

    this.lastGoCommand = goCmd;

    const actBuildType = (this.worker as any).buildType || 'multi';
    const reqThreads = request.threads;
    const actThreads = actBuildType === 'single' ? 1 : reqThreads;

    this.updateDiagnostics({
      actualBuildType: actBuildType,
      requestedThreads: reqThreads,
      actualThreads: actThreads,
      budget: request.budget,
      targetDepth: request.targetDepth ?? 24,
      lastGoCommand: goCmd
    });

    this.worker.postMessage(goCmd);
  }



  public stop(): void {
    const wasAnalyzing = this.engineState === 'analyzing';
    this.isAnalysisActive = false;
    this.pendingRequest = null;
    this.isStaircaseActive = false;
    this.staircaseStep = 'stabilizing';
    localAnalysisStore.setStaircaseStep('none');
    this.updateDiagnostics({
      staircaseActive: false,
      staircaseStep: 'none'
    });
    this.queuedRestartRequest = null;
    if (wasAnalyzing) {
      this.engineState = 'readyok_received';
    }
    if (this.worker) {
      this.worker.postMessage(StockfishCommandBuilder.stop());
    }
    localAnalysisStore.stopAnalysis();
  }

  public dispose(): void {
    if (this.uciokTimeoutId) {
      clearTimeout(this.uciokTimeoutId);
      this.uciokTimeoutId = null;
    }
    this.stop();

    if (this.worker) {
      try {
        this.worker.postMessage(StockfishCommandBuilder.quit());
      } catch {
        // 안전 조치
      }

      this.worker.onmessage = null;
      this.worker.onerror = null;
      this.worker.terminate();
      this.worker = null;
    }

    this.onResultCallback = null;
    this.onReadyCallback = null;
    this.onFailureCallback = null;
    this.currentFen = '';
    this.previousFen = '';
    this.hasFailed = false;
    this.lastRequest = null;
    this.currentAnalysisId = null;
    this.engineState = 'terminal';

    this.updateDiagnostics({
      uciokReceived: false,
      readyokReceived: false,
      fallbackStage: null,
      lastWorkerError: null,
      actualBuildType: 'none'
    });
  }

  public onResult(callback: (res: any) => void): void {
    this.onResultCallback = callback;
  }

  private handleWorkerMessage(message: string): void {
    if (typeof message !== 'string') return;
    
    // 매 워커 이벤트 접수 대기열마다 물리 워커의 실시간 빌드 격화 상태를 상태 트리와 동치화시킵니다
    if (this.worker) {
      const actualBt = (this.worker as any).buildTypeState || (this.worker as any).buildType || 'multi';
      if (localAnalysisStore.engineBuildType !== actualBt) {
        localAnalysisStore.setEngineBuildType(actualBt);
      }
    }
    
    this.updateDiagnostics({
      lastReceivedMessage: message
    });
    
    // 만약 어댑터가 실패 상태이거나 명시적으로 aborted/terminal이면 일체 수신 무시
    if (this.hasFailed || this.engineState === 'aborted' || this.engineState === 'terminal') {
      return;
    }
    
    const isBestMoveMsg = message.startsWith('bestmove');

    // [중요 버그 수정]: bestmove이면서 queuedRestartRequest가 존재하는 경우에는
    // FEN/Generation 가드 체크보다 먼저 가로채서 처리합니다. 
    // 이는 구 FEN에서 전송한 stop 명령어에 의해 뒤늦게 날아온 유효한 정상 종료 티켓이므로 폐기하면 안 됩니다.
    if (isBestMoveMsg && this.queuedRestartRequest) {
      const req = this.queuedRestartRequest;
      this.queuedRestartRequest = null;
      this.engineState = 'readyok_received';
      console.info('[StockfishWorkerAdapter] [QUICK RECOVERY Guard] bestmove 완료 -> queuedRestartRequest 속개 개시 (구 FEN bestmove는 UI 콜백 전송 제외 함)', req.fen);
      
      // 주의: 이 경우에는 onResultCallback으로 이전 bestmove를 상위에 전달(콜백)하지 않고,
      // 오직 "이전 검색 종료 확인 -> 새 요청 시작" 용도로만 사용하므로 상단 콜백 전달을 생략하고 즉시 start합니다.
      this.start(req);
      if (this.onRestartStartedCallback) {
        this.onRestartStartedCallback();
      }
      return;
    }

    // 만약 현재 어댑터의 FEN이나 세대가 전역의 상태와 다르면 과감히 무시 및 투척
    // 단, uciok 이나 readyok 같은 엔진 인프라 초기화 시그널은 FEN 검증 가드에서 면제합니다.
    const isUciok = message.trim() === 'uciok';
    const isReadyok = message.trim() === 'readyok';
    const isLifecycleSignal = isUciok || isReadyok;

    if (!isLifecycleSignal && evaluationStore.activeFen && (this.currentFen !== evaluationStore.activeFen || this.activeGeneration !== evaluationStore.generation)) {
      return;
    }
    
    if (message.startsWith('error:')) {
      localAnalysisStore.setError(message.replace('error:', '').trim());
      if (this.onFailureCallback) {
        this.onFailureCallback();
      }
      return;
    }

    // uciok 응답 천이
    if (message.trim() === 'uciok') {
      if (this.uciokTimeoutId) {
        clearTimeout(this.uciokTimeoutId);
        this.uciokTimeoutId = null;
      }
      this.engineState = 'uciok_received';
      this.updateDiagnostics({
        uciokReceived: true
      });
      if (this.pendingRequest) {
        this.applySettingsAndIsReady(this.pendingRequest);
      }
      return;
    }

    // readyok 응답 천이
    if (message.trim() === 'readyok') {
      this.engineState = 'readyok_received';
      this.updateDiagnostics({
        readyokReceived: true
      });
      
      if (localAnalysisStore.status !== 'analyzing' && localAnalysisStore.status !== 'completed') {
        localAnalysisStore.setReady();
      }
      if (this.onReadyCallback) {
        this.onReadyCallback();
      }

      // 대기 중이었던 활성 세션에 대해 안전 기동
      if (this.isAnalysisActive) {
        if (this.pendingRequest) {
          const req = this.pendingRequest;
          this.pendingRequest = null;
          this.sendPositionAndGo(req);
        } else if (this.isStaircaseActive && this.staircaseStep === 'expanded' && this.lastRequest) {
          this.sendPositionAndGo(this.lastRequest);
        }
      }
      return;
    }

    // 분석 비활성이거나 엔진 상태가 아직 'analyzing' / 'stopping-for-restart' 가 아니면 이전 세션의 지연된 흔적이므로 과감히 폐기
    // (단, 대기중인 queuedRestartRequest가 있을 수 있고 이 상황의 완결 티켓인 'bestmove'인 경우에는 통과시켜 줍니다)
    const isRestartPending = !!this.queuedRestartRequest || this.engineState === 'stopping-for-restart';

    if (!isBestMoveMsg && (!this.isAnalysisActive || (this.engineState !== 'analyzing' && this.engineState !== 'stopping-for-restart'))) {
      return;
    }
    if (isBestMoveMsg && !isRestartPending && (!this.isAnalysisActive || (this.engineState !== 'analyzing' && this.engineState !== 'stopping-for-restart'))) {
      return;
    }
    
    // UCI 실시간 기보 분석 결과 파싱: "info depth ... score ... pv ..."
    if (message.startsWith('info depth') || message.includes('score')) {
      const parsedResult = this.parser.parseInfoLine(message, this.currentFen);
      if (parsedResult && parsedResult.bestMoveUci) {
        if (parsedResult.multiPvIndex && parsedResult.bestMoveUci) {
          this.lastReceivedMultiPvRoots[parsedResult.multiPvIndex] = parsedResult.bestMoveUci;
        }

        const finalScore = normalizeToWhitePerspective(parsedResult.score, this.currentFen);

        const combinedResult = {
          ...parsedResult,
          bestMoveUci: parsedResult.bestMoveUci,
          score: finalScore,
          analysisId: this.currentAnalysisId || undefined
        };

        if (this.onResultCallback) {
          this.onResultCallback(combinedResult);
        }

        // 단계형 분석 가드 하에 초반 안정화 목표 깊이(Target Depth 20) 완료 감지 시점인 경우, 즉각 stop 후 2단계 전면 확장 전개
        if (this.isStaircaseActive && this.staircaseStep === 'stabilizing' && parsedResult.depth !== undefined && parsedResult.depth >= 20) {
          this.staircaseStep = 'transitioning';
          localAnalysisStore.setStaircaseStep('transitioning');
          this.updateDiagnostics({
            staircaseStep: 'transitioning'
          });
          console.info('[StockfishWorkerAdapter] 단계형 MultiPV 1단계(depth 20 안정 기동) 도달 완료! 엔진을 정지하고 2단계 무제한 전체 확장 분석 전환을 시작합니다.');
          if (this.worker) {
            this.worker.postMessage(StockfishCommandBuilder.stop());
          }
        }

        const isLegacyQuickPass = this.lastRequest && (this.lastRequest as any)._legacyQuickPass;
        const isSinglePv = this.lastRequest && this.lastRequest.targetMoves.length <= 1;

        if (isLegacyQuickPass || isSinglePv) {
          localAnalysisStore.addEvaluationUpdate({
            moveUci: parsedResult.bestMoveUci,
            score: finalScore,
            depth: parsedResult.depth,
            nodes: parsedResult.nodes
          });
        }

        if (this.lastRequest && !isLegacyQuickPass && this.lastRequest.softNodeCap !== undefined) {
          const currentNodes = parsedResult.nodes ?? 0;
          const targetDepth = this.lastRequest.targetDepth ?? 24;
          
          // 현재 요청의 모든 targetMoves가 targetDepth 이상의 평가를 갖는지 엄격하게 확인합니다
          const allTargetMovesMet = this.lastRequest.targetMoves.every(uci => {
            const ev = localAnalysisStore.evaluations[uci];
            return ev && ev.depth >= targetDepth;
          });

          if (currentNodes >= this.lastRequest.softNodeCap && allTargetMovesMet) {
            console.info(`[StockfishWorkerAdapter] softNodeCap 도달(${currentNodes} >= ${this.lastRequest.softNodeCap}) 및 모든 targetMoves가 목표 깊이 이상 도달(${targetDepth} 이상). 조기 중단 처리합니다.`);
            this.stop();
          }
        }
      }
    }

    if (message.startsWith('bestmove')) {
      if (this.isStaircaseActive && this.staircaseStep === 'transitioning') {
        const req = this.lastRequest;
        if (req && this.worker) {
          this.staircaseStep = 'expanded';
          localAnalysisStore.setStaircaseStep('expanded');
          this.updateDiagnostics({
            staircaseStep: 'expanded'
          });
          console.info('[StockfishWorkerAdapter] 1단계 안정 국면 bestmove 접수 완료. 2단계 무제한 전체 확장 분석 준비(setMultiPv & isReady)를 수행합니다.');
          this.engineState = 'isready_sent';
          this.worker.postMessage(StockfishCommandBuilder.setMultiPv(Math.min(req.targetMoves.length, 500)));
          this.worker.postMessage(StockfishCommandBuilder.isReady());
        }
        return;
      }

      const isStoppingForRestart = this.engineState === 'stopping-for-restart' || !!this.queuedRestartRequest;
      if (!isStoppingForRestart) {
        this.isAnalysisActive = false;
        this.pendingRequest = null;
        localAnalysisStore.stopAnalysis();
      }
      
      const parsedBestMove = this.parser.parseBestMoveLine(message);
      if (parsedBestMove && this.onResultCallback) {
        this.onResultCallback({
          type: 'bestmove',
          fen: this.currentFen,
          analysisId: this.currentAnalysisId || undefined,
          ...parsedBestMove
        });
      }

      // 대기 중이던 새 기동 요청(queuedRestartRequest)이 있을 시, 락 해제 후 실행을 마저 속개합니다.
      if (this.queuedRestartRequest) {
        const req = this.queuedRestartRequest;
        this.queuedRestartRequest = null;
        // uciok/readyok 등을 이미 받은 안정적인 워커 상에서 재사용되는 흐름이므로
        // 새 분석 start()가 막힘 없이 기동되도록 상태를 안정화합니다.
        this.engineState = 'readyok_received';
        console.info('[StockfishWorkerAdapter] bestmove 완료 -> queuedRestartRequest 속개 개시', req.fen);
        this.start(req);
      }
    }
  }
}
