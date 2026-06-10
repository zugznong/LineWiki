import { Chess } from 'chess.js';
import type { ChessEnginePort } from '../../ports/ChessEnginePort';
import { ChessMove } from '../../domain/chess/ChessMove';
import { Fen } from '../../domain/chess/Fen';
import { FenRuleValidator } from '../../domain/chess/FenRuleValidator';

/**
 * chess.js 라이브러리를 캡슐화하여, 도메인 영역인 ChessEnginePort 인터페이스에 맞게
 * FEN 포지션의 적합성 검증, 합법 후보수(Legal move) 연산, 수 적용 프로세스를 실행하는 어댑터 클래스입니다.
 */
export class ChessJsEngineAdapter implements ChessEnginePort {
  /**
   * 입력받은 FEN 문자열이 체스의 완전한 규칙 및 구문 분석 규칙에 위배되지 않는지 검출합니다.
   */
  public validateFen(fen: string): boolean {
    if (!fen || typeof fen !== 'string') {
      return false;
    }
    try {
      // 240자 제한, 필드 개수, 기물 개수 및 문자 제한을 통합 적용
      const fenResult = Fen.create(fen);
      if (fenResult.isFailure()) {
        return false;
      }
      const fullFenStr = fenResult.unwrap().toString();
      new Chess(fullFenStr);
      
      // 기물 배치 및 차례에 얽힌 체스 규정 위반(불가능한 킹 체크 국면, 인접 킹) 추가 검증
      return FenRuleValidator.validateLegalSideToMoveState(fullFenStr);
    } catch {
      return false;
    }
  }

  /**
   * 지정 국면이 체크 상태에 진입했는지 여부를 질의합니다.
   */
  public isCheck(fen: Fen): boolean {
    try {
      const chess = new Chess(fen.toString());
      return chess.inCheck();
    } catch {
      return false;
    }
  }

  /**
   * 지정 국면이 체크메이트 상태에 도달해 현재 플레이어의 패배로 종결되었는지 검증합니다.
   */
  public isCheckmate(fen: Fen): boolean {
    try {
      const chess = new Chess(fen.toString());
      // chess.isCheckmate()가 지원되면 직접 사용하고, 그렇지 않은 경우 체스 규칙 조합을 적용합니다.
      if (typeof (chess as any).isCheckmate === 'function') {
        return (chess as any).isCheckmate();
      }
      return chess.isGameOver() && chess.inCheck();
    } catch {
      return false;
    }
  }

  /**
   * 스테일메이트, 50수 기물 부족 등 다양한 무승부 조건이 성립되었는지 체크합니다.
   */
  public isDraw(fen: Fen): boolean {
    try {
      const chess = new Chess(fen.toString());
      return chess.isDraw();
    } catch {
      return false;
    }
  }

  /**
   * 현재 FEN 상황에서 전개할 수 있는 상세한 장기 대수 표시법(LAN) 정보와 결과 FEN을 가진 합법 후보수 목록을 산출합니다.
   */
  public getLegalMoves(fen: Fen): ChessMove[] {
    try {
      const fenStr = fen.toString();
      const chess = new Chess(fenStr);
      const verboseMoves = chess.moves({ verbose: true });
      
      return verboseMoves.map(m => {
        // 본 수순이 완전히 취해졌을 때 성립할 미래 FEN을 고정 산출
        const tempChess = new Chess(fenStr);
        tempChess.move({
          from: m.from,
          to: m.to,
          promotion: m.promotion || undefined
        });
        const resultingFen = tempChess.fen();

        return new ChessMove(
          m.from,
          m.to,
          m.san,
          m.lan || `${m.from}${m.to}${m.promotion || ''}`, // long algebraic notation or coordinates format
          m.piece,
          m.color,
          resultingFen,
          m.captured || null,
          m.promotion || null
        );
      });
    } catch (err) {
      console.error('합법수를 연산해내는 도중 비정상적인 구문 오류가 유발되었습니다:', err);
      return [];
    }
  }

  /**
   * 특정 국면에 입력받은 수순 행위를 실 적용하여 변환을 거친 최종 FEN 포지션 구문을 확정하여 가져옵니다.
   */
  public makeMove(fen: Fen, move: ChessMove): string {
    try {
      const chess = new Chess(fen.toString());
      chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || undefined
      });
      return chess.fen();
    } catch (err) {
      console.debug('수순을 체스 규칙 보드에 적용하던 과정에 에러가 발생하여 원본 FEN을 반환합니다:', err);
      return fen.toString();
    }
  }
}

