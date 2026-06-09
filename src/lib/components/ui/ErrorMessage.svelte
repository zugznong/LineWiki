<script lang="ts">
  import { ShieldAlert, RefreshCw } from '@lucide/svelte';

  let {
    message,
    title = '오류가 발생했습니다',
    retry,
    id
  } = $props<{
    message: string;
    title?: string;
    retry?: () => void;
    id?: string;
  }>();
</script>

<div 
  class="flex items-start gap-4 p-4 border border-rose-900/45 bg-rose-950/25 text-rose-300 rounded-2xl w-full"
  {id}
>
  <div class="bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/10 shrink-0 text-rose-400">
    <ShieldAlert size={16} />
  </div>

  <div class="flex-1 space-y-1 select-none min-w-0">
    <h4 class="text-xs font-extrabold tracking-tight text-rose-200 truncate">{title}</h4>
    <p class="text-[10px] text-rose-400/80 leading-normal break-words">{message}</p>
    
    {#if retry}
      <div class="pt-1.5">
        <button
          onclick={retry}
          class="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg text-[9px] transition cursor-pointer select-none border-none outline-none focus:ring-1 focus:ring-rose-400 active:scale-95"
          id="{id ? `${id}-retry-button` : 'error-retry-button'}"
        >
          <RefreshCw size={9} class="animate-spin" style="animation-duration: 3s" />
          <span>다시 시도</span>
        </button>
      </div>
    {/if}
  </div>
</div>
