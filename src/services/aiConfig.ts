import { getItem, setItem, removeItem } from '../utils/storageAdapter';

export type AIProvider = 'dashscope' | 'volcengine';

export interface AIProfile {
  provider: AIProvider;
  imageModel: string;
  videoModel: string;
  resolution: string;
  duration: number;
  seed: number;
  promptExtend: boolean;
  mockMode: boolean;
}

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
  MOCK_MODE: 'MIAO_AI_MOCK_MODE',
} as const;

export const DEFAULT_AI_PROFILES: Record<AIProvider, AIProfile> = {
  dashscope: {
    provider: 'dashscope',
    imageModel: 'qwen-image-2.0',
    videoModel: 'wan2.2-kf2v-flash',
    resolution: '480P',
    duration: 5,
    seed: 12345,
    promptExtend: true,
    mockMode: false,
  },
  volcengine: {
    provider: 'volcengine',
    imageModel: 'doubao-seedream-4-5-251128',
    videoModel: 'doubao-seedance-1-5-pro-251215',
    resolution: '480P',
    duration: 5,
    seed: 12345,
    promptExtend: true,
    mockMode: false,
  },
};

const isProvider = (value: string | null): value is AIProvider =>
  value === 'dashscope' || value === 'volcengine';

const defaultProvider = (): AIProvider => {
  const envProvider = process.env.TARO_APP_AI_PROVIDER || 'volcengine';
  return isProvider(envProvider) ? envProvider : 'volcengine';
};

const readNumber = (key: string, fallback: number) => {
  const raw = getItem(key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readBool = (key: string, fallback: boolean) => {
  const raw = getItem(key);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fallback;
};

export const aiConfig = {
  getProfile(): AIProfile {
    const provider = isProvider(getItem(STORAGE_KEYS.PROVIDER))
      ? getItem(STORAGE_KEYS.PROVIDER) as AIProvider
      : defaultProvider();
    const defaults = DEFAULT_AI_PROFILES[provider];
    const imageKey = provider === 'dashscope'
      ? STORAGE_KEYS.DASHSCOPE_IMAGE_MODEL
      : STORAGE_KEYS.VOLC_IMAGE_MODEL;
    const videoKey = provider === 'dashscope'
      ? STORAGE_KEYS.DASHSCOPE_VIDEO_MODEL
      : STORAGE_KEYS.VOLC_VIDEO_MODEL;

    return {
      ...defaults,
      imageModel: (getItem(imageKey) || defaults.imageModel).trim(),
      videoModel: (getItem(videoKey) || defaults.videoModel).trim(),
      resolution: (getItem(STORAGE_KEYS.RESOLUTION) || defaults.resolution).trim(),
      duration: readNumber(STORAGE_KEYS.DURATION, defaults.duration),
      seed: readNumber(STORAGE_KEYS.SEED, defaults.seed),
      promptExtend: readBool(STORAGE_KEYS.PROMPT_EXTEND, defaults.promptExtend),
      mockMode: readBool(STORAGE_KEYS.MOCK_MODE, defaults.mockMode),
    };
  },

  saveProfile(profile: AIProfile) {
    setItem(STORAGE_KEYS.PROVIDER, profile.provider);
    setItem(
      profile.provider === 'dashscope' ? STORAGE_KEYS.DASHSCOPE_IMAGE_MODEL : STORAGE_KEYS.VOLC_IMAGE_MODEL,
      profile.imageModel.trim()
    );
    setItem(
      profile.provider === 'dashscope' ? STORAGE_KEYS.DASHSCOPE_VIDEO_MODEL : STORAGE_KEYS.VOLC_VIDEO_MODEL,
      profile.videoModel.trim()
    );
    setItem(STORAGE_KEYS.RESOLUTION, profile.resolution.trim());
    setItem(STORAGE_KEYS.DURATION, String(profile.duration));
    setItem(STORAGE_KEYS.SEED, String(profile.seed));
    setItem(STORAGE_KEYS.PROMPT_EXTEND, String(profile.promptExtend));
    setItem(STORAGE_KEYS.MOCK_MODE, String(profile.mockMode));
  },

  reset() {
    Object.values(STORAGE_KEYS).forEach(key => removeItem(key));
  },
};

export default aiConfig;
