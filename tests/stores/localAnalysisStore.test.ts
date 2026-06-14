import { describe, it, expect, beforeEach } from 'vitest';
import { localAnalysisStore } from '../../src/lib/stores/localAnalysisStore.svelte.ts';

describe('LocalAnalysisStore 단위 설계 및 회귀 정밀성 검정', () => {
  beforeEach(() => {
    // 매 테스트 수행 시 무부 초기화
    localAnalysisStore.startAnalysis([], 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1);
  });

  it('Store가 analysis-unavailable 상태일 때 평가가 없는 모든 후보수가 isEvaluationUnavailableForMove 검증 결과 무조건 true(분석 불가)로 표시되는지 단언한다', () => {
    // 1. 상태를 분석 불가로 전환
    localAnalysisStore.setCandidateMovesForPosition([
      { uci: 'e2e4', san: 'e4' },
      { uci: 'd2d4', san: 'd4' }
    ]);
    localAnalysisStore.setStatus('analysis-unavailable');

    // 평가치가 없는 e2e4와 d2d4에 대한 가독성
    expect(localAnalysisStore.isEvaluationUnavailableForMove('e2e4')).toBe(true);
    expect(localAnalysisStore.isEvaluationUnavailableForMove('d2d4')).toBe(true);

    // 하지만 평가치가 등록되면 analysis-unavailable 이더라도 분석 불가(true)가 아니어야(false) 함
    localAnalysisStore.addEvaluationUpdate({
      moveUci: 'e2e4',
      score: { type: 'cp', value: 35 },
      depth: 10,
      source: 'fallback'
    });
    expect(localAnalysisStore.isEvaluationUnavailableForMove('e2e4')).toBe(false);
  });

  it('이미 analysis-unavailable 등의 터미널 실패 상태일 때 setError()가 유입되어도 에러 메시지는 기록되되, status가 error로 다시 덮여 훼손되지 않고 원본 상태가 계속 보존되는 회귀 작동을 입증한다', () => {
    // 1. 불가로 셋업
    localAnalysisStore.setStatus('analysis-unavailable');

    // 2. 다른 에러 리포트 수집
    localAnalysisStore.setError('로컬 및 대체 엔진 최종 전멸', 'Detail debugging reason');

    // 3. 단언 - status 가 "error" 가 아니라 "analysis-unavailable" 로 완강하게 영속 수호되어야 함
    expect(localAnalysisStore.status).toBe('analysis-unavailable');
    expect(localAnalysisStore.errorMessage).toBe('로컬 및 대체 엔진 최종 전멸');
    expect(localAnalysisStore.lastEngineError).toBe('Detail debugging reason');
  });

  it('initAnalysisState 실행 시 실패 상태(isFailedStatus)가 관철되고 있다면, status는 idle로 리셋되지 않고 그대로 존치되며 미해결 수들이 unavailableMoveUcis에 정확히 사전 잠적 보존되는지의 계약을 검사한다', () => {
    // 1. 후보수들 지정
    localAnalysisStore.setCandidateMovesForPosition([
      { uci: 'g1f3', san: 'Nf3' },
      { uci: 'b1c3', san: 'Nc3' }
    ]);

    // 2. 분석 실패로 상태 교정
    localAnalysisStore.setStatus('analysis-unavailable');

    // 3. 새로운 세대로 이전하며 기보 상태를 전사
    localAnalysisStore.initAnalysisState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 2);

    // 4. 검사 - status 가 "idle"로 전락하지 않고 "analysis-unavailable"로 잠적 수호되어야 함
    expect(localAnalysisStore.status).toBe('analysis-unavailable');

    // 5. unavailableMoveUcis 에 지정된 세대별 잔여 후보수들이 모두 true로 수록되어 수렴되어야 함
    expect(localAnalysisStore.isEvaluationUnavailableForMove('g1f3')).toBe(true);
    expect(localAnalysisStore.isEvaluationUnavailableForMove('b1c3')).toBe(true);
  });
});
