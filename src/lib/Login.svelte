<script lang="ts">
  import rpc from '../rpc'
  import Judge from './Judge.svelte'

  let gh_access_token = localStorage.getItem('gh_access_token')

  let tw_access_token = localStorage.getItem('tw_access_token')
  let tw_access_token_secret = localStorage.getItem('tw_access_token_secret')

  const send_tokens = () => [
    rpc.set_gh_access_token(gh_access_token!),
    rpc.set_tw_access_tokens(tw_access_token!, tw_access_token_secret!),
  ]
</script>

{#if gh_access_token}
  {#if tw_access_token && tw_access_token_secret}
    {#await Promise.all(send_tokens()) then _}
      <Judge />
    {/await}
  {:else}
    <a href="/auth/twitter">grant twitter access</a>
  {/if}
{:else}
  <a href="/auth/github">grant github access</a>
{/if}
