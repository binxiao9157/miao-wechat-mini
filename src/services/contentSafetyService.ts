import { post } from '../utils/httpAdapter';
import { uploadFile } from '../utils/uploadAdapter';

export type ContentSafetyScene =
  | 'cat_profile'
  | 'cat_upload'
  | 'comment'
  | 'diary'
  | 'feedback'
  | 'profile'
  | 'time_letter';

export type MediaSafetyType = 'image' | 'video';

function normalizeSafetyMessage(data: any): string {
  return data?.message || data?.error || '内容包含不合规信息，请修改后再提交';
}

function assertSafeResponse(data: any): void {
  if (!data) return;
  if (data.passed === false || data.safe === false || data.errcode > 0) {
    throw new Error(normalizeSafetyMessage(data));
  }
}

function isSafetyServiceUnavailable(error: any): boolean {
  const status = Number(error?.response?.status || error?.statusCode || 0);
  if (status === 404 || status >= 500) return true;
  if (status === 401 || status === 403) return false;

  const message = String(error?.message || error?.errMsg || '').toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('network') ||
    message.includes('interrupted') ||
    message.includes('上传被中断') ||
    message.includes('fail socket') ||
    message.includes('fail connection') ||
    message.includes('fail abort') ||
    message.includes('网络请求失败') ||
    message.includes('请求超时')
  );
}

function isLocalMediaPath(path: string): boolean {
  return (
    path.startsWith('wxfile://') ||
    path.startsWith('file://') ||
    path.startsWith('http://tmp/') ||
    path.startsWith('http://usr/') ||
    path.startsWith('data:')
  );
}

export async function checkTextContent(content: string, scene: ContentSafetyScene): Promise<void> {
  const normalized = content.trim();
  if (!normalized) return;

  try {
    const response = await post('/api/v1/security/text', {
      content: normalized,
      scene,
    }, { timeout: 30000 });
    assertSafeResponse(response.data);
  } catch (error) {
    if (isSafetyServiceUnavailable(error)) {
      console.warn('[contentSafetyService] text safety service unavailable, allowing local publish:', error);
      return;
    }
    throw error;
  }
}

export async function checkMediaContent(
  mediaUrl: string | undefined | null,
  mediaType: MediaSafetyType,
  scene: ContentSafetyScene
): Promise<void> {
  if (!mediaUrl) return;

  if (isLocalMediaPath(mediaUrl)) {
    try {
      const data = await uploadFile({
        url: '/api/v1/security/media-file',
        filePath: mediaUrl,
        name: 'media',
        formData: {
          mediaType,
          scene,
        },
        timeout: 120000,
        retries: 1,
      });
      assertSafeResponse(data);
    } catch (error) {
      if (isSafetyServiceUnavailable(error)) {
        console.warn('[contentSafetyService] media safety service unavailable, allowing local publish:', error);
        return;
      }
      throw error;
    }
    return;
  }

  try {
    const response = await post('/api/v1/security/media', {
      mediaUrl,
      mediaType,
      scene,
    }, { timeout: 60000 });
    assertSafeResponse(response.data);
  } catch (error) {
    if (isSafetyServiceUnavailable(error)) {
      console.warn('[contentSafetyService] media safety service unavailable, allowing local publish:', error);
      return;
    }
    throw error;
  }
}

export const contentSafetyService = {
  checkTextContent,
  checkMediaContent,
};

export default contentSafetyService;
