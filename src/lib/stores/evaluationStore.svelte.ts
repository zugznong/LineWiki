import { type EngineMoveEvaluation, type MergedMoveEvaluation } from '../domain/analysis/AnalysisTypes';
import { MergeCandidateEvaluationsUseCase } from '../application/analysis/MergeCandidateEvaluationsUseCase';
import { StoredEvaluationPolicy } from '../domain/analysis/StoredEvaluationPolicy';
import { localAnalysisStore } from './localAnalysisStore.svelte';

export type EvaluationSourceStatus = 'idle' | 'loading-db' | 'db-ready' | 'local-analyzing' | 'completed' | 'error' | 'db-unavailable';

class EvaluationStore {
  private policy = new StoredEvaluationPolicy();
  private mergeUseCase = new MergeCandidateEvaluationsUseCase(this.policy);

  private state = $state<{
    activeFen: string;
    generation: number;
    storedEvaluations: Record<string, EngineMoveEvaluation>;
    sourceStatus: EvaluationSourceStatus;
  }>({
    activeFen: '',
    generation: 0,
    storedEvaluations: {},
    sourceStatus: 'idle'
  });

  // cachedMerged holds the memoized merge calculations, only re-evaluating when storedEvaluations or localAnalysisStore.evaluations update
  private cachedMerged = $derived.by(() => {
    return this.mergeUseCase.execute(this.state.storedEvaluations, localAnalysisStore.evaluations);
  });

  public get activeFen() {
    return this.state.activeFen;
  }

  public get generation() {
    return this.state.generation;
  }

  public get storedEvaluations() {
    return this.state.storedEvaluations;
  }

  public get sourceStatus() {
    return this.state.sourceStatus;
  }

  public get localEvaluations() {
    return localAnalysisStore.evaluations;
  }

  public get mergedEvaluations(): Record<string, MergedMoveEvaluation> {
    return this.cachedMerged;
  }

  public getActiveFen() {
    return this.state.activeFen;
  }

  public getGeneration() {
    return this.state.generation;
  }

  public beginPosition(fen: string, generation: number) {
    this.state.activeFen = fen;
    this.state.generation = generation;
    this.state.storedEvaluations = {};
    this.state.sourceStatus = 'loading-db';
  }

  public setStoredEvaluations(fen: string, evals: Record<string, EngineMoveEvaluation>, generation: number) {
    if (this.state.activeFen !== fen || this.state.generation !== generation) {
      return;
    }
    this.state.storedEvaluations = evals;
    this.state.sourceStatus = 'db-ready';
  }

  public setSourceStatus(status: EvaluationSourceStatus) {
    this.state.sourceStatus = status;
  }

  public clear() {
    this.state.activeFen = '';
    this.state.generation = 0;
    this.state.storedEvaluations = {};
    this.state.sourceStatus = 'idle';
  }
}

export const evaluationStore = new EvaluationStore();

