import { beforeEach, vi } from 'vitest';

const { eventHandlers, memoryStorage } = vi.hoisted(() => ({
  eventHandlers: new Map<string, Set<(...args: any[]) => void>>(),
  memoryStorage: new Map<string, string>(),
}));

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memoryStorage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memoryStorage.set(key, value);
    },
    removeItem: (key: string) => {
      memoryStorage.delete(key);
    },
    clear: () => {
      memoryStorage.clear();
    },
    key: (index: number) => Array.from(memoryStorage.keys())[index] ?? null,
    get length() {
      return memoryStorage.size;
    },
  },
});

vi.mock('@tarojs/taro', () => ({
  default: {
    ENV_TYPE: { WEAPP: 'WEAPP', WEB: 'WEB' },
    getEnv: vi.fn(() => 'WEB'),
    request: vi.fn(),
    uploadFile: vi.fn(),
    getPrivacySetting: vi.fn(),
    requirePrivacyAuthorize: vi.fn(),
    showModal: vi.fn(),
    showToast: vi.fn(),
    navigateTo: vi.fn(async () => undefined),
    navigateBack: vi.fn(async () => undefined),
    redirectTo: vi.fn(async () => undefined),
    switchTab: vi.fn(async () => undefined),
    getCurrentPages: vi.fn(() => [{ route: 'pages/edit-profile/index' }]),
    chooseImage: vi.fn(),
    chooseMedia: vi.fn(),
    scanCode: vi.fn(),
    saveImageToPhotosAlbum: vi.fn(),
    saveVideoToPhotosAlbum: vi.fn(),
    compressImage: vi.fn(),
    login: vi.fn(async () => ({ code: 'test-login-code' })),
    checkSession: vi.fn(async () => undefined),
    reLaunch: vi.fn(async () => undefined),
    eventCenter: {
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        if (!eventHandlers.has(event)) eventHandlers.set(event, new Set());
        eventHandlers.get(event)!.add(handler);
      }),
      off: vi.fn((event: string, handler: (...args: any[]) => void) => {
        eventHandlers.get(event)?.delete(handler);
      }),
      trigger: vi.fn((event: string, data?: any) => {
        eventHandlers.get(event)?.forEach(handler => handler(data));
      }),
    },
  },
}));

beforeEach(() => {
  eventHandlers.clear();
  memoryStorage.clear();
});
