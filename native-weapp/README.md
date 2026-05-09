# Miao Native WeApp

This directory is the native WeChat Mini Program migration track.

Open `native-weapp/project.config.json` in WeChat DevTools. The existing Taro app
remains in `src/` and is not modified by this native scaffold.

## Current scope

- Native app shell
- Bootstrap page
- Shared API config
- Promise wrappers for request, upload, storage, navigation, and events
- Auth and sync service skeletons wired to the existing `/api/v1` backend

Next pages to migrate are `login`, `welcome`, and the cat creation/home MVP flow.
