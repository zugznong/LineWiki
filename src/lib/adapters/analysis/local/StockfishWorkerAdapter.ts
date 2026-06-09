import type { LocalAnalysisPort } from '$lib/ports/LocalAnalysisPort';
import { isBrowser } from '$lib/config/runtimeConfig';
import { localAnalysisStore } from '$lib/stores/localAnalysisStore.svelte.ts';
import { StockfishCommandBuilder } from './StockfishCommandBuilder';
import { StockfishMessageParser } from './StockfishMessageParser';
import { EvalScore } from '$lib/domain/analysis/EvalScore';

export class StockfishWorkerAdapter implements LocalAnalysisPort {
  private worker: Worker | null = null;
  private onResultCallback: ((res: any) => void) | null = null;
  private currentFen: string = '';
  private readonly parser = new StockfishMessageParser();

  // 후보수별 순차 연산을 위한 큐 상태 관리 변수군
  private analysisQueue: any[] = [];
  private currentQueueIndex: number = -1;
  private activeMoveUci: string = '';

  constructor() {
    // Lazy initialization of Web Worker inside start or send
  }

  private initWorker(): void {
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
        localAnalysisStore.setError('웹 워커 실행 도중 치명적 보안 제약이나 초기화 오류가 발생했습니다.');
      };
      
      // Initialize engine options utilizing CommandBuilder
      this.send(StockfishCommandBuilder.uci());
      this.send(StockfishCommandBuilder.isReady());
    } catch (err) {
      console.error('Failed to initialize Stockfish worker:', err);
    }
  }

  private send(cmd: string): void {
    if (!this.worker && isBrowser) {
      this.initWorker();
    }
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  public start(fen: string, candidateMoves: any[] = []): void {
    if (!this.worker && isBrowser) {
      this.initWorker();
    }
    this.stop(); // 사전 실행되던 연산 완전 청소

    this.currentFen = fen;
    localAnalysisStore.startAnalysis(candidateMoves);
    
    this.analysisQueue = [...candidateMoves];
    this.currentQueueIndex = 0;
    this.activeMoveUci = '';
    
    if (this.analysisQueue.length > 0) {
      this.analyzeNextMoveInQueue();
    } else {
      localAnalysisStore.stopAnalysis();
    }
  }

  public stop(): void {
    this.analysisQueue = [];
    this.currentQueueIndex = -1;
    this.activeMoveUci = '';
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
    if (this.currentQueueIndex < 0 || this.currentQueueIndex >= this.analysisQueue.length) {
      this.activeMoveUci = '';
      localAnalysisStore.stopAnalysis();
      return;
    }
    
    const move = this.analysisQueue[this.currentQueueIndex];
    this.activeMoveUci = move.uci;

    try {
      // 후보수 적용 후 국면을 바로 resultingFen으로 세팅하여 전달
      this.send(StockfishCommandBuilder.setPosition(move.resultingFen));
      // Depth 10으로 빠르게 한 차례 분석을 완성합니다.
      this.send(StockfishCommandBuilder.goDepth(10));
    } catch {
      // 안전하지 않은 FEN이 감지되면 해당 후보수를 건너뛰고 다음 큐 항목으로 안전하게 진행합니다.
      this.currentQueueIndex++;
      this.analyzeNextMoveInQueue();
    }
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

