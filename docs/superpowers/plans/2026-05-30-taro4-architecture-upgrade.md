# Taro 4 Architecture Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the mini-program architecture from Taro 3.6/webpack4 to Taro 4.2/webpack5 without regressing existing application behavior.

**Architecture:** Keep React 18 and the current Taro app/page structure. Replace the webpack4 runner stack with Taro 4.2's webpack5 runner, explicitly set `compiler.type = 'webpack5'`, align all Taro packages to the same version, and keep the share-timeline post-build plugin working against the generated `dist` files.

**Tech Stack:** Taro 4.2.0, React 18, webpack 5.91.0, TypeScript, Vitest/jsdom, WeChat mini-program output.

---

### Task 1: Dependency Graph Alignment

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [x] **Step 1: Replace Taro runtime dependencies**

Set these runtime dependencies:

```json
"@tarojs/components": "4.2.0",
"@tarojs/react": "4.2.0",
"@tarojs/runtime": "4.2.0",
"@tarojs/taro": "4.2.0"
```

- [x] **Step 2: Replace Taro build dependencies**

Remove `@tarojs/mini-runner` and `@tarojs/webpack-runner`. Add:

```json
"@tarojs/cli": "4.2.0",
"@tarojs/plugin-framework-react": "4.2.0",
"@tarojs/plugin-platform-h5": "4.2.0",
"@tarojs/plugin-platform-weapp": "4.2.0",
"@tarojs/webpack5-runner": "4.2.0",
"babel-preset-taro": "4.2.0",
"eslint-config-taro": "4.2.0",
"webpack": "5.91.0"
```

- [x] **Step 3: Add explicit test peer dependency**

Add `@testing-library/dom` because `@testing-library/react` imports it directly:

```json
"@testing-library/dom": "^10.4.1"
```

- [x] **Step 4: Install and verify package versions**

Run:

```bash
npm install
node -e "const p=require('./package-lock.json'); for (const n of ['node_modules/@tarojs/taro','node_modules/@tarojs/components','node_modules/@tarojs/runtime','node_modules/@tarojs/webpack5-runner','node_modules/webpack']) console.log(n, p.packages?.[n]?.version)"
```

Expected versions: Taro packages `4.2.0`, webpack `5.91.0`.

### Task 2: Compiler Configuration

**Files:**
- Modify: `config/index.js`
- Modify: `package.json`

- [x] **Step 1: Set webpack5 compiler explicitly**

Add:

```js
compiler: {
  type: 'webpack5',
},
```

- [x] **Step 2: Keep custom plugin path**

Keep:

```js
plugins: [path.resolve(__dirname, '..', 'scripts', 'taro-plugin-share-timeline')],
```

- [x] **Step 3: Remove webpack4-only OpenSSL workaround from scripts**

Update scripts:

```json
"dev:weapp": "taro build --type weapp --watch",
"dev:h5": "taro build --type h5 --watch",
"build:weapp": "taro build --type weapp",
"build:h5": "taro build --type h5"
```

### Task 3: Build Failure Root Cause Loop

**Files:**
- Modify only files directly implicated by verified errors.

- [x] **Step 1: Run Taro 4 mini build**

Run:

```bash
npm run build:weapp
```

- [x] **Step 2: If build fails, classify the failure**

Use this rule:
- Dependency/peer mismatch: fix package versions first.
- Taro config mismatch: fix `config/index.js`.
- Business source compile error: fix the referenced source file and rerun `npm run lint`.
- Generated asset/plugin issue: fix `scripts/taro-plugin-share-timeline.js`.

- [x] **Step 3: Re-run build after each fix**

Run:

```bash
npm run build:weapp
```

Expected final result: build exits `0` and generated `dist/pages/*/index.json` files exist.

### Task 4: Behavior Regression Verification

**Files:**
- No planned production edits unless tests expose a regression.

- [x] **Step 1: Run unit tests**

Run:

```bash
npm test
```

Expected: all existing tests pass.

- [x] **Step 2: Run TypeScript check**

Run:

```bash
npm run lint
```

Expected: no TypeScript errors.

- [x] **Step 3: Verify share timeline plugin output**

Run:

```bash
node - <<'NODE'
const fs = require('fs');
for (const page of ['diary','home','cat-player','cat-history','profile','points','time-letters']) {
  const file = `dist/pages/${page}/index.json`;
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (json.enableShareTimeline !== true) throw new Error(`${file} missing enableShareTimeline`);
}
NODE
```

Expected: command exits `0`.

### Task 5: Security And Completion

**Files:**
- Modify: `docs/superpowers/plans/2026-05-30-taro4-architecture-upgrade.md`

- [x] **Step 1: Run production audit**

Run:

```bash
npm audit --omit=dev --audit-level=high
```

Result: `npm audit --omit=dev --audit-level=high` still reports upstream advisories after the Taro 4 migration: `swiper` via `@tarojs/components`, `esbuild` via `@tarojs/helper`, `webpack-dev-server`/`uuid` via Taro's dev server chain, and `webpack@5.91.0`. The migration still reduces the old Taro 3 dependency shape and moves the build stack to Taro 4/webpack5, but the remaining advisories require upstream Taro/webpack-compatible releases rather than an in-project code change.

- [x] **Step 2: Final git verification**

Run:

```bash
git status --short
git diff --stat
```

- [x] **Step 3: Commit and push**

Use:

```bash
git add package.json package-lock.json config/index.js src/pages/empty-cat/index.less src/pages/upload-material/index.less docs/superpowers/plans/2026-05-30-taro4-architecture-upgrade.md
git commit -m "chore: upgrade taro build stack to v4"
git push origin master
```
