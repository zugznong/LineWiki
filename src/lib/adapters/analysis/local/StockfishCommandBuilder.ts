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
   * Coordinates setup of position on the board utilizing starting FEN and move history.
   * Can construct "position startpos moves ..." or "position fen <initial_fen> moves ..."
   * which is more standard for repetition detection.
   */
  public static setPositionWithMoves(initialFen: string, moves: string[]): string {
    const safe = ensureSafeFenString(initialFen);

    if (safe.isFailure()) {
      throw new UnsafeUciCommandError(
        `안전하지 않은 초기 FEN이 UCI position 명령어 생성에 전달되었습니다: ${safe.unwrapErr().message}`
      );
    }

    const startposFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    let cmd = "";
    
    // FEN이 시작 FEN과 일치하는 경우 startpos 처리
    const normStart = startposFen.replace(/\s+/g, ' ').trim();
    const normInitial = safe.unwrap().replace(/\s+/g, ' ').trim();
    if (normStart === normInitial) {
      cmd = "position startpos";
    } else {
      cmd = `position fen ${safe.unwrap()}`;
    }

    if (moves && moves.length > 0) {
      const uciRegex = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
      const validMoves = moves.filter(m => uciRegex.test(m.trim()));
      if (validMoves.length > 0) {
        cmd += ` moves ${validMoves.join(' ')}`;
      }
    }

    return cmd;
  }

  /**
   * Directs the engine to start calculating the active position up to a specified depth.
   */
  public static goDepth(depth: number = 12): string {
    const safeDepth = this.clampInteger(depth, 1, 99, 12);
    return `go depth ${safeDepth}`;
  }

  /**
   * Configures the threads option.
   */
  public static setThreads(threads: number): string {
    const safeThreads = this.clampInteger(threads, 1, 1024, 1);
    return `setoption name Threads value ${safeThreads}`;
  }

  /**
   * Configures the Hash size (in MB).
   */
  public static setHash(hashMb: number): string {
    const safeHash = this.clampInteger(hashMb, 16, 33554432, 16);
    return `setoption name Hash value ${safeHash}`;
  }

  /**
   * Configures the MultiPV calculation depth limit / mode.
   */
  public static setMultiPv(multiPvCount: number): string {
    const safeMultiPv = this.clampInteger(multiPvCount, 1, 500, 1);
    return `setoption name MultiPV value ${safeMultiPv}`;
  }

  /**
   * Clears accumulated Hash tables to avoid transposition artifacts.
   */
  public static clearHash(): string {
    return 'setoption name Clear Hash';
  }

  /**
   * Directs the engine to compute exactly up to specific node limits.
   */
  public static goNodes(nodes: number): string {
    const safeNodes = this.clampInteger(nodes, 1, 2000000000, 1000000);
    return `go nodes ${safeNodes}`;
  }

  /**
   * Build-up a specialized go command with nodes/depth/infinite constraints and list of candidate search moves.
   * Cleans movement syntax using strict chess coordinate regex to prevent escape commands.
   */
  public static go(params: {
    depth?: number;
    targetDepth?: number;
    nodes?: number;
    analysisMode?: 'depth' | 'nodes' | 'infinite';
    searchmoves?: string[];
  }): string {
    let cmd = 'go';
    
    let mode = params.analysisMode;
    if (!mode) {
      if (params.targetDepth !== undefined || params.depth !== undefined) {
        mode = 'depth';
      } else if (params.nodes !== undefined) {
        mode = 'nodes';
      } else {
        mode = 'depth';
      }
    }

    if (mode === 'nodes' && params.nodes !== undefined) {
      const safeNodes = this.clampInteger(params.nodes, 1, 2000000000, 1000000);
      cmd += ` nodes ${safeNodes}`;
    } else if (mode === 'infinite') {
      cmd += ' infinite';
    } else {
      // depth 모드
      const depth = params.targetDepth ?? params.depth ?? 12;
      const safeDepth = this.clampInteger(depth, 1, 99, 12);
      cmd += ` depth ${safeDepth}`;
    }

    if (params.searchmoves && params.searchmoves.length > 0) {
      const uciRegex = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
      const validMoves = params.searchmoves.filter(m => uciRegex.test(m.trim()));
      if (validMoves.length > 0) {
        cmd += ` searchmoves ${validMoves.join(' ')}`;
      }
    }
    return cmd;
  }

  /**
   * Instantly stops any active deep calculations and forces the engine to output its best move found so far.
   */
  public static stop(): string {
    return 'stop';
  }

  /**
   * Commands the engine that the next position command belongs to a new game.
   */
  public static uciNewGame(): string {
    return 'ucinewgame';
  }

  /**
   * Commands the engine to terminate and release all allocated thread memory resources.
   */
  public static quit(): string {
    return 'quit';
  }

  /**
   * [Test/Legacy Only] Convenience builder containing typical startup configurations to secure stable multi-threading or hash parameters.
   * 실제 엔진 초기화 구동 시에는 uci, setoption, isready 를 직접 세부 순차 제어하므로, 이 헬퍼는 테스트 및 검격 전용으로 사용 분리합니다.
   */
  public static setupEngine(hashMb: number = 16, threads: number = 1): string[] {
    const safeHash = this.clampInteger(hashMb, 16, 4096, 16);
    const safeThreads = this.clampInteger(threads, 1, 1024, 1);

    return [
      this.uci(),
      `setoption name Threads value ${safeThreads}`,
      `setoption name Hash value ${safeHash}`,
      this.isReady()
    ];
  }
}

