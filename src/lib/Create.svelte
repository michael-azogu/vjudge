<script lang="ts">
  import rpc from '../rpc'
  import { onMount } from 'svelte'

  import { marked } from 'marked'
  import DOMPurify from 'dompurify'

  import {
    challenge_readme,
    preview_readme_image,
  } from './challenge-template'

  let loading = true

  let org: string
  let entry_no: number
  let title = ''
  let summary = ['For this challenge, ', 'Your goal for this challenge is to '][
    Math.floor(Math.random() * 2)
  ]

  let description = ''
  let image: string // TODO allow multiple images
  let prizes = [150, 100, 50]

  let repo_url = ''
  let tweet_url = ''
  let tweet_footer = 'Check out the full rules and how to submit:\n'

  $: gh_title = `weekly-challenge-${entry_no}-${title
    .trim()
    .split(' ')
    .map((word) => word.toLowerCase())
    .join('-')}`

  $: readme = challenge_readme(
    entry_no,
    title,
    gh_title,
    summary,
    description,
    org,
    prizes
  )

  function handle_image(e: Event) {
    const target = e.target as HTMLInputElement
    if (!(target.files && target.files.length > 0)) return

    let file: File
    file = target.files[0]
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.readAsDataURL(file!)
    reader.onload = async () => {
      const base64Content = reader.result as string
      image = base64Content.split(',')[1]
    }
  }

  onMount(async () => {
    org = await rpc.get_org_name()
    entry_no = await rpc.get_new_entry_no()
    loading = false
  })
</script>

{#if !loading}
  <!-- only allow [Aa-Zz][0-9][-] -->
  repo name: {gh_title}
  <input
    type="text"
    bind:value={title}
  />

  summary:
  <input
    type="text"
    bind:value={summary}
  />

  description:
  <textarea bind:value={description} />

  <br />
  <!-- make sure each is lower/equal prize to the last -->
  1st prize:
  <input
    type="number"
    on:change={(e) => (prizes = [+e.currentTarget.value, ...prizes.slice(1)])}
  />
  2nd prize:
  <input
    type="number"
    on:change={(e) =>
      (prizes = [prizes[0], +e.currentTarget.value, ...prizes.slice(2)])}
  />
  3rd prize:
  <input
    type="number"
    on:change={(e) =>
      (prizes = [...prizes.slice(0, 2), +e.currentTarget.value])}
  />

  <input
    type="file"
    on:change={handle_image}
  />

  twitter post footer:
  <textarea bind:value={tweet_footer} />

  <button
    disabled={!image}
    on:click={async () => {
      repo_url = await rpc.create_challenge_repo(gh_title, readme, image)

      tweet_url = await rpc.tweet_new_challenge([
        { text: description, thumbnail: image },
        {
          text: tweet_footer,
          repo_link: `https://github.com/${org}/${gh_title}`,
        },
      ])

      window.open(repo_url)
      window.open(tweet_url)
    }}>create repo & post challenge</button
  >

  {#if repo_url}
    <a href={repo_url}>see repo</a>
  {/if}
  {#if tweet_url}
    <a href={tweet_url}>see tweet</a>
  {/if}

  <!-- at the side scrolling -->
  {#await marked(preview_readme_image(readme, image)) then md}
    {@html DOMPurify.sanitize(md)}
  {/await}
{/if}
