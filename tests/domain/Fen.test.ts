import { describe, it, expect } from 'vitest';
import { Fen, InvalidFenError } from '../../src/lib/domain/chess/Fen';

describe('Fen Domain Entity Tests', () => {
  it('should support standard start position', () => {
    const startFen = Fen.START_POSITION;
    const result = Fen.create(startFen);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const fenInstance = result.unwrap();
      expect(fenInstance.toString()).toBe(startFen);
      expect(fenInstance.getBoardPart()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
      expect(fenInstance.getActiveColor()).toBe('w');
      expect(fenInstance.getCastlingRights()).toBe('KQkq');
      expect(fenInstance.getEnPassantSquare()).toBe('-');
      expect(fenInstance.getHalfmoveClock()).toBe(0);
      expect(fenInstance.getFullmoveNumber()).toBe(1);
    }
  });

  it('should canonicalize raw FEN with varying whitespace and missing fields', () => {
    // 6 fields: board, active, castling, enpassant, halfmove, fullmove
    const rawFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR    w  ';
    const result = Fen.create(rawFen);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const fenInstance = result.unwrap();
      // Default fields: castling = '-', enpassant = '-', halfmove = '0', fullmove = '1'
      expect(fenInstance.toString()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1');
      expect(fenInstance.getActiveColor()).toBe('w');
    }
  });

  it('should fail creation with empty input', () => {
    const result = Fen.create('');
    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr()).toBeInstanceOf(InvalidFenError);
  });

  it('should fail if board does not have exactly 8 ranks', () => {
    // Only 7 rows
    const badFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP w KQkq - 0 1';
    const result = Fen.create(badFen);
    
    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('8행으로 구성되어야 하나');
  });

  it('should fail if active color is invalid', () => {
    const badFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR x KQkq - 0 1';
    const result = Fen.create(badFen);

    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('유효하지 않은 active color입니다');
  });

  it('should fail if board ranks have invalid column count (too short or too long)', () => {
    // 1st row has only 7 pieces/squares
    const tooFewColumns = 'rnbqkbn/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const resultFew = Fen.create(tooFewColumns);
    expect(resultFew.isFailure()).toBe(true);
    expect(resultFew.unwrapErr().message).toContain('칸 수의 합이 8이어야 하나');

    // 1st row has 9 squares (8 + 8, actually 16)
    const tooManyColumns = 'rnbqkbnr8/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const resultMany = Fen.create(tooManyColumns);
    expect(resultMany.isFailure()).toBe(true);
    expect(resultMany.unwrapErr().message).toContain('칸 수의 합이 8이어야 하나');
  });

  it('should fail with invalid piece characters', () => {
    const invalidPiece = 'rnbqkxnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const result = Fen.create(invalidPiece);
    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('유효하지 않은 기물 혹은 문자');
  });

  it('should fail with invalid castling rights value', () => {
    // Invalid characters
    const badCastlingChars = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkqX - 0 1';
    const resultChars = Fen.create(badCastlingChars);
    expect(resultChars.isFailure()).toBe(true);
    expect(resultChars.unwrapErr().message).toContain('유효하지 않은 castling 권한 표현');

    // Duplicate characters
    const duplicateCastling = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KK - 0 1';
    const resultDup = Fen.create(duplicateCastling);
    expect(resultDup.isFailure()).toBe(true);
    expect(resultDup.unwrapErr().message).toContain('castling 권한에 중복된 권한이 포함');
  });

  it('should fail with invalid en passant value', () => {
    // Row is 5 (only 3 or 6 allowed)
    const badEpRow = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq e5 0 1';
    const resultRow = Fen.create(badEpRow);
    expect(resultRow.isFailure()).toBe(true);
    expect(resultRow.unwrapErr().message).toContain('유효하지 않은 en passant 스퀘어');

    // Invalid file character
    const badEpFile = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq x3 0 1';
    const resultFile = Fen.create(badEpFile);
    expect(resultFile.isFailure()).toBe(true);
    expect(resultFile.unwrapErr().message).toContain('유효하지 않은 en passant 스퀘어');

    // Ep square on rank 3 when White turn
    const badEpWhiteRow = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq e3 0 1';
    const resultWhiteRow = Fen.create(badEpWhiteRow);
    expect(resultWhiteRow.isFailure()).toBe(true);
    expect(resultWhiteRow.unwrapErr().message).toContain('턴이 백(\'w\')일 때 en passant 스퀘어는 6행이어야 합니다');

    // Ep square on rank 6 when Black turn
    const badEpBlackRow = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq e6 0 1';
    const resultBlackRow = Fen.create(badEpBlackRow);
    expect(resultBlackRow.isFailure()).toBe(true);
    expect(resultBlackRow.unwrapErr().message).toContain('턴이 흑(\'b\')일 때 en passant 스퀘어는 3행이어야 합니다');
  });

  it('should fail if there is not exactly one white king or black king', () => {
    // No white king
    const noWhiteKing = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQ1BNR w KQkq - 0 1';
    const resultNoWhite = Fen.create(noWhiteKing);
    expect(resultNoWhite.isFailure()).toBe(true);
    expect(resultNoWhite.unwrapErr().message).toContain('백색 킹(K)은 반드시 1개 존재해야 합니다');

    // Multiple white kings
    const multiWhiteKings = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNK w KQkq - 0 1';
    const resultMultiWhite = Fen.create(multiWhiteKings);
    expect(resultMultiWhite.isFailure()).toBe(true);
    expect(resultMultiWhite.unwrapErr().message).toContain('백색 킹(K)은 반드시 1개 존재해야 합니다');

    // No black king
    const noBlackKing = 'rnbq1bnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const resultNoBlack = Fen.create(noBlackKing);
    expect(resultNoBlack.isFailure()).toBe(true);
    expect(resultNoBlack.unwrapErr().message).toContain('흑색 킹(k)은 반드시 1개 존재해야 합니다');
  });

  it('should fail if the FEN has more than 6 space-separated fields', () => {
    // 7 fields
    const badFenWithSevenFields = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 extra';
    const result = Fen.create(badFenWithSevenFields);
    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('필드의 개수가 6개를 초과할 수 없습니다');
  });
});

