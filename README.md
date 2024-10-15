# Setup

pnpm & bun required (or modify pkg.json scripts)

<!-- ffmpeg system dependency -->

```bash
git clone https://github.com/michael-azogu/vjudge.git
cd vjudge && pnpm i
cd core && touch .env
# fill in the .env file
npm run build:cli && npm link
vjudge
```

```toml
ORG=

TWITTER_APP_ID=
TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

GITHUB_APP_ID=
GITHUB_APP_PK=""
```
