export const isBrowser = typeof window !== 'undefined';

// Development environment detection
export const isDevelopment = typeof (globalThis as any).process !== 'undefined' 
  ? (globalThis as any).process.env?.NODE_ENV === 'development' 
  : import.meta.env?.DEV === true;

// Cloudflare Pages environment detection
export const isCloudflarePages = typeof (globalThis as any).process !== 'undefined' 
  ? (globalThis as any).process.env?.CF_PAGES === '1' 
  : import.meta.env?.CF_PAGES === '1';

// Stockfish static paths
export const STOCKFISH_STATIC_DIR = '/stockfish';
export const STOCKFISH_MULTI_JS_PATH = '/stockfish/stockfish-18-lite.js';
export const STOCKFISH_MULTI_WASM_PATH = '/stockfish/stockfish-18-lite.wasm';
export const STOCKFISH_SINGLE_JS_PATH = '/stockfish/stockfish-18-lite-single.js';
export const STOCKFISH_SINGLE_WASM_PATH = '/stockfish/stockfish-18-lite-single.wasm';

// 대체(Fallback) 평가 표시 기본 비활성화 옵션 (기본값 false)
export const ENABLE_HEURISTIC_FALLBACK_EVALUATIONS = false;
