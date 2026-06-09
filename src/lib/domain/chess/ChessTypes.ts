export type Color = 'w' | 'b';

export type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type SquareName = `${File}${Rank}`;

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface PieceInfo {
  type: PieceType;
  color: Color;
}

export type MoveSan = string;
export type MoveUci = string;

export interface SquareCoordinates {
  file: File;
  rank: Rank;
}
