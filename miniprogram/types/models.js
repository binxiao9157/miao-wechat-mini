/**
 * Shared model field reference for the native migration.
 *
 * Keep this file close to `src/services/storage.ts` while pages are ported.
 * It is intentionally runtime-safe JavaScript so WeChat DevTools can load the
 * scaffold without an extra TypeScript build step.
 */

const STORAGE_KEYS = {
  TOKEN: 'miao_auth_token',
  CURRENT_USER: 'miao_current_user',
  PENDING_SYNC_TASKS: 'miao_pending_sync_tasks',
  LAST_USERNAME: 'miao_last_username'
};

function userScopedKey(username, key) {
  return `u_${username}_${key}`;
}

module.exports = {
  STORAGE_KEYS,
  userScopedKey
};
