import type { Result } from '../utils/result';
import type { LineHistoryItem } from '../domain/chess/LineHistory';

/**
 * 단일 체스 분석 라인(FEN 전개 이력)을 세션 수준(sessionStorage 등)에 저장, 누적, 초기화하기 위한 저장 포트입니다.
 * 사용자 브라우징 액션 중 뒤로가기 대응 및 현재 분석 경로 보존을 주도합니다.
 */
export interface LineHistoryPort {
  /**
   * 세션 및 인메모리 저장소로부터 누적되어 전개된 체스 수순 무브 히스토리 배열을 안정적으로 로드합니다.
   */
  loadHistory(): Result<LineHistoryItem[], Error>;

  /**
   * 최신화된 체스 노선 수순 히스토리 배열을 영구 혹은 세션 저장소에 완전히 overwrite하여 기록합니다.
   */
  saveHistory(history: LineHistoryItem[]): Result<void, Error>;

  /**
   * 저장되어 있던 세션 수순 누적 정보를 완전히 초기화(Clear)하여 비웁니다.
   * 첫 시작 화면 신규 진입 시, 수순 오류 발견 복구 시 호출됩니다.
   */
  clearHistory(): void;
}

