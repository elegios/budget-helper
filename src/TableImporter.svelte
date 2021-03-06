<svelte:options immutable/>
<script lang="ts">
  import * as CSV from 'papaparse';
  import * as XLSX from 'xlsx';

  export let file: File;
  export let table: string[][] | null = null;

  // Taken from https://stackoverflow.com/questions/190852/how-can-i-get-file-extensions-with-javascript/12900504#12900504
  let extension = file.name.slice((file.name.lastIndexOf(".") - 1 >>> 0) + 2);

  // CSV things
  let firstTime = true;
  let fileText: string | null | false = null;
  let delimiter: string = "";
  $: if (fileText) {
    const result = CSV.parse(fileText, {
      skipEmptyLines: true,
      delimiter: firstTime ? undefined : delimiter,
    });
    if (firstTime) {
      delimiter = result.meta.delimiter;
      firstTime = false;
    }
    table = result.data as string[][];
  }

  // XLSX things
  let fileBinaryText: string | null | false = null;
  let workbook: XLSX.WorkBook | null = null;
  let sheetIdx: number = 0;
  $: if (fileBinaryText) {
    try {
      const result = XLSX.read(fileBinaryText, {type: "binary", raw: false});
      workbook = result;
    } catch (e) {
      console.error(e);
    }
  }
  $: if (workbook) {
    // NOTE: the options for XLSX are really confusing, name-wise, look at documentation before assuming they are wrong here
    table = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[sheetIdx]], {
      raw: false,
      header: 1,
    });
  }

  const fr = new FileReader();
  switch (extension) {
    case "csv":
      fr.onloadend = () => {
        if (typeof(fr.result) === 'string') {
          fileText = fr.result;
        } else {
          fileText = false;
        }
      };
      fr.readAsText(file);
      break;

    case "xlsx":
      fr.onloadend = () => {
        if (typeof(fr.result) === 'string') {
          fileBinaryText = fr.result;
        } else {
          fileBinaryText = false;
        }
      };
      fr.readAsBinaryString(file);
      break;
  }
</script>

<div>
  {#if extension === "csv"}
    {#if fileText === null}
      Reading file...
    {:else if fileText === false}
      Couldn't read the file, please try again.
    {:else}
      <label>
        Delimiter:
        <input type="text" bind:value={delimiter}>
      </label>
      <div id="preview">
        <h3>Input</h3>
        <div id="file" class="content">{fileText}</div>
        <h3>Table</h3>
        <div id="table" class="content">
          {#if table}
            <table class="content">
              {#each table as row}
                <tr>
                  {#each row as item}<td>{item}</td>{/each}
                </tr>
              {/each}
            </table>
          {:else}
            Couldn't get a table from the file.
          {/if}
        </div>
      </div>
    {/if}
  {:else if extension === "xlsx"}
    {#if fileBinaryText === null}
      Reading file...
    {:else if fileText === false}
      Couldn't read the file, please try again.
    {:else if workbook === null}
      Couldn't parse the file as an XLSX file, it might be corrupted.
    {:else}
      <div>
        {#each workbook.SheetNames as name, idx}
          <label><input type="radio" bind:group={sheetIdx} value={idx}> {name}</label>
        {/each}
      </div>
      <div id="table" class="content single">
        {#if table}
          <table class="content">
            {#each table as row}
              <tr>
                {#each row as item}<td>{item}</td>{/each}
              </tr>
            {/each}
          </table>
        {:else}
          Couldn't get a table from the file.
        {/if}
      </div>
    {/if}
  {:else}
    I don't know how to parse this file, please try another.
  {/if}
</div>

<style>
  #preview {
    display: grid;
    grid-auto-flow: column;
    grid-template-columns: 50% 50%;
    grid-template-rows: max-content minmax(2em, 10em);
    grid-gap: 5px;
  }
  .content.single {
    max-height: 10em;
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
  #file {
    white-space: pre;
    padding: 2px 7px;
  }
  #table {
    padding: 5px;
  }
  td {
    background-color: #ddd;
    padding: 2px 7px;
  }
</style>
