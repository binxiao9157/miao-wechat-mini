import { beforeEach, describe, expect, it, vi } from 'vitest';
import Taro from '@tarojs/taro';
import { ensurePrivacyAuthorized } from '../privacyAuthorization';

describe('privacyAuthorization', () => {
  beforeEach(() => {
    vi.mocked(Taro.getEnv).mockReturnValue(Taro.ENV_TYPE.WEB);
    vi.mocked(Taro.showToast).mockReset();
    (Taro as any).getPrivacySetting = vi.fn();
    (Taro as any).requirePrivacyAuthorize = vi.fn();
    (Taro as any).showModal = vi.fn();
  });

  it('allows non-WeChat environments without calling privacy APIs', async () => {
    await expect(ensurePrivacyAuthorized('选择照片')).resolves.toBe(true);

    expect((Taro as any).getPrivacySetting).not.toHaveBeenCalled();
    expect((Taro as any).requirePrivacyAuthorize).not.toHaveBeenCalled();
  });

  it('requires official privacy authorization when WeChat reports it is needed', async () => {
    vi.mocked(Taro.getEnv).mockReturnValue(Taro.ENV_TYPE.WEAPP);
    (Taro as any).getPrivacySetting.mockImplementation((options: any) => {
      options.success({ needAuthorization: true, privacyContractName: '《Miao隐私保护指引》' });
    });
    (Taro as any).showModal.mockImplementation((options: any) => {
      expect(options.content).toContain('选择照片');
      options.success({ confirm: true });
    });
    (Taro as any).requirePrivacyAuthorize.mockImplementation((options: any) => {
      options.success();
    });

    await expect(ensurePrivacyAuthorized('选择照片')).resolves.toBe(true);

    expect((Taro as any).getPrivacySetting).toHaveBeenCalled();
    expect((Taro as any).requirePrivacyAuthorize).toHaveBeenCalled();
  });

  it('blocks the operation when the user cancels the privacy prompt', async () => {
    vi.mocked(Taro.getEnv).mockReturnValue(Taro.ENV_TYPE.WEAPP);
    (Taro as any).getPrivacySetting.mockImplementation((options: any) => {
      options.success({ needAuthorization: true, privacyContractName: '《Miao隐私保护指引》' });
    });
    (Taro as any).showModal.mockImplementation((options: any) => {
      options.success({ confirm: false });
    });

    await expect(ensurePrivacyAuthorized('保存图片')).resolves.toBe(false);

    expect((Taro as any).requirePrivacyAuthorize).not.toHaveBeenCalled();
    expect(Taro.showToast).toHaveBeenCalledWith({ title: '请先同意隐私保护指引', icon: 'none' });
  });
});
