import type { DiscussionRepositoryPort, DiscussionComment } from '../../ports/DiscussionRepositoryPort';
import { redactFen } from '../../utils/safeLog';

/**
 * 실시간 국면별 커뮤니티 전술 토론 보드의 활력 및 트래픽을 대응하기 위해 임시 봉인된 디스커션 레포지토리입니다.
 * 작성이나 쿼리에 의한 불필요한 백엔드 API 유입을 사전 방지하고, 유저에게 현재 피드가 비활성화되어 제공되지 않음을 로깅합니다.
 */
export class DisabledDiscussionRepository implements DiscussionRepositoryPort {
  public async getComments(fen: string): Promise<DiscussionComment[]> {
    console.warn(`[토론 피드 조회 차단] ${redactFen(fen)} 의 실시간 토론 피드는 향후 정식 에디션에서 해제됩니다.`);
    return Promise.resolve([]);
  }

  public async postComment(fen: string, author: string, content: string): Promise<void> {
    console.warn(`[토론 피드 작성 차단] 작성자: ${author}, ${redactFen(fen)} 에 대한 댓글 등록이 차단되었습니다. (정식 릴리즈 예정)`);
    return Promise.resolve();
  }
}

