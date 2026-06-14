import { EngineSettings } from '../domain/analysis/EngineSettings';

export interface EngineSettingsPort {
  save(settings: EngineSettings): void;
  load(): EngineSettings;
}
