export function safeClone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function safeJsonStringify(value: unknown): string {
  return JSON.stringify(value);
}
