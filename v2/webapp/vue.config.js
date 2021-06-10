const path = require('path');


module.exports = {
  "lintOnSave": false,
  "transpileDependencies": [
    "vuetify"
  ],
  "pwa": {
    name: 'DORAWM',
    themeColor: '#F96F5D',
    workboxPluginMode: 'InjectManifest',
    workboxOptions: {
      swSrc: './src/registerServiceWorker.js',
    },
  }
}