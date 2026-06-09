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
export const STOCKFISH_WASM_PATH = '/stockfish/stockfish.wasm';
export const STOCKFISH_JS_PATH = '/stockfish/stockfish.js';
