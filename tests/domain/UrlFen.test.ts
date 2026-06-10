import { describe, it, expect } from 'vitest';
import { Fen } from '../../src/lib/domain/chess/Fen';
import { UrlFen } from '../../src/lib/domain/chess/UrlFen';

describe('UrlFen Domain Value Object Tests', () => {
  it('should replace spaces with underscores while preserving slashes', () => {
    const rawStandard = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const fenResult = Fen.create(rawStandard);
    expect(fenResult.isOk()).toBe(true);

    if (fenResult.isOk()) {
      const fen = fenResult.unwrap();
      const urlFen = UrlFen.fromStandardFen(fen);

      // 공백은 모두 _로 변환되고 슬래시는 그대로 남아있어야 합니다.
      expect(urlFen.toString()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1');
    }
  });

  it('should successfully restore standard FEN from a valid UrlSafe FEN representation', () => {
    const urlSafeStr = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_b_-_-_0_2';
    const restoreResult = UrlFen.toStandardFen(urlSafeStr);

    expect(restoreResult.isOk()).toBe(true);
    if (restoreResult.isOk()) {
      const standardFen = restoreResult.unwrap();
      expect(standardFen.toString()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b - - 0 2');
      expect(standardFen.getActiveColor()).toBe('b');
      expect(standardFen.getCastlingRights()).toBe('-');
    }
  });

  it('should fail to restore Standard FEN on null or empty url-safe strings', () => {
    const emptyResult = UrlFen.toStandardFen('');
    expect(emptyResult.isFailure()).toBe(true);
    expect(emptyResult.unwrapErr().message).toContain('URL FEN 문자열이 비어 있습니다.');
  });

  it('should fail to restore Standard FEN if the formatted string after decoding is invalid', () => {
    // 8행이 아닌 비정상 구조를 복원하려는 경우 FEN 검증에서 오류가 발생해야 합니다.
    const invalidUrlSafeStr = 'rnbqkbnr/pppppppp/invalid_row_b_-__0_2';
    const result = UrlFen.toStandardFen(invalidUrlSafeStr);

    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('8행으로 구성되어야 하나');
  });

  it('should fail to restore Standard FEN if string length exceeds limit (240)', () => {
    const overlyLongStr = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1' + 'a'.repeat(200);
    const result = UrlFen.toStandardFen(overlyLongStr);
    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('URL FEN의 길이가 너무 깁니다');
  });

  it('should fail to restore Standard FEN if invalid characters are present', () => {
    // Contains script tags or other dangerous symbols like < >
    const maliciousStr = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_<script>alert(1)</script>';
    const result = UrlFen.toStandardFen(maliciousStr);
    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('URL FEN에 허용되지 않는 특수문자나 허가되지 않은 기호가 들어갔습니다.');
  });
});

