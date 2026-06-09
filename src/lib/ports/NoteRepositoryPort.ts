/**
 * 각 FEN 포지션별 이용자 개인 체스 해설 노트(Note)를 기록, 수정 및 로드하는 저장소 포트입니다.
 * 현재 오픈베타 버전상에서는 경량 메모리 또는 기본 placeholder 동작 제공에 집중하며,
 * 향후 영구 데이터베이스(Firestore 등)와의 연동 확장이 가능하도록 추상 인터페이스를 보장합니다.
 */
export interface NoteRepositoryPort {
  /**
   * 지정한 FEN 포지션에 매핑되어 작성된 모든 관전/분석 개인 메모 노트 목록을 가져옵니다.
   */
  getNotes(fen: string): Promise<string[]>;

  /**
   * 특정 FEN 포지션에 새로운 관전 해설 메모 노트를 안전하게 추가 및 영구 보존합니다.
   */
  saveNote(fen: string, note: string): Promise<void>;
}

