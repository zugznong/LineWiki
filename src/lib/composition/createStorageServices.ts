import { LocalBoardSettingsAdapter } from '../adapters/storage/LocalBoardSettingsAdapter';
import { SessionLineHistoryAdapter } from '../adapters/storage/SessionLineHistoryAdapter';
import { LoadBoardSettingsUseCase } from '../application/board/LoadBoardSettingsUseCase';
import { SaveBoardSettingsUseCase } from '../application/board/SaveBoardSettingsUseCase';
import { FlipBoardUseCase } from '../application/board/FlipBoardUseCase';
import { SelectBoardThemeUseCase } from '../application/board/SelectBoardThemeUseCase';
import { PushLineHistoryUseCase } from '../application/history/PushLineHistoryUseCase';
import { RestoreLineHistoryUseCase } from '../application/history/RestoreLineHistoryUseCase';
import { ClearLineHistoryUseCase } from '../application/history/ClearLineHistoryUseCase';

const boardSettings = new LocalBoardSettingsAdapter();
const lineHistory = new SessionLineHistoryAdapter();

const loadBoardSettings = new LoadBoardSettingsUseCase(boardSettings);
const saveBoardSettings = new SaveBoardSettingsUseCase(boardSettings);
const flipBoard = new FlipBoardUseCase(boardSettings);
const selectBoardTheme = new SelectBoardThemeUseCase(boardSettings);

const pushLineHistory = new PushLineHistoryUseCase(lineHistory);
const restoreLineHistory = new RestoreLineHistoryUseCase(lineHistory);
const clearLineHistory = new ClearLineHistoryUseCase(lineHistory);

export function createStorageServices() {
  return {
    boardSettings,
    lineHistory,
    loadBoardSettings,
    saveBoardSettings,
    flipBoard,
    selectBoardTheme,
    pushLineHistory,
    restoreLineHistory,
    clearLineHistory
  };
}
