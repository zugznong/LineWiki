import { boardStore } from '../../stores/boardStore.svelte.ts';
import type { BoardSettingsPort } from '../../ports/BoardSettingsPort';

export class FlipBoardUseCase {
  constructor(private readonly boardSettingsPort: BoardSettingsPort) {}

  public execute(): void {
    try {
      boardStore.toggleOrientation();
      
      // Save state back to disk
      this.boardSettingsPort.saveSettings({
        theme: boardStore.getThemeName(),
        pieceStyle: boardStore.getPieceStyle(),
        orientation: boardStore.getOrientation()
      });
    } catch (err: any) {
      console.error('보드 뒤집기 작업 실행 도중 예외가 발생했습니다:', err);
    }
  }
}

