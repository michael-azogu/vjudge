<script lang="ts">
  import rpc from '../rpc'
  import { judged_readme, verdict_string_list } from './challenge-template'
  import type { links, ReturnType, UnwrapPromise } from '../../types'
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

  // allow giving less number of winners but atleast one
  // but cant pick less & talk about honorable mentions
  $: winners = submissions.slice(0, prizes.length)
  $: honorables = submissions.filter((_, i) => honorable_indexes.includes(i))

  const include = (l: links) =>
    Object.values(l)
      .flat()
      .filter((s) => s.include)

  $: chosen = winners
    .map((w) => ({
      blurb: w.blurb,
      title: w.title,
      // multiple people ?
      github_username: w.github_username,
      twitter_username: w.twitter_username,
      issue_url: w.issue_url,
      demo_urls: include(w.links).map(({ url }) => url),
    }))
    .concat(
      honorables.map((h) => ({
        blurb: h.blurb,
        github_username: h.github_username,
        title: h.title,
        issue_url: h.issue_url,
        twitter_username: h.twitter_username,
        demo_urls: include(h.links).map(({ url }) => url),
      }))
    )

  function handle_honorable(i: number, checked: boolean) {
    honorable_indexes = checked
      ? [...honorable_indexes, i]
      : honorable_indexes.filter((index) => index !== i)
  }

  $: updated_readme = judged_readme(
    challenge.details.readme,
    chosen,
    challenge.details.prizes
  )

  let closing_remarks = '🧵'
  let tweet_footer = "If that was fun for you, try this week's challenge! (paste url)"
  let original_tweet_link = 'https://twitter.com/{user}/{status}/{id}'
</script>

<!-- throttle -->
<button
  on:click={() =>
    rpc.post_final_verdict(repo, updated_readme, {
      tweet_footer,
      closing_remarks,
      given_tweet_to_quote: original_tweet_link,
      // prefer create new week challenge before judging last one
      verdicts: verdict_string_list(chosen, prizes, true).map((blurb, i) => ({
        blurb,
        // cant have more than four prefer just one
        media_urls: submissions[i].links.videos
          .filter(({ include }) => include)
          .map(({ url }) => url),
      })),
    })}
>
  Post Verdict</button
>
<br />

{#each submissions as submission, i}
  <input
    type="text"
    bind:value={submission.title}
  />
  <!-- intl conject ,and mentions -->
  by @{submission.github_username}
  <b>issue<a href={submission.issue_url}>#{submission.uid}</a></b>
  <textarea bind:value={submission.blurb}></textarea>

  {#each Object.values(submission.links).flat() as url}
    <input
      type="checkbox"
      bind:checked={url.include}
    /><a href={url.url}>{url.url.replaceAll(/https?:\/\/(www\.)?/g, '')}</a>
    <br />
  {/each}

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

original tweet link
<a
  href="https://x.com/search?q=(from%3AVjeux)%20filter%3Areplies%20%22github.com%22&src=typed_query&f=live"
  >search here</a
>
<input
  type="text"
  bind:value={original_tweet_link}
/>
<br />
closing
<textarea bind:value={closing_remarks}></textarea>
<br />
tweet footer
<textarea bind:value={tweet_footer}></textarea>

<!-- ! only show winner section string -->
<!-- TODO switch to remark-gfm -->
{#await marked(updated_readme) then md}
  {@html DOMPurify.sanitize(md)}
{/await}
