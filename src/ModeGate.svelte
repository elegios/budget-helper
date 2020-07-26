<script lang="ts">
  import {formatDate, compareDate} from './generationDSL';
  import type {transaction, date} from './generationDSL';

  export let allowContinue = true;
  export let inDSLMode = false;
  export let sources: Record<string, {transactions: transaction[], is: "entered" | "actual"}>;
  export let cutoff: date = {year: 2020, month: 1, day: 1};
  export let maxDayDiff: number = 7;

  let dateInput: HTMLInputElement | undefined;

  let earliest: date | undefined;
  $: {
    earliest = undefined;
    for (let source of Object.values(sources)) {
      let earliestHere: undefined | date = undefined;
      for (let trans of source.transactions) {
        if (!earliestHere || compareDate(earliestHere, trans.date) > 0) {
          earliestHere = trans.date;
        }
      }
      if (earliestHere && (!earliest || compareDate(earliest, earliestHere) < 0)) {
        earliest = earliestHere;
      }
    }
  }

  function updateCutoff() {
    if (!earliest || !dateInput) return;
    const [year, month, day] = dateInput.value.split("-");
    const dsDate = { year: parseInt(year), month: parseInt(month), day: parseInt(day) };
    cutoff = compareDate(dsDate, earliest) < -1 ? earliest : dsDate;
  }
  $: if (earliest && dateInput) updateCutoff();

  function dateAsValue(d: date): string {
    return `${d.year}-${(d.month + "").padStart(2, '0')}-${(d.day + "").padStart(2, '0')}`;
  }
</script>

<div>
  {#if earliest}
    <div id="earliest-info"> Earliest shared date: {formatDate(earliest)} </div>
    <label>
      Ignore transactions before
      <input
        type="date"
        bind:this={dateInput}
        disabled={inDSLMode}
        on:change="{_ => updateCutoff()}"
        value={dateAsValue(cutoff)}>
    </label>
    <label>
      Max date diff for matches
      <input
        id=num-input
        type="number"
        disabled={inDSLMode}
        bind:value={maxDayDiff} min=0 max=14>
    </label>
    <button
      disabled={!inDSLMode && !allowContinue}
      on:click="{_ => {inDSLMode = !inDSLMode}}">
      {#if inDSLMode} Back {:else} Continue {/if}
    </button>
  {:else}
    Please add some transaction files.
  {/if}
</div>

<style>
  #earliest-info {
    margin-bottom: 2px
  }
  #num-input {
    width: 100px;
  }
  label {
    display: inline;
    margin-right: 15px;
  }
  button {
   width: 6em;
  }
</style>
