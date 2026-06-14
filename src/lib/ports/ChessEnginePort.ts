import type { Fen } from '../domain/chess/Fen';
import type { ChessMove } from '../domain/chess/ChessMove';
import type { DrawState } from '../domain/chess/DrawState';

/**
 * Chess 규칙 엔진(chess.js 등)과의 상호작용을 처리하는 외부 시스템 포트 인터페이스입니다.
 * FEN 규칙 검증, 합법수(Legal moves) 생성 및 수순 적용과 관련된 체스 핵심 연산을 정의합니다.
 */
export interface ChessEnginePort {
  /**
   * 주어진 FEN 문자열이 체스 규칙상 물리적으로 유효하고 변환 가능한 구문인지 검증합니다.
   */
  validateFen(fen: string): boolean;

  /**
   * 주어진 FEN 포지션에서 현재 차례인 플레이어의 킹이 체크 상태에 놓여있는지 확인합니다.
   */
  isCheck(fen: Fen): boolean;

  /**
   * 주어진 FEN 포지션에서 현재 플레이어가 체크메이트 상태에 도달해 게임이 종료되었는지 판단합니다.
   */
  isCheckmate(fen: Fen): boolean;

  /**
   * 스테일메이트, 기물 부족, 50수 규칙 등으로 인해 무승부(Draw) 상태인지 검증합니다.
   */
  isDraw(fen: Fen): boolean;

  /**
   * 주어진 FEN 포지션 상황에서 유효하게 실행 가능한 모든 합법 후보수(Legal Moves) 목록을 반환합니다.
   */
  getLegalMoves(fen: Fen): ChessMove[];

  /**
   * 현재 FEN 포지션에 특정 ChessMove 행위를 적용하고, 그에 따른 차기 FEN 포지션 문자열을 도출합니다.
   */
  makeMove(fen: Fen, move: ChessMove): string;

  /**
   * 구체적인 무승부 상태를 계산하여 도메인 타입 DrawState를 반환합니다.
   */
  getDrawState(fen: Fen | string, historyItems?: string[]): DrawState;
}

