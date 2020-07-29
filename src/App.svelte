<script lang="ts">
  import Editor from './Editor.svelte';
  import ModeGate from './ModeGate.svelte';
  import SourceList from './SourceList.svelte';

  import {generateDSLSource} from './generationDSL';
  import type {transactionFile, date} from './generationDSL';

  let sources: Record<string, transactionFile> = {};

  let allowContinue: boolean = true;
  let inDSLMode = false;
  let cutoff: date | undefined = {year: 2020, month: 1, day: 1};
  let maxDayDiff: number = 7;
  let dslSource: string = "";
  $: dslSource = generateDSLSource(sources, maxDayDiff, cutoff);
</script>

<main>
	<h1>Budget Helper</h1>
  <SourceList enabled={!inDSLMode} bind:sources bind:allowContinue></SourceList>
  <ModeGate {allowContinue} bind:inDSLMode bind:cutoff bind:maxDayDiff {sources}></ModeGate>
  <Editor enabled={inDSLMode} value={dslSource}/>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
