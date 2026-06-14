import { describe, it, expect } from 'vitest';
import { ChessJsEngineAdapter } from '../../src/lib/adapters/chess/ChessJsEngineAdapter';

describe('DrawState 및 getDrawState 무승부 판정 조건 검증', () => {
  const adapter = new ChessJsEngineAdapter();

  it('기본 스타팅 포지션에서는 무승부가 아니어야 합니다 (DrawState: none)', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const drawState = adapter.getDrawState(startFen);
    expect(drawState).toBe('none');
  });

  it('50수 규칙: halfmove clock이 100 이상인 FEN에 대해서는 fifty-move 무승부 조건이 검출되어야 합니다', () => {
    // 5번째 필드(halfmove clock)가 100인 FEN
    const fiftyMoveFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 100 50';
    const drawState = adapter.getDrawState(fiftyMoveFen);
    expect(drawState).toBe('fifty-move');
  });

  it('75수 규칙: halfmove clock이 150 이상인 FEN에 대해서는 seventyfive-move 무승부 조건이 검출되어야 합니다', () => {
    // 5번째 필드(halfmove clock)가 150인 FEN
    const seventyFiveMoveFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 150 75';
    const drawState = adapter.getDrawState(seventyFiveMoveFen);
    expect(drawState).toBe('seventyfive-move');
  });

  it('삼수동형: FEN이 하나만 입력되는 단발적인 경우에는 threefold-repetition 검사가 none을 반환해야 합니다 (FEN 단독으로는 히스토리 소급 불가)', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const drawState = adapter.getDrawState(fen);
    expect(drawState).toBe('none');
  });

  it('삼수동형: 동일한 position key를 공유하는 FEN이 히스토리 상에서 3회 이상 반복 등장할 때 threefold-repetition을 검출해내야 합니다', () => {
    // piece placement, side to move, castling, en passant가 같은 3개의 국면 히스토리
    // 이 히스토리 속 FEN들은 halfmove clock과 fullmove number가 달라도 포지션의 동형이 성립해야 하므로,
    // position key(0~3 세그먼트)가 같으면 삼수동형으로 인정됩니다.
    const fen1 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const fen2 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 1 2';
    const fen3 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 2 3';

    const history = [fen1, fen2, fen3];

    // 현재의 포지션 fen3과 히스토리 대조 검사
    const drawState = adapter.getDrawState(fen3, history);
    expect(drawState).toBe('threefold-repetition');
  });

  it('스테일메이트: 합법수가 없고 체크 상황이 아닐 때 stalemate가 정의되는지 판단합니다', () => {
    // 안전한 스테일메이트 FEN 예시
    const stalemateFen = '5k2/5P2/5K2/8/8/8/8/8 b - - 0 1';
    const drawState = adapter.getDrawState(stalemateFen);
    expect(drawState).toBe('stalemate');
  });

  it('기물 부족: 체크메이트를 가하기 힘든 기물 구성일 때 insufficient-material이 도출되는지 확인합니다', () => {
    // 킹 대 킹 기물 부족 FEN
    const insufficientFen = '8/8/8/8/8/8/5k2/5K2 w - - 0 1';
    const drawState = adapter.getDrawState(insufficientFen);
    expect(drawState).toBe('insufficient-material');
  });
});
