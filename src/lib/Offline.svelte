<script>
  import { onMount } from 'svelte'

  let isOnline = navigator.onLine

  const updateOnlineStatus = () => {
    isOnline = navigator.onLine
  }

  onMount(() => {
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  })
</script>

<div class="status {isOnline ? 'online' : 'offline'}">
  {#if isOnline}
    🌐 You are online
  {:else}
    ⚠️ You are offline
  {/if}
</div>

<style>
  .status {
    font-size: 1.2em;
    border-radius: 8px;
    text-align: center;
    width: 200px;
    /* absolute position: ; */
  }
  .online {
    background-color: #a8f0a8;
    color: #2d662d;
  }
  .offline {
    background-color: #f0a8a8;
    color: #662d2d;
  }
</style>
