import { BoardTheme, type BoardColors, type ThemeName } from '../domain/board/BoardTheme';
import { PieceStyle, type PieceStyleName } from '../domain/board/PieceStyle';
import { positionStore } from './positionStore.svelte.ts';
import type { BoardDragState } from '../domain/chess/BoardDragState';
import { PieceAssetCache } from '../application/board/PieceAssetCache';

/**
 * 체스판의 시각적인 테마 스타일, 회전 방향, 기물 리소스 팩 세트와 같은 개인화 설정과 더불어,
 * 현재 기동 중인 인터렉티브 칸(현재 선택 보드 스퀘어 및 도착 후보 법적 목적지 표시 여부)을 반응적으로 제어합니다.
 */
class BoardStore {
  private state = $state<{
    themeName: ThemeName;
    pieceStyle: PieceStyleName;
    orientation: 'white' | 'black';
    highlightLegalDestinations: boolean;
    showCoordinates: boolean;
    dragState: BoardDragState;
  }>({
    themeName: 'Classic Green',
    pieceStyle: 'Cburnett',
    orientation: 'white',
    highlightLegalDestinations: true,
    showCoordinates: true,
    dragState: { type: 'idle' }
  });

  public init(settings: { theme: string; pieceStyle: string; orientation: 'white' | 'black'; showCoordinates?: boolean }) {
    this.setTheme(settings.theme);

    // 앞/뒤 이동으로 보드가 재초기화(init)되어도 현재 변경해두었던 선택 스타일이 소멸되지 않고 그대로 보장 유지되도록 처리합니다.
    if (!this.state.pieceStyle || this.state.pieceStyle === 'Cburnett') {
      const target = settings.pieceStyle === 'Unicode' ? 'Unicode Classic' : settings.pieceStyle;
      this.setPieceStyle(target);
    } else {
      this.setPieceStyle(this.state.pieceStyle);
    }

    this.state.orientation = settings.orientation;
    if (settings.showCoordinates !== undefined) {
      this.state.showCoordinates = settings.showCoordinates;
    }
    this.state.dragState = { type: 'idle' };
  }

  /**
   * 드래그 앤 드롭 입력 모델의 상태를 쿼리합니다.
   */
  public get dragState(): BoardDragState {
    return this.state.dragState;
  }

  /**
   * 기물 대상의 누르기(PointerDown) 동작을 포착하여 예비 드래그(pressed) 상태로 진입합니다.
   */
  public beginPressDragCandidate(
    fromSquare: string,
    piece: string,
    pieceColor: 'w' | 'b',
    pointerId: number,
    startClientX: number,
    startClientY: number,
    pointerType: 'mouse' | 'pen' | 'touch' | string
  ) {
    this.state.dragState = {
      type: 'pressed',
      fromSquare,
      piece,
      pieceColor,
      pointerId,
      pointerType,
      startClientX,
      startClientY,
      currentClientX: startClientX,
      currentClientY: startClientY,
      dragIntent: 'unknown'
    };
  }

  /**
   * 임계 이동 및 이동 방향의 강세를 기준하여, 예비 드래그 상태를 실제 기물 이동 드래그(dragging)로 승격합니다.
   */
  public promoteToDragging() {
    if (this.state.dragState.type === 'pressed') {
      this.state.dragState = {
        type: 'dragging',
        fromSquare: this.state.dragState.fromSquare,
        piece: this.state.dragState.piece,
        pieceColor: this.state.dragState.pieceColor,
        pointerId: this.state.dragState.pointerId,
        pointerType: this.state.dragState.pointerType,
        startClientX: this.state.dragState.startClientX,
        startClientY: this.state.dragState.startClientY,
        currentClientX: this.state.dragState.currentClientX,
        currentClientY: this.state.dragState.currentClientY,
        dragIntent: 'drag'
      };
    }
  }

  /**
   * 실시간 포인터 움직임에 맞춰 전해진 좌표와 이동 종류(드래그/스크롤 의향 결정)를 동기화합니다.
   */
  public updateDragPosition(currentClientX: number, currentClientY: number, dragIntent?: 'unknown' | 'scroll' | 'drag') {
    if (this.state.dragState.type === 'pressed' || this.state.dragState.type === 'dragging') {
      const intent = dragIntent !== undefined ? dragIntent : this.state.dragState.dragIntent;
      
      if (this.state.dragState.type === 'dragging') {
        this.state.dragState = {
          type: 'dragging',
          fromSquare: this.state.dragState.fromSquare,
          piece: this.state.dragState.piece,
          pieceColor: this.state.dragState.pieceColor,
          pointerId: this.state.dragState.pointerId,
          pointerType: this.state.dragState.pointerType,
          startClientX: this.state.dragState.startClientX,
          startClientY: this.state.dragState.startClientY,
          currentClientX,
          currentClientY,
          dragIntent: 'drag'
        };
      } else {
        this.state.dragState = {
          type: 'pressed',
          fromSquare: this.state.dragState.fromSquare,
          piece: this.state.dragState.piece,
          pieceColor: this.state.dragState.pieceColor,
          pointerId: this.state.dragState.pointerId,
          pointerType: this.state.dragState.pointerType,
          startClientX: this.state.dragState.startClientX,
          startClientY: this.state.dragState.startClientY,
          currentClientX,
          currentClientY,
          dragIntent: intent as 'unknown' | 'scroll' | 'drag'
        };
      }
    }
  }

  /**
   * 성공적인 릴리즈 후 기물 드래그 상태를 원래대로 복원시킵니다.
   */
  public endDrag() {
    this.state.dragState = { type: 'idle' };
  }

  /**
   * 드래그 중인 기물 조작을 전부 백백하여 원위치 처리하고 수조작을 종료합니다.
   */
  public cancelDrag() {
    this.state.dragState = { type: 'idle' };
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
    const validNames = BoardTheme.getAllThemes().map(t => t.name as string);
    if (validNames.includes(name)) {
      this.state.themeName = name as ThemeName;
    } else {
      this.state.themeName = 'Classic Green';
    }
  }

  /**
   * 2D 체스 기물 리소스 시각 팩을 변경 처리합니다.
   */
  public setPieceStyle(style: string) {
    const target = style === 'Unicode' ? 'Unicode Classic' : style;
    const validStyles = PieceStyle.getAllStyles().map(s => s.name as string);
    if (validStyles.includes(target)) {
      this.state.pieceStyle = target as PieceStyleName;
    } else {
      this.state.pieceStyle = 'Cburnett';
    }

    // 유효한 SVG 스타일이 적용될 때 PieceAssetCache.preloadStyle()을 호출해 한발 앞서 프리로드 캐시를 적재합니다.
    const activeStyle = PieceStyle.getStyle(this.state.pieceStyle);
    if (activeStyle.kind === 'svg') {
      PieceAssetCache.preloadStyle(this.state.pieceStyle);
    }
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
