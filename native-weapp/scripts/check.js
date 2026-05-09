const fs = require('fs');

const jsonFiles = [
  'native-weapp/project.config.json',
  'native-weapp/miniprogram/app.json',
  'native-weapp/miniprogram/sitemap.json',
  'native-weapp/miniprogram/pages/bootstrap/index.json'
];

for (const file of jsonFiles) {
  JSON.parse(fs.readFileSync(file, 'utf8'));
}

global.wx = {
  getStorageSync: () => '',
  setStorageSync: () => {},
  removeStorageSync: () => {},
  clearStorageSync: () => {},
  getStorageInfoSync: () => ({ keys: [] }),
  request: () => {},
  uploadFile: () => {},
  navigateTo: () => {},
  redirectTo: () => {},
  switchTab: () => {},
  reLaunch: () => {},
  navigateBack: () => {},
  getSystemInfoSync: () => ({ statusBarHeight: 0 }),
  showToast: () => {}
};

global.App = (config) => {
  if (!config || typeof config.onLaunch !== 'function') {
    throw new Error('invalid app config');
  }
};

global.Page = (config) => {
  if (!config || !config.data) {
    throw new Error('invalid page config');
  }
};

global.getCurrentPages = () => [];

const modules = [
  '../miniprogram/utils/storage.js',
  '../miniprogram/utils/event-bus.js',
  '../miniprogram/utils/request.js',
  '../miniprogram/utils/upload.js',
  '../miniprogram/utils/nav.js',
  '../miniprogram/services/auth.js',
  '../miniprogram/services/sync-queue.js',
  '../miniprogram/services/sync-manager.js',
  '../miniprogram/app.js',
  '../miniprogram/pages/bootstrap/index.js'
];

for (const file of modules) {
  require(file);
}

console.log(`native scaffold ok: ${jsonFiles.length} json files, ${modules.length} modules`);
