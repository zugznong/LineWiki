<script lang="ts">
  import StartPageShell from '$lib/components/start/StartPageShell.svelte';
  
  let { data } = $props();
</script>

<StartPageShell examples={data.examples} />
