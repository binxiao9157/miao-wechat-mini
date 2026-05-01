import Taro from '@tarojs/taro';
import { request, get } from '../utils/httpAdapter';
import { uploadFile } from '../utils/uploadAdapter';

export const VolcanoConfig = {
  get MOCK_MODE() {
    return false;
  },
  get Provider() {
    return "volcengine";
  },
  get ModelId() {
    return "doubao-seedance-1-5-pro-251215";
  },
  get T2IModelId() {
    return "doubao-seedream-4-5-251128";
  },
};

export const ACTION_PROMPTS = {
  idle: "一只可爱的猫咪蹲坐在温馨的房间里，正视镜头。它缓慢站起来，走向镜头轻轻蹭了一下，然后退回到原来的位置蹲好。画面清晰，光影真实，竖屏构图。",
  tail: "特写猫咪的面部。一只手轻轻抚摸猫咪的头顶，猫咪舒服地眯起眼睛。随后镜头拉远，猫咪保持蹲坐姿态。细节丰富。",
  rubbing: "聚焦猫咪的前爪。猫咪左右交替踩奶，看起来非常放松和舒适。随后它停止动作，静静地蹲坐在原地。",
  blink: "猫咪兴奋地看着镜头。主人拿着羽毛逗猫棒在旁边晃动，猫咪抬头挥动爪子尝试捕捉。随后逗猫棒移开，猫咪恢复安静蹲坐。"
};

export const IMAGE_PROMPTS = {
  anchor: (breed: string, color: string) =>
    `A ultra-realistic, high-detail portrait of a ${breed} cat with ${color} fur, sitting comfortably in a soft cat nest, cinematic lighting, 4k resolution, looking at the camera.`
};

// base64 数据 URL 写入临时文件，返回临时文件路径，避免通过 JSON 传输过大数据
function dataUrlToTempFile(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('无效的 base64 数据 URL');
  const ext = match[1].split('/')[1] || 'jpg';
  const base64Data = match[2];
  const tempPath = `${Taro.env.USER_DATA_PATH}/upload_${Date.now()}.${ext}`;
  Taro.getFileSystemManager().writeFileSync(tempPath, base64Data, 'base64');
  return tempPath;
}

// 判断是否为微信本地文件路径（需要 uploadFile 上传）
function isLocalFilePath(path: string): boolean {
  if (path.startsWith('https://')) return false; // 真实 CDN URL
  return true; // wxfile://、http://tmp/ 等微信本地路径
}

// 获取可上传的文件路径：
// -  base64 URL → 写入临时文件，返回路径
// - 本地路径（wxfile://、http://tmp/）→ 直接返回
// - https:// CDN URL → 返回 null，走 JSON 请求
function getUploadPath(image: string): string | null {
  if (image.startsWith('data:')) {
    return dataUrlToTempFile(image);
  }
  if (isLocalFilePath(image)) {
    return image;
  }
  return null;
}

export class VolcanoService {
  public static async submitTask(imageBase64: string, prompt?: string, retries: number = 2) {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: 'mock_task_' + Date.now() };
    }

    // data: URL 或本地路径改用 uploadFile，避免 base64 过大触发微信数据检查上限
    const uploadPath = getUploadPath(imageBase64);
    if (uploadPath) {
      const data = await uploadFile({
        url: '/api/v1/ai/tasks-file',
        filePath: uploadPath,
        name: 'image',
        formData: {
          type: 'video',
          provider: VolcanoConfig.Provider,
          model: VolcanoConfig.ModelId,
          prompt: prompt || "A high quality video of this cat, cinematic lighting, realistic.",
          seed: '12345',
          resolution: '480p',
          duration: '5',
          audio: 'false',
        },
      });
      const taskId = data?.id || data?.task_id;
      if (!taskId) throw new Error("服务器返回数据格式错误，未获取到任务 ID");
      return { ...data, id: taskId };
    }

    let lastError: any;
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await request({
          url: "/api/v1/ai/tasks",
          method: 'POST',
          timeout: 90000,
          data: {
            type: 'video',
            provider: VolcanoConfig.Provider,
            model: VolcanoConfig.ModelId,
            prompt: prompt || "A high quality video of this cat, cinematic lighting, realistic.",
            image_base64: imageBase64,
            parameters: { seed: 12345, resolution: "480p", duration: 5, audio: false }
          }
        });
        const taskId = response?.data?.id || response?.data?.task_id;
        if (!taskId) throw new Error("服务器返回数据格式错误，未获取到任务 ID");
        return { ...response.data, id: taskId };
      } catch (error: any) {
        lastError = error;
        const isRetryable = !error.response && error.message?.includes('网络请求失败');
        if (!isRetryable || i === retries) break;
        console.warn(`提交任务失败，正在进行第 ${i + 1} 次重试...`, error.message);
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
      }
    }

    const error = lastError;
    if (error?.response?.data) {
      const data = error.response.data;
      throw new Error(data.message || data.error || '提交失败');
    }
    throw new Error(error?.message || '未知错误');
  }

  public static async getTaskResult(taskId: string) {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const progress = Math.random();
      if (progress > 0.8) {
        return { status: 'succeeded', content: { video_url: 'https://www.w3schools.com/html/mov_bbb.mp4' } };
      }
      return { status: 'running' };
    }
    try {
      const response = await get(`/api/v1/ai/tasks/${taskId}?type=video&provider=${VolcanoConfig.Provider}`, { timeout: 60000 });
      return response.data;
    } catch (error: any) {
      if (error.message?.includes('timeout')) throw new Error("查询状态超时，请检查网络连接或稍后重试");
      throw new Error(error.message || "查询失败");
    }
  }

  public static async submitImageTask(prompt: string, imageBase64?: string) {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: 'mock_img_task_' + Date.now() };
    }

    try {
      //  URL 或本地路径改用 uploadFile，避免 base64 过大触发微信数据检查上限
      const uploadPath = imageBase64 ? getUploadPath(imageBase64) : null;
      if (uploadPath) {
        const data = await uploadFile({
          url: '/api/v1/ai/tasks-file',
          filePath: uploadPath,
          name: 'image',
          formData: {
            type: 'image',
            provider: VolcanoConfig.Provider,
            prompt,
            model: VolcanoConfig.T2IModelId,
          },
        });
        const taskId = data?.id || data?.task_id;
        if (!taskId) throw new Error("文生图任务提交失败，未获取到 ID");
        return { id: taskId, image_url: data?.image_url, status: data?.status };
      }

      const response = await request({
        url: "/api/v1/ai/tasks",
        method: 'POST',
        data: { type: 'image', provider: VolcanoConfig.Provider, prompt, image_base64: imageBase64, model: VolcanoConfig.T2IModelId }
      });
      const taskId = response?.data?.id || response?.data?.task_id;
      if (!taskId) throw new Error("文生图任务提交失败，未获取到 ID");
      return { id: taskId, image_url: response?.data?.image_url, status: response?.data?.status };
    } catch (error: any) {
      throw new Error(error?.message || "文生图提交失败");
    }
  }

  public static async pollImageResult(taskId: string, initialUrl?: string, signal?: AbortSignal): Promise<string> {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return 'https://picsum.photos/seed/cat/800/800';
    }

    if (initialUrl) return initialUrl;
    if (taskId.startsWith('sync:')) throw new Error("同步任务未提供图片地址");

    const maxDelay = 10000;
    let delay = 2000;
    const startTime = Date.now();
    const maxWaitTimeMs = 120000;

    while (true) {
      if (signal?.aborted) throw new Error("任务中止");
      if (Date.now() - startTime > maxWaitTimeMs) throw new Error("图片生成超时");

      let result: any;
      try {
        const response = await get(`/api/v1/ai/tasks/${taskId}?type=image&provider=${VolcanoConfig.Provider}`, { timeout: 60000 });
        result = response.data;
      } catch (error: any) {
        if (signal?.aborted) throw new Error("任务中止");
        console.warn("Polling encountered network/server error, retrying...", error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, maxDelay);
        continue;
      }

      if (result.status === 'succeeded') {
        const imageUrl = result.output?.image_url || result.data?.image_url || result.image_url;
        if (imageUrl) return imageUrl;
        throw new Error("任务成功但未获取到图片地址");
      } else if (result.status === 'failed') {
        const errorInfo = result.error || result.message || "未知错误";
        throw new Error(`图片生成失败: ${typeof errorInfo === 'string' ? errorInfo : JSON.stringify(errorInfo)}`);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, maxDelay);
    }
  }

  public static async pollTaskResult(
    taskId: string,
    onProgress?: (status: string) => void,
    signal?: AbortSignal,
    maxWaitTimeMs: number = 300000
  ): Promise<string> {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      return 'https://www.w3schools.com/html/mov_bbb.mp4';
    }

    let delay = 3000;
    const maxDelay = 15000;
    const startTime = Date.now();

    while (true) {
      if (signal?.aborted) throw new Error("任务轮询已中止");
      if (Date.now() - startTime > maxWaitTimeMs) throw new Error("任务轮询超时 (5分钟)");

      let result: any;
      try {
        result = await this.getTaskResult(taskId);
      } catch (error: any) {
        if (signal?.aborted) throw new Error("任务轮询已中止");
        console.warn("Polling encountered error, retrying...", error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, maxDelay);
        continue;
      }

      const status = result.status;
      if (onProgress) onProgress(status);

      if (status === 'succeeded') {
        let videoUrl =
          result.output?.video_url ||
          result.content?.video_url ||
          result.data?.video_url ||
          result.video_url;

        if (!videoUrl && result.response?.video?.uri) videoUrl = result.response.video.uri;

        if (videoUrl && (videoUrl.startsWith('http') || videoUrl.startsWith('/api'))) {
          return videoUrl;
        }
        throw new Error('任务成功但未获取到有效的视频播放地址。');
      } else if (status === 'failed' || status === 'cancelled') {
        const errorDetail = result.error || result.message || "未知错误";
        throw new Error(`任务失败 (${status}): ${typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail)}`);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, maxDelay);
    }
  }
}
