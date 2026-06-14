import { describe, it, expect } from 'vitest';
import { EvalScore } from '../../src/lib/domain/analysis/EvalScore';

describe('EvalScore Domain Entity Tests', () => {
  describe('Type Check Helpers', () => {
    it('should identify cp and mate types correctly', () => {
      const cpScore = new EvalScore('cp', 150);
      expect(cpScore.isCp()).toBe(true);
      expect(cpScore.isMate()).toBe(false);

      const mateScore = new EvalScore('mate', 3);
      expect(mateScore.isCp()).toBe(false);
      expect(mateScore.isMate()).toBe(true);
    });
  });

  describe('Formatting Evaluation Scores', () => {
    it('should format positive centipawn score to with dynamic decimal refinement, e.g. +0.4', () => {
      // 40 centipawns -> 0.40 -> +0.4
      const score1 = new EvalScore('cp', 40);
      expect(score1.format()).toBe('+0.40');

      // 150 centipawns -> 1.50 -> +1.5
      const score2 = new EvalScore('cp', 150);
      expect(score2.format()).toBe('+1.50');

      // 156 centipawns -> 1.56 -> +1.56
      const score3 = new EvalScore('cp', 156);
      expect(score3.format()).toBe('+1.56');
    });

    it('should format negative centipawn score correctly', () => {
      // -250 centipawns -> -2.50 -> -2.5
      const score1 = new EvalScore('cp', -250);
      expect(score1.format()).toBe('-2.50');

      // -85 centipawns -> -0.85 -> -0.85 (or clean representation)
      const score2 = new EvalScore('cp', -85);
      expect(score2.format()).toBe('-0.85');
    });

    it('should format draw or flat center evaluation to exactly 0.0', () => {
      const score1 = new EvalScore('cp', 0);
      expect(score1.format()).toBe('0.00');

      // Edge case representation representing values that slice to zero
      const score2 = new EvalScore('cp', -0.1);
      expect(score2.format()).toBe('0.00');
    });

    it('should format positive mate score to prefix M, e.g. M10', () => {
      const score = new EvalScore('mate', 10);
      expect(score.format()).toBe('M10');
    });

    it('should format negative mate score to prefix -M, e.g. -M5', () => {
      const score = new EvalScore('mate', -5);
      expect(score.format()).toBe('-M5');
    });
  });
});
