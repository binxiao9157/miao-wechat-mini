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

    expect(profileSource).toContain("navigateTo('/pages/diagnostics/index')");
    expect(profileSource).not.toContain("navigateTo('/pages/admin-settings/index')");
  });

  it('does not register admin settings as an unconditional release page', () => {
    const appConfigSource = fs.readFileSync(path.join(srcRoot, 'app.config.ts'), 'utf8');

    expect(appConfigSource).toContain("'pages/diagnostics/index'");
    expect(appConfigSource).toContain('includeAdminPages');
    expect(appConfigSource).toContain('TARO_APP_ENABLE_ADMIN');
    expect(appConfigSource).toContain('TARO_APP_DEBUG_BUILD');
  });

  it('guards admin settings with debug access policy', () => {
    const adminSource = fs.readFileSync(path.join(srcRoot, 'pages/admin-settings/index.tsx'), 'utf8');

    expect(adminSource).toContain('canAccessAdminConsole');
    expect(adminSource).toContain('canUseDangerousDebug');
  });

  it('does not keep third-party demo media URLs in volcano service', () => {
    const volcanoSource = fs.readFileSync(path.join(srcRoot, 'services/volcanoService.ts'), 'utf8');
    const demoDomains = ['w3schools.com', 'picsum.photos', 'images.unsplash.com', 'source.unsplash.com'];
    const violations = demoDomains.filter(domain => volcanoSource.includes(domain));

    expect(violations).toEqual([]);
  });

  it('uses release-safe WeChat project settings', () => {
    const projectConfig = JSON.parse(fs.readFileSync(path.join(projectRoot, 'project.config.json'), 'utf8'));

    expect(projectConfig.setting.urlCheck).toBe(true);
    expect(projectConfig.setting.uploadWithSourceMap).toBe(false);
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
});
