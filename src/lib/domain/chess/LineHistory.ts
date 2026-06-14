import type { Result } from '../../utils/result';
import { success, failure } from '../../utils/result';
import { Fen } from './Fen';
import { FenRuleValidator } from './FenRuleValidator';

export interface LineHistoryItem {
  fen: string;
  moveSan: string | null;
  from?: string | null;
  to?: string | null;
  positionKey?: string | null;
}

/**
 * 라인 연구 중 유저가 유도한 기보(Move sequence with FENs)를 저장 및 복원하는
 * 세션 기보 히스토리 일급 컬렉션 도메인 모델입니다.
 */
export class LineHistory {
  constructor(public readonly items: LineHistoryItem[] = []) {}

  /**
   * 새로운 국면과 수순 정보를 히스토리에 추가하여 전이된 새 LineHistory 객체를 반환합니다.
   */
  public push(fen: string, moveSan: string | null, from?: string | null, to?: string | null): LineHistory {
    const parts = fen.trim().split(/\s+/);
    const positionKey = parts.length >= 4 ? parts.slice(0, 4).join(' ') : null;
    return new LineHistory([...this.items, { fen, moveSan, from, to, positionKey }]);
  }

  /**
   * 히스토리를 완전 비운 새 객체를 반환합니다.
   */
  public clear(): LineHistory {
    return new LineHistory([]);
  }

  /**
   * 현재 히스토리 상태를 안전하게 JSON 문자열로 직렬화(Serialization)합니다.
   */
  public serialize(): string {
    return JSON.stringify(this.items);
  }

  /**
   * JSON 문자열을 파싱하여 LineHistory 도메인 모델로 역직렬화(Deserialization)합니다.
   */
  public static deserialize(jsonString: string): Result<LineHistory, Error> {
    try {
      if (!jsonString) {
        return success(new LineHistory([]));
      }
      
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        return failure(new Error('역직렬화 실패: 데이터가 배열 구조가 아닙니다.'));
      }

      // 최대 300수 항목 개수 상한 엄격 검증
      if (parsed.length > 300) {
        throw new Error(`역직렬화 실패: 기보 항목 개수가 최대 상한(300개)을 초과했습니다. (입력: ${parsed.length}개)`);
      }

      // 데이터 정밀 무결성 검증 후 복원
      const items: LineHistoryItem[] = [];
      for (const item of parsed) {
        if (typeof item !== 'object' || item === null || typeof item.fen !== 'string') {
          throw new Error('역직렬화 실패: 유효하지 않은 LineHistoryItem 요소입니다.');
        }

        // FEN 포지션 도메인 직접 정규화 검증 및 Canonical FEN 주입
        const fenCheck = Fen.create(item.fen);
        if (fenCheck.isFailure()) {
          throw new Error(`역직렬화 실패: 유효하지 않은 FEN 패턴이 감지되었습니다. (${item.fen})`);
        }
        const validatedFen = fenCheck.unwrap().toString();

        if (!FenRuleValidator.validateLegalSideToMoveState(validatedFen)) {
          throw new Error(`역직렬화 실패: 체스 규정 위반(차례에 맞지 않는 킹 피격 등)이 검출되었습니다. (${validatedFen})`);
        }

        const moveSan = typeof item.moveSan === 'string' ? item.moveSan : null;
        if (moveSan !== null) {
          if (moveSan.length > 12) {
            throw new Error(`역직렬화 실패: moveSan 최대 안전 길이를 초과했습니다. (${moveSan})`);
          }
          // SAN 포맷 허용 문자 패턴 엄격 검증 (일반수, 캡처 x, 프로모션 =, castling O-O/0-0 및 체크/메이트 +/# 포함)
          if (!/^(?:[a-hKQRBN]?[a-h1-8]?x?[a-h][1-8](?:=[QRBN])?|O-O-O|O-O|0-0-0|0-0)[+#]?$/i.test(moveSan)) {
            throw new Error(`역직렬화 실패: 유효하지 않은 기보 표기법 구조입니다. (${moveSan})`);
          }
        }

        const from = typeof item.from === 'string' ? item.from : null;
        if (from !== null) {
          if (!/^[a-h][1-8]$/.test(from)) {
            throw new Error(`역직렬화 실패: 유효하지 않은 출발 좌표 구조입니다. (${from})`);
          }
        }

        const to = typeof item.to === 'string' ? item.to : null;
        if (to !== null) {
          if (!/^[a-h][1-8]$/.test(to)) {
            throw new Error(`역직렬화 실패: 유효하지 않은 도착 좌표 구조입니다. (${to})`);
          }
        }

        const positionKey = typeof item.positionKey === 'string' ? item.positionKey : null;

        items.push({
          fen: validatedFen,
          moveSan,
          from,
          to,
          positionKey
        });
      }

      return success(new LineHistory(items));
    } catch (err: any) {
      return failure(err);
    }
  }
}
