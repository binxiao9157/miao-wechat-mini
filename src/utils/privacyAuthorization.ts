import Taro from '@tarojs/taro';

interface PrivacySettingResult {
  needAuthorization?: boolean;
  privacyContractName?: string;
}

function isWeApp(): boolean {
  try {
    return Taro.getEnv() === Taro.ENV_TYPE.WEAPP;
  } catch {
    return false;
  }
}

function getPrivacySetting(): Promise<PrivacySettingResult> {
  const api = Taro as any;
  if (!api.getPrivacySetting) return Promise.resolve({ needAuthorization: false });

  return new Promise((resolve) => {
    api.getPrivacySetting({
      success: (res: PrivacySettingResult) => resolve(res || { needAuthorization: false }),
      fail: (error: unknown) => {
        console.warn('[privacyAuthorization] getPrivacySetting failed:', error);
        resolve({ needAuthorization: false });
      },
    });
  });
}

function showPrivacyConfirm(actionName: string, contractName: string): Promise<boolean> {
  const api = Taro as any;
  if (!api.showModal) return Promise.resolve(true);

  return new Promise((resolve) => {
    api.showModal({
      title: '隐私保护提示',
      content: `使用${actionName}前，需要先阅读并同意${contractName}。`,
      confirmText: '同意并继续',
      cancelText: '暂不使用',
      success: (res: { confirm?: boolean }) => resolve(!!res.confirm),
      fail: (error: unknown) => {
        console.warn('[privacyAuthorization] show privacy modal failed:', error);
        resolve(false);
      },
    });
  });
}

function requirePrivacyAuthorize(): Promise<boolean> {
  const api = Taro as any;
  if (!api.requirePrivacyAuthorize) return Promise.resolve(true);

  return new Promise((resolve) => {
    api.requirePrivacyAuthorize({
      success: () => resolve(true),
      fail: (error: unknown) => {
        console.warn('[privacyAuthorization] requirePrivacyAuthorize failed:', error);
        resolve(false);
      },
    });
  });
}

export async function ensurePrivacyAuthorized(actionName: string): Promise<boolean> {
  if (!isWeApp()) return true;

  const setting = await getPrivacySetting();
  if (!setting.needAuthorization) return true;

  const contractName = setting.privacyContractName || '《小程序用户隐私保护指引》';
  const confirmed = await showPrivacyConfirm(actionName, contractName);
  if (!confirmed) {
    Taro.showToast({ title: '请先同意隐私保护指引', icon: 'none' });
    return false;
  }

  const authorized = await requirePrivacyAuthorize();
  if (!authorized) {
    Taro.showToast({ title: '请先同意隐私保护指引', icon: 'none' });
  }
  return authorized;
}

export default { ensurePrivacyAuthorized };
