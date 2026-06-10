/**
 * Stockfish-compatible local analysis worker for LineWiki Open Beta 0
 * 
 * Executes the Stockfish-compatible static mock runtime script inside a background thread.
 * If the static file import succeeds, delegates all UCI messages to the imported
 * StockfishLocalMockEngine. Fallbacks to a robust local heuristic evaluator
 * if the script loader is unavailable.
 */

import { STOCKFISH_JS_PATH } from '../lib/config/runtimeConfig';

// Let's define the local fallback engine in case importScripts fail
class LocalFallbackEngine {
  private currentFen = '';
  private isWhiteTurn = true;
  private analysisTimeout: any = null;
  private activeMoveUci = '';

  constructor(private postMessageCallback: (msg: string) => void) {}

  public onMessage(cmd: string) {
    const trimmed = cmd.trim();

    if (trimmed === 'uci') {
      this.postMessageCallback('id name LineWiki Local Heuristics Fallback');
      this.postMessageCallback('id author LineWiki Fallback Implementation');
      this.postMessageCallback('option name Hash type spin default 16 min 1 max 33554432');
      this.postMessageCallback('option name Threads type spin default 1 min 1 max 1024');
      this.postMessageCallback('uciok');
    } else if (trimmed === 'isready') {
      this.postMessageCallback('readyok');
    } else if (trimmed.startsWith('position fen ')) {
      // Parse position command containing pure FEN
      this.currentFen = trimmed.replace('position fen ', '').trim();
      this.isWhiteTurn = this.currentFen.split(/\s+/)[1] !== 'b';
      this.activeMoveUci = '';
    } else if (trimmed.startsWith('go ')) {
      this.startAnalysis();
    } else if (trimmed === 'stop') {
      this.stopAnalysis();
    }
  }

  private stopAnalysis() {
    if (this.analysisTimeout) {
      clearTimeout(this.analysisTimeout);
      this.analysisTimeout = null;
    }

    this.activeMoveUci = '';
  }

  private startAnalysis() {
    this.stopAnalysis();
    if (!this.currentFen) return;

    const boardFen = this.currentFen.split(/\s+/)[0] || '';
    let scoreCp = 0;
    const weights: Record<string, number> = {
      'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000,
      'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000
    };

    for (let i = 0; i < boardFen.length; i++) {
      const char = boardFen[i];
      if (char === '/') continue;
      if (!isNaN(parseInt(char))) continue;

      const val = weights[char] || 0;
      const isWhite = char === char.toUpperCase();

      if (isWhite) {
        scoreCp += val;
      } else {
        scoreCp -= val;
      }
    }

    let balance = scoreCp / 100;
    if (!this.isWhiteTurn) {
      balance = -balance;
    }

    // Dynamic deviation based on ASCII values of the pure FEN string
    let moveModifier = 0;
    if (this.currentFen) {
      let charSum = 0;
      for (let i = 0; i < this.currentFen.length; i++) {
        charSum += this.currentFen.charCodeAt(i);
      }
      // Simple custom deviation between -40 and +40 centipawns
      moveModifier = (charSum % 81) - 40;
    }

    let depth = 1;
    const selfRef = this;

    function runDepthPulse() {
      // Mock fast analysis up to depth 10
      if (depth > 10) {
        const bestMove = selfRef.activeMoveUci || (selfRef.isWhiteTurn ? 'e2e4' : 'e7e5');
        selfRef.postMessageCallback(`bestmove ${bestMove}`);
        return;
      }

      const variance = Math.sin(depth + (moveModifier * 0.15)) * 12 + Math.cos(depth * 1.6) * 4;
      const centipawns = Math.round(balance * 100 + moveModifier + variance);

      const nodes = depth * 5321;
      const nps = 38000;
      const timeSpent = depth * 45;

      const targetMove = selfRef.activeMoveUci || (selfRef.isWhiteTurn ? 'e2e4' : 'e7e5');
      const counterMove = selfRef.isWhiteTurn ? 'e7e5' : 'e2e4';

      selfRef.postMessageCallback(
        `info depth ${depth} seldepth ${depth + 2} multipv 1 score cp ${centipawns} nodes ${nodes} nps ${nps} hashfull 8 time ${timeSpent} pv ${targetMove} ${counterMove}`
      );
      
      depth++;
      selfRef.analysisTimeout = setTimeout(runDepthPulse, 40);
    }

    runDepthPulse();
  }
}

type WorkerScopeWithStockfish = typeof globalThis & {
  importScripts?: (...urls: string[]) => void;
  postMessage: (message: string) => void;
  STOCKFISH?: () => {
    postMessage?: (cmd: string) => void;
    onmessage?: (eventOrMsg: MessageEvent | string) => void;
  };
  StockfishLocalMockEngine?: new (
    postMessageCallback: (msg: string) => void
  ) => {
    onMessage: (cmd: string) => void;
  };
};

const workerScope = self as unknown as WorkerScopeWithStockfish;

// Global engine instance reference
const engineInstance = new LocalFallbackEngine((msg: string) => {
  workerScope.postMessage(msg);
});

let realStockfishEngine: any = null;

try {
  // STOCKFISH_JS_PATH는 src/lib/config/runtimeConfig.ts의 정적 mock/future Stockfish script 경로와 대응됩니다.
  if (typeof workerScope.importScripts !== 'function') {
    throw new Error('importScripts is unavailable in this worker environment.');
  }

  workerScope.importScripts(STOCKFISH_JS_PATH);

  if (typeof workerScope.STOCKFISH === 'function') {
    realStockfishEngine = workerScope.STOCKFISH();
    realStockfishEngine.onmessage = (eventOrMsg: MessageEvent | string) => {
      const data =
        typeof eventOrMsg === 'object' && eventOrMsg !== null && 'data' in eventOrMsg
          ? eventOrMsg.data
          : eventOrMsg;

      if (typeof data === 'string') {
        workerScope.postMessage(data);
      }
    };
  } else if (typeof workerScope.StockfishLocalMockEngine === 'function') {
    realStockfishEngine = new workerScope.StockfishLocalMockEngine((msg: string) => {
      workerScope.postMessage(msg);
    });
  }
} catch (err) {
  // 실제 Stockfish 리소스가 배포되지 않았거나 module worker 환경에서 importScripts가 막힌 경우,
  // 아래 message handler에서 LocalFallbackEngine을 사용합니다.
  console.info('Stockfish JS load deferred or fallback used. Using Local Heuristics engine.', err);
}

// Setup the message handler
self.onmessage = (event: MessageEvent) => {
  const cmd = event.data;
  if (typeof cmd !== 'string') return;

  if (realStockfishEngine && typeof realStockfishEngine.postMessage === 'function') {
    realStockfishEngine.postMessage(cmd);
  } else if (engineInstance && typeof engineInstance.onMessage === 'function') {
    engineInstance.onMessage(cmd);
  }
};

export {};

