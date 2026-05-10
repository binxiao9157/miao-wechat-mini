const { getItem, setItem, removeItem } = require('../utils/storage');
const {
  AI_PROVIDER,
  IMAGE_MODEL,
  VIDEO_MODEL,
  VIDEO_RESOLUTION,
  VIDEO_DURATION
} = require('../config/env');
const { isDebugEnabled } = require('../utils/runtime');

const STORAGE_KEYS = {
  PROVIDER: 'MIAO_AI_PROVIDER',
  DASHSCOPE_IMAGE_MODEL: 'DASHSCOPE_IMAGE_MODEL',
  DASHSCOPE_VIDEO_MODEL: 'DASHSCOPE_VIDEO_MODEL',
  VOLC_IMAGE_MODEL: 'VOLC_IMAGE_MODEL',
  VOLC_VIDEO_MODEL: 'VOLC_VIDEO_MODEL',
  RESOLUTION: 'MIAO_AI_RESOLUTION',
  DURATION: 'MIAO_AI_DURATION',
  SEED: 'MIAO_AI_SEED',
  PROMPT_EXTEND: 'MIAO_AI_PROMPT_EXTEND',
  MOCK_MODE: 'MIAO_AI_MOCK_MODE'
};

const DEFAULT_AI_PROFILES = {
  dashscope: {
    provider: 'dashscope',
    imageModel: 'qwen-image-2.0',
    videoModel: 'wan2.2-kf2v-flash',
    resolution: '480P',
    duration: 5,
    seed: 12345,
    promptExtend: true,
    mockMode: false
  },
  volcengine: {
    provider: 'volcengine',
    imageModel: IMAGE_MODEL,
    videoModel: VIDEO_MODEL,
    resolution: VIDEO_RESOLUTION || '480P',
    duration: VIDEO_DURATION || 5,
    seed: 12345,
    promptExtend: true,
    mockMode: false
  }
};

function isProvider(value) {
  return value === 'dashscope' || value === 'volcengine';
}

function defaultProvider() {
  return isProvider(AI_PROVIDER) ? AI_PROVIDER : 'volcengine';
}

function readNumber(key, fallback) {
  const raw = getItem(key);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && raw !== '' ? parsed : fallback;
}

function readBool(key, fallback) {
  const raw = getItem(key);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fallback;
}

const aiConfig = {
  DEFAULT_AI_PROFILES,

  getProfile() {
    const provider = isProvider(getItem(STORAGE_KEYS.PROVIDER)) ? getItem(STORAGE_KEYS.PROVIDER) : defaultProvider();
    const defaults = DEFAULT_AI_PROFILES[provider];
    const imageKey = provider === 'dashscope' ? STORAGE_KEYS.DASHSCOPE_IMAGE_MODEL : STORAGE_KEYS.VOLC_IMAGE_MODEL;
    const videoKey = provider === 'dashscope' ? STORAGE_KEYS.DASHSCOPE_VIDEO_MODEL : STORAGE_KEYS.VOLC_VIDEO_MODEL;
    const profile = {
      ...defaults,
      imageModel: (getItem(imageKey) || defaults.imageModel).trim(),
      videoModel: (getItem(videoKey) || defaults.videoModel).trim(),
      resolution: (getItem(STORAGE_KEYS.RESOLUTION) || defaults.resolution).trim(),
      duration: readNumber(STORAGE_KEYS.DURATION, defaults.duration),
      seed: readNumber(STORAGE_KEYS.SEED, defaults.seed),
      promptExtend: readBool(STORAGE_KEYS.PROMPT_EXTEND, defaults.promptExtend),
      mockMode: readBool(STORAGE_KEYS.MOCK_MODE, defaults.mockMode)
    };
    return {
      ...profile,
      mockMode: isDebugEnabled() ? profile.mockMode : false
    };
  },

  saveProfile(profile) {
    const provider = isProvider(profile.provider) ? profile.provider : defaultProvider();
    setItem(STORAGE_KEYS.PROVIDER, provider);
    setItem(provider === 'dashscope' ? STORAGE_KEYS.DASHSCOPE_IMAGE_MODEL : STORAGE_KEYS.VOLC_IMAGE_MODEL, String(profile.imageModel || '').trim());
    setItem(provider === 'dashscope' ? STORAGE_KEYS.DASHSCOPE_VIDEO_MODEL : STORAGE_KEYS.VOLC_VIDEO_MODEL, String(profile.videoModel || '').trim());
    setItem(STORAGE_KEYS.RESOLUTION, String(profile.resolution || '').trim());
    setItem(STORAGE_KEYS.DURATION, String(Number(profile.duration) || DEFAULT_AI_PROFILES[provider].duration));
    setItem(STORAGE_KEYS.SEED, String(Number(profile.seed) || DEFAULT_AI_PROFILES[provider].seed));
    setItem(STORAGE_KEYS.PROMPT_EXTEND, String(!!profile.promptExtend));
    setItem(STORAGE_KEYS.MOCK_MODE, String(isDebugEnabled() && !!profile.mockMode));
  },

  reset() {
    Object.keys(STORAGE_KEYS).forEach((key) => removeItem(STORAGE_KEYS[key]));
  }
};

module.exports = {
  aiConfig,
  DEFAULT_AI_PROFILES
};
