import { engineSettingsStore, type ThreadsSetting, type HashSetting, type BudgetSetting } from '../../stores/engineSettingsStore.svelte';
import type { StopLocalAnalysisUseCase } from './StopLocalAnalysisUseCase';
import type { StartCandidateAnalysisUseCase } from './StartCandidateAnalysisUseCase';

export class ChangeEngineSettingsUseCase {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingParams: {
    newThreads: ThreadsSetting;
    newHash: HashSetting;
    newBudget: BudgetSetting;
    newCustomDepth: number | undefined;
    newThreadSafetyEnabled: boolean | undefined;
    currentFen: string | null;
    candidateMoves: any[] | null;
    generation: number;
  } | null = null;

  constructor(
    private readonly stopLocalAnalysis: StopLocalAnalysisUseCase,
    private readonly startCandidateAnalysis: StartCandidateAnalysisUseCase
  ) {}

  public execute(
    newThreads: ThreadsSetting,
    newHash: HashSetting,
    newBudget: BudgetSetting,
    newCustomDepth: number | undefined,
    newThreadSafetyEnabled: boolean | undefined,
    currentFen: string | null,
    candidateMoves: any[] | null,
    generation: number
  ): void {
    // 1. 디스크 보존 처리 (동기로 실행하여 UI 프리뷰와 저장 일체감을 유지합니다.)
    engineSettingsStore.commitSettings(newThreads, newHash, newBudget, newCustomDepth, newThreadSafetyEnabled);

    // 2. 디바운스 파라미터 갱신 및 보존
    this.pendingParams = {
      newThreads,
      newHash,
      newBudget,
      newCustomDepth,
      newThreadSafetyEnabled,
      currentFen,
      candidateMoves,
      generation
    };

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // 400~600ms (500ms로 최적화) 디바운스 적용
    this.debounceTimer = setTimeout(() => {
      this.flushRestart();
    }, 500);
  }

  private flushRestart(): void {
    if (!this.pendingParams) return;
    const params = this.pendingParams;
    this.pendingParams = null;
    this.debounceTimer = null;

    try {
      // 3. 기존 검색이 완전히 종료된 후 세션 전환 및 직렬화 실행을 전담하기 위해 
      // StopLocalAnalysis 를 수동 연속 실행하지 않고, startCandidateAnalysis 를 다이렉트로 실행합니다.
      // 이렇게 함으로써 StockfishWorkerAdapter 의 직렬화 restart/queuedRestartRequest 구조가 
      // 이전 가동 FEN 스택과의 교차/경합 없이 깔끔하고 유려하게 발동됩니다.
      if (params.currentFen && params.candidateMoves && params.candidateMoves.length > 0) {
        const nextGen = params.generation + 1;
        this.startCandidateAnalysis.execute(params.currentFen, params.candidateMoves, nextGen);
      }
    } catch (err) {
      console.warn('[ChangeEngineSettingsUseCase] 설정 변경 디바운스 플러시 및 재분석 구동 에러:', err);
    }
  }
}
