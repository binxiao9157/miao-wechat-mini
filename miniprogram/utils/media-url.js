const { API_BASE_URL } = require('../config/env');

function pickUrl(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value !== 'object') return '';
  return pickUrl(
    value.url ||
    value.videoUrl ||
    value.video_url ||
    value.path ||
    value.filePath ||
    value.tempFilePath ||
    value.src
  );
}

function normalizeMediaUrl(value) {
  const raw = pickUrl(value);
  if (!raw) return '';
  if (/^(https?:|wxfile:|file:|cloud:)/i.test(raw)) return raw;
  if (/^\/\//.test(raw)) return `https:${raw}`;
  if (/^\/assets\//.test(raw)) return raw;
  if (/^\//.test(raw)) return `${API_BASE_URL}${raw}`;
  return raw;
}

function normalizeVideoPaths(paths = {}) {
  if (!paths || typeof paths !== 'object') return {};
  return Object.keys(paths).reduce((next, key) => {
    const url = normalizeMediaUrl(paths[key]);
    if (url) next[key] = url;
    return next;
  }, {});
}

function getCatVideoUrl(cat, action = 'idle') {
  if (!cat) return '';
  const paths = normalizeVideoPaths(cat.videoPaths);
  const fallback = normalizeMediaUrl(
    paths.idle ||
    cat.videoPath ||
    cat.videoUrl ||
    cat.video_url ||
    cat.remoteVideoUrl ||
    cat.mediaUrl ||
    cat.url
  );
  return normalizeMediaUrl(paths[action] || fallback);
}

module.exports = {
  normalizeMediaUrl,
  normalizeVideoPaths,
  getCatVideoUrl
};
