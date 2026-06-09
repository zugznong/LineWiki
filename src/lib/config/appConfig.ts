export const APP_NAME = 'LineWiki';
export const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const DEFAULT_THEME = 'Classic Green';
export const DEFAULT_PIECE_STYLE = 'Unicode';

// 시작 경로
export const START_PATH = '/';

// FEN 페이지 prefix
export const FEN_PAGE_PREFIX = '/fen/';

// localStorage / sessionStorage key 상수
export const STORAGE_KEYS = {
  THEME: 'linewiki.board.theme',
  PIECE_STYLE: 'linewiki.board.pieceStyle',
  ORIENTATION: 'linewiki.board.orientation',
  SESSION_HISTORY: 'linewiki.session.history'
} as const;
