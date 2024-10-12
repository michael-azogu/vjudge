<script lang="ts">
  import { onMount } from 'svelte'

  import rpc from '../rpc'
  import type { RepoSummary } from '../../types'

  let selected: RepoSummary
  let repos: Array<RepoSummary> = []

  onMount(async () => {
    repos = (await rpc.get_challenges()).sort((a, b) => a.entry_no - b.entry_no)
  })
</script>

<!-- ! HITL -->

{#if !selected}
  {#each repos as repo}
    <div
      class="list-item"
      on:click={() => (selected = repo)}
    >
      {repo.entry_no} - {repo.title}
    </div>
  {/each}
{:else}
  {#await rpc.get_challenge(selected.repo_name) then v}
    <!-- if parsed deadline >7 -->
  {/await}
{/if}

<!-- title (restrict) show hyphenated final version -->

<style>
  .list-item {
    outline: 1px blue solid;
    padding: 10px;
  }
</style>
