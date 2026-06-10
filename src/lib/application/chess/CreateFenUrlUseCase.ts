import { UrlFen } from '../../domain/chess/UrlFen';
import { Fen } from '../../domain/chess/Fen';
import { FEN_PAGE_PREFIX } from '../../config/appConfig';
import type { ChessEnginePort } from '../../ports/ChessEnginePort';

export class CreateFenUrlUseCase {
  constructor(private readonly chessEngine: ChessEnginePort) {}

  public execute(fenStr: string): string {
    const fenResult = Fen.create(fenStr);
    if (fenResult.isFailure()) {
      return '';
    }
    const fen = fenResult.unwrap();
    if (!this.chessEngine.validateFen(fen.toString())) {
      return '';
    }
    const urlFen = UrlFen.fromStandardFen(fen);
    return `${FEN_PAGE_PREFIX}${urlFen.toString()}`;
  }
}
