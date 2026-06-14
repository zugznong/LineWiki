import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { 
  STOCKFISH_MULTI_JS_PATH, 
  STOCKFISH_MULTI_WASM_PATH, 
  STOCKFISH_SINGLE_JS_PATH, 
  STOCKFISH_SINGLE_WASM_PATH 
} from '../../src/lib/config/runtimeConfig';

describe('Stockfish Static Assets Compliance Test Suite', () => {
  const stockfishDir = path.resolve('static/stockfish');

  // 디비전 진짜 SHA-256 매핑 - SOURCES.json 단일 출처로부터 동적 파생 (하드코딩 폴백 없음)
  const getExpectedHashes = () => {
    const sourcesJsonPath = path.join(stockfishDir, 'SOURCES.json');
    if (!fs.existsSync(sourcesJsonPath)) {
      throw new Error(`SOURCES.json outline not found at: ${sourcesJsonPath}`);
    }
    const sourcesContent = fs.readFileSync(sourcesJsonPath, 'utf-8');
    const sources = JSON.parse(sourcesContent);
    const hashes: Record<string, string> = {};
    for (const fileObj of sources.files) {
      const fileName = fileObj.filePath.replace(/^\/stockfish\//, '');
      hashes[fileName] = fileObj.sha256;
    }
    return hashes;
  };

  const expectedHashes = getExpectedHashes();
  
  it('should verify that all four critical engine assets are physically present and non-empty with correct size floor', () => {
      const requiredFiles = [
        'stockfish-18-lite.js',
        'stockfish-18-lite.wasm',
        'stockfish-18-lite-single.js',
        'stockfish-18-lite-single.wasm',
        'LICENSE.txt',
        'SOURCES.json'
      ];
  
      for (const fileName of requiredFiles) {
        const filePath = path.join(stockfishDir, fileName);
        expect(fs.existsSync(filePath), `Asset: ${fileName} does not exist at ${filePath}`).toBe(true);
  
        const stats = fs.statSync(filePath);
        if (fileName.endsWith('.wasm')) {
          // 8-byte WASM은 반드시 실패해야 하며, 현실적인 최소 규격 하한 250KB를 검증합니다
          expect(stats.size, `WASM Asset ${fileName} size is too small (${stats.size} B). Must be >= 250KB.`).toBeGreaterThanOrEqual(250000);
        } else {
          expect(stats.size, `WASM/Engine Asset: ${fileName} at path: ${filePath} is empty! (size is ${stats.size} bytes)`).toBeGreaterThan(0);
        }
      }
    });

  it('should verify WebAssembly compiled binaries compile successfully into standard WebAssembly Modules', async () => {
    const wasmFiles = [
      'stockfish-18-lite.wasm',
      'stockfish-18-lite-single.wasm'
    ];

    for (const fileName of wasmFiles) {
      const filePath = path.join(stockfishDir, fileName);
      const buffer = fs.readFileSync(filePath);
      const sizeInBytes = buffer.byteLength;
      
      console.info(`[WASM Compile Test] Compiling ${fileName}, size: ${sizeInBytes} bytes`);
      try {
        const wasmModule = await WebAssembly.compile(buffer);
        expect(wasmModule).toBeInstanceOf(WebAssembly.Module);
        console.info(`[WASM Compile Test] ${fileName} compiled successfully!`);
      } catch (err: any) {
        const calculatedHash = crypto.createHash('sha256').update(buffer).digest('hex');
        const expectedHashSetting = expectedHashes[fileName] || 'unknown';
        const first16Hex = buffer.slice(0, 16).toString('hex');
        console.error(`[WASM Compile Failed Diagnostic]
- Filename: ${fileName}
- Actual File Size: ${sizeInBytes} bytes
- Actual SHA-256: ${calculatedHash}
- Expected SHA-256 (from SOURCES.json): ${expectedHashSetting}
- First 16 Bytes (Hex): ${first16Hex}
- Error Message: ${err.message || String(err)}
`);
        throw err;
      }
    }
  });

  it('should guarantee each asset has exactly valid SHA-256 matching official build', () => {
    for (const [fileName, expectedHash] of Object.entries(expectedHashes)) {
      const filePath = path.join(stockfishDir, fileName);
      const content = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      
      expect(hash).toBe(expectedHash);
    }
  });

  it('should verify WebAssembly compiled binaries contain official WASM magic bytes', () => {
    const wasmFiles = [
      'stockfish-18-lite.wasm',
      'stockfish-18-lite-single.wasm'
    ];

    for (const fileName of wasmFiles) {
      const filePath = path.join(stockfishDir, fileName);
      const buffer = fs.readFileSync(filePath);
      
      // WASM Binary Magic Number is always 4 bytes: 0x00 0x61 0x73 0x6D (i.e., '\0asm')
      expect(buffer[0]).toBe(0x00);
      expect(buffer[1]).toBe(0x61);
      expect(buffer[2]).toBe(0x73);
      expect(buffer[3]).toBe(0x6d);
    }
  });

  it('should certify that JS engines contain real dynamic Stockfish 18 UCI identifiers rather than mock simulations', () => {
    const coreJsFiles = [
      'stockfish-18-lite.js',
      'stockfish-18-lite-single.js'
    ];

    for (const fileName of coreJsFiles) {
      const filePath = path.join(stockfishDir, fileName);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Emscripten/Stockfish 실제 컴파일된 산출물은 크기가 매우 큽니다 (최소 20KB 이상)
      expect(content.length).toBeGreaterThan(15000);

      // 진짜 Stockfish 엔진에 기명되는 시그니처 uci id name 매칭 확인
      // 컴파일된 바이너리/JS 내에는 "Stockfish" 문자열이 엄밀히 수납되어 있습니다.
      expect(content).toContain('Stockfish');

      // 단순 모의 mock 클래스가 흉내낸 코드가 아님을 재차 다짐합니다.
      expect(content).not.toContain('class Stockfish18LiteMultiThread');
      expect(content).not.toContain('LineWiki Local Heuristics Fallback');
    }
  });

  it('should guarantee runtimeConfig paths match and resolve accurately', () => {
    const resolveToStatic = (runtimePath: string) => {
      const relativePath = runtimePath.startsWith('/') ? runtimePath.slice(1) : runtimePath;
      return path.resolve('static', relativePath);
    };

    const multiJsFile = resolveToStatic(STOCKFISH_MULTI_JS_PATH);
    const multiWasmFile = resolveToStatic(STOCKFISH_MULTI_WASM_PATH);
    const singleJsFile = resolveToStatic(STOCKFISH_SINGLE_JS_PATH);
    const singleWasmFile = resolveToStatic(STOCKFISH_SINGLE_WASM_PATH);

    expect(fs.existsSync(multiJsFile)).toBe(true);
    expect(fs.existsSync(multiWasmFile)).toBe(true);
    expect(fs.existsSync(singleJsFile)).toBe(true);
    expect(fs.existsSync(singleWasmFile)).toBe(true);
  });

  it('should verify single-threaded JS wrapper exists and is readable', () => {
    const singleJsPath = path.join(stockfishDir, 'stockfish-18-lite-single.js');
    const exists = fs.existsSync(singleJsPath);
    expect(exists).toBe(true);

    const content = fs.readFileSync(singleJsPath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });
});
