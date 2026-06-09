import type { Position } from '../domain/chess/Position';
import type { ChessMove } from '../domain/chess/ChessMove';
import { Fen } from '../domain/chess/Fen';

/**
 * 전역적인 플레이 및 탐색 국면(Chess Board Position)의 상호작용 지표들을 바인딩하는 반응형 스토어입니다.
 * 현재 FEN 포지션 구문, 파싱된 Position 도메인 엔티티, 선택된 스퀘어, 직전의 마지막 수순 이력 및 FEN 검증 예외 에러 상태를 조율합니다.
 */
class PositionStore {
  private state = $state<{
    current: Position | null;
    error: string | null;
    candidateMoves: ChessMove[];
    lastMove: { from: string; to: string } | null;
  }>({
    current: null,
    error: null,
    candidateMoves: [],
    lastMove: null
  });

  /**
   * 로드된 Position 도메인 인스턴스를 가져옵니다.
   */
  public get current() {
    return this.state.current;
  }

  /**
   * 영구 FEN 문자열 값을 가져옵니다.
   */
  public get currentFen(): string {
    return this.state.current ? this.state.current.fen : '';
  }

  /**
   * FEN 포지션 구문 파싱 상의 오류 경고 문구를 가져옵니다.
   */
  public get error() {
    return this.state.error;
  }

  /**
   * 현재 국면에서 발생 가능한 전체 합법 후보수(chess.js 산출본) 리스트를 가져옵니다.
   */
  public get candidateMoves() {
    return this.state.candidateMoves;
  }

  /**
   * 사용자가 기물 조작을 위해 현재 클릭하여 강조한 보드 상의 선택 칸입니다.
   */
  public get selectedSquare(): string | null {
    return this.state.current ? this.state.current.selectedSquare : null;
  }

  /**
   * 보드에 마지막으로 가해진 움직임({from, to} 스퀘어 좌표)을 참조합니다.
   */
  public get lastMove() {
    return this.state.lastMove;
  }

  /**
   * 새로운 체스 포지션 상황을 설정하고 관련 메타데이터를 정화 및 동기화합니다.
   */
  public setPosition(
    position: Position,
    candidateMoves: ChessMove[] = [],
    lastMove: { from: string; to: string } | null = null
  ) {
    this.state.current = position;
    this.state.error = null;
    this.state.candidateMoves = candidateMoves;
    this.state.lastMove = lastMove || position.lastMove;
  }

  /**
   * 특정 FEN 입력 파싱 등의 오류 발생 시 화면 경고용 텍스트를 할당합니다.
   */
  public setError(msg: string | null) {
    this.state.error = msg;
  }

  /**
   * 사용자의 보드 전개 기물 조작 인터랙션을 뒷받침하기 위해 피스 선택 칸 및 이동 후보 목적지를 동적 리프레시합니다.
   */
  public updateSelectedSquare(square: string | null, destinations: string[] = []) {
    if (this.state.current) {
      this.state.current = this.state.current.selectSquare(square, destinations);
    }
  }

  /**
   * 마지막 움직임을 수동으로 오버라이드하거나 커스텀 지정하기 위한 갱신창입니다.
   */
  public setLastMove(move: { from: string; to: string } | null) {
    this.state.lastMove = move;
  }
}

export const positionStore = new PositionStore();
