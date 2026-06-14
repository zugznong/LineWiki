export class PieceAssetPath {
  /**
   * SVG 체스 기물의 절대 영구 경로를 반환합니다.
   * 상대 경로(pieces/...) 사용 시 FEN 라우트 서브경로(/fen/<FEN>/pieces/...)로 유도되어 404를 유발하므로
   * 언제나 '/'로 시작하는 루트 기준 절대경로를 선언합니다.
   */
  public static getPath(assetDirectory: string, color: string, type: string): string {
    const normDir = assetDirectory.trim();
    const normColor = color.trim().toLowerCase();
    const normType = type.trim().toLowerCase();

    const unsafePatterns = [
      /\.\./,          // traversal
      /\\/,            // backslash
      /https?:\/\//i,  // external URL
      /_[wb]_/i        // FEN structures
    ];

    for (const pattern of unsafePatterns) {
      if (pattern.test(normDir) || pattern.test(normColor) || pattern.test(normType)) {
        throw new Error('보안 정책에 따라 허용되지 않는 기물 경로 인자입니다.');
      }
    }

    return `/pieces/${normDir}/${normColor}${normType}.svg`;
  }
}

