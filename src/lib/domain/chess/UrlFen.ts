import type { Result } from '../../utils/result';
import { success, failure } from '../../utils/result';
import { Fen, InvalidFenError } from './Fen';

/**
 * FEN 문자열의 공백을 언더바(_)로 치환하여 URL 세그먼트나 라우트 매개변수에서 
 * 안전하게 사용할 수 있도록 지원하는 값 객체(Value Object) 모델입니다.
 * 체스 보드 구분자인 슬래시(/)는 경로 구분 등의 시나리오에 따라 그대로 유지됩니다.
 */
export class UrlFen {
  private constructor(private readonly value: string) {}

  /**
   * 표준 FEN 도메인 객체로부터 URL-safe FEN 객체를 반환합니다.
   */
  public static fromStandardFen(fen: Fen): UrlFen {
    const encoded = fen.toString().replace(/\s+/g, '_');
    return new UrlFen(encoded);
  }

  /**
   * URL-safe 인코딩된 FEN 문자열을 복원하여 표준 FEN 도메인 객체를 생성합니다.
   */
  public static toStandardFen(urlFenStr: string): Result<Fen, InvalidFenError> {
    if (!urlFenStr) {
      return failure(new InvalidFenError('URL FEN 문자열이 비어 있습니다.'));
    }
    if (urlFenStr.length > 240) {
      return failure(new InvalidFenError(`URL FEN의 길이가 너무 깁니다. (최대 240자, 현재: ${urlFenStr.length}자)`));
    }
    if (!/^[a-zA-Z0-9/_-]+$/.test(urlFenStr)) {
      return failure(new InvalidFenError('URL FEN에 허용되지 않는 특수문자나 허가되지 않은 기호가 들어갔습니다.'));
    }
    const decoded = urlFenStr.replace(/_/g, ' ');
    return Fen.create(decoded);
  }

  /**
   * 인코딩된 FEN 문자열을 반환합니다.
   */
  public toString(): string {
    return this.value;
  }
}
