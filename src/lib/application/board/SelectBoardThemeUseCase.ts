import { boardStore } from '../../stores/boardStore.svelte.ts';
import { BoardTheme } from '../../domain/board/BoardTheme';
import type { BoardSettingsPort } from '../../ports/BoardSettingsPort';

export class SelectBoardThemeUseCase {
  constructor(private readonly boardSettingsPort: BoardSettingsPort) {}

  public execute(themeName: string): void {
    const validThemes = BoardTheme.getAllThemes().map(t => t.name as string);
    let targetTheme = themeName;
    if (!validThemes.includes(themeName)) {
      console.warn(`[테마 자동 보정] 지원하지 않는 테마 이름 ${themeName} -> Classic Green으로 대체`);
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

