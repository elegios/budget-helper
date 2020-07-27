<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import type {transaction} from './generationDSL';

  import TableImporter from './TableImporter.svelte';
  import TableParser from './TableParser.svelte';

  const dispatch = createEventDispatcher();

  export let file: File;
  export let previousNames: string[];

  let name = file.name;

  let wouldOverwrite: boolean = false;
  $: wouldOverwrite = previousNames.some(n => n === name);

  let stage: "make-table" | "make-transactions" = "make-table";

  let table: string[][] | undefined;
  let transactions: transaction[] | undefined;
  let is: "entered" | "actual" = "entered";

  export let result: [string, {transactions: transaction[], is: "entered" | "actual"}] | undefined = undefined;

  $: if (transactions) {
    result = [name, {transactions, is}];
  }
</script>

<div>
  <div id="control">
    <label>
      Name:
      <input type="text" bind:value={name}>
    </label>
    <div id="is">
      <label><input type=radio bind:group={is} value={"entered"}> Entered</label>
      <label><input type=radio bind:group={is} value={"actual"}> Actual</label>
    </div>
    <button on:click="{_ => dispatch('cancel')}">Cancel</button>
    {#if stage === "make-table"}
      <button
        id="continue"
        on:click="{_ => stage = 'make-transactions'}"
        disabled={!table}> Continue </button>
    {:else}
      <button
        id="continue"
        on:click="{_ => dispatch('add')}"
        disabled={!result}> {wouldOverwrite ? "Overwrite" : "Add New"} </button>
    {/if}
  </div>
  {#if stage === "make-table"}
    <TableImporter bind:table {file} />
  {:else if table}
    <TableParser {table} source={name} bind:transactions />
  {/if}
</div>

<style>
  #control {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  #control>* {
    margin-left: 2px;
    margin-right: 2px;
  }
  #control>label {
    display: inline;
  }
  #is {
    display: inline-block;
  }
  #continue {
    width: 6em;
  }
</style>
