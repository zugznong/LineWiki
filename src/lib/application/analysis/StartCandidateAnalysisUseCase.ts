import type { LoadStoredEvaluationsUseCase } from './LoadStoredEvaluationsUseCase';
import type { SelectLocalAnalysisTargetsUseCase } from './SelectLocalAnalysisTargetsUseCase';
import type { StartLocalAnalysisUseCase } from './StartLocalAnalysisUseCase';
import { evaluationStore } from '../../stores/evaluationStore.svelte';
import { localAnalysisStore } from '../../stores/localAnalysisStore.svelte';

export class StartCandidateAnalysisUseCase {
  private currentAbortController: AbortController | null = null;

  constructor(
    private readonly loadStoredEvaluations: LoadStoredEvaluationsUseCase,
    private readonly selectLocalAnalysisTargets: SelectLocalAnalysisTargetsUseCase,
    private readonly startLocalAnalysis: StartLocalAnalysisUseCase
  ) {}

  public async execute(fen: string, candidateMoves: any[], generation: number): Promise<void> {
    // 런타임 검증: 입력 후보수 배열이 올바른 형태의 객체 배열인지 검증
    if (!Array.isArray(candidateMoves)) {
      const errMsg = `후보수 리스트가 올바른 배열 형태가 아닙니다. type: ${typeof candidateMoves}`;
      localAnalysisStore.setStatus('error');
      localAnalysisStore.setError(errMsg);
      console.error('[StartCandidateAnalysisUseCase] Candidate moves is not an array:', candidateMoves);
      return;
    }

    const hasInvalidFormat = candidateMoves.some(
      m => !m || typeof m !== 'object' || typeof m.uci !== 'string'
    );

    if (hasInvalidFormat) {
      const errMsg = `후보수 중 올바른 객체(uci 문자열 필드를 가짐) 형태가 아닌 부적절한 데이터 타입이 발견되었습니다.`;
      localAnalysisStore.setStatus('error');
      localAnalysisStore.setError(errMsg);
      console.error('[StartCandidateAnalysisUseCase] Invalid candidateMoves data format (Expected array of objects with "uci: string"):', candidateMoves);
      return;
    }

    // 이전 진행 중인 비동기 DB 조회가 있을 시 완전히 취소 선언하여 불필요 연산 소모 방지
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    const controller = new AbortController();
    this.currentAbortController = controller;

    // 분석을 개시하기 전에 현재 전체 후보수 리스트를 로컬 분석 스토어에 보존하고 상태를 초기화합니다.
    localAnalysisStore.setCandidateMovesForPosition(candidateMoves);
    localAnalysisStore.initAnalysisState(fen, generation);

    // 1. UI에 즉시 FEN 로딩 상태(loading) 및 세대 번호 반영
    evaluationStore.beginPosition(fen, generation);

    // 직전 후보수 평가가 있으면 임시 provisional 평가로 채워서 화면 깜빡임을 방지합니다.
    localAnalysisStore.injectProvisionalEvaluations(candidateMoves);

    const moveUcis = candidateMoves.map(m => m.uci);

    try {
      // 2. DB 평가 조회 (비동기) - AbortSignal 통과
      const dbResult = await this.loadStoredEvaluations.execute(fen, moveUcis, controller.signal);

      // 비동기 처리 도중 다음 FEN으로 이동하여 제네레이션이 변경되었거나 취소된 경우 폐기 가드
      if (
        controller.signal.aborted ||
        evaluationStore.activeFen !== fen ||
        evaluationStore.generation !== generation
      ) {
        return;
      }

      if (dbResult.isOk()) {
        const batch = dbResult.unwrap();
        const storedEvals = batch.evaluations;

        // 3. 즉시 DB 결과 반영
        evaluationStore.setStoredEvaluations(fen, storedEvals, generation);

        // 4. 로컬 실시간 보강 분석 대상 선별 (StoredEvaluationPolicy 적용됨)
        const targets = this.selectLocalAnalysisTargets.execute(candidateMoves, storedEvals);

        // 5. 실시간 보강 타겟 리스트가 남은 경우에만 Stockfish 로컬 분석 기동
        if (targets.length > 0) {
          localAnalysisStore.setCandidateMovesForPosition(candidateMoves);
          localAnalysisStore.setStatus('analyzing');
          evaluationStore.setSourceStatus('local-analyzing');
          const targetUcis = targets.map(m => m.uci).filter(Boolean);
          try {
            await this.startLocalAnalysis.execute(fen, candidateMoves, targetUcis);
          } catch (err: any) {
            console.error('[StartCandidateAnalysisUseCase] 로컬 분석 기동 도중 예외가 수집되었습니다.', err);
            localAnalysisStore.setStatus('analysis-unavailable');
            localAnalysisStore.setError('로컬 및 대체 분석 엔진 구동에 완전히 실패했습니다.');
            evaluationStore.setSourceStatus('error');
          }
        } else {
          // 보강이 전혀 불필요한 경우 분석 완료로 깔끔하게 전이
          localAnalysisStore.setCandidateMovesForPosition(candidateMoves);
          localAnalysisStore.setEngineMode('db-only');
          localAnalysisStore.setStatus('completed');
          evaluationStore.setSourceStatus('completed');
        }
      } else {
        // DB 조회 편의 실패 시 'db-unavailable'을 분출한 후 'local-analyzing' 상태에서 전력 로컬 분석 가동
        evaluationStore.setSourceStatus('db-unavailable');
        evaluationStore.setSourceStatus('local-analyzing');
        localAnalysisStore.setCandidateMovesForPosition(candidateMoves);
        localAnalysisStore.setStatus('analyzing');
        try {
          await this.startLocalAnalysis.execute(fen, candidateMoves);
        } catch (err: any) {
          console.error('[StartCandidateAnalysisUseCase] 로컬 분석 대안 기동 도중 예외:', err);
          localAnalysisStore.setStatus('analysis-unavailable');
          localAnalysisStore.setError('로컬 분석기 실행 중 복구 불가능한 장애가 발견되었습니다.');
          evaluationStore.setSourceStatus('error');
        }
      }
    } catch (error) {
      // 대내외적 예외 발생 시 'db-unavailable' 및 'local-analyzing'으로 승계
      evaluationStore.setSourceStatus('db-unavailable');
      evaluationStore.setSourceStatus('local-analyzing');
      localAnalysisStore.setCandidateMovesForPosition(candidateMoves);
      localAnalysisStore.setStatus('analyzing');
      try {
        await this.startLocalAnalysis.execute(fen, candidateMoves);
      } catch (err: any) {
        console.error('[StartCandidateAnalysisUseCase] 대외 예외 복구 도중 최종 실패:', err);
        localAnalysisStore.setStatus('analysis-unavailable');
        evaluationStore.setSourceStatus('error');
      }
    }
  }
}
