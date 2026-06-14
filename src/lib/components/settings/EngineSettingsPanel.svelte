<script lang="ts">
  import { Cpu, Activity, ShieldAlert } from '@lucide/svelte';
  import { engineSettingsStore, type ThreadsSetting, type HashSetting, type BudgetSetting } from '$lib/stores/engineSettingsStore.svelte';
  import { localAnalysisStore } from '$lib/stores/localAnalysisStore.svelte';
  import { positionStore } from '$lib/stores/positionStore.svelte';
  import { evaluationStore } from '$lib/stores/evaluationStore.svelte';
  import { getAnalysisServices } from '$lib/composition/createAppServices';

  // 현재 요청한 및 감지된 적용 상태 derived 연결
  const reqThreads = $derived(engineSettingsStore.requestedThreads);
  const reqHash = $derived(engineSettingsStore.requestedHash);
  const reqBudget = $derived(engineSettingsStore.requestedBudget);
  const reqThreadSafety = $derived(engineSettingsStore.requestedThreadSafetyEnabled);

  const actThreads = $derived(engineSettingsStore.actualThreads);
  const actThreadsLabel = $derived(engineSettingsStore.actualThreadsLabel);
  const isFallbackActive = $derived(engineSettingsStore.isSingleThreadFallbackActive);
  const actHash = $derived(engineSettingsStore.actualHash);

  const hConcurrency = $derived(engineSettingsStore.hardwareConcurrency);
  const engineStatus = $derived(localAnalysisStore.status);

  // 엔진 상태 한국어 매핑
  const engineStatusKorean = $derived(
    engineStatus === 'idle' ? '대기 중' :
    engineStatus === 'ready' ? '준비 완료' :
    engineStatus === 'analyzing' ? '분석 진행 중' :
    engineStatus === 'completed' ? '분석 완료' :
    engineStatus === 'error' ? '초기화/연산 오류' : '알 수 없음'
  );

  const reqCustomDepth = $derived(engineSettingsStore.requestedCustomDepth);

  // 설정 갱신 및 백그라운드 엔진 중단/미해결 분석 즉각 실시간 재가동
  function handleUpgradeSettings(
    newThreads: ThreadsSetting,
    newHash: HashSetting,
    newBudget: BudgetSetting,
    newCustomDepth?: number,
    newThreadSafety?: boolean
  ) {
    const finalCustomDepth = newCustomDepth ?? reqCustomDepth ?? 20;
    const finalThreadSafety = newThreadSafety !== undefined ? newThreadSafety : reqThreadSafety;

    // UI에 설정 선택 변경 피드백이 탭하는 순간 동기적으로 바로 인계되도록 프리뷰 설정만 선제 업데이트합니다.
    engineSettingsStore.previewSettings(newThreads, newHash, newBudget, finalCustomDepth, finalThreadSafety);

    const services = getAnalysisServices();
    const currentFen = positionStore.currentFen;
    const candidateMoves = positionStore.candidateMoves || [];
    const generation = evaluationStore.generation;

    // 신규 전담 설정 변경 유스케이스(ChangeEngineSettingsUseCase)를 통해 비즈니스 흐름(저장, 디바운스, 재기동) 진행
    services.changeEngineSettings.execute(
      newThreads,
      newHash,
      newBudget,
      finalCustomDepth,
      finalThreadSafety,
      currentFen,
      candidateMoves,
      generation
    );
  }
</script>

<div class="space-y-5" id="engine-settings-container">
  <!-- Section Title -->
  <div class="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
    <Cpu size={13} class="text-sky-400" />
    <span>엔진 수색 성능 제어판 (Engine Resource)</span>
  </div>

  <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-2xl p-4 space-y-4">
    <!-- 1. CPU 스레드 설정 -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-300">연산 스레드 수 (Threads)</span>
        <span class="text-[10px] text-slate-400 font-mono bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-800">
          기기 물리 코어: {hConcurrency}
        </span>
      </div>
      <div class="grid grid-cols-6 gap-1" role="radiogroup" aria-label="스레드 설정">
        {#each ['auto', 1, 2, 4, 6, 8] as t}
          {@const isSelected = reqThreads === t}
          <button
            type="button"
            class="py-1.5 text-xs font-mono font-bold rounded-lg border transition-all text-center cursor-pointer focus:outline-none {isSelected ? 'bg-sky-500/10 border-sky-500/60 text-sky-300 shadow-sm' : 'bg-[var(--color-bg-nested)] border-[var(--color-border-primary)]/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
            onclick={() => handleUpgradeSettings(t as ThreadsSetting, reqHash, reqBudget)}
          >
            {t}
          </button>
        {/each}
      </div>

      <!-- 커스텀 스레드 직접 입력 -->
      <div class="flex items-center justify-between gap-1 mt-1.5 px-0.5">
        <label for="custom-threads-input" class="text-[10px] text-slate-400">커스텀 스레드 직접 입력:</label>
        <div class="flex items-center gap-1.5">
          <input
            id="custom-threads-input"
            type="number"
            min="1"
            max="128"
            step="1"
            placeholder="직접 입력"
            class="w-20 px-2 py-0.5 text-[11px] bg-[var(--color-bg-nested)] border border-[var(--color-border-primary)]/80 rounded text-slate-200 focus:outline-none focus:border-sky-500 font-mono text-center"
            value={reqThreads === 'auto' ? '' : reqThreads}
            oninput={(e) => {
              const val = e.currentTarget.value ? Number(e.currentTarget.value) : 'auto';
              if (val === 'auto' || (!isNaN(val) && val >= 1)) {
                const clampedVal = val === 'auto' ? 'auto' : Math.min(val, 128);
                handleUpgradeSettings(clampedVal as ThreadsSetting, reqHash, reqBudget);
              }
            }}
          />
          {#if reqThreads !== 'auto' && ![1, 2, 4, 6, 8].includes(Number(reqThreads))}
            <span class="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
              {reqThreads} 지정됨
            </span>
          {/if}
        </div>
      </div>

      <!-- 안전 모드 ON/OFF 제어 토글 -->
      <div class="flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-[var(--color-border-primary)]/20 px-0.5" id="thread-safety-toggle-container">
        <div class="flex flex-col">
          <span class="text-[10px] font-semibold text-slate-300">CPU 스레드 안전 모드 (Safety Mode)</span>
          <span class="text-[9px] text-slate-500">안전 모드 온 시 기기 하드웨어 코어 수 한계로 클램핑 설정</span>
        </div>
        <button
          type="button"
          id="thread-safety-toggle-button"
          class="px-2 py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer focus:outline-none {reqThreadSafety ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-rose-500/10 border-rose-500/50 text-rose-400'}"
          onclick={() => handleUpgradeSettings(reqThreads, reqHash, reqBudget, reqCustomDepth, !reqThreadSafety)}
        >
          {reqThreadSafety ? 'ON (안전 작동)' : 'OFF (제한 해제)'}
        </button>
      </div>
      
      <!-- 멀티스레드 미지원 경고 툴팁/안내 -->
      {#if engineSettingsStore.threadCapabilityStatus === 'blocked-by-isolation'}
        <div id="settings-thread-blocked-warning" class="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-[11px] text-rose-300">
          <ShieldAlert size={15} class="shrink-0 mt-0.5 text-rose-400" />
          <div class="space-y-1">
            <span class="font-bold text-rose-400">멀티스레드 물리 자원 가동 불가 Warning:</span>
            <p>
              요청: {reqThreads === 'auto' ? 'auto' : `${reqThreads}스레드`} / 실제: {actThreads}스레드
            </p>
            <p class="text-rose-400/90 text-[10px]">
              <strong>차단 원인:</strong> COOP·COEP 보안 격리가 만족되지 않아 브라우저 내부에서 SharedArrayBuffer 획득이 불가능합니다.
            </p>
          </div>
        </div>
      {:else if isFallbackActive}
        <div id="settings-thread-fallback-warning" class="flex items-start gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-[11px] text-amber-300">
          <ShieldAlert size={14} class="shrink-0 mt-0.5 text-amber-400" />
          <div>
            <span class="font-bold">싱글스레드 대체 모드 기동:</span> 사용자가 {reqThreads}스레드를 요청했지만, 브라우저 환경 제약(SharedArrayBuffer 차단)으로 인해 <span class="underline">실제 1스레드</span> 및 Fallback 단일 연산 엔진으로 부드럽게 대체 가동 중입니다.
          </div>
        </div>
      {/if}

      <!-- 안전 모드 비활성화 및 스레드 과할당 경고 -->
      {#if !reqThreadSafety && reqThreads !== 'auto' && Number(reqThreads) > hConcurrency}
        <div id="thread-over-allocation-warning" class="flex items-start gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-[11px] text-amber-300">
          <ShieldAlert size={14} class="shrink-0 mt-0.5 text-amber-400" />
          <div>
            <span class="font-bold">CPU 스레드 초과 할당 경고:</span> 요청한 스레드 수({reqThreads})가 실제 기기의 물리 코어 수({hConcurrency})를 초과합니다. 브라우저 탭 프리징, 디바이스 발열, 혹은 시스템 불안정이 야기될 우려가 있습니다.
          </div>
        </div>
      {/if}

      <!-- 스레드 다이내믹 정보 통합 패널 (Thread Diagnostics) -->
      <div class="bg-[var(--color-bg-nested)]/60 border border-slate-800/80 rounded-xl p-3 space-y-2 text-xs">
        <div class="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800/60">
          <Cpu size={11} class="text-sky-400" />
          <span>스레드 가동 현황 (Thread Diagnostics)</span>
        </div>
        
        <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          <div class="flex justify-between items-center">
            <span class="text-slate-500">요청 스레드:</span>
            <span class="font-mono font-bold text-slate-300">{engineSettingsStore.requestedThreadsValue}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">실제 적용:</span>
            <span class="font-mono font-bold text-sky-400">{engineSettingsStore.actualThreadsValue} 스레드</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">CPU 물리 코어:</span>
            <span class="font-mono font-bold text-slate-300">{hConcurrency} 코어</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">안전 모드 상태:</span>
            <span class="font-bold {reqThreadSafety ? 'text-emerald-400' : 'text-rose-400'}">
              {reqThreadSafety ? 'ON (안전 작동)' : 'OFF (해제됨)'}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">멀티스레드 지원:</span>
            <span class="font-bold {engineSettingsStore.isMultiThreadCapable ? 'text-emerald-400' : 'text-slate-400'}">
              {engineSettingsStore.isMultiThreadCapable ? '지원 완료 (OK)' : '미지원 (Off)'}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Fallback 작동:</span>
            <span class="font-bold {engineSettingsStore.isFallbackToSingleActive ? 'text-amber-400' : 'text-slate-500'}">
              {engineSettingsStore.isFallbackToSingleActive ? '작동 중 (Active)' : '정상 탐색'}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Hash 메모리 설정 -->
    <div class="space-y-2 pt-2 border-t border-[var(--color-border-primary)]/40">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-300">해시 캐시 크기 (Hash size)</span>
        <span class="text-[10px] text-slate-500">클수록 수색 속도 최적화</span>
      </div>
      <div class="grid grid-cols-4 gap-1" role="radiogroup" aria-label="해시 크기 설정">
        {#each ['auto', 16, 32, 64, 128, 256, 512, 1024] as h}
          {@const isSelected = reqHash === h}
          <button
            type="button"
            class="py-1.5 text-xs font-mono font-bold rounded-lg border transition-all text-center cursor-pointer focus:outline-none {isSelected ? 'bg-sky-500/10 border-sky-500/60 text-sky-300 shadow-sm' : 'bg-[var(--color-bg-nested)] border-[var(--color-border-primary)]/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
            onclick={() => handleUpgradeSettings(reqThreads, h as HashSetting, reqBudget)}
          >
            {h === 'auto' ? 'auto' : `${h}M`}
          </button>
        {/each}
      </div>
    </div>

    <!-- 3. 목표 depth / 제한 방식 설정 -->
    <div class="space-y-2 pt-2 border-t border-[var(--color-border-primary)]/40" id="goal-depth-settings-panel">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-300">목표 depth / 제한 방식</span>
        <span class="text-[10px] text-slate-500">목표 깊이 및 탐색 제한</span>
      </div>
      <div class="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="분석 강도 설정">
        {#each [
          { key: 'fast', label: '노드 제한', desc: '깊이 16 / 20만 노드' },
          { key: 'balanced', label: 'Depth 20', desc: '깊이 20 탐색 완료' },
          { key: 'deep', label: 'Depth 24', desc: '깊이 24 탐색 완료' },
          { key: 'ultra', label: 'Depth 28', desc: '깊이 28 정밀 탐색' },
          { key: 'max', label: 'Depth 32', desc: '깊이 32 극한 탐색' },
          { key: 'expert', label: 'Depth 40', desc: '깊이 40 정밀 탐색' },
          { key: 'infinite', label: '무제한 분석', desc: '수동 중단 전까지 무제한' },
          { key: 'custom', label: '직접 입력', desc: '원하는 깊이 지정' }
        ] as b}
          {@const isSelected = reqBudget === b.key}
          <button
            type="button"
            class="p-2.5 rounded-xl border transition-all text-left cursor-pointer focus:outline-none {isSelected ? 'bg-sky-500/10 border-sky-500/60 shadow-lg' : 'bg-[var(--color-bg-nested)] border-[var(--color-border-primary)]/60 hover:bg-slate-800/30'}"
            onclick={() => handleUpgradeSettings(reqThreads, reqHash, b.key as BudgetSetting)}
          >
            <div class="text-xs font-bold {isSelected ? 'text-sky-300' : 'text-slate-200'}">{b.label}</div>
            <div class="text-[9px] text-slate-500 mt-0.5">{b.desc}</div>
          </button>
        {/each}
      </div>

      {#if reqBudget === 'custom'}
        {@const maxCustomDepth = reqThreadSafety ? 40 : 100}
        <div class="flex items-center justify-between gap-1 mt-1.5 px-0.5" id="custom-depth-input-container">
          <div class="flex flex-col">
            <label for="custom-depth-input" class="text-[10px] font-semibold text-slate-400">커스텀 수색 깊이 입력 (1-{maxCustomDepth})</label>
            <span class="text-[8px] text-slate-500">{reqThreadSafety ? '안전 모드가 켜져 있어 최대 40으로 한계 제어됨' : '안전 모드 해제로 최대 100까지 연산 허용'}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <input
              id="custom-depth-input"
              type="number"
              min="1"
              max={maxCustomDepth}
              step="1"
              placeholder="깊이 입력"
              class="w-20 px-2 py-0.5 text-[11px] bg-[var(--color-bg-nested)] border border-[var(--color-border-primary)]/80 rounded text-slate-200 focus:outline-none focus:border-sky-500 font-mono text-center"
              value={reqCustomDepth ?? 20}
              oninput={(e) => {
                const rawVal = e.currentTarget.value ? Number(e.currentTarget.value) : 20;
                if (!isNaN(rawVal)) {
                  const floored = Math.floor(rawVal);
                  const clamped = Math.min(Math.max(1, floored), maxCustomDepth);
                  handleUpgradeSettings(reqThreads, reqHash, 'custom', clamped);
                }
              }}
            />
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- 4. 실시간 상태 인쇄판 (System Monitor) -->
  <div class="bg-slate-900/40 border border-[var(--color-border-primary)]/60 rounded-2xl p-4 space-y-3.5">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
        <Activity size={12} class="text-emerald-400" />
        <span>실시간 수색 지표 상태 (Specs)</span>
      </div>
      <!-- 엔진 리포팅 상태 뱃지 -->
      <div class="flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full {engineStatus === 'analyzing' ? 'bg-emerald-400' : 'bg-slate-500'}"></span>
        <span class="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
          상태: {engineStatusKorean}
        </span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2 text-xs">
      <div class="bg-[var(--color-bg-nested)]/60 border border-slate-800/80 p-2.5 rounded-xl space-y-1">
        <span class="text-[10px] text-slate-500 block">검색 가동 유닛</span>
        <span class="font-bold text-slate-200 block truncate">Stockfish 18 WASM</span>
      </div>

      <div class="bg-[var(--color-bg-nested)]/60 border border-slate-800/80 p-2.5 rounded-xl space-y-1">
        <span class="text-[10px] text-slate-500 block">검색 수색 깊이</span>
        <span class="font-bold text-emerald-400 block truncate font-mono">
          {engineSettingsStore.actualTargetDepthLabel}
        </span>
      </div>

      <div class="bg-[var(--color-bg-nested)]/60 border border-slate-800/80 p-2.5 rounded-xl space-y-1">
        <span class="text-[10px] text-slate-500 block">실제 적용 스레드</span>
        <span class="font-bold text-sky-400 font-mono">
          {actThreadsLabel}
        </span>
      </div>

      <div class="bg-[var(--color-bg-nested)]/60 border border-slate-800/80 p-2.5 rounded-xl space-y-1">
        <span class="text-[10px] text-slate-500 block">배정 해시 / 중단 조건</span>
        <span class="font-bold text-slate-300 font-mono text-[11px] truncate block">
          {actHash}MB / {engineSettingsStore.actualLimitCondition}
        </span>
      </div>
    </div>
  </div>
</div>
