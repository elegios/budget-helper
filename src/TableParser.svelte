<script lang="ts">
  import {parseTable, formatDate, formatAmount} from './generationDSL';
  import type {transaction} from './generationDSL';

  export let table: string[][];
  export let source: string;
  export let transactions: transaction[] | null = null;

  let dropCount = 0;

  let error: string | null;

  let messageColumn = 0;
  let dateColumn = 1;
  let amountColumn = 2;
  let decimalPoint: "dot" | "comma" = "dot";
  let dateOrder = "ymd";

  $: {
    const result = parseTable(table, {
      dropCount: dropCount ?? 0,
      source,
      amountConfig: {column: amountColumn ?? 0, decimalPoint},
      dateConfig: {column: dateColumn ?? 0, order: dateOrder},
      messageConfig: {column: messageColumn ?? 0},
    });
    if (typeof result === 'string') {
      transactions = null;
      error = result;
    } else {
      transactions = result;
      error = null;
    }
  }
</script>

<div id="container">
  <div id="config">
    <div>Misc</div>
    <div class="field-config">
      <label>Drop rows: <input type="number" bind:value={dropCount} min=0></label>
    </div>

    <div>Message</div>
    <div class="field-config">
      <label>Column: <input type="number" bind:value={messageColumn} min=0></label>
    </div>

    <div>Date</div>
    <div class="field-config">
      <label>Column: <input type="number" bind:value={dateColumn} min=0></label>
      <label>Order: <input type="text" bind:value={dateOrder}></label>
    </div>

    <div>Amount</div>
    <div class="field-config">
      <label>Column: <input type="number" bind:value={amountColumn} min=0></label>
      <div id="decimal">
        <label><input type=radio bind:group={decimalPoint} value={"dot"}> Decimal point</label>
        <label><input type=radio bind:group={decimalPoint} value={"comma"}> Decimal comma</label>
      </div>
    </div>
  </div>

  <div id="preview">
    <h3>Input</h3>
    <div id="table" class="content">
      <table>
        {#each table as row, i}
          <tr>
            <td class="row-index">#{i+1}</td>
            {#each row as item}<td>{item}</td>{/each}
          </tr>
        {/each}
      </table>
    </div>
    {#if error}
      <h3>Error</h3>
      <div id="error" class="content">{error}</div>
    {:else if transactions}
      <h3>Output</h3>
      <div class="content">
        <table>
          <tr>
            <th scope="col">Message</th>
            <th scope="col">Date</th>
            <th scope="col">Amount</th>
          </tr>
          {#each transactions as transaction}
            <tr>
              <td>{transaction.message}</td>
              <td>{formatDate(transaction.date)}</td>
              <td class="amount">{formatAmount(transaction.amount)}</td>
            </tr>
          {/each}
        </table>
      </div>
    {/if}
  </div>
</div>

<style>
  #config {
    display: grid;
    grid-template-columns: 100px max-content;
    justify-content: center;
    align-items: baseline;
  }
  .field-config {
    display: grid;
    grid-template-columns: max-content max-content;
    grid-gap: 5px;
    align-items: baseline;
  }
  .field-config input[type="number"] {
    width: 4em;
  }
  .field-config input[type="text"] {
    width: 6em;
  }
  #decimal {
    text-align: left;
  }
  #decimal label {
    display: inline;
    margin-right: 5px;
  }
  #preview {
    display: grid;
    grid-auto-flow: column;
    grid-template-columns: 50% 50%;
    grid-template-rows: max-content minmax(2em, 10em);
    grid-gap: 5px;
  }
  h3 {
    margin: 0px;
  }
  .content {
    background-color: #eee;
    text-align: left;
    overflow-y: scroll;
    overflow-x: auto;
  }
  #table {
    padding: 5px;
  }
  #error {
    white-space: pre;
    padding: 2px 7px;
  }
  td:not(.row-index),th {
    background-color: #ddd;
    padding: 2px 7px;
  }
  td.amount {
    text-align: right;
  }
</style>
