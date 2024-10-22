# Setup

ffmpeg & ytdl dependencies

```bash
git clone https://github.com/michael-azogu/vjudge.git

cd vjudge

# no need to run the vite app
pnpm i

cd core

npm i

# fill in the .env file
touch .env

npm run build

npm link

vjudge

# if permission denied
chmod +x /path/to/bin/vjudge
```

```toml
ORG=Algo-Arena

TWITTER_APP_ID=
TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

GITHUB_APP_ID=
GITHUB_APP_PK=""
```
