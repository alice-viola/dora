module.exports = {
  "lintOnSave": false,
  "transpileDependencies": [
    "vuetify"
  ],
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      externals: []
    }
  },
  "pwa": {
    name: 'DORAWM',
    themeColor: '#F96F5D',
    workboxPluginMode: 'InjectManifest',
    workboxOptions: {
      swSrc: './src/registerServiceWorker.js',
    },
  }
}