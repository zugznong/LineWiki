import { boardStore } from '../../stores/boardStore.svelte.ts';
import type { BoardSettingsPort } from '../../ports/BoardSettingsPort';

export class SelectBoardThemeUseCase {
  constructor(private readonly boardSettingsPort: BoardSettingsPort) {}

  public execute(themeName: string): void {
    // 오픈베타 버전에서는 유저 경험의 일관성을 위해 'Classic Green' 테마만 선택 가능하도록 보정합니다.
    // 향후 다크 그레이, 우드 및 다채로운 커스텀 테마 확장을 유연하게 설계할 수 있는 확장 인터페이스입니다.
    let targetTheme = themeName;
    if (themeName !== 'Classic Green') {
      console.warn(`[오픈베타 사양 지정] 현재 에디션에서는 'Classic Green' 테마만 공식 지원합니다. 테마가 자동 보정되었습니다: ${themeName} -> Classic Green`);
      targetTheme = 'Classic Green';
    }

    boardStore.setTheme(targetTheme);
    
    // Save to sync changes
    this.boardSettingsPort.saveSettings({
      theme: targetTheme,
      pieceStyle: boardStore.getPieceStyle(),
      orientation: boardStore.getOrientation()
    });
  }
}

