<script lang="ts">
  import {saveAs} from 'file-saver';
  import {parse} from './generationDSL';

  export let enabled: boolean = true;

  export let value: string;

  let area: HTMLTextAreaElement | undefined;
  function updateHeight() {
    if (!area) return;
    // NOTE(vipa): changing the size of the textarea will change the max
    // scroll position, so we store it and restore it afterwards to make
    // this invisible.
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    // NOTE(vipa): we might run this reactive thing before the binding
    // has been updated, so we need to make sure the value is correct
    if (area.value !== value) area.value = value;
    area.style.height = "1px";
    area.style.height = (area.scrollHeight + 1) + "px";
    window.scrollTo(scrollX, scrollY);
  }
  $: if (area && value) updateHeight();

  function saveFile(content: string) {
    saveAs(new Blob([content], {type: "text/csv"}), "export.csv");
  }
</script>

<div id="container">
  <textarea
    disabled={!enabled}
    bind:value
    bind:this={area}></textarea>

  <button disabled={!enabled} on:click="{_ => saveFile(parse(value))}">Generate CSV</button>
</div>

<style>
  #container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  textarea {
    font-family: monospace;
    text-align: left;
    min-width: 500px;
    width: 1000px;
    max-width: 100%;
  }

  button {
    margin-top: 10px;
  }
</style>
