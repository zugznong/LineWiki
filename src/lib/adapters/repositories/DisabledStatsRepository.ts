import type { StatsRepositoryPort, PositionStats } from '../../ports/StatsRepositoryPort';

/**
 * 실전 기보 및 오프닝 분석 마스터즈 빅데이터 통계 레포지토리의 비활성화 격리 어댑터입니다.
 * 외부 유료/제한적 오픈 API 레이턴시 저하를 일체 차단하기 위한 오픈베타 방침으로, 데이터가 제공될 수 없음(null)을 즉시 보고합니다.
 */
export class DisabledStatsRepository implements StatsRepositoryPort {
  public async getStats(fen: string): Promise<PositionStats | null> {
    console.warn(`[실전 통계 조회 비활성화] FEN: ${fen} 에 대한 Lichess 빅데이터 전술 지표 응답이 오프라인 사유로 임시 봉인되었습니다.`);
    return Promise.resolve(null);
  }
}

