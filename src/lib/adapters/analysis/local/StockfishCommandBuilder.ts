/**
 * UCI 규격 체스 엔진과의 통신을 위해 표준 명령어 문자열을 빌드하는 유틸리티 클래스입니다.
 * Stockfish 및 호환되는 로컬 모의 평가기에 동일하게 적용 가능한 범용 UCI 프로토콜 규격을 따릅니다.
 */
export class StockfishCommandBuilder {
  /**
   * Initializes the UCI mode on the chess engine.
   */
  public static uci(): string {
    return 'uci';
  }

  /**
   * Pings the engine to verify if it is alive and receptive to further instructions.
   */
  public static isReady(): string {
    return 'isready';
  }

  /**
   * Coordinates setup of position on the board utilizing FEN syntax.
   */
  public static setPosition(fen: string): string {
    const cleanedFen = fen ? fen.trim() : '';
    return `position fen ${cleanedFen}`;
  }

  /**
   * Directs the engine to start calculating the active position up to a specified depth.
   */
  public static goDepth(depth: number = 12): string {
    const safeDepth = Math.max(1, Math.min(depth, 99));
    return `go depth ${safeDepth}`;
  }

  /**
   * Instantly stops any active deep calculations and forces the engine to output its best move found so far.
   */
  public static stop(): string {
    return 'stop';
  }

  /**
   * Commands the engine to terminate and release all allocated thread memory resources.
   */
  public static quit(): string {
    return 'quit';
  }

  /**
   * Convenience builder containing typical startup configurations to secure stable multi-threading or hash parameters.
   */
  public static setupEngine(hashMb: number = 16, threads: number = 1): string[] {
    return [
      this.uci(),
      `setoption name Hash value ${hashMb}`,
      `setoption name Threads value ${threads}`,
      this.isReady()
    ];
  }
}

