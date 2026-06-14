import type { LocalAnalysisRequest } from '../domain/analysis/LocalAnalysisRequest';

/**
 * 브라우저 로컬 환경(Web Worker 등)에서 구동되는 로컬 분석기(LocalAnalysis engine)를 추상화한 포트 인터페이스입니다.
 * 비동기 분석 시작, 즉시 중단 및 분석 데이터 파싱 결과 스트림 구독 핸들러를 정의합니다.
 */
export interface LocalAnalysisPort {
  /**
   * 지정된 로컬 분석 요청 데이터를 바탕으로 로컬 분석 엔진 분석을 실시간 가동합니다.
   */
  start(request: LocalAnalysisRequest): void;

  /**
   * 엔진의 기저 설정(Threads, Hash 등)을 미리 조립 및 준비합니다.
   */
  prepare(settings: { threads: number; hash: number; multiPv?: number }): void;

  /**
   * 현재 분석 작업을 신속히 중단하고 새로운 요청 옵션으로 분석을 재킹합니다.
   */
  restart(request: LocalAnalysisRequest): void;

  /**
   * 가동 중인 로컬 백그라운드 분석 스레드 연산을 즉시 중단합니다.
   *
   * 단, stop()은 재시작 가능성을 남기며 Web Worker 자체를 반드시 종료하지는 않습니다.
   */
  stop(): void;

  /**
   * 페이지 이탈 등 생애주기 정리 시점에 로컬 분석기 리소스를 완전히 해제합니다.
   */
  dispose(): void;

  /**
   * 로컬 분석기에서 연산되어 나오는 실시간 depth, score, 주행 경로(PV) 정보를 포함한
   * 분석 결과(Evaluation)의 실시간 상태 변화 이벤트를 관찰하기 위한 구독 제어를 제공합니다.
   */
  onResult(callback: (res: any) => void): void;
}

