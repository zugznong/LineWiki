import type { Color, PieceType, SquareName, MoveSan, MoveUci } from './ChessTypes';

export class ChessMove {
  constructor(
    public readonly from: SquareName | string,
    public readonly to: SquareName | string,
    public readonly san: MoveSan,
    public readonly uci: MoveUci,
    public readonly piece: PieceType | string,
    public readonly color: Color,
    public readonly resultingFen: string,
    public readonly captured: PieceType | string | null = null,
    public readonly promotion: PieceType | string | null = null
  ) {}
}
