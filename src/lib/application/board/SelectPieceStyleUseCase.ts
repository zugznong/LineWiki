import { boardStore } from '../../stores/boardStore.svelte.ts';
import { PieceStyle } from '../../domain/board/PieceStyle';
import type { BoardSettingsPort } from '../../ports/BoardSettingsPort';

export class SelectPieceStyleUseCase {
  constructor(private readonly boardSettingsPort: BoardSettingsPort) {}

  public execute(pieceStyle: string): void {
    const validStyles = PieceStyle.getAllStyles().map(s => s.name as string);
    let targetStyle = pieceStyle;
    if (!validStyles.includes(pieceStyle)) {
      console.warn(`[기물 스타일 자동 보정] 지원하지 않는 기물 스타일 ${pieceStyle} -> Cburnett으로 대체`);
      targetStyle = 'Cburnett';
    }

    boardStore.setPieceStyle(targetStyle);

    // Save to sync changes
    this.boardSettingsPort.saveSettings({
      theme: boardStore.themeName,
      pieceStyle: targetStyle,
      orientation: boardStore.getOrientation()
    });
  }
}
