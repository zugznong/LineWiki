<script lang="ts">
  import StartPageHeader from './StartPageHeader.svelte';
  import FenInputCard from './FenInputCard.svelte';
  import ExamplePositionList from './ExamplePositionList.svelte';

  let { examples = [] } = $props<{
    examples: { name: string; fen: string }[];
  }>();
</script>

<div class="flex-1 flex flex-col justify-center px-4 py-12 select-none" id="start-page-shell">
  <div class="w-full max-w-4xl mx-auto space-y-10">
    <StartPageHeader />
    <FenInputCard />
    <ExamplePositionList {examples} />
  </div>
</div>
