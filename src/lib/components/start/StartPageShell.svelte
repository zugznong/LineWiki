<script lang="ts">
  import StartPageHeader from './StartPageHeader.svelte';
  import FenInputCard from './FenInputCard.svelte';
  import ExamplePositionList from './ExamplePositionList.svelte';

  let { examples = [] } = $props<{
    examples: { name: string; fen: string }[];
  }>();
</script>

<div class="flex-1 bg-slate-950 start-page-hero flex flex-col justify-center px-4 py-12 select-none" id="start-page-shell">
  <div class="w-full max-w-4xl mx-auto space-y-10">
    <StartPageHeader />
    <FenInputCard />
    <ExamplePositionList {examples} />

    <footer class="pt-6 text-center">
      <a href="/privacy" class="text-xs text-slate-500 hover:text-emerald-400 transition underline-offset-4 hover:underline">
        개인정보 처리방침
      </a>
    </footer>
  </div>
</div>
