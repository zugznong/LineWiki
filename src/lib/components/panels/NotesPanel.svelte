<script lang="ts">
  import { BookOpen, Lock } from '@lucide/svelte';
</script>

<div class="flex-1 p-6 flex flex-col justify-center items-center text-center space-y-4 select-none h-full min-h-0 overflow-y-auto scrollbar-thin overscroll-contain" id="notes-panel">
  <div class="relative w-14 h-14 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-2xl flex items-center justify-center text-slate-400">
    <BookOpen size={24} class="text-slate-400" />
    <span class="absolute -top-1 -right-1 bg-amber-500 text-slate-950 rounded-full p-0.5">
      <Lock size={10} />
    </span>
  </div>

  <div class="space-y-1.5 max-w-xs">
    <h4 class="text-sm font-extrabold text-slate-200 tracking-tight">개인 연구 위키 & 전술 노트</h4>
    <p class="text-[11px] text-slate-500 leading-relaxed">
      Personal Notes feature is <span class="text-amber-500 font-semibold">coming later</span>.
    </p>
    <p class="text-[11px] text-slate-400 leading-relaxed">
      선택한 오프닝 위치와 국면에 수순 전개 해설 및 백과사전 형태의 훈련 기록을 기입하는 고성능 마크다운 노트 유틸리티입니다. 차기 대규모 패치에서 활성화됩니다.
    </p>
  </div>
</div>
