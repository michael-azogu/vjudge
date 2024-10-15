import { nth } from './../src/lib/challenge-template.js'
import { App } from 'octokit'
import linkit from 'linkify-it'
import { log } from 'node:console'
import { tw_client } from './tw.js'
import type { links, submission, summary } from '../types.js'
import { deploy_hosts, source_hosts, video_exts, video_hosts } from './hosts.js'

import {
  ORG,
  GITHUB_APP_ID,
  GITHUB_APP_PK,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  TWITTER_APP_ID,
  TWITTER_CONSUMER_KEY,
  TWITTER_CONSUMER_SECRET,
} from './env.js'
import {
  ApiResponseError,
  SendTweetV2Params,
  TwitterApi,
  TwitterApiReadWrite,
} from 'twitter-api-v2'
import { download, download_from_youtube } from './video.js'
import { readFileSync } from 'node:fs'
import { fileTypeFromBuffer } from 'file-type'

let gh: App['octokit']
let gh_access_token = ''

let tw: TwitterApiReadWrite
let tw_access_token = ''
let tw_access_token_secret = ''
let tw_access_token_verifier = ''

//https://github.com/organizations/Algorithm-Arena-Test/settings/member_privileges?enable_tip=#base-permissions

const pause = (ms: number) => new Promise((f) => setTimeout(f, ms))

export default {
  set_gh_access_token: async (token: string) => {
    if (gh_access_token) return

    gh_access_token = token
    const app = new App({
      userAgent: 'vjudge',
      auth: gh_access_token,
      appId: GITHUB_APP_ID,
      privateKey: GITHUB_APP_PK,
      oauth: {
        clientId: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
      },
    })

    const install = await app.octokit.rest.apps.getOrgInstallation({ org: ORG })

    gh = await app.getInstallationOctokit(install.data.id)

    log('permissions', install.data.permissions)
    log(`github access-token set to ${gh_access_token}`)
  },

  set_tw_access_tokens: async (
    token: string,
    secret: string,
    verifier: string
  ) => {
    try {
      if (
        tw_access_token &&
        tw_access_token_secret &&
        tw_access_token_verifier
      ) {
        return
      }

      tw_access_token = token
      tw_access_token_secret = secret
      tw_access_token_verifier = verifier

      tw_client.$ = new TwitterApi({
        appKey: TWITTER_CONSUMER_KEY,
        appSecret: TWITTER_CONSUMER_SECRET,
        accessToken: tw_access_token,
        accessSecret: tw_access_token_secret,
      })

      tw = (await tw_client.$.login(tw_access_token_verifier)).client.readWrite

      log(`twitter access-token set to ${tw_access_token}`)
      log(`twitter access-token-secret set to ${tw_access_token_secret}`)
      log(`twitter access-token-verifier set to ${tw_access_token_verifier}`)
    } catch (error) {
      console.error((error as ApiResponseError).message)
    }
  },

  get_org_name: () => ORG,

  get_new_entry_no: async () => {
    const { data } = await gh.rest.repos.listForOrg({
      org: ORG,
      per_page: 500,
    })

    return (
      data
        .filter((repo) => repo.name.startsWith('weekly-challenge'))
        .map((repo) => +repo.name.match(/\d+/)![0])
        .sort((a, b) => b - a)[0] + 1
    )
  },

  post_final_verdict: async (
    repo: string,
    updated_readme: string,
    tweet_data: {
      given_tweet_to_quote?: string
      closing_remarks: string
      tweet_footer: string
      verdicts: { blurb: string; media_urls: string[] }[]
    }
  ) => {
    log('getting ready to update readme with verdict')
    const readme_blob = await gh.rest.repos.getReadme({
      owner: ORG,
      repo,
    })
    await gh.rest.repos.createOrUpdateFileContents({
      sha: readme_blob.data.sha,
      owner: ORG,
      repo,
      path: 'README.md',
      message: 'instructions',
      content: Buffer.from(updated_readme).toString('base64'),
    })
    log('readme updated')

    // TODO return gh readmeurl to check if success

    const user_id = (await tw.v2.me()).data.id

    // 3wks ago for leeway
    const three_weeks_ago = new Date()
    three_weeks_ago.setDate(three_weeks_ago.getDate() - 7 * 3)

    const { tweets } = await tw.v2.search(repo, {
      start_time: three_weeks_ago.toISOString(),
      sort_order: 'recency',
      max_results: 30,
      expansions: 'in_reply_to_user_id',
    })
    // the least recent match
    tweets.map((f) => {
      f.id
      f.in_reply_to_user_id
    })

    let original_tweet_url

    log('getting ready to tweet')
    const thread: SendTweetV2Params[] = await Promise.all(
      tweet_data.verdicts.map(async (v, i) => {
        const downloaded_media_paths = v.media_urls
          .map((url, j) => {
            const path = `video-0${j + 1}-for-${nth[i]})}`
            try {
              url.includes('youtube') || url.includes('youtu.be')
                ? download_from_youtube(url, path)
                : download(url, path)
              return path
            } catch {
              return ''
            }
          })
          .filter(Boolean)

        let media_ids = (await Promise.all(
          downloaded_media_paths.slice(0, 4).map(async (path) => {
            const file = readFileSync(path)
            return tw.v1.uploadMedia(file, {
              mimeType: (await fileTypeFromBuffer(file))?.mime || '',
              // longVideo: file.byteLength > 12 * 1024 * 1024,
            })
          })
        )) as NonNullable<SendTweetV2Params['media']>['media_ids']

        return {
          text: v.blurb,
          media: { media_ids },
        }
      })
    )

    const twurl = `https://twitter.com/${
      (await tw.v2.me()).data.username
    }/status/${(await tw.v2.tweetThread(thread))[0].data.id}`

    log('tweet completed')

    // the toplevel tweet whose first subtweet contains a link to a weekly-challenge-$
    // let this_weeks_challenge =
    // if any, is ^ but challenge number is +1 of currently judged
    // const { data } = await gh.rest.repos.listForOrg({
    //   org: ORG,
    //   per_page: 500,
    // })

    // return (
    //   data
    //     .filter((repo) => repo.name.startsWith('weekly-challenge'))
    //     .map((repo) => +repo.name.match(/\d+/)![0])
    //     .sort((a, b) => b - a)[0] + 1
    // )
  },

  tweet_new_challenge: async (
    tweets: [
      {
        text: string
        thumbnail: string
      },
      {
        text: string
        repo_link: string
      }
    ]
  ) => {
    const [{ text: header, thumbnail }, { text: footer, repo_link }] = tweets

    const thumbnail_id = await tw.v1.uploadMedia(
      Buffer.from(thumbnail, 'base64'),
      {
        mimeType: 'image/jpeg',
      }
    )

    const thread: SendTweetV2Params[] = [
      {
        text: header,
        media: { media_ids: [thumbnail_id] },
      },
      {
        text: footer + ' ' + repo_link,
      },
    ]

    return `https://twitter.com/${(await tw.v2.me()).data.username}/status/${
      (await tw.v2.tweetThread(thread))[0].data.id
    }`
  },

  get_challenge: async (repo_name: string) => {
    const readme = await gh.rest.repos.getReadme({
      owner: ORG,
      repo: repo_name,
    })

    // const description =
    const content = Buffer.from(readme.data.content, 'base64').toString('utf-8')

    // TODO fix technique
    // const deadline = parse_deadline(content)

    const prizes = [
      ...content
        .match(/Prizes:\s*([\s\S]*?)(?=\n###|$)/)![1]
        .matchAll(/\*\s.*:\s*\$(\d+)/g),
    ].map((match) => parseInt(match[1], 10))

    const thumbnail_url = [
      ...content.matchAll(/<img\s[^>]*src=['"]([^'"]+)['"][^>]*>/g),
    ].at(-1)![1]

    function parse_deadline(readme: string) {
      const raw = readme.match(/\b[A-Za-z]+\s+[A-Za-z]+\s+\d{1,2}/)![0]
      const date = new Date(`${raw} ${new Date().getFullYear()}`)
      // Adjust to PST from UTC
      date.setHours(date.getHours() + 24)
      return date
    }

    function parse_title(title: string) {
      const match = title.match(/^submission\s*-\s*(.*)/i)
      return match ? match[1].trim() : title
    }

    function parse_mentions(input: string) {
      const mentions = []
      let match
      const regex = /@([a-z0-9-_]+)/g
      while ((match = regex.exec(input)) !== null) {
        mentions.push('@' + match[1])
      }
      return mentions
    }

    function belongs(url: string, substrings: string[]) {
      return substrings.some((substring) => url.includes(substring))
    }

    // filter out erronous submissions
    const issues = await gh.rest.issues.listForRepo({
      owner: ORG,
      repo: repo_name,
      state: 'all',
      sort: 'updated',
    })

    const submissions: Array<submission> = await Promise.all(
      issues.data.map<Promise<submission>>(async (issue) => {
        const issue_body = !!issue.body ? issue.body : ''

        const {
          data: { twitter_username },
        } = await gh.rest.users.getByUsername({ username: issue.user!.login })

        const link_parse = new linkit()

        const links: links = {
          others: [],
          videos: [],
          sources: [],
          deploys: [],
        }

        // keep link to ghrepo under the issue creators uname
        // cant be sure gh asset is video or img
        ;(link_parse.match(issue_body) || []).map(({ url }) => {
          if (
            belongs(url, video_hosts) ||
            video_exts.some((ext) => url.endsWith(`.${ext}`))
          ) {
            links.videos.push({ url, include: false })
          } else if (belongs(url, source_hosts)) {
            links.sources.push(url)
          } else if (belongs(url, deploy_hosts)) {
            links.deploys.push(url)
          } else {
            links.others.push(url)
          }
        })
        // ! fallbacks
        /**
         * source(s) | decide if there was one & input it
         * video/image(s) | find it & upload manual
         * mentions (possible collaboration) | hitl
         *
         * select which (if many) to use in post & update (then start download)
         */

        const submission_date = new Date(issue.created_at)
        // new Date(issue.updated_at)
        // const late = submission_date > deadline

        return {
          uid: issue.number,
          title: parse_title(issue.title),
          email: issue.user!.email,
          github_username: issue.user!.login,
          twitter_username,
          // make it a rule to upload the demo video to the gh issue & only one video
          links,
          mentions: parse_mentions(issue_body),
          issue_url: issue.html_url,
          issue_body: issue_body,
          // late,
          blurb: '',
        } as submission
      })
    )

    return {
      details: {
        // description,
        readme: content,
        prizes,
        thumbnail_url,
        // deadline: deadline.toUTCString(),
      },
      submissions,
    }
  },

  get_challenges: async () => {
    const { data } = await gh.rest.repos.listForOrg({
      org: ORG,
      per_page: 500,
    })

    const sub_counts: Array<number> = []
    {
      // for (const {name} of data) {
      //   const { headers } = await gh.rest.issues.listForRepo({
      //     owner: org,
      //     repo: name,
      //     state: 'all',
      //     page: 1,
      //     per_page: 1,
      //   })
      //   const total = parseInt(headers['x-total-count'], 10)
      // }
    }

    return data
      .filter((repo) => repo.name.startsWith('weekly-challenge'))
      .map((repo) => {
        function extract_name(name: string) {
          const match = name.match(/\d+-/)!
          return name.slice(match.index! + match[0].length)
        }
        return {
          repo_name: repo.name,
          created_at: repo.created_at!,
          title: extract_name(repo.name),
          entry_no: +repo.name.match(/\d+/)![0],
        } as summary
      })
      .sort((a, b) => b.entry_no - a.entry_no)
  },

  create_challenge_repo: async (
    title: string,
    readme: string,
    image: string
  ) => {
    const {
      data: { html_url },
    } = await gh.rest.repos.createInOrg({
      org: ORG,
      name: title,
      auto_init: true,
      visibility: 'public',
    })

    await pause(2000)

    await gh.rest.repos.createOrUpdateFileContents({
      owner: ORG,
      repo: title,
      path: 'thumbnail',
      message: 'uploading thumbnail for readme',
      content: image,
    })

    const readme_blob = await gh.rest.repos.getReadme({
      owner: ORG,
      repo: title,
    })

    await gh.rest.repos.createOrUpdateFileContents({
      sha: readme_blob.data.sha,
      owner: ORG,
      repo: title,
      path: 'README.md',
      message: 'instructions',
      content: Buffer.from(readme).toString('base64'),
    })

    return html_url
  },
}
