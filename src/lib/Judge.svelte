<script lang="ts">
  import rpc from '../rpc'
  import { judged_readme, type winner } from './challenge-template'
  import type { ReturnType, UnwrapPromise } from '../../types'

  export let challenge: UnwrapPromise<ReturnType<typeof rpc.get_challenge>>
  /**
   *
   */
  const tweet_footer = "If that was fun for you, try this week's challenge!"

  // iframe the issue

  let closing_remarks = '🧵'
  // TODO fuzzy compare readme desc to tweet content
  let original_tweet_url
  // the toplevel tweet whose first subtweet contains a link to a weekly-challenge-$
  let this_weeks_challenge
  // if any, is ^ but challenge number is +1 of currently judged

  let winners: winner[] = []

  // $: updated_readme = judged_readme(readme, winners, prizes)
</script>

<!-- ! HITL -->
