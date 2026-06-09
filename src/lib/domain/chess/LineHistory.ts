import type { Result } from '../../utils/result';
import { success, failure } from '../../utils/result';

export interface LineHistoryItem {
  fen: string;
  moveSan: string | null;
  from?: string | null;
  to?: string | null;
}

/**
 * 라인 연구 중 유저가 유도한 수순(Move sequence with FENs)을 저장 및 복원하는
 * 세션 수순 히스토리 일급 컬렉션 도메인 모델입니다.
 */
export class LineHistory {
  constructor(public readonly items: LineHistoryItem[] = []) {}

  /**
   * 새로운 국면과 수순 정보를 히스토리에 추가하여 전이된 새 LineHistory 객체를 반환합니다.
   */
  public push(fen: string, moveSan: string | null, from?: string | null, to?: string | null): LineHistory {
    return new LineHistory([...this.items, { fen, moveSan, from, to }]);
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

      // 데이터 검증 후 복원
      const items: LineHistoryItem[] = parsed.map((item: any) => {
        if (typeof item !== 'object' || item === null || typeof item.fen !== 'string') {
          throw new Error('역직렬화 실패: 유효하지 않은 LineHistoryItem 요소입니다.');
        }
        return {
          fen: item.fen,
          moveSan: typeof item.moveSan === 'string' ? item.moveSan : null,
          from: typeof item.from === 'string' ? item.from : null,
          to: typeof item.to === 'string' ? item.to : null
        };
      });

      return success(new LineHistory(items));
    } catch (err: any) {
      return failure(err);
    }
  }
}
