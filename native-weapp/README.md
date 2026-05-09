# Miao Native WeApp

This directory is the native WeChat Mini Program migration track.

Open `native-weapp/project.config.json` in WeChat DevTools. The existing Taro app
remains in `src/` and is not modified by this native scaffold.

## Current scope

- Native app shell
- Welcome, login, register, empty-cat placeholder, and home placeholder pages
- Shared API config
- Promise wrappers for request, upload, storage, navigation, and events
- Auth and sync service skeletons wired to the existing `/api/v1` backend

## Phase status

- Phase 0: scaffold and base adapters are in place.
- Phase 1: auth and startup routing are in place.
- Phase 2A: draft cat creation is in place.
- Phase 2 next: migrate upload, AI generation progress, and the real home player.
