module.exports = {
  "lintOnSave": false,
  "transpileDependencies": [
    "vuetify"
  ],
  "pwa": {
    workboxPluginMode: 'InjectManifest',
    workboxOptions: {
      swSrc: './src/registerServiceWorker.js',
    },
  }
}