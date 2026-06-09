<script lang="ts">
  import { getChessServices, getStorageServices, getNavigationAdapter } from '$lib/composition/createAppServices';
  import { DEFAULT_FEN } from '$lib/config/appConfig';
  import { ArrowRight, Sparkles } from '@lucide/svelte';

  let customFen = $state('');
  let errorMsg = $state('');

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const targetFen = customFen.trim() || DEFAULT_FEN;
    
    const chess = getChessServices();
    const storage = getStorageServices();
    const navigation = getNavigationAdapter();
    
    const validationResult = chess.chessEngine.validateFen(targetFen);
    
    if (validationResult) {
      errorMsg = '';
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('linewiki.session.startedFromApp', 'true');
      }
      storage.clearLineHistory.execute();
      navigation.goto(chess.createFenUrl.execute(targetFen));
    } else {
      errorMsg = '유효하지 않은 FEN 포지션 코드입니다. 입력형식을 확인해 주십시오.';
    }
  }

  function handleLoadDefaultDirectly() {
    const chess = getChessServices();
    const storage = getStorageServices();
    const navigation = getNavigationAdapter();
    
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('linewiki.session.startedFromApp', 'true');
    }
    storage.clearLineHistory.execute();
    navigation.goto(chess.createFenUrl.execute(DEFAULT_FEN));
  }

  function loadDefault() {
    customFen = DEFAULT_FEN;
    errorMsg = '';
  }
</script>

<div class="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl max-w-xl mx-auto" id="fen-input-card">
  <form onsubmit={handleSubmit} class="space-y-4">
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label for="fen-input" class="text-sm font-semibold tracking-wide text-slate-300">
          분석용 FEN 포지션 코드 입력
        </label>
        <button 
          type="button" 
          onclick={loadDefault}
          class="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition cursor-pointer"
        >
          입력창 채우기
        </button>
      </div>
      <input 
        id="fen-input"
        type="text" 
        placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        bind:value={customFen}
        class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition font-mono"
      />
    </div>

    {#if errorMsg}
      <div class="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg" id="fen-error-message">
        {errorMsg}
      </div>
    {/if}

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="fen-action-buttons">
      <button 
        type="submit"
        class="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-3.5 rounded-xl flex items-center justify-center gap-2 transition hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-lg shadow-emerald-500/10"
        id="submit-fen-btn"
      >
        <span>포지션 분석하기</span>
        <ArrowRight size={16} />
      </button>

      <button 
        type="button"
        onclick={handleLoadDefaultDirectly}
        class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 font-semibold px-4 py-3.5 rounded-xl flex items-center justify-center gap-2 transition hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        id="load-default-fen-btn"
      >
        <span>시작 포지션 열기</span>
        <Sparkles size={16} class="text-emerald-400" />
      </button>
    </div>
  </form>
</div>
