import type { Result } from '../../utils/result';
import { failure } from '../../utils/result';
import { Fen, InvalidFenError } from './Fen';
import { ensureSafeUrlFenSegment, ensureSafeFenString } from './fenSafety';

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

    // 1. 원본 URL 세그먼트 안전성 검증 (길이 제한, 제어 문자/꺾쇠 차단)
    const safeSegment = ensureSafeUrlFenSegment(urlFenStr);
    if (safeSegment.isFailure()) {
      return failure(safeSegment.unwrapErr());
    }

    // 2. 언더바(_) → 공백 복원 후 복원된 표준 FEN 안전성 재검증
    const decoded = safeSegment.unwrap().replace(/_/g, ' ');
    const safeDecoded = ensureSafeFenString(decoded);
    if (safeDecoded.isFailure()) {
      return failure(safeDecoded.unwrapErr());
    }

    // 3. 도메인 구조 검증 (8행 보드, 킹 개수, 각 필드 형식 등)
    return Fen.create(safeDecoded.unwrap());
  }

  /**
   * 인코딩된 FEN 문자열을 반환합니다.
   */
  public toString(): string {
    return this.value;
  }
}
