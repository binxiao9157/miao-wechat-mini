# Miao Native WeApp

This directory is the native WeChat Mini Program migration track.

Open `native-weapp/project.config.json` in WeChat DevTools. The existing Taro app
remains in `src/` and is not modified by this native scaffold.

Use `docs/qa-checklist.md` for WeChat DevTools and real-device verification.

## Current scope

- Native app shell
- Welcome, login, register, empty-cat, upload, generation progress, home, switch,
  history, profile, diary, time letters, points, notifications, and privacy pages
- Account profile, password reset/change, feedback, legal document, friend invite/join,
  cat player, milestone, and message center pages
- Custom native bottom navigation across home, diary, time letters, points, and profile
- Shared API config
- Promise wrappers for request, upload, storage, navigation, and events
- Auth and sync service skeletons wired to the existing `/api/v1` backend

## Phase status

- Phase 0: scaffold and base adapters are in place.
- Phase 1: auth and startup routing are in place.
- Phase 2A: draft cat creation is in place.
- Phase 2B: image upload, AI image generation, idle video generation, and basic home
  playback are in place.
- Phase 2C: multi-action video generation and task recovery are in place.
- Phase 3: native cat switch, history, delete, profile, and home interaction flows are
  in place.
- Phase 4: diary, time letters, points, notifications, privacy settings, and sync cache
  foundations are in place.
- Phase 5: account settings, friend invite/join, friend diary feed, cat player,
  milestones, feedback, legal documents, message center, and points redemption are in
  place.
- Phase 6: native bottom navigation and stronger static checks for routes/components are
  in place.
- Phase 6B: pre-device QA hardening for safe-area navigation, video retry, invite copy,
  invite deep links, and points redemption consistency is in place.
- Phase 7 next: run WeChat DevTools/manual QA with the checklist and polish visual parity
  against the existing Taro version on device.
