import axios from 'axios'
import { join } from 'path'
import ytdl from 'ytdl-core'
import ffmpeg from 'fluent-ffmpeg'
import { existsSync, mkdirSync, createWriteStream } from 'fs'

const DOWNLOAD_DIR = join(__dirname, 'downloads')

if (!existsSync(DOWNLOAD_DIR)) {
  mkdirSync(DOWNLOAD_DIR)
}

export const download = async (url: string, path: string) => {
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

      return new Promise<void>((resolve, reject) => {
        writer.on('error', reject)
        writer.on('finish', () => {
          process.stdout.write('\n')
          resolve()
        })
      })
    } catch {
      console.error(`problem downloading video (attempt ${attempts})`)
    }
  }
}

export const download_from_youtube = async (url: string, path: string) => {
  return new Promise<void>((resolve, reject) => {
    try {
      const w = createWriteStream(path)
      ytdl(url)
        .pipe(w)
        .on('error', reject)
        .once('response', () => console.log('started downloading', url))
        .on('progress', (_, downloaded, total) => {
          const percent = 100 * (downloaded / total)
          process.stdout.write(
            `\rytdl: ${downloaded / 1024 / 1024}MB of ${
              total / 1024 / 1024
            }MB - (${percent}%) to ${path}`
          )
        })
        .on('finish', () => {
          process.stdout.write('\n')
          resolve()
        })
    } catch {
      console.error(`problem downloading youtube video`)
      reject()
    }
  })
}

const commands = [
  '-c:v libx264',
  '-c:a aac',
  '-b:v 1M',
  '-vf scale=w=1280:h=trunc(ow/a/2)*2', // Scale to 1280 width, maintaining aspect ratio
  '-max_muxing_queue_size 1024',
  '-movflags +faststart',
  '-fs 9.8M',
]

// silence ffmpeg logs in prod
const compress = (path: string) =>
  new Promise((resolve, reject) => {
    ffmpeg(path)
      .outputOptions(commands)
      .on('end', resolve)
      .on('error', reject)
      .save(path + '-compressed')
  })

// clean up original downloaded file
