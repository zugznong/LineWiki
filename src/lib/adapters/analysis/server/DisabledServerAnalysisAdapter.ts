import type { ServerAnalysisPort } from '../../../ports/ServerAnalysisPort';
import { ServerAnalysisStatus } from '../../../domain/analysis/ServerAnalysisStatus';
import { redactFen } from '../../../utils/safeLog';

/**
 * 고비용 고성능 원격 서버 분석 인터페이스의 임시 비활성화를 처리하기 위한 어댑터입니다.
 * 오픈베타 테스트 기간 동안 서버 자원의 무분별한 점유를 제한하고 안정성을 유지하기 위하여,
 * 실제 네트워크 요청을 차단하고 "Not available in open beta" 상태 사유를 즉시 반환하도록 설계되었습니다.
 */
export class DisabledServerAnalysisAdapter implements ServerAnalysisPort {
  /**
   * 실시간 원격 분석 서버의 현재 오프라인 및 사용 불가 상태를 명확한 로컬 사유 메세지와 함께 보고합니다.
   */
  public getStatus(): ServerAnalysisStatus {
    return new ServerAnalysisStatus(
      'disabled',
      0,
      'Not available in open beta (서버 분석 기능은 오픈베타 테스트 기간 동안 비활성화되어 제공되지 않습니다.)'
    );
  }

  /**
   * 서버 분석 시도가 발생할 경우 네트워크 패킷 전송을 사전에 격리 및 무효화합니다.
   */
  public async requestAnalysis(fen: string): Promise<void> {
    // 원본 FEN(사용자 연구 국면)을 로그에 남기지 않도록 비식별 토큰으로 치환합니다.
    console.warn(`[서버 분석 호출 차단] ${redactFen(fen)} 에 대한 서버 분석 요청이 오픈베타 정책 사유로 취소되었습니다.`);
    return Promise.resolve();
  }
}

