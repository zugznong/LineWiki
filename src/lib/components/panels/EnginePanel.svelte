<script lang="ts">
  import { localAnalysisStore } from '$lib/stores/localAnalysisStore.svelte.ts';
  import { evaluationStore } from '$lib/stores/evaluationStore.svelte.ts';
  import { positionStore } from '$lib/stores/positionStore.svelte.ts';
  import { engineSettingsStore } from '$lib/stores/engineSettingsStore.svelte.ts';
  import { Cpu, Zap, Award, Activity, Settings } from '@lucide/svelte';
  import type { MergedMoveEvaluation } from '$lib/domain/analysis/AnalysisTypes';
  import type { EvalScore } from '$lib/domain/analysis/EvalScore';
  import { compareEvalsForTurn } from '$lib/domain/analysis/evalSorting';

  const status = $derived(localAnalysisStore.status);
  const errorMessage = $derived(localAnalysisStore.errorMessage);
  const evaluations = $derived(evaluationStore.mergedEvaluations);
  const candidateMoves = $derived(localAnalysisStore.candidateMoves);
  const totalNodes = $derived(localAnalysisStore.nodes);
  
  // 전체 후보수 목록 (체스 보드상 합법 후보수 선별 대피 결합)
  const allCandidateMoves = $derived.by(() => {
    if (positionStore.candidateMoves && positionStore.candidateMoves.length > 0) {
      return positionStore.candidateMoves;
    }
    if (localAnalysisStore.candidateMoves && localAnalysisStore.candidateMoves.length > 0) {
      return localAnalysisStore.candidateMoves;
    }
    const keys = Object.keys(evaluations);
    if (keys.length > 0) {
      return keys.map(k => ({ uci: k, san: evaluations[k].moveSan || '' }));
    }
    return [];
  });
  
  // Calculate sorted evaluations depending on whose turn it is
  // White wants highest score, Black wants lowest score
  const sortedEvaluations = $derived.by(() => {
    const evalEntries = Object.values(evaluations);
    const turn = positionStore.current?.fen.split(' ')[1] || 'w';
    
    return [...evalEntries]
      .filter((e): e is MergedMoveEvaluation & { score: EvalScore } => e.score !== null)
      .sort(compareEvalsForTurn(turn));
  });
  
  const isEvaluationComplete = $derived(
    status === 'completed'
  );

  const isAllEvalsResolved = $derived(
    allCandidateMoves.length > 0 && allCandidateMoves.every(m => evaluations[m.uci] !== undefined)
  );

  const isAllEvalsDbOnly = $derived(
    isAllEvalsResolved && allCandidateMoves.every(m => {
      const e = evaluations[m.uci];
      return e && e.source === 'db';
    })
  );
  
  const showCompletedUi = $derived(status === 'completed' || isAllEvalsDbOnly);

  const fallbackReasonKorean = $derived.by(() => {
    const reason = localAnalysisStore.fallbackReason;
    if (reason === 'UCI timeout') return '응답 시간 초과';
    if (reason === 'Worker error') return '엔진 구동 실패';
    return '오류 감지';
  });

  const actualStatusText = $derived.by(() => {
    if (status === 'restarting') {
      return '새 포지션 분석 준비 중';
    }
    if (status === 'transitioning') {
      return '분석 엔진 전이 중';
    }
    if (status === 'waiting-ready') {
      return '엔진 응답 대기 중';
    }

    if (status === 'stockfish-failed') {
      return `Stockfish 초기화 실패, 사유: ${fallbackReasonKorean}`;
    }
    if (status === 'fallback-disabled') {
      return `Stockfish 초기화 실패, 사유: ${fallbackReasonKorean} / Fallback 평가 비표시`;
    }
    if (status === 'fallback-running') {
      return `Stockfish 초기화 실패, 사유: ${fallbackReasonKorean} / Fallback 평가 진행 중`;
    }
    if (status === 'fallback-failed') {
      return '로컬 및 대체(Fallback) 엔진 모두 실행 실패 (분석 불가)';
    }
    if (status === 'analysis-unavailable') {
      return '분석 기능 사용 불가 (엔진 장애)';
    }

    if (localAnalysisStore.engineMode === 'fallback') {
      if (status === 'error') {
        return 'Stockfish 18 대체 휴리스틱 fallback 오류';
      }
      if (isAllEvalsDbOnly) {
        return 'Stockfish 18 대체 휴리스틱 fallback (DB 분석 완료)';
      }
      if (status === 'completed') {
        return 'Stockfish 18 대체 휴리스틱 fallback 분석 완료';
      }
      if (status === 'analyzing' || status === 'analyzing-deeper' || status === 'depth-progress') {
        return `Stockfish 18 실패(${fallbackReasonKorean}) → 휴리스틱 fallback 사용 중`;
      }
      return 'Stockfish 18 대체 휴리스틱 fallback 모드';
    }
    if (status === 'error') {
      return 'Stockfish 18 로드 실패';
    }
    if (isAllEvalsDbOnly) {
      return 'Stockfish 18 (분석 완료 - DB)';
    }
    if (status === 'completed') {
      return 'Stockfish 18 (분석 완료)';
    }
    if (status === 'analyzing-deeper') {
      return 'Stockfish 18 (심층 분석 중)';
    }
    if (status === 'analyzing' || status === 'depth-progress') {
      return 'Stockfish 18 (분석 진행 중)';
    }
    if (status === 'ready') {
      return 'Stockfish 18 (준비 완료)';
    }
    return 'Stockfish 18 (대기 중)';
  });

  const buildName = $derived.by(() => {
    const buildType = localAnalysisStore.engineBuildType;
    if (localAnalysisStore.engineMode === 'fallback' || buildType === 'fallback') {
      return 'Heuristic Fallback (JS)';
    }
    if (buildType === 'multi') {
      return 'Stockfish 18 Multi-Thread (WASM)';
    }
    if (buildType === 'multi-failed-single-fallback') {
      return 'Stockfish 18 Single-Thread (WASM-Fallback)';
    }
    if (buildType === 'single') {
      return 'Stockfish 18 Single-Thread (WASM)';
    }
    // 다른 임의 유도식에 우선하지 않고, 실제 물리 엔진상 축약된 빌드타입에 입각하여 디스플레이 레이블 수립
    return 'Stockfish 18 Single-Thread (WASM)';
  });

  const actualThreadsLabel = $derived(engineSettingsStore.actualThreadsLabel);
  const actualHash = $derived(engineSettingsStore.actualHash);

  // Calculate best move based on evaluations
  const bestMove = $derived.by(() => {
    if (candidateMoves.length === 0) {
      return null;
    }
    
    return sortedEvaluations[0] || null;
  });

  // Calculate highest depth achieved
  const maxDepth = $derived.by(() => {
    const depths = Object.values(evaluations).map(e => e.depth);
    return depths.length > 0 ? Math.max(...depths) : 0;
  });

  const sourceLabel = $derived.by(() => {
    if (bestMove?.source === 'db') return 'Wiki DB';
    if (bestMove?.source === 'fallback' || localAnalysisStore.engineMode === 'fallback') return 'Heuristic Fallback';
    return '로컬 Stockfish';
  });

  const lastErrorKind = $derived.by(() => {
    const raw = localAnalysisStore.lastEngineError;
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.kind) {
        return String(parsed.kind);
      }
    } catch {
      // JSON 파싱 불가능한 레거시 문자열이거나 일반 문자열일 경우 축약식 반환
      if (raw.includes('timeout') || raw.includes('Timeout')) return 'timeout';
      if (raw.includes('hash') || raw.includes('mismatch')) return 'hash-mismatch';
      if (raw.includes('compile') || raw.includes('Compile')) return 'compile-failed';
    }
    return 'unknown-error';
  });

  const depthDisplayString = $derived.by(() => {
    if (!bestMove || maxDepth <= 0) {
      return '분석 대기 중...';
    }
    const target = localAnalysisStore.targetDepth;
    const isInfinite = target >= 90;
    const step = localAnalysisStore.staircaseStep;

    if (isInfinite) {
      if (step === 'stabilizing') {
        return `${maxDepth} / 무제한 (1단계 안정화 중: ${Math.min(maxDepth, 20)}/20)`;
      } else if (step === 'transitioning') {
        return `${maxDepth} / 무제한 (안정화 완료: 확장 대기)`;
      } else if (step === 'expanded') {
        return `${maxDepth} / 무제한 (2단계 전체 확장 분석 중)`;
      }
      return `${maxDepth} / 무제한 분석 중`;
    }

    return `${maxDepth} / ${target} plies`;
  });
</script>

<div 
  class="h-full min-h-0 max-h-full overflow-hidden flex flex-col bg-transparent flex-1" 
  id="engine-panel"
  data-engine-mode={localAnalysisStore.engineMode}
  data-engine-build-type={localAnalysisStore.engineBuildType}
  data-fallback-reason={localAnalysisStore.fallbackReason || ''}
  data-status={status}
  data-last-engine-error={lastErrorKind}
  data-worker-error-kind={lastErrorKind}
>
  
  <!-- 상단 스테이터스 파트 -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-nested)] shrink-0">
    <div class="flex items-center gap-2 text-xs font-bold text-slate-300">
      <Cpu size={14} class={((status === 'analyzing' || status === 'analyzing-deeper') && !isAllEvalsDbOnly) ? 'text-emerald-400 animate-spin' : 'text-slate-500'} />
      <span>{actualStatusText}</span>
    </div>

    <!-- Active calculating status dot -->
    <div class="flex items-center gap-1.5 font-mono text-[9px] text-slate-500">
      <span>{buildName}</span>
      <span class="relative flex h-2 w-2">
        {#if (status === 'analyzing' || status === 'analyzing-deeper') && !isAllEvalsDbOnly}
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        {/if}
        <span class="relative inline-flex rounded-full h-2 w-2" 
          class:bg-emerald-500={((status === 'analyzing' || status === 'analyzing-deeper') && !isAllEvalsDbOnly) || isAllEvalsDbOnly} 
          class:bg-amber-400={status === 'ready' && !isAllEvalsDbOnly} 
          class:bg-slate-600={status === 'idle' && !isAllEvalsDbOnly}
          class:bg-rose-500={status === 'error'}
        ></span>
      </span>
    </div>
  </div>

  <!-- 분석 계기판 대시보드 메타 정보 영역 (Depth, Nodes, Thread, Hash, NPS) -->
  {#if ((status !== 'idle' && status !== 'error' && status !== 'stockfish-failed' && status !== 'fallback-disabled' && status !== 'fallback-failed' && status !== 'analysis-unavailable' && status !== 'restarting' && status !== 'transitioning' && status !== 'waiting-ready') || isAllEvalsDbOnly)}
    <div class="px-4 py-3 bg-[var(--color-bg-surface)] border-b border-[var(--color-border-primary)] grid grid-cols-2 gap-2.5 shrink-0" id="engine-metrics-box" data-active-multipv={allCandidateMoves.length}>
      
      <!-- 도달 최장 Depth / 목표 Depth -->
      <div class="flex items-center gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] p-2 rounded-lg">
        <Activity size={14} class="text-emerald-400" />
        <div class="flex flex-col select-none">
          <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Depth (현재 / 목표)</span>
          <span class="text-xs font-extrabold text-slate-200 font-mono">
            {depthDisplayString}
          </span>
        </div>
      </div>

      <!-- 실시간 추천 Best Line 정보 -->
      <div class="flex items-center gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] p-2 rounded-lg">
        <Award size={14} class="text-amber-400" />
        <div class="flex flex-col select-none">
          <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            {showCompletedUi ? 'Best Move' : 'Current Best'}
          </span>
          <span class="text-xs font-mono font-extrabold text-slate-100 flex items-center flex-wrap gap-1">
            {#if bestMove}
              <span class="text-emerald-400">{bestMove.moveSan}</span>
              <span class="text-[10px] text-slate-500 font-normal">({bestMove.score.format()})</span>
              {#if bestMove.source === 'db'}
                <span class="text-[9px] bg-sky-500/10 text-sky-400 px-1 py-0.2 rounded font-bold border border-sky-500/20 select-none">DB</span>
              {:else if bestMove.source === 'local'}
                <span class="text-[9px] bg-emerald-500/10 text-emerald-400 px-1 py-0.2 rounded font-bold border border-emerald-500/20 select-none">Local</span>
              {:else if bestMove.source === 'fallback'}
                <span class="text-[9px] bg-slate-500/10 text-slate-400 px-1 py-0.2 rounded font-bold border border-slate-500/20 select-none">Fallback</span>
              {/if}
            {:else}
              분석 중...
            {/if}
          </span>
        </div>
      </div>

      <!-- 엔진 시스템 정보 -->
      <div class="col-span-2 flex flex-col gap-1.5 bg-[var(--color-bg-nested)]/55 border border-slate-800/80 p-2.5 rounded-lg text-slate-400 text-[11px]">
        <div class="flex items-center justify-between gap-1 border-b border-slate-800/60 pb-1.5 mb-1 select-none">
          <div class="flex items-center gap-1">
            <Settings size={12} class="text-slate-500" />
            <span class="text-[11px] font-bold text-slate-300">엔진 성능 지표 및 자원 설정</span>
          </div>
          <span class="text-[10px] text-slate-500">출처: {sourceLabel}</span>
        </div>
        <div class="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[11px]">
          <div class="flex items-center justify-between border-r border-slate-800/60 pr-2">
            <span class="text-[9px] text-slate-500">Threads</span>
            <strong class="text-sky-400 font-bold">{actualThreadsLabel}</strong>
          </div>
          <div class="flex items-center justify-between pl-1">
            <span class="text-[9px] text-slate-500">Hash (MB)</span>
            <strong class="text-sky-400 font-bold">{actualHash}MB</strong>
          </div>
          <div class="flex items-center justify-between border-r border-slate-800/60 pr-2">
            <span class="text-[9px] text-slate-500">MultiPV (후보수)</span>
            <strong class="text-sky-400 font-bold" id="engine-active-multipv-value" data-active-multipv={allCandidateMoves.length}>{allCandidateMoves.length}</strong>
          </div>
          <div class="flex items-center justify-between pl-1">
            <span class="text-[9px] text-slate-500">Nodes (노드 수)</span>
            <strong class="text-sky-400 font-bold">{totalNodes.toLocaleString()}</strong>
          </div>
          <div class="col-span-2 flex items-center justify-between pt-1 mt-0.5 border-t border-slate-800/50">
            <span class="text-[9px] text-slate-500 font-sans">NPS (초당 탐색 노드)</span>
            <strong class="text-emerald-400 font-bold">{localAnalysisStore.nps.toLocaleString()} NPS</strong>
          </div>
          
          {#if engineSettingsStore.threadCapabilityStatus === 'blocked-by-isolation'}
            <div id="thread-blocked-warning" class="col-span-2 mt-2.5 p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-[11px] text-rose-300 leading-normal font-sans space-y-1">
              <div class="flex items-center gap-1.5 font-bold text-rose-400">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>멀티스레드 가동 차단 경고 (Isolation Error)</span>
              </div>
              <p>
                <strong>요청:</strong> {engineSettingsStore.requestedThreadsValue}스레드 / 
                <strong>실제:</strong> {engineSettingsStore.actualThreadsValue}스레드
              </p>
              <p class="text-[10px] text-rose-400/90 leading-relaxed">
                <strong>차단 원인:</strong> COOP·COEP 미충족 (보안 헤더 결여로 SharedArrayBuffer 획득 불가능). 배정된 페이지와 Stockfish 자산의 CSP가 격리되지 않았습니다. (crossOriginIsolated: {engineSettingsStore.crossOriginIsolated ? 'TRUE' : 'FALSE'}, SharedArrayBuffer: {engineSettingsStore.isSharedArrayBufferExists ? '존재' : '부재'})
              </p>
            </div>
          {:else if !engineSettingsStore.isMultiThreadSupported}
            <div id="thread-fallback-warning" class="col-span-2 mt-2 p-2 bg-amber-500/5 rounded border border-amber-500/10 text-[10px] text-amber-300/95 leading-normal font-sans">
              <strong>스레드 제어 진단:</strong> 브라우저 보안 격리 제약(crossOriginIsolated: {engineSettingsStore.crossOriginIsolated ? 'OK' : '무효'}, SharedArrayBuffer: {engineSettingsStore.isSharedArrayBufferExists ? 'OK' : '없음'})으로 인해 싱글스레드 기반으로 안전 가공되어 있습니다.
            </div>
          {:else if localAnalysisStore.engineBuildType === 'multi-failed-single-fallback'}
            <div id="thread-preflight-warning" class="col-span-2 mt-2 p-2 bg-amber-500/5 rounded border border-amber-500/10 text-[10px] text-amber-300/95 leading-normal font-sans">
              <strong>스레드 제어 진단:</strong> 멀티스레드 물리 자원 검정(Preflight) 또는 주 가동 런타임 제한 오류로 인해 싱글스레드로 안전 자가 전향(Fallback) 처리되었습니다.
            </div>
          {/if}
        </div>
      </div>

    </div>
  {:else if (status === 'error' || status === 'stockfish-failed' || status === 'fallback-disabled' || status === 'fallback-failed' || status === 'analysis-unavailable') && localAnalysisStore.restartReason !== 'move-transition'}
    <!-- 에러 경고 배너 -->
    <div class="mx-4 my-2 p-3 bg-rose-950/30 border border-rose-900/40 rounded-xl flex items-start gap-2.5 shrink-0" id="engine-error-alert">
      <div class="bg-rose-500/10 p-1 rounded text-rose-400">
        <Cpu size={14} />
      </div>
      <div class="flex-1 space-y-0.5">
        <h5 class="text-xs font-bold text-rose-300">
          {#if status === 'fallback-disabled'}
            Stockfish 초기화 실패 (Fallback 평가 비표시)
          {:else if status === 'stockfish-failed'}
            Stockfish 초기화 실패 (분석 대체 진행 중)
          {:else if status === 'fallback-failed'}
            대체(Fallback) 분석 엔진 실행 실패
          {:else if status === 'analysis-unavailable'}
            분석 불가 (엔진 장애)
          {:else}
            엔진 모듈 로드 실패
          {/if}
        </h5>
        <p class="text-[10px] text-rose-400/80 leading-relaxed">
          {#if status === 'fallback-disabled'}
            사유: {fallbackReasonKorean} ({errorMessage || 'Ready timeout'}). 현재 정책에 따라 신뢰도가 보장되지 않는 대체 휴리스틱(Fallback) 평가는 화면에 표시하지 않습니다.
          {:else if status === 'stockfish-failed'}
            사유: {fallbackReasonKorean} ({errorMessage || 'Ready timeout'}). 대체 휴리스틱 파싱 엔진으로 전환을 기동합니다.
          {:else if status === 'fallback-failed'}
            로컬 엔진과 대체 엔진 모두 기동 실패하여 실시간 분석을 진행하지 못했습니다. {errorMessage || ''}
          {:else if status === 'analysis-unavailable'}
            로컬 분석 기능을 일시 사용할 수 없습니다. (이유: {errorMessage || 'Ready timeout'})
          {:else}
            {errorMessage || 'WASM 배포 파일이 준비되지 않았거나 보안 제약으로 간이 분석 엔진 기동이 취소되었습니다.'}
          {/if}
        </p>
      </div>
    </div>
  {/if}

  <!-- 현재 분석 요약 영역 -->
  <div class="flex-1 flex flex-col overflow-y-auto px-4 py-4 space-y-4 min-h-0 scrollbar-thin" id="engine-summary-area">
    
    <!-- 무승부 경고 배지 우선 표시 -->
    {#if positionStore.drawState !== 'none'}
      <div class="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1" id="draw-state-badge">
        <div class="flex items-center gap-1.5 font-bold text-amber-400 text-xs text-left">
          <span class="inline-block w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          <span>
            {#if positionStore.drawState === 'stalemate'}
              무승부 조건 감지: 스테일메이트 (Stalemate)
            {:else if positionStore.drawState === 'insufficient-material'}
              무승부 조건 감지: 기물 부족 (Insufficient Material)
            {:else if positionStore.drawState === 'fifty-move'}
              무승부 조건 감지: 50수 규칙 무승부
            {:else if positionStore.drawState === 'threefold-repetition'}
              무승부 조건 감지: 삼수동형 반복 가능 (Threefold Repetition)
            {:else if positionStore.drawState === 'seventyfive-move'}
              무승부 조건 감지: 75수 강제 무승부
            {:else}
              무승부 감지되었습니다
            {/if}
          </span>
        </div>
        <p class="text-[10.5px] text-slate-300 leading-normal font-sans text-left">
          {#if positionStore.drawState === 'stalemate'}
            현재 차례인 플레이어가 체크 상태가 아니면서 움직일 무리가 없는 교착 상황에 도달해 게임이 즉시 무승부 처리되었습니다.
          {:else if positionStore.drawState === 'insufficient-material'}
            서로 체크메이트를 가하기에 기물이 절대적으로 역부족인 불가능 상태(예: 킹 vs 킹)에 접어들어 무승부입니다.
          {:else if positionStore.drawState === 'fifty-move'}
            폰의 물리 전진이나 기물 탈취 행위 없이 연속 50수(100 plies)가 도과하여 무승부 주장이 유효하게 성립됩니다.
          {:else if positionStore.drawState === 'threefold-repetition'}
            동일한 기물 배치, 캐슬링 성립 권리 및 적대 턴 국면이 전체 대국 기보 히스토리 속에서 동일하게 3회 이상 누적 발현되어 삼수동형 무승부 조건에 도달하였습니다.
          {:else if positionStore.drawState === 'seventyfive-move'}
            어떠한 전진 및 기물 탈취 조건 없이 도합 75수가 소모되어 FIDE 공식 체스 룰에 입각한 강제 무승부 국면입니다.
          {/if}
        </p>
      </div>
    {/if}

    <div class="flex flex-col gap-1 select-none font-sans">
      <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">실시간 수집 현황</h4>
      {#if status === 'fallback-disabled'}
        <p class="text-[11px] text-amber-400 font-medium leading-normal">
          Stockfish 로컬 엔진 기동 실패(사유: {fallbackReasonKorean})로 인해 대체 휴리스틱(Fallback) 모드가 작동하고 있으나, 신뢰도가 낮아 최종 평가 표시는 보류(비표시)되었습니다.
        </p>
      {:else if localAnalysisStore.engineMode === 'fallback'}
        <p class="text-[11px] text-amber-500/95 leading-normal font-medium">로컬 Stockfish 가동 실패로 인해 복구 모드로 전환되었습니다. 브라우저 대체 휴리스틱(Fallback) 엔진과 Wiki DB 데이터를 가용 동원하여 연산을 지속하고 있습니다.</p>
      {:else}
        <p class="text-[11px] text-slate-500 leading-normal">로컬 스레드 내 Stockfish 18 분석 및 위키 DB 데이터를 조화롭게 상호 유합하여 후보수들의 기보 가치를 평가하고 있습니다.</p>
      {/if}

      {#if localAnalysisStore.staircaseStep === 'stabilizing'}
        <div class="mt-2.5 p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-[11px] text-sky-400 flex items-start gap-2.5 leading-relaxed">
          <Activity size={14} class="shrink-0 mt-0.5 text-sky-400" />
          <div class="flex-1 space-y-1">
            <strong class="font-extrabold text-sky-300 block">분석 1단계: 초반 안정화 수립 중 (목표 depth 20)</strong>
            <p class="text-slate-400 text-[10.5px]">
              싱글스레드 환경 보호를 위해 우선 상위 3개 후보수의 핵심 대안을 탐색하는 안전 장치(staircase)가 개입 중입니다. depth 20에 도달하면 즉시 자동으로 2단계 전체 확장 연산이 무제한 개시됩니다.
            </p>
          </div>
        </div>
      {:else if localAnalysisStore.staircaseStep === 'transitioning'}
        <div class="mt-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-400 flex items-start gap-2.5 leading-relaxed">
          <Cpu size={14} class="shrink-0 mt-0.5 text-amber-400 animate-spin" />
          <div class="flex-1 space-y-1">
            <strong class="font-extrabold text-amber-300 block">분석 2단계 전환 중: 연산 리액티브 초기화</strong>
            <p class="text-slate-400 text-[10.5px]">
              1단계 안정화 평가(depth 20)를 보존하고, 전체 후보수 대상 무제한 확장 연산(2단계)을 개시하기 위해 엔진을 기동 제어하고 있습니다. 잠시만 기다려 주십시오.
            </p>
          </div>
        </div>
      {:else if localAnalysisStore.staircaseStep === 'expanded'}
        <div class="mt-2.5 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-400 flex items-start gap-2.5 leading-relaxed">
          <Award size={14} class="shrink-0 mt-0.5 text-emerald-400" />
          <div class="flex-1 space-y-1">
            <strong class="font-extrabold text-emerald-300 block">분석 2단계: 무제한 전체 확장 분석 가동 중</strong>
            <p class="text-slate-300 text-[10.5px]">
              안전 확보 완료! 이제 제약 없이 전체 후보수에 대해 목표 깊이를 초과하는 정밀 심층 대응 연산을 완전 무제한으로 지속하고 있습니다.
            </p>
          </div>
        </div>
      {/if}
    </div>

    <!-- 진행 상황 파이/게이지 플로우 -->
    {#if (status === 'analyzing' || status === 'fallback-running') && !isAllEvalsDbOnly}
      <div class="bg-[var(--color-bg-nested)] p-3 rounded-xl space-y-2 border
                  {localAnalysisStore.engineMode === 'fallback' ? 'border-amber-500/20' : 'border-[var(--color-border-primary)]'}">
        <div class="flex justify-between items-center text-xs">
          <span class="text-slate-400 font-medium">{localAnalysisStore.engineMode === 'fallback' ? '휴리스틱 연산 진행' : '연산 완료 흐름'}</span>
          <span class="font-mono font-bold text-emerald-400" class:text-amber-400={localAnalysisStore.engineMode === 'fallback'}>
            {Object.keys(evaluations).length} / {allCandidateMoves.length}
          </span>
        </div>
        <div class="w-full bg-[var(--color-bg-panel)] rounded-full h-1.5 overflow-hidden">
          <div class="h-1.5 rounded-full transition-all duration-300" 
               class:bg-amber-500={localAnalysisStore.engineMode === 'fallback'}
               class:bg-emerald-500={localAnalysisStore.engineMode !== 'fallback'}
               style="width: {allCandidateMoves.length > 0 ? (Object.keys(evaluations).length / allCandidateMoves.length) * 100 : 0}%">
          </div>
        </div>
      </div>
    {:else if showCompletedUi}
      {#if localAnalysisStore.engineMode === 'fallback'}
        <div class="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs text-amber-400 flex items-center gap-2">
          <Zap size={14} />
          <span>대체 휴리스틱 엔진을 활용하여 모든 후보 수의 간이 평가를 최종 수립했습니다. (낮은 신뢰도)</span>
        </div>
      {:else}
        <div class="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
          <Zap size={14} />
          <span>현재 포지션의 모든 후보 수에 대한 신뢰도 높은 분석을 완수했습니다.</span>
        </div>
      {/if}
    {:else}
      <div class="bg-[var(--color-bg-nested)] border border-[var(--color-border-primary)] p-4 rounded-xl text-xs text-slate-500 text-center">
        체스 게임을 진행하면 엔진 분석이 실시간으로 시작됩니다.
      </div>
    {/if}

    <!-- 분석 요약 리스트 -->
    {#if sortedEvaluations.length > 0}
      <div class="space-y-2 select-none" id="engine-best-recommendations">
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">최적 추천 대응 수 (우수 순서)</span>
        <div class="divide-y divide-[var(--color-border-primary)]/50 bg-[var(--color-bg-nested)] border border-[var(--color-border-secondary)]/80 rounded-xl overflow-hidden">
          {#each sortedEvaluations as item, idx}
            <div class="flex items-center justify-between px-3.5 py-2.5 text-xs">
              <div class="flex items-center gap-2">
                <span class="font-mono text-[9px] text-slate-600 font-bold w-4">{idx + 1}.</span>
                <span class="font-mono font-bold text-slate-200 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] px-1.5 py-0.5 rounded text-[11px] min-w-[42px] text-center">{item.moveSan}</span>
                <span class="text-[10px] text-slate-500 font-mono">({item.moveUci})</span>
                {#if item.source === 'db'}
                  <span class="text-[8px] bg-sky-500/10 text-sky-400 px-1 py-0.1 rounded border border-sky-500/20 font-bold select-none">DB</span>
                {:else if item.source === 'local'}
                  <span class="text-[8px] bg-emerald-500/10 text-emerald-400 px-1 py-0.1 rounded border border-emerald-500/20 font-bold select-none">Local</span>
                {:else if item.source === 'fallback'}
                  <span class="text-[8px] bg-slate-500/10 text-slate-500 px-1 py-0.1 rounded border border-slate-500/20 font-bold select-none">Fallback</span>
                {/if}
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] text-slate-400 font-mono pl-2">depth {item.depth}</span>
                <span class="font-mono px-2 py-0.5 rounded font-bold text-[11px] {(!item.score.isMate() && item.score.value >= 0) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}">
                  {item.score.format()}
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

</div>
