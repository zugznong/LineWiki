import type { ChessEnginePort } from '../../ports/ChessEnginePort';
import { GenerateCandidateMovesUseCase } from './GenerateCandidateMovesUseCase';
import type { PromotionPiece } from '../../domain/chess/PromotionChoice';

export class GetPromotionOptionsUseCase {
  private readonly candidateMovesUseCase: GenerateCandidateMovesUseCase;

  constructor(private readonly chessEngine: ChessEnginePort) {
    this.candidateMovesUseCase = new GenerateCandidateMovesUseCase(chessEngine);
  }

  /**
   * 해당 FEN 상황에서 from -> to로 이동할 때 필요한 프로모션 후보 리스트를 반환합니다.
   */
  public execute(fenStr: string, from: string, to: string): PromotionPiece[] {
    const candidateMoves = this.candidateMovesUseCase.execute(fenStr);
    const options = candidateMoves.moves
      .filter(m => m.from === from && m.to === to && m.promotion)
      .map(m => m.promotion as PromotionPiece);

    const uniqueOptions = Array.from(
      new Set(
        options.filter((p): p is PromotionPiece =>
          p === 'q' || p === 'r' || p === 'b' || p === 'n'
        )
      )
    );
    return uniqueOptions;
  }
}
