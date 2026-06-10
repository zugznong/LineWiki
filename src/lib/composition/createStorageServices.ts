import { LocalBoardSettingsAdapter } from '../adapters/storage/LocalBoardSettingsAdapter';
import { SessionLineHistoryAdapter } from '../adapters/storage/SessionLineHistoryAdapter';
import { SessionLineMarkerAdapter } from '../adapters/storage/SessionLineMarkerAdapter';
import { LoadBoardSettingsUseCase } from '../application/board/LoadBoardSettingsUseCase';
import { SaveBoardSettingsUseCase } from '../application/board/SaveBoardSettingsUseCase';
import { FlipBoardUseCase } from '../application/board/FlipBoardUseCase';
import { SelectBoardThemeUseCase } from '../application/board/SelectBoardThemeUseCase';
import { PushLineHistoryUseCase } from '../application/history/PushLineHistoryUseCase';
import { RestoreLineHistoryUseCase } from '../application/history/RestoreLineHistoryUseCase';
import { ClearLineHistoryUseCase } from '../application/history/ClearLineHistoryUseCase';
import { LineHistoryNavigationUseCase } from '../application/history/LineHistoryNavigationUseCase';
import { StartLineSessionUseCase } from '../application/history/StartLineSessionUseCase';

const boardSettings = new LocalBoardSettingsAdapter();
const lineHistory = new SessionLineHistoryAdapter();
const lineSession = new SessionLineMarkerAdapter();

const loadBoardSettings = new LoadBoardSettingsUseCase(boardSettings);
const saveBoardSettings = new SaveBoardSettingsUseCase(boardSettings);
const flipBoard = new FlipBoardUseCase(boardSettings);
const selectBoardTheme = new SelectBoardThemeUseCase(boardSettings);

const restoreLineHistory = new RestoreLineHistoryUseCase(lineHistory, lineSession);
const clearLineHistory = new ClearLineHistoryUseCase(lineHistory);
const navigateLineHistory = new LineHistoryNavigationUseCase(lineHistory);
const pushLineHistory = new PushLineHistoryUseCase(lineHistory, navigateLineHistory);
const startLineSession = new StartLineSessionUseCase(lineSession);

export function createStorageServices() {
  return {
    boardSettings,
    lineHistory,
    lineSession,
    loadBoardSettings,
    saveBoardSettings,
    flipBoard,
    selectBoardTheme,
    pushLineHistory,
    restoreLineHistory,
    clearLineHistory,
    navigateLineHistory,
    startLineSession
  };
}
