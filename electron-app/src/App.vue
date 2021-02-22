<template>
  <v-app id="inspire">
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
          this.$router.push('/init') 
        } else {
          if (this.$route.path == '/StandaloneShell') {
            this.$vuetify.theme.dark = true
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
  beforeMount () {

  },
}
</script>
<style scope="global">
.clickable {
  cursor: pointer;
}
</style>