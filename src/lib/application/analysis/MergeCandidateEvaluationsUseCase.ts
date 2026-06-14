import { StoredEvaluationPolicy } from '../../domain/analysis/StoredEvaluationPolicy';
import type { EngineMoveEvaluation, MergedMoveEvaluation } from '../../domain/analysis/AnalysisTypes';

export class MergeCandidateEvaluationsUseCase {
  constructor(private readonly policy: StoredEvaluationPolicy) {}

  public execute(
    storedEvaluations: Record<string, EngineMoveEvaluation>,
    localEvaluations: Record<string, EngineMoveEvaluation>,
    trustMetadata?: Record<string, {
      isTrusted: boolean;
      reason?: string;
      engineVersion?: string;
      sampleCount?: number;
      stdDev?: number;
      perspective?: string;
    }>
  ): Record<string, MergedMoveEvaluation> {
    const merged: Record<string, MergedMoveEvaluation> = {};
    const allUcis = new Set([...Object.keys(storedEvaluations), ...Object.keys(localEvaluations)]);

    for (const uci of allUcis) {
      const stored = storedEvaluations[uci];
      const local = localEvaluations[uci];
      const meta = trustMetadata?.[uci];

      // 1. 신뢰 가능한 DB 평가가 존재하는 경우 -> 'db' 우선 사용
      if (stored && this.policy.isTrusted(stored, meta)) {
        merged[uci] = {
          moveUci: uci,
          moveSan: stored.moveSan,
          score: stored.score,
          depth: stored.depth,
          source: 'db',
          trustedDepth: stored.trustedDepth,
          createdAt: stored.createdAt,
          updatedAt: stored.updatedAt
        };
        continue;
      }

      // 2. DB 평가가 누락되었거나 신뢰 기준을 충족하지 못한 경우, 로컬 Stockfish가 성공했거나 임시 평가가 있다면 -> 'local' / 'fallback' / 'provisional' 사용
      const isLocalValid = local && (local.score !== null || (local.depth ?? 0) > 0);
      if (isLocalValid) {
        let finalSource: 'db' | 'local' | 'fallback' | 'db-stale' | 'provisional' | 'previous-line' = 'local';
        if (local.source === 'fallback') {
          finalSource = 'fallback';
        } else if (local.source === 'provisional') {
          finalSource = 'provisional';
        } else if (local.source === 'previous-line') {
          finalSource = 'previous-line';
        }

        merged[uci] = {
          moveUci: uci,
          moveSan: local.moveSan,
          score: local.score,
          depth: local.depth,
          source: finalSource,
          createdAt: local.createdAt,
          updatedAt: local.updatedAt
        };
        continue;
      }

      // 3. DB 평가가 존재하지만 신뢰 조건을 충족하지 못하였고 로컬 결과도 유효하지 않은 경우 -> 'db-stale' 사용
      // (기존에는 fallback으로 노출했었지만 기획 정책에 따라 db-stale로 명확히 분리하여, 오래된 DB 평가와 휴리스틱 추정치(fallback)의 혼동을 방지함)
      if (stored) {
        merged[uci] = {
          moveUci: uci,
          moveSan: stored.moveSan,
          score: stored.score,
          depth: stored.depth,
          source: 'db-stale',
          trustedDepth: stored.trustedDepth,
          createdAt: stored.createdAt,
          updatedAt: stored.updatedAt
        };
      } else if (local) {
        let finalSource: 'db' | 'local' | 'fallback' | 'db-stale' | 'provisional' | 'previous-line' = 'fallback';
        if (local.source === 'provisional') {
          finalSource = 'provisional';
        } else if (local.source === 'previous-line') {
          finalSource = 'previous-line';
        } else if (local.source === 'local') {
          finalSource = 'local';
        }

        merged[uci] = {
          moveUci: uci,
          moveSan: local.moveSan,
          score: local.score,
          depth: local.depth,
          source: finalSource,
          createdAt: local.createdAt,
          updatedAt: local.updatedAt
        };
      } else {
        merged[uci] = {
          moveUci: uci,
          moveSan: '',
          score: null,
          depth: 0,
          source: 'fallback'
        };
      }
    }

    return merged;
  }
}
