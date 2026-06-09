import type { NoteRepositoryPort } from '../../ports/NoteRepositoryPort';

/**
 * 이용자 체스 국면 메모 및 개인 노트 보관 처리를 위한 임시 대기용 레포지토리입니다.
 * 오픈베타 에디션의 원활하고 가벼운 가동을 지향해 기능 구비 예정(Coming later) 단계로 비활성화해 두었으며,
 * 콘솔 가이드를 출력하고 빈 리스트를 반환합니다.
 */
export class DisabledNoteRepository implements NoteRepositoryPort {
  public async getNotes(fen: string): Promise<string[]> {
    console.warn(`[노트 조회 비활성화] FEN: ${fen} 에 매핑된 개인 노트 열람 장치가 오픈베타 기간 동안 비활성화되었습니다. (Coming later)`);
    return Promise.resolve([]);
  }

  public async saveNote(fen: string, note: string): Promise<void> {
    console.warn(`[노트 저장 비활성화] FEN: ${fen} 에 개인 노트를 저장하려 했으나 기능이 아직 닫혀있습니다. (Coming later)`);
    return Promise.resolve();
  }
}

