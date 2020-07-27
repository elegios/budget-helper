<script lang="ts">
  import SourceImporter from './SourceImporter.svelte';

  import type {transaction} from './generationDSL';

  export let sources: Record<string, {transactions: transaction[], is: "entered" | "actual"}>;

  let fileInput: HTMLInputElement | undefined;
  let fileToBeAdded: File | undefined;
  let newSource: [string, {transactions: transaction[], is: "entered" | "actual"}] | undefined;

  function maybeSelectedFile() {
    if (!fileInput?.files?.length) {
      fileToBeAdded = undefined;
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
  }
</script>

<div id="container">
  {#each Object.entries(sources) as source (source[0])}
    <div class="name">{source[0]}</div>
    <div class="is">is: {source[1].is}</div>
    <button on:click="{_ => {delete sources[source[0]]; sources = sources;}}">Remove</button>
  {/each}
</div>
<div id="adder">
  {#if !fileToBeAdded}
    <label>
      Add a new file:
      <input
        id=""
        type="file"
        bind:this={fileInput}
        on:change="{_ => maybeSelectedFile()}"
        accept=".csv,.xlsx" />
    </label>
  {:else}
    <SourceImporter
      on:cancel="{_ => fileToBeAdded = undefined}"
      on:add="{_ => addSource()}"
      bind:result={newSource}
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
</style>
