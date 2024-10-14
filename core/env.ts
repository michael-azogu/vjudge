import dotenv from 'dotenv'

dotenv.config()

export const ORG = process.env.ORG!

export const GITHUB_APP_ID = process.env.GITHUB_APP_ID!
export const GITHUB_APP_PK = process.env.GITHUB_APP_PK!.replace(/\\n/g, '\n')
export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!

export const TWITTER_APP_ID = process.env.TWITTER_APP_ID!
export const TWITTER_CONSUMER_KEY = process.env.TWITTER_CONSUMER_KEY!
export const TWITTER_CONSUMER_SECRET = process.env.TWITTER_CONSUMER_SECRET!
