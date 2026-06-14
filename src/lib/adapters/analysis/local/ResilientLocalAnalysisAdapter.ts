import type { LocalAnalysisPort } from '$lib/ports/LocalAnalysisPort';
import { isBrowser, ENABLE_HEURISTIC_FALLBACK_EVALUATIONS } from '$lib/config/runtimeConfig';
import { StockfishWorkerAdapter } from './StockfishWorkerAdapter';
import { localAnalysisStore } from '$lib/stores/localAnalysisStore.svelte.ts';
import { StockfishCommandBuilder } from './StockfishCommandBuilder';
import { StockfishMessageParser } from './StockfishMessageParser';
import { EvalScore } from '$lib/domain/analysis/EvalScore';
import { normalizeToWhitePerspective } from '$lib/domain/analysis/EvalPerspective';
import { MultiPvFrameAccumulator } from '../../../application/analysis/MultiPvFrameAccumulator';
import type { LocalAnalysisRequest } from '$lib/domain/analysis/LocalAnalysisRequest';
import { evaluationStore } from '../../../stores/evaluationStore.svelte';
import HeuristicFallbackWorker from '../../../../workers/heuristicFallback.worker.ts?worker&inline';

export class ResilientLocalAnalysisAdapter implements LocalAnalysisPort {
  private stockfishAdapter: StockfishWorkerAdapter;
  private fallbackWorker: Worker | null = null;
  private fallbackParser = new StockfishMessageParser();
  private onResultCallback: ((res: any) => void) | null = null;
  private accumulator: MultiPvFrameAccumulator | null = null;
  private lastRequest: LocalAnalysisRequest | null = null;

  // 회복성 관제 상태
  private activeFen: string = '';
  private currentCandidateMoves: any[] = [];
  private isFallbackActive: boolean = false;
  private timeoutId: any = null;
  private engineReadyPending: boolean = false;
  private uciOkTimer: any = null;
  private activeGeneration: number = 0;
  private activeTargetDepth: number = 20;
  private fallbackBootTimer: any = null;
  private fallbackWorkerReadyReceived: boolean = false;

  // 휴리스틱 큐 루프 관리 상태
  private fallbackQueue: any[] = [];
  private fallbackQueueIndex: number = -1;
  private fallbackActiveMoveUci: string = '';
  private fallbackGeneration: number = 0;
  private activeAnalysisId: string | null = null;
  private fallbackTotalGuardTimer: any = null;

  // fallback 평가를 기본 표시하지 않는 옵션 (기본값 false 로 비표시)
  private showFallbackEvaluation: boolean = ENABLE_HEURISTIC_FALLBACK_EVALUATIONS;

  private updateFallbackDiagnostics(extra: Partial<any> = {}) {
    if (typeof window === 'undefined') return;
    const prev = (window as any).__fallback_diagnostics__ || {
      workerStatus: 'uninitialized',
      errorMessage: null,
      queue: [],
      currentIndex: -1,
      fallbackActiveMoveUci: '',
      lastReceivedMessage: null,
      history: []
    };

    const nextDiagnostics = {
      ...prev,
      ...extra,
      queue: this.fallbackQueue.map(item => ({
        resultingFen: item?.resultingFen || '',
        uci: item?.uci || ''
      })),
      currentIndex: this.fallbackQueueIndex,
      fallbackActiveMoveUci: this.fallbackActiveMoveUci,
    };

    if (extra.lastReceivedMessage) {
      if (!nextDiagnostics.history) {
        nextDiagnostics.history = [];
      }
      nextDiagnostics.history.push(`${new Date().toISOString()}: ${String(extra.lastReceivedMessage).substring(0, 100)}`);
      if (nextDiagnostics.history.length > 20) {
        nextDiagnostics.history.shift();
      }
    }

    (window as any).__fallback_diagnostics__ = nextDiagnostics;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      if ((window as any).__ENABLE_FALLBACK_EVAL__ === true || 
          (window.location && typeof window.location.search === 'string' && window.location.search.includes('fallback_eval=true')) ||
          (typeof process !== 'undefined' && process.env.VITEST)) {
        this.showFallbackEvaluation = true;
      }
    }

    this.stockfishAdapter = new StockfishWorkerAdapter();
    // 주 어댑터의 결과를 감싸서 획득
    this.stockfishAdapter.onResult((res) => {
      // isFallbackActive, 세대 불합치, 혹은 분석 불가/실패 상태이면 기존 Stockfish 수신부를 전면 무시하도록 조절
      if (
        this.isFallbackActive ||
        localAnalysisStore.status === 'analysis-unavailable' ||
        localAnalysisStore.status === 'stockfish-failed' ||
        localAnalysisStore.status === 'fallback-failed' ||
        localAnalysisStore.status === 'fallback-disabled' ||
        localAnalysisStore.status === 'error' ||
        this.activeGeneration !== evaluationStore.generation ||
        (evaluationStore.activeFen && this.activeFen !== evaluationStore.activeFen)
      ) {
        return;
      }
      // 만약 지연된 구세대 세션의 기보 잔여물(analysisId 불합치)이면 과감히 무시 및 투척
      if (res && res.analysisId && res.analysisId !== this.activeAnalysisId) {
        return;
      }
      if (!this.isFallbackActive) {
        if (res && res.type === 'bestmove') {
          this.clearUciOkTimer();
          this.clearMonitoringTimeout();
        }
        if (this.accumulator && this.lastRequest) {
          const activeMultiPv = this.stockfishAdapter.getActiveMultiPvCount();
          this.accumulator.setExpectedCount(activeMultiPv);
          const completedFrame = this.accumulator.addResult(res);
          if (completedFrame) {
            localAnalysisStore.replaceEvaluationFrame(completedFrame);

            // 완료 조건: 모든 targetMoves가 depth 24 이상의 평가를 받은 상태 + 완성 프레임 기준 충족
            const req = this.lastRequest;
            const targetDepth = this.activeTargetDepth;
            const completedDepth = localAnalysisStore.completedFrameDepth ?? 0;
            const allTargetsMet = req.targetMoves.every(uci => {
              const ev = localAnalysisStore.evaluations[uci];
              return ev && ev.depth >= targetDepth;
            });

            if (completedDepth >= targetDepth && allTargetsMet) {
              console.info(`[ResilientLocalAnalysisAdapter] 전체 MultiPV 완결 프레임 수급 도달 및 최소 완성 심도(${completedDepth} >= ${targetDepth}) 완료 조건을 만족하여 성공적으로 분석을 완결 종결합니다.`);
              this.stop();
              localAnalysisStore.setStatus('completed');
              evaluationStore.setSourceStatus('completed');
            }
          }
        }
        if (this.onResultCallback) {
          this.onResultCallback(res);
        }
      }
    });

    // 주 어댑터의 ready 응답을 받아 대기 타이머 해제
    this.stockfishAdapter.onReady(() => {
      if (
        this.isFallbackActive ||
        localAnalysisStore.status === 'analysis-unavailable' ||
        localAnalysisStore.status === 'stockfish-failed' ||
        localAnalysisStore.status === 'fallback-failed' ||
        localAnalysisStore.status === 'fallback-disabled' ||
        localAnalysisStore.status === 'error' ||
        this.activeGeneration !== evaluationStore.generation ||
        (evaluationStore.activeFen && this.activeFen !== evaluationStore.activeFen)
      ) {
        return;
      }
      this.clearUciOkTimer();
      this.engineReadyPending = false;
      console.info('[ResilientLocalAnalysisAdapter] Stockfish 주 엔진이 무사히 uci/readyok 응답을 보내왔습니다.');
    });

    // 주 어댑터의 치명적 오류 또는 초기화 에러 전달 시 폴백 전환 즉시 격상 (이벤트 기반)
    this.stockfishAdapter.onFailure(() => {
      if (
        this.isFallbackActive ||
        localAnalysisStore.status === 'analysis-unavailable' ||
        localAnalysisStore.status === 'stockfish-failed' ||
        localAnalysisStore.status === 'fallback-failed' ||
        localAnalysisStore.status === 'fallback-disabled' ||
        this.activeGeneration !== evaluationStore.generation ||
        (evaluationStore.activeFen && this.activeFen !== evaluationStore.activeFen)
      ) {
        return;
      }
      if (!this.isFallbackActive) {
        console.warn('[ResilientLocalAnalysisAdapter] Stockfish 주 어댑터 실패 이벤트 수집 -> 휴리스틱 폴백 즉각 격상');
        const storeError = localAnalysisStore.errorMessage || '웹 워커 실행 결함 또는 WASM 컴파일 통과 실패';
        localAnalysisStore.setStatus('stockfish-failed');
        this.switchToFallback('Worker error', storeError);
      }
    });

    // 주 어댑터가 큐에서 재시작을 수행하여 실제로 가동된 것을 통보받을 때 처리
    this.stockfishAdapter.onRestartStarted(() => {
      if (
        this.isFallbackActive ||
        localAnalysisStore.status === 'analysis-unavailable' ||
        localAnalysisStore.status === 'stockfish-failed' ||
        localAnalysisStore.status === 'fallback-failed' ||
        localAnalysisStore.status === 'fallback-disabled' ||
        localAnalysisStore.status === 'error' ||
        this.activeGeneration !== evaluationStore.generation ||
        (evaluationStore.activeFen && this.activeFen !== evaluationStore.activeFen)
      ) {
        return;
      }
      this.clearUciOkTimer();
      this.engineReadyPending = true;
      this.activeAnalysisId = this.stockfishAdapter.currentAnalysisId;
      console.info('[ResilientLocalAnalysisAdapter] Stockfish queue 대기 해제되어 실제 가동 개시됨 (지연 타이머 경합을 방지하기 위해 독자 uciOkTimer 가드를 생성하지 않고 어댑터 이벤트만 신뢰합니다.)');
    });

    this.stockfishAdapter.onFallbackToSingle(() => {
      console.info('[ResilientLocalAnalysisAdapter] Stockfish 주 어댑터가 싱글스레드로 복구됨 감지 (지연 타이머 경합을 방지하기 위해 독자 uciOkTimer 가드를 연장하지 않고 어댑터 이벤트만 신뢰합니다.)');
      this.clearUciOkTimer();
      if (!this.isFallbackActive) {
        this.engineReadyPending = true;
        this.activeAnalysisId = this.stockfishAdapter.currentAnalysisId;
      }
    });
  }

  public setShowFallbackEvaluation(val: boolean): void {
    this.showFallbackEvaluation = val;
  }

  public getShowFallbackEvaluation(): boolean {
    return this.showFallbackEvaluation;
  }

  public prepare(settings: { threads: number; hash: number; multiPv?: number }): void {
    this.stockfishAdapter.prepare(settings);
  }

  public restart(request: LocalAnalysisRequest): void {
    // 설정 변경에 따른 restart 호출 시 바로 stop 하지 않고, 스틸 핸드셰이크 및 분석 직렬화를 위해 큐에 장전되게 처리합니다.
    this.clearUciOkTimer();
    this.clearMonitoringTimeout();
    this.engineReadyPending = false;
    this.isFallbackActive = false;
    this.fallbackActiveMoveUci = '';
    this.fallbackQueue = [];
    this.fallbackQueueIndex = -1;
    this.fallbackGeneration++;
    this.lastRequest = request;

    if (this.accumulator) {
      const finalFrame = this.accumulator.getFinalBestFrame();
      if (finalFrame.length > 0) {
        localAnalysisStore.replaceEvaluationFrame(finalFrame);
      }
      this.accumulator.clear();
    }

    this.terminateFallbackWorker();
    evaluationStore.setSourceStatus('completed');

    this.activeFen = request.fen;
    this.currentCandidateMoves = request.allCandidateMoves;
    this.activeGeneration = evaluationStore.generation;

    let finalTargetDepth = request.targetDepth ?? 24;
    if (request.budget === 'deep' || request.budget === 'infinite' || request.analysisMode === 'infinite') {
      if (finalTargetDepth < 24) {
        finalTargetDepth = 24;
      }
    }
    this.activeTargetDepth = finalTargetDepth;
    
    // 타겟 후보수 개수로 누적 프레임 버퍼 생성
    this.accumulator = new MultiPvFrameAccumulator(request.targetMoves.length);

    console.info('[ResilientLocalAnalysisAdapter] 설정 변경에 따른 직렬화 restart() 호출');
    localAnalysisStore.setRestartReason('settings-change');
    localAnalysisStore.setStatus('waiting-ready');
    const startStatus = this.stockfishAdapter.restart(request);
    this.activeAnalysisId = this.stockfishAdapter.currentAnalysisId;

    if (startStatus.queued) {
      this.engineReadyPending = false;
      console.info('[ResilientLocalAnalysisAdapter] 설정 변경 restart가 큐에 대기 배치되었습니다.');
    } else {
      this.engineReadyPending = true;
      console.info('[ResilientLocalAnalysisAdapter] 설정 변경 restart가 바로 시작되었습니다. 엔진 상태 준비 대기 시작.');
    }
  }

  public start(requestOrFen: LocalAnalysisRequest | string, legacyMoves: any[] = []): void {
    this.stop(true, 'move-transition');

    let request: LocalAnalysisRequest;
    if (typeof requestOrFen === 'string') {
      const uciMoves = legacyMoves.map((m: any) => m.uci).filter(Boolean);
      request = {
        fen: requestOrFen,
        allCandidateMoves: legacyMoves,
        targetMoves: uciMoves,
        threads: 1,
        hash: 16,
        multiPv: uciMoves.length
      };
    } else {
      request = requestOrFen;
    }

    this.activeFen = request.fen;
    this.currentCandidateMoves = request.allCandidateMoves;
    this.activeGeneration = evaluationStore.generation;
    this.lastRequest = request;

    let finalTargetDepth = request.targetDepth ?? 24;
    if (request.budget === 'deep' || request.budget === 'infinite' || request.analysisMode === 'infinite') {
      if (finalTargetDepth < 24) {
        finalTargetDepth = 24;
      }
    }
    this.activeTargetDepth = finalTargetDepth;
    this.isFallbackActive = false;

    // 타겟 후보수 개수로 누적 프레임 버퍼 생성
    this.accumulator = new MultiPvFrameAccumulator(request.targetMoves.length);

    console.info('[ResilientLocalAnalysisAdapter] 실제 Stockfish 18 분석 기동 시도');
    const startStatus = this.stockfishAdapter.start(request);
    this.activeAnalysisId = this.stockfishAdapter.currentAnalysisId;

    this.clearUciOkTimer();

    if (startStatus.queued) {
      this.engineReadyPending = false;
      console.info('[ResilientLocalAnalysisAdapter] 기존 분석 stop 대기 중이므로 엔진 실가동 인가 이벤트를 대기합니다.');
      localAnalysisStore.setStatus('transitioning');
    } else {
      this.engineReadyPending = true;
      console.info('[ResilientLocalAnalysisAdapter] 엔진 준비 상태 감지 대기 (타임아웃 핸드셰이크는 StockfishWorkerAdapter 영역에서 안전하게 담당하므로 별도 타이머를 기동하지 않습니다.)');
      localAnalysisStore.setStatus('waiting-ready');
    }

    // 250ms 감시 루프는 이벤트 기반 onFailure 리스너 및 꼼꼼한 자원 환수로 대체되어 폐기되었습니다.
    this.clearMonitoringTimeout();
  }

  // 250ms 감시 루프는 완전히 제거되고 이벤트 콜백 기반으로 이관되었습니다.

  private clearMonitoringTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private clearUciOkTimer() {
    if (this.uciOkTimer) {
      clearTimeout(this.uciOkTimer);
      this.uciOkTimer = null;
    }
  }

  public stop(keepEngineRunning: boolean = false, isRestarting: boolean | 'move-transition' | 'settings-change' = false): void {
    this.clearUciOkTimer();
    this.clearMonitoringTimeout();
    this.engineReadyPending = false;
    this.isFallbackActive = false;
    this.fallbackActiveMoveUci = '';
    this.fallbackQueue = [];
    this.fallbackQueueIndex = -1;
    this.fallbackGeneration++;
    this.lastRequest = null;

    if (this.accumulator) {
      const finalFrame = this.accumulator.getFinalBestFrame();
      if (finalFrame.length > 0) {
        localAnalysisStore.replaceEvaluationFrame(finalFrame);
      }
      this.accumulator.clear();
    }

    if (!keepEngineRunning) {
      this.stockfishAdapter.stop();
    }
    this.terminateFallbackWorker();
    
    if (isRestarting === 'move-transition' || isRestarting === true) {
      localAnalysisStore.setRestartReason('move-transition');
      localAnalysisStore.setStatus('transitioning');
    } else if (isRestarting === 'settings-change') {
      localAnalysisStore.setRestartReason('settings-change');
      localAnalysisStore.setStatus('waiting-ready');
    } else {
      localAnalysisStore.stopAnalysis();
    }
    evaluationStore.setSourceStatus('completed');
  }

  public dispose(): void {
    this.stockfishAdapter.dispose();
    this.stop();
    this.onResultCallback = null;
  }

  public onResult(callback: (res: any) => void): void {
    this.onResultCallback = callback;
  }

  private terminateFallbackWorker() {
    if (this.fallbackBootTimer) {
      clearTimeout(this.fallbackBootTimer);
      this.fallbackBootTimer = null;
    }
    if (this.fallbackTotalGuardTimer) {
      clearTimeout(this.fallbackTotalGuardTimer);
      this.fallbackTotalGuardTimer = null;
    }
    this.fallbackWorkerReadyReceived = false;

    if (this.fallbackWorker) {
      try {
        this.fallbackWorker.postMessage('stop');
        this.fallbackWorker.postMessage('quit');
      } catch {
        // 안전 예외 회피
      }
      this.fallbackWorker.onmessage = null;
      this.fallbackWorker.onerror = null;
      this.fallbackWorker.terminate();
      this.fallbackWorker = null;
    }
  }

  /**
   * 주 분석기 오작동 시 기 산출해둔 실제 결과를 유지하고, 
   * "아직 기보 가치 평가를 완료하지 않은(결과를 완성하지 못한) 후보수" 목록만 휴리스틱 워커에 넘겨 마저 분석합니다.
   */
  private switchToFallback(reason: string = 'unknown', errorMsg: string | null = null) {
    if (this.isFallbackActive) return;
    this.isFallbackActive = true;
    this.clearMonitoringTimeout();
    this.clearUciOkTimer();

    console.info(`[ResilientLocalAnalysisAdapter] 휴리스틱 Fallback 엔진으로 부드러운 전환을 수행합니다. 사유: ${reason}`);

    let rReason: 'worker-error' | 'uci-timeout' | 'asset-failed' | 'move-transition' = 'worker-error';
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes('timeout') || lowerReason.includes('time limit')) {
      rReason = 'uci-timeout';
    } else if (lowerReason.includes('load') || lowerReason.includes('not found') || lowerReason.includes('asset') || lowerReason.includes('compile')) {
      rReason = 'asset-failed';
    } else if (lowerReason.includes('transition') || lowerReason.includes('restart')) {
      rReason = 'move-transition';
    }
    localAnalysisStore.setRestartReason(rReason);

    // 스토어에 에러 원인 및 폴백 상태 지정
    localAnalysisStore.setFallbackState(reason, errorMsg);
    localAnalysisStore.setEngineBuildType('fallback');
    if (this.showFallbackEvaluation) {
      localAnalysisStore.setStatus('fallback-running');
    } else {
      this.stockfishAdapter.stop();
      this.stockfishAdapter.dispose();

      localAnalysisStore.setStatus('analysis-unavailable');
      console.info('[ResilientLocalAnalysisAdapter] fallback 평가가 비표시 상태이므로, Fallback Worker를 기동하지 않고 종료하며 최종 분석 불가를 전파합니다.');
      
      const currentEvaluations = { ...localAnalysisStore.evaluations };
      const unresolvedUcis = this.currentCandidateMoves
        .filter(move => !currentEvaluations[move.uci])
        .map(move => move.uci);
      localAnalysisStore.markUnavailableMoves(unresolvedUcis);

      evaluationStore.setSourceStatus('completed');
      return;
    }

    let finalFrame: any[] = [];
    if (this.accumulator) {
      finalFrame = this.accumulator.getFinalBestFrame();
      if (finalFrame.length > 0) {
        localAnalysisStore.replaceEvaluationFrame(finalFrame);
      }
      this.accumulator.clear();
    }

    // 주 분석기 강제 종료
    this.stockfishAdapter.stop();

    if (!isBrowser) return;

    // "아직 해결되지 않은 후보수" 선별
    const currentEvaluations = { ...localAnalysisStore.evaluations };
    
    // 만약 replaceEvaluationFrame을 보장하기 위해 finalFrame의 내용을 currentEvaluations에도 안전하게 합산 반영
    if (finalFrame && finalFrame.length > 0) {
      for (const item of finalFrame) {
        const targetUci = item.moveUci || item.rootMoveUci || item.bestMoveUci;
        if (targetUci) {
          const prev = currentEvaluations[targetUci];
          if (!prev || prev.depth < item.depth) {
            currentEvaluations[targetUci] = {
              moveSan: 'bestMoveSan' in item && item.bestMoveSan ? item.bestMoveSan : prev?.moveSan || '',
              moveUci: targetUci,
              score: item.score,
              depth: item.depth,
              source: (item.source as any) || 'local'
            };
          }
        }
      }
    }

    const unresolvedMoves = this.currentCandidateMoves.filter(move => {
      const evalItem = currentEvaluations[move.uci];
      // depth가 10 이상인 경우 완수한 무브로 봅니다
      if (!evalItem) return true;
      if (evalItem.depth === undefined || evalItem.depth < 10) return true;
      return false;
    });

    if (unresolvedMoves.length === 0) {
      console.info('[ResilientLocalAnalysisAdapter] 모든 후보의 평가 완료로 분석 종료선 전격 이주.');
      localAnalysisStore.setStatus('fallback-completed');
      evaluationStore.setSourceStatus('completed');
      return;
    }

    console.info(`[ResilientLocalAnalysisAdapter] 총 ${unresolvedMoves.length}개 잔여 무보에 대한 fallback 큐 시작.`);

    // 폴백 전용 환경에서는 병렬 MultiPV 프레임 누설 방지를 위해 Accumulator를 제거하고 즉시 적용 모드로 동작합니다.
    this.accumulator = null;

    evaluationStore.setSourceStatus('local-analyzing');

    // Fallback 워커 기동
    this.initFallbackWorker(unresolvedMoves);
  }

  private initFallbackWorker(unresolvedMoves: any[]) {
    try {
      this.terminateFallbackWorker();
      this.fallbackWorkerReadyReceived = false;

      const w = new HeuristicFallbackWorker();
      this.fallbackWorker = w;

      w.onmessage = (event) => {
        this.handleFallbackWorkerMessage(event.data);
      };

      w.onmessageerror = (err: any) => {
        const errMsg = err?.message || 'Fallback Worker Message Deserialization Failure';
        console.error('[ResilientLocalAnalysisAdapter] Fallback Worker messageerror 감지:', err);
        
        this.clearUciOkTimer();
        this.clearMonitoringTimeout();
        this.engineReadyPending = false;
        this.terminateFallbackWorker();

        const shortDiagnostic = JSON.stringify({
          kind: 'fallback-message-error',
          message: errMsg,
          filename: 'heuristicFallback.worker.ts',
          line: 0,
          phase: 'message'
        });

        // onerror/onmessageerror는 fallback-worker-load-failed처럼 명확한 원인으로 저장한다.
        localAnalysisStore.setError(`대체 분석기 로드 실패 (Heuristic fallback worker load failed - messageerror: ${errMsg})`);
        localAnalysisStore.setStatus('fallback-failed');
        localAnalysisStore.setFallbackState('error', shortDiagnostic);
        evaluationStore.setSourceStatus('error');
      };

      w.onerror = (err: any) => {
        let errMsg = 'Unknown fallback error';

        if (err instanceof Error) {
          errMsg = err.message;
        } else if (err?.error && err.error instanceof Error) {
          errMsg = err.error.message;
        } else if (err?.message) {
          errMsg = err.message;
        }

        if (errMsg === 'Unknown fallback error') {
          errMsg = 'Unknown fallback error (기동 초기화/스크립팅 블록 에러: Worker 모듈 탑로드 불가 또는 Vite 빌드 시 파일 참조 유실, CSP 규약 위반, 혹은 Worker 생성 실패)';
        }

        const filename = err?.filename || '';
        const lineno = err?.lineno || 0;

        // 추가 진단 정보 수집 (performance resource entry)
        let resourceDiagnostics: any = null;
        if (typeof window !== 'undefined' && window.performance) {
          try {
            const resources = window.performance.getEntriesByType('resource');
            const workerResources = resources.filter((r: any) => 
              r.name.includes('heuristicFallback') || r.name.includes('worker')
            );
            if (workerResources.length > 0) {
              resourceDiagnostics = workerResources.map((r: any) => ({
                url: r.name,
                duration: r.duration,
                transferSize: r.transferSize,
                initiatorType: r.initiatorType
              }));
            }
          } catch (pe) {
            // 안심 캐칭
          }
        }

        // 글로벌 진단 버퍼에 계측 정보 주입
        if (typeof window !== 'undefined') {
          (window as any).__fallback_diagnostics__ = {
            url: filename || 'unknown-worker-url',
            message: errMsg,
            status: 'failed',
            contentType: 'application/javascript',
            resourceDiagnostics
          };
          if (typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('fallback-worker-diagnostic', {
              detail: (window as any).__fallback_diagnostics__
            }));
          }
        }

        const shortDiagnosticObj = {
          kind: 'fallback-worker-load-failed',
          message: errMsg,
          filename: filename ? filename.split('/').pop() : 'heuristicFallback.worker.ts',
          line: lineno,
          phase: 'boot',
          navigatorOnline: typeof navigator !== 'undefined' ? navigator.onLine : undefined,
          resourceDiagnostics
        };
        const shortDiagnostic = JSON.stringify(shortDiagnosticObj);

        console.error('[FallbackWorkerError]', shortDiagnosticObj);

        this.clearUciOkTimer();
        this.clearMonitoringTimeout();
        this.engineReadyPending = false;
        this.terminateFallbackWorker();

        // onerror/onmessageerror는 fallback-worker-load-failed처럼 명확한 원인으로 저장한다.
        localAnalysisStore.setRestartReason('asset-failed');
        localAnalysisStore.setError(`대체 분석기 로드 실패 (Heuristic fallback worker load failed - onerror: ${errMsg})`);
        localAnalysisStore.setStatus('fallback-failed');
        localAnalysisStore.setFallbackState('error', shortDiagnostic);

        evaluationStore.setSourceStatus('error');
      };

      // 큐 가동 준비 (ready 시그널을 받을 때까지 커맨드 패스 전송을 일시 중지하고 대기)
      this.fallbackQueue = unresolvedMoves;
      this.fallbackQueueIndex = 0;
      this.fallbackActiveMoveUci = '';
      this.fallbackGeneration++;
      
      this.updateFallbackDiagnostics({
        workerStatus: 'created',
        errorMessage: null,
        lastReceivedMessage: 'Worker initialization started.'
      });

      // 3초 내에 fallback-worker-ready 시그널 수급을 감시하는 부트 타이머 시작
      this.fallbackBootTimer = setTimeout(() => {
        if (!this.fallbackWorkerReadyReceived && this.isFallbackActive) {
          console.error('[ResilientLocalAnalysisAdapter] Fallback Worker 부팅 타임아웃: Handshake (fallback-worker-ready)가 3초 이내에 도착하지 않았습니다.');
          this.handleFallbackWorkerFailure('휴리스틱 폴백 엔진 부트 타임아웃 (Worker 부팅 시간 초과: fallback-worker-ready 응답 지연)', 'fallback-boot-timeout');
        }
      }, 3000);

      // 6초 내에 폴백 전체 분석을 책임지고 최종 터미널 상태로 전이시키는 초강력 안전 가드 타이머 개시
      if (this.fallbackTotalGuardTimer) {
        clearTimeout(this.fallbackTotalGuardTimer);
      }
      this.fallbackTotalGuardTimer = setTimeout(() => {
        if (this.isFallbackActive && localAnalysisStore.status === 'fallback-running') {
          console.warn('[ResilientLocalAnalysisAdapter] 휴리스틱 폴백 전체 수행 시간 한계(6초) 초과 -> 강제 터미널 클리어 시행');
          
          this.updateFallbackDiagnostics({
            workerStatus: 'failed',
            errorMessage: 'Timeout: 6 seconds fallback guard expired.',
            lastReceivedMessage: 'fallback total timeout expired'
          });

          const currentEvaluations = { ...localAnalysisStore.evaluations };
          const unresolvedUcis = this.currentCandidateMoves
            .filter(move => !currentEvaluations[move.uci])
            .map(move => move.uci);

          if (unresolvedUcis.length > 0) {
            localAnalysisStore.markUnavailableMoves(unresolvedUcis);
          }
          
          localAnalysisStore.setStatus('fallback-completed');
          evaluationStore.setSourceStatus('completed');
          this.terminateFallbackWorker();
        }
      }, 6000);
    } catch (err: any) {
      console.error('[ResilientLocalAnalysisAdapter] Fallback Worker 기동 도중 예외:', err);
      
      const errMsg = err?.message || String(err);
      
      const shortDiagnostic = JSON.stringify({
        kind: 'fallback-init-exception',
        message: errMsg,
        filename: 'ResilientLocalAnalysisAdapter.ts',
        line: 0,
        phase: 'init'
      });
      
      this.clearUciOkTimer();
      this.clearMonitoringTimeout();
      this.engineReadyPending = false;
      this.terminateFallbackWorker();

      localAnalysisStore.setError('로컬 분석기 실행 중 복구 불가능한 장애가 발견되었습니다.');
      localAnalysisStore.setFallbackState('error', shortDiagnostic);
      evaluationStore.setSourceStatus('error');
    }
  }

  private analyzeNextMoveInFallbackQueue() {
    if (!this.fallbackWorker || !this.isFallbackActive) return;

    if (this.fallbackQueueIndex < 0 || this.fallbackQueueIndex >= this.fallbackQueue.length) {
      this.fallbackActiveMoveUci = '';
      this.updateFallbackDiagnostics({
        workerStatus: 'completed',
        lastReceivedMessage: 'Queue reached the end.'
      });
      localAnalysisStore.setStatus('fallback-completed');
      evaluationStore.setSourceStatus('completed');
      this.terminateFallbackWorker();
      return;
    }

    const move = this.fallbackQueue[this.fallbackQueueIndex];
    if (!move || !move.uci) {
      this.handleFallbackWorkerFailure('후보수 목록의 UCI 정보가 손실되거나 누락되었습니다.');
      return;
    }
    if (!move.resultingFen) {
      this.handleFallbackWorkerFailure(`후보수(${move.uci})의 결과 FEN(resultingFen)이 누락되어 대체 분석을 진행할 수 없습니다.`);
      return;
    }

    this.fallbackActiveMoveUci = move.uci;

    this.updateFallbackDiagnostics({
      workerStatus: 'running',
      lastReceivedMessage: `Starting heuristic search for move ${move.uci}`
    });

    try {
      this.fallbackWorker.postMessage(StockfishCommandBuilder.setPosition(move.resultingFen));
      this.fallbackWorker.postMessage(`setoption name LineWikiRootMove value ${move.uci}`);
      this.fallbackWorker.postMessage(StockfishCommandBuilder.goDepth(10));
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      this.handleFallbackWorkerFailure(`커맨드 구성 및 메시지 포스팅 중 에러가 발생했습니다: ${errMsg}`);
    }
  }

  private handleFallbackWorkerFailure(reason: string, kind: string = 'fallback-runtime-failure') {
    this.clearUciOkTimer();
    this.clearMonitoringTimeout();
    this.engineReadyPending = false;
    this.terminateFallbackWorker();

    let rReason: 'worker-error' | 'uci-timeout' | 'asset-failed' | 'move-transition' = 'worker-error';
    const lowerKind = kind.toLowerCase();
    const lowerReason = reason.toLowerCase();
    if (lowerKind.includes('timeout') || lowerReason.includes('timeout')) {
      rReason = 'uci-timeout';
    } else if (lowerKind.includes('load') || lowerReason.includes('load') || lowerReason.includes('not found')) {
      rReason = 'asset-failed';
    }
    localAnalysisStore.setRestartReason(rReason);

    this.updateFallbackDiagnostics({
      workerStatus: 'failed',
      errorMessage: reason,
      lastReceivedMessage: `Failure kind=${kind}, reason=${reason}`
    });

    const shortDiagnostic = JSON.stringify({
      kind,
      message: reason,
      filename: 'heuristicFallback.worker.ts',
      line: 0,
      phase: kind === 'fallback-boot-timeout' ? 'boot' : 'runtime'
    });

    localAnalysisStore.setError(`대체(Fallback) 분석 엔진 실행 중 오류 발생: ${reason}`);
    localAnalysisStore.setStatus('fallback-failed');
    localAnalysisStore.setFallbackState('error', shortDiagnostic);
    evaluationStore.setSourceStatus('error');
  }

  private processFallbackWorkerReady() {
    this.fallbackWorkerReadyReceived = true;
    if (this.fallbackBootTimer) {
      clearTimeout(this.fallbackBootTimer);
      this.fallbackBootTimer = null;
    }

    this.updateFallbackDiagnostics({
      workerStatus: 'ready',
      lastReceivedMessage: 'Handshake successful - fallback-worker-ready received.'
    });

    if (this.fallbackWorker) {
      console.info('[ResilientLocalAnalysisAdapter] Heuristic Fallback Worker Handshake 수립 성공 -> UCI / isready 주입');
      this.fallbackWorker.postMessage(StockfishCommandBuilder.uci());
      this.fallbackWorker.postMessage(StockfishCommandBuilder.isReady());
    }
  }

  private handleFallbackWorkerMessage(message: any) {
    if (!this.isFallbackActive) return;

    this.updateFallbackDiagnostics({
      lastReceivedMessage: typeof message === 'object' ? JSON.stringify(message) : message
    });

    // 구조화된 객체 메시지 우선 처리
    if (message && typeof message === 'object') {
      if (message.type === 'fallback-worker-ready') {
        this.processFallbackWorkerReady();
        return;
      }
      if (message.type === 'error') {
        console.error('[ResilientLocalAnalysisAdapter] Fallback Worker reported structured error:', message.data);
        this.handleFallbackWorkerFailure(message.data);
        return;
      }
      return;
    }

    if (typeof message !== 'string') return;

    const trimmedMsg = message.trim();

    // Heuristic Fallback Worker의 Boot Handshake 감지
    if (trimmedMsg === 'fallback-worker-ready') {
      this.processFallbackWorkerReady();
      return;
    }

    // Heuristic Fallback Worker의 readyok 도달 시점 감지 후 본격 전사 개시
    if (trimmedMsg === 'readyok') {
      if (this.fallbackWorker) {
        console.info('[ResilientLocalAnalysisAdapter] Heuristic Fallback Worker readyok 수신 성공 -> 분석 구동 개시');
        // UI 에러 메시지를 청소하고, 기존에 계산이 완료된 견고한 무브(depth >= 10)를 이월 보존하여 분석 상태를 재시작합니다.
        localAnalysisStore.restartAnalysisPreservingEvaluations(this.currentCandidateMoves, { preserveFallback: true, targetDepth: this.activeTargetDepth });

        this.analyzeNextMoveInFallbackQueue();
      }
      return;
    }

    if (message.startsWith('error') || message.includes('error:')) {
      console.error('[ResilientLocalAnalysisAdapter] Fallback Worker reported error message:', message);
      this.handleFallbackWorkerFailure(message);
      return;
    }

    // 세대 혹은 활성 FEN 불일치 시 메시지 일체 폐기
    if (evaluationStore.activeFen && (this.activeFen !== evaluationStore.activeFen || this.activeGeneration !== evaluationStore.generation)) {
      return;
    }

    if (message.trim() === 'uciok') {
      this.engineReadyPending = false;
      return;
    }

    if (message.startsWith('info depth') || message.includes('score')) {
      const move = this.fallbackQueue[this.fallbackQueueIndex];
      const targetFen = move?.resultingFen || this.activeFen;

      const parsedResult = this.fallbackParser.parseInfoLine(message, targetFen);
      if (parsedResult && this.fallbackActiveMoveUci) {
        if (parsedResult.rootMoveUci && parsedResult.rootMoveUci !== this.fallbackActiveMoveUci) {
          console.warn(`[ResilientLocalAnalysisAdapter] PV 첫 수(${parsedResult.rootMoveUci})가 예상된 fallbackActiveMoveUci(${this.fallbackActiveMoveUci})와 일치하지 않으므로 평가 반영을 전격 차단합니다.`);
          return;
        }

        const finalScore = normalizeToWhitePerspective(parsedResult.score, targetFen);

        const fallbackResult = {
          ...parsedResult,
          bestMoveUci: this.fallbackActiveMoveUci,
          score: finalScore,
          multiPvIndex: this.fallbackQueueIndex + 1,
          source: 'fallback' as const
        };

        if (this.showFallbackEvaluation) {
          if (this.onResultCallback) {
            this.onResultCallback(fallbackResult);
          }

          localAnalysisStore.addEvaluationUpdate({
            moveUci: this.fallbackActiveMoveUci,
            score: finalScore,
            depth: parsedResult.depth,
            source: 'fallback',
            nodes: parsedResult.nodes
          });
        }

        evaluationStore.setSourceStatus('local-analyzing');
      }
    }

    if (message.startsWith('bestmove')) {
      if (this.fallbackActiveMoveUci) {
        this.fallbackQueueIndex++;
        this.analyzeNextMoveInFallbackQueue();
      }
    }
  }
}
