import type { Color, PieceType, PieceInfo } from './ChessTypes';

export interface BoardPiecePlacement {
  type: PieceType;
  color: Color;
}

export class Position {
  public readonly boardPieces: Map<string, BoardPiecePlacement>;

  constructor(
    public readonly fen: string,
    public readonly isCheck: boolean,
    public readonly isCheckmate: boolean,
    public readonly isDraw: boolean,
    public readonly moveHistory: string[],
    public readonly activeColor: Color,
    public readonly lastMove: { from: string; to: string } | null = null,
    public readonly selectedSquare: string | null = null,
    public readonly legalDestinations: string[] = []
  ) {
    this.boardPieces = this.parseBoardPieces(fen);
  }

  /**
   * 턴(차례) 정보를 제공합니다.
   */
  public get turn(): Color {
    return this.activeColor;
  }

  /**
   * FEN으로부터 파싱된 보드 기물 배치를 반환합니다.
   */
  private parseBoardPieces(fen: string): Map<string, BoardPiecePlacement> {
    const pieces = new Map<string, BoardPiecePlacement>();
    const boardPart = fen.split(' ')[0];
    if (!boardPart) return pieces;

    const rows = boardPart.split('/');
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (let r = 0; r < 8; r++) {
      const rowStr = rows[r];
      if (!rowStr) continue;

      let fileIdx = 0;
      for (let c = 0; c < rowStr.length; c++) {
        const char = rowStr[c];
        if (/\d/.test(char)) {
          fileIdx += parseInt(char, 10);
        } else {
          const color: Color = char === char.toUpperCase() ? 'w' : 'b';
          const type = char.toLowerCase() as PieceType;
          const square = `${files[fileIdx]}${8 - r}`;
          pieces.set(square, { type, color });
          fileIdx++;
        }
      }
    }
    return pieces;
  }

  /**
   * 특정 스퀘어를 선택하거나 법적 목적지를 지정한 전이 모델을 반환합니다.
   */
  public selectSquare(square: string | null, legalDestinations: string[] = []): Position {
    return new Position(
      this.fen,
      this.isCheck,
      this.isCheckmate,
      this.isDraw,
      this.moveHistory,
      this.activeColor,
      this.lastMove,
      square,
      legalDestinations
    );
  }
}
