const { request, get, post } = require('../utils/request');
const { uploadFile } = require('../utils/upload');
const { aiConfig } = require('./ai-config');

const ACTION_PROMPTS = {
  idle: '一只可爱的猫咪蹲坐在温馨的房间里，正视镜头。它缓慢站起来，走向镜头轻轻蹭了一下，然后退回到原来的位置蹲好。画面清晰，光影真实，竖屏构图。',
  tail: '特写猫咪的面部。一只手轻轻抚摸猫咪的头顶，猫咪舒服地眯起眼睛。随后镜头拉远，猫咪保持蹲坐姿态。细节丰富。',
  rubbing: '聚焦猫咪的前爪。猫咪左右交替踩奶，看起来非常放松和舒适。随后它停止动作，静静地蹲坐在原地。',
  blink: '猫咪兴奋地看着镜头。主人拿着羽毛逗猫棒在旁边晃动，猫咪抬头挥动爪子尝试捕捉。随后逗猫棒移开，猫咪恢复安静蹲坐。'
};

const IMAGE_PROMPTS = {
  anchor: (breed, color) =>
    `A ultra-realistic, high-detail portrait of a cat with ${color || 'warm'} fur${breed && breed !== '未知' ? `, ${breed} breed` : ''}, sitting comfortably in a soft cat nest, cinematic lighting, 4k resolution, looking at the camera. Do NOT render any text, watermark, or name on the image.`
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getProfile() {
  return aiConfig.getProfile();
}

function dataUrlToTempFile(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('无效的 base64 图片数据');
  const ext = match[1].split('/')[1] || 'jpg';
  const tempPath = `${wx.env.USER_DATA_PATH}/upload_${Date.now()}.${ext}`;
  wx.getFileSystemManager().writeFileSync(tempPath, match[2], 'base64');
  return tempPath;
}

function isLocalPath(path) {
  if (!path) return false;
  if (/^https?:\/\//i.test(path)) return path.startsWith('http://tmp/') || path.startsWith('http://usr/');
  const userDataPath = wx.env && wx.env.USER_DATA_PATH ? wx.env.USER_DATA_PATH : '';
  return path.startsWith('wxfile://') || path.startsWith('file://') || (!!userDataPath && path.startsWith(userDataPath));
}

function getUploadPath(image) {
  if (!image) return '';
  if (image.startsWith('data:')) return dataUrlToTempFile(image);
  return isLocalPath(image) ? image : '';
}

async function submitImageTask(prompt, imagePath) {
  const profile = getProfile();
  if (profile.mockMode) {
    await sleep(800);
    return { id: `mock_img_task_${Date.now()}`, status: 'submitted' };
  }
  const uploadPath = getUploadPath(imagePath);
  if (uploadPath) {
    const data = await uploadFile({
      url: '/api/v1/ai/tasks-file',
      filePath: uploadPath,
      name: 'image',
      formData: {
        type: 'image',
        provider: profile.provider,
        model: profile.imageModel,
        prompt
      },
      timeout: 120000
    });
    const taskId = data.id || data.task_id;
    if (!taskId) throw new Error('文生图任务提交失败，未获取到 ID');
    return { ...data, id: taskId };
  }

  const res = await request({
    url: '/api/v1/ai/tasks',
    method: 'POST',
    data: {
      type: 'image',
      provider: profile.provider,
      model: profile.imageModel,
      prompt,
      image_base64: imagePath
    },
    timeout: 90000
  });
  const taskId = res.data.id || res.data.task_id;
  if (!taskId) throw new Error('文生图任务提交失败，未获取到 ID');
  return { ...res.data, id: taskId };
}

async function pollImageResult(taskId, initialUrl) {
  const profile = getProfile();
  if (profile.mockMode) {
    await sleep(1200);
    return initialUrl || 'https://picsum.photos/seed/miao-cat/900/900';
  }
  if (initialUrl) return initialUrl;
  const startedAt = Date.now();
  let delay = 2000;
  while (Date.now() - startedAt < 120000) {
    const res = await get(`/api/v1/ai/tasks/${encodeURIComponent(taskId)}?type=image&provider=${profile.provider}`, { timeout: 60000 });
    const result = res.data || {};
    if (result.status === 'succeeded') {
      const imageUrl = result.output?.image_url || result.data?.image_url || result.image_url;
      if (imageUrl) return imageUrl;
      throw new Error('任务成功但未获取到图片地址');
    }
    if (result.status === 'failed') {
      throw new Error(result.message || '图片生成失败');
    }
    await sleep(delay);
    delay = Math.min(Math.round(delay * 1.4), 10000);
  }
  throw new Error('图片生成超时');
}

async function submitVideoTask(image, prompt) {
  const profile = getProfile();
  if (profile.mockMode) {
    await sleep(800);
    return { id: `mock_video_task_${Date.now()}`, status: 'submitted' };
  }
  const uploadPath = getUploadPath(image);
  if (uploadPath) {
    const data = await uploadFile({
      url: '/api/v1/ai/tasks-file',
      filePath: uploadPath,
      name: 'image',
      formData: {
        type: 'video',
        provider: profile.provider,
        model: profile.videoModel,
        prompt,
        seed: String(profile.seed),
        resolution: profile.resolution,
        duration: String(profile.duration),
        prompt_extend: String(profile.promptExtend),
        audio: 'false'
      },
      timeout: 120000
    });
    const taskId = data.id || data.task_id;
    if (!taskId) throw new Error('视频任务提交失败，未获取到 ID');
    return { ...data, id: taskId };
  }

  const res = await request({
    url: '/api/v1/ai/tasks',
    method: 'POST',
    data: {
      type: 'video',
      provider: profile.provider,
      model: profile.videoModel,
      prompt,
      image_base64: image,
      parameters: {
        seed: profile.seed,
        resolution: profile.resolution,
        duration: profile.duration,
        prompt_extend: profile.promptExtend,
        audio: false
      }
    },
    timeout: 90000
  });
  const taskId = res.data.id || res.data.task_id;
  if (!taskId) throw new Error('视频任务提交失败，未获取到 ID');
  return { ...res.data, id: taskId };
}

async function pollVideoResult(taskId, onStatus) {
  const profile = getProfile();
  if (profile.mockMode) {
    await sleep(1500);
    if (onStatus) onStatus('succeeded');
    return 'https://www.w3schools.com/html/mov_bbb.mp4';
  }
  const startedAt = Date.now();
  let delay = 2500;
  while (Date.now() - startedAt < 300000) {
    const res = await get(`/api/v1/ai/tasks/${encodeURIComponent(taskId)}?type=video&provider=${profile.provider}`, { timeout: 60000 });
    const result = res.data || {};
    if (onStatus) onStatus(result.status || 'running');
    if (result.status === 'succeeded') {
      const videoUrl = result.output?.video_url || result.data?.video_url || result.video_url || result.content?.video_url;
      if (videoUrl) return videoUrl;
      throw new Error('任务成功但未获取到视频地址');
    }
    if (result.status === 'failed') {
      throw new Error(result.message || '视频生成失败');
    }
    await sleep(delay);
    delay = Math.min(Math.round(delay * 1.25), 12000);
  }
  throw new Error('视频生成超时');
}

async function persistVideo(videoUrl, catId, action = 'idle') {
  const res = await post('/api/v1/assets/persist-video', { videoUrl, catId, action }, { timeout: 120000 });
  return res.data?.url || res.data?.videoUrl || res.data?.permanentUrl || videoUrl;
}

module.exports = {
  ACTION_PROMPTS,
  IMAGE_PROMPTS,
  submitImageTask,
  pollImageResult,
  submitVideoTask,
  pollVideoResult,
  persistVideo
};
