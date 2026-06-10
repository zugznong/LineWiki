import type { LocalAnalysisPort } from '../../ports/LocalAnalysisPort';

/**
 * 로컬 분석기 생애주기 정리 유스케이스입니다.
 *
 * 페이지 이탈(onDestroy), 라우트 전환, 앱 종료 등에서 호출되어 Web Worker와 예약된 타이머를
 * 완전히 해제합니다. 일반적인 후보수 재분석 중단은 StopLocalAnalysisUseCase를 사용하고,
 * 화면 생애주기 종료에는 이 유스케이스를 사용합니다.
 */
export class DisposeLocalAnalysisUseCase {
  constructor(private readonly localAnalysis: LocalAnalysisPort) {}

  public execute(): void {
    this.localAnalysis.dispose();
  }
}