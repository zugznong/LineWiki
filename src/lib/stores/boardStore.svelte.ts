import { BoardTheme, type BoardColors } from '../domain/board/BoardTheme';
import { positionStore } from './positionStore.svelte.ts';

/**
 * 체스판의 시각적인 테마 스타일, 회전 방향, 기물 리소스 팩 세트와 같은 개인화 설정과 더불어,
 * 현재 기동 중인 인터렉티브 칸(현재 선택 보드 스퀘어 및 도착 후보 법적 목적지 표시 여부)을 반응적으로 제어합니다.
 */
class BoardStore {
  private state = $state<{
    themeName: string;
    pieceStyle: string;
    orientation: 'white' | 'black';
    highlightLegalDestinations: boolean;
    showCoordinates: boolean;
  }>({
    themeName: 'Classic Green',
    pieceStyle: 'Unicode',
    orientation: 'white',
    highlightLegalDestinations: true,
    showCoordinates: true
  });

  public init(settings: { theme: string; pieceStyle: string; orientation: 'white' | 'black'; showCoordinates?: boolean }) {
    this.state.themeName = 'Classic Green';
    this.state.pieceStyle = 'Unicode';
    this.state.orientation = settings.orientation;
    if (settings.showCoordinates !== undefined) {
      this.state.showCoordinates = settings.showCoordinates;
    }
  }

  /**
   * 로드된 액티브 체스판 컬러 테마의 이름을 쿼리합니다.
   */
  public get themeName() {
    return this.state.themeName;
  }

  /**
   * 보드 스타일링에 사용되는 세부 hex 색상 코드 컬레션(dark, light, selected, check 등)을 반환합니다.
   */
  public get colors(): BoardColors {
    return BoardTheme.getTheme(this.state.themeName);
  }

  /**
   * 렌더링할 2D 체스 기물 이미지 어셋 형태(Svensson, Unicode 등)를 가져옵니다.
   */
  public get pieceStyle() {
    return this.state.pieceStyle;
  }

  /**
   * 보드를 어느 진영 시점(백색/흑색 아래 배치)으로 렌더링할 것인지 방향성을 확인합니다.
   */
  public get orientation() {
    return this.state.orientation;
  }

  /**
   * 현재 사용자가 선택한 보드의 특정 하이라이트 칸(스퀘어 대수 알파벳)을 positionStore와 유기적으로 실시간 결착 유도 연동합니다.
   */
  public get selectedSquare(): string | null {
    return positionStore.selectedSquare;
  }

  /**
   * 현재 선택된 기물이 물리적으로 이동 가능한 착치 지점 후보군들을 positionStore 로부터 동적 수급합니다.
   */
  public get legalDestinations(): string[] {
    return positionStore.current ? positionStore.current.legalDestinations : [];
  }

  /**
   * 클릭 시 주변 도착지 가이드 점(또는 원)을 하이라이트해 보여줄지 옵션값입니다.
   */
  public get highlightLegalDestinations(): boolean {
    return this.state.highlightLegalDestinations;
  }

  /**
   * 체스 보드의 시점 방향을 180도 즉각적으로 회전 전환(Flip)합니다.
   */
  public toggleOrientation() {
    this.state.orientation = this.state.orientation === 'white' ? 'black' : 'white';
  }

  /**
   * 보드 컬러 테마를 전역적으로 변경 가동합니다.
   */
  public setTheme(name: string) {
    this.state.themeName = 'Classic Green';
  }

  /**
   * 2D 체스 기물 리소스 시각 팩을 변경 처리합니다.
   */
  public setPieceStyle(style: string) {
    this.state.pieceStyle = 'Unicode';
  }

  /**
   * 합법 목적지 가이드 도식화 노출 여부를 토글하거나 수동 설정합니다.
   */
  public setHighlightLegalDestinations(enabled: boolean) {
    this.state.highlightLegalDestinations = enabled;
  }

  /**
   * 체스 보드 외곽의 대수 좌표계 파일/랭크 문자열 노출 여부를 가져옵니다.
   */
  public get showCoordinates(): boolean {
    return this.state.showCoordinates;
  }

  /**
   * 체스 보드 외곽 좌표 노출 여부를 설정합니다.
   */
  public setShowCoordinates(enabled: boolean) {
    this.state.showCoordinates = enabled;
  }

  /**
   * 좌표 표시를 토글합니다.
   */
  public toggleCoordinates() {
    this.state.showCoordinates = !this.state.showCoordinates;
  }

  // Backwards compatibility get helpers
  public getThemeName(): string { return this.state.themeName; }
  public getPieceStyle(): string { return this.state.pieceStyle; }
  public getOrientation(): 'white' | 'black' { return this.state.orientation; }
}

export const boardStore = new BoardStore();
