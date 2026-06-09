import type { ChessMove } from './ChessMove';

/**
 * 게임 내 합법수(Legal Moves)들의 일급 컬렉션(First-Class Collection) 모델입니다.
 * 빈 목록 생성, 정렬, 다각적 수 조회 인터페이스를 안전하게 캡슐화합니다.
 */
export class MoveList {
  constructor(public readonly moves: ChessMove[]) {}

  /**
   * 빈 합법수 목록을 가진 MoveList 인스턴스를 반환합니다.
   */
  public static empty(): MoveList {
    return new MoveList([]);
  }

  /**
   * 출발지 스퀘어 기준 필터링을 수행합니다.
   */
  public filterByFromSquare(square: string): ChessMove[] {
    return this.moves.filter(m => m.from === square);
  }

  /**
   * 출발지, 목적지, 프로모션 조합으로 임의의 수를 조회합니다.
   */
  public findMove(from: string, to: string, promotion?: string): ChessMove | undefined {
    const candidates = this.moves.filter(m => m.from === from && m.to === to);
    if (candidates.length === 0) return undefined;
    
    // 만약 해당 경로로 가는 합법적인 후보가 단 하나뿐이라면 (대체로 일반 이동),
    // 잘못 제공되었을지 모르는 프로모션 조건에 구애받지 않고 안전하게 그 수를 반환합니다.
    if (candidates.length === 1) {
      return candidates[0];
    }
    
    // 후보가 여러 개 존재할 때 (주로 프로모션 선택지: q, r, b, n 등)
    if (promotion) {
      const match = candidates.find(m => m.promotion === promotion);
      if (match) return match;
    }
    
    // 프로모션 정보가 명확히 주어지지 않은 선택지 상황인 경우 기본 퀸('q') 프로모션을 우선 매칭하거나, 첫 매치 대상을 반환합니다.
    const defaultQueenPromo = candidates.find(m => m.promotion === 'q');
    return defaultQueenPromo || candidates[0];
  }

  /**
   * SAN(Standard Algebraic Notation) 문자열을 기준으로 특정 수를 찾습니다.
   */
  public getBySan(san: string): ChessMove | undefined {
    const cleanSan = san.trim();
    return this.moves.find(m => m.san === cleanSan);
  }

  /**
   * UCI(Universal Chess Interface, e.g. e2e4) 문자열을 기준으로 특정 수를 찾습니다.
   */
  public getByUci(uci: string): ChessMove | undefined {
    const cleanUci = uci.trim().toLowerCase();
    return this.moves.find(m => m.uci.toLowerCase() === cleanUci);
  }

  /**
   * 주어진 비교자 또는 기본 알파벳/SAN 순서 기준으로 수를 정렬한 새로운 MoveList 객체를 반환합니다.
   */
  public sort(comparator?: (a: ChessMove, b: ChessMove) => number): MoveList {
    const sortedMoves = [...this.moves];
    if (comparator) {
      sortedMoves.sort(comparator);
    } else {
      // 기본적으로 SAN 알파벳 순 오름차순 정렬
      sortedMoves.sort((a, b) => a.san.localeCompare(b.san));
    }
    return new MoveList(sortedMoves);
  }

  /**
   * 목록 내 총 합법수 개수를 반환합니다.
   */
  public get length(): number {
    return this.moves.length;
  }
}
