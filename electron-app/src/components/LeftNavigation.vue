<template>
    <v-navigation-drawer
      v-model="drawer"
      app
      permanent
      class="mainbackground lighten-2 elevation-4"
      width="300"
      v-if="$store.state.userCfg.hasConfigFile == true"
    >
      <v-navigation-drawer
        v-model="drawer"
        absolute
        permanent
        class="mainbackground lighten-1 elevation-6"
        mini-variant
      >
        <!-- Dashboard -->
       <v-avatar v-on:click="$router.push('/dashboard').catch(err => {})" class="d-block text-center mx-auto mt-4 clickable" size="36">
          <v-icon color="primary" v-if="$route.name == 'Dashboard'">fa-tachometer-alt</v-icon>
          <v-icon color="grey" v-else>fa-tachometer-alt</v-icon>
        </v-avatar>

        <!-- Projects -->
       <v-avatar v-on:click="projectRoute()" class="d-block text-center mx-auto mt-4 clickable" size="36">
          <v-icon color="primary" v-if="$route.name == 'Projects'">fa-vials</v-icon>
          <v-icon color="grey" v-else>fa-vials</v-icon>
        </v-avatar>

        <!-- Workloads -->
       <v-avatar v-on:click="$router.push('/workloads').catch(err => {})" class="d-block text-center mx-auto mt-4 clickable" size="36">
          <v-icon color="primary" v-if="$route.name == 'Workloads'">fas fa-box</v-icon>
          <v-icon color="grey" v-else>fas fa-box</v-icon>
        </v-avatar>

        <!-- Settings -->
       <v-avatar v-on:click="$router.push('/settings').catch(err => {})" class="d-block text-center mx-auto mt-4 clickable" size="36">
          <v-icon color="primary" v-if="$route.name == 'Settings'">fa-users-cog</v-icon>
          <v-icon color="grey" v-else>fa-users-cog</v-icon>
        </v-avatar>

      </v-navigation-drawer>
      
      <!-- Page specific navigation drawer -->
      <div class="pl-14" >
        <div v-if="pageNavigationName !== null">
        	<component :is="pageNavigationName"></component>
        </div>
      </div>
    </v-navigation-drawer>

</template>
<script>
export default {
  name: 'LeftNavigation',
  props: ['pageNavigationName'],
  components: {
    'projects-list': () => import('@/components/ProjectsExplorer'),
    'projects-explorer': () => import('@/components/ProjectsExplorer'),
    'project-new': () => import('@/components/ProjectNewDrawer'),
    'files-explorer': () => import('@/components/FilesExplorer'),
    'settings-navigator': () => import('@/components/SettingsNavigator'),
    'workloads-explorer': () => import('@/components/WorkloadsExplorer'),
  },
  watch: {
    '$store.state.ui.leftDrawerComponent' (to, from) {
      this.leftDrawerComponent = to
    }
  },
  data: () => ({
    drawer: null,
    leftDrawerComponent: null
  }),
  methods: {
    projectRoute () {
      if (this.$route.name == 'Projects') {
        this.$store.commit('projectView', 'projects-list')
        this.$store.commit('setUi', {leftDrawerComponent: 'projects-list'})
      } else {
        this.$router.push('/projects').catch(err => {})
      }
      
    }
  },
  mounted () {

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