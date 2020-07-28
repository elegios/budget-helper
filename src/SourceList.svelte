<script lang="ts">
  import SourceImporter from './SourceImporter.svelte';

  import type {transaction} from './generationDSL';

  export let enabled: boolean = true;
  export let sources: Record<string, {transactions: transaction[], is: "entered" | "actual", filename: string}>;

  export let allowContinue: boolean = true;

  let fileInput: HTMLInputElement | null;
  let fileToBeAdded: File | null;
  let newSource: [string, {transactions: transaction[], is: "entered" | "actual", filename: string}] | null;

  function maybeSelectedFile() {
    if (!fileInput?.files?.length) {
      fileToBeAdded = null;
      return;
    }
    fileToBeAdded = fileInput.files[0];
  }

  function addSource() {
    if (!newSource) {
      console.error("We have no new source despite getting an event to add it.");
      return;
    }
    sources[newSource[0]] = newSource[1];
    fileToBeAdded = null;
  }

  $: allowContinue = !fileToBeAdded;
</script>

<div id="container">
  {#each Object.entries(sources) as source (source[0])}
    <div class="name">{source[0]} <span class="filename">({source[1].filename})</span></div>
    <div class="is">is: {source[1].is}</div>
    <button
      on:click="{_ => {delete sources[source[0]]; sources = sources;}}"
      disabled={!enabled}>Remove</button>
  {/each}
</div>
<div id="adder">
  {#if !fileToBeAdded}
    <label>
      Add a new file:
      <input
        id=""
        type="file"
        disabled={!enabled}
        bind:this={fileInput}
        on:change="{_ => maybeSelectedFile()}"
        accept=".csv,.xlsx" />
    </label>
  {:else}
    <SourceImporter
      on:cancel="{_ => fileToBeAdded = null}"
      on:add="{_ => addSource()}"
      bind:result={newSource}
      previousNames={Object.keys(sources)}
      file={fileToBeAdded} />
  {/if}
</div>

<style>
  #container {
    display: grid;
    grid-auto-flow: row;
    grid-template-columns: [name] minmax(200px, max-content) [is] minmax(100px, max-content) [delete] min-content;
    grid-gap: 5px;
    text-align: left;
    justify-content: center;
  }

  .name,.is {
    background-color: #eee;
    padding-left: 5px;
    padding-right: 5px;
  }
  .name {
    grid-column: name;
  }
  .is {
    grid-column: is;
  }
  #container>button {
    grid-column: delete;
    margin: 0px;
    padding: 1px 3px;
  }
  #adder {
    margin-top: 5px;
  }
  .filename {
    color: #777;
  }
</style>
