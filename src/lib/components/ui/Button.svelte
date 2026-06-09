<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    onclick,
    disabled = false,
    type = 'button',
    variant = 'primary',
    id,
    ariaLabel,
    class: inlineClass = '',
    children
  } = $props<{
    onclick?: (e: MouseEvent) => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
    id?: string;
    ariaLabel?: string;
    class?: string;
    children?: Snippet;
  }>();

  const baseStyles = 'inline-flex items-center justify-center gap-1.5 font-bold rounded-xl text-xs transition duration-150 select-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50';
  
  const variantStyles: Record<'primary' | 'secondary' | 'danger' | 'ghost' | 'success', string> = {
    primary: 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2.5 shadow-lg shadow-emerald-500/10 active:scale-98',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/65 px-4 py-2.5 active:scale-98',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 shadow-lg shadow-rose-500/10 active:scale-98',
    ghost: 'bg-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-100 px-3 py-2',
    success: 'bg-teal-500 hover:bg-teal-600 text-slate-950 px-4 py-2.5 shadow-lg shadow-teal-500/10 active:scale-98'
  };

  const currentClass = $derived(`${baseStyles} ${variantStyles[variant as 'primary' | 'secondary' | 'danger' | 'ghost' | 'success']} ${inlineClass}`);
</script>

<button
  {type}
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
