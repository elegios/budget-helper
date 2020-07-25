<script lang="ts">
  import Editor from './Editor.svelte';
  import {generateDSLSource} from './generationDSL';
  import type {transaction} from './generationDSL';
  let actual: transaction[] = [
    {message: "trans1", amount: {integer: 100, decimal: 0}, date: {year: 2020, month: 1, day: 20}, source:"act.csv"},
    {message: "trans2", amount: {integer: -100, decimal: 0}, date: {year: 2020, month: 1, day: 20}, source:"act2.csv"},
    {message: "pe", amount: {integer: 100, decimal: 0}, date: {year: 2020, month: 1, day: 20}, source:"act.csv"},
    {message: "pne", amount: {integer: 200, decimal: 0}, date: {year: 2020, month: 1, day: 20}, source:"act.csv"},
  ];
  let entered: transaction[] = [
    {message: "pe-e", amount: {integer: 100, decimal: 0}, date: {year: 2020, month: 1, day: 20}, source:"ent.csv"},
    {message: "pne-e", amount: {integer: 300, decimal: 0}, date: {year: 2020, month: 1, day: 20}, source:"ent.csv"},
  ];
  let value = generateDSLSource({entered, actual});
</script>

<main>
	<h1>Budget Helper</h1>
  <Editor enabled={true} {value}/>
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
