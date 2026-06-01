const required = ['TARO_APP_API_BASE_URL'];

const missing = required.filter((name) => !process.env[name] || !String(process.env[name]).trim());

if (missing.length > 0) {
  console.error(`Missing release environment variables: ${missing.join(', ')}`);
  console.error('Set TARO_APP_API_BASE_URL explicitly before running release:check.');
  process.exit(1);
}

try {
  const apiBase = new URL(process.env.TARO_APP_API_BASE_URL);
  if (!['https:', 'http:'].includes(apiBase.protocol)) {
    throw new Error('unsupported protocol');
  }
} catch (error) {
  console.error(`TARO_APP_API_BASE_URL is invalid: ${error.message}`);
  process.exit(1);
}

console.log('Release environment validation passed.');
