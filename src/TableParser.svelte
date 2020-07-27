<script lang="ts">
  import type {transaction} from './generationDSL';

  export let table: string[][];
  export let source: string;
  export let transactions: transaction[] | undefined = undefined;
</script>
