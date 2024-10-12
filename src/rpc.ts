import type { Promisify, req, RPC } from '../types'

const server_url = window.location.origin

const create_rpc_client = () =>
  new Proxy({} as Promisify<RPC>, {
    get: (_, fn_name) => {
      if (typeof fn_name == 'string') {
        return async (...args: any[]) => {
          const request: req = {
            args: args,
            fn: fn_name,
          }

          const response = await fetch(server_url + '/rpc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
          })

          return await response.json()
        }
      }
    },
  })

export default create_rpc_client()
