import type { ServerAnalysisStatus } from '../domain/analysis/ServerAnalysisStatus';

/**
 * 고성능 서버 리소스를 활용하는 심층 원격 서버 체스 분석 처리를 위한 포트 인터페이스입니다.
 * 오픈베타 에디션 기준으로는 자원 독점 방지를 위해 항상 'disabled' 상태를 반환하도록 설계 및 고정 연결되어 있습니다.
 */
export interface ServerAnalysisPort {
  /**
   * 실시간 원격 서버 분석 엔진의 현재 가용성(활성화 여부, 지연 부하 등) 상태를 조회합니다.
   * 오픈베타 사양에서는 항상 비활성화 상태(disabled=true)를 반환합니다.
   */
  getStatus(): ServerAnalysisStatus;

  /**
   * 지정한 FEN 포지션에 대해 서버에 심층 분석을 비동기식으로 전송 및 요청합니다.
   */
  requestAnalysis(fen: string): Promise<void>;
}

