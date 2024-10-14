import { format, isAfter } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const timezone = 'America/Los_Angeles'

function formatted_date(date: Date) {
  const zoned = toZonedTime(date, timezone)
  return format(zoned, 'EEEE MMMM dd')
}

function next_sunday() {
  const today = new Date()
  const day = today.getDay()
  const days_til_next_sunday = day === 0 ? 7 : 7 - day

  const next_sunday_date = new Date(today)
  next_sunday_date.setDate(today.getDate() + days_til_next_sunday)

  const d = next_sunday_date.getDate()
  const suffix =
    d % 10 === 1 && d !== 11
      ? 'st'
      : d % 10 === 2 && d !== 12
      ? 'nd'
      : d % 10 === 3 && day !== 13
      ? 'rd'
      : 'th'

  return (
    next_sunday_date
      .toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
      .replace(',', '') + suffix
  )
}

const nth = ['Winner', '2nd', '3rd', '4th', '5th']

const place = ['The winner'].concat(
  ['second', 'third', 'fourth', 'fifth'].map((p) => `In ${p} place`)
)

export type winner = {
  /** hitl */
  title: string
  github_username: string
  twitter_username?: string
  blurb: string
  issue_url: string
  /** image or video or deploy link */
  demo_urls: string[]
}

const winner_string = (winners: winner[], prizes: number[]) =>
  winners
    .map(
      (winner, i) =>
        `* ${place[i]} for ${prizes[i]} is @${winner.github_username}! with ${
          winner.title
        }! ${winner.blurb} ${winner.issue_url}\n${winner.demo_urls.join('\n')}`
    )
    .join('\n\n')

export const judged_readme = (
  readme: string,
  winners: winner[],
  prizes: number[]
) =>
  readme.replace(
    /(###\s*Prizes:)/,
    `\n$### Winners:\n\n${winner_string(winners, prizes)}\n\n$1`
  )

export const preview_readme_image = (readme: string, url: string) =>
  readme.replace(/(<img[^>]*\bsrc=")[^"]*"/, `$1data:image/jpeg;base64,${url}"`)

export const challenge_readme = (
  entry_no: number,
  title: string,
  gh_title: string,
  summary: string,
  description: string,
  org: string,
  prizes: number[]
) => {
  return `# Weekly Challenge #${entry_no} - ${title
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')}

**${summary}.** ${description}

<img alt="image" src="https://github.com/${org}/${gh_title}/blob/main/thumbnail">


### Prizes:
${prizes.map((prize, i) => `* ${nth[i]}: $${prize}`).join('\n')}

### Rules:
* The winners will be evaluated based on how creative and interesting the solution is. @vjeux has full discretion on how the winners are selected.
* Multiple people can work on a single submission. If it wins, the reward will be split based on the team preferences.
* If a winner doesn't want to take the money, it'll be reinjected in the next week prize pool.
* The solution must be open sourced.
* There are no restrictions in terms of tech stack.

### How to submit a solution:
* Deadline to submit is ${next_sunday()} evening at Midnight PST (US West Coast).
* Open an issue on this repo titled "Submission - &lt;Name of your submission&gt;"
* It must contain a short video showing the submission in action
* It must contain an explanation on how to try it
* It must contain a link with the source code
`
}
