<script lang="ts">
  import rpc from '../rpc'
  import Create from './Create.svelte'
  import Challenges from './Challenges.svelte'

  let gh_access_token = localStorage.getItem('gh_access_token')

  let tw_access_token = localStorage.getItem('tw_access_token')
  let tw_access_token_secret = localStorage.getItem('tw_access_token_secret')
  let tw_access_token_verifier = localStorage.getItem(
    'tw_access_token_verifier'
  )

  const send_tokens = () => {
    // i give up (for now...)
    localStorage.removeItem('tw_access_token')
    localStorage.removeItem('tw_access_token_secret')
    localStorage.removeItem('tw_access_token_verifier')

    return [
      rpc.set_gh_access_token(gh_access_token!),
      rpc.set_tw_access_tokens(
        tw_access_token!,
        tw_access_token_secret!,
        tw_access_token_verifier!
      ),
    ]
  }

  let active: 'none' | 'judge' | 'create' = 'none'
</script>

{#if gh_access_token}
  {#if tw_access_token && tw_access_token_secret}
    {#await Promise.all(send_tokens()) then _}
      {#if active == 'none'}
        <button on:click={() => (active = 'judge')}>Judge</button>
        <button on:click={() => (active = 'create')}>Create</button>
      {:else if active == 'judge'}
        <Challenges />
      {:else}
        <Create />
      {/if}
    {/await}
  {:else}
    <a href="/auth/twitter">grant twitter access</a>
  {/if}
{:else}
  <a href="/auth/github">grant github access</a>
{/if}
