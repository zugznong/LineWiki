/**
 * 브라우저 로컬 환경(Web Worker 등)에서 구동되는 로컬 분석기(LocalAnalysis engine)를 추상화한 포트 인터페이스입니다.
 * 비동기 분석 시작, 즉시 중단 및 분석 데이터 파싱 결과 스트림 구독 핸들러를 정의합니다.
 */
export interface LocalAnalysisPort {
  /**
   * 지정된 FEN 및 해당 상황의 합법 후보수 목록을 전달받아 로컬 백그라운드 분석 엔진 분석을 실시간 가동합니다.
   */
  start(fen: string, candidateMoves?: any[]): void;

  /**
   * 가동 중인 로컬 백그라운드 분석 스레드 연산을 즉시 중단해 브라우저 자원을 릴리즈합니다.
   */
  stop(): void;

  /**
   * 로컬 분석기에서 연산되어 나오는 실시간 depth, score, 주행 경로(PV) 정보를 포함한
   * 분석 결과(Evaluation)의 실시간 상태 변화 이벤트를 관찰하기 위한 구독 제어를 제공합니다.
   */
  onResult(callback: (res: any) => void): void;

  /**
   * 분석을 중단하고 백그라운드 워커/타이머 등 모든 자원을 완전히 해제합니다.
   * 페이지 이탈 등 생애주기 정리 시점(onDestroy)에 호출됩니다.
   */
  dispose(): void;
}

