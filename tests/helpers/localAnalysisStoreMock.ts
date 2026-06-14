import { vi } from 'vitest';

export function createLocalAnalysisStoreMock() {
  const store = {
    // Plain mutable properties
    status: 'idle' as string,
    evaluations: {} as Record<string, any>,
    candidateMoves: [] as any[],
    errorMessage: null as string | null,
    completedFrameDepth: null as number | null,
    targetDepth: 20,
    targetCount: 0,
    resolvedCount: 0,
    nodes: 0,
    nps: 0,
    engineMode: 'stockfish' as 'stockfish' | 'fallback' | 'db-only',
    engineBuildType: 'multi' as 'multi' | 'single' | 'multi-failed-single-fallback' | 'fallback' | 'db-only',
    fallbackReason: null as string | null,
    lastEngineError: null as string | null,
    unavailableMoveUcis: {} as Record<string, boolean>,
    activeFen: null as string | null,
    generation: null as number | null,
    staircaseStep: 'none' as 'none' | 'stabilizing' | 'transitioning' | 'expanded',
    restartReason: null as string | null,
    provisionalEvaluation: null as any,

    // Read-only logic-based properties (getters)
    get isAnalyzing() {
      return store.status === 'analyzing' || store.status === 'analyzing-deeper' || store.status === 'depth-progress' || store.status === 'fallback-running';
    },
    get isStockfishFailed() { return store.status === 'stockfish-failed'; },
    get isFallbackRunning() { return store.status === 'fallback-running'; },
    get isFallbackDisabled() { return store.status === 'fallback-disabled'; },
    get isFallbackFailed() { return store.status === 'fallback-failed'; },
    get isAnalysisUnavailable() { return store.status === 'analysis-unavailable'; },
    get minimumTargetCompleted() {
      return store.completedFrameDepth !== null && store.completedFrameDepth >= 24;
    },
    get isAllMovesAnalyzedToTargetDepth() {
      if (store.targetCount <= 0) return false;
      const keys = Object.keys(store.evaluations);
      if (keys.length < store.targetCount) return false;
      for (const uci of keys) {
        const ev = store.evaluations[uci];
        if (!ev || ev.depth < store.targetDepth) return false;
      }
      return true;
    },

    // Spies
    setRestartReason: vi.fn(function(this: any, reason: any) { this.restartReason = reason; }),
    getProvisionalEvaluation: vi.fn(function(this: any) { return this.provisionalEvaluation; }),
    setProvisionalEvaluation: vi.fn(function(this: any, ev: any) { this.provisionalEvaluation = ev; }),
    setProvisionalSeedEvaluation: vi.fn(function(this: any, ev: any) { this.provisionalEvaluation = ev; }),
    rememberLastSelectedMoveEvaluation: vi.fn(function(this: any, uci: any) {
      if (this.evaluations[uci]) {
        this.provisionalEvaluation = this.evaluations[uci];
      } else {
        this.provisionalEvaluation = null;
      }
    }),
    clearProvisionalEvaluation: vi.fn(function(this: any) { this.provisionalEvaluation = null; }),
    injectProvisionalEvaluations: vi.fn(function(this: any, candidateMoves: any[]) {
      if (this.provisionalEvaluation) {
        for (const m of candidateMoves) {
          this.evaluations[m.uci] = {
            depth: this.provisionalEvaluation.depth,
            score: this.provisionalEvaluation.score,
            source: 'provisional'
          };
        }
      }
    }),
    setEngineBuildType: vi.fn(function(this: any, type: any) { this.engineBuildType = type; }),
    setEngineMode: vi.fn(function(this: any, mode: any) { this.engineMode = mode; }),
    setFallbackState: vi.fn(function(this: any, reason: string, errorMsg?: string | null) {
      this.engineMode = 'fallback';
      this.fallbackReason = reason;
      this.lastEngineError = errorMsg || null;
    }),
    clearFallbackState: vi.fn(function(this: any) {
      this.engineMode = 'stockfish';
      this.fallbackReason = null;
      this.lastEngineError = null;
    }),
    setStaircaseStep: vi.fn(function(this: any, step: any) { this.staircaseStep = step; }),
    setStatus: vi.fn(function(this: any, status: any) { this.status = status; }),
    startAnalysis: vi.fn(function(this: any, candidateMoves = [], fen?, generation?, targetDepth?) {
      this.status = 'analyzing';
      this.evaluations = {};
      this.candidateMoves = candidateMoves;
      this.errorMessage = null;
      this.completedFrameDepth = null;
      this.targetDepth = targetDepth ?? 20;
      this.targetCount = candidateMoves.length;
      this.resolvedCount = 0;
      this.nodes = 0;
      this.nps = 0;
      this.staircaseStep = 'none';
      this.unavailableMoveUcis = {};
      if (fen !== undefined) this.activeFen = fen;
      if (generation !== undefined) this.generation = generation;
    }),
    setCandidateMovesForPosition: vi.fn(function(this: any, candidateMoves) {
      this.candidateMoves = candidateMoves;
      this.targetCount = candidateMoves.length;
    }),
    initAnalysisState: vi.fn(function(this: any, fen, generation) {
      this.activeFen = fen;
      this.generation = generation;
      this.errorMessage = null;
    }),
    markUnavailableMoves: vi.fn(function(this: any, ucis: string[]) {
      for (const uci of ucis) {
        this.unavailableMoveUcis[uci] = true;
      }
    }),
    clearUnavailableMoves: vi.fn(function(this: any) {
      this.unavailableMoveUcis = {};
    }),
    stopAnalysis: vi.fn(function(this: any) {
      if (this.status === 'analyzing' || this.status === 'analyzing-deeper' || this.status === 'depth-progress') {
        this.status = 'completed';
      }
    }),
    setReady: vi.fn(function(this: any) {
      this.status = 'ready';
    }),
    setError: vi.fn(function(this: any, reason: string, details?: string | null) {
      this.status = 'error';
      this.errorMessage = reason;
      if (details) this.lastEngineError = details;
    }),
    setEngineError: vi.fn(function(this: any, err: string | null) {
      this.lastEngineError = err;
    }),
    restartAnalysisPreservingEvaluations: vi.fn(function(this: any, candidateMoves = [], options?) {
      this.status = 'analyzing';
      this.candidateMoves = candidateMoves;
    }),
    addEvaluationUpdate: vi.fn(function(this: any, update: any) {
      this.evaluations[update.moveUci] = {
        depth: update.depth,
        score: update.score,
        source: update.source,
        nodes: update.nodes
      };
    }),
    replaceEvaluationFrame: vi.fn(function(this: any, frame: any[]) {
      if (frame && frame.length > 0) {
        let min = 999;
        frame.forEach((update) => {
          if (update.depth < min) min = update.depth;
          const targetUci = update.rootMoveUci || update.bestMoveUci || update.moveUci;
          if (targetUci) {
            this.evaluations[targetUci] = {
              depth: update.depth,
              score: update.score,
              source: update.source,
              nodes: update.nodes
            };
          }
        });
        this.completedFrameDepth = min;
      }
    }),
  };

  return store;
}
