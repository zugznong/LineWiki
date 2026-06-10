<script lang="ts">
  import { ShieldAlert, RotateCcw } from '@lucide/svelte';
  import { createAppServices } from '$lib/composition/createAppServices';

  let { error } = $props<{
    error?: string | null;
  }>();

  function handleBack() {
    const services = createAppServices();
    services.navigation.goto('/');
  }
</script>

<div class="flex-1 flex flex-col items-center justify-center p-6 bg-[var(--color-bg-base)]" id="position-fallback">
  <div class="max-w-md w-full bg-[var(--color-bg-surface)] border border-[var(--color-border-primary)] rounded-2xl p-6 md:p-8 text-center space-y-6 shadow-2xl animate-fade-in">
    <div class="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-rose-950/25">
      <ShieldAlert size={28} />
    </div>

    <div class="space-y-2">
      <h3 class="text-2xl font-bold tracking-tight text-white">포지션 분석 오류</h3>
      <p class="text-sm text-slate-400 leading-relaxed">
        {error || '잘못된 FEN 코드가 입력되었거나, 지원하지 않는 형식의 이동 기록 URL 구조 복원에 완전히 실패했습니다.'}
      </p>
    </div>

    <button 
      onclick={handleBack}
      class="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-lg shadow-emerald-500/10"
      id="fallback-home-btn"
    >
      <RotateCcw size={15} />
      <span>시작화면으로 돌아가기</span>
    </button>
  </div>
</div>
