import { SafeBrowserStorage } from './SafeBrowserStorage';
import type { BoardSettingsPort } from '$lib/ports/BoardSettingsPort';
import type { BoardSettingsData } from '$lib/application/board/LoadBoardSettingsUseCase';
import type { Result } from '$lib/utils/result';
import { success, failure } from '$lib/utils/result';
import { DEFAULT_THEME, DEFAULT_PIECE_STYLE, STORAGE_KEYS } from '$lib/config/appConfig';

export class LocalBoardSettingsAdapter implements BoardSettingsPort {
  private readonly storage = new SafeBrowserStorage('localStorage');

  public loadSettings(): Result<BoardSettingsData, Error> {
    try {
      const theme = this.storage.getItem(STORAGE_KEYS.THEME) || DEFAULT_THEME;
      const pieceStyle = this.storage.getItem(STORAGE_KEYS.PIECE_STYLE) || DEFAULT_PIECE_STYLE;
      const orientation = (this.storage.getItem(STORAGE_KEYS.ORIENTATION) || 'white') as 'white' | 'black';

      return success({ theme, pieceStyle, orientation });
    } catch (err: any) {
      return failure(err);
    }
  }

  public saveSettings(settings: BoardSettingsData): Result<void, Error> {
    try {
      this.storage.setItem(STORAGE_KEYS.THEME, settings.theme);
      this.storage.setItem(STORAGE_KEYS.PIECE_STYLE, settings.pieceStyle);
      this.storage.setItem(STORAGE_KEYS.ORIENTATION, settings.orientation);
      return success(undefined);
    } catch (err: any) {
      return failure(err);
    }
  }
}
