<script lang="ts">
  import { Cloud, Lock } from '@lucide/svelte';
</script>

<div class="flex-1 p-6 flex flex-col justify-center items-center text-center space-y-4 select-none h-full min-h-0 overflow-y-auto scrollbar-thin overscroll-contain" id="server-panel">
  <div class="relative w-14 h-14 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-2xl flex items-center justify-center text-slate-400">
    <Cloud size={24} class="text-slate-400" />
    <span class="absolute -top-1 -right-1 bg-amber-500 text-slate-950 rounded-full p-0.5" title="제한됨">
      <Lock size={10} />
    </span>
  </div>

  <div class="space-y-1.5 max-w-xs">
    <h4 class="text-sm font-extrabold text-slate-200 tracking-tight">클라우드 고정밀 마스터 분석 (Server)</h4>
    <p class="text-[11px] text-slate-500 leading-relaxed">
      Server Analysis is <span class="text-amber-500 font-semibold">not available in the open beta</span> phase.
    </p>
    <p class="text-[11px] text-slate-400 leading-relaxed">
      서버 리소스를 기반으로 오프닝 변형책 및 대규모 탐색 그래프를 자동 수립하는 심층 전술 레이어입니다. 정식 출시 후 제공됩니다.
    </p>
  </div>

  <div class="pt-2 w-full max-w-[200px]">
    <button 
      disabled 
      class="w-full bg-[var(--color-bg-panel)] text-slate-500 border border-[var(--color-border-primary)]/80 px-3 py-2 rounded-xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5"
      id="server-analyze-btn"
    >
      <Lock size={12} />
      <span>서버 탐색기 시작</span>
    </button>
  </div>
</div>
