import { ensureSafeFenString } from '$lib/domain/chess/fenSafety';

/**
 * UCI 명령어 생성 과정에서 안전하지 않은 FEN(제어 문자/개행 등)이 감지되었을 때 발생하는 오류입니다.
 * UCI는 개행으로 명령어를 구분하므로, 검증되지 않은 FEN을 그대로 보간하면 추가 명령어가 주입될 수 있습니다.
 */
export class UnsafeUciCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUciCommandError';
  }
}

/**
 * UCI 규격 체스 엔진과의 통신을 위해 표준 명령어 문자열을 빌드하는 유틸리티 클래스입니다.
 * Stockfish 및 호환되는 로컬 모의 평가기에 동일하게 적용 가능한 범용 UCI 프로토콜 규격을 따릅니다.
 */
export class StockfishCommandBuilder {
  private static clampInteger(value: number, min: number, max: number, fallback: number): number {
    const integerValue = Number.isFinite(value) ? Math.trunc(value) : fallback;
    return Math.max(min, Math.min(integerValue, max));
  }

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
   *
   * FEN을 명령어에 보간하기 전에 중앙 안전성 검증을 거칩니다. 개행/제어 문자/널 바이트/
   * 과도한 길이 등 UCI 명령어 주입으로 이어질 수 있는 입력은 UnsafeUciCommandError로 거부됩니다.
   */
  public static setPosition(fen: string): string {
    const safe = ensureSafeFenString(fen);

    if (safe.isFailure()) {
      throw new UnsafeUciCommandError(
        `안전하지 않은 FEN이 UCI position 명령어 생성에 전달되었습니다: ${safe.unwrapErr().message}`
      );
    }

    return `position fen ${safe.unwrap()}`;
  }

  /**
   * Directs the engine to start calculating the active position up to a specified depth.
   */
  public static goDepth(depth: number = 12): string {
    const safeDepth = this.clampInteger(depth, 1, 99, 12);
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
    const safeHash = this.clampInteger(hashMb, 16, 4096, 16);
    const safeThreads = this.clampInteger(threads, 1, 1024, 1);

    return [
      this.uci(),
      `setoption name Hash value ${safeHash}`,
      `setoption name Threads value ${safeThreads}`,
      this.isReady()
    ];
  }
}

