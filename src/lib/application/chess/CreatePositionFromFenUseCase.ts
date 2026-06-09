import type { Result } from '../../utils/result';
import { success, failure } from '../../utils/result';
import { Position } from '../../domain/chess/Position';
import { Fen } from '../../domain/chess/Fen';
import type { ChessEnginePort } from '../../ports/ChessEnginePort';

export class CreatePositionFromFenUseCase {
  constructor(private readonly chessEngine: ChessEnginePort) {}

  public execute(fenStr: string): Result<Position, Error> {
    const fenResult = Fen.create(fenStr);
    if (fenResult.isFailure()) {
      return failure(fenResult.unwrapErr());
    }

    const fen = fenResult.unwrap();
    const isCheck = this.chessEngine.isCheck(fen);
    const isCheckmate = this.chessEngine.isCheckmate(fen);
    const isDraw = this.chessEngine.isDraw(fen);
    const activeColor = fen.getActiveColor() as 'w' | 'b';

    return success(
      new Position(
        fen.toString(),
        isCheck,
        isCheckmate,
        isDraw,
        [], // Initialize empty history unless recovered
        activeColor
      )
    );
  }
}
