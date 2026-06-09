import type { Result } from '../utils/result';
import type { BoardSettingsData } from '../application/board/LoadBoardSettingsUseCase';

/**
 * 이용자의 보드 테마, 기물 표현 방식(스타일), 보드 방향 등 개인 환경 구성에 대한
 * 읽기 및 쓰기 저장 흐름을 다루는 저장소 포트 인터페이스입니다.
 * 비즈니스 로직(로드/세이브 유스케이스)이 특정 저장 매체(localStorage 등)에 집착하지 않고 추상화 수준을 격리해줍니다.
 */
export interface BoardSettingsPort {
  /**
   * 영구 저장 장치에서 저장된 개인 보드 환경 구성(기물 스타일, 보드 방향, 테마 정보)을 안전하게 읽어옵니다.
   */
  loadSettings(): Result<BoardSettingsData, Error>;

  /**
   * 변경된 보드 환경 설정 데이터를 저장소 매체에 동기화해 반영합니다.
   */
  saveSettings(settings: BoardSettingsData): Result<void, Error>;
}

