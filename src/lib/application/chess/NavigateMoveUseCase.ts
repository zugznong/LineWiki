import { CreateFenUrlUseCase } from './CreateFenUrlUseCase';
import type { PushLineHistoryUseCase } from '../history/PushLineHistoryUseCase';
import type { StartLineSessionUseCase } from '../history/StartLineSessionUseCase';
import type { ChessEnginePort } from '../../ports/ChessEnginePort';

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

  public execute(playedMove: { previousFen: string; nextFen: string; san: string; from?: string; to?: string } | string): void {
    if (typeof playedMove === 'string') {
      const path = this.createFenUrlUseCase.execute(playedMove);
      if (path) {
        this.navigation.goto(path);
      }
    } else {
      // 1. 공식 앱 흐름 상태가 아닐 수 있는 공유 링크 진입 상태에서 첫 수를 두는 경우, 정상 세션으로 전환 마킹
      this.startLineSessionUseCase.execute();

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
        this.navigation.goto(path);
      }
    }
  }
}

