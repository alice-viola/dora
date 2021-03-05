<template>
  <v-app id="inspire">
    <LeftNavigationMainVar />

    <v-app-bar app dense class="elevation-0">
      <v-app-bar-nav-icon @click="$store.state.ui.useMini = !$store.state.ui.useMini"></v-app-bar-nav-icon>

      <v-toolbar-title>{{$route.name}}</v-toolbar-title>

      <v-spacer></v-spacer>

      <v-btn icon>
        <v-icon>fa-home</v-icon>
      </v-btn>

      <v-app-bar-nav-icon @click="$store.state.ui.showRightDraw = !$store.state.ui.showRightDraw"></v-app-bar-nav-icon>
      
      <!--<template v-slot:extension>
        <v-tabs
          v-model="tab"
          align-with-title
        >
          <v-tabs-slider color="yellow"></v-tabs-slider>

          <v-tab
            v-for="item in items"
            :key="item"
          >
            {{ item }}
          </v-tab>
        </v-tabs>
      </template>-->
    </v-app-bar>

    <v-main class="mainbackground lighten-0">
      <router-view></router-view>
    </v-main>


  </v-app>
</template>

<script>
import LeftNavigationMainVar from '@/components/navs/LeftNavigationMainVar'
const remote = require('electron').remote

export default {
  name: 'App',

  components: {
    LeftNavigationMainVar
  },
  watch: {

  },
  data: () => ({
    drawer: null,
    tab: null,
    items: ['Page 1', 'Page 2'],
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