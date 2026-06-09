import { CreateFenUrlUseCase } from './CreateFenUrlUseCase';
import type { PushLineHistoryUseCase } from '../history/PushLineHistoryUseCase';

export class NavigateMoveUseCase {
  private readonly createFenUrlUseCase = new CreateFenUrlUseCase();

  constructor(
    private readonly navigation: any,
    private readonly pushLineHistoryUseCase: PushLineHistoryUseCase
  ) {}

  public execute(playedMove: { previousFen: string; nextFen: string; san: string; from?: string; to?: string } | string): void {
    if (typeof playedMove === 'string') {
      const path = this.createFenUrlUseCase.execute(playedMove);
      if (path) {
        this.navigation.goto(path);
      }
    } else {
      // 1. 세션 히스토리 추가를 연결
      this.pushLineHistoryUseCase.execute(
        playedMove.nextFen,
        playedMove.san,
        playedMove.from,
        playedMove.to,
        playedMove.previousFen
      );

      // 2. 새 FEN URL로 history push 이동
      const path = this.createFenUrlUseCase.execute(playedMove.nextFen);
      if (path) {
        this.navigation.goto(path);
      }
    }
  }
}

