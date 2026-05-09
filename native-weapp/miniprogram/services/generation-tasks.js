const { getItem, setItem, removeItem } = require('../utils/storage');
const { authService } = require('./auth');
const { userScopedKey } = require('../types/models');

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function scopedKey(key) {
  const user = authService.getCachedUser();
  return user && user.username ? userScopedKey(user.username, key) : key;
}

function taskKey(catId, action) {
  return `${catId}:${action}`;
}

const generationTasks = {
  getAll() {
    return parseJson(getItem(scopedKey('miao_generation_tasks')), {});
  },

  saveAll(tasks) {
    setItem(scopedKey('miao_generation_tasks'), JSON.stringify(tasks || {}));
  },

  get(catId, action) {
    return this.getAll()[taskKey(catId, action)] || null;
  },

  upsert(task) {
    if (!task || !task.catId || !task.action) return null;
    const tasks = this.getAll();
    const key = taskKey(task.catId, task.action);
    const next = {
      ...(tasks[key] || {}),
      ...task,
      updatedAt: Date.now()
    };
    tasks[key] = next;
    this.saveAll(tasks);
    return next;
  },

  clear(catId, action) {
    const tasks = this.getAll();
    delete tasks[taskKey(catId, action)];
    this.saveAll(tasks);
  },

  clearCat(catId) {
    const tasks = this.getAll();
    Object.keys(tasks).forEach((key) => {
      if (key.startsWith(`${catId}:`)) delete tasks[key];
    });
    this.saveAll(tasks);
  },

  getPendingForCat(catId) {
    return Object.values(this.getAll()).filter((task) => {
      return task.catId === catId && task.status !== 'succeeded' && task.status !== 'failed';
    });
  },

  clearUserCache() {
    removeItem(scopedKey('miao_generation_tasks'));
  }
};

module.exports = {
  generationTasks
};
