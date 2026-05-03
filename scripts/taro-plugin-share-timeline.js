/**
 * Taro plugin: Injects `enableShareTimeline: true` into compiled page JSON files.
 *
 * Taro 3.6.x strips `enableShareTimeline` from `definePageConfig()` during compilation,
 * but WeChat requires this field in the page JSON for "分享到朋友圈" to appear.
 * This plugin re-adds it after each build (including watch rebuilds).
 */

const fs = require('fs');
const path = require('path');

const PAGES_WITH_SHARE_TIMELINE = [
  'diary',
  'home',
  'cat-player',
  'cat-history',
  'profile',
  'points',
  'time-letters',
];

module.exports = function taroPluginShareTimeline(ctx) {
  ctx.onBuildFinish(() => {
    const distDir = ctx.paths.outputPath || path.resolve(__dirname, '..', 'dist');

    PAGES_WITH_SHARE_TIMELINE.forEach((page) => {
      const jsonPath = path.join(distDir, 'pages', page, 'index.json');
      try {
        if (fs.existsSync(jsonPath)) {
          const config = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          if (!config.enableShareTimeline) {
            config.enableShareTimeline = true;
            fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));
            console.log(`[share-timeline] Injected enableShareTimeline into pages/${page}/index.json`);
          }
        }
      } catch (err) {
        console.warn(`[share-timeline] Failed to process pages/${page}/index.json:`, err.message);
      }
    });
  });
};