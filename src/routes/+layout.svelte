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

    // Load initial board settings from localStorage WITHOUT instantiating active engines
    const settings = storageServices.boardSettings.loadSettings().unwrapOrDefault({
      theme: 'Classic Green',
      pieceStyle: 'Unicode',
      orientation: 'white'
    });
    boardStore.init({
      theme: settings.theme,
      pieceStyle: settings.pieceStyle,
      orientation: settings.orientation
    });
  });
</script>

<div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
  <main id="main-content" class="flex-1 flex flex-col">
    {@render children()}
  </main>
</div>
