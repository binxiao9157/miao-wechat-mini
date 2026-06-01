import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const serverCandidates = ['Miao_remote', 'Miao'];
const defaultServerRoot = serverCandidates
  .map((name) => path.resolve(projectRoot, '..', name))
  .find((candidate) => fs.existsSync(path.join(candidate, 'server.ts')))
  || path.resolve(projectRoot, '..', 'Miao');
const serverRoot = process.env.MIAO_SERVER_ROOT
  ? path.resolve(process.env.MIAO_SERVER_ROOT)
  : defaultServerRoot;
const serverFile = path.join(serverRoot, 'server.ts');

const requiredRoutes = [
  '/api/v1/security/text',
  '/api/v1/security/media',
  '/api/v1/security/media-file',
  '/api/v1/ai/tasks',
  '/api/v1/ai/tasks-file',
  '/api/v1/ai/tasks/:taskId',
  '/api/v1/upload',
  '/api/v1/assets/persist-video',
  '/api/health',
];

const requiredSymbols = [
  'createReleaseHealth',
  'checkTextSafety',
  'checkMediaSafety',
  'createMockTaskPollResponse',
];

const failures = [];

if (!fs.existsSync(serverFile)) {
  failures.push(`Miao server file is missing: ${serverFile}`);
} else {
  const source = fs.readFileSync(serverFile, 'utf8');
  requiredRoutes.forEach((route) => {
    if (!source.includes(route)) {
      failures.push(`Miao server.ts must register ${route}`);
    }
  });

  requiredSymbols.forEach((symbol) => {
    if (!source.includes(symbol)) {
      failures.push(`Miao server.ts must wire ${symbol}`);
    }
  });
}

if (failures.length > 0) {
  console.error('Mini/backend API contract check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Mini/backend API contract check passed against ${serverFile}.`);
