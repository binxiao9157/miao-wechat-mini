import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('storage release audit sync behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.doMock('../../utils/httpAdapter', () => ({
      request: vi.fn(async () => ({ data: { success: true } })),
    }));
    vi.doMock('../../utils/uploadAdapter', () => ({
      uploadFile: vi.fn(async () => ({ url: '/uploads/media/diary-1.mp4' })),
    }));
  });

  it('syncs cat first-frame metadata to the backend', async () => {
    const httpAdapter = await import('../../utils/httpAdapter');
    const { serverSync } = await import('../storage');

    await serverSync.syncCatToServer('alice', {
      id: 'cat-1',
      name: 'Miao',
      breed: '狸花',
      color: 'brown',
      avatar: 'https://cdn.example.com/cat.png',
      placeholderImage: 'https://cdn.example.com/placeholder.png',
      anchorFrame: 'https://cdn.example.com/anchor.png',
      source: 'uploaded',
      createdAt: 1,
    });

    expect(httpAdapter.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/api/v1/cats',
      method: 'POST',
      data: {
        cat: expect.objectContaining({
          placeholderImage: 'https://cdn.example.com/placeholder.png',
          anchorFrame: 'https://cdn.example.com/anchor.png',
        }),
      },
    }));
  });

  it('uploads local diary media before syncing instead of posting video base64 JSON', async () => {
    const httpAdapter = await import('../../utils/httpAdapter');
    const uploadAdapter = await import('../../utils/uploadAdapter');
    const { mediaStorage, serverSync } = await import('../storage');

    await mediaStorage.saveMediaFile('diary-1', 'wxfile://tmp/diary.mp4', 'video/mp4');
    await serverSync.syncDiaryToServer('alice', {
      id: 'diary-1',
      catId: 'cat-1',
      content: 'hello',
      media: 'miao_media:diary-1',
      mediaType: 'video',
      createdAt: 1,
      likes: 0,
      isLiked: false,
      comments: [],
    });

    expect(uploadAdapter.uploadFile).toHaveBeenCalledWith(expect.objectContaining({
      url: '/api/v1/upload',
      filePath: 'wxfile://tmp/diary.mp4',
      formData: expect.objectContaining({
        purpose: 'diary',
        mediaType: 'video',
      }),
    }));
    expect(httpAdapter.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/api/v1/diaries',
      method: 'POST',
      data: {
        diary: expect.objectContaining({
          media: '/uploads/media/diary-1.mp4',
        }),
      },
    }));
  });

  it('uploads every local diary image before syncing multi-image diaries', async () => {
    const httpAdapter = await import('../../utils/httpAdapter');
    const uploadAdapter = await import('../../utils/uploadAdapter');
    const { mediaStorage, serverSync } = await import('../storage');

    vi.mocked(uploadAdapter.uploadFile).mockImplementation(async ({ filePath }: any) => {
      const name = String(filePath).includes('img-2') ? 'img-2.jpg' : 'img-1.jpg';
      return { url: `/uploads/media/${name}` };
    });

    await mediaStorage.saveMediaFile('img-1', 'wxfile://tmp/img-1.jpg', 'image/jpeg');
    await mediaStorage.saveMediaFile('img-2', 'wxfile://tmp/img-2.jpg', 'image/jpeg');

    await serverSync.syncDiaryToServer('alice', {
      id: 'diary-images',
      catId: 'cat-1',
      content: 'three photos',
      media: 'miao_media:img-1',
      mediaType: 'image',
      images: ['miao_media:img-1', 'miao_media:img-2'],
      createdAt: 1,
      likes: 0,
      isLiked: false,
      comments: [],
    });

    expect(uploadAdapter.uploadFile).toHaveBeenCalledTimes(2);
    expect(uploadAdapter.uploadFile).toHaveBeenNthCalledWith(1, expect.objectContaining({
      url: '/api/v1/upload',
      filePath: 'wxfile://tmp/img-1.jpg',
      formData: expect.objectContaining({
        purpose: 'diary',
        mediaType: 'image',
      }),
    }));
    expect(uploadAdapter.uploadFile).toHaveBeenNthCalledWith(2, expect.objectContaining({
      url: '/api/v1/upload',
      filePath: 'wxfile://tmp/img-2.jpg',
      formData: expect.objectContaining({
        purpose: 'diary',
        mediaType: 'image',
      }),
    }));
    expect(httpAdapter.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/api/v1/diaries',
      method: 'POST',
      data: {
        diary: expect.objectContaining({
          media: '/uploads/media/img-1.jpg',
          images: ['/uploads/media/img-1.jpg', '/uploads/media/img-2.jpg'],
        }),
      },
    }));
  });
});
