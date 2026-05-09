const { dataStore } = require('./data-store');
const { authService } = require('./auth');
const { reLaunch } = require('../utils/nav');

async function routeAfterAuth() {
  const user = authService.getCachedUser();
  if (!user) {
    return reLaunch('/pages/login/index');
  }

  let cats = dataStore.getCats();
  try {
    cats = await dataStore.syncCatsFromServer();
  } catch (error) {
    console.warn('[native] sync cats before route failed:', error);
  }

  if (cats.length > 0) {
    return reLaunch('/pages/home/index');
  }
  return reLaunch('/pages/empty-cat/index');
}

module.exports = {
  routeAfterAuth
};
