import Taro from '@tarojs/taro';
import { storage } from './storage';
import { friendService } from './friendService';

export type SyncSectionName = 'storage' | 'friends' | 'friendDiaries';

export interface SyncSectionResult {
  name: SyncSectionName;
  success: boolean;
  error?: string;
}

export interface SyncAllResult {
  success: boolean;
  skipped: boolean;
  reason?: 'in-flight' | 'cooldown' | 'anonymous';
  timestamp: number;
  sections: SyncSectionResult[];
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return JSON.stringify(error ?? 'unknown');
}

class SyncManager {
  private lastSyncTime = Number.NEGATIVE_INFINITY;
  private inFlight: Promise<SyncAllResult> | null = null;
  private readonly COOLDOWN_MS = 30_000;
  private lastResult: SyncAllResult | null = null;

  async syncAll(): Promise<SyncAllResult> {
    if (this.inFlight) return this.inFlight;
    const now = Date.now();
    if (now - this.lastSyncTime < this.COOLDOWN_MS) {
      return {
        success: true,
        skipped: true,
        reason: 'cooldown',
        timestamp: now,
        sections: this.lastResult?.sections || [],
      };
    }

    const syncPromise = this.performSync(now);
    this.inFlight = syncPromise;
    syncPromise
      .finally(() => {
        if (this.inFlight === syncPromise) {
          this.inFlight = null;
        }
      })
      .catch(() => undefined);
    return syncPromise;
  }

  private async performSync(startedAt: number): Promise<SyncAllResult> {
    let shouldUpdateCooldown = false;
    try {
      const username = storage.getUserInfo()?.username;
      if (!username) {
        return {
          success: true,
          skipped: true,
          reason: 'anonymous',
          timestamp: startedAt,
          sections: [],
        };
      }

      shouldUpdateCooldown = true;
      const storageSync = await Promise.allSettled([
        storage.syncFromServer(username),
        friendService.syncFriends(),
        friendService.syncFriendDiaries(),
      ]);

      const names: SyncSectionName[] = ['storage', 'friends', 'friendDiaries'];
      const sections = storageSync.map((result, index): SyncSectionResult => {
        if (result.status === 'fulfilled') {
          const value: any = result.value;
          if (value && typeof value === 'object' && 'success' in value && value.success === false) {
            return {
              name: names[index],
              success: false,
              error: Array.isArray(value.sections)
                ? value.sections.filter((section: any) => section?.success === false).map((section: any) => `${section.name}: ${section.error || 'failed'}`).join('; ')
                : 'sync failed',
            };
          }
          return { name: names[index], success: true };
        }
        return {
          name: names[index],
          success: false,
          error: toErrorMessage(result.reason),
        };
      });

      const response: SyncAllResult = {
        success: sections.every(section => section.success),
        skipped: false,
        timestamp: startedAt,
        sections,
      };
      this.lastResult = response;

      if (response.success) {
        Taro.eventCenter.trigger('data-synced', { timestamp: startedAt, sections });
      } else {
        Taro.eventCenter.trigger('data-sync-failed', response);
      }
      return response;
    } finally {
      if (shouldUpdateCooldown) {
        this.lastSyncTime = Date.now();
      }
    }
  }

  forceSyncAll(): Promise<SyncAllResult> {
    this.lastSyncTime = 0;
    return this.syncAll();
  }

  getLastResult(): SyncAllResult | null {
    return this.lastResult;
  }
}

export const syncManager = new SyncManager();
