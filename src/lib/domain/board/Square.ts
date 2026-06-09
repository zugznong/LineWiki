import type { File, Rank, SquareName } from '../chess/ChessTypes';

export class Square {
  constructor(
    public readonly file: File,
    public readonly rank: Rank
  ) {}

  public toString(): SquareName {
    return `${this.file}${this.rank}` as SquareName;
  }

  /**
   * file 문자를 0-based 인덱스(0 ~ 7)로 변환합니다. (a: 0, b: 1, ..., h: 7)
   */
  public getFileIndex(): number {
    const files: File[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    return files.indexOf(this.file);
  }

  /**
   * rank 숫자를 0-based 인덱스(0 ~ 7)로 변환합니다. (1: 0, 2: 1, ..., 8: 7)
   */
  public getRankIndex(): number {
    return this.rank - 1;
  }

  /**
   * 보드 방향에 따라 화면(Grid) 상의 2D Row/Col에 대응하는 렌더링 좌표를 계산합니다.
   * x는 열(Col), y는 행(Row)으로 0 ~ 7 범위를 가집니다. (좌상단이 0,0)
   */
  public getRenderCoordinates(orientation: 'white' | 'black'): { x: number; y: number } {
    const fileIdx = this.getFileIndex();
    if (orientation === 'white') {
      // white 시점: 좌측이 a열(x=0), 상단이 8행(y=0)
      return {
        x: fileIdx,
        y: 8 - this.rank
      };
    } else {
      // black 시점: 좌측이 h열(x=0), 상단이 1행(y=0)
      return {
        x: 7 - fileIdx,
        y: this.rank - 1
      };
    }
  }

  /**
   * 보드 방향에 따른 화면상의 플랫 index(0 ~ 63)를 계산합니다. (Row-major 0~63)
   */
  public getRenderIndex(orientation: 'white' | 'black'): number {
    const { x, y } = this.getRenderCoordinates(orientation);
    return y * 8 + x;
  }

  public static fromString(sqStr: string): Square | null {
    if (sqStr.length !== 2) return null;
    const file = sqStr[0] as File;
    const rank = parseInt(sqStr[1]) as Rank;
    
    if (['a','b','c','d','e','f','g','h'].includes(file) && rank >= 1 && rank <= 8) {
      return new Square(file, rank);
    }
    return null;
  }
}

