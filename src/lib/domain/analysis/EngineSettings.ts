export type ThreadsSetting = 'auto' | number;
export type HashSetting = 'auto' | 16 | 32 | 64 | 128 | 256 | 512 | 1024;
export type BudgetSetting = 'fast' | 'balanced' | 'deep' | 'ultra' | 'max' | 'expert' | 'custom' | 'infinite';

export interface EngineSettingsProps {
  threads: ThreadsSetting;
  hash: HashSetting;
  budget: BudgetSetting;
  customDepth?: number;
  threadSafetyEnabled?: boolean;
}

export class EngineSettings {
  public readonly threads: ThreadsSetting;
  public readonly hash: HashSetting;
  public readonly budget: BudgetSetting;
  public readonly customDepth?: number;
  public readonly threadSafetyEnabled: boolean;

  constructor(props: Partial<EngineSettingsProps>) {
    let rawThreads = props.threads ?? 'auto';
    if (rawThreads !== 'auto' && (isNaN(Number(rawThreads)) || Number(rawThreads) < 1)) {
      rawThreads = 'auto';
    }
    this.threads = rawThreads as ThreadsSetting;

    let rawHash = props.hash ?? 'auto';
    if (rawHash !== 'auto' && ![16, 32, 64, 128, 256, 512, 1024].includes(Number(rawHash))) {
      rawHash = 'auto';
    }
    this.hash = rawHash as HashSetting;

    let rawBudget = (props.budget as string | undefined) ?? 'balanced';
    if (rawBudget === 'precise') {
      rawBudget = 'deep';
    }
    if (
      rawBudget !== 'fast' &&
      rawBudget !== 'balanced' &&
      rawBudget !== 'deep' &&
      rawBudget !== 'ultra' &&
      rawBudget !== 'max' &&
      rawBudget !== 'expert' &&
      rawBudget !== 'custom' &&
      rawBudget !== 'infinite'
    ) {
      rawBudget = 'balanced';
    }
    this.budget = rawBudget as BudgetSetting;

    let rawSafety = props.threadSafetyEnabled ?? true;
    if (typeof rawSafety !== 'boolean') {
      rawSafety = true;
    }
    this.threadSafetyEnabled = rawSafety;

    let rawCustomDepth = props.customDepth;
    if (rawCustomDepth !== undefined) {
      if (typeof rawCustomDepth !== 'number' || isNaN(rawCustomDepth)) {
        rawCustomDepth = 20;
      } else {
        const floorDepth = Math.floor(rawCustomDepth);
        const maxDepth = rawSafety ? 40 : 100;
        if (floorDepth < 1) {
          rawCustomDepth = 1;
        } else if (floorDepth > maxDepth) {
          rawCustomDepth = maxDepth;
        } else {
          rawCustomDepth = floorDepth;
        }
      }
    }
    this.customDepth = rawCustomDepth;
  }

  /**
   * 목표 수색 깊이 (Target Depth)
   */
  public get targetDepth(): number {
    switch (this.budget) {
      case 'fast':
        return 16;
      case 'balanced':
        return 20;
      case 'deep':
        return 24;
      case 'ultra':
        return 28;
      case 'max':
        return 32;
      case 'expert':
        return 40;
      case 'custom':
        return this.customDepth ?? 20;
      case 'infinite':
        return 99;
      default:
        return 20;
    }
  }

  /**
   * 소프트 노드 한계 임계선 (Soft Node Cap)
   */
  public get softNodeCap(): number | undefined {
    switch (this.budget) {
      case 'fast':
        return 200_000;
      case 'deep':
      case 'ultra':
      case 'max':
      case 'expert':
      case 'custom':
      case 'infinite':
        return undefined;
      case 'balanced':
      default:
        return undefined;
    }
  }

  /**
   * Stockfish 검색 모드 판단
   */
  public get analysisMode(): 'depth' | 'nodes' | 'infinite' {
    switch (this.budget) {
      case 'infinite':
        return 'infinite';
      case 'fast':
      case 'balanced':
      case 'deep':
      case 'ultra':
      case 'max':
      case 'expert':
      case 'custom':
      default:
        return 'depth';
    }
  }

  /**
   * 분석량 설정값을 Stockfish 엔진용 노드 수치로 매핑 (하위 호환성 유지)
   */
  public get nodeBudget(): number {
    const cap = this.softNodeCap;
    return cap !== undefined ? cap : 2_000_000_000;
  }

  public toJSON(): EngineSettingsProps {
    return {
      threads: this.threads,
      hash: this.hash,
      budget: this.budget,
      customDepth: this.customDepth,
      threadSafetyEnabled: this.threadSafetyEnabled,
    };
  }

  public static createDefault(): EngineSettings {
    return new EngineSettings({
      threads: 'auto',
      hash: 'auto',
      budget: 'balanced',
      threadSafetyEnabled: true,
    });
  }
}

