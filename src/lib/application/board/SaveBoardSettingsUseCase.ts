import type { BoardSettingsPort } from '../../ports/BoardSettingsPort';
import type { BoardSettingsData } from './LoadBoardSettingsUseCase';
import type { Result } from '../../utils/result';
import { success } from '../../utils/result';

export class SaveBoardSettingsUseCase {
  constructor(private readonly boardSettingsPort: BoardSettingsPort) {}

  public execute(settings: BoardSettingsData): Result<void, Error> {
    try {
      const result = this.boardSettingsPort.saveSettings(settings);
      if (result.isFailure()) {
        console.warn('보드 설정을 저장하는 데 실패했지만 UI 동작 유지를 위해 예외를 격리합니다:', result.unwrapErr());
      }
      // 실패해도 UI의 흐름이 깨지지 않도록 항상 정상적으로 완료된 것처럼 처리하거나, 우아하게 복원합니다.
      return success(undefined);
    } catch (err: any) {
      console.error('보드 설정 저장 중 예기치 못한 에외가 발생했습니다:', err);
      return success(undefined);
    }
  }
}

