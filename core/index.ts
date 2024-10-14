#!/usr/bin/env node

import fns from './rpcs.js'

import open from 'open'
import axios from 'axios'
import express from 'express'
import { tw_client } from './tw.js'
import cookie from 'cookie-session'

import path from 'node:path'
import { log } from 'node:console'

import type { Request } from 'express'
import type { req } from './../types.js'

import {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  TWITTER_CONSUMER_KEY,
  TWITTER_CONSUMER_SECRET,
} from './env.js'
import { TwitterApi } from 'twitter-api-v2'

const port = 5432
const server_url = `http://localhost:${port}`

const server = express()

server.use(
  cookie({
    name: 'session',
    sameSite: 'none',
    keys: ['your-secret-key'],
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
)
server.use(express.json({ limit: '10mb' }))
server.use(express.static(path.join(__dirname, 'ui')))

let once = false
server.get('/', (_, res) => {
  if (once) {
    log('auth is weird cant reload page, weird things will happen')
    process.exit(0)
  }
  once = true
  res.sendFile(path.join(__dirname, 'ui', 'index.html'))
})

const rpcs = fns as any

server.post('/rpc', async (req: Request<{}, {}, req>, res) => {
  const { fn, args } = req.body
  try {
    res.json((await rpcs[fn](...args)) || {})
  } catch (e) {
    console.log('> rpc error at', fn, 'with args', args)
    console.error(e)
  }
})

server.get('/auth/github', (_, respond) => {
  const callback_uri = `${server_url}/auth/github/callback`
  const auth_flow_url = new URL('https://github.com/login/oauth/authorize')

  auth_flow_url.search = new URLSearchParams({
    prompt: 'select_account',
    redirect_uri: callback_uri,
    client_id: GITHUB_CLIENT_ID,
  }).toString()

  respond.redirect(auth_flow_url.toString())
})

server.get('/auth/github/callback', async ({ query }, respond) => {
  const { access_token } = (
    await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        code: query.code,
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    )
  ).data

  respond.send(`
<script>
  localStorage.setItem('gh_access_token', "${access_token}")
  window.location.href = "${server_url}"
</script>
`)
})

const tw_callback_url = '/auth/twitter/callback'

type OAuthSession = {
  oauth_token: string
  oauth_token_secret: string
}

const session: OAuthSession = {
  oauth_token: '',
  oauth_token_secret: '',
}

server.get('/auth/twitter', async (_, respond) => {
  const { url, oauth_token, oauth_token_secret } =
    await tw_client.$.generateAuthLink(server_url + tw_callback_url, {
      linkMode: 'authorize',
      authAccessType: 'write',
    })

  session.oauth_token = oauth_token
  session.oauth_token_secret = oauth_token_secret

  respond.redirect(url)
})

server.get(tw_callback_url, async (req, respond) => {
  const { oauth_verifier } = req.query

  respond.send(`
  <script>
    localStorage.setItem('tw_access_token', "${session.oauth_token}")
    localStorage.setItem('tw_access_token_secret', "${session.oauth_token_secret}")
    localStorage.setItem('tw_access_token_verifier', "${oauth_verifier}")
    window.location.href = "${server_url}"
  </script>
  `)
})

server.listen(port, async () => {
  log(server_url)
  await open(server_url)
})
