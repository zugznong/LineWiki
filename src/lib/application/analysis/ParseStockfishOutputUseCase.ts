import type { Result } from '../../utils/result';
import { success, failure } from '../../utils/result';
import { StockfishMessageParser } from '../../adapters/analysis/local/StockfishMessageParser';
import type { LocalAnalysisResult } from '../../domain/analysis/LocalAnalysisResult';

/**
 * Stockfish 엔진이 한 줄(info line)씩 출력하는 UCI 텍스트를 파싱하여,
 * 도메인 모델인 LocalAnalysisResult(depth, score, pv, bestmove 등)로 변환해주는 유스케이스입니다.
 */
export class ParseStockfishOutputUseCase {
  private readonly parser = new StockfishMessageParser();

  /**
   * 한 줄의 Stockfish 메시지와 현재 FEN 정보를 바탕으로 LocalAnalysisResult를 생성합니다.
   * 유효한 파싱 데이터포인트가 발견되지 않으면 Failure Result를 리턴합니다.
   */
  public execute(line: string, currentFen: string): Result<LocalAnalysisResult, Error> {
    const parsed = this.parser.parseInfoLine(line, currentFen);
    if (parsed) {
      return success(parsed);
    }
    return failure(new Error('UCI info line did not match evaluation score criteria.'));
  }
}
