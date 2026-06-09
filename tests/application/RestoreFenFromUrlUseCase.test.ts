import { describe, it, expect, vi } from 'vitest';
import { RestoreFenFromUrlUseCase } from '../../src/lib/application/chess/RestoreFenFromUrlUseCase';
import { CreateFenUrlUseCase } from '../../src/lib/application/chess/CreateFenUrlUseCase';
import { Fen } from '../../src/lib/domain/chess/Fen';
import { FEN_PAGE_PREFIX } from '../../src/lib/config/appConfig';
import type { ChessEnginePort } from '../../src/lib/ports/ChessEnginePort';
import fs from 'fs';
import path from 'path';

describe('RestoreFenFromUrlUseCase Use Case Tests', () => {
  it('should successfully restore standard FEN from valid URL-safe segment when validation passes', () => {
    // FEN: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
    const urlSafeSegment = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1';
    
    const mockChessEngine = {
      validateFen: vi.fn().mockReturnValue(true)
    } as unknown as ChessEnginePort;

    const useCase = new RestoreFenFromUrlUseCase(mockChessEngine);
    const result = useCase.execute(urlSafeSegment);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.unwrap()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(mockChessEngine.validateFen).toHaveBeenCalledWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    }
  });

  it('should return failure if the URL FEN string format is completely invalid', () => {
    const invalidSegment = '';
    const mockChessEngine = {
      validateFen: vi.fn().mockReturnValue(true)
    } as unknown as ChessEnginePort;

    const useCase = new RestoreFenFromUrlUseCase(mockChessEngine);
    const result = useCase.execute(invalidSegment);

    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('URL FEN 문자열이 비어 있습니다.');
    expect(mockChessEngine.validateFen).not.toHaveBeenCalled();
  });

  it('should return failure if the ChessEnginePort validation fails', () => {
    // Valid syntax FEN but returns false in engine validate check
    const urlSafeSegment = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1';
    
    const mockChessEngine = {
      validateFen: vi.fn().mockReturnValue(false)
    } as unknown as ChessEnginePort;

    const useCase = new RestoreFenFromUrlUseCase(mockChessEngine);
    const result = useCase.execute(urlSafeSegment);

    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('체스 FEN 코드가 검증 규칙에 통과하지 못했습니다.');
  });

  it('should guarantee consistent round-trip conversion from original FEN to url-safe and back to original FEN', () => {
    const mockChessEngine = {
      validateFen: vi.fn().mockReturnValue(true)
    } as unknown as ChessEnginePort;

    const restoreUseCase = new RestoreFenFromUrlUseCase(mockChessEngine);
    const createUseCase = new CreateFenUrlUseCase();

    // Round-trip testing keys from our core example positions
    const filePath = path.resolve(__dirname, '../../static/examples/positions.json');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const examples = JSON.parse(rawData);

    for (const example of examples) {
      // 1. Original FEN -> Get canonical original representation
      const originalCanonicalResult = Fen.create(example.fen);
      expect(originalCanonicalResult.isOk()).toBe(true);
      const originalCanonical = originalCanonicalResult.unwrap().toString();

      // 2. Original FEN -> URL Path
      const urlPath = createUseCase.execute(example.fen);
      expect(urlPath.startsWith(FEN_PAGE_PREFIX)).toBe(true);

      // 3. Extract the URL segment after prefix
      const segment = urlPath.substring(FEN_PAGE_PREFIX.length);

      // 4. Decode / Restore from segment
      const restoreResult = restoreUseCase.execute(segment);
      expect(restoreResult.isOk()).toBe(true);

      // 5. Assert equality with canonical original FEN
      expect(restoreResult.unwrap()).toBe(originalCanonical);

      // 6. /fen/<url-safe-fen> 전체 경로에서 토큰을 추출하고 복구하는 라운드트립 케이스 직접 검증
      const rawUrlSafeSegment = urlPath.replace(FEN_PAGE_PREFIX, '');
      const restoreDirectResult = restoreUseCase.execute(rawUrlSafeSegment);
      expect(restoreDirectResult.isOk()).toBe(true);
      expect(restoreDirectResult.unwrap()).toBe(originalCanonical);
    }
  });

  it('should guarantee consistent round-trip parsing from a standard FEN back to its original value using CreateFenUrlUseCase and RestoreFenFromUrlUseCase directly', () => {
    const mockChessEngine = {
      validateFen: vi.fn().mockReturnValue(true)
    } as unknown as ChessEnginePort;

    const createUseCase = new CreateFenUrlUseCase();
    const restoreUseCase = new RestoreFenFromUrlUseCase(mockChessEngine);

    const customTestCases = [
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      '8/8/8/8/8/8/8/k6K w - - 0 1',
      'r1bqk2r/1ppp1ppp/2n2n2/1b2p3/4P3/5N2/PPPPBPPP/RNBQ1RK1 w kq - 0 6',
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    ];

    for (const original of customTestCases) {
      const urlPath = createUseCase.execute(original);
      const segment = urlPath.replace(FEN_PAGE_PREFIX, '');

      const restored = restoreUseCase.execute(segment);
      expect(restored.isOk()).toBe(true);
      expect(restored.unwrap()).toBe(original);
    }
  });
});

