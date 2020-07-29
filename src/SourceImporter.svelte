<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import {todayDate} from './generationDSL';
  import type {transaction, transactionFile} from './generationDSL';

  import TableImporter from './TableImporter.svelte';
  import TableParser from './TableParser.svelte';

  const dispatch = createEventDispatcher();

  export let file: File;
  export let previousNames: string[];

  let name = "";

  let wouldOverwrite: boolean = false;
  $: wouldOverwrite = previousNames.some(n => n === name);

  let stage: "make-table" | "make-transactions" = "make-table";

  let table: string[][] | null = null;
  let transactions: transaction[] | null = null;
  let is: "entered" | "actual" = "actual";

  export let result: [string, transactionFile] | null = null;

  $: result = transactions?.length && name !== ""
     ? [name, {transactions, is, filename: file.name, importDate: todayDate()}]
     : null;
</script>

<div>
  <div id="control">
    <label>
      Name:
      <input
        placeholder="Please enter a name for this table"
        type="text"
        bind:value={name}>
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
    <TableParser {table} source={name} filename={file.name} bind:transactions />
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
