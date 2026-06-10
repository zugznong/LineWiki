import type { LocalAnalysisPort } from '../../ports/LocalAnalysisPort';

/**
 * 로컬 분석 엔진의 생애주기 정리를 담당하는 유스케이스입니다.
 * 페이지 이탈(onDestroy) 등에서 호출되어 백그라운드 워커와 타이머를 완전히 해제합니다.
 */
export class DisposeLocalAnalysisUseCase {
  constructor(private readonly localAnalysis: LocalAnalysisPort) {}

  public execute(): void {
    this.localAnalysis.dispose();
  }
}
