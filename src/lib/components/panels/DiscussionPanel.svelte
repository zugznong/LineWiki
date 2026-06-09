<script lang="ts">
  import { MessageSquare, Lock } from '@lucide/svelte';
</script>

<div class="flex-1 p-6 flex flex-col justify-center items-center text-center space-y-4 select-none" id="discussion-panel">
  <div class="relative w-14 h-14 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
    <MessageSquare size={24} class="text-slate-400" />
    <span class="absolute -top-1 -right-1 bg-amber-500 text-slate-950 rounded-full p-0.5">
      <Lock size={10} />
    </span>
  </div>

  <div class="space-y-1.5 max-w-xs">
    <h4 class="text-sm font-extrabold text-slate-200 tracking-tight">집단지성 전술 공유 & 토론</h4>
    <p class="text-[11px] text-slate-500 leading-relaxed">
      Position Discussion feature is <span class="text-amber-500 font-semibold">coming later</span>.
    </p>
    <p class="text-[11px] text-slate-400 leading-relaxed">
      전 세계 체스 전술가들이 특정 국면에 어울리는 오프닝 분기점과 묘수(Blunder / Brilliant)를 두고 전술 배틀 및 의견을 교환하는 마스터 피드 영역입니다.
    </p>
  </div>
</div>
