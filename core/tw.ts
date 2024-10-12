import qs from 'querystring'
import OAuth from 'oauth-1.0a'
import { createHmac } from 'crypto'
import axios, { AxiosResponse, Method } from 'axios'

export const oauth = new OAuth({
  signature_method: 'HMAC-SHA1',
  hash_function: (baseString, key) =>
    createHmac('sha1', key).update(baseString).digest('base64'),
  consumer: {
    key: process.env.TWITTER_CONSUMER_KEY!,
    secret: process.env.TWITTER_CONSUMER_SECRET!,
  },
})

export const twitter_client = (
  tw_access_token: string,
  tw_access_token_secret: string
) => {
  const construct_request = function ({
    method,
    resource,
    payload,
  }: {
    method: Method
    resource: string
    payload?: qs.ParsedUrlQueryInput
  }) {
    let url = `https://api.twitter.com/v2/${resource}.json`

    const request = {
      method,
      url: url + method != 'POST' ? `?${qs.stringify(payload)}` : '',
      data: method == 'POST' ? payload : undefined,
    }

    const headers = oauth.toHeader(
      oauth.authorize(request, {
        key: tw_access_token,
        secret: tw_access_token_secret,
      })
    )

    return { ...request, headers }
  }

  const parse_response = async function (response: AxiosResponse) {
    const headers = response.headers
    if (response.status >= 200 && response.status < 300) {
      if (response.status === 204 || headers['Content-Length'] == '0') {
        return {
          _headers: headers,
        }
      }
      const res = response.data
      if (typeof res === 'object' && res !== null) {
        res._headers = headers
      }
      return res
    } else {
      throw {
        _headers: headers,
        ...response.data,
      }
    }
  }

  return {
    get: async function ({
      resource,
      parameters,
    }: {
      resource: string
      parameters?: qs.ParsedUrlQueryInput
    }) {
      const req = construct_request({
        method: 'GET',
        resource,
        payload: parameters,
      })

      return await parse_response(
        await axios({
          ...req,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.Authorization,
          },
        })
      )
    },

    post: async function ({
      resource,
      payload,
    }: {
      resource: string
      payload: qs.ParsedUrlQueryInput
    }) {
      const jsonpoint = ['direct_messages/events/new'].includes(resource)
      const req = construct_request({
        method: 'POST',
        resource,
        payload: jsonpoint ? payload : undefined,
      })

      const pencode = (string: string) =>
        string
          .replace(/!/g, '%21')
          .replace(/\*/g, '%2A')
          .replace(/'/g, '%27')
          .replace(/\(/g, '%28')
          .replace(/\)/g, '%29')

      const res = await axios.post(
        req.url,
        jsonpoint ? JSON.stringify(req.data) : pencode(qs.stringify(req.data)),
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': req.headers.Authorization,
            'Content-Type': !jsonpoint
              ? 'application/x-www-form-urlencoded'
              : 'application/json',
          },
        }
      )

      return await parse_response(res)
    },
  }
}
