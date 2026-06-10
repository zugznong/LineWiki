export interface LineSessionPort {
  /**
   * 앱이 시작 화면이나 정규 경로를 통해 진입되어 구동되었는지 여부를 조회합니다.
   */
  isStartedFromApp(): boolean;

  /**
   * 앱 세션 시작 마커 플래그를 기록합니다.
   */
  setStartedFromApp(val: boolean): void;

  /**
   * 앱 세션 시작 마커 플래그 기록을 제거합니다.
   */
  clearSessionMarker(): void;
}
