import type { PieceType, Color } from '../chess/ChessTypes';

export class Piece {
  constructor(
    public readonly type: PieceType,
    public readonly color: Color
  ) {}

  public getUnicodeCharacter(): string {
    return Piece.getUnicodeFromSymbol(this.color === 'w' ? this.type.toUpperCase() : this.type);
  }

  /**
   * FEN 기물 심볼(대문자는 백, 소문자는 흑)에 맞춰 유니코드 체스 기물 문자를 반환합니다.
   */
  public static getUnicodeFromSymbol(symbol: string): string {
    const unicodeMap: Record<string, string> = {
      'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔',
      'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚'
    };
    return unicodeMap[symbol] || '';
  }

  public static fromSymbol(char: string): Piece | null {
    const color = char === char.toUpperCase() ? 'w' : 'b';
    const type = char.toLowerCase() as PieceType;
    if (['p', 'r', 'n', 'b', 'q', 'k'].includes(type)) {
      return new Piece(type, color);
    }
    return null;
  }
}

