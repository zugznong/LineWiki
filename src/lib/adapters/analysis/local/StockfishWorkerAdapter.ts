import type { LocalAnalysisPort } from '$lib/ports/LocalAnalysisPort';
import { isBrowser } from '$lib/config/runtimeConfig';
import { localAnalysisStore } from '$lib/stores/localAnalysisStore.svelte.ts';
import { StockfishCommandBuilder, UnsafeUciCommandError } from './StockfishCommandBuilder';
import { StockfishMessageParser } from './StockfishMessageParser';
import { EvalScore } from '$lib/domain/analysis/EvalScore';

export class StockfishWorkerAdapter implements LocalAnalysisPort {
  private worker: Worker | null = null;
  private onResultCallback: ((res: any) => void) | null = null;
  private currentFen: string = '';
  private readonly parser = new StockfishMessageParser();
  private hasFailed: boolean = false;
  private generation: number = 0;
  private idleCallbackId: any = null;

  // 후보수별 순차 연산을 위한 큐 상태 관리 변수군
  private analysisQueue: any[] = [];
  private currentQueueIndex: number = -1;
  private activeMoveUci: string = '';
  private currentPhase: 'quick' | 'deep' = 'quick';
  private readonly MAX_DEEP_PASS_COUNT = 8;
  private idleTimeoutId: any = null;

  constructor() {
    // Lazy initialization of Web Worker inside start or send
  }

  private initWorker(): void {
    if (this.hasFailed) return;
    try {
      // In SvelteKit/Vite, Workers can be resolved cleanly via import format
      const workerUrl = new URL('$lib/../workers/stockfish.worker.ts', import.meta.url);
      const w = new Worker(workerUrl, { type: 'module' });
      this.worker = w;

      w.onmessage = (event) => {
        const message = event.data;
        this.handleWorkerMessage(message);
      };
      
      w.onerror = (err) => {
        console.error('Stockfish Worker runtime error:', err);
        this.hasFailed = true;
        localAnalysisStore.setError('웹 워커 실행 도중 치명적 보안 제약이나 초기화 오류가 발생했습니다.');
        this.clearQueueOnFailure();
      };
      
      // Initialize engine options utilizing CommandBuilder
      this.send(StockfishCommandBuilder.uci());
      this.send(StockfishCommandBuilder.isReady());
    } catch (err) {
      console.error('Failed to initialize Stockfish worker:', err);
      this.hasFailed = true;
      localAnalysisStore.setError('로컬 분석기를 기동하는 중 예외가 발생했습니다.');
      this.clearQueueOnFailure();
    }
  }

  private clearQueueOnFailure(): void {
    this.analysisQueue = [];
    this.currentQueueIndex = -1;
    this.activeMoveUci = '';
    this.currentPhase = 'quick';
    localAnalysisStore.stopAnalysis();
  }

  private send(cmd: string): void {
    if (this.hasFailed) return;
    if (!this.worker && isBrowser) {
      this.initWorker();
    }
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  private sendPositionCommand(fen: string): boolean {
    try {
      this.send(StockfishCommandBuilder.setPosition(fen));
      return true;
    } catch (err) {
      if (err instanceof UnsafeUciCommandError) {
        console.error('[로컬 분석 보안 가드] 안전하지 않은 FEN이 감지되어 UCI position 명령 생성을 차단했습니다.');
        this.hasFailed = true;
        localAnalysisStore.setError('안전하지 않은 FEN 입력이 감지되어 로컬 분석을 중단했습니다.');
        this.clearQueueOnFailure();
        return false;
      }

      throw err;
    }
  }

  /**
   * 후보수의 전술적 우선수위를 산출해 큐 맨 앞으로 배치하기 위한 계산기입니다.
   */
  private getMovePriority(move: any): number {
    let score = 0;
    
    // 1. 체크 여부 (+) (최상위 전술 우선순위)
    if (move.san && move.san.includes('+')) {
      score += 100;
    }
    
    // 2. 기물 포획 (captured 플래그가 있거나 san에 x가 포함된 경우)
    if (move.captured || (move.san && move.san.includes('x'))) {
      score += 50;
      
      // 잡히는 기물의 가치를 반영
      if (move.captured === 'q') score += 10;
      else if (move.captured === 'r') score += 8;
      else if (move.captured === 'b' || move.captured === 'n') score += 6;
      else if (move.captured === 'p') score += 4;
    }
    
    // 3. 기물 승급/프로모션
    if (move.promotion || (move.san && move.san.includes('='))) {
      score += 40;
    }
    
    // 4. 캐슬링 (킹 보호 및 룩 가동 확대)
    if (move.san && (move.san === 'O-O' || move.san === 'O-O-O')) {
      score += 30;
    }
    
    return score;
  }

  public start(fen: string, candidateMoves: any[] = []): void {
    if (!this.worker && isBrowser) {
      this.initWorker();
    }
    this.generation++; // 새로운 분석 세션 생성
    this.stop(); // 사전 실행되던 연산 완전 청소

    this.currentFen = fen;

    // 후보수 전술 정렬 및 가중치 고지 큐 우선순위 정책 적용
    const sortedMoves = [...candidateMoves].sort((a, b) => {
      return this.getMovePriority(b) - this.getMovePriority(a);
    });

    localAnalysisStore.startAnalysis(sortedMoves);
    
    this.analysisQueue = sortedMoves;
    this.currentQueueIndex = 0;
    this.activeMoveUci = '';
    this.currentPhase = 'quick';
    
    if (this.analysisQueue.length > 0) {
      this.analyzeNextMoveInQueue();
    } else {
      localAnalysisStore.stopAnalysis();
    }
  }

  public stop(): void {
    if (this.idleTimeoutId) {
      clearTimeout(this.idleTimeoutId);
      this.idleTimeoutId = null;
    }
    if (this.idleCallbackId !== null) {
      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(this.idleCallbackId);
      }
      this.idleCallbackId = null;
    }
    this.analysisQueue = [];
    this.currentQueueIndex = -1;
    this.activeMoveUci = '';
    this.currentPhase = 'quick';
    this.send(StockfishCommandBuilder.stop());
    localAnalysisStore.stopAnalysis();
  }

  public onResult(callback: (res: any) => void): void {
    this.onResultCallback = callback;
  }

  /**
   * 큐에 정소된 가용한 다음 후보수를 산출해 본격적인 연산을 기동합니다.
   */
  private analyzeNextMoveInQueue(): void {
    if (this.idleTimeoutId) {
      clearTimeout(this.idleTimeoutId);
      this.idleTimeoutId = null;
    }

    if (this.currentQueueIndex < 0 || this.currentQueueIndex >= this.analysisQueue.length) {
      // 1단계(Quick pass)가 종료된 경우, 2단계(Deep pass)로 즉시 루프 변환 기동
      if (this.currentPhase === 'quick' && this.analysisQueue.length > 0) {
        this.currentPhase = 'deep';
        this.currentQueueIndex = 0;
        
        const move = this.analysisQueue[this.currentQueueIndex];
        this.activeMoveUci = move.uci;
        if (!this.sendPositionCommand(move.resultingFen)) return;
        this.send(StockfishCommandBuilder.goDepth(10));
        return;
      }

      this.activeMoveUci = '';
      localAnalysisStore.stopAnalysis();
      return;
    }

    // 2단계(Deep pass)이고, 순서가 MAX_DEEP_PASS_COUNT(8개) 기준선 이상이면
    // 큐 정체 방지와 브라우저 메시지 홍수 극복을 위해 "유휴 지연 실행" 정책을 분리 적용합니다.
    if (this.currentPhase === 'deep' && this.currentQueueIndex >= this.MAX_DEEP_PASS_COUNT) {
      this.activeMoveUci = '';
      const targetGen = this.generation;
      const targetFen = this.currentFen;

      if (this.idleCallbackId !== null) {
        if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
          (window as any).cancelIdleCallback(this.idleCallbackId);
        }
        this.idleCallbackId = null;
      }
      if (this.idleTimeoutId) {
        clearTimeout(this.idleTimeoutId);
        this.idleTimeoutId = null;
      }

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        this.idleCallbackId = (window as any).requestIdleCallback(() => {
          this.idleCallbackId = null;
          if (targetGen !== this.generation || targetFen !== this.currentFen) {
            return;
          }
          this.executeDeepAnalyzeWithIdleDelay(targetGen, targetFen);
        }, { timeout: 3000 });
      } else {
        this.idleTimeoutId = setTimeout(() => {
          this.idleTimeoutId = null;
          if (targetGen !== this.generation || targetFen !== this.currentFen) {
            return;
          }
          this.executeDeepAnalyzeWithIdleDelay(targetGen, targetFen);
        }, 1200);
      }
      return;
    }
    
    const move = this.analysisQueue[this.currentQueueIndex];
    this.activeMoveUci = move.uci;
    
    // 후보수 적용 후 국면을 바로 resultingFen으로 세팅하여 전달
    if (!this.sendPositionCommand(move.resultingFen)) return;
    
    if (this.currentPhase === 'quick') {
      // 1단계: 빠른 프리패스를 위해 낮은 Depth 3으로 속사포 평가
      this.send(StockfishCommandBuilder.goDepth(3));
    } else {
      // 2단계: 정밀 가용 평가 점수 업데이트를 위해 Depth 10 연동
      this.send(StockfishCommandBuilder.goDepth(10));
    }
  }

  private executeDeepAnalyzeWithIdleDelay(targetGen: number, targetFen: string): void {
    // 이미 큐가 취소되었거나 바뀐 새 시나리오가 시작되었다면 스킵
    if (
      targetGen !== this.generation ||
      targetFen !== this.currentFen ||
      this.currentPhase !== 'deep' || 
      this.currentQueueIndex < this.MAX_DEEP_PASS_COUNT || 
      this.currentQueueIndex >= this.analysisQueue.length
    ) {
      return;
    }

    const move = this.analysisQueue[this.currentQueueIndex];
    if (!move) return;

    this.activeMoveUci = move.uci;
    if (!this.sendPositionCommand(move.resultingFen)) return;
    this.send(StockfishCommandBuilder.goDepth(10));
  }

  private handleWorkerMessage(message: string): void {
    if (typeof message !== 'string') return;
    
    // Check for custom worker runtime initializer errors
    if (message.startsWith('error:')) {
      localAnalysisStore.setError(message.replace('error:', '').trim());
      return;
    }
    
    // Check for UCI engine ready response
    if (message.trim() === 'readyok') {
      if (localAnalysisStore.status !== 'analyzing' && localAnalysisStore.status !== 'completed') {
        localAnalysisStore.setReady();
      }
      return;
    }
    
    // 1. Check for standard depth info line to parse
    if (message.startsWith('info depth') || message.includes('score')) {
      const parsedResult = this.parser.parseInfoLine(message, this.currentFen);
      if (parsedResult && this.activeMoveUci) {
        let finalScore = parsedResult.score;
        
        // 턴에 따른 절대 White 방향 부호 보정 공식 실행
        const turn = this.currentFen.split(' ')[1] || 'w';
        if (turn === 'w') {
          // 백 차례에서 후보수 한 개를 가두면 다음 차례는 "흑"이 되므로, 흑 기준 스코어에 -1을 곱합니다.
          finalScore = new EvalScore(parsedResult.score.type, -parsedResult.score.value);
        } else {
          // 흑 차례에서 후보수 한 개를 가두면 다음 차례는 "백"이 되므로 스코어를 그대로 유지합니다.
          finalScore = parsedResult.score;
        }

        if (this.onResultCallback) {
          this.onResultCallback({
            ...parsedResult,
            bestMoveUci: this.activeMoveUci,
            score: finalScore
          });
        }

        // Keep localAnalysisStore fed with updates
        localAnalysisStore.addEvaluationUpdate({
          moveUci: this.activeMoveUci,
          score: finalScore,
          depth: parsedResult.depth
        });
      }
    }

    // 2. Check for fully completed bestmove line
    if (message.startsWith('bestmove')) {
      if (this.activeMoveUci) {
        // 해당 후보수의 한 턴 분석이 완수되면 다음 차례 큐로 순항
        this.currentQueueIndex++;
        this.analyzeNextMoveInQueue();
      } else {
        const parsedBestMove = this.parser.parseBestMoveLine(message);
        if (parsedBestMove && this.onResultCallback) {
          this.onResultCallback({
            type: 'bestmove',
            fen: this.currentFen,
            ...parsedBestMove
          });
        }
      }
    }
  }
}

