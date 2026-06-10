import type { LineSessionPort } from '../../ports/LineSessionPort';

/**
 * 앱이 정규 진입 프로세스(FEN 직접 입력, 샘플 포지션 클릭 등)를 통해 시작했음을 세션에 마킹하는 유스케이스입니다.
 */
export class StartLineSessionUseCase {
  constructor(private readonly lineSessionPort: LineSessionPort) {}

  /**
   * 앱이 시작 화면 등 공식 흐름을 타서 구성되었음을 확실히 마킹합니다.
   */
  public execute(): void {
    this.lineSessionPort.setStartedFromApp(true);
  }
}
