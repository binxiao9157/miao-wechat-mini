import Taro from '@tarojs/taro';
import { storage } from './storage';

type SyncTask = {
  type: 'diary' | 'letter' | 'points' | 'cat';
  id?: string;
  action: 'upsert' | 'delete';
  payload?: any;
  retries?: number;
};

class SyncQueue {
  private dirty = new Map<string, SyncTask>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 5000;
  private readonly MAX_RETRIES = 3;
  private flushing = false;

  enqueue(task: SyncTask) {
    const key = task.id ? `${task.type}:${task.id}` : task.type;
    this.dirty.set(key, { ...task, retries: task.retries ?? 0 });
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.DEBOUNCE_MS);
  }

  async flush() {
    if (this.flushing) {
      // 等待当前 flush 完成
      while (this.flushing) {
        await new Promise(r => setTimeout(r, 100));
      }
      return;
    }
    const tasks = Array.from(this.dirty.values());
    this.dirty.clear();
    this.timer = null;
    this.flushing = true;

    const username = storage.getUserInfo()?.username;
    if (!username) {
      this.flushing = false;
      return;
    }

    for (const task of tasks) {
      try {
        await this.executeTask(username, task);
      } catch {
        if ((task.retries ?? 0) < this.MAX_RETRIES) {
          this.enqueue({ ...task, retries: (task.retries ?? 0) + 1 });
        }
      }
    }
    this.flushing = false;

    // 如果 flush 期间有新任务入队，再调度一次
    if (this.dirty.size > 0) {
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