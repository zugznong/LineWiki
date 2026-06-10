<script lang="ts">
  import { ArrowLeft, ArrowRight, Home, ArrowUpDown, Settings, Copy, Check } from '@lucide/svelte';
  import { createAppServices } from '$lib/composition/createAppServices';
  import { positionStore } from '$lib/stores/positionStore.svelte.ts';
  import { panelStore } from '$lib/stores/panelStore.svelte.ts';
  import { viewportStore } from '$lib/stores/viewportStore.svelte.ts';

  const currentPosition = $derived(positionStore.current);
  let isCopied = $state(false);

  import { page } from '$app/state';
  import { sessionHistoryStore } from '$lib/stores/sessionHistoryStore.svelte.ts';

  // URL 변경 및 포지션 변경 시 실시간 수순 세션 동기화
  $effect(() => {
    if (page.url || positionStore.current) {
      sessionHistoryStore.updateHistory();
    }
  });

  const canGoBackState = $derived(sessionHistoryStore.canGoBack);
  const canGoForwardState = $derived(sessionHistoryStore.canGoForward);

  function handleHome() {
    const services = createAppServices();
    services.navigation.goto('/');
  }

  function handleBack() {
    sessionHistoryStore.goBack();
  }

  function handleForward() {
    sessionHistoryStore.goForward();
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

  const smallWidth = $derived(viewportStore.width);
  const btnPadding = $derived(smallWidth < 380 ? 'p-1' : (smallWidth < 430 ? 'p-1.5' : 'p-2'));
  const iconSize = $derived(smallWidth < 380 ? 13 : (smallWidth < 430 ? 14 : 15));
  const containerGap = $derived(smallWidth < 380 ? 'gap-1' : (smallWidth < 430 ? 'gap-1.5' : 'gap-2'));
  const headerPadding = $derived(smallWidth < 380 ? 'px-1.5' : (smallWidth < 430 ? 'px-2.5' : 'px-4 md:px-6'));
</script>

<header class="h-16 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-surface)] {headerPadding} flex items-center justify-between shrink-0 select-none z-30" id="position-topbar">
  <div class="flex items-center {containerGap}">
    <!-- 홈 버튼으로 전환된 독립된 제어기 -->
    <button 
      onclick={handleHome}
      class="text-slate-400 hover:text-white bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-panel)] border border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)] {btnPadding} rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
      aria-label="홈으로 이동"
      title="홈으로 이동"
      id="topbar-home-btn"
    >
      <Home size={iconSize} />
    </button>

    <div class="h-4 w-[1px] bg-[var(--color-border-primary)] shrink-0 {smallWidth < 380 ? 'mx-0.5' : 'mx-1'}"></div>

    <!-- 수순 뒤로가기 버튼 -->
    <button 
      onclick={handleBack}
      disabled={!canGoBackState}
      class="text-slate-400 hover:text-white bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-panel)] border border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)] {btnPadding} rounded-xl transition cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-[var(--color-bg-card)] disabled:border-[var(--color-border-primary)] shrink-0"
      aria-label="이전 수순으로 이동 (Alt + ← 또는 [)"
      title="이전 수순으로 이동 (Alt + ← 또는 [)"
      id="topbar-back-btn"
    >
      <ArrowLeft size={iconSize} />
    </button>

    <!-- 수순 앞으로가기 버튼 -->
    <button 
      onclick={handleForward}
      disabled={!canGoForwardState}
      class="text-slate-400 hover:text-white bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-panel)] border border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)] {btnPadding} rounded-xl transition cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-[var(--color-bg-card)] disabled:border-[var(--color-border-primary)] shrink-0"
      aria-label="다음 수순으로 이동 (Alt + → 또는 ])"
      title="다음 수순으로 이동 (Alt + → 또는 ])"
      id="topbar-forward-btn"
    >
      <ArrowRight size={iconSize} />
    </button>
    
    <div class="h-4 w-[1px] bg-[var(--color-border-primary)] shrink-0 {smallWidth < 380 ? 'mx-0.5' : 'mx-1'}"></div>
    
    <!-- LineWiki 로고 브랜드 홈 링크 -->
    <button 
      onclick={handleHome}
      class="text-slate-400 hover:text-emerald-400 font-display font-medium text-sm flex items-center transition cursor-pointer py-1 px-1 xs:px-1.5 hidden sm:flex shrink-0"
      id="topbar-logo-btn"
    >
      <span class="font-bold text-white hover:text-emerald-400 transition" id="topbar-logo-text">Line<span class="text-emerald-500">Wiki</span></span>
    </button>
  </div>

  <!-- FEN 복사 영역 (데스크톱 및 태블릿에서 노출) -->
  {#if currentPosition?.fen}
    <div class="hidden md:flex items-center gap-2 bg-[var(--color-bg-nested)] border border-[var(--color-border-primary)] rounded-xl px-3 py-1.5 max-w-md lg:max-w-xl flex-1 mx-4 font-mono text-xs">
      <span class="text-slate-500 uppercase font-bold text-[9px] shrink-0 border border-[var(--color-border-secondary)]/50 px-1 py-0.5 rounded">FEN:</span>
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
  <div class="flex items-center {containerGap} shrink-0">
    <!-- Flip 버튼 -->
    <button
      onclick={handleFlip}
      class="text-slate-400 hover:text-white bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-panel)] border border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)] {btnPadding} rounded-xl transition cursor-pointer shrink-0"
      title="보드 회전(Flip)"
      aria-label="보드 플립"
      id="topbar-flip-btn"
    >
      <ArrowUpDown size={iconSize} />
    </button>

    <!-- Settings 버튼 -->
    <button
      onclick={handleSettings}
      class="text-slate-400 hover:text-white bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-panel)] border border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)] {btnPadding} rounded-xl transition cursor-pointer shrink-0"
      title="환경설정"
      aria-label="설정 토글"
      id="topbar-settings-btn"
    >
      <Settings size={iconSize} />
    </button>

    <!-- 모바일 화면용 간단 복사 버튼 -->
    {#if currentPosition?.fen}
      <button 
        onclick={copyFen}
        class="md:hidden text-slate-400 hover:text-white bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-panel)] border border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)] {btnPadding} rounded-xl transition cursor-pointer shrink-0"
        title="FEN 복사"
        id="topbar-mobile-copy-btn"
      >
        {#if isCopied}
          <Check size={iconSize} class="text-emerald-400" />
        {:else}
          <Copy size={iconSize} />
        {/if}
      </button>
    {/if}
  </div>
</header>
