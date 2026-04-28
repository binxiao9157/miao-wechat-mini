import Taro from '@tarojs/taro';
import { request, get } from '../utils/httpAdapter';

export const VolcanoConfig = {
  get MOCK_MODE() {
    return false;
  },
  get ModelId() {
    return "wan2.2-i2v-flash";
  },
  get T2IModelId() {
    return "qwen-image-2.0";
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

export class VolcanoService {
  public static async submitTask(imageBase64: string, prompt?: string, retries: number = 2) {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: 'mock_task_' + Date.now() };
    }

    let lastError: any;
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await request({
          url: "/api/generate-video",
          method: 'POST',
          timeout: 90000,
          data: {
            model: VolcanoConfig.ModelId,
            prompt: prompt || "A high quality video of this cat, cinematic lighting, realistic.",
            image_base64: imageBase64,
            parameters: {
              seed: 12345,
              resolution: "480p",
              duration: 5,
              audio: false
            }
          }
        });

        const taskId = response?.data?.id || response?.data?.task_id;
        if (!taskId) {
          throw new Error("服务器返回数据格式错误，未获取到任务 ID");
        }

        return { ...response, id: taskId };
      } catch (error: any) {
        lastError = error;
        // 只对网络错误重试，HTTP 错误（有 response）和应用错误直接终止
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
        return {
          status: 'succeeded',
          content: {
            video_url: 'https://www.w3schools.com/html/mov_bbb.mp4'
          }
        };
      }
      return { status: 'running' };
    }

    try {
      const response = await get(`/api/video-status/${taskId}`);
      return response;
    } catch (error: any) {
      if (error.message?.includes('timeout')) {
        throw new Error("查询状态超时，请检查网络连接或稍后重试");
      }
      throw new Error(error.message || "查询失败");
    }
  }

  public static async submitImageTask(prompt: string, imageBase64?: string) {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: 'mock_img_task_' + Date.now() };
    }

    try {
      // 本地文件路径用 Taro.uploadFile，避免 base64 过大触发微信数据检查上限
      const isLocalFile = imageBase64 && !imageBase64.startsWith('') && !imageBase64.startsWith('http');
      if (isLocalFile) {
        const baseURL = process.env.TARO_APP_API_BASE_URL || 'https://your-server.com';
        const data = await new Promise<any>((resolve, reject) => {
          Taro.uploadFile({
            url: `${baseURL}/api/generate-image-file`,
            filePath: imageBase64!,
            name: 'image',
            formData: { prompt, model: VolcanoConfig.T2IModelId },
            success: (res) => {
              try { resolve(JSON.parse(res.data)); } catch { reject(new Error('响应解析失败')); }
            },
            fail: (err) => reject(new Error(err.errMsg || '上传失败')),
          });
        });
        const taskId = data?.id || data?.task_id;
        if (!taskId) throw new Error("文生图任务提交失败，未获取到 ID");
        return { id: taskId, image_url: data?.image_url, status: data?.status };
      }

      const response = await request({
        url: "/api/generate-image",
        method: 'POST',
         data: {
          prompt,
          image_base64: imageBase64,
          model: VolcanoConfig.T2IModelId
        }
      });

      const taskId = response?.data?.id || response?.data?.task_id;

      if (!taskId) {
        throw new Error("文生图任务提交失败，未获取到 ID");
      }

      return {
        id: taskId,
        image_url: response?.data?.image_url,
        status: response?.data?.status
      };
    } catch (error: any) {
      let errorMsg = "文生图提交失败";
      if (error?.message) {
        errorMsg = error.message;
      }
      throw new Error(errorMsg);
    }
  }

  public static async pollImageResult(taskId: string, initialUrl?: string, signal?: AbortSignal): Promise<string> {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return 'https://picsum.photos/seed/cat/800/800';
    }

    if (initialUrl) return initialUrl;
    if (taskId.startsWith('sync:')) {
      throw new Error("同步任务未提供图片地址");
    }
    const maxDelay = 10000;
    let delay = 2000;
    const startTime = Date.now();
    const maxWaitTimeMs = 120000;

    while (true) {
      if (signal?.aborted) throw new Error("任务中止");
      if (Date.now() - startTime > maxWaitTimeMs) throw new Error("图片生成超时");

      let result: any;
      try {
        const response = await get(`/api/image-status/${taskId}`);
        result = response;
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

        if (!videoUrl && result.response?.video?.uri) {
          videoUrl = result.response.video.uri;
        }

        if (videoUrl && (videoUrl.startsWith('http') || videoUrl.startsWith('/api'))) {
          return videoUrl;
        } else {
          throw new Error(`任务成功但未获取到有效的视频播放地址。`);
        }
      } else if (status === 'failed' || status === 'cancelled') {
        const errorDetail = result.error || result.message || "未知错误";
        const errorMsg = typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail);
        throw new Error(`任务失败 (${status}): ${errorMsg}`);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, maxDelay);
    }
  }
}