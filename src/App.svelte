<script lang="ts">
  import Editor from './Editor.svelte';
  import ModeGate from './ModeGate.svelte';
  import SourceList from './SourceList.svelte';

  import {generateDSLSource} from './generationDSL';
  import type {transaction, date} from './generationDSL';

  let actual: transaction[] = [
    {message: "trans1", amount: {integer: 100, decimal: 0}, date: {year: 2020, month: 1, day: 20}, source:"act.csv"},
    {message: "trans2", amount: {integer: -100, decimal: 0}, date: {year: 2020, month: 1, day: 20}, source:"act2.csv"},
    {message: "pe", amount: {integer: 100, decimal: 0}, date: {year: 2020, month: 1, day: 20}, source:"act.csv"},
    {message: "pne", amount: {integer: 200, decimal: 0}, date: {year: 2020, month: 1, day: 20}, source:"act.csv"},
  ];
  let entered: transaction[] = [
    {message: "pe-e", amount: {integer: 100, decimal: 0}, date: {year: 2020, month: 1, day: 22}, source:"ent.csv"},
    {message: "pne-e", amount: {integer: 300, decimal: 0}, date: {year: 2020, month: 1, day: 20}, source:"ent.csv"},
  ];

  let sources: Record<string, {transactions: transaction[], is: "entered" | "actual", filename: string}> = {
    "from account 1": {transactions: actual, is: "actual", filename: "act.csv"},
    "entered in budget": {transactions: entered, is: "entered", filename: "ent.csv"},
  };

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
