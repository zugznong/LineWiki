import { EngineSettings, type ThreadsSetting, type HashSetting, type BudgetSetting } from '../domain/analysis/EngineSettings';
import { LocalEngineSettingsAdapter } from '../adapters/storage/LocalEngineSettingsAdapter';
import { isBrowser } from '../config/runtimeConfig';

class EngineSettingsStore {
  private readonly adapter = new LocalEngineSettingsAdapter();

  // 사용자 요청 설정 (Reactive state)
  private state = $state({
    threads: 'auto' as ThreadsSetting,
    hash: 'auto' as HashSetting,
    budget: 'balanced' as BudgetSetting,
    customDepth: undefined as number | undefined,
    threadSafetyEnabled: true as boolean,
  });

  // 시스템 환경 속성 정보
  private system = $state({
    crossOriginIsolated: false,
    hardwareConcurrency: 1,
    multiThreadSupported: false,
    runtimeMultiThreadFailedSingleFallback: false,
    forcedSingle: false,
  });

  constructor() {
    if (isBrowser) {
      this.refreshSystemCapabilities();

      const loaded = this.adapter.load();
      this.state.threads = loaded.threads;
      this.state.hash = loaded.hash;
      this.state.budget = loaded.budget;
      this.state.customDepth = loaded.customDepth;
      this.state.threadSafetyEnabled = loaded.threadSafetyEnabled;
    }
  }

  /**
   * 시스템 환경 정보를 최신 상태로 재생성하여 동기화합니다.
   * COOP/COEP 격리 조치 전후의 브라우저 상태를 다시 검측하여, 테스트용 진단 및 마운트 후 시점 갱신 용도로 쓰입니다.
   */
  public refreshSystemCapabilities() {
    if (isBrowser) {
      this.system.crossOriginIsolated = typeof window !== 'undefined' && !!window.crossOriginIsolated;
      this.system.hardwareConcurrency = navigator.hardwareConcurrency || 1;
      this.system.multiThreadSupported = typeof SharedArrayBuffer !== 'undefined' && this.system.crossOriginIsolated;

      console.info(`[EngineSettingsStore] System checks refreshed:
        - crossOriginIsolated = ${this.system.crossOriginIsolated}
        - SharedArrayBuffer available = ${typeof SharedArrayBuffer !== 'undefined'}
        - hardwareConcurrency = ${this.system.hardwareConcurrency}
        - multiThreadSupported (calculated) = ${this.system.multiThreadSupported}
      `);
    }
  }

  public get requestedThreads(): ThreadsSetting {
    return this.state.threads;
  }

  public get requestedHash(): HashSetting {
    return this.state.hash;
  }

  public get requestedBudget(): BudgetSetting {
    return this.state.budget;
  }

  public get requestedCustomDepth(): number | undefined {
    return this.state.customDepth;
  }

  public get requestedThreadSafetyEnabled(): boolean {
    return this.state.threadSafetyEnabled;
  }

  public get isMultiThreadSupported(): boolean {
    return this.system.multiThreadSupported;
  }

  public get hardwareConcurrency(): number {
    return this.system.hardwareConcurrency;
  }

  /**
   * 실제 적용 스레드 수입니다.
   * 브라우저 멀티스레딩이 완전히 거절된 환경에서는 무조건 1스레드로 수렴시켜 안전 가치를 높입니다.
   * 안전 강도 모드의 on/off 분기에 따라 다른 상한선 제한(안전 작동 시 hardwareConcurrency, 일반 수동 시 128)을 적용합니다.
   */
  public get actualThreads(): number {
    if (!this.system.multiThreadSupported || this.system.runtimeMultiThreadFailedSingleFallback) {
      return 1;
    }

    if (this.state.threads === 'auto') {
      if (this.state.threadSafetyEnabled) {
        // 안전 모드 ON 에서는 가용 코어 대비 안도 작동을 위해 코어-1 허용 (상한선 4 제한 제거)
        return Math.max(1, this.system.hardwareConcurrency - 1);
      } else {
        // 안전 모드 OFF (공격형 auto) 에서는 모든 물리 코어를 100% 한계치까지 점유하여 초고속 분석을 이룹니다.
        return Math.max(1, this.system.hardwareConcurrency);
      }
    }

    const requested = Number(this.state.threads);
    if (this.state.threadSafetyEnabled) {
      // 안전 모드 활성화인 경우: 명시 입력값은 코어 연산 장치 개수(hardwareConcurrency)를 넘지 못하게 강력 Clamping
      return Math.min(requested, this.system.hardwareConcurrency);
    } else {
      // 안전 모드 비활성화인 경우: 사용자의 의지를 존중하여 더 넓은 자원 지정 허용 (최대 128 하드캡)
      return Math.min(requested, 128);
    }
  }

  /**
   * 멀티스레드가 완전히 불가능한 브라우저 환경에서, 싱글스레드로만 연산이 진행되고 있는지 여부입니다.
   */
  public get isSingleThreadFallbackActive(): boolean {
    if (this.system.multiThreadSupported && !this.system.runtimeMultiThreadFailedSingleFallback) {
      return false;
    }
    return this.state.threads !== 1;
  }

  /**
   * UI가 직관적인 적용 스레드를 나타내도록 레이블 형태로 가공한 형태입니다.
   */
  public get actualThreadsLabel(): string {
    if (this.system.runtimeMultiThreadFailedSingleFallback) {
      return "1 (런타임 실패 fallback)";
    }
    if (this.isSingleThreadFallbackActive) {
      return "1 (싱글스레드 fallback)";
    }
    const act = this.actualThreads;
    const req = this.state.threads;
    if (req !== 'auto' && Number(req) > act) {
      return `${act} (안전 제어로 ${req}에서 축소됨)`;
    }
    return `${act}`;
  }

  public get requestedThreadsValue(): string {
    return String(this.state.threads);
  }

  public get actualThreadsValue(): number {
    return this.actualThreads;
  }

  public get isMultiThreadCapable(): boolean {
    return this.system.multiThreadSupported;
  }

  /**
   * 멀티스레드 차단 및 제한 사유의 정밀 진단 결과를 반환합니다.
   * 사용자가 스레드를 auto 혹은 2개 이상 선택했으나 crossOriginIsolated나 SharedArrayBuffer가 없는 경우
   * 명시적으로 'blocked-by-isolation' 상태를 가지게 합니다.
   */
  public get threadCapabilityStatus(): 'ok' | 'blocked-by-isolation' | 'runtime-multi-failed-single-fallback' | 'forced-single' {
    if (this.state.threads === 1 || this.system.forcedSingle) {
      return 'forced-single';
    }
    if (this.system.runtimeMultiThreadFailedSingleFallback) {
      return 'runtime-multi-failed-single-fallback';
    }

    const wantsMulti = this.state.threads === 'auto' || Number(this.state.threads) > 1;
    const isIsolated = this.system.crossOriginIsolated;
    const hasSab = typeof SharedArrayBuffer !== 'undefined';
    if (wantsMulti && (!isIsolated || !hasSab)) {
      return 'blocked-by-isolation';
    }
    return 'ok';
  }

  public setForcedSingle(forced: boolean) {
    this.system.forcedSingle = forced;
  }

  public get crossOriginIsolated(): boolean {
    return this.system.crossOriginIsolated;
  }

  public get isSharedArrayBufferExists(): boolean {
    return typeof SharedArrayBuffer !== 'undefined';
  }

  public get isFallbackToSingleActive(): boolean {
    if (this.system.multiThreadSupported && !this.system.runtimeMultiThreadFailedSingleFallback) {
      return false;
    }
    return this.state.threads === 'auto' || (typeof this.state.threads === 'number' && this.state.threads > 1) || (typeof this.state.threads === 'string' && Number(this.state.threads) > 1);
  }

  /**
   * 실제 적용 해시 크기 (MB)
   */
  public get actualHash(): number {
    if (this.state.hash === 'auto') {
      // 실제 스레드 가동 수(actualThreads)에 비례하여 128/256/512MB로 확장 스케일업합니다. (전체 MultiPV 연산 캐싱 최적화)
      const threads = this.actualThreads;
      if (threads <= 1) {
        return 128;
      } else if (threads === 2) {
        return 256;
      } else {
        return 512;
      }
    }
    return Number(this.state.hash);
  }

  /**
   * 실제 적용 노드 규모 수량
   */
  public get actualNodeBudget(): number {
    const tempSettings = new EngineSettings({ budget: this.state.budget, customDepth: this.state.customDepth });
    return tempSettings.nodeBudget;
  }

  /**
   * 실제 수색 깊이 (Target Depth)
   */
  public get actualTargetDepth(): number {
    const tempSettings = new EngineSettings({ budget: this.state.budget, customDepth: this.state.customDepth });
    return tempSettings.targetDepth;
  }

  /**
   * 실제 수색 깊이 문자 레이블
   */
  public get actualTargetDepthLabel(): string {
    if (this.state.budget === 'custom') {
      return `Depth ${this.actualTargetDepth} (직접 입력)`;
    }
    const depth = this.actualTargetDepth;
    return depth >= 90 ? '무제한 (Infinite)' : `Depth ${depth}`;
  }

  /**
   * 실제 모드별 중단 조건
   */
  public get actualLimitCondition(): string {
    switch (this.state.budget) {
      case 'fast':
        return '20만 노드 도달';
      case 'balanced':
        return '깊이 20 도달';
      case 'deep':
        return '깊이 24 도달';
      case 'ultra':
        return '깊이 28 도달';
      case 'max':
        return '깊이 32 도달';
      case 'expert':
        return '깊이 40 도달';
      case 'custom':
        return `깊이 ${this.actualTargetDepth} 도달`;
      case 'infinite':
        return '수동 중단';
      default:
        return '깊이 20 도달';
    }
  }

  public get currentSettings(): EngineSettings {
    return new EngineSettings({
      threads: this.state.threads,
      hash: this.state.hash,
      budget: this.state.budget,
      customDepth: this.state.customDepth,
      threadSafetyEnabled: this.state.threadSafetyEnabled
    });
  }

  /**
   * UI가 클릭하는 시점에 버벅임 없이 동기적으로 설정을 업데이트하여 반영하기 위한 프리뷰 기능입니다.
   * 메모리 상의 반응형(reactive) 상태만 즉시 정규화하여 업데이트하며, 실제 디스크(localStorage) 영구 저장은 하지 않습니다.
   */
  public previewSettings(threads: ThreadsSetting, hash: HashSetting, budget: BudgetSetting, customDepth?: number, threadSafetyEnabled?: boolean): void {
    if (threadSafetyEnabled !== undefined) {
      this.state.threadSafetyEnabled = threadSafetyEnabled;
    }
    const targetCustom = customDepth !== undefined ? customDepth : this.state.customDepth;

    const domain = new EngineSettings({
      threads,
      hash,
      budget,
      customDepth: targetCustom,
      threadSafetyEnabled: this.state.threadSafetyEnabled
    });

    this.state.threads = domain.threads;
    this.state.hash = domain.hash;
    this.state.budget = domain.budget;
    this.state.customDepth = domain.customDepth;
    this.state.threadSafetyEnabled = domain.threadSafetyEnabled;
  }

  /**
   * 디바운스가 완료되거나 설정이 확정되었을 때 영구 저장(Local Storage) 및 최종 상태 커밋을 처리합니다.
   * `ChangeEngineSettingsUseCase` 비즈니스 유스케이스가 저장부터 후속 재탐색까지 일목요연하게 일관되게 제어하도록 조정합니다.
   */
  public commitSettings(threads: ThreadsSetting, hash: HashSetting, budget: BudgetSetting, customDepth?: number, threadSafetyEnabled?: boolean): void {
    this.previewSettings(threads, hash, budget, customDepth, threadSafetyEnabled);

    const domain = new EngineSettings({
      threads: this.state.threads,
      hash: this.state.hash,
      budget: this.state.budget,
      customDepth: this.state.customDepth,
      threadSafetyEnabled: this.state.threadSafetyEnabled
    });
    this.adapter.save(domain);
  }

  public updateSettings(threads: ThreadsSetting, hash: HashSetting, budget: BudgetSetting, customDepth?: number, threadSafetyEnabled?: boolean) {
    this.commitSettings(threads, hash, budget, customDepth, threadSafetyEnabled);
  }

  /**
   * 런타임 오류나 로딩 실패 등으로 인해 멀티스레드 워커 기동이 불가능할 경우,
   * 싱글스레드 복구 모드로 전환됨을 스토어에 전달하여 UI에 최종 반영합니다.
   */
  public notifyFallbackToSingleThread() {
    this.system.runtimeMultiThreadFailedSingleFallback = true;
  }
}

export const engineSettingsStore = new EngineSettingsStore();
export type { ThreadsSetting, HashSetting, BudgetSetting };
