import { isWeChat, isMobile, setClipboard } from '../utils/platformAdapter';

export interface ShareOptions {
  title: string;
  text: string;
  url: string;
}

export const shareService = {
  isWeChat,

  isMobile,

  copyToClipboard: async (text: string): Promise<boolean> => {
    return setClipboard(text);
  },

  share: async (options: ShareOptions): Promise<{ success: boolean; method: 'native' | 'wechat' | 'copy' }> => {
    if (shareService.isWeChat()) {
      return { success: true, method: 'wechat' };
    }

    if (shareService.isMobile() && navigator.share) {
      try {
        await navigator.share({
          title: options.title,
          text: options.text,
          url: options.url,
        });
        return { success: true, method: 'native' };
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return { success: false, method: 'native' };
        }
        console.error('原生分享失败:', err);
      }
    }

    const shareText = `${options.title}\n${options.text}\n${options.url}`;
    const copied = await shareService.copyToClipboard(shareText);
    return { success: copied, method: 'copy' };
  }
};