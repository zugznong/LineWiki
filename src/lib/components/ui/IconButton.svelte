<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    onclick,
    disabled = false,
    ariaLabel, // 필수!
    id,
    variant = 'ghost',
    class: inlineClass = '',
    children
  } = $props<{
    onclick?: (e: MouseEvent) => void;
    disabled?: boolean;
    ariaLabel: string; // 필수!
    id?: string;
    variant?: 'ghost' | 'default' | 'accent';
    class?: string;
    children?: Snippet;
  }>();

  const baseStyles = 'inline-flex items-center justify-center rounded-xl transition duration-150 select-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-40';
  
  const variantStyles: Record<'ghost' | 'default' | 'accent', string> = {
    ghost: 'p-2 bg-transparent text-slate-400 hover:bg-[var(--color-bg-nested)]/50 hover:text-slate-100',
    default: 'p-2.5 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-panel)] text-slate-200 border border-[var(--color-border-primary)]/60 shadow',
    accent: 'p-2.5 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30'
  };

  const currentClass = $derived(`${baseStyles} ${variantStyles[variant as 'ghost' | 'default' | 'accent']} ${inlineClass}`);
</script>

<button
  type="button"
  {id}
  disabled={disabled}
  onclick={onclick}
  class={currentClass}
  aria-label={ariaLabel}
>
  {#if children}
    {@render children()}
  {/if}
</button>
