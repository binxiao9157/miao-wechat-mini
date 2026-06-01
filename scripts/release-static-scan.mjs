import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(projectRoot, 'src');
const distRoot = path.join(projectRoot, 'dist');

const failures = [];

function readJson(relativePath) {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`${relativePath} is missing`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (error) {
    failures.push(`${relativePath} is not valid JSON: ${error.message}`);
    return null;
  }
}

function walkFiles(dir, filter = () => true) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (!filter(fullPath, entry)) return [];
    if (entry.isDirectory()) return walkFiles(fullPath, filter);
    return entry.isFile() ? [fullPath] : [];
  });
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertNoContentMatches(label, files, patterns) {
  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    patterns.forEach((pattern) => {
      if (content.includes(pattern)) {
        failures.push(`${label}: ${path.relative(projectRoot, file)} contains ${pattern}`);
      }
    });
  });
}

const appConfig = readJson('dist/app.json');
if (appConfig?.pages) {
  assert(
    appConfig.pages.includes('pages/diagnostics/index'),
    'dist/app.json must register pages/diagnostics/index'
  );
  assert(
    !appConfig.pages.includes('pages/admin-settings/index'),
    'dist/app.json must not register pages/admin-settings/index in release builds'
  );
}

const projectConfig = readJson('project.config.json');
assert(projectConfig?.setting?.urlCheck === true, 'project.config.json setting.urlCheck must be true');
assert(projectConfig?.setting?.uploadWithSourceMap === false, 'project.config.json setting.uploadWithSourceMap must be false');

const privateConfig = readJson('project.private.config.json');
assert(privateConfig?.setting?.urlCheck === true, 'project.private.config.json setting.urlCheck must be true');
assert(privateConfig?.setting?.uploadWithSourceMap !== true, 'project.private.config.json setting.uploadWithSourceMap must not be true');

const packageJson = readJson('package.json');
const dependencies = packageJson?.dependencies || {};
const devDependencies = packageJson?.devDependencies || {};
['lucide-react', 'qrcode.react'].forEach((dependency) => {
  assert(!dependencies[dependency], `package.json dependencies must not include unused ${dependency}`);
});
assert(!devDependencies.sharp, 'package.json devDependencies must not include unused sharp');

const sourceFiles = walkFiles(srcRoot, (fullPath, entry) => {
  if (entry.isDirectory()) return path.basename(fullPath) !== '__tests__';
  return /\.(ts|tsx|js|jsx)$/.test(fullPath);
});
const distFiles = walkFiles(distRoot, (fullPath, entry) => {
  if (entry.isDirectory()) return true;
  return /\.(js|json|wxml|wxss|html|css)$/.test(fullPath);
});

const forbiddenReleaseStrings = [
  '/pages/admin-settings/index',
  'pages/admin-settings/index',
  'w3schools',
  'picsum',
  'images.unsplash',
  'source.unsplash',
  '重置密码验证码',
];

const distOnlyForbiddenReleaseStrings = [
  'process.env',
  'process is not defined',
];

assertNoContentMatches('source scan', sourceFiles, forbiddenReleaseStrings);
assertNoContentMatches('dist scan', distFiles, forbiddenReleaseStrings);
assertNoContentMatches('dist scan', distFiles, distOnlyForbiddenReleaseStrings);

if (failures.length > 0) {
  console.error('Release static scan failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Release static scan passed.');
