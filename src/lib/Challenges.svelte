<script lang="ts">
  import { onMount } from 'svelte'

  import rpc from '../rpc'
  import type { summary } from '../../types'
  import Judge from './Judge.svelte'

  let selected: summary
  let challenges: Array<summary> = []

  onMount(async () => {
    challenges = await rpc.get_challenges()
  })
</script>

{#if !selected}
  {#each challenges as challenge}
    <div
      class="list-item"
      on:click={() => (selected = challenge)}
    >
      {challenge.entry_no} - {challenge.title}
    </div>
  {/each}
{:else}
  {#await rpc.get_challenge(selected.repo_name) then challenge}
    <Judge
      {challenge}
      repo={selected.repo_name}
    />
  {/await}
{/if}

<style>
  .list-item {
    padding: 10px;
    outline: 1px blue solid;
  }
  .list-item:hover {
    background-color: #fff;
  }
</style>
