import { describe, it, expect, vi } from 'vitest';
import { PlayMoveUseCase } from '../../src/lib/application/chess/PlayMoveUseCase';
import type { ChessEnginePort } from '../../src/lib/ports/ChessEnginePort';
import { ChessMove } from '../../src/lib/domain/chess/ChessMove';
import { Fen } from '../../src/lib/domain/chess/Fen';
import { GenerateCandidateMovesUseCase } from '../../src/lib/application/chess/GenerateCandidateMovesUseCase';
import { ChessJsEngineAdapter } from '../../src/lib/adapters/chess/ChessJsEngineAdapter';
import { positionStore } from '../../src/lib/stores/positionStore.svelte.ts';
import { CreatePositionFromFenUseCase } from '../../src/lib/application/chess/CreatePositionFromFenUseCase';

describe('PlayMoveUseCase Use Case Tests', () => {
  const startFen = Fen.START_POSITION; // rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
  const resultingFenStr = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

  it('should successfully make a move if the move is legal, returning updated fen and move notations', () => {
    // e2e4 합법수 모킹
    const e2e4Move = new ChessMove(
      'e2',
      'e4',
      'e4',
      'e2e4',
      'p',
      'w',
      resultingFenStr,
      null,
      null
    );

    const mockChessEngine = {
      validateFen: vi.fn().mockReturnValue(true),
      getLegalMoves: vi.fn().mockReturnValue([e2e4Move]),
      makeMove: vi.fn().mockReturnValue(resultingFenStr)
    } as unknown as ChessEnginePort;

    const useCase = new PlayMoveUseCase(mockChessEngine);
    const result = useCase.execute(startFen, 'e2', 'e4');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.unwrap().nextFen).toBe(resultingFenStr);
      expect(result.unwrap().san).toBe('e4');
      expect(result.unwrap().from).toBe('e2');
      expect(result.unwrap().to).toBe('e4');

      expect(mockChessEngine.getLegalMoves).toHaveBeenCalled();
      expect(mockChessEngine.makeMove).toHaveBeenCalledWith(expect.any(Fen), e2e4Move);
    }
  });

  it('should fail to execute a move if it is not in the legal moves list', () => {
    // 합법수는 e2e4만 존재하고, 사용자는 e2e3를 두려고 시도
    const e2e4Move = new ChessMove(
      'e2',
      'e4',
      'e4',
      'e2e4',
      'p',
      'w',
      resultingFenStr,
      null,
      null
    );

    const mockChessEngine = {
      validateFen: vi.fn().mockReturnValue(true),
      getLegalMoves: vi.fn().mockReturnValue([e2e4Move]),
      makeMove: vi.fn()
    } as unknown as ChessEnginePort;

    const useCase = new PlayMoveUseCase(mockChessEngine);
    const result = useCase.execute(startFen, 'e2', 'e3');

    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('둘 수 없는 수입니다.');
    expect(mockChessEngine.makeMove).not.toHaveBeenCalled();
  });

  it('should fail to execute a move if the input starting FEN string itself is malformed', () => {
    const mockChessEngine = {
      validateFen: vi.fn().mockReturnValue(false),
      getLegalMoves: vi.fn(),
      makeMove: vi.fn()
    } as unknown as ChessEnginePort;

    const useCase = new PlayMoveUseCase(mockChessEngine);
    const result = useCase.execute('invalid fen representation', 'e2', 'e4');

    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('8행으로 구성되어야 하나');
    expect(mockChessEngine.getLegalMoves).not.toHaveBeenCalled();
  });
});

describe('GenerateCandidateMovesUseCase & PositionStore Integration', () => {
  it('should generate non-empty legal moves for the starting FEN and set them in positionStore', () => {
    const chessEngine = new ChessJsEngineAdapter();
    const generateUseCase = new GenerateCandidateMovesUseCase(chessEngine);
    const createPositionUseCase = new CreatePositionFromFenUseCase(chessEngine);

    const startFen = Fen.START_POSITION;
    const moveList = generateUseCase.execute(startFen);
    
    // 시작 FEN에서는 최소 20개의 합법수가 반환되어야 함
    expect(moveList.moves.length).toBeGreaterThan(0);
    expect(moveList.moves.length).toBe(20);

    const positionResult = createPositionUseCase.execute(startFen);
    expect(positionResult.isOk()).toBe(true);

    const position = positionResult.unwrap();
    
    // setPosition 호출 시 candidateMoves가 제공되지 않을 때 빈 배열로 잘 동작하는지 검증
    positionStore.setPosition(position);
    expect(positionStore.candidateMoves).toEqual([]);

    // setPosition 호출 시 candidateMoves가 제공될 때 올바르게 스토어에 바인딩되는지 검증
    positionStore.setPosition(position, moveList.moves);
    expect(positionStore.candidateMoves.length).toBe(20);
    expect(positionStore.candidateMoves[0]).toBeInstanceOf(ChessMove);
  });
});

