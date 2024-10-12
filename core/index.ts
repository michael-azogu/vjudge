#!/usr/bin/env node

import fns from './rpcs.js'

import open from 'open'
import axios from 'axios'
import dotenv from 'dotenv'
import express from 'express'
import { oauth } from './tw.js'
import cookie from 'cookie-session'

import path from 'node:path'
import { log } from 'node:console'

import type { Request } from 'express'
import type { req } from './../types.js'

dotenv.config()

const port = 5432
const url = `http://localhost:${port}`

const server = express()

server.use(
  cookie({
    name: 'session',
    keys: ['your-secret-key'],
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
)
server.use(express.json())
server.use(express.static(path.join(__dirname, 'ui')))

server.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'ui', 'index.html'))
})

const rpcs = fns as any

server.post('/rpc', async (req: Request<{}, {}, req>, { json }) => {
  const { fn, args } = req.body
  json((await rpcs[fn](...args)) || {})
})

server.get('/auth/github', (_, { redirect }) => {
  const callback_uri = `${url}/auth/github/callback`
  const auth_flow_url = new URL('https://github.com/login/oauth/authorize')

  auth_flow_url.search = new URLSearchParams({
    prompt: 'select_account',
    redirect_uri: callback_uri,
    client_id: process.env.GITHUB_CLIENT_ID!,
  }).toString()

  redirect(auth_flow_url.toString())
})

server.get('/auth/github/callback', async ({ query }, { send }) => {
  const { access_token } = (
    await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        code: query.code,
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    )
  ).data

  send(`
<script>
  localStorage.setItem('gh_access_token', "${access_token}")
  window.location.href = "${url}"
</script>
`)
})

type OAuthSession = {
  oauth_token: string
  oauth_token_secret: string
  oauth_access_token: string
  oauth_access_token_secret: string
}

const tw_auth_uri = 'https://api.twitter.com/oauth/authenticate'
const tw_token_uri = 'https://api.twitter.com/oauth/request_token'
const tw_access_token_uri = 'https://api.twitter.com/oauth/access_token'

server.get('/auth/twitter', async (req, respond) => {
  const headers = oauth.toHeader(
    oauth.authorize({
      url: tw_token_uri,
      method: 'POST',
    })
  )

  const response = await axios.post(tw_token_uri, null, {
    headers: {
      Authorization: headers.Authorization,
    },
  })

  const params = new URLSearchParams(response.data)
  const oauth_token = params.get('oauth_token')!
  const oauth_token_secret = params.get('oauth_token_secret')!

  const session = req.session! as OAuthSession

  session.oauth_token = oauth_token
  session.oauth_token_secret = oauth_token_secret

  respond.redirect(`${tw_auth_uri}?oauth_token=${oauth_token}`)
})

server.get('/auth/twitter/callback', async (req, respond) => {
  const { oauth_token, oauth_verifier } = req.query
  const session = req.session! as OAuthSession

  const headers = oauth.toHeader(
    oauth.authorize({
      url: tw_access_token_uri,
      method: 'POST',
    })
  )

  const response = await axios.post(
    `${tw_access_token_uri}?oauth_token=${oauth_token}&oauth_verifier=${oauth_verifier}`,
    null,
    {
      headers: {
        Authorization: headers.Authorization,
      },
    }
  )

  const params = new URLSearchParams(response.data)
  const oauth_access_token = params.get('oauth_token')!
  const oauth_access_token_secret = params.get('oauth_token_secret')!

  session.oauth_access_token = oauth_access_token
  session.oauth_access_token_secret = oauth_access_token_secret

  respond.send(`
<script>
  localStorage.setItem('tw_access_token', "${oauth_access_token}")
  localStorage.setItem('tw_access_token_secret', "${oauth_access_token_secret}")
  window.location.href = "${url}"
</script>
`)
})

server.listen(port, async () => {
  log(url)
  await open(url)
})
