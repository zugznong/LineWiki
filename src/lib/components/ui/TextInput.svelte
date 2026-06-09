<script lang="ts">
  let {
    value = $bindable(''),
    placeholder = '',
    disabled = false,
    invalid = false,
    id,
    class: inlineClass = '',
    oninput,
    onkeydown,
    ariaLabel
  } = $props<{
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    invalid?: boolean;
    id?: string;
    class?: string;
    oninput?: (e: Event & { currentTarget: HTMLInputElement }) => void;
    onkeydown?: (e: KeyboardEvent & { currentTarget: HTMLInputElement }) => void;
    ariaLabel?: string;
  }>();
</script>

<div class="relative w-full" id="{id ? `${id}-container` : 'text-input-container'}">
  <input
    type="text"
    {id}
    disabled={disabled}
    placeholder={placeholder}
    bind:value={value}
    oninput={oninput}
    onkeydown={onkeydown}
    aria-label={ariaLabel}
    aria-invalid={invalid ? "true" : "false"}
    class="w-full px-4 py-2.5 bg-slate-950/60 text-slate-100 placeholder-slate-600 rounded-xl border font-mono text-xs tracking-tight transition duration-150 focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed
      {invalid 
        ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/25 bg-rose-950/10 text-rose-300' 
        : 'border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/20'} 
      {inlineClass}"
  />
  
  {#if invalid}
    <div class="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none" id="{id ? `${id}-error-indicator` : 'input-error-indicator'}">
      <span class="text-rose-500 flex h-2 w-2">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
      </span>
    </div>
  {/if}
</div>
