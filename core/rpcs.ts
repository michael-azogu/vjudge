import { App } from 'octokit'
import linkit from 'linkify-it'
import { log } from 'node:console'
import { tw_client } from './tw.js'
import type { summary } from '../types.js'
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

  get_challenge: async (repo_name: string) => {
    const readme = await gh.rest.repos.getReadme({
      owner: ORG,
      repo: repo_name,
    })

    // const description =
    const content = Buffer.from(readme.data.content, 'base64').toString('utf-8')

    // TODO fix technique
    const deadline = parse_deadline(content)

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

    type links = {
      others: string[]
      videos: string[]
      sources: string[]
      deploys: string[]
    }

    type submission = {
      uid: number
      title: string
      email?: string
      github_username: string
      twitter_username?: string
      links: links
      mentions: string[]
      issue_url: string
      issue_body: string
      late: boolean
    }

    const submissions: Array<submission> = await Promise.all(
      issues.data.map<Promise<submission>>(async (issue) => {
        const {
          data: { twitter_username },
        } = await gh.rest.users.getByUsername({ username: issue.user!.login })

        const link_parse = new linkit()

        const links: links = {
          sources: [],
          videos: [],
          deploys: [],
          others: [],
        }

        // cant be sure gh asset is video or img
        ;(link_parse.match(issue.body!) || []).map(({ url }) => {
          if (
            belongs(url, video_hosts) ||
            video_exts.some((ext) => url.endsWith(`.${ext}`))
          ) {
            links.videos.push(url)
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

        new Date(issue.updated_at)
        const submission_date = new Date(issue.created_at)
        const late = submission_date > deadline

        return {
          uid: issue.number,
          title: parse_title(issue.title),
          email: issue.user!.email,
          github_username: issue.user!.login,
          twitter_username,
          links,
          mentions: parse_mentions(issue.body!),
          issue_url: issue.html_url,
          issue_body: issue.body,
          late,
        } as submission
      })
    )

    return {
      details: {
        // description,
        prizes,
        thumbnail_url,
        deadline: deadline.toUTCString(),
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
}
