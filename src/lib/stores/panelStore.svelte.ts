export type PanelTabType = 'engine' | 'server' | 'notes' | 'discussion' | 'settings';

/**
 * 데스크톱 우측 다기능 분석 대시보드 패널 및 모바일 터치 하단 탭바 레이아웃에 놓인
 * 컴포넌트 뷰 액티브 인덱스(엔진 분석 / 서버 심층 분석 / 국면 메모 / 커뮤니티 토론 / 환경설정)를 전역 조율합니다.
 */
class PanelStore {
  private state = $state<{
    activeTab: PanelTabType;
  }>({
    activeTab: 'engine'
  });

  /**
   * 데스크톱 기기 및 모드 환경에서 현재 열려 있는 활성 패널 탭을 가져옵니다.
   */
  public get desktopActiveTab(): PanelTabType {
    return this.state.activeTab;
  }

  /**
   * 모바일 뷰포트 상태에서 현재 하단 탭바 터치로 활성화된 기능을 지목합니다.
   */
  public get mobileActiveTab(): PanelTabType {
    return this.state.activeTab;
  }

  /**
   * 하위 호환성 및 단일 바인딩을 위해 현재 활성화된 탭 정보를 제공합니다.
   */
  public get activeTab(): PanelTabType {
    return this.state.activeTab;
  }

  /**
   * 데스크톱 용 우측 분석 패널의 기동 탭 코드를 갱신합니다.
   */
  public setDesktopActiveTab(tab: PanelTabType) {
    this.state.activeTab = tab;
  }

  /**
   * 모바일 하단 내비게이션 탭의 기동 탭 코드를 갱신합니다.
   */
  public setMobileActiveTab(tab: PanelTabType) {
    this.state.activeTab = tab;
  }

  /**
   * 이전 컴포넌트 하위 호환성 준수를 위해 탭을 동시 활성화합니다.
   */
  public setActiveTab(tab: PanelTabType) {
    this.state.activeTab = tab;
  }

  /**
   * 모바일 헤더에서 설정 버튼 터치 시, 설정 탭을 켜거나 이미 켜져 있다면 engine 탭으로 복귀합니다.
   */
  public toggleMobileSettings() {
    if (this.state.activeTab === 'settings') {
      this.state.activeTab = 'engine';
    } else {
      this.state.activeTab = 'settings';
    }
  }
}

export const panelStore = new PanelStore();
