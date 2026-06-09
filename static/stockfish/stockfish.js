/**
 * LineWiki Local Heuristics Mock Engine for Open Beta 0
 * 
 * This mock simulates dynamic Chess evaluation outputs based on material and 
 * positional weight balances directly in the browser environment.
 * 
 * Perfect for quick-response local Chess engine UI evaluations and debugging!
 */

class StockfishLocalMockEngine {
  constructor(postMessageCallback) {
    this.postMessage = postMessageCallback;
    this.isReady = false;
    this.currentFen = "";
  }

  onMessage(message) {
    const cmd = message.trim();
    if (cmd === 'uci') {
      this.postMessage('id name LineWiki Local Heuristics Mock (임시 로컬 평가 mock)');
      this.postMessage('id author The Stockfish Developers & LineWiki');
      this.postMessage('option name Hash type spin default 16 min 1 max 33554432');
      this.postMessage('option name Threads type spin default 1 min 1 max 1024');
      this.postMessage('uciok');
    } else if (cmd === 'isready') {
      this.isReady = true;
      this.postMessage('readyok');
    } else if (cmd.startsWith('position fen ')) {
      // e.g. position fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
      this.currentFen = cmd.replace('position fen ', '').trim();
    } else if (cmd.startsWith('go ')) {
      this.startSearch(cmd);
    } else if (cmd === 'stop') {
      this.stopSearch();
    }
  }

  startSearch(goCmd) {
    // Basic heuristics based evaluation values to emit Chess score lines
    // We parse the current layout to simulate dynamic score values
    setTimeout(() => {
      if (!this.currentFen) return;
      
      const isWhiteTurn = this.currentFen.split(' ')[1] !== 'b';
      
      // Calculate a very simple material balance metric on FEN to give realistic evaluation score
      const fenBoard = this.currentFen.split(' ')[0] || "";
      let materialScore = 0;
      const weights = { 'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000 };
      
      for (let i = 0; i < fenBoard.length; i++) {
        const char = fenBoard[i];
        if (char === '/') continue;
        if (!isNaN(parseInt(char))) continue;
        
        const isWhitePiece = char === char.toUpperCase();
        const lowerChar = char.toLowerCase();
        const baseValue = weights[lowerChar] || 0;
        
        if (isWhitePiece) {
          materialScore += baseValue;
        } else {
          materialScore -= baseValue;
        }
      }

      // Convert score to engine standard centipawns relative to active player
      let centipawns = materialScore / 100;
      if (!isWhiteTurn) {
        centipawns = -centipawns;
      }

      // Add a slight variance randomized over depth updates to make engine simulation look alive!
      for (let depth = 1; depth <= 12; depth++) {
        const currentCP = centipawns + (Math.sin(depth) * 0.3) + (Math.cos(depth * 1.5) * 0.15);
        const signedCP = currentCP.toFixed(2);
        
        // Return UCI info Lines
        const timeSpent = depth * 45;
        const nodes = depth * 1420;
        const nps = 32000;
        
        // Standard Stockfish info message
        this.postMessage(`info depth ${depth} seldepth ${depth + 2} multipv 1 score cp ${Math.round(currentCP * 100)} nodes ${nodes} nps ${nps} hashfull 12 time ${timeSpent} pv e2e4 e7e5 g1f3 b8c6`);
      }
      
      // Select best move placeholder output based on typical chess heuristic
      const bestMove = isWhiteTurn ? "e2e4" : "e7e5";
      this.postMessage(`bestmove ${bestMove} ponder g1f3`);
    }, 120);
  }

  stopSearch() {
    this.postMessage('info depth 0 score cp 0 ...');
  }
}

// Global hook if called from the Worker or static context directly
if (typeof self !== 'undefined') {
  self.StockfishLocalMockEngine = StockfishLocalMockEngine;
}
