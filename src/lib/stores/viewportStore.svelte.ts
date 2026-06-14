import { isBrowser } from '../config/runtimeConfig';
import { getLayoutMode } from '../responsive/getLayoutMode';
import type { LayoutMode } from '../responsive/LayoutMode';

export type LayoutModeType = LayoutMode;

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
    const mode = this.layoutMode;
    return mode === 'mobile' || mode === 'mobile-landscape';
  }

  /**
   * 768px 이상 1024px 미만 해상도를 타블렛 단말로 정의합니다.
   */
  public get isTablet(): boolean {
    return this.layoutMode === 'tablet';
  }

  /**
   * 1024px 이상의 고해상도 환경 중 표준/와이드 데스크톱 뷰를 판단합니다.
   * compactDesktop, lowHeightDesktop과는 상호 배타적(Exclusive)으로 작동합니다.
   */
  public get isDesktop(): boolean {
    const mode = this.layoutMode;
    return mode === 'desktop' || mode === 'desktop-wide' || mode === 'wideShortHeight';
  }

  /**
   * 일반 데스크톱, 와이드 데스크톱, 낮은 와이드 데스크톱(wideShortHeight/extremeShortHeight) 중 3열 데스크톱 셸을 
   * 사용할 세부 레이아웃 조건을 충족하는지 가늠하는 실질적인 단일 판정 통로입니다.
   */
  public get usesDesktopShell(): boolean {
    const mode = this.layoutMode;
    if (mode === 'wideShortHeight' || mode === 'extremeShortHeight') {
      return true;
    }
    if (mode === 'desktop' || mode === 'desktop-wide') {
      return this.state.width >= 1200 && this.state.height >= 700 && this.aspectRatio >= 1.4;
    }
    return false;
  }

  public get isWideShortHeight(): boolean {
    return this.layoutMode === 'wideShortHeight';
  }

  /**
   * 화면 세로가 상대적으로 낮아 압축 스타일 배치가 요구되는 상황(650px 미만)입니다.
   */
  public get isShortHeight(): boolean {
    return this.state.height < 650 || this.layoutMode === 'short-height';
  }

  public get isCompactDesktop(): boolean {
    return this.layoutMode === 'compactDesktop';
  }

  public get isLowHeightDesktop(): boolean {
    return this.layoutMode === 'lowHeightDesktop';
  }

  /**
   * 현재 뷰포트에 의거한 반응형 단말 분류 모드를 즉시 획득합니다.
   */
  public get layoutMode(): LayoutModeType {
    return getLayoutMode(this.state.width, this.state.height);
  }

  /**
   * 화면 픽셀 점유를 최소화하고 레이아웃 깨짐을 방지하기 위해 
   * 단말 레이아웃 모드별 세부 제약 조건을 연립하여 선제 계산된 이상적인 정방형 2D 체스판 크기(px)를 산출해 줍니다.
   * [한계 사항]: 3열 레이아웃(Desktop/Wide 등)에서는 실시간으로 계산되는 보드 컬럼의 고유 가용 폭(Available column width)을 
   * 뷰포트 스토어 단에서 단독으로 엄밀히 예측/고려할 수 없습니다. 따라서 이 static getter 값은 일종의 폴백 가이드라인이며,
   * 실제 정방형 체스판 렌더링에 필요한 보드 크기의 최종 결정 및 뭉개짐(distortion) 방지는 Board.svelte 컴포넌트 내부의
   * ResizeObserver 컨테이너 측정값을 최우선적으로 따르도록 설계되었습니다.
   */
  public get boardSize(): number {
    const { width, height } = this.state;
    
    if (this.isLowHeightDesktop) {
      return Math.max(280, Math.min(width - 320, height - 120, 420));
    } else if (this.isCompactDesktop) {
      return Math.max(360, Math.min(width - 360, height - 130, 480));
    } else if (this.isMobile) {
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
  public updateDimensions(width: number, height: number) {
    this.state.width = width;
    this.state.height = height;
  }

  public init() {
    if (!isBrowser) return;
    
    const handleResize = () => {
      this.updateDimensions(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // 최초 가인식 측정
  }
}

export const viewportStore = new ViewportStore();
