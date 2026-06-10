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
    expect(evalSortValue(new EvalScore('mate', 3))).toBe(100000 + (1000 - 3));
    expect(evalSortValue(new EvalScore('mate', -2))).toBe(-100000 - (1000 - 2));
    expect(evalSortValue(new EvalScore('mate', 1))).toBeGreaterThan(evalSortValue(new EvalScore('cp', 9999)));
  });

  it('ensures mate distance priority holds (M1 > M3 > M10) and (-M1 < -M3 < -M10)', () => {
    const valM1 = evalSortValue(new EvalScore('mate', 1));
    const valM3 = evalSortValue(new EvalScore('mate', 3));
    const valM10 = evalSortValue(new EvalScore('mate', 10));

    expect(valM1).toBeGreaterThan(valM3);
    expect(valM3).toBeGreaterThan(valM10);

    const valNegM1 = evalSortValue(new EvalScore('mate', -1));
    const valNegM3 = evalSortValue(new EvalScore('mate', -3));
    const valNegM10 = evalSortValue(new EvalScore('mate', -10));

    expect(valNegM1).toBeLessThan(valNegM3);
    expect(valNegM3).toBeLessThan(valNegM10);
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

  it('orders mates correctly by distance for White (fastest mate first)', () => {
    const items = [mate(10), cp(50), mate(1), mate(3)];
    items.sort(compareEvalsForTurn('w'));
    expect(items.map((i) => {
      if (i.score.isMate()) return `M${i.score.value}`;
      return `${i.score.value}`;
    })).toEqual(['M1', 'M3', 'M10', '50']);
  });

  it('orders mates correctly by distance for Black (fastest negative mate first, i.e., lowest value)', () => {
    const items = [mate(-10), cp(50), mate(-1), mate(-3)];
    items.sort(compareEvalsForTurn('b'));
    expect(items.map((i) => {
      if (i.score.isMate()) return `-M${Math.abs(i.score.value)}`;
      return `${i.score.value}`;
    })).toEqual(['-M1', '-M3', '-M10', '50']);
  });

  it('normalizes invalid turn values to White default', () => {
    const items = [cp(10), cp(50), cp(-30)];
    items.sort(compareEvalsForTurn('invalid_turn'));
    expect(items.map((i) => i.score.value)).toEqual([50, 10, -30]);
  });
});
