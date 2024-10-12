
import { format, isAfter } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const timezone = 'America/Los_Angeles'

function createPSTDateString(date: Date) {
  const zonedDate = toZonedTime(date, timezone) // Convert to PST
  return format(zonedDate, 'yyyy-MM-dd HH:mm:ssXXX')
}

// Function to parse a PST date string
function parsePSTDateString(date_string: string) {
  return fromZonedTime(date_string, timezone) // Parse and convert to UTC
}

const pstDateStr = createPSTDateString(new Date())
const parsedDate = parsePSTDateString(pstDateStr)
const isCurrentAfter = isAfter(new Date(), parsedDate)

function formatted_date(date: Date) {
  const zoned = toZonedTime(date, timezone)
  return format(zoned, 'EEEE MMMM dd')
}

const nth = ['Winner', '2nd', '3rd', '4th', '5th']
const place = ['first', 'second', 'third', 'fourth', 'fifth']

export const judged_readme = (readme: string, winners: string[]) => ''

export const challenge_readme = (
  entry_no: number,
  title: string,
  /** For this challenge, */
  // period if not present
  summary: string,
  description: string,
  image_uri: string,
  prizes: number[],
  deadline: Date
) => {
  return `# Weekly Challenge #${entry_no} - ${title
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')}

**${summary}.** ${description}

<img width="506" alt="image" src="https://github.com/user-attachments/assets/${image_uri}">

### Prizes:
${prizes.map((prize, i) => `* ${nth[i]}: $${prize}\n`)}
### Rules:
* The winners will be evaluated based on how creative and interesting the solution is. @vjeux has full discretion on how the winners are selected.
* Multiple people can work on a single submission. If it wins, the reward will be split based on the team preferences.
* If a winner doesn't want to take the money, it'll be reinjected in the next week prize pool.
* The solution must be open sourced.
* There are no restrictions in terms of tech stack.

### How to submit a solution:
* Deadline to submit is Sunday October 13 evening at Midnight PST (US West Coast). <span style="display:none;" id="deadline">${formatted_date(
    deadline
  )}</span>
* Open an issue on this repo titled "Submission - &lt;Name of your submission&gt;"
* It must contain a short video showing the submission in action
* It must contain an explanation on how to try it
* It must contain a link with the source code
`
}
