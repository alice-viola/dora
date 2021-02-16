<template>
  <v-app id="inspire">
    <v-system-bar class="primary" app style="z-index: 100000000000000">
      <b>DeepDev</b>
      <v-spacer></v-spacer>
      <v-icon>fa-square</v-icon>
      <v-icon>fa-circle</v-icon>
      <v-icon>fa-triangle</v-icon>
    </v-system-bar>

    <!--<v-app-bar
      app
      clipped-right
      flat
      height="72"
    >
      <v-spacer></v-spacer>

      <v-responsive max-width="156">
        <v-text-field
          dense
          flat
          hide-details
          rounded
          solo-inverted
        ></v-text-field>
      </v-responsive>
    </v-app-bar>-->

    <v-navigation-drawer
      v-model="drawer"
      app
      permanent
      class="mainbackground lighten-1 elevation-2"
      width="300"
    >
      <v-navigation-drawer
        v-model="drawer"
        absolute
        permanent
        class="mainbackground lighten-0 elevation-1"
        mini-variant
      >
        <!-- Dashboard -->
       <v-avatar v-on:click="$router.push('/dashboard')" class="d-block text-center mx-auto mt-4" size="36">
          <v-icon color="primary" v-if="$route.name == 'Dashboard'">fa-tachometer-alt</v-icon>
          <v-icon color="grey" v-else>fa-tachometer-alt</v-icon>
        </v-avatar>

        <!-- Projects -->
       <v-avatar v-on:click="$router.push('/projects')" class="d-block text-center mx-auto mt-4" size="36">
          <v-icon color="primary" v-if="$route.name == 'Projects'">fa-vials</v-icon>
          <v-icon color="grey" v-else>fa-vials</v-icon>
        </v-avatar>

        <!-- Settings -->
       <v-avatar v-on:click="$router.push('/settings')" class="d-block text-center mx-auto mt-4" size="36">
          <v-icon color="primary" v-if="$route.name == 'Settings'">fa-users-cog</v-icon>
          <v-icon color="grey" v-else>fa-users-cog</v-icon>
        </v-avatar>

      </v-navigation-drawer>
      
      <!-- Page specific navigation drawer -->
      <div class="pl-14" >
        <div v-if="leftDrawerComponent !== null">
          <component  :is="$store.state.ui.leftDrawerComponent"></component>
        </div>
      </div>
    </v-navigation-drawer>

    <!-- Right navigation drawer -->
    <v-navigation-drawer app clipped mini-variant right v-model="rightDrawer">
      <v-avatar
          v-for="n in 6"
          :key="n"
          class="d-block text-center mx-auto mb-9"
          color="grey lighten-1"
          size="28"
        ></v-avatar>
    </v-navigation-drawer>

    <v-main class="mainbackground lighten-2">
      <router-view></router-view>
    </v-main>

  </v-app>
</template>


<script>
  export default {
    data: () => ({ drawer: null }),
  }
</script>
<script>

export default {
  name: 'App',

  components: {
    'projects-explorer': () => import('@/components/ProjectsExplorer'),
    'files-explorer': () => import('@/components/FilesExplorer'),
    'settings-navigator': () => import('@/components/SettingsNavigator'),
  },
  watch: {
    '$store.state.ui.leftDrawerComponent' (to, from) {
      console.log('--->', to)
      this.leftDrawerComponent = to
    }
  },
  data: () => ({
    drawer: null,
    rightDrawer: true,
    leftDrawerComponent: null
  }),
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
  mounted () {
    this.$store.dispatch('checkUserCfg')
  }
}
</script>