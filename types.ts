type ArgumentsType<T> = T extends (...args: infer A) => any ? A : never

export type ReturnType<T> = T extends (...args: any) => infer R ? R : never

export type UnwrapPromise<T> = T extends Promise<infer U> ? UnwrapPromise<U> : T

export type Promisify<T> = {
  [K in keyof T]: (...args: ArgumentsType<T[K]>) => Promise<ReturnType<T[K]>>
}

export type req = { fn: string; args: any[] }

export type RPC = typeof import('./core/rpcs.js')['default']

export type summary = {
  title: string
  entry_no: number
  repo_name: string
  created_at: string
}

export type links<d = { url: string; include: boolean }[]> = {
  others: d
  /* add images */
  videos: d
  sources: d
  deploys: d
}

export type submission = {
  uid: number
  title: string
  email?: string
  github_username: string
  twitter_username?: string
  links: links
  mentions: string[]
  issue_url: string
  issue_body: string
  late: boolean
  blurb: string
}
