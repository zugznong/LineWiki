import type { LocalAnalysisPort } from '../../ports/LocalAnalysisPort';
import type { ChessEnginePort } from '../../ports/ChessEnginePort';
import { Fen } from '../../domain/chess/Fen';
import type { LocalAnalysisRequest } from '../../domain/analysis/LocalAnalysisRequest';
import { engineSettingsStore } from '$lib/stores/engineSettingsStore.svelte.ts';
import { sessionHistoryStore } from '$lib/stores/sessionHistoryStore.svelte.ts';

export class StartLocalAnalysisUseCase {
  constructor(
    private readonly localAnalysis: LocalAnalysisPort,
    private readonly chessEngine: ChessEnginePort
  ) {}

  public execute(
    fenOrParams: string | {
      fen: string;
      candidateMoves?: any[];
      targetMoves?: string[];
      threads?: number;
      hash?: number;
      nodes?: number;
      targetDepth?: number;
      softNodeCap?: number;
      analysisMode?: 'depth' | 'nodes' | 'infinite';
      multiPv?: number;
    },
    legacyMoves?: any[],
    targetMoves?: string[]
  ): void {
    let fen: string;
    let moves: any[] | undefined;
    let actualTargetMoves: string[] | undefined;
    let threads = engineSettingsStore.actualThreads;
    let hash = engineSettingsStore.actualHash;
    let nodes: number | undefined = engineSettingsStore.actualNodeBudget;
    let targetDepth = engineSettingsStore.currentSettings.targetDepth;
    let softNodeCap = engineSettingsStore.currentSettings.softNodeCap;
    let analysisMode = engineSettingsStore.currentSettings.analysisMode;
    let budget = engineSettingsStore.currentSettings.budget;
    let customDepth = engineSettingsStore.currentSettings.customDepth;
    let multiPv: number | undefined;

    if (typeof fenOrParams === 'string') {
      fen = fenOrParams;
      moves = legacyMoves;
      actualTargetMoves = targetMoves;
    } else {
      fen = fenOrParams.fen;
      moves = fenOrParams.candidateMoves;
      actualTargetMoves = fenOrParams.targetMoves;
      threads = fenOrParams.threads ?? engineSettingsStore.actualThreads;
      hash = fenOrParams.hash ?? engineSettingsStore.actualHash;
      nodes = fenOrParams.nodes !== undefined ? fenOrParams.nodes : engineSettingsStore.actualNodeBudget;
      targetDepth = fenOrParams.targetDepth ?? engineSettingsStore.currentSettings.targetDepth;
      softNodeCap = fenOrParams.softNodeCap !== undefined ? fenOrParams.softNodeCap : engineSettingsStore.currentSettings.softNodeCap;
      analysisMode = fenOrParams.analysisMode ?? engineSettingsStore.currentSettings.analysisMode;
      budget = (fenOrParams as any).budget ?? engineSettingsStore.currentSettings.budget;
      customDepth = (fenOrParams as any).customDepth ?? engineSettingsStore.currentSettings.customDepth;
      multiPv = fenOrParams.multiPv;
    }

    if (!moves || moves.length === 0) {
      const fenResult = Fen.create(fen);
      if (fenResult.isOk()) {
        moves = this.chessEngine.getLegalMoves(fenResult.unwrap());
      } else {
        moves = [];
      }
    }

    const uciMoves = actualTargetMoves ?? moves.map((m: any) => m.uci).filter(Boolean);

    // 세션 히스토리(Line History) 상에서 수순 전체를 추적 및 완벽하게 복원합니다.
    const movesFromStart = sessionHistoryStore.getMovesFromStart(fen);
    const initialFen = movesFromStart ? sessionHistoryStore.getInitialFen() || undefined : undefined;
    
    // 복원 불가능하거나 수순 정보가 일절 수집되지 않는 FEN일 때에만 안전하게 fenOnly: true로 강제 격상 설정합니다.
    const fenOnly = movesFromStart === null;

    const request: LocalAnalysisRequest = {
      fen,
      allCandidateMoves: moves,
      targetMoves: uciMoves,
      threads,
      hash,
      nodes,
      targetDepth,
      softNodeCap,
      analysisMode,
      budget,
      customDepth,
      multiPv: multiPv ?? uciMoves.length,
      movesFromStart: movesFromStart || undefined,
      initialFen,
      fenOnly
    };

    this.localAnalysis.start(request);
  }
}
