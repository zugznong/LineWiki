import type { BoardSettingsPort } from '../../ports/BoardSettingsPort';
import type { Result } from '../../utils/result';
import { success } from '../../utils/result';
import { DEFAULT_THEME, DEFAULT_PIECE_STYLE } from '../../config/appConfig';

export interface BoardSettingsData {
  theme: string;
  pieceStyle: string;
  orientation: 'white' | 'black';
}

export class LoadBoardSettingsUseCase {
  constructor(private readonly boardSettingsPort: BoardSettingsPort) {}

  public execute(): Result<BoardSettingsData, Error> {
    const loadedResult = this.boardSettingsPort.loadSettings();
    
    // Default fallback settings
    const defaultSettings: BoardSettingsData = {
      theme: DEFAULT_THEME,
      pieceStyle: DEFAULT_PIECE_STYLE,
      orientation: 'white'
    };

    if (loadedResult.isFailure()) {
      return success(defaultSettings);
    }

    const value = loadedResult.unwrap();
    
    // 만약 데이터가 정상적이지 않거나 깨진 경우 기본값으로 원활히 복구(Self-Healing)
    const theme = typeof value.theme === 'string' && value.theme.trim() ? value.theme : DEFAULT_THEME;
    const pieceStyle = typeof value.pieceStyle === 'string' && value.pieceStyle.trim() ? value.pieceStyle : DEFAULT_PIECE_STYLE;
    
    let orientation: 'white' | 'black' = 'white';
    if (value.orientation === 'white' || value.orientation === 'black') {
      orientation = value.orientation;
    }

    return success({
      theme,
      pieceStyle,
      orientation
    });
  }
}

