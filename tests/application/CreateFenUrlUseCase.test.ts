import { describe, it, expect, vi } from 'vitest';
import { CreateFenUrlUseCase } from '../../src/lib/application/chess/CreateFenUrlUseCase';
import { Fen } from '../../src/lib/domain/chess/Fen';
import { FEN_PAGE_PREFIX } from '../../src/lib/config/appConfig';
import fs from 'fs';
import path from 'path';

describe('CreateFenUrlUseCase Use Case Tests', () => {
  const useCase = new CreateFenUrlUseCase();

  it('should generate accurate URL FEN mapping for the standard opening position', () => {
    const startFen = Fen.START_POSITION;
    const resultUrl = useCase.execute(startFen);

    const expectedSafeFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1';
    expect(resultUrl).toBe(`${FEN_PAGE_PREFIX}${expectedSafeFen}`);
  });

  it('should generate accurate URL FEN mapping for custom validated FEN string', () => {
    const customFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const resultUrl = useCase.execute(customFen);

    const expectedSafeFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR_b_KQkq_-_0_1';
    expect(resultUrl).toBe(`${FEN_PAGE_PREFIX}${expectedSafeFen}`);
  });

  it('should return empty string on invalid FEN structures', () => {
    const invalidFen = 'rnbqkbnr/invalid_format_short w KQkq - 0 1';
    const resultUrl = useCase.execute(invalidFen);

    expect(resultUrl).toBe('');
  });

  it('should successfully convert all positions in examples/positions.json to valid URL-safe paths', () => {
    const filePath = path.resolve(__dirname, '../../static/examples/positions.json');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const examples = JSON.parse(rawData);

    for (const example of examples) {
      // 1. 모든 예시 FEN이 도메인 관점의 표준 FEN 구조인지 검증
      const domainFen = Fen.create(example.fen);
      expect(domainFen.isOk()).toBe(true);

      const resultUrl = useCase.execute(example.fen);
      expect(resultUrl).not.toBe('');
      expect(resultUrl.startsWith(FEN_PAGE_PREFIX)).toBe(true);

      // 2. 생성된 URL 경로가 인코딩된 URL-safe 형태(공백 부재 등)인지 검증
      const segment = resultUrl.substring(FEN_PAGE_PREFIX.length);
      expect(segment).not.toContain(' ');
      
      // 기물 배치 영역 외에는 슬래시(/)가 존재하지 않으며, 공백 대신 언더스코어(_)가 사용되었는지 확인
      const urlDecodedSegment = decodeURIComponent(segment);
      expect(urlDecodedSegment).not.toContain(' ');
      expect(urlDecodedSegment).toContain('_');
    }
  });

  it('should verify that all fallback examples in src/routes/+page.ts are standard FENs and can be successfully mapped to URL-safe strings', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Dynamically retrieve fallback examples from src/routes/+page.ts by passing a failing fetch callback
    const { load } = await import('../../src/routes/+page');
    const result = (await load({
      fetch: () => Promise.reject(new Error('Trigger fallback fallback examples'))
    } as any)) as any;

    errorSpy.mockRestore();

    expect(result).toBeDefined();
    expect(result.examples).toBeDefined();
    expect(result.examples.length).toBeGreaterThan(0);

    for (const example of result.examples) {
      // 1. 해야할 검증: FEN.create()에 통과해야 함 (표준 FEN)
      const domainFen = Fen.create(example.fen);
      expect(domainFen.isOk()).toBe(true);

      // 2. FEN에 언더스코어(_)가 포함되어 있지 않고 표준 공백을 보유해야 함
      expect(example.fen).not.toContain('_');
      expect(example.fen).toContain(' ');

      // 3. CreateFenUrlUseCase를 이용해 URL 변환이 잘 동작해야 함
      const urlPath = useCase.execute(example.fen);
      expect(urlPath).not.toBe('');
      expect(urlPath.startsWith(FEN_PAGE_PREFIX)).toBe(true);
    }
  });
});
