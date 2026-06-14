import type { BoardSettingsPort } from '../../ports/BoardSettingsPort';
import type { Result } from '../../utils/result';
import { success } from '../../utils/result';
import { DEFAULT_THEME } from '../../config/appConfig';
import { BoardTheme } from '../../domain/board/BoardTheme';
import { PieceStyle } from '../../domain/board/PieceStyle';

export interface BoardSettingsData {
  theme: string;
  pieceStyle: string;
  orientation: 'white' | 'black';
}

export class LoadBoardSettingsUseCase {
  constructor(private readonly boardSettingsPort: BoardSettingsPort) {}

  public execute(): Result<BoardSettingsData, Error> {
    const loadedResult = this.boardSettingsPort.loadSettings();
    const defaultPieceStyle = 'Cburnett';
    
    // Default fallback settings
    const defaultSettings: BoardSettingsData = {
      theme: DEFAULT_THEME,
      pieceStyle: defaultPieceStyle,
      orientation: 'white'
    };

    if (loadedResult.isFailure()) {
      return success(defaultSettings);
    }

    const value = loadedResult.unwrap();
    
    // Validate Theme name against supported board themes
    const validThemes = BoardTheme.getAllThemes().map(t => t.name as string);
    let theme = typeof value.theme === 'string' && value.theme.trim() ? value.theme : DEFAULT_THEME;
    if (!validThemes.includes(theme)) {
      theme = DEFAULT_THEME;
    }

    // Validate Piece Style name against supported unicode styles
    let pieceStyle = typeof value.pieceStyle === 'string' && value.pieceStyle.trim() ? value.pieceStyle : defaultPieceStyle;
    
    // Handle old, legacy, or deleted styles migration to Unicode Classic
    if (pieceStyle === 'Unicode' || pieceStyle === 'Unicode Classic' || pieceStyle === 'Unicode High Contrast' || pieceStyle === 'Unicode Minimal') {
      pieceStyle = 'Unicode Classic';
    }
    
    const validStyles = PieceStyle.getAllStyles().map(s => s.name as string);
    if (!validStyles.includes(pieceStyle)) {
      pieceStyle = defaultPieceStyle;
    }
    
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


