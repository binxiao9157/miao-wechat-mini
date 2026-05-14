const { getItem, setItem, removeItem } = require('../utils/storage');
const {
  AI_PROVIDER,
  IMAGE_MODEL,
  VIDEO_MODEL,
  VIDEO_RESOLUTION,
  VIDEO_DURATION
} = require('../config/env');

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

const VALID_RESOLUTIONS = ['480P', '720P', '1080P'];
const MIN_DURATION = 1;
const MAX_DURATION = 10;
const MAX_SEED = 2147483647;

function isProvider(value) {
  return value === 'dashscope' || value === 'volcengine';
}

function defaultProvider() {
  return isProvider(AI_PROVIDER) ? AI_PROVIDER : 'volcengine';
}

function normalizeProvider(value) {
  return isProvider(value) ? value : defaultProvider();
}

function normalizeResolution(value, fallback = '480P') {
  const raw = String(value || '').trim().toUpperCase();
  return VALID_RESOLUTIONS.includes(raw) ? raw : fallback;
}

function isValidDuration(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= MIN_DURATION && parsed <= MAX_DURATION;
}

function normalizeDuration(value, fallback) {
  return isValidDuration(value) ? Math.round(Number(value)) : fallback;
}

function isValidSeed(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_SEED;
}

function normalizeSeed(value, fallback) {
  return isValidSeed(value) ? Math.round(Number(value)) : fallback;
}

function normalizeBoolValue(value, fallback) {
  if (value === true || value === false) return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function normalizeProfile(profile = {}) {
  const provider = normalizeProvider(profile.provider);
  const defaults = DEFAULT_AI_PROFILES[provider];
  return {
    provider,
    imageModel: String(profile.imageModel || defaults.imageModel || '').trim(),
    videoModel: String(profile.videoModel || defaults.videoModel || '').trim(),
    resolution: normalizeResolution(profile.resolution || defaults.resolution, defaults.resolution),
    duration: normalizeDuration(profile.duration, defaults.duration),
    seed: normalizeSeed(profile.seed, defaults.seed),
    promptExtend: normalizeBoolValue(profile.promptExtend, defaults.promptExtend),
    mockMode: normalizeBoolValue(profile.mockMode, defaults.mockMode)
  };
}

function validateProfile(profile = {}) {
  const provider = normalizeProvider(profile.provider);
  const defaults = DEFAULT_AI_PROFILES[provider];
  const errors = [];
  const imageModel = String(profile.imageModel || '').trim();
  const videoModel = String(profile.videoModel || '').trim();
  const resolution = normalizeResolution(profile.resolution, '');
  const duration = normalizeDuration(profile.duration, null);
  const seed = normalizeSeed(profile.seed, null);

  if (!isProvider(profile.provider)) errors.push('请选择 AI 服务商');
  if (!imageModel) errors.push('请填写图片模型');
  if (!videoModel) errors.push('请填写视频模型');
  if (!resolution) errors.push('清晰度仅支持 480P、720P、1080P');
  if (duration === null) errors.push('时长需为 1-10 秒');
  if (seed === null) errors.push('Seed 需为 0-2147483647');

  return {
    profile: normalizeProfile({
      ...profile,
      provider,
      imageModel: imageModel || defaults.imageModel,
      videoModel: videoModel || defaults.videoModel,
      resolution: resolution || defaults.resolution,
      duration: duration === null ? defaults.duration : duration,
      seed: seed === null ? defaults.seed : seed
    }),
    errors
  };
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
  VALID_RESOLUTIONS,
  normalizeProfile,
  validateProfile,

  getProfile() {
    const provider = isProvider(getItem(STORAGE_KEYS.PROVIDER)) ? getItem(STORAGE_KEYS.PROVIDER) : defaultProvider();
    const defaults = DEFAULT_AI_PROFILES[provider];
    const imageKey = provider === 'dashscope' ? STORAGE_KEYS.DASHSCOPE_IMAGE_MODEL : STORAGE_KEYS.VOLC_IMAGE_MODEL;
    const videoKey = provider === 'dashscope' ? STORAGE_KEYS.DASHSCOPE_VIDEO_MODEL : STORAGE_KEYS.VOLC_VIDEO_MODEL;
    return normalizeProfile({
      ...defaults,
      imageModel: (getItem(imageKey) || defaults.imageModel).trim(),
      videoModel: (getItem(videoKey) || defaults.videoModel).trim(),
      resolution: (getItem(STORAGE_KEYS.RESOLUTION) || defaults.resolution).trim(),
      duration: readNumber(STORAGE_KEYS.DURATION, defaults.duration),
      seed: readNumber(STORAGE_KEYS.SEED, defaults.seed),
      promptExtend: readBool(STORAGE_KEYS.PROMPT_EXTEND, defaults.promptExtend),
      mockMode: readBool(STORAGE_KEYS.MOCK_MODE, defaults.mockMode)
    });
  },

  saveProfile(profile) {
    const result = validateProfile(profile || {});
    if (result.errors.length) throw new Error(result.errors[0]);
    const normalized = result.profile;
    const provider = normalized.provider;
    setItem(STORAGE_KEYS.PROVIDER, provider);
    setItem(provider === 'dashscope' ? STORAGE_KEYS.DASHSCOPE_IMAGE_MODEL : STORAGE_KEYS.VOLC_IMAGE_MODEL, normalized.imageModel);
    setItem(provider === 'dashscope' ? STORAGE_KEYS.DASHSCOPE_VIDEO_MODEL : STORAGE_KEYS.VOLC_VIDEO_MODEL, normalized.videoModel);
    setItem(STORAGE_KEYS.RESOLUTION, normalized.resolution);
    setItem(STORAGE_KEYS.DURATION, String(normalized.duration));
    setItem(STORAGE_KEYS.SEED, String(normalized.seed));
    setItem(STORAGE_KEYS.PROMPT_EXTEND, String(!!normalized.promptExtend));
    setItem(STORAGE_KEYS.MOCK_MODE, String(!!normalized.mockMode));
    return normalized;
  },

  reset() {
    Object.keys(STORAGE_KEYS).forEach((key) => removeItem(STORAGE_KEYS[key]));
  }
};

module.exports = {
  aiConfig,
  DEFAULT_AI_PROFILES,
  VALID_RESOLUTIONS,
  normalizeProfile,
  validateProfile
};
