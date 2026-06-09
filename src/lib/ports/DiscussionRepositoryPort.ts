/**
 * 게시물 형태의 피드백 댓글 목록을 식별하기 위한 데이터 명세 인터페이스입니다.
 */
export interface DiscussionComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

/**
 * 전 세계 체스 애호가들과 특정 FEN 국면에 대해 실시간 토론(Discussion)을 나눌 수 있는 레포지토리 저장소 포트입니다.
 * 오픈베타 사양에서는 트래픽 제어 및 플랫폼 운영 보안을 취지로 임시 비활성화(disabled) 응답만 수행되도록 어댑터가 결합되어 있으며,
 * 인프라 재가동 시 백엔드 API와 즉시 연동되도록 인터페이스를 정의해 둡니다.
 */
export interface DiscussionRepositoryPort {
  /**
   * 주어진 FEN 상황에서 타 유저들이 주고받은 커뮤니티 토론 코멘트 글 타임라인 목록을 쿼리합니다.
   * 오픈베타 사양에서는 빈 리스트를 비동기로 리턴합니다.
   */
  getComments(fen: string): Promise<DiscussionComment[]>;

  /**
   * 특정 FEN 국면에 대해 새로운 의견 또는 전술 훈수 코멘트를 타임라인에 등록합니다.
   * 오픈베타 사양에서는 업로드가 임시 사유로 거부될 수 있으며 비활성 상태 메시지를 로깅합니다.
   */
  postComment(fen: string, author: string, content: string): Promise<void>;
}

