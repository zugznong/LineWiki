import { LocalAnalysisResult } from '../../../domain/analysis/LocalAnalysisResult';
import { EvalScore } from '../../../domain/analysis/EvalScore';
import { PrincipalVariation } from '../../../domain/analysis/PrincipalVariation';

/**
 * UCI-like(또는 Stockfish 호환) 출력을 안전하게 정독 및 가공하기 위한 단일 책임의 순수 텍스트 파서입니다.
 * info lines, cp/mate scores, pv, bestmove 지점을 안전한 정규표현식으로 매핑하여 도메인 모델로 돌려줍니다.
 */
export class StockfishMessageParser {
  /**
   * 'info depth {depth} ...' 형태의 UCI 중간 연산 추이를 받아 핵심 지표를 파싱합니다.
   */
  public parseInfoLine(line: string, currentFen: string): LocalAnalysisResult | null {
    if (!line || typeof line !== 'string') return null;
    if (!line.includes('score') && !line.includes('depth')) return null;

    const depthMatch = line.match(/(?:\bdepth\s+)(\d+)/);
    const selDepthMatch = line.match(/(?:\bseldepth\s+)(\d+)/);
    const scoreCpMatch = line.match(/(?:\bscore\s+cp\s+)(-?\d+)/);
    const scoreMateMatch = line.match(/(?:\bscore\s+mate\s+)(-?\d+)/);
    const pvMatch = line.match(/(?:\bpv\s+)(.+)/);
    const npsMatch = line.match(/(?:\bnps\s+)(\d+)/);
    const timeMatch = line.match(/(?:\btime\s+)(\d+)/);
    const multiPvMatch = line.match(/(?:\bmultipv\s+)(\d+)/);
    const nodesMatch = line.match(/(?:\bnodes\s+)(\d+)/);
    const hashfullMatch = line.match(/(?:\bhashfull\s+)(\d+)/);

    const depth = depthMatch ? parseInt(depthMatch[1], 10) : 0;
    const selDepth = selDepthMatch ? parseInt(selDepthMatch[1], 10) : 0;
    const multiPvIndex = multiPvMatch ? parseInt(multiPvMatch[1], 10) : 1;
    const nodes = nodesMatch ? parseInt(nodesMatch[1], 10) : 0;
    const hashFull = hashfullMatch ? parseInt(hashfullMatch[1], 10) : 0;
    
    let score: EvalScore;
    if (scoreMateMatch) {
      score = new EvalScore('mate', parseInt(scoreMateMatch[1], 10));
    } else if (scoreCpMatch) {
      score = new EvalScore('cp', parseInt(scoreCpMatch[1], 10));
    } else {
      score = new EvalScore('cp', 0);
    }

    const pvStr = pvMatch ? pvMatch[1] : '';
    const pvMoves = pvStr.trim().split(/\s+/).filter(Boolean);
    const pv = new PrincipalVariation(pvMoves);
    const rootMoveUci = pvMoves[0] || '';
    const bestMoveUci = rootMoveUci;

    const nps = npsMatch ? parseInt(npsMatch[1], 10) : 0;
    const timeMs = timeMatch ? parseInt(timeMatch[1], 10) : 0;

    return new LocalAnalysisResult(
      currentFen,
      depth,
      score,
      pv,
      bestMoveUci,
      null,
      'analyzing',
      nps,
      timeMs,
      multiPvIndex,
      selDepth,
      nodes,
      hashFull,
      rootMoveUci
    );
  }

  /**
   * 'bestmove {moveUci} ponder {ponderUci}' 형태의 로컬 엔진 계산 완전 수립 신호를 파싱합니다.
   * 파싱 결과로 결정된 최종 최적수(uci)를 리턴하며, 파싱에 실패할 수 도 있습니다.
   */
  public parseBestMoveLine(line: string): { bestMove: string; ponder: string | null } | null {
    if (!line || typeof line !== 'string') return null;
    if (!line.startsWith('bestmove')) return null;

    const parts = line.trim().split(/\s+/);
    // Format: "bestmove [moveUci] ponder [ponderUci]" or "bestmove [moveUci]"
    const bestMove = parts[1] || '';
    let ponder: string | null = null;

    const ponderIndex = parts.indexOf('ponder');
    if (ponderIndex !== -1 && parts[ponderIndex + 1]) {
      ponder = parts[ponderIndex + 1];
    }

    if (!bestMove) return null;

    return {
      bestMove,
      ponder
    };
  }
}

