import type { Result } from '../../utils/result';
import { success, failure } from '../../utils/result';
import { UrlFen } from '../../domain/chess/UrlFen';
import type { ChessEnginePort } from '../../ports/ChessEnginePort';

export class RestoreFenFromUrlUseCase {
  constructor(private readonly chessEngine: ChessEnginePort) {} // We can check FEN validation with chessEngine

  public execute(urlFenParam: string): Result<string, Error> {
    const fenResult = UrlFen.toStandardFen(urlFenParam);
    if (fenResult.isFailure()) {
      return failure(fenResult.unwrapErr());
    }

    const fen = fenResult.unwrap().toString();
    const isValid = this.chessEngine.validateFen(fen);
    if (!isValid) {
      return failure(new Error('전달된 체스 FEN 코드가 검증 규칙에 통과하지 못했습니다.'));
    }

    return success(fen);
  }
}
