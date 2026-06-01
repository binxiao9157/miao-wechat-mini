const { getItem, setItem, removeItem } = require('../utils/storage');
const { STORAGE_KEYS } = require('../types/models');

class SyncQueue {
  constructor() {
    this.tasks = new Map();
    this.hydrated = false;
  }

  getTaskKey(task) {
    return task.id ? `${task.type}:${task.id}` : task.type;
  }

  hydrate() {
    if (this.hydrated) return;
    this.hydrated = true;
    const raw = getItem(STORAGE_KEYS.PENDING_SYNC_TASKS);
    if (!raw) return;
    try {
      const tasks = JSON.parse(raw);
      if (!Array.isArray(tasks)) return;
      tasks.forEach((task) => {
        if (task && task.type && task.action) {
          this.tasks.set(this.getTaskKey(task), task);
        }
      });
    } catch {
      removeItem(STORAGE_KEYS.PENDING_SYNC_TASKS);
    }
  }

  persist() {
    const tasks = Array.from(this.tasks.values());
    if (tasks.length === 0) {
      removeItem(STORAGE_KEYS.PENDING_SYNC_TASKS);
      return;
    }
    setItem(STORAGE_KEYS.PENDING_SYNC_TASKS, JSON.stringify(tasks));
  }

  enqueue(task) {
    this.hydrate();
    const key = this.getTaskKey(task);
    const previous = this.tasks.get(key) || {};
    this.tasks.set(key, {
      ...previous,
      ...task,
      retries: Number((task && task.retries) || previous.retries || 0),
      createdAt: task.createdAt || previous.createdAt || Date.now(),
      updatedAt: Date.now()
    });
    this.persist();
  }

  remove(task) {
    this.hydrate();
    this.tasks.delete(this.getTaskKey(task));
    this.persist();
  }

  list() {
    this.hydrate();
    return Array.from(this.tasks.values());
  }

  async process(handlers = {}) {
    this.hydrate();
    const results = [];
    for (const task of this.list()) {
      const handler = handlers[`${task.type}:${task.action}`] || handlers[task.type];
      if (!handler) continue;
      try {
        await handler(task);
        this.tasks.delete(this.getTaskKey(task));
        results.push({ task, status: 'fulfilled' });
      } catch (error) {
        const nextTask = {
          ...task,
          retries: Number(task.retries || 0) + 1,
          lastError: error.message || '同步失败',
          lastTriedAt: Date.now(),
          updatedAt: Date.now()
        };
        this.tasks.set(this.getTaskKey(task), nextTask);
        results.push({ task: nextTask, status: 'rejected', reason: error });
      }
    }
    this.persist();
    return results;
  }

  clear() {
    this.tasks.clear();
    this.persist();
  }
}

const syncQueue = new SyncQueue();

module.exports = {
  syncQueue,
  SyncQueue
};
