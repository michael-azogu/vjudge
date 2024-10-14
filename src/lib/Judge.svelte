<script lang="ts">
  import rpc from '../rpc'
  import { judged_readme, nth, type winner } from './challenge-template'
  import type { ReturnType, submission, UnwrapPromise } from '../../types'
  import { marked } from 'marked'
  import DOMPurify from 'dompurify'

  export let repo: string
  export let challenge: UnwrapPromise<ReturnType<typeof rpc.get_challenge>>

  const prizes = challenge.details.prizes
  let submissions = challenge.submissions

  let honorable_indexes: number[] = []

  function move(i: number, dir: 'L' | 'R') {
    if (i < 0 || i >= submissions.length) return submissions
    const new_index = dir == 'R' ? i + 1 : i - 1
    if (new_index < 0 || new_index >= submissions.length) return submissions
    submissions = submissions.map((item, index) =>
      index === i
        ? submissions[new_index]
        : index === new_index
          ? submissions[i]
          : item
    )
  }

  $: winners = submissions.slice(0, prizes.length)
  $: honorables = submissions.filter((_, i) => honorable_indexes.includes(i))

  function handle_honorable(i: number, checked: boolean) {
    honorable_indexes = checked
      ? [...honorable_indexes, i]
      : honorable_indexes.filter((index) => index !== i)
  }

  $: updated_readme = judged_readme(
    challenge.details.readme,
    winners
      .map((w) => ({
        blurb: w.blurb,
        title: w.title,
        // multiple people ?
        github_username: w.github_username,
        twitter_username: w.twitter_username,
        issue_url: w.issue_url,
        demo_urls: w.links.videos.concat(w.links.deploys),
      }))
      .concat(
        honorables.map((h) => ({
          blurb: h.blurb,
          github_username: h.github_username,
          title: h.title,
          issue_url: h.issue_url,
          twitter_username: h.twitter_username,
          demo_urls: h.links.videos.concat(h.links.deploys),
        }))
      ),
    challenge.details.prizes
  )

  const tweet_footer = "If that was fun for you, try this week's challenge!"

  // iframe the issue

  let closing_remarks = '🧵'
  // TODO fuzzy compare readme desc to tweet content
  let original_tweet_url
  // the toplevel tweet whose first subtweet contains a link to a weekly-challenge-$
  let this_weeks_challenge
  // if any, is ^ but challenge number is +1 of currently judged
</script>

<button on:click={() => rpc.post_final_verdict(repo, updated_readme)}>
  Post Verdict</button
>

{#each submissions as submission, i}
  <input
    type="text"
    bind:value={submission.title}
  />
  <!-- intl conject ,and mentions -->
  by @{submission.github_username} issue<a href={submission.issue_url}
    >#{submission.uid}</a
  >
  <textarea bind:value={submission.blurb}></textarea>

  {#if i >= prizes.length}
    <input
      type="checkbox"
      on:change={(e) => handle_honorable(i, e.currentTarget.checked)}
    />
  {/if}

  {#if i != 0}
    <button on:click={() => move(i, 'L')}>^</button>
  {/if}
  {#if i != submissions.length - 1}
    <button on:click={() => move(i, 'R')}>v</button>
  {/if}

  <br />
{/each}

<br />
<!-- ! only show winner section string -->
<!-- TODO switch to remark-gfm -->
{#await marked(updated_readme) then md}
  {@html DOMPurify.sanitize(md)}
{/await}
