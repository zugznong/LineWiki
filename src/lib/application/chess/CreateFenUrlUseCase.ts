import { UrlFen } from '../../domain/chess/UrlFen';
import { Fen } from '../../domain/chess/Fen';
import { FEN_PAGE_PREFIX } from '../../config/appConfig';

export class CreateFenUrlUseCase {
  public execute(fenStr: string): string {
    const fenResult = Fen.create(fenStr);
    if (fenResult.isFailure()) {
      return '';
    }
    const urlFen = UrlFen.fromStandardFen(fenResult.unwrap());
    return `${FEN_PAGE_PREFIX}${urlFen.toString()}`;
  }
}
