import type { ChessEnginePort } from '../../ports/ChessEnginePort';
import { Fen } from '../../domain/chess/Fen';
import { MoveList } from '../../domain/chess/MoveList';

export class GenerateCandidateMovesUseCase {
  constructor(private readonly chessEngine: ChessEnginePort) {}

  public execute(fenStr: string): MoveList {
    const fenResult = Fen.create(fenStr);
    if (fenResult.isFailure()) {
      return new MoveList([]);
    }
    const fen = fenResult.unwrap();
    if (!this.chessEngine.validateFen(fen.toString())) {
      return new MoveList([]);
    }
    const moves = this.chessEngine.getLegalMoves(fen);
    return new MoveList(moves);
  }
}
