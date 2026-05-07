import Taro from '@tarojs/taro';
import { storage } from './storage';
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
  private flushResolve: (() => void) | null = null;
  private hydrated = false;

  private getTaskKey(task: SyncTask) {
    return task.id ? `${task.type}:${task.id}` : task.type;
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
        if (!task?.type || !task.action) continue;
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
      await new Promise<void>(resolve => { this.flushResolve = resolve; });
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
      this.flushResolve?.();
      this.flushResolve = null;
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
    this.flushResolve?.();
    this.flushResolve = null;

    // 如果 flush 期间有新任务入队，再调度一次
    if (Array.from(this.dirty.values()).some(task => (task.retries ?? 0) < this.MAX_RETRIES)) {
      this.scheduleFlush();
    }
  }

  private async executeTask(username: string, task: SyncTask) {
    switch (task.type) {
      case 'diary':
        if (task.action === 'delete') {
          await (storage as any)._deleteDiaryFromServer(username, task.id);
        } else {
          await (storage as any)._syncDiaryToServer(username, task.payload);
        }
        break;
      case 'letter':
        if (task.action === 'delete') {
          await (storage as any)._deleteLetterFromServer(username, task.id);
        } else {
          await (storage as any)._syncLetterToServer(username, task.payload);
        }
        break;
      case 'points':
        await (storage as any)._syncPointsToServer(username, task.payload);
        break;
      case 'cat':
        if (task.action === 'delete') {
          await (storage as any)._deleteCatFromServer(username, task.id);
        } else {
          await (storage as any)._syncCatToServer(username, task.payload);
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
