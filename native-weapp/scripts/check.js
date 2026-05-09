const fs = require('fs');
const path = require('path');

function walk(dir, predicate, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, predicate, out);
    } else if (predicate(fullPath)) {
      out.push(fullPath);
    }
  }
  return out;
}

const jsonFiles = [
  'native-weapp/project.config.json',
  ...walk('native-weapp/miniprogram', (file) => file.endsWith('.json'))
];

for (const file of jsonFiles) {
  JSON.parse(fs.readFileSync(file, 'utf8'));
}

const appConfig = JSON.parse(fs.readFileSync('native-weapp/miniprogram/app.json', 'utf8'));
const declaredPages = new Set(appConfig.pages || []);
for (const page of appConfig.pages || []) {
  for (const ext of ['js', 'json', 'wxml', 'wxss']) {
    const file = path.join('native-weapp/miniprogram', `${page}.${ext}`);
    if (!fs.existsSync(file)) {
      throw new Error(`missing page file: ${file}`);
    }
  }
}

for (const componentPath of Object.values(appConfig.usingComponents || {})) {
  const normalized = componentPath.replace(/^\//, '');
  for (const ext of ['js', 'json', 'wxml', 'wxss']) {
    const file = path.join('native-weapp/miniprogram', `${normalized}.${ext}`);
    if (!fs.existsSync(file)) {
      throw new Error(`missing component file: ${file}`);
    }
  }
}

const routePattern = /\/pages\/[A-Za-z0-9_-]+\/index/g;
for (const file of walk('native-weapp/miniprogram', (item) => /\.(js|wxml)$/.test(item))) {
  const content = fs.readFileSync(file, 'utf8');
  const routes = content.match(routePattern) || [];
  for (const route of routes) {
    const page = route.replace(/^\//, '');
    if (!declaredPages.has(page)) {
      throw new Error(`undeclared route ${route} in ${file}`);
    }
  }
}

global.wx = {
  env: { USER_DATA_PATH: '/tmp' },
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
  login: () => {},
  setClipboardData: () => {},
  scanCode: () => {},
  showModal: () => {},
  getSystemInfoSync: () => ({ statusBarHeight: 0 }),
  showToast: () => {}
};

global.App = (config) => {
  if (!config || typeof config.onLaunch !== 'function') {
    throw new Error('invalid app config');
  }
};

global.Page = (config) => {
  if (!config || typeof config !== 'object') {
    throw new Error('invalid page config');
  }
};

global.Component = (config) => {
  if (!config || typeof config !== 'object') {
    throw new Error('invalid component config');
  }
};

global.getCurrentPages = () => [];
global.getApp = () => ({
  globalData: {
    user: null,
    isAuthenticated: false,
    isInitializing: false
  }
});

const modules = walk('native-weapp/miniprogram', (file) => file.endsWith('.js'))
  .sort((a, b) => {
    if (a.endsWith('app.js')) return -1;
    if (b.endsWith('app.js')) return 1;
    return a.localeCompare(b);
  });

for (const file of modules) {
  require(path.resolve(file));
}

console.log(`native scaffold ok: ${jsonFiles.length} json files, ${modules.length} modules`);
