/**
 * 특정 국면(FEN)이 실제 마스터즈 게임이나 온라인 실전 체스 판에서
 * 어떤 결과 분포(백 승리 비율, 무승부 비율, 흑 승리 비율, 빈도수 등)를 가졌는지 조율하는 외부 빅데이터 통계 조회 포트입니다.
 */
export interface PositionStats {
  gamesPlayed: number;
  whiteWinsPercent: number;
  drawsPercent: number;
  blackWinsPercent: number;
}

/**
 * 실전 기보 통계 데이터베이스(Lichess Opening Explorer 등)와 연동되어 포지션 통계를 관제하는 레포지토리 저장소 포트입니다.
 * 오픈베타 사양 또는 오프라인 단독 구동 시에는 일시적 'unavailable' 상태를 뜻하는 null 이펙트를 안전하게 검출하고 UI가 자동 대응하도록 설계되어 있습니다.
 */
export interface StatsRepositoryPort {
  /**
   * 지정한 FEN 포지션의 전 세계 실전 기보 빅데이터 통계 지표를 탐색합니다.
   * 연동 미보장 영역이거나 오프라인인 경우 결과는 null을 리턴(unavailable)하여 방어책을 발휘합니다.
   */
  getStats(fen: string): Promise<PositionStats | null>;
}

