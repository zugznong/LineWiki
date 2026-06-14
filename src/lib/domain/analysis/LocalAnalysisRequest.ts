export interface LocalAnalysisRequest {
  fen: string;
  allCandidateMoves: any[]; // 전체 후보수
  targetMoves: string[];    // 로컬 분석 대상 UCI 목록
  threads: number;          // 스레드 수
  hash: number;             // Hash (MB) (예: 16)
  nodes?: number;           // 노드 예산
  targetDepth?: number;     // 목표 수색 깊이
  softNodeCap?: number;     // 소프트 노드 상한선
  analysisMode?: 'depth' | 'nodes' | 'infinite'; // 분석 모드 구분
  multiPv?: number;         // 예상 MultiPV 개수
  budget?: string;          // 분석 예산 유형 ('fast', 'balanced', 'deep', 'ultra', 'max', 'expert', 'custom', 'infinite')
  customDepth?: number;     // 직접 입력 수색 깊이
  movesFromStart?: string[]; // 첫 수부터 현재 포지션까지의 moves 목록
  initialFen?: string;      // 해당 수순 목록의 시작 FEN (movesFromStart 적용 시 사용)
  fenOnly?: boolean;        // 세션 히스토리 복원이 불가능해 FEN 정보만으로 분석함을 가리키는 플래그
}

