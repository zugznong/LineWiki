import type { EngineMoveEvaluation, MergedMoveEvaluation } from '../../domain/analysis/AnalysisTypes';

export interface MergeOptions {
  minDbDepth?: number;
}

export class MergeCandidateEvaluationsUseCase {
  public execute(
    storedEvaluations: Record<string, EngineMoveEvaluation>,
    localEvaluations: Record<string, EngineMoveEvaluation>,
    options: MergeOptions = {}
  ): Record<string, MergedMoveEvaluation> {
    const merged: Record<string, MergedMoveEvaluation> = {};
    const allUcis = new Set([...Object.keys(storedEvaluations), ...Object.keys(localEvaluations)]);

    for (const uci of allUcis) {
      const stored = storedEvaluations[uci];
      const local = localEvaluations[uci];

      if (stored) {
        const minDepth = options.minDbDepth ?? 0;
        const storedDepth = stored.depth ?? 0;

        if (storedDepth < minDepth && local && (local.depth ?? 0) > storedDepth) {
          merged[uci] = {
            moveUci: uci,
            moveSan: local.moveSan,
            score: local.score,
            depth: local.depth,
            source: 'local',
            createdAt: local.createdAt,
            updatedAt: local.updatedAt
          };
        } else {
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
        }
      } else if (local) {
        merged[uci] = {
          moveUci: uci,
          moveSan: local.moveSan,
          score: local.score,
          depth: local.depth,
          source: 'local',
          createdAt: local.createdAt,
          updatedAt: local.updatedAt
        };
      }
    }

    return merged;
  }
}
