import Taro from '@tarojs/taro';
import { serverSync, storage } from './storage';
import { getItem, removeItem, setItem } from '../utils/storageAdapter';

type SyncTask = {
  type: 'diary' | 'letter' | 'points' | 'cat';
  id?: string;
  action: 'upsert' | 'delete';
  payload?: any;
  retries?: number;
  lastError?: string;
  lastTriedAt?: number;
};

const PERSIST_KEY = 'miao_pending_sync_tasks';

class SyncQueue {
  private dirty = new Map<string, SyncTask>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 5000;
  private readonly MAX_RETRIES = 3;
  private flushing = false;
  private flushWaiters: Array<() => void> = [];
  private hydrated = false;

  private getTaskKey(task: SyncTask) {
    return task.id ? `${task.type}:${task.id}` : task.type;
  }

  private isValidTask(task: any): task is SyncTask {
    if (!task || typeof task !== 'object') return false;
    if (!['diary', 'letter', 'points', 'cat'].includes(task.type)) return false;
    if (!['upsert', 'delete'].includes(task.action)) return false;

    const hasId = typeof task.id === 'string' && task.id.trim().length > 0;
    if (task.action === 'delete') {
      return task.type !== 'points' && hasId;
    }
    if (task.type === 'points') return task.payload !== undefined;
    return hasId && task.payload !== undefined;
  }

  private resolveFlushWaiters() {
    const waiters = this.flushWaiters.splice(0);
    for (const resolve of waiters) resolve();
  }

  private hydrate() {
    if (this.hydrated) return;
    this.hydrated = true;
    try {
      const raw = getItem(PERSIST_KEY);
      if (!raw) return;
      const tasks = JSON.parse(raw) as SyncTask[];
      if (!Array.isArray(tasks)) return;
      for (const task of tasks) {
        if (!this.isValidTask(task)) continue;
        this.dirty.set(this.getTaskKey(task), task);
      }
    } catch {
      removeItem(PERSIST_KEY);
    }
  }

  private persist() {
    const tasks = Array.from(this.dirty.values());
    if (tasks.length === 0) {
      removeItem(PERSIST_KEY);
      return;
    }
    setItem(PERSIST_KEY, JSON.stringify(tasks));
  }

  enqueue(task: SyncTask) {
    this.hydrate();
    if (!this.isValidTask(task)) return;
    const key = this.getTaskKey(task);
    this.dirty.set(key, { ...task, retries: task.retries ?? 0 });
    this.persist();
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.DEBOUNCE_MS);
  }

  async flush() {
    this.hydrate();
    if (this.flushing) {
      await new Promise<void>(resolve => { this.flushWaiters.push(resolve); });
      return;
    }
    const tasks = Array.from(this.dirty.values()).filter(task => (task.retries ?? 0) < this.MAX_RETRIES);
    const exhaustedTasks = Array.from(this.dirty.values()).filter(task => (task.retries ?? 0) >= this.MAX_RETRIES);
    this.dirty.clear();
    for (const task of exhaustedTasks) {
      this.dirty.set(this.getTaskKey(task), task);
    }
    this.persist();
    this.timer = null;
    this.flushing = true;

    const username = storage.getUserInfo()?.username;
    if (!username) {
      for (const task of tasks) {
        this.dirty.set(this.getTaskKey(task), task);
      }
      this.persist();
      this.flushing = false;
      this.resolveFlushWaiters();
      return;
    }

    for (const task of tasks) {
      try {
        await this.executeTask(username, task);
      } catch (error: any) {
        if ((task.retries ?? 0) < this.MAX_RETRIES) {
          const nextTask = {
            ...task,
            retries: (task.retries ?? 0) + 1,
            lastError: error?.message || String(error || 'unknown'),
            lastTriedAt: Date.now(),
          };
          this.dirty.set(this.getTaskKey(task), nextTask);
        }
      }
    }
    this.persist();
    this.flushing = false;
    this.resolveFlushWaiters();

    // 如果 flush 期间有新任务入队，再调度一次
    if (Array.from(this.dirty.values()).some(task => (task.retries ?? 0) < this.MAX_RETRIES)) {
      this.scheduleFlush();
    }
  }

  private async executeTask(username: string, task: SyncTask) {
    switch (task.type) {
      case 'diary':
        if (task.action === 'delete') {
          await serverSync.deleteDiaryFromServer(username, task.id!);
        } else {
          await serverSync.syncDiaryToServer(username, task.payload);
        }
        break;
      case 'letter':
        if (task.action === 'delete') {
          await serverSync.deleteLetterFromServer(username, task.id!);
        } else {
          await serverSync.syncLetterToServer(username, task.payload);
        }
        break;
      case 'points':
        await serverSync.syncPointsToServer(username, task.payload);
        break;
      case 'cat':
        if (task.action === 'delete') {
          await serverSync.deleteCatFromServer(username, task.id!);
        } else {
          await serverSync.syncCatToServer(username, task.payload);
        }
        break;
    }
  }

  async flushNow() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.flush();
  }
}

export const syncQueue = new SyncQueue();
