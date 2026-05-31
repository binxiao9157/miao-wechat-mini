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

  const response = await post('/api/v1/security/text', {
    content: normalized,
    scene,
  }, { timeout: 30000 });
  assertSafeResponse(response.data);
}

export async function checkMediaContent(
  mediaUrl: string | undefined | null,
  mediaType: MediaSafetyType,
  scene: ContentSafetyScene
): Promise<void> {
  if (!mediaUrl) return;

  if (isLocalMediaPath(mediaUrl)) {
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
    return;
  }

  const response = await post('/api/v1/security/media', {
    mediaUrl,
    mediaType,
    scene,
  }, { timeout: 60000 });
  assertSafeResponse(response.data);
}

export const contentSafetyService = {
  checkTextContent,
  checkMediaContent,
};

export default contentSafetyService;
