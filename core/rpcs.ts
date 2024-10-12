import { Octokit } from 'octokit'
import linkit from 'linkify-it'
import { log } from 'node:console'
import { twitter_client } from './tw.js'
import type { RepoSummary, ReturnType } from '../types.js'
import { deploy_hosts, source_hosts, video_exts, video_hosts } from './hosts.js'

let gh: Octokit
let gh_access_token = ''

let tw: ReturnType<typeof twitter_client>
let tw_access_token = ''
let tw_access_token_secret = ''

const org = 'Algorithm-Arena-Test'

export default {
  set_gh_access_token: async (token: string) => {
    gh_access_token = token
    gh = new Octokit({
      auth: gh_access_token,
      userAgent: 'vjudge',
    })
    log(`github access-token set to ${gh_access_token}`)
  },

  set_tw_access_tokens: (token: string, secret: string) => {
    tw_access_token = token
    tw_access_token_secret = secret
    tw = twitter_client(token, secret)
    log(`twitter access-token set to ${tw_access_token}`)
    log(`twitter access-token-secret set to ${tw_access_token_secret}`)
  },

  get_user_twitter: async () => {
    const { data } = await gh.rest.users.getByUsername({
      username: 'michael-azogu',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    return data.twitter_username
  },

  create_challenge_repo: async (title: string) => {
    const { data } = await gh.rest.repos.createInOrg({
      org,
      name: title,
      auto_init: true,
      visibility: 'public',
    })
    return data.id
  },

  get_challenge: async (repo_name: string) => {
    const readme = await gh.rest.repos.getReadme({
      owner: org,
      repo: repo_name,
    })
    readme.data.content
    readme.data.path
    readme.data.target
    /**
     * parse
     * - desc
     * - prizes
     * - thumbnail
     */

    const issues = await gh.rest.issues.listForRepo({
      owner: org,
      repo: repo_name,
      state: 'all',
      sort: 'updated',
    })

    // iframe the issue
    Promise.all(
      issues.data.map(async (issue) => {
        issue.user!.login
        issue.user!.name

        issue.user!.email
        const {
          data: { twitter_username },
        } = await gh.rest.users.getByUsername({
          username: issue.user!.login,
        })

        const belongs = (url: string, substrings: string[]) =>
          substrings.some((substring) => url.includes(substring))

        const link_parse = new linkit()

        const buckets: {
          others: string[]
          videos: string[]
          sources: string[]
          deploys: string[]
        } = { sources: [], videos: [], deploys: [], others: [] }

        // cant be sure gh asset is video or img
        ;(link_parse.match(issue.body!) || []).map(({ url }) => {
          if (belongs(url, source_hosts)) {
            buckets.sources.push(url)
          } else if (
            belongs(url, video_hosts) ||
            video_exts.some((ext) => url.endsWith(`.${ext}`))
          ) {
            buckets.videos.push(url)
          } else if (belongs(url, deploy_hosts)) {
            buckets.deploys.push(url)
          } else {
            buckets.others.push(url)
          }
        })

        issue.body // parse + send raw
        // ! fallbacks
        /**
         * source(s) | decide if there was one & input it
         * video/image(s) | find it & upload manual
         * mentions (possible collaboration) | hitl
         *
         * select which (if many) to use in post & update (then start download)
         */

        const late = true
        new Date(issue.created_at)
        new Date(issue.updated_at)

        issue.title // Submission -
        issue.number // #3
        issue.url

        // ({})
      })
    )
  },

  get_challenges: async () => {
    const { data } = await gh.rest.repos.listForOrg({
      org,
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
        } as RepoSummary
      })
  },
}

// async function uploadVideo(filePath: string) {
//   const mediaType = 'video/mp4' // Adjust as necessary
//   const mediaData = fs.readFileSync(filePath)
//   const mediaSize = mediaData.length

//   // Step 1: INIT media upload
//   const initResponse = await twitter().post('media/upload', {
//     command: 'INIT',
//     total_bytes: mediaSize,
//     media_type: mediaType,
//     media_category: 'tweet_video',
//   })

//   const mediaId = initResponse.media_id_string

//   // Step 2: APPEND media upload in chunks (adjust chunk size as necessary)
//   const chunkSize = 1024 * 1024 // 1 MB
//   for (let i = 0; i < mediaSize; i += chunkSize) {
//     const chunk = mediaData.slice(i, i + chunkSize)
//     await twitter().post('media/upload', {
//       command: 'APPEND',
//       media_id: mediaId,
//       media: chunk.toString('base64'),
//       segment_index: Math.floor(i / chunkSize),
//     })
//   }

//   // Step 3: FINALIZE media upload
//   await twitter().post('media/upload', {
//     command: 'FINALIZE',
//     media_id: mediaId,
//   })

//   return mediaId
// }

// async function tweetWithVideo(filePath: string) {
//   const mediaId = await uploadVideo(filePath)

//   // Step 5: Post the tweet with the uploaded video
//   const status = await twitter().post('statuses/update', {
//     status: 'Check out this cool video!',
//     media_ids: mediaId,
//   })

//   console.log('Tweet posted:', status)
// }
