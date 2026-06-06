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
  { method: 'get', route: '/api/health', auth: 'public' },
  { method: 'post', route: '/api/v1/auth/register', auth: 'public' },
  { method: 'post', route: '/api/v1/auth/password-login', auth: 'public' },
  { method: 'post', route: '/api/v1/auth/wechat-login', auth: 'public' },
  { method: 'post', route: '/api/v1/auth/phone-login', auth: 'public' },
  { method: 'post', route: '/api/v1/auth/send-reset-code', auth: 'public' },
  { method: 'post', route: '/api/v1/auth/reset-password', auth: 'public' },
  { method: 'post', route: '/api/v1/auth/set-password', auth: 'required' },
  { method: 'get', route: '/api/v1/me', auth: 'required' },
  { method: 'patch', route: '/api/v1/me', auth: 'required' },
  { method: 'delete', route: '/api/v1/me', auth: 'required' },
  { method: 'put', route: '/api/v1/me/settings', auth: 'required' },
  { method: 'get', route: '/api/v1/cats', auth: 'required' },
  { method: 'post', route: '/api/v1/cats', auth: 'required' },
  { method: 'delete', route: '/api/v1/cats', auth: 'required' },
  { method: 'delete', route: '/api/v1/cats/:catId', auth: 'required' },
  { method: 'get', route: '/api/v1/diaries', auth: 'required' },
  { method: 'post', route: '/api/v1/diaries', auth: 'required' },
  { method: 'delete', route: '/api/v1/diaries/:diaryId', auth: 'required' },
  { method: 'post', route: '/api/v1/diaries/:diaryId/like', auth: 'required' },
  { method: 'post', route: '/api/v1/diaries/:diaryId/comments', auth: 'required' },
  { method: 'delete', route: '/api/v1/diaries/:diaryId/comments/:commentId', auth: 'required' },
  { method: 'get', route: '/api/v1/letters', auth: 'required' },
  { method: 'post', route: '/api/v1/letters', auth: 'required' },
  { method: 'delete', route: '/api/v1/letters/:letterId', auth: 'required' },
  { method: 'get', route: '/api/v1/points', auth: 'required' },
  { method: 'post', route: '/api/v1/points', auth: 'required' },
  { method: 'post', route: '/api/v1/points/transaction', auth: 'required' },
  { method: 'post', route: '/api/v1/friend-invites', auth: 'required' },
  { method: 'get', route: '/api/v1/friend-invites/:code', auth: 'required' },
  { method: 'get', route: '/api/v1/friends', auth: 'required' },
  { method: 'post', route: '/api/v1/friends/accept', auth: 'required' },
  { method: 'get', route: '/api/v1/friends/diaries', auth: 'required' },
  { method: 'get', route: '/api/v1/notifications', auth: 'required' },
  { method: 'put', route: '/api/v1/notifications/read-all', auth: 'required' },
  { method: 'put', route: '/api/v1/notifications/:id/read', auth: 'required' },
  { method: 'post', route: '/api/v1/feedback', auth: 'required' },
  { method: 'post', route: '/api/v1/upload', auth: 'required' },
  { method: 'post', route: '/api/v1/ai/tasks', auth: 'required' },
  { method: 'post', route: '/api/v1/ai/tasks-file', auth: 'required' },
  { method: 'get', route: '/api/v1/ai/tasks/:taskId', auth: 'required' },
  { method: 'post', route: '/api/v1/assets/persist-video', auth: 'required' },
  { method: 'post', route: '/api/v1/assets/video-last-frame', auth: 'required' },
  { method: 'post', route: '/api/v1/security/text', auth: 'required' },
  { method: 'post', route: '/api/v1/security/media', auth: 'required' },
  { method: 'post', route: '/api/v1/security/media-file', auth: 'required' },
  { method: 'post', route: '/api/v1/diagnostics/client-log', auth: 'required' },
];

const requiredSymbols = [
  'createReleaseHealth',
  'checkTextSafety',
  'checkMediaSafety',
  'createMockTaskPollResponse',
];

const failures = [];

function findExpressRouteLine(source, contract) {
  return source.split(/\r?\n/).find((line) => (
    line.includes(`app.${contract.method}("${contract.route}"`) ||
    line.includes(`app.${contract.method}('${contract.route}'`)
  ));
}

if (!fs.existsSync(serverFile)) {
  failures.push(`Miao server file is missing: ${serverFile}`);
} else {
  const source = fs.readFileSync(serverFile, 'utf8');
  requiredRoutes.forEach((contract) => {
    const routeLine = findExpressRouteLine(source, contract);
    if (!routeLine) {
      failures.push(`Miao server.ts must register ${contract.method.toUpperCase()} ${contract.route}`);
      return;
    }

    const hasAuthRequired = routeLine.includes('authRequired');
    if (contract.auth === 'required' && !hasAuthRequired) {
      failures.push(`Miao server.ts must protect ${contract.method.toUpperCase()} ${contract.route} with authRequired`);
    }
    if (contract.auth === 'public' && hasAuthRequired) {
      failures.push(`Miao server.ts must keep ${contract.method.toUpperCase()} ${contract.route} public`);
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
