import { post } from './httpAdapter';

type DiagnosticPayload = Record<string, unknown> & {
  src?: string;
};

function safeText(value: unknown, max = 160): string {
  return String(value ?? '').replace(/[\r\n"]/g, ' ').slice(0, max);
}

export function classifyDiagnosticSrc(src?: string) {
  const value = safeText(src, 500);
  if (!value) return { srcKind: 'empty' };
  if (value.startsWith('wxfile://')) return { srcKind: 'wxfile' };
  if (value.startsWith('http://tmp/')) return { srcKind: 'http-tmp' };
  if (value.startsWith('http://usr/')) return { srcKind: 'http-usr' };
  if (value.startsWith('file://')) return { srcKind: 'file' };
  if (value.startsWith('data:')) return { srcKind: 'data-url', srcLength: value.length };
  if (value.startsWith('/uploads/')) return { srcKind: 'relative-upload', srcPath: value.slice(0, 220) };

  try {
    const url = new URL(value);
    return {
      srcKind: url.pathname.startsWith('/uploads/') ? 'absolute-upload' : 'absolute',
      srcHost: url.host,
      srcPath: url.pathname.slice(0, 220),
    };
  } catch {
    return { srcKind: 'unknown', srcPath: value.slice(0, 220) };
  }
}

export function reportClientDiagnostic(event: string, route: string, payload: DiagnosticPayload = {}) {
  const body = {
    event: safeText(event, 80),
    route: safeText(route, 120),
    ts: Date.now(),
    ...payload,
    ...classifyDiagnosticSrc(payload.src),
    src: undefined,
  };

  void post('/api/v1/diagnostics/client-log', body, { timeout: 4000 }).catch(() => undefined);
}

export function reportPlaybackDiagnostic(event: string, payload: DiagnosticPayload = {}) {
  reportClientDiagnostic(event, 'pages/home/index', payload);
}
