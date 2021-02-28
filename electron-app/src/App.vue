<template>
  <v-app id="inspire">

    <!--<v-avatar v-if="$route.name !== 'Dashboard' && $route.name !== 'StandaloneShell' && $route.name !== 'Init'" v-on:click="$router.push('/dashboard').catch(err => {})" class="clickable" size="36" style="position: fixed; top: 15px; left: 12px; z-index: 132312321312312321312">
      <v-img src="./assets/logo_1.png" ></v-img>
    </v-avatar>-->

    <v-app-bar app>
      <v-app-bar-nav-icon @click="drawer = !drawer">
        <v-img width="30px" style="border-radius: 30px" src="./assets/logo_1.png" ></v-img>
      </v-app-bar-nav-icon>

      <v-toolbar-title><h3 class="button"> {{$route.name}} </h3></v-toolbar-title>
    </v-app-bar>

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
  mounted () {
    this.$store.dispatch('checkUserCfg', {cb: function (hasConfigFile) {
      this.$store.dispatch('initAppCfg', {cb: function () {
        if (hasConfigFile == false) {
          this.$vuetify.theme.dark = true
          this.$vuetify.theme.themes.dark.primary = '#F96F5D'
          this.$router.push('/init') 
        } else {
          if (this.$route.path == '/StandaloneShell') {
            this.$vuetify.theme.dark = true
            this.$vuetify.theme.themes.dark.primary = '#F96F5D'
          } else {
            this.$store.dispatch('setTheme', {
              vuetify: this.$vuetify,
              theme: this.$store.state.app.db.get('ui.editor.theme').value()
            })
            this.$router.push('/dashboard') 
          }
        }
      }.bind(this)
      })
    }.bind(this)})
  },
  beforeMount () {},
}
</script>
<style scope="global">
.clickable {
  cursor: pointer;
}
</style>