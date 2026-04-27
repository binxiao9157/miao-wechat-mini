import Taro from '@tarojs/taro';

const DB_NAME = 'miao_media_db';
const STORE_NAME = 'media';
const DB_VERSION = 1;

export const mediaStorage = {
  db: null as any,

  async init(): Promise<any> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = (Taro as any).getEnv() === Taro.ENV_TYPE.WEB
        ? (window as any).indexedDB.open(DB_NAME, DB_VERSION)
        : null;

      if (!request) {
        resolve(null);
        return;
      }

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event: any) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  },

  async saveMedia(id: string, data: string): Promise<void> {
    const env = (Taro as any).getEnv();
    if (env === Taro.ENV_TYPE.WEB) {
      const db = await this.init();
      if (!db) return;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(data, id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } else {
      const fs = Taro.getFileSystemManager();
      const filePath = `${Taro.env.USER_DATA_PATH}/media_${id}`;
      const base64Data = data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Taro.base64ToArrayBuffer(base64Data);
      await fs.writeFile({ filePath, data: buffer, encoding: 'binary' });
    }
  },

  async getMedia(id: string): Promise<string | null> {
    const env = (Taro as any).getEnv();
    if (env === Taro.ENV_TYPE.WEB) {
      const db = await this.init();
      if (!db) return null;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } else {
      try {
        const fs = Taro.getFileSystemManager();
        const filePath = `${Taro.env.USER_DATA_PATH}/media_${id}`;
        const { data } = await fs.readFile({ filePath, encoding: 'binary' });
        const base64 = Taro.arrayBufferToBase64(data);
        return `data:image/jpeg;base64,${base64}`;
      } catch {
        return null;
      }
    }
  },

  async deleteMedia(id: string): Promise<void> {
    const env = (Taro as any).getEnv();
    if (env === Taro.ENV_TYPE.WEB) {
      const db = await this.init();
      if (!db) return;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } else {
      try {
        const fs = Taro.getFileSystemManager();
        const filePath = `${Taro.env.USER_DATA_PATH}/media_${id}`;
        await fs.unlink({ filePath });
      } catch {}
    }
  }
};