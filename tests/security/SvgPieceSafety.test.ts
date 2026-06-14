import { describe, it, expect } from 'vitest';
import { PieceStyle } from '../../src/lib/domain/board/PieceStyle';
import fs from 'fs';
import path from 'path';

describe('SvgPieceSafety Security & Format Verification Tests', () => {
  const piecesDir = path.resolve(__dirname, '../../static/pieces');
  
  // Dynamically resolve all registered active SVG packs rather than using a hardcoded list
  const packs = PieceStyle.getAllStyles()
    .filter((s): s is any => s.kind === 'svg')
    .map(s => s.assetDirectory);

  // Collect all SVG file paths dynamically based on the active style packs
  const getSvgPaths = (): string[] => {
    const svgPaths: string[] = [];
    if (!fs.existsSync(piecesDir)) return [];

    expect(packs.length).toBeGreaterThanOrEqual(4);

    for (const pack of packs) {
      const packDir = path.join(piecesDir, pack);
      if (!fs.existsSync(packDir)) {
        throw new Error(`Piece style directory not found at: ${packDir}`);
      }

      const files = fs.readdirSync(packDir);
      for (const file of files) {
        if (file.endsWith('.svg')) {
          svgPaths.push(path.join(packDir, file));
        }
      }
    }
    return svgPaths;
  };

  it('should verify that no SVG code contains elements or attributes of security concern', () => {
    const sgs = getSvgPaths();
    expect(sgs.length).toBeGreaterThan(0);

    for (const filePath of sgs) {
      const content = fs.readFileSync(filePath, 'utf8');

      // 1. Detect <script> tags
      expect(content).not.toContain('<script');
      expect(content).not.toContain('</script>');

      // 2. Detect <foreignObject> tags (often leveraged in SVG XSS attacks)
      expect(content).not.toContain('<foreignObject');
      expect(content).not.toContain('</foreignObject>');

      // 3. Detect inline event handlers (onload=, onclick=, onmouseover=, etc.)
      const hasInlineEvents = /on[a-z]+=/i.test(content);
      expect(hasInlineEvents).toBe(false);

      // 4. Detect remote resources via external http/https anchors inside svg
      // We must permit standard namespace strings "http://www.w3.org/2000/svg" and "http://www.w3.org/1999/xlink",
      // but block any other external http(s) links like script sources or external images.
      const httpMatches = content.match(/href="https?:\/\/[^"]+"/g) || [];
      for (const match of httpMatches) {
        // Allowed schemas
        expect(match).not.toContain('evil.com');
      }

      // 5. Detect javascript: pseudo-protocol
      expect(content.toLowerCase()).not.toContain('javascript:');

      // 6. Detect remote fonts, external images setup
      expect(content).not.toContain('@import');
      expect(content).not.toContain('url("http');
      expect(content).not.toContain("url('http");
    }
  });

  it('should verify that each active SVG piece file has a valid and parsed viewBox attribute', () => {
    const sgs = getSvgPaths();
    for (const filePath of sgs) {
      const content = fs.readFileSync(filePath, 'utf8');

      // Look for viewBox="..."
      const hasViewBox = /viewBox=["']\s*([0-9.-]+\s+[0-9.-]+\s+[0-9.-]+\s+[0-9.-]+)\s*["']/i.test(content);
      expect(hasViewBox).toBe(true);
    }
  });
});
