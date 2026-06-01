import Taro from '@tarojs/taro';
import { request, get } from '../utils/httpAdapter';
import { uploadFile } from '../utils/uploadAdapter';
import { aiConfig } from './aiConfig';

const MOCK_IMAGE_URL = 'miao-mock://image/cat-anchor';
const MOCK_VIDEO_URL = 'miao-mock://video/cat-action';

export const VolcanoConfig = {
  get MOCK_MODE() {
    return aiConfig.getProfile().mockMode;
  },
  get Provider() {
    return aiConfig.getProfile().provider;
  },
  get ModelId() {
    return aiConfig.getProfile().videoModel;
  },
  get T2IModelId() {
    return aiConfig.getProfile().imageModel;
  },
  get Resolution() {
    return aiConfig.getProfile().resolution;
  },
  get Duration() {
    return aiConfig.getProfile().duration;
  },
  get Seed() {
    return aiConfig.getProfile().seed;
  },
  get PromptExtend() {
    return aiConfig.getProfile().promptExtend;
  },
};

export interface VideoActionPrompt {
  prompt: string;
  duration: number;
}

export interface SubmitVideoTaskOptions {
  prompt?: string;
  firstFrame?: string;
  lastFrame?: string;
  hasLastFrame?: boolean;
  duration?: number;
  resolution?: string;
  seed?: number;
  promptExtend?: boolean;
  audio?: boolean;
  ratio?: string;
}

export const ACTION_PROMPTS = {
  v1_approach: {
    prompt: "第一人称固定视角，空间纵深感清晰，竖屏 9:16，480P，7 秒无音频，超写实风格，自然光影，种子值 12345。0-3.5 秒：猫咪轻巧跳下猫窝，步伐轻快从远景走向镜头正下方近景。3.5-6秒：镜头平滑下摇转为轻微俯视，地板上彩色毛线球完整入画。地板上不要有人脚鞋子等人体部位。6-7 秒：猫咪停在毛线球旁，一直抬头仰视镜头直到视频结束，眼神渴望期待；猫咪嘴部结构真实，无拟人化。全程猫咪身体完整，画面无裁切、无畸变。",
    duration: 7,
  },
  v2_wait: {
    prompt: "猫咪身体保持静止，仅有面部表情和眼神变化（包含轻轻张嘴叫唤时引起的面部表情、微表情和眼神闪烁变化），视频首尾两帧保持严格一致。嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；全程保证猫咪完整身体（含头部、躯干、四肢）始终在竖屏 9:16 画面内，静止无任何身体位移，无裁切、无出屏。超写实风格，竖屏 9:16，480P，4秒无音频，种子值 12345。",
    duration: 4,
  },
  v3_return: {
    prompt: "第一人称固定视角，明确空间纵深感，竖屏 9:16，480P，7 秒无音频，超写实风格，自然光影，种子值 12345。镜头起始轻微俯视，0-1.5秒猫咪低头转身，嘴巴细节真实无拟人化。1.5-4秒猫咪从近景慢慢走向猫窝，镜头平滑抬升至平视，固定展现房间纵深。4-5 秒猫咪跳上猫窝。5-7 秒猫咪转身并缓慢调整姿态，全程猫咪完整身体在画面内，无裁切、无畸变、无错位。",
    duration: 7,
  },
  v4_fetch: {
    prompt: "第一人称固定视角，明确空间纵深感，竖屏 9:16，480P，7 秒无音频，超写实风格，自然光影，种子值 12345。镜头起始轻微俯视，0-1.5 秒人类手从镜头底端伸入，握毛线球用力向前抛出，毛球沿符合物理规律的抛物线轨迹滚向远处猫窝；毛球抛出后，镜头平滑抬升至平视，固定展现房间纵深。1.5-3 秒猫咪从近景迅速跑向猫窝，精准叼起毛球，嘴巴细节真实无拟人化。3-5 秒猫咪转身跳上猫窝，放下毛球。5-7 秒猫咪缓慢调整姿态，全程猫咪完整身体在画面内，无裁切、无畸变、无错位。",
    duration: 7,
  },
} satisfies Record<string, VideoActionPrompt>;

export const IMAGE_PROMPTS = {
  anchor: (breed: string, color: string) =>
    `A ultra-realistic, high-detail portrait of a cat with ${color} fur${breed && breed !== '未知' ? `, ${breed} breed` : ''}, sitting comfortably in a soft cat nest, cinematic lighting, 4k resolution, looking at the camera. Do NOT render any text, watermark, or name on the image.`
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

function cleanupTempUploadFile(filePath: string | null) {
  if (!filePath || !filePath.includes('/upload_')) return;
  try {
    Taro.getFileSystemManager().unlinkSync(filePath);
  } catch (error) {
    console.warn('[volcanoService] cleanup temp upload file failed:', error);
  }
}

// 判断是否为微信本地文件路径（需要 uploadFile 上传）
function isLocalFilePath(path: string): boolean {
  if (!path) return false;
  if (/^https?:\/\//i.test(path)) {
    return path.startsWith('http://tmp/') || path.startsWith('http://usr/');
  }
  const userDataPath = Taro.env?.USER_DATA_PATH || '';
  return (
    path.startsWith('wxfile://') ||
    path.startsWith('file://') ||
    (!!userDataPath && path.startsWith(userDataPath))
  );
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

function abortableDelay(ms: number, signal?: AbortSignal, abortMessage = '任务中止'): Promise<void> {
  if (signal?.aborted) return Promise.reject(new Error(abortMessage));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(new Error(abortMessage));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export class VolcanoService {
  public static async submitTask(
    imageBase64: string,
    promptOrOptions?: string | SubmitVideoTaskOptions,
    retries: number = 2
  ) {
    const options: SubmitVideoTaskOptions = typeof promptOrOptions === 'string'
      ? { prompt: promptOrOptions }
      : (promptOrOptions || {});
    const prompt = options.prompt || "A high quality video of this cat, cinematic lighting, realistic.";
    const firstFrame = options.firstFrame || imageBase64;
    const lastFrame = options.lastFrame;
    const hasLastFrame = options.hasLastFrame || !!lastFrame;
    const duration = options.duration ?? VolcanoConfig.Duration;
    const resolution = options.resolution || VolcanoConfig.Resolution;
    const seed = options.seed ?? VolcanoConfig.Seed;
    const promptExtend = options.promptExtend ?? VolcanoConfig.PromptExtend;
    const audio = options.audio ?? false;

    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: 'mock_task_' + Date.now() };
    }

    // data: URL 或本地路径改用 uploadFile，避免 base64 过大触发微信数据检查上限
    const uploadPath = getUploadPath(imageBase64);
    if (uploadPath) {
      try {
        const formData: Record<string, string> = {
          type: 'video',
          provider: VolcanoConfig.Provider,
          model: VolcanoConfig.ModelId,
          prompt,
          seed: String(seed),
          resolution,
          duration: String(duration),
          prompt_extend: String(promptExtend),
          audio: String(audio),
        };
        if (lastFrame) formData.last_frame = lastFrame;
        if (hasLastFrame) formData.has_last_frame = 'true';
        if (options.ratio) formData.ratio = options.ratio;

        const data = await uploadFile({
          url: '/api/v1/ai/tasks-file',
          filePath: uploadPath,
          name: 'image',
          formData,
        });
        const taskId = data?.id || data?.task_id;
        if (!taskId) throw new Error("服务器返回数据格式错误，未获取到任务 ID");
        return { ...data, id: taskId };
      } finally {
        cleanupTempUploadFile(uploadPath);
      }
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
            prompt,
            image_base64: imageBase64,
            first_frame: firstFrame,
            ...(lastFrame ? { last_frame: lastFrame } : {}),
            ...(hasLastFrame ? { has_last_frame: true } : {}),
            ...(options.ratio ? { ratio: options.ratio } : {}),
            parameters: {
              seed,
              resolution,
              duration,
              prompt_extend: promptExtend,
              audio,
              ...(options.ratio ? { ratio: options.ratio } : {}),
            }
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
        return { status: 'succeeded', content: { video_url: MOCK_VIDEO_URL } };
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
        try {
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
        } finally {
          cleanupTempUploadFile(uploadPath);
        }
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
      return MOCK_IMAGE_URL;
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
        await abortableDelay(delay, signal, '任务中止');
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

      await abortableDelay(delay, signal, '任务中止');
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
      return MOCK_VIDEO_URL;
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
        await abortableDelay(delay, signal, '任务轮询已中止');
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

      await abortableDelay(delay, signal, '任务轮询已中止');
      delay = Math.min(delay * 1.5, maxDelay);
    }
  }
}
