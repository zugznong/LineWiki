<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { viewportStore } from '$lib/stores/viewportStore.svelte.ts';
  import { boardStore } from '$lib/stores/boardStore.svelte.ts';
  import { createStorageServices } from '$lib/composition/createStorageServices';

  /**
   * Layout props
   */
  let { children } = $props();

  onMount(() => {
    // Initialize standard storage service ONLY to retrieve preferences
    const storageServices = createStorageServices();
    
    // Set up viewport tracking
    viewportStore.init();

    // Load initial board settings using the self-healing use case
    const settingsResult = storageServices.loadBoardSettings.execute();
    const settings = settingsResult.unwrap();
    boardStore.init({
      theme: settings.theme,
      pieceStyle: settings.pieceStyle,
      orientation: settings.orientation
    });
  });
</script>

<div class="min-h-[100dvh] bg-[var(--color-bg-base)] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
  <main id="main-content" class="flex-1 flex flex-col">
    {@render children()}
  </main>
</div>
