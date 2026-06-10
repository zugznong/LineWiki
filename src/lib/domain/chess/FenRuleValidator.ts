export class FenRuleValidator {
  /**
   * FEN의 기물 배치를 파싱하여 차례 무관하게 또는 차례에 따른 규칙을 검사합니다.
   * activeColor가 'w'일 때는 흑 킹이 백에 의해 공격받고 있지 않아야 하고,
   * activeColor가 'b'일 때는 백 킹이 흑에 의해 공격받고 있지 않아야 합니다.
   * 또한 두 킹이 한 칸 이내로 인접하면 안 됩니다.
   */
  public static validateLegalSideToMoveState(fenStr: string): boolean {
    if (!fenStr) return false;
    
    // FEN을 공백 기준으로 나눕니다.
    const parts = fenStr.trim().split(/\s+/);
    if (parts.length < 2) return false;
    
    const boardPart = parts[0];
    const activeColor = parts[1]; // 'w' or 'b'
    
    const rows = boardPart.split('/');
    if (rows.length !== 8) return false;
    
    const grid: (string | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
    
    let whiteKing: { r: number; c: number } | null = null;
    let blackKing: { r: number; c: number } | null = null;
    
    for (let r = 0; r < 8; r++) {
      const rowStr = rows[r];
      let c = 0;
      for (let i = 0; i < rowStr.length; i++) {
        const char = rowStr[i];
        if (/[1-8]/.test(char)) {
          c += parseInt(char, 10);
        } else {
          if (c >= 8) return false; // 열 초과
          grid[r][c] = char;
          if (char === 'K') {
            whiteKing = { r, c };
          } else if (char === 'k') {
            blackKing = { r, c };
          }
          c++;
        }
      }
      if (c !== 8) return false; // 한 행의 총 열 크기는 8이어야 함
    }
    
    // 두 개의 킹이 반드시 존재해야 함
    if (!whiteKing || !blackKing) return false;
    
    // 두 킹이 서로 너무 인접한지 검사 (Adjacent Kings는 불가능)
    if (Math.abs(whiteKing.r - blackKing.r) <= 1 && Math.abs(whiteKing.c - blackKing.c) <= 1) {
      return false;
    }
    
    // activeColor가 'w'일 때: 흑 킹이 백의 공격을 받고 있으면 불가능
    if (activeColor === 'w') {
      if (this.isSquareAttackedByColor(blackKing.r, blackKing.c, 'w', grid)) {
        return false;
      }
    }
    
    // activeColor가 'b'일 때: 백 킹이 흑의 공격을 받고 있으면 불가능
    if (activeColor === 'b') {
      if (this.isSquareAttackedByColor(whiteKing.r, whiteKing.c, 'b', grid)) {
        return false;
      }
    }
    
    return true;
  }
  
  private static isSquareAttackedByColor(r: number, c: number, attackerColor: 'w' | 'b', grid: (string | null)[][]): boolean {
    const inBounds = (row: number, col: number) => row >= 0 && row < 8 && col >= 0 && col < 8;
    
    // 폰 공격
    if (attackerColor === 'w') {
      const pr = r + 1;
      const pc1 = c - 1;
      const pc2 = c + 1;
      if (inBounds(pr, pc1) && grid[pr][pc1] === 'P') return true;
      if (inBounds(pr, pc2) && grid[pr][pc2] === 'P') return true;
    } else {
      const pr = r - 1;
      const pc1 = c - 1;
      const pc2 = c + 1;
      if (inBounds(pr, pc1) && grid[pr][pc1] === 'p') return true;
      if (inBounds(pr, pc2) && grid[pr][pc2] === 'p') return true;
    }
    
    // 나이트 공격
    const knightOffsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    const knightChar = attackerColor === 'w' ? 'N' : 'n';
    for (const [dr, dc] of knightOffsets) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && grid[nr][nc] === knightChar) return true;
    }
    
    // 킹 공격
    const kingOffsets = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    const kingChar = attackerColor === 'w' ? 'K' : 'k';
    for (const [dr, dc] of kingOffsets) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && grid[nr][nc] === kingChar) return true;
    }
    
    // 비숍 / 퀸 대각선 공격
    const diagonalOffsets = [
      [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];
    for (const [dr, dc] of diagonalOffsets) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const piece = grid[nr][nc];
        if (piece) {
          if (attackerColor === 'w' && (piece === 'B' || piece === 'Q')) return true;
          if (attackerColor === 'b' && (piece === 'b' || piece === 'q')) return true;
          break; // 장애물
        }
        nr += dr;
        nc += dc;
      }
    }
    
    // 룩 / 퀸 가로세로 공격
    const straightOffsets = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ];
    for (const [dr, dc] of straightOffsets) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const piece = grid[nr][nc];
        if (piece) {
          if (attackerColor === 'w' && (piece === 'R' || piece === 'Q')) return true;
          if (attackerColor === 'b' && (piece === 'r' || piece === 'q')) return true;
          break; // 장애물
        }
        nr += dr;
        nc += dc;
      }
    }
    
    return false;
  }
}
