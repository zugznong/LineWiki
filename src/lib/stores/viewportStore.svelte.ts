import { isBrowser } from '../config/runtimeConfig';

export type LayoutModeType = 'mobile' | 'tablet' | 'desktop';

/**
 * 접속한 단말 기기의 브라우저 화면 해상도, 높이, 실시간 화면 비율, 
 * 그리고 적응형 CSS 분기를 나누기 위한 레이아웃 모드와 뷰포트에 맞추어 계산된 반응형 최적 체스보드 크기를 관제합니다.
 */
class ViewportStore {
  private state = $state<{
    width: number;
    height: number;
  }>({
    width: 1200,
    height: 800
  });

  /**
   * 브라우저 창의 실시간 내부 가로 픽셀 너비를 반환합니다.
   */
  public get width() {
    return this.state.width;
  }

  /**
   * 브라우저 창의 실시간 내부 세로 픽셀 높이를 반환합니다.
   */
  public get height() {
    return this.state.height;
  }

  /**
   * 가로 대비 세로 비율(Aspect Ratio)을 연산해 반환합니다. Zero division 방어.
   */
  public get aspectRatio(): number {
    return this.state.height > 0 ? this.state.width / this.state.height : 1.5;
  }

  /**
   * 해상도 너비 분기점(768px 미만)을 식별해 모바일 모블 상태 여부를 판단합니다.
   */
  public get isMobile(): boolean {
    return this.state.width < 768;
  }

  /**
   * 768px 이상 1024px 미만 해상도를 타블렛 단말로 정의합니다.
   */
  public get isTablet(): boolean {
    return this.state.width >= 768 && this.state.width < 1024;
  }

  /**
   * 1024px 이상의 고해상도 환경을 데스크톱 표준 뷰로 할당합니다.
   */
  public get isDesktop(): boolean {
    return this.state.width >= 1024;
  }

  /**
   * 화면 세로가 상대적으로 낮아 압축 스타일 배치가 요구되는 상황(650px 미만)입니다.
   */
  public get isShortHeight(): boolean {
    return this.state.height < 650;
  }

  /**
   * 현재 뷰포트에 의거한 반응형 단말 분류 모드('mobile' | 'tablet' | 'desktop')를 즉시 획득합니다.
   */
  public get layoutMode(): LayoutModeType {
    if (this.isMobile) return 'mobile';
    if (this.isTablet) return 'tablet';
    return 'desktop';
  }

  /**
   * 화면 픽셀 점유를 최소화하고 레이아웃 깨짐을 방지하기 위해 
   * 단말 레이아웃 모드별 세부 제약 조건을 연립하여 선제 계산된 이상적인 정방형 2D 체스판 크기(px)를 산출해 줍니다.
   */
  public get boardSize(): number {
    const { width, height } = this.state;
    if (this.isMobile) {
      // 모바일: 좌우 마진 최소 여백을 뺀 너비와 화면 높이의 42% 중 극소값으로 정원판 수용
      return Math.max(260, Math.min(width - 32, height * 0.42, 440));
    } else if (this.isTablet) {
      // 타블렛: 화면 세로 한도의 55% 또는 총 가로 크기의 반절 절충
      return Math.max(380, Math.min(width* 0.50, height - 160, 520));
    } else {
      // 데스크톱: 우측 패널(약 400px 마진) 및 헤더 영역을 철저히 뺀 쾌적 사각형
      return Math.max(480, Math.min(width - 480, height - 140, 720));
    }
  }

  /**
   * 클라이언트 측에 resize window 리스너를 결속하여 실시간 해상도 변동을 감지하고 스토어에 바인딩합니다.
   */
  public init() {
    if (!isBrowser) return;
    
    const handleResize = () => {
      this.state.width = window.innerWidth;
      this.state.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // 최초 가인식 측정
  }
}

export const viewportStore = new ViewportStore();
