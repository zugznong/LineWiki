<script lang="ts">
  import { ArrowLeft, Home, ArrowUpDown, Settings, Copy, Check } from '@lucide/svelte';
  import { createAppServices } from '$lib/composition/createAppServices';
  import { positionStore } from '$lib/stores/positionStore.svelte.ts';
  import { panelStore } from '$lib/stores/panelStore.svelte.ts';
  import { viewportStore } from '$lib/stores/viewportStore.svelte.ts';
  import { onMount } from 'svelte';

  const currentPosition = $derived(positionStore.current);
  let isCopied = $state(false);
  let canGoBackState = $state(false);

  onMount(() => {
    const services = createAppServices();
    canGoBackState = services.navigation.canGoBack();
  });

  function handleHome() {
    const services = createAppServices();
    services.navigation.goto('/');
  }

  function handleBack() {
    if (!canGoBackState) return;
    const services = createAppServices();
    services.navigation.back();
  }

  function handleFlip() {
    const services = createAppServices();
    services.flipBoard.execute();
  }

  function handleSettings() {
    if (viewportStore.isMobile) {
      panelStore.toggleMobileSettings();
    } else {
      panelStore.setDesktopActiveTab('settings');
    }
  }

  function copyFen() {
    if (!currentPosition?.fen) return;
    try {
      navigator.clipboard.writeText(currentPosition.fen);
      isCopied = true;
      setTimeout(() => {
        isCopied = false;
      }, 2000);
    } catch (err) {
      console.error('FEN 복사 실패:', err);
    }
  }
</script>

<header class="h-16 border-b border-slate-900 bg-slate-950 px-4 md:px-6 flex items-center justify-between shrink-0 select-none z-30" id="position-topbar">
  <div class="flex items-center gap-2.5">
    <!-- 뒤로가기 버튼 -->
    <button 
      onclick={handleBack}
      disabled={!canGoBackState}
      class="text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700/80 p-2 rounded-xl transition cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-slate-900 disabled:border-slate-800"
      aria-label="뒤로 가기"
      id="topbar-back-btn"
    >
      <ArrowLeft size={16} />
    </button>
    
    <!-- LineWiki 로고 홈 버튼 -->
    <button 
      onclick={handleHome}
      class="text-slate-400 hover:text-emerald-400 font-display font-medium text-sm flex items-center gap-1.5 transition cursor-pointer"
      id="topbar-logo-btn"
    >
      <Home size={15} />
      <span class="font-bold text-white hover:text-emerald-400 transition" id="topbar-logo-text">Line<span class="text-emerald-500">Wiki</span></span>
    </button>
  </div>

  <!-- FEN 복사 영역 (데스크톱 및 태블릿에서 노출) -->
  {#if currentPosition?.fen}
    <div class="hidden md:flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-1.5 max-w-md lg:max-w-xl flex-1 mx-4 font-mono text-xs">
      <span class="text-slate-500 uppercase font-bold text-[9px] shrink-0 border border-slate-700/60 px-1 py-0.5 rounded">FEN:</span>
      <span class="text-slate-300 truncate select-all">{currentPosition.fen}</span>
      
      <button 
        onclick={copyFen}
        class="text-slate-400 hover:text-emerald-400 p-1 rounded transition shrink-0 cursor-pointer ml-auto"
        title="FEN 복사"
        id="topbar-copy-fen-btn"
      >
        {#if isCopied}
          <Check size={14} class="text-emerald-400" />
        {:else}
          <Copy size={14} />
        {/if}
      </button>
    </div>
  {/if}

  <!-- 제어 액션 영역 (Flip, Settings) -->
  <div class="flex items-center gap-2">
    <!-- Flip 버튼 -->
    <button
      onclick={handleFlip}
      class="text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 p-2 rounded-xl transition cursor-pointer"
      title="보드 회전(Flip)"
      aria-label="보드 플립"
      id="topbar-flip-btn"
    >
      <ArrowUpDown size={16} />
    </button>

    <!-- Settings 버튼 -->
    <button
      onclick={handleSettings}
      class="text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 p-2 rounded-xl transition cursor-pointer"
      title="환경설정"
      aria-label="설정 토글"
      id="topbar-settings-btn"
    >
      <Settings size={16} />
    </button>

    <!-- 모바일 화면용 간단 복사 버튼 -->
    {#if currentPosition?.fen}
      <button 
        onclick={copyFen}
        class="md:hidden text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 p-2 rounded-xl transition cursor-pointer"
        title="FEN 복사"
        id="topbar-mobile-copy-btn"
      >
        {#if isCopied}
          <Check size={16} class="text-emerald-400" />
        {:else}
          <Copy size={16} />
        {/if}
      </button>
    {/if}
  </div>
</header>
