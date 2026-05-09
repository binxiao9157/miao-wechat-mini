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
    this.tasks.set(this.getTaskKey(task), { ...task, retries: task.retries || 0 });
    this.persist();
  }

  list() {
    this.hydrate();
    return Array.from(this.tasks.values());
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
