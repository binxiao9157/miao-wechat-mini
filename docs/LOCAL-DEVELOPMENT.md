# Local Development

The mini-program and H5 build use the canonical backend in `../Miao_remote`.
The old `miao-wechat-mini/server` copy was removed because it only implemented
legacy `/api/*` routes and did not match the current `/api/v1/*` client.

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
