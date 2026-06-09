import type { LocalAnalysisPort } from '../../ports/LocalAnalysisPort';
import type { ChessEnginePort } from '../../ports/ChessEnginePort';
import { Fen } from '../../domain/chess/Fen';

export class StartLocalAnalysisUseCase {
  constructor(
    private readonly localAnalysis: LocalAnalysisPort,
    private readonly chessEngine: ChessEnginePort
  ) {}

  public execute(fen: string, candidateMoves?: any[]): void {
    let moves = candidateMoves;
    if (!moves || moves.length === 0) {
      const fenResult = Fen.create(fen);
      if (fenResult.isOk()) {
        moves = this.chessEngine.getLegalMoves(fenResult.unwrap());
      } else {
        moves = [];
      }
    }
    this.localAnalysis.start(fen, moves);
  }
}
