import type { Result } from '../../utils/result';
import { success, failure } from '../../utils/result';

export class InvalidFenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFenError';
  }
}

export class Fen {
  // 시작 포지션 상수 (Standard Starting Position FEN)
  public static readonly START_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  private constructor(private readonly value: string) {}

  /**
   * FEN 문자열을 유연하게 검증 및 정규화(Canonicalization)하여 값을 생성합니다.
   */
  public static create(fen: string): Result<Fen, InvalidFenError> {
    if (!fen) {
      return failure(new InvalidFenError('FEN 문자열이 비어 있습니다.'));
    }

    // 1. 언더바(_) 유연 복원 전처리 및 연속된 공백 제거 및 양끝 여백 제거 (정규화)
    let processed = fen.trim();
    if (processed.includes('_')) {
      processed = processed.replace(/_/g, ' ');
    }
    const normalized = processed.replace(/\s+/g, ' ');
    const parts = normalized.split(' ');

    if (parts.length < 1) {
      return failure(new InvalidFenError('FEN 형식이 잘못되었습니다. 기물 위치 정보가 빠졌습니다.'));
    }

    if (parts.length > 6) {
      return failure(new InvalidFenError(`FEN 형식이 잘못되었습니다. 필드의 개수가 6개를 초과할 수 없습니다. 현재 필드 수: ${parts.length}`));
    }

    // 2. 기물 배치 필드(1번째 필드) 슬래시 검사 및 보드 기물/칸수 검증
    const boardPart = parts[0];
    const rows = boardPart.split('/');
    if (rows.length !== 8) {
      return failure(new InvalidFenError(`FEN 기물 보드는 8행으로 구성되어야 하나, ${rows.length}행입니다.`));
    }

    let whiteKingCount = 0;
    let blackKingCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let colSum = 0;
      for (let j = 0; j < row.length; j++) {
        const char = row[j];
        if (/[1-8]/.test(char)) {
          colSum += parseInt(char, 10);
        } else if (/[prnbqkPRNBQK]/.test(char)) {
          colSum += 1;
          if (char === 'K') whiteKingCount++;
          if (char === 'k') blackKingCount++;
        } else {
          return failure(new InvalidFenError(`유효하지 않은 기물 혹은 문자 '${char}'가 기물 보드에 포함되어 있습니다.`));
        }
      }
      if (colSum !== 8) {
        return failure(new InvalidFenError(`기물 보드의 ${i + 1}번째 행의 칸 수의 합이 8이어야 하나, ${colSum}입니다.`));
      }
    }

    if (whiteKingCount !== 1) {
      return failure(new InvalidFenError(`백색 킹(K)은 반드시 1개 존재해야 합니다. 현재: ${whiteKingCount}개`));
    }
    if (blackKingCount !== 1) {
      return failure(new InvalidFenError(`흑색 킹(k)은 반드시 1개 존재해야 합니다. 현재: ${blackKingCount}개`));
    }

    // 3. 필드 채우기 (정규화 - 6개의 표준 필드로 보증)
    // 1: board, 2: turn, 3: castling, 4: en passant, 5: halfmove clock, 6: fullmove number
    const activeColor = parts[1] || 'w';
    const castling = parts[2] || '-';
    const enPassant = parts[3] || '-';
    const halfmove = parts[4] || '0';
    const fullmove = parts[5] || '1';

    // 검증
    if (activeColor !== 'w' && activeColor !== 'b') {
      return failure(new InvalidFenError(`유효하지 않은 active color입니다: ${activeColor}`));
    }

    // Castling 검증
    if (castling !== '-') {
      if (!/^[KQkq]{1,4}$/.test(castling)) {
        return failure(new InvalidFenError(`유효하지 않은 castling 권한 표현입니다: ${castling}`));
      }
      const seen = new Set<string>();
      for (const char of castling) {
        if (seen.has(char)) {
          return failure(new InvalidFenError(`castling 권한에 중복된 권한이 포함되어 있습니다: ${castling}`));
        }
        seen.add(char);
      }
    }

    // En passant 검증
    if (enPassant !== '-') {
      if (!/^[a-h][36]$/.test(enPassant)) {
        return failure(new InvalidFenError(`유효하지 않은 en passant 스퀘어 값입니다: ${enPassant}`));
      }
      if (activeColor === 'w' && enPassant[1] !== '6') {
        return failure(new InvalidFenError(`턴이 백('w')일 때 en passant 스퀘어는 6행이어야 합니다: ${enPassant}`));
      }
      if (activeColor === 'b' && enPassant[1] !== '3') {
        return failure(new InvalidFenError(`턴이 흑('b')일 때 en passant 스퀘어는 3행이어야 합니다: ${enPassant}`));
      }
    }

    // Halfmove clock 검증
    if (!/^\d+$/.test(halfmove)) {
      return failure(new InvalidFenError(`유효하지 않은 halfmove clock 값입니다: ${halfmove}`));
    }

    // Fullmove number 검증
    if (!/^[1-9]\d*$/.test(fullmove)) {
      return failure(new InvalidFenError(`유효하지 않은 fullmove number 값입니다: ${fullmove}`));
    }

    const canonicalFen = `${boardPart} ${activeColor} ${castling} ${enPassant} ${halfmove} ${fullmove}`;

    return success(new Fen(canonicalFen));
  }

  public toString(): string {
    return this.value;
  }

  public getBoardPart(): string {
    return this.value.split(' ')[0];
  }

  public getActiveColor(): 'w' | 'b' {
    return (this.value.split(' ')[1] || 'w') as 'w' | 'b';
  }

  public getCastlingRights(): string {
    return this.value.split(' ')[2] || '-';
  }

  public getEnPassantSquare(): string {
    return this.value.split(' ')[3] || '-';
  }

  public getHalfmoveClock(): number {
    return parseInt(this.value.split(' ')[4] || '0', 10);
  }

  public getFullmoveNumber(): number {
    return parseInt(this.value.split(' ')[5] || '1', 10);
  }
}
