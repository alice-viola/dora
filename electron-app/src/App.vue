<template>
  <v-app id="inspire">
    <!--<v-system-bar class="navigationDrawerMain darken-0 elevation-0" app style="z-index: 100000000000000;" v-if="$store.state.userCfg.hasConfigFile == true">      
      <v-icon class="red--text">fa-circle</v-icon>
      <v-icon class="yellow--text">fa-circle</v-icon>
      <v-icon class="green--text" @click="resize">fa-circle</v-icon>
      <v-spacer />
      <b>{{$store.state.appname}}</b>
      <v-spacer />
      <b> v0.1 </b>-->
      <!--<v-select solo dense :items="Object.keys($store.state.userCfg.cfg.api)" style="width: 200px !important; margin-top: 15px" />-->
    </v-system-bar>
    <v-main class="mainbackground lighten-0">
      <router-view></router-view>
    </v-main>
  </v-app>
</template>

<script>
const remote = require('electron').remote

export default {
  name: 'App',

  components: {
    
  },
  watch: {

  },
  data: () => ({
    drawer: null,
    rightDrawer: true,
  }),
  methods: {
    resize () {
       var window = remote.getCurrentWindow()
       window.maximize()
    }
  },
  mounted () {
    this.$store.dispatch('checkUserCfg', {cb: function (hasConfigFile) {
      this.$store.dispatch('initAppCfg', {cb: function () {
        if (hasConfigFile == false) {
          this.$router.push('/init') 
        } else {
          this.$router.push('/dashboard') 
        }
      }.bind(this)
      })
    }.bind(this)})
  },
  beforeMount () {
    this.$vuetify.theme.dark = true
    let theme = {
      mainbackground: "#1f2430",//"#121212",
      navigationDrawerMain: "#1f2430",
      navigationDrawerPage: "#1f2430",
      navigationDrawerRight: "#1f2430", //1f2430
      primary: "#F96F5D",
      accent: "#F96F5D",
      secondary: "#ffb74d",
      success: "#86af3f",
      info: "#727272",
      warning: "#FB8C00",
      error: "#FF5252",
    }
    Object.keys(theme).forEach (function (key) {
      this.$vuetify.theme.themes.dark[key] = theme[key]
    }.bind(this))
  },
}
</script>
<style scope="global">
.clickable {
  cursor: pointer;
}
</style>