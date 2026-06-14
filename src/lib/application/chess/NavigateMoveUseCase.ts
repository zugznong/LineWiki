import { CreateFenUrlUseCase } from './CreateFenUrlUseCase';
import type { PushLineHistoryUseCase } from '../history/PushLineHistoryUseCase';
import type { StartLineSessionUseCase } from '../history/StartLineSessionUseCase';
import type { ChessEnginePort } from '../../ports/ChessEnginePort';
import { localAnalysisStore } from '../../stores/localAnalysisStore.svelte';
import { evaluationStore } from '../../stores/evaluationStore.svelte';

export class NavigateMoveUseCase {
  private readonly createFenUrlUseCase: CreateFenUrlUseCase;

  constructor(
    private readonly navigation: any,
    private readonly pushLineHistoryUseCase: PushLineHistoryUseCase,
    private readonly startLineSessionUseCase: StartLineSessionUseCase,
    private readonly chessEngine: ChessEnginePort
  ) {
    this.createFenUrlUseCase = new CreateFenUrlUseCase(chessEngine);
  }

  public execute(playedMove: { previousFen: string; nextFen: string; san: string; from?: string; to?: string } | string): { success: boolean; error?: string } {
    if (typeof playedMove === 'string') {
      const path = this.createFenUrlUseCase.execute(playedMove);
      if (path) {
        localAnalysisStore.clearProvisionalEvaluation();
        return this.navigation.goto(path);
      }
      return { success: false, error: '유효한 FEN 경로를 생성할 수 없습니다.' };
    } else {
      // 1. 공식 앱 흐름 상태가 아닐 수 있는 공유 링크 진입 상태에서 첫 수를 두는 경우, 정상 세션으로 전환 마킹
      this.startLineSessionUseCase.execute();

      // 직전 수의 평가를 provisional 임시 평가치로 백업
      if (playedMove.from && playedMove.to) {
        const uciPrefix = (playedMove.from + playedMove.to).toLowerCase();
        const foundUci = Object.keys(evaluationStore.mergedEvaluations).find(k => k.toLowerCase().startsWith(uciPrefix));
        if (foundUci) {
          const evalItem = evaluationStore.mergedEvaluations[foundUci];
          if (evalItem) {
            localAnalysisStore.setProvisionalEvaluation({
              moveSan: evalItem.moveSan,
              moveUci: evalItem.moveUci,
              score: evalItem.score,
              depth: evalItem.depth,
              source: 'provisional'
            });
          }
        } else {
          localAnalysisStore.clearProvisionalEvaluation();
        }
      } else {
        localAnalysisStore.clearProvisionalEvaluation();
      }

      // 2. 세션 히스토리 추가를 연결
      this.pushLineHistoryUseCase.execute(
        playedMove.nextFen,
        playedMove.san,
        playedMove.from,
        playedMove.to,
        playedMove.previousFen
      );

      // 3. 새 FEN URL로 history push 이동
      const path = this.createFenUrlUseCase.execute(playedMove.nextFen);
      if (path) {
        return this.navigation.goto(path);
      }
      return { success: false, error: '유효한 FEN 경로를 생성할 수 없습니다.' };
    }
  }
}

