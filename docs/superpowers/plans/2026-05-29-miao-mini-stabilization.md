# Miao Mini Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Taro WeChat mini-program reliable to install, test, build, and evolve by stabilizing dependencies, adding focused test coverage, and reducing risk in the authentication, storage, and sync core.

**Architecture:** Start with reproducible tooling and test harnesses, then add characterization tests around current behavior before changing shared business logic. Refactor large modules behind small facades so pages continue to call the same public API while internal files become easier to test.

**Tech Stack:** Taro 3.6, React 18, TypeScript, Less, Webpack 4, Node/npm, Vitest for unit tests.

---

## Current Baseline

- `npm ci` currently fails because `@tarojs/webpack5-runner` requires Webpack 5 while the active build uses Webpack 4.
- `npm ci --legacy-peer-deps` succeeds.
- `npm run lint` succeeds and runs `tsc --noEmit`.
- `npm run build:weapp` succeeds and writes `dist/`.
- `npm audit --omit=dev` reports 69 production vulnerabilities, largely from old Taro/Webpack dependency chains and build-only packages listed as runtime dependencies.

## File Structure

- Modify `package.json`: normalize scripts, dependencies, devDependencies, and add test commands.
- Modify `package-lock.json`: regenerate after dependency edits.
- Create `vitest.config.ts`: unit-test configuration with TS path aliases and jsdom.
- Create `src/test/setup.ts`: Taro, storage, and environment test shims.
- Create `src/utils/__tests__/httpAdapter.test.ts`: request adapter characterization tests.
- Create `src/services/__tests__/syncQueue.test.ts`: pending-sync persistence and retry tests.
- Create `src/services/__tests__/authService.test.ts`: auth token/user persistence tests.
- Create `src/services/storage/types.ts`: move exported storage model types out of the large storage implementation.
- Create `src/services/storage/mediaStore.ts`: isolate media save/read/delete behavior.
- Create `src/services/storage/serverSync.ts`: isolate server sync API functions currently exposed through private `storage as any` calls.
- Modify `src/services/storage.ts`: re-export public types and delegate focused behavior to new modules without changing page APIs.
- Modify `src/services/syncQueue.ts`: consume typed sync functions instead of `(storage as any)`.
- Modify `src/context/AuthContext.tsx`: stabilize callback references and keep context updates predictable.
- Modify `src/utils/httpAdapter.ts`: add H5 base URL support and preserve current mini-program behavior.
- Modify `config/index.js`: keep it as the single active Taro config.
- Modify `taro.config.js`, `h5.config.js`, `weapp.config.js`: either remove after verification or reduce to comments that point to `config/index.js`.
- Modify `docs/LOCAL-DEVELOPMENT.md`: document install, test, build, and WeChat Developer Tools flow.

---

### Task 1: Tooling Baseline And Dependency Cleanup

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Verify: `config/index.js`

- [ ] **Step 1: Record current baseline**

Run:

```bash
npm run lint
npm run build:weapp
```

Expected: both commands pass. Keep the output summary in the task notes.

- [ ] **Step 2: Remove the unused Webpack 5 runner**

In `package.json`, remove this dependency:

```json
"@tarojs/webpack5-runner": "^3.6.29"
```

Keep these Webpack 4 build dependencies:

```json
"@tarojs/webpack-runner": "^3.6.37",
"webpack": "^4.47.0"
```

Reason: the successful build output reports Webpack 4.46.0, and the active config is `config/index.js`.

- [ ] **Step 3: Move build-only packages out of runtime dependencies**

In `package.json`, move these from `dependencies` to `devDependencies`:

```json
"@tarojs/mini-runner": "^3.6.37",
"@tarojs/plugin-framework-react": "^3.6.29",
"@tarojs/plugin-platform-h5": "^3.6.40",
"@tarojs/plugin-platform-weapp": "^3.6.40"
```

Keep these in runtime dependencies:

```json
"@tarojs/components": "^3.6.29",
"@tarojs/react": "^3.6.29",
"@tarojs/runtime": "^3.6.29",
"@tarojs/taro": "^3.6.29",
"react": "^18.2.0",
"react-dom": "^18.2.0"
```

- [ ] **Step 4: Regenerate the lockfile**

Run:

```bash
rm -rf node_modules package-lock.json
npm install
```

Expected: install succeeds without `--legacy-peer-deps`. If it still fails, run `npm explain webpack @tarojs/webpack5-runner` and remove the remaining package that still pulls Webpack 5.

- [ ] **Step 5: Verify build and audit direction**

Run:

```bash
npm run lint
npm run build:weapp
npm audit --omit=dev
```

Expected: lint and build pass. The production audit count should drop because build-only packages moved to `devDependencies`.

- [ ] **Step 6: Commit**

Run:

```bash
git add package.json package-lock.json
git commit -m "chore: stabilize taro webpack dependencies"
```

---

### Task 2: Add Unit Test Harness

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Add test dependencies**

Run:

```bash
npm install -D vitest jsdom @testing-library/react
```

- [ ] **Step 2: Add test scripts**

In `package.json`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

Create:

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

- [ ] **Step 4: Create `src/test/setup.ts`**

Create:

```ts
import { vi } from 'vitest';

const memoryStorage = new Map<string, string>();

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => memoryStorage.get(key) ?? null,
    setItem: (key: string, value: string) => { memoryStorage.set(key, value); },
    removeItem: (key: string) => { memoryStorage.delete(key); },
    clear: () => { memoryStorage.clear(); },
    key: (index: number) => Array.from(memoryStorage.keys())[index] ?? null,
    get length() { return memoryStorage.size; },
  },
});

vi.mock('@tarojs/taro', () => {
  const eventHandlers = new Map<string, Set<(...args: any[]) => void>>();
  return {
    default: {
      ENV_TYPE: { WEAPP: 'WEAPP', WEB: 'WEB' },
      getEnv: vi.fn(() => 'WEB'),
      request: vi.fn(),
      login: vi.fn(async () => ({ code: 'test-login-code' })),
      checkSession: vi.fn(async () => undefined),
      reLaunch: vi.fn(async () => undefined),
      eventCenter: {
        on: vi.fn((event: string, handler: (...args: any[]) => void) => {
          if (!eventHandlers.has(event)) eventHandlers.set(event, new Set());
          eventHandlers.get(event)!.add(handler);
        }),
        off: vi.fn((event: string, handler: (...args: any[]) => void) => {
          eventHandlers.get(event)?.delete(handler);
        }),
        trigger: vi.fn((event: string, data?: any) => {
          eventHandlers.get(event)?.forEach(handler => handler(data));
        }),
      },
    },
  };
});

beforeEach(() => {
  memoryStorage.clear();
});
```

- [ ] **Step 5: Verify empty test suite**

Run:

```bash
npm test
```

Expected: Vitest starts successfully and reports no test files or zero tests without TypeScript config errors.

- [ ] **Step 6: Commit**

Run:

```bash
git add package.json package-lock.json vitest.config.ts src/test/setup.ts
git commit -m "test: add vitest harness"
```

---

### Task 3: Characterize HTTP Adapter Behavior

**Files:**
- Create: `src/utils/__tests__/httpAdapter.test.ts`
- Modify: `src/utils/httpAdapter.ts`

- [ ] **Step 1: Write tests for H5 request behavior**

Create `src/utils/__tests__/httpAdapter.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { request } from '../httpAdapter';
import { setItem, getItem } from '../storageAdapter';

describe('httpAdapter in H5 mode', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 200,
      json: async () => ({ ok: true }),
    })));
  });

  it('keeps relative api paths when no H5 base URL is configured', async () => {
    await request({ url: '/api/v1/me' });

    expect(fetch).toHaveBeenCalledWith('/api/v1/me', expect.objectContaining({
      method: 'GET',
    }));
  });

  it('adds authorization and client headers', async () => {
    setItem('miao_auth_token', 'abc123');

    await request({ url: '/api/v1/me' });

    expect(fetch).toHaveBeenCalledWith('/api/v1/me', expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer abc123',
        'X-Client-Type': 'pwa',
        'X-Client-Version': '1.0.0',
      }),
    }));
  });

  it('clears cached auth after unauthorized response', async () => {
    setItem('miao_auth_token', 'abc123');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 401,
      json: async () => ({ code: 'UNAUTHORIZED', message: 'unauthorized' }),
    })));

    await expect(request({ url: '/api/v1/me' })).rejects.toThrow('unauthorized');

    expect(getItem('miao_auth_token')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests**

Run:

```bash
npm test -- src/utils/__tests__/httpAdapter.test.ts
```

Expected: tests pass with current behavior.

- [ ] **Step 3: Add optional H5 API base URL**

In `src/utils/httpAdapter.ts`, replace the base URL block with:

```ts
  const baseURL = isMini
    ? (process.env.TARO_APP_API_BASE_URL || 'https://www.mmdd10.tech')
    : (process.env.TARO_APP_API_BASE_URL || '').replace(/\/$/, '');
  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;
```

- [ ] **Step 4: Add H5 base URL test**

Append to the test file:

```ts
  it('uses TARO_APP_API_BASE_URL for H5 when configured', async () => {
    const original = process.env.TARO_APP_API_BASE_URL;
    process.env.TARO_APP_API_BASE_URL = 'https://api.example.com/';

    await request({ url: '/api/v1/me' });

    expect(fetch).toHaveBeenCalledWith('https://api.example.com/api/v1/me', expect.any(Object));
    process.env.TARO_APP_API_BASE_URL = original;
  });
```

- [ ] **Step 5: Verify**

Run:

```bash
npm test -- src/utils/__tests__/httpAdapter.test.ts
npm run lint
```

Expected: tests and TypeScript pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/utils/httpAdapter.ts src/utils/__tests__/httpAdapter.test.ts
git commit -m "test: cover http adapter auth behavior"
```

---

### Task 4: Characterize Authentication Service

**Files:**
- Create: `src/services/__tests__/authService.test.ts`
- Modify: `src/services/authService.ts` only if tests reveal mismatched behavior.

- [ ] **Step 1: Write auth persistence tests**

Create `src/services/__tests__/authService.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../authService';
import { getItem } from '../../utils/storageAdapter';

vi.mock('../../utils/httpAdapter', () => ({
  request: vi.fn(),
}));

import { request } from '../../utils/httpAdapter';

describe('authService', () => {
  beforeEach(() => {
    vi.mocked(request).mockReset();
  });

  it('persists token and normalized user after password login', async () => {
    vi.mocked(request).mockResolvedValue({
      status: 200,
      headers: {},
      data: {
        token: 'token-1',
        user: { username: 'alice', nickname: 'Alice' },
      },
    });

    const user = await authService.passwordLogin('alice', 'secret123');

    expect(user).toMatchObject({
      username: 'alice',
      nickname: 'Alice',
      passwordSet: true,
    });
    expect(getItem('miao_auth_token')).toBe('token-1');
    expect(JSON.parse(getItem('miao_current_user') || '{}')).toMatchObject({
      username: 'alice',
      nickname: 'Alice',
    });
  });

  it('removes cached auth on logout', async () => {
    vi.mocked(request).mockResolvedValue({
      status: 200,
      headers: {},
      data: {
        token: 'token-1',
        user: { username: 'alice' },
      },
    });
    await authService.passwordLogin('alice', 'secret123');

    authService.logout();

    expect(getItem('miao_auth_token')).toBeNull();
    expect(getItem('miao_current_user')).toBeNull();
  });
});
```

- [ ] **Step 2: Run auth tests**

Run:

```bash
npm test -- src/services/__tests__/authService.test.ts
```

Expected: tests pass.

- [ ] **Step 3: Commit**

Run:

```bash
git add src/services/__tests__/authService.test.ts
git commit -m "test: characterize auth persistence"
```

---

### Task 5: Remove `storage as any` From Sync Queue

**Files:**
- Create: `src/services/storage/serverSync.ts`
- Modify: `src/services/storage.ts`
- Modify: `src/services/syncQueue.ts`
- Create: `src/services/__tests__/syncQueue.test.ts`

- [ ] **Step 1: Create typed sync bridge**

Create `src/services/storage/serverSync.ts`:

```ts
import type { CatInfo, DiaryEntry, PointsInfo, TimeLetter } from '../storage';

export interface ServerSyncApi {
  syncCatToServer(userId: string, cat: CatInfo): Promise<void>;
  deleteCatFromServer(userId: string, catId: string): Promise<void>;
  syncDiaryToServer(userId: string, diary: DiaryEntry): Promise<void>;
  deleteDiaryFromServer(userId: string, diaryId: string): Promise<void>;
  syncLetterToServer(userId: string, letter: TimeLetter): Promise<void>;
  deleteLetterFromServer(userId: string, letterId: string): Promise<void>;
  syncPointsToServer(userId: string, data: PointsInfo): Promise<void>;
}
```

- [ ] **Step 2: Export typed sync functions from storage**

At the bottom of `src/services/storage.ts`, replace the private `_syncXxx` exposure with:

```ts
export const serverSync = {
  syncCatToServer,
  deleteCatFromServer,
  syncDiaryToServer,
  deleteDiaryFromServer,
  syncLetterToServer,
  deleteLetterFromServer,
  syncPointsToServer,
};
```

Keep existing public `storage` methods unchanged.

- [ ] **Step 3: Update sync queue imports**

In `src/services/syncQueue.ts`, change:

```ts
import { storage } from './storage';
```

to:

```ts
import { serverSync, storage } from './storage';
```

Then replace the `executeTask` method with:

```ts
  private async executeTask(username: string, task: SyncTask) {
    switch (task.type) {
      case 'diary':
        if (task.action === 'delete') {
          await serverSync.deleteDiaryFromServer(username, task.id || '');
        } else {
          await serverSync.syncDiaryToServer(username, task.payload);
        }
        break;
      case 'letter':
        if (task.action === 'delete') {
          await serverSync.deleteLetterFromServer(username, task.id || '');
        } else {
          await serverSync.syncLetterToServer(username, task.payload);
        }
        break;
      case 'points':
        await serverSync.syncPointsToServer(username, task.payload);
        break;
      case 'cat':
        if (task.action === 'delete') {
          await serverSync.deleteCatFromServer(username, task.id || '');
        } else {
          await serverSync.syncCatToServer(username, task.payload);
        }
        break;
    }
  }
```

- [ ] **Step 4: Write sync queue test**

Create `src/services/__tests__/syncQueue.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setItem } from '../../utils/storageAdapter';

vi.mock('../storage', () => ({
  storage: {
    getUserInfo: vi.fn(() => ({ username: 'alice' })),
  },
  serverSync: {
    syncDiaryToServer: vi.fn(async () => undefined),
    deleteDiaryFromServer: vi.fn(async () => undefined),
    syncLetterToServer: vi.fn(async () => undefined),
    deleteLetterFromServer: vi.fn(async () => undefined),
    syncPointsToServer: vi.fn(async () => undefined),
    syncCatToServer: vi.fn(async () => undefined),
    deleteCatFromServer: vi.fn(async () => undefined),
  },
}));

describe('syncQueue', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('flushes an enqueued diary through typed serverSync', async () => {
    const { syncQueue } = await import('../syncQueue');
    const { serverSync } = await import('../storage');

    syncQueue.enqueue({
      type: 'diary',
      action: 'upsert',
      id: 'd1',
      payload: { id: 'd1', content: 'hello' },
    });

    await syncQueue.flushNow();

    expect(serverSync.syncDiaryToServer).toHaveBeenCalledWith('alice', {
      id: 'd1',
      content: 'hello',
    });
  });

  it('hydrates pending tasks before flushing', async () => {
    setItem('miao_pending_sync_tasks', JSON.stringify([
      { type: 'points', action: 'upsert', payload: { total: 10 } },
    ]));
    const { syncQueue } = await import('../syncQueue');
    const { serverSync } = await import('../storage');

    await syncQueue.flushNow();

    expect(serverSync.syncPointsToServer).toHaveBeenCalledWith('alice', { total: 10 });
  });
});
```

- [ ] **Step 5: Verify**

Run:

```bash
npm test -- src/services/__tests__/syncQueue.test.ts
npm run lint
npm run build:weapp
```

Expected: tests, TypeScript, and build pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/services/storage/serverSync.ts src/services/storage.ts src/services/syncQueue.ts src/services/__tests__/syncQueue.test.ts
git commit -m "refactor: type sync queue server operations"
```

---

### Task 6: Split Storage Types From Implementation

**Files:**
- Create: `src/services/storage/types.ts`
- Modify: `src/services/storage.ts`
- Modify imports that depend on storage types if TypeScript requires it.

- [ ] **Step 1: Move exported interfaces**

Create `src/services/storage/types.ts` and move the exported storage model interfaces from `src/services/storage.ts` into it. The file must export at least:

```ts
export interface UserInfo {
  username: string;
  nickname?: string;
  avatar?: string;
  password?: string;
  passwordSet?: boolean;
  openidBound?: boolean;
  phone?: string;
}

export interface CatInfo {
  id: string;
  name: string;
  breed?: string;
  avatar?: string;
  videoPaths?: string[];
  source?: 'created' | 'uploaded';
  createdAt?: number;
  updatedAt?: number;
}

export interface Comment {
  id: string;
  content: string;
  authorId?: string;
  authorNickname?: string;
  authorAvatar?: string;
  createdAt: number;
}

export interface DiaryEntry {
  id: string;
  catId?: string;
  content: string;
  media?: string[];
  likes?: number;
  isLiked?: boolean;
  comments?: Comment[];
  createdAt?: number;
  updatedAt?: number;
}

export interface TimeLetter {
  id: string;
  catId?: string;
  content: string;
  unlockAt: number;
  createdAt: number;
  updatedAt?: number;
}

export interface PointsInfo {
  total: number;
  lastLoginDate?: string;
  dailyInteractionPoints?: number;
  history?: Array<{ id: string; delta: number; reason: string; createdAt: number }>;
}
```

If the existing interfaces contain additional fields, include them exactly when moving them.

- [ ] **Step 2: Re-export types from storage facade**

At the top of `src/services/storage.ts`, import and re-export:

```ts
export type {
  CatInfo,
  Comment,
  DiaryEntry,
  PointsInfo,
  TimeLetter,
  UserInfo,
} from './storage/types';

import type {
  CatInfo,
  DiaryEntry,
  PointsInfo,
  TimeLetter,
  UserInfo,
} from './storage/types';
```

- [ ] **Step 3: Verify no public import breaks**

Run:

```bash
npm run lint
npm run build:weapp
```

Expected: both pass. Page imports such as `import { storage, UserInfo } from '../../services/storage'` must continue to work.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/services/storage/types.ts src/services/storage.ts
git commit -m "refactor: split storage domain types"
```

---

### Task 7: Stabilize Auth Context Rendering

**Files:**
- Modify: `src/context/AuthContext.tsx`
- Optional Test: `src/context/__tests__/AuthContext.test.tsx`

- [ ] **Step 1: Stabilize `refreshCatStatus`**

In `src/context/AuthContext.tsx`, replace:

```ts
  const refreshCatStatus = () => {
    setCatCount(storage.getCatList().length);
  };
```

with:

```ts
  const refreshCatStatus = useCallback(() => {
    setCatCount(storage.getCatList().length);
  }, []);
```

- [ ] **Step 2: Update dependency arrays**

Because `refreshCatStatus` is now stable, keep it in callback dependency arrays where it is referenced:

```ts
  }, [refreshCatStatus]);
```

for `login`, `register`, `wechatLogin`, and `phoneLogin`.

- [ ] **Step 3: Verify**

Run:

```bash
npm run lint
npm run build:weapp
```

Expected: both pass.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/context/AuthContext.tsx
git commit -m "refactor: stabilize auth context callbacks"
```

---

### Task 8: Consolidate Taro Config Documentation

**Files:**
- Modify: `config/index.js`
- Modify: `taro.config.js`
- Modify: `docs/LOCAL-DEVELOPMENT.md`

- [ ] **Step 1: Confirm active config**

Run:

```bash
npm run build:weapp
```

Expected: build uses `config/index.js`, because Taro's default config directory is `config/`.

- [ ] **Step 2: Add clear comment to root config**

At the top of `taro.config.js`, add:

```js
// This file is kept for historical reference. The active Taro configuration
// for npm scripts is config/index.js.
```

Do not delete it in this task; deleting can wait until the team confirms no editor tooling depends on it.

- [ ] **Step 3: Document active commands**

In `docs/LOCAL-DEVELOPMENT.md`, add:

```md
## Active Build Commands

- Install: `npm install`
- Type check: `npm run lint`
- WeChat mini-program build: `npm run build:weapp`
- WeChat mini-program watch build: `npm run dev:weapp`

The active Taro config is `config/index.js`. The root `taro.config.js` is historical and should not be edited for normal mini-program changes.
```

- [ ] **Step 4: Verify**

Run:

```bash
npm run lint
npm run build:weapp
```

Expected: both pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add taro.config.js docs/LOCAL-DEVELOPMENT.md
git commit -m "docs: clarify active taro config"
```

---

### Task 9: Post-Refactor Regression Pass

**Files:**
- Verify only unless failures require focused fixes.

- [ ] **Step 1: Clean generated output**

Run:

```bash
rm -rf dist
```

- [ ] **Step 2: Run full checks**

Run:

```bash
npm test
npm run lint
npm run build:weapp
```

Expected: all pass and `dist/` is regenerated.

- [ ] **Step 3: Inspect Git state**

Run:

```bash
git status --short
```

Expected: only intentional source, docs, and lockfile changes are present. Do not commit `dist/` or `node_modules`.

- [ ] **Step 4: Commit final docs or fixes**

If regression fixes were needed, commit them:

```bash
git add <changed-files>
git commit -m "chore: complete stabilization regression fixes"
```

---

## Execution Order

1. Task 1 first. It removes the dependency conflict that currently forces `--legacy-peer-deps`.
2. Task 2 next. Tests are required before changing shared behavior.
3. Tasks 3 and 4 can run independently after Task 2.
4. Task 5 should run before Task 6 because it reduces the riskiest untyped coupling.
5. Task 6 should be small and mechanical; do not combine it with behavior changes.
6. Tasks 7 and 8 are low-risk cleanup after the core is safer.
7. Task 9 closes the loop.

## Definition Of Done

- `npm install` works without `--legacy-peer-deps`.
- `npm test` passes.
- `npm run lint` passes.
- `npm run build:weapp` passes.
- `npm audit --omit=dev` has materially fewer production findings than the current baseline.
- No page import paths break.
- `storage.ts` remains a compatible facade, but new work can move into focused files under `src/services/storage/`.

## Self-Review

- Spec coverage: covers dependency install failure, build verification, production audit reduction, auth/storage/sync risk, H5 API config, and config/documentation ambiguity.
- Placeholder scan: no task contains TBD or vague "handle later" instructions.
- Type consistency: `serverSync` method names match the replacement calls in `syncQueue.ts`; storage public imports remain compatible through type re-exports.
