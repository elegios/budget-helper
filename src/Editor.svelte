<script lang="ts">
  import {parse} from './generationDSL';

  export let enabled: boolean = true;

  export let value: string;

  let area: HTMLTextAreaElement | undefined;
  function updateHeight() {
    if (!area) return;
    // NOTE(vipa): we might run this reactive thing before the binding
    // has been updated, so we need to make sure the value is correct
    if (area.value !== value) area.value = value;
    area.style.height = "1px";
    area.style.height = (area.scrollHeight + 1) + "px";
  }
  $: if (area && value) updateHeight();
</script>

<div>
  <textarea
    disabled={!enabled}
    bind:value
    bind:this={area}></textarea>

  <button disabled={!enabled} on:click="{_ => alert(parse(value))}">Generate CSV</button>
</div>

<style>
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
