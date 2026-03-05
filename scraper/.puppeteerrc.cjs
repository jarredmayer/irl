const { join } = require('path');
module.exports = {
  cacheDirectory: join(process.env.HOME || '/root', '.cache', 'puppeteer'),
};
