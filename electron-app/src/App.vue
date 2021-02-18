<template>
  <v-app id="inspire">
    <v-system-bar class="mainbackground lighten-1 elevation-8" app style="z-index: 100000000000000;" v-if="$store.state.userCfg.hasConfigFile == true">
      <b>{{$store.state.appname}}</b>
      <v-spacer></v-spacer>
      <!--<v-icon>fa-square</v-icon>
      <v-icon>fa-circle</v-icon>
      <v-icon>fa-triangle</v-icon>-->
      <!--<v-select solo dense :items="Object.keys($store.state.userCfg.cfg.api)" style="width: 200px !important; margin-top: 15px" />-->
    </v-system-bar>
    <v-main class="mainbackground lighten-0">
      <router-view></router-view>
    </v-main>
  </v-app>
</template>

<script>

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
      mainbackground: "#121212",
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