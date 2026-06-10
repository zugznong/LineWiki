import { describe, it, expect } from 'vitest';
import { EvalScore } from '../../src/lib/domain/analysis/EvalScore';
import { evalSortValue, compareEvalsForTurn } from '../../src/lib/domain/analysis/evalSorting';

const cp = (v: number) => ({ score: new EvalScore('cp', v) });
const mate = (v: number) => ({ score: new EvalScore('mate', v) });

describe('evalSortValue', () => {
  it('returns the raw centipawn value for cp scores', () => {
    expect(evalSortValue(new EvalScore('cp', 35))).toBe(35);
    expect(evalSortValue(new EvalScore('cp', -120))).toBe(-120);
  });

  it('offsets mate scores beyond any cp value so mate dominates', () => {
    expect(evalSortValue(new EvalScore('mate', 3))).toBe(10003);
    expect(evalSortValue(new EvalScore('mate', -2))).toBe(-10002);
    expect(evalSortValue(new EvalScore('mate', 1))).toBeGreaterThan(evalSortValue(new EvalScore('cp', 9999)));
  });
});

describe('compareEvalsForTurn', () => {
  it('orders highest score first for White to move', () => {
    const items = [cp(10), cp(50), cp(-30)];
    items.sort(compareEvalsForTurn('w'));
    expect(items.map((i) => i.score.value)).toEqual([50, 10, -30]);
  });

  it('orders lowest score first for Black to move', () => {
    const items = [cp(10), cp(50), cp(-30)];
    items.sort(compareEvalsForTurn('b'));
    expect(items.map((i) => i.score.value)).toEqual([-30, 10, 50]);
  });

  it('ranks mate ahead of any centipawn advantage for White', () => {
    const items = [cp(900), mate(5)];
    items.sort(compareEvalsForTurn('w'));
    expect(items[0].score.type).toBe('mate');
  });
});
