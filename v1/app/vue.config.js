module.exports = {
  "lintOnSave": false,
  "transpileDependencies": [
    "vuetify"
  ],
  "pwa": {
    name: 'PROMWM',
    themeColor: '#F96F5D',
    workboxPluginMode: 'InjectManifest',
    workboxOptions: {
      swSrc: './src/registerServiceWorker.js',
    },
  }
}