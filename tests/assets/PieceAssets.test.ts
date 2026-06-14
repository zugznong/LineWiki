import { describe, it, expect } from 'vitest';
import { PieceAssetPath } from '../../src/lib/domain/board/PieceAssetPath';
import { PieceStyle } from '../../src/lib/domain/board/PieceStyle';
import fs from 'fs';
import path from 'path';

describe('PieceAssets Regression & Security Tests', () => {
  const pieces = ['k', 'q', 'r', 'b', 'n', 'p'];
  const colors = ['w', 'b'];

  const getPacksToTest = (): string[] => {
    const sourcesJsonPath = path.resolve(__dirname, '../../static/pieces/SOURCES.json');
    if (!fs.existsSync(sourcesJsonPath)) {
      throw new Error(`SOURCES.json not found at ${sourcesJsonPath}`);
    }
    const sourcesData = JSON.parse(fs.readFileSync(sourcesJsonPath, 'utf8'));
    const sourcesPacks = Object.keys(sourcesData);

    const stylePacks = PieceStyle.getAllStyles()
      .filter((s): s is any => s.kind === 'svg')
      .map(s => s.assetDirectory);

    // Merge both registries to ensure no silent omissions
    return Array.from(new Set([...sourcesPacks, ...stylePacks]));
  };

  it('should verify that all active styles and registered packs contain exactly 12 required chess piece files with correct lowercase names', () => {
    const piecesDir = path.resolve(__dirname, '../../static/pieces');
    expect(fs.existsSync(piecesDir)).toBe(true);

    const allPacks = getPacksToTest();
    expect(allPacks.length).toBeGreaterThanOrEqual(4);

    for (const pack of allPacks) {
      const packDir = path.join(piecesDir, pack);
      expect(fs.existsSync(packDir)).toBe(true);

      const files = fs.readdirSync(packDir);
      const svgFiles = files.filter(f => f.endsWith('.svg'));
      
      // Each pack must contain exactly 12 pieces SVG files
      expect(svgFiles.length).toBe(12);

      // Verify each piece file is exactly present with correct lowercase name
      for (const color of colors) {
        for (const piece of pieces) {
          const expectedFile = `${color}${piece}.svg`;
          
          // Verify lowercase correctness by ensuring we do not have case mismatches on disk
          expect(svgFiles).toContain(expectedFile);
          
          const fullPath = path.join(packDir, expectedFile);
          expect(fs.existsSync(fullPath)).toBe(true);
        }
      }
    }
  });

  it('should verify that PieceAssetPath.getPath() correlates exactly and guarantees correct localized lowercase file presence', () => {
    const allPacks = getPacksToTest();
    const staticDir = path.resolve(__dirname, '../../static');

    for (const pack of allPacks) {
      for (const color of colors) {
        for (const piece of pieces) {
          const expectedSub = `/pieces/${pack}/${color}${piece}.svg`;
          const actualPath = PieceAssetPath.getPath(pack, color, piece);
          
          // 1) Verify path returns correct lowercase pattern
          expect(actualPath).toBe(expectedSub);
          
          // 2) Verify no uppercase letters are present in the final asset path
          expect(actualPath).toBe(actualPath.toLowerCase());

          // 3) Verify we do NOT have nested paths like public/piece/ or /public/ prefixed
          expect(actualPath).not.toContain('public/piece/');
          expect(actualPath).not.toContain('/public/');

          // 4) Verify the file truly exists on disk at static/pieces/...
          const diskPath = path.join(staticDir, actualPath);
          expect(fs.existsSync(diskPath)).toBe(true);
        }
      }
    }
  });

  it('should reject or fail any path containing insecure elements like FEN, directory traversal "..", backslashes, or remote URLs', () => {
    const maliciousInputs = [
      { pack: '../traversal', color: 'w', type: 'k' },
      { pack: 'cburnett', color: 'w/../malicious', type: 'k' },
      { pack: 'cburnett\\backslash', color: 'w', type: 'k' },
      { pack: 'http://remote.host', color: 'w', type: 'k' },
      { pack: 'rnbqkbnr_w_KQkq', color: 'w', type: 'k' } // containing FEN structures
    ];

    for (const input of maliciousInputs) {
      expect(() => {
        PieceAssetPath.getPath(input.pack, input.color, input.type);
      }).toThrow('보안 정책에 따라 허용되지 않는 기물 경로 인자입니다.');
    }
  });

  it('should verify that all SVG files do not contain insecure tags/attributes, and have no trace of old generator text assets', () => {
    const piecesDir = path.resolve(__dirname, '../../static/pieces');
    const allPacks = getPacksToTest();

    for (const pack of allPacks) {
      const packDir = path.join(piecesDir, pack);
      const files = fs.readdirSync(packDir).filter(f => f.endsWith('.svg'));

      for (const file of files) {
        const fullPath = path.join(packDir, file);
        const content = fs.readFileSync(fullPath, 'utf8');

        // Security check: must not contain scripts, foreignObject, onload etc.
        expect(content).not.toContain('<script');
        expect(content).not.toContain('onload=');
        expect(content).not.toContain('<foreignObject');

        // Check for disallowed external URL references (excluding namespace xmlns="http://www.w3.org/2000/svg")
        const links = content.match(/href="([^"]+)"|src="([^"]+)"/g) || [];
        for (const link of links) {
          const urlPattern = /https?:\/\//;
          if (urlPattern.test(link)) {
            expect(link).toContain('http://www.w3.org/2000/svg'); // Whitelisted
          }
        }

        // Generator traits check: must NOT have <text or font-family or grad_packs_
        expect(content).not.toContain('<text');
        expect(content).not.toContain('font-family');
        expect(content).not.toContain('grad_packs_');
      }
    }
  });

  it('should verify the integrity of ACTIONS/SOURCES metadata within static/pieces/SOURCES.json', () => {
    const sourcesJsonPath = path.resolve(__dirname, '../../static/pieces/SOURCES.json');
    expect(fs.existsSync(sourcesJsonPath)).toBe(true);

    const sourcesData = JSON.parse(fs.readFileSync(sourcesJsonPath, 'utf8'));
    const allPacks = getPacksToTest();

    for (const pack of allPacks) {
      expect(sourcesData).toHaveProperty(pack);
      const metadata = sourcesData[pack];

      expect(metadata).toHaveProperty('sourceRepository');
      expect(metadata).toHaveProperty('sourceDirectory');
      expect(metadata).toHaveProperty('sourceCommit');
      expect(metadata).toHaveProperty('license');
      expect(metadata).toHaveProperty('filenameMapping');

      // Check all 12 mapped output files are present on disk
      const mappings = Object.values(metadata.filenameMapping) as string[];
      expect(mappings.length).toBeGreaterThanOrEqual(12);

      const uniqueMappings = new Set(mappings);
      expect(uniqueMappings.size).toBe(12);

      // Verify each mapped file is in loweercase format on disk
      for (const diskFile of uniqueMappings) {
        expect(diskFile).toBe(diskFile.toLowerCase());
        const filePath = path.join(path.resolve(__dirname, '../../static/pieces'), pack, diskFile);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    }
  });
});
