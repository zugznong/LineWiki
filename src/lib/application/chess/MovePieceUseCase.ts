import type { Result } from '../../utils/result';
import { success, failure } from '../../utils/result';
import type { ChessEnginePort } from '../../ports/ChessEnginePort';
import { GenerateCandidateMovesUseCase } from './GenerateCandidateMovesUseCase';
import { Fen } from '../../domain/chess/Fen';

export interface PlayedMoveResult {
  previousFen: string;
  nextFen: string;
  san: string;
  from: string;
  to: string;
}

export class MovePieceUseCase {
  private readonly candidateMovesUseCase: GenerateCandidateMovesUseCase;

  constructor(private readonly chessEngine: ChessEnginePort) {
    this.candidateMovesUseCase = new GenerateCandidateMovesUseCase(chessEngine);
  }

  public execute(fenStr: string, from: string, to: string, promotion?: string): Result<PlayedMoveResult, Error> {
    const fenResult = Fen.create(fenStr);
    if (fenResult.isFailure()) {
      return failure(fenResult.unwrapErr());
    }

    const currentFen = fenResult.unwrap();
    const candidateMoves = this.candidateMovesUseCase.execute(fenStr);
    const matched = candidateMoves.findMove(from, to, promotion);

    if (!matched) {
      return failure(new Error('둘 수 없는 수입니다. (합법수가 아님)'));
    }

    const nextFenStr = this.chessEngine.makeMove(currentFen, matched);
    return success({
      previousFen: fenStr,
      nextFen: nextFenStr,
      san: matched.san,
      from: matched.from,
      to: matched.to
    });
  }
}
export { PlayMoveUseCase as PlayMoveUseCaseAlias } from './PlayMoveUseCase';
