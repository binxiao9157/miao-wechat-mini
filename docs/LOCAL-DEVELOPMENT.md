# Local Development

The mini-program and H5 build use the canonical backend in `../Miao_remote`.
The old `miao-wechat-mini/server` copy was removed because it only implemented
legacy `/api/*` routes and did not match the current `/api/v1/*` client.

## Active Build Commands

- Install: `npm install`
- Type check: `npm run lint`
- WeChat mini-program build: `npm run build:weapp`
- WeChat mini-program watch build: `npm run dev:weapp`

The active Taro config is `config/index.js`. The root `taro.config.js` is
historical and should not be edited for normal mini-program changes.

## Start the backend

```bash
npm run install:server
npm run dev:server
```

This runs `../Miao_remote/server.ts`, which provides the auth, sync, friends,
notification, upload, and AI task APIs used by this project.

## Configure API base URL

Copy `.env.example` to `.env` only for local overrides. The default production
API base remains `https://www.mmdd10.tech`.

```bash
cp .env.example .env
```

For local H5 development with a local backend, set:

```bash
TARO_APP_API_BASE_URL=http://localhost:3000
```

Do not commit `.env`; it is intentionally ignored.

## WeChat DevTools URL checks

Committed project settings must stay release-safe. Both `project.config.json`
and `project.private.config.json` keep `setting.urlCheck` enabled, and source
maps disabled for upload, so a production upload does not accidentally inherit a
local debug bypass.

If WeChat DevTools needs a temporary local backend bypass during manual testing,
change `project.private.config.json` on your machine only and keep that edit
uncommitted. Before committing or uploading, run:

```bash
npm test
```

The code-quality guard checks `urlCheck` so a committed `false` value is caught
before release.
