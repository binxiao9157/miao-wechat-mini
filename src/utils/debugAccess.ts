import type { UserInfo } from '../services/storage/types';

export type DebugCapability = 'diagnostics' | 'admin' | 'dangerous';

const ADMIN_ROLES = new Set(['developer', 'operator']);
const ADMIN_SETTINGS_ROUTE_PARTS = ['pages', 'admin-settings', 'index'] as const;
const DEBUG_BUILD_ENABLED = process.env.TARO_APP_DEBUG_BUILD === 'true';
const ADMIN_BUNDLE_ENABLED = process.env.TARO_APP_ENABLE_ADMIN === 'true';

export function isDebugBuild(): boolean {
  return DEBUG_BUILD_ENABLED;
}

export function isAdminBundleEnabled(): boolean {
  return isDebugBuild() || ADMIN_BUNDLE_ENABLED;
}

export function getAdminSettingsRoute(): string | null {
  if (!isAdminBundleEnabled()) return null;
  return `/${ADMIN_SETTINGS_ROUTE_PARTS.join('/')}`;
}

export function hasRemoteDebugAccess(user: Pick<UserInfo, 'debugAllowed' | 'debugRole' | 'debugExpiresAt'> | null, now = Date.now()): boolean {
  if (!user?.debugAllowed) return false;
  if (!user.debugRole || !ADMIN_ROLES.has(user.debugRole)) return false;
  if (typeof user.debugExpiresAt === 'number' && user.debugExpiresAt <= now) return false;
  return true;
}

export function canAccessDiagnostics(): boolean {
  return true;
}

export function canAccessAdminConsole(user: UserInfo | null, now = Date.now()): boolean {
  if (!isAdminBundleEnabled()) return false;
  if (isDebugBuild()) return true;
  return hasRemoteDebugAccess(user, now);
}

export function canUseDangerousDebug(user: UserInfo | null, now = Date.now()): boolean {
  if (!canAccessAdminConsole(user, now)) return false;
  return isDebugBuild();
}

export function isDangerousDebugStorageEnabled(): boolean {
  return isDebugBuild();
}
