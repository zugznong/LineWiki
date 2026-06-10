import { type EngineMoveEvaluation, type MergedMoveEvaluation } from '../domain/analysis/AnalysisTypes';
import { MergeCandidateEvaluationsUseCase } from '../application/analysis/MergeCandidateEvaluationsUseCase';
import { localAnalysisStore } from './localAnalysisStore.svelte';

class EvaluationStore {
  private mergeUseCase = new MergeCandidateEvaluationsUseCase();

  private state = $state<{
    activeFen: string;
    storedEvaluations: Record<string, EngineMoveEvaluation>;
    sourceStatus: 'idle' | 'loading' | 'loaded' | 'error';
  }>({
    activeFen: '',
    storedEvaluations: {},
    sourceStatus: 'idle'
  });

  public get activeFen() {
    return this.state.activeFen;
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
    return this.mergeUseCase.execute(this.state.storedEvaluations, this.localEvaluations);
  }

  public beginPosition(fen: string) {
    this.state.activeFen = fen;
    this.state.storedEvaluations = {};
    this.state.sourceStatus = 'loading';
  }

  public setStoredEvaluations(fen: string, evals: Record<string, EngineMoveEvaluation>) {
    if (this.state.activeFen !== fen) {
      return;
    }
    this.state.storedEvaluations = evals;
    this.state.sourceStatus = 'loaded';
  }

  public setSourceStatus(status: 'idle' | 'loading' | 'loaded' | 'error') {
    this.state.sourceStatus = status;
  }

  public clear() {
    this.state.activeFen = '';
    this.state.storedEvaluations = {};
    this.state.sourceStatus = 'idle';
  }
}

export const evaluationStore = new EvaluationStore();
