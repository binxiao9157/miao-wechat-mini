import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const srcRoot = path.resolve(__dirname, '../../');
const projectRoot = path.resolve(srcRoot, '..');

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') return [];
      return listSourceFiles(fullPath);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

function relative(filePath: string): string {
  return path.relative(srcRoot, filePath);
}

describe('code quality guardrails', () => {
  it('routes through navigateAdapter instead of calling Taro navigation directly', () => {
    const allowed = new Set(['utils/navigateAdapter.ts']);
    const violations = listSourceFiles(srcRoot)
      .filter(file => !allowed.has(relative(file)))
      .flatMap((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const directCalls = [...content.matchAll(/\bTaro\.(navigateTo|redirectTo|reLaunch|switchTab)\s*\(/g)]
          .map(match => `${relative(file)} uses Taro.${match[1]}`);
        const namedImports = [...content.matchAll(/import\s+[^;{]*\{([^}]+)\}\s+from\s+['"]@tarojs\/taro['"]/g)]
          .flatMap((match) => match[1]
            .split(',')
            .map(item => item.trim().split(/\s+as\s+/)[0])
            .filter(name => ['navigateTo', 'redirectTo', 'reLaunch', 'switchTab'].includes(name))
            .map(name => `${relative(file)} imports ${name} from @tarojs/taro`));
        return [...directCalls, ...namedImports];
      });

    expect(violations).toEqual([]);
  });

  it('does not leave empty catch blocks in production source', () => {
    const violations = listSourceFiles(srcRoot).flatMap((file) => {
      const content = fs.readFileSync(file, 'utf8');
      return [...content.matchAll(/catch\s*(?:\([^)]*\))?\s*\{\s*\}/g)]
        .map(() => `${relative(file)} has an empty catch block`);
    });

    expect(violations).toEqual([]);
  });

  it('gates privacy-sensitive WeChat APIs behind privacy authorization', () => {
    const privacyApiPattern = /\bTaro\.(chooseMedia|chooseImage|scanCode|saveImageToPhotosAlbum|saveVideoToPhotosAlbum)\s*\(|openType=["']getPhoneNumber["']/g;
    const allowed = new Set(['utils/privacyAuthorization.ts']);
    const violations = listSourceFiles(srcRoot)
      .filter(file => !allowed.has(relative(file)))
      .flatMap((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const calls = [...content.matchAll(privacyApiPattern)];
        if (calls.length === 0 || content.includes('ensurePrivacyAuthorized')) return [];
        return calls.map(match => `${relative(file)} uses privacy API ${match[1] || 'getPhoneNumber'} without ensurePrivacyAuthorized`);
      });

    expect(violations).toEqual([]);
  });

  it('runs user-generated text and media through content safety checks', () => {
    const guardedFiles = [
      'pages/create-companion/index.tsx',
      'pages/diary/index.tsx',
      'pages/edit-profile/index.tsx',
      'pages/feedback/index.tsx',
      'pages/set-nickname/index.tsx',
      'pages/time-letters/index.tsx',
      'pages/upload-material/index.tsx',
    ];

    const violations = guardedFiles.filter((file) => {
      const content = fs.readFileSync(path.join(srcRoot, file), 'utf8');
      return !content.includes('checkTextContent') && !content.includes('checkMediaContent');
    });

    expect(violations).toEqual([]);
  });

  it('uses packaged assets for default preset cat images', () => {
    const storageSource = fs.readFileSync(path.join(srcRoot, 'services/storage.ts'), 'utf8');
    const presetBlock = storageSource.match(/const DEFAULT_PRESET_CATS:[\s\S]+?\];/)?.[0] || '';
    const packagedPresetImage = /const DEFAULT_PRESET_CAT_IMAGE\s*=\s*require\(['"]\.\.\/assets\/logo\.png['"]\);/;
    const demoDomains = [
      'fastly.picsum.photos',
      'picsum.photos',
      'images.unsplash.com',
      'source.unsplash.com',
    ];

    const violations = demoDomains.filter(domain => presetBlock.includes(domain));

    expect(storageSource).toMatch(packagedPresetImage);
    expect(presetBlock).not.toMatch(/https?:\/\//);
    expect(violations).toEqual([]);
  });

  it('routes hidden profile debug gesture to diagnostics instead of admin settings', () => {
    const profileSource = fs.readFileSync(path.join(srcRoot, 'pages/profile/index.tsx'), 'utf8');
    const adminRoute = ['', 'pages', 'admin-settings', 'index'].join('/');

    expect(profileSource).toContain("navigateTo('/pages/diagnostics/index')");
    expect(profileSource).not.toContain(`navigateTo('${adminRoute}')`);
  });

  it('shows a login path for profile actions that require an account', () => {
    const profileSource = fs.readFileSync(path.join(srcRoot, 'pages/profile/index.tsx'), 'utf8');

    expect(profileSource).toContain('const requireLogin');
    expect(profileSource).toContain("Taro.showToast({ title: '请先登录', icon: 'none' })");
    expect(profileSource).toContain("navigateTo('/pages/login/index')");
    expect(profileSource).toContain('requireLogin(() => navigateTo(item.url))');
  });

  it('passes cat id into generation progress and avoids stacking generation pages', () => {
    const createSource = fs.readFileSync(path.join(srcRoot, 'pages/create-companion/index.tsx'), 'utf8');
    const uploadSource = fs.readFileSync(path.join(srcRoot, 'pages/upload-material/index.tsx'), 'utf8');

    expect(createSource).toContain('redirectTo(`/pages/generation-progress/index?source=created&catId=${encodeURIComponent(newCat.id)}');
    expect(uploadSource).toContain('redirectTo(`/pages/generation-progress/index?source=uploaded&catId=${encodeURIComponent(newCat.id)}');
  });

  it('renders tab bar with cover components so it stays above native video', () => {
    const tabBarSource = fs.readFileSync(path.join(srcRoot, 'custom-tab-bar/index.tsx'), 'utf8');

    expect(tabBarSource).toContain("import { CoverView, CoverImage } from '@tarojs/components'");
    expect(tabBarSource).toContain('<CoverView className={`miao-tabbar');
    expect(tabBarSource).toContain('<CoverImage');
  });

  it('renders home video overlays with cover components so taps and prompts stay above native video', () => {
    const homeSource = fs.readFileSync(path.join(srcRoot, 'pages/home/index.tsx'), 'utf8');

    expect(homeSource).toContain("import { View, Text, Video, CoverView } from '@tarojs/components'");
    expect(homeSource).toContain("const STORY_VIDEO_ID = 'catStoryVideo'");
    expect(homeSource).not.toContain('catVideoV2');
    expect(homeSource).not.toContain('catVideoV3');
    expect(homeSource).not.toContain('catVideoV4');
    expect(homeSource).toContain('<CoverView\n                className="story-touch-layer"');
    expect(homeSource).toContain('<CoverView className="video-error-overlay">');
    expect(homeSource).toContain('<CoverView className="retry-btn" onClick={handleRetryVideo}>');
    expect(homeSource).toContain('<CoverView className="unlock-progress-badge">');
    expect(homeSource).toContain('<CoverView className="points-toast">');
    expect(homeSource).toContain('<HomeCoverBubble');
  });

  it('keeps points and profile headers inside their scroll containers', () => {
    const profileSource = fs.readFileSync(path.join(srcRoot, 'pages/profile/index.tsx'), 'utf8');
    const pointsSource = fs.readFileSync(path.join(srcRoot, 'pages/points/index.tsx'), 'utf8');

    expect(profileSource.indexOf('<ScrollView className="profile-scroll"')).toBeLessThan(profileSource.indexOf('<View className="header">'));
    expect(pointsSource.indexOf('<ScrollView className="points-scroll"')).toBeLessThan(pointsSource.indexOf('<View className="header">'));
  });

  it('keeps home unlock progress above the safe-area tab bar', () => {
    const homeStyles = fs.readFileSync(path.join(srcRoot, 'pages/home/index.less'), 'utf8');
    const badgeBlock = homeStyles.match(/\.unlock-progress-badge\s*\{[\s\S]+?\n\}/)?.[0] || '';

    expect(badgeBlock).toContain('env(safe-area-inset-bottom)');
    expect(badgeBlock).toContain('bottom: calc(env(safe-area-inset-bottom) + 196rpx)');
  });

  it('persists first-frame metadata before opening generation progress', () => {
    const createSource = fs.readFileSync(path.join(srcRoot, 'pages/create-companion/index.tsx'), 'utf8');
    const uploadSource = fs.readFileSync(path.join(srcRoot, 'pages/upload-material/index.tsx'), 'utf8');

    expect(createSource).toContain('placeholderImage: selectedPreset.imageUrl');
    expect(createSource).toContain('anchorFrame: selectedPreset.imageUrl');
    expect(uploadSource).toContain('placeholderImage: firstFrameUrl');
    expect(uploadSource).toContain('anchorFrame: firstFrameUrl');
  });

  it('does not register admin settings as an unconditional release page', () => {
    const appConfigSource = fs.readFileSync(path.join(srcRoot, 'app.config.ts'), 'utf8');

    expect(appConfigSource).toContain("'pages/diagnostics/index'");
    expect(appConfigSource).toContain('includeAdminPages');
    expect(appConfigSource).toContain('TARO_APP_ENABLE_ADMIN');
    expect(appConfigSource).toContain('TARO_APP_DEBUG_BUILD');
  });

  it('guards admin settings with debug access policy', () => {
    const adminSource = fs.readFileSync(path.join(srcRoot, 'pages', 'admin-settings', 'index.tsx'), 'utf8');

    expect(adminSource).toContain('canAccessAdminConsole');
    expect(adminSource).toContain('canUseDangerousDebug');
  });

  it('does not use dynamic process.env reads in runtime source', () => {
    const violations = listSourceFiles(srcRoot).flatMap((file) => {
      const content = fs.readFileSync(file, 'utf8');
      return [...content.matchAll(/process\.env\s*\[/g)]
        .map(() => `${relative(file)} uses dynamic process.env access`);
    });

    expect(violations).toEqual([]);
  });

  it('defines every runtime process.env key used by app source', () => {
    const configSource = fs.readFileSync(path.join(projectRoot, 'config/index.js'), 'utf8');
    const envKeys = new Set<string>();

    listSourceFiles(srcRoot).forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      [...content.matchAll(/process\.env\.([A-Z0-9_]+)/g)].forEach((match) => {
        envKeys.add(match[1]);
      });
    });

    const violations = [...envKeys]
      .filter(key => key !== 'NODE_ENV' && key !== 'TARO_ENV')
      .filter(key => !configSource.includes(`process.env.${key}`));

    expect(violations).toEqual([]);
  });

  it('keeps production diagnostics free of user identifiers and admin route literals', () => {
    const diagnosticsSource = fs.readFileSync(path.join(srcRoot, 'pages/diagnostics/index.tsx'), 'utf8');
    const adminRoute = ['', 'pages', 'admin-settings', 'index'].join('/');
    const sensitiveLabels = ["label: '接口域名'", "label: '用户'", "label: '调试角色'", "label: '当前猫'"];

    expect(diagnosticsSource).not.toContain(`'${adminRoute}'`);
    expect(diagnosticsSource).not.toContain(`"${adminRoute}"`);
    sensitiveLabels.forEach(label => {
      expect(diagnosticsSource).not.toContain(label);
    });
  });

  it('does not print reset-password development verification codes to console', () => {
    const resetPasswordSource = fs.readFileSync(path.join(srcRoot, 'pages/reset-password/index.tsx'), 'utf8');

    expect(resetPasswordSource).not.toMatch(/console\.(log|info|warn|error)\s*\(/);
    expect(resetPasswordSource).not.toContain('重置密码验证码');
  });

  it('does not keep third-party demo media URLs in volcano service', () => {
    const volcanoSource = fs.readFileSync(path.join(srcRoot, 'services/volcanoService.ts'), 'utf8');
    const demoDomains = ['w3schools.com', 'picsum.photos', 'images.unsplash.com', 'source.unsplash.com'];
    const violations = demoDomains.filter(domain => volcanoSource.includes(domain));

    expect(violations).toEqual([]);
  });

  it('uses release-safe WeChat project settings', () => {
    const projectConfig = JSON.parse(fs.readFileSync(path.join(projectRoot, 'project.config.json'), 'utf8'));
    const projectPrivateConfig = JSON.parse(fs.readFileSync(path.join(projectRoot, 'project.private.config.json'), 'utf8'));

    expect(projectConfig.setting.urlCheck).toBe(true);
    expect(projectConfig.setting.uploadWithSourceMap).toBe(false);
    expect(projectPrivateConfig.setting.urlCheck).toBe(true);
    expect(projectPrivateConfig.setting.uploadWithSourceMap).not.toBe(true);
  });

  it('documents local urlCheck overrides without weakening committed project settings', () => {
    const localDevelopmentDoc = fs.readFileSync(path.join(projectRoot, 'docs/LOCAL-DEVELOPMENT.md'), 'utf8');

    expect(localDevelopmentDoc).toContain('project.private.config.json');
    expect(localDevelopmentDoc).toContain('urlCheck');
    expect(localDevelopmentDoc).toContain('npm test');
  });

  it('does not keep unused H5-only dependencies in the app package', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};

    expect(dependencies['lucide-react']).toBeUndefined();
    expect(dependencies['qrcode.react']).toBeUndefined();
    expect(devDependencies.sharp).toBeUndefined();
    expect(devDependencies.eslint).toBeUndefined();
    expect(devDependencies['eslint-config-taro']).toBeUndefined();
    expect(devDependencies['eslint-plugin-react']).toBeUndefined();
    expect(devDependencies['@typescript-eslint/eslint-plugin']).toBeUndefined();
    expect(devDependencies['@typescript-eslint/parser']).toBeUndefined();
  });

  it('keeps safe audit overrides scoped to known build-tool transitive dependencies', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    const overrides = packageJson.overrides || {};

    expect(overrides['@tarojs/plugin-doctor']?.glob).toBe('10.5.0');
    expect(overrides['@typescript-eslint/typescript-estree']).toBeUndefined();
    expect(overrides['@tarojs/webpack5-runner']).toBeUndefined();
    expect(overrides['@tarojs/plugin-platform-h5']).toBeUndefined();
  });

  it('provides a release check script that runs full release verification', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    const scripts = packageJson.scripts || {};

    expect(scripts['release:scan']).toBe('node scripts/release-static-scan.mjs');
    expect(scripts['release:check']).toContain('npm test');
    expect(scripts['release:check']).toContain('npm run lint');
    expect(scripts['release:check']).toContain('npm audit --omit=dev --audit-level=high');
    expect(scripts['release:check']).toContain('npm run build:weapp');
    expect(scripts['release:check']).toContain('npm run build:h5');
    expect(scripts['release:check']).toContain('npm run release:scan');
  });

  it('keeps release static scan coverage aligned with publication risks', () => {
    const scanPath = path.join(projectRoot, 'scripts/release-static-scan.mjs');
    const scanSource = fs.existsSync(scanPath) ? fs.readFileSync(scanPath, 'utf8') : '';
    const expectedChecks = [
      'dist/app.json',
      'pages/diagnostics/index',
      'pages/admin-settings/index',
      'project.config.json',
      'project.private.config.json',
      'urlCheck',
      'uploadWithSourceMap',
      'w3schools',
      'picsum',
      'images.unsplash',
      'source.unsplash',
      'lucide-react',
      'qrcode.react',
      'sharp',
      '重置密码验证码',
      'process.env',
      'process is not defined',
    ];

    expect(fs.existsSync(scanPath)).toBe(true);
    expectedChecks.forEach(check => {
      expect(scanSource).toContain(check);
    });
  });

  it('provides a backend API contract check for mini program release endpoints', () => {
    const contractPath = path.join(projectRoot, 'scripts/check-api-contract.mjs');
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    const contractSource = fs.existsSync(contractPath) ? fs.readFileSync(contractPath, 'utf8') : '';

    expect(packageJson.scripts['release:api-contract']).toBe('node scripts/check-api-contract.mjs');
    expect(packageJson.scripts['release:check']).toContain('npm run release:api-contract');
    expect(contractSource).toContain("method: 'post'");
    expect(contractSource).toContain("auth: 'required'");
    [
      '/api/health',
      '/api/v1/auth/register',
      '/api/v1/auth/password-login',
      '/api/v1/auth/wechat-login',
      '/api/v1/auth/phone-login',
      '/api/v1/auth/send-reset-code',
      '/api/v1/auth/reset-password',
      '/api/v1/auth/set-password',
      '/api/v1/me',
      '/api/v1/me/settings',
      '/api/v1/cats',
      '/api/v1/cats/:catId',
      '/api/v1/diaries',
      '/api/v1/diaries/:diaryId',
      '/api/v1/diaries/:diaryId/like',
      '/api/v1/diaries/:diaryId/comments',
      '/api/v1/diaries/:diaryId/comments/:commentId',
      '/api/v1/letters',
      '/api/v1/letters/:letterId',
      '/api/v1/points',
      '/api/v1/friend-invites',
      '/api/v1/friend-invites/:code',
      '/api/v1/friends',
      '/api/v1/friends/accept',
      '/api/v1/friends/diaries',
      '/api/v1/notifications',
      '/api/v1/notifications/read-all',
      '/api/v1/notifications/:id/read',
      '/api/v1/feedback',
      '/api/v1/upload',
      '/api/v1/security/text',
      '/api/v1/security/media',
      '/api/v1/security/media-file',
      '/api/v1/ai/tasks',
      '/api/v1/ai/tasks-file',
      '/api/v1/ai/tasks/:taskId',
      '/api/v1/assets/persist-video',
      '/api/v1/diagnostics/client-log',
    ].forEach(route => {
      expect(contractSource).toContain(route);
    });
  });

  it('does not keep third-party demo media domains in production source', () => {
    const demoDomains = ['w3schools.com', 'picsum.photos', 'images.unsplash.com', 'source.unsplash.com'];
    const violations = listSourceFiles(srcRoot).flatMap((file) => {
      const content = fs.readFileSync(file, 'utf8');
      return demoDomains
        .filter(domain => content.includes(domain))
        .map(domain => `${relative(file)} contains ${domain}`);
    });

    expect(violations).toEqual([]);
  });

  it('keeps QR and event adapter fixes in place', () => {
    const qrSource = fs.readFileSync(path.join(srcRoot, 'utils/qrCanvas.ts'), 'utf8');
    const addFriendQrSource = fs.readFileSync(path.join(srcRoot, 'pages/add-friend-qr/index.tsx'), 'utf8');
    const eventAdapterSource = fs.readFileSync(path.join(srcRoot, 'utils/eventAdapter.ts'), 'utf8');

    expect(qrSource).toContain('encodeUtf8Bytes');
    expect(qrSource).toContain('selectVersion(textBytes.length)');
    expect(addFriendQrSource).toContain('const imagePath = qrImageUrl || await exportQRCanvas()');
    expect(eventAdapterSource).toContain('const handlers = new Map');
    expect(eventAdapterSource).not.toMatch(/eventCenter\.off\(event\)/);
  });

  it('does not keep unused browser-only video utilities', () => {
    expect(fs.existsSync(path.join(srcRoot, 'lib/videoUtils.ts'))).toBe(false);
  });

  it('keeps release sync from stripping first-frame metadata or posting diary video base64', () => {
    const storageSource = fs.readFileSync(path.join(srcRoot, 'services/storage.ts'), 'utf8');

    expect(storageSource).not.toContain('placeholderImage: undefined');
    expect(storageSource).not.toContain('anchorFrame: undefined');
    expect(storageSource).toContain("url: '/api/v1/upload'");
    expect(storageSource).toContain('已阻止 base64 JSON 同步');
  });
});
