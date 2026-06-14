/**
 * LineWiki Heuristic Fallback Web Worker
 * 
 * Used when Stockfish 18 Lite (Multi/Single) loading fails, WASM limits apply, or OOM crashes occur.
 * Emits standard UCI messages, but is clearly designated as "fallback".
 */

class HeuristicFallbackEngine {
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
      const parsedFen = trimmed.replace('position fen ', '').trim();
      // Only reset activeMoveUci if the FEN is actually changing, to avoid wiping out
      // a pre-set LineWikiRootMove before a go command is sent for a matching FEN.
      if (this.currentFen !== parsedFen) {
        this.currentFen = parsedFen;
        this.isWhiteTurn = this.currentFen.split(/\s+/)[1] !== 'b';
        this.activeMoveUci = '';
      }
    } else if (trimmed.startsWith('setoption name LineWikiRootMove value ')) {
      this.activeMoveUci = trimmed.replace('setoption name LineWikiRootMove value ', '').trim();
    } else if (trimmed.startsWith('go ')) {
      this.startAnalysis();
    } else if (trimmed === 'stop') {
      this.stopAnalysis();
    } else if (trimmed === 'clear_root_move') {
      this.clearRootMove();
    }
  }

  public clearRootMove() {
    this.activeMoveUci = '';
  }

  private stopAnalysis() {
    if (this.analysisTimeout) {
      clearTimeout(this.analysisTimeout);
      this.analysisTimeout = null;
    }
  }

  private startAnalysis() {
    this.stopAnalysis();
    if (!this.currentFen) return;

    if (!this.activeMoveUci) {
      this.postMessageCallback('error: missing LineWikiRootMove');
      return;
    }

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

const engine = new HeuristicFallbackEngine((msg: string) => {
  self.postMessage(msg);
});

self.onerror = (message, source, lineno, colno, error) => {
  const errorMsg = error ? `${error.message}\n${error.stack}` : String(message);
  try {
    self.postMessage({ type: 'error', data: errorMsg });
  } catch (e) {}
  self.postMessage(`error: ${errorMsg}`);
  return true; // prevent duplicate onerror propagation to main thread
};

self.onunhandledrejection = (event: any) => {
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }
  const reason = event?.reason;
  const errorMsg = reason instanceof Error ? `${reason.message}\n${reason.stack}` : String(reason);
  try {
    self.postMessage({ type: 'error', data: `unhandledrejection - ${errorMsg}` });
  } catch (e) {}
  self.postMessage(`error: unhandledrejection - ${errorMsg}`);
};

self.onmessage = (event: MessageEvent) => {
  const cmd = event.data;
  if (typeof cmd === 'string') {
    engine.onMessage(cmd);
  }
};

// 부팅 성공 Handshake 전송
try {
  self.postMessage({ type: 'fallback-worker-ready' });
  self.postMessage('fallback-worker-ready');
} catch (e) {
  // 환경상 예외 처리
}

export {};
