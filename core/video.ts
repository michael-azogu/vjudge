import axios from 'axios'
import { join, dirname } from 'node:path'
import { execSync } from 'node:child_process'
import ytdl from 'ytdl-core'
import { fileURLToPath } from 'url'
import ffmpeg from 'fluent-ffmpeg'
import {
  existsSync,
  mkdirSync,
  createWriteStream,
  openSync,
  unlinkSync,
} from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DOWNLOAD_DIR = join(__dirname, 'downloads')

if (!existsSync(DOWNLOAD_DIR)) {
  mkdirSync(DOWNLOAD_DIR)
}

const commands = [
  '-c:v libx264',
  '-c:a aac',
  '-b:v 1M',
  '-vf scale=w=1280:h=trunc(ow/a/2)*2', // Scale to 1280 width, maintaining aspect ratio
  '-max_muxing_queue_size 1024',
  '-movflags +faststart',
  '-fs 9.4M',
]

const compress = (path: string) =>
  new Promise((resolve, reject) => {
    console.log('compressing', path)
    const cmd = `ffmpeg -i ${path} -c:v libx264 -c:a aac -b:v 1M -vf "scale=w=1280:h=trunc(ow/a/2)*2" -max_muxing_queue_size 1024 -movflags +faststart -fs 9.8M ${path}`

    execSync(cmd, { encoding: 'utf-8' })

    resolve(path)
  })

export const download = async (url: string, path: string) => {
  path = join(DOWNLOAD_DIR, path)
  return new Promise<string>(async (resolve, reject) => {
    openSync(path, 'a')

    let attempts = 0
    const max_retries = 2

    while (attempts < max_retries) {
      try {
        attempts++
        const writer = createWriteStream(path)
        const { data } = await axios({
          url,
          method: 'get',
          responseType: 'stream',
        })

        let total = 0
        data
          .on('data', (chunk: Buffer) => {
            total += chunk.length
            process.stdout.write(
              `\r${(total / (1024 * 1024)).toFixed(2)} MB downloaded to ${path}`
            )
          })
          .pipe(writer)

        writer.on('error', reject)
        writer.on('finish', () => {
          process.stdout.write('\n')
          resolve(path)
        })
      } catch {
        console.error(`problem downloading video (attempt ${attempts})`)
      }
    }
  })
}

export const download_from_vimeo = async (url: string, path: string) => {}

export const download_from_youtube = async (url: string, path: string) => {
  path = join(DOWNLOAD_DIR, path)
  openSync(path, 'a')

  return new Promise<string>(async (resolve, reject) => {
    try {
      const cmd = `yt-dlp --print after_move:filepath -f bestvideo+bestaudio --merge-output-format mp4 -o "${path}" ${url}`

      const ytdlpath = execSync(cmd, { encoding: 'utf-8' })

      resolve(ytdlpath.trim())
    } catch {
      console.error(`problem downloading youtube video`)
      reject()
    }
  })
}
