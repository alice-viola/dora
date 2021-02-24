<template>
  <div align="center" justify="center">
    <v-navigation-drawer
        v-model="drawer"
        absolute
        permanent
        class="navigationDrawerMain lighten-0 elevation-2"
        floating
        mini-variant
    >
      <v-layout column fill-height>

        <v-spacer></v-spacer>
        <!-- Dashboard -->
        <v-avatar v-on:click="$router.push('/dashboard').catch(err => {})" class="d-block text-center mx-auto mt-4 clickable" size="36">
          <v-icon color="primary" v-if="$route.name == 'Dashboard'">fa-home</v-icon>
          <v-icon color="grey" v-else>fa-home</v-icon>
        </v-avatar>


        <!-- Projects -->
        <v-avatar v-on:click="projectRoute()" class="d-block text-center mx-auto mt-4 clickable" size="36">
          <v-icon color="primary" v-if="$route.name == 'Projects'">fa-microscope</v-icon>
          <v-icon color="grey" v-else>fa-microscope</v-icon>
        </v-avatar>

        <!-- Project -->
        <v-avatar v-on:click="selectedProjectRoute()" class="d-block text-center mx-auto mt-4 clickable" size="36" v-if="$store.state.ui.selectedProjectId !== null">
          <v-icon color="primary" v-if="$route.name == 'Project'">fa-vial</v-icon>
          <v-icon color="secondary" v-else>fa-vial</v-icon>
        </v-avatar>

        <!-- Workloads -->
        <v-avatar v-on:click="$router.push('/workloads').catch(err => {})" class="d-block text-center mx-auto mt-4 clickable" size="36">
          <v-icon color="primary" v-if="$route.name == 'Workloads'">fab fa-docker</v-icon>
          <v-icon color="grey" v-else>fab fa-docker</v-icon>
        </v-avatar>

        <!-- Disks -->
        <v-avatar v-on:click="$router.push('/disks').catch(err => {})" class="d-block text-center mx-auto mt-4 clickable" size="36">
          <v-icon color="primary" v-if="$route.name == 'Disks'">fas fa-hdd</v-icon>
          <v-icon color="grey" v-else>fas fa-hdd</v-icon>
        </v-avatar>

        <!-- GPUS -->
        <v-avatar v-on:click="$router.push('/gpus').catch(err => {})" class="d-block text-center mx-auto mt-4 clickable" size="36">
          <v-icon color="primary" v-if="$route.name == 'GPUS'">fas fa-brain</v-icon>
          <v-icon color="grey" v-else>fas fa-brain</v-icon>
        </v-avatar>

        <v-spacer></v-spacer>
        <!-- Settings -->
        <v-avatar v-on:click="$router.push('/settings').catch(err => {})" class="d-block text-center mx-auto mt-4 clickable" size="36">
          <v-icon color="primary" v-if="$route.name == 'Settings'">fa-users-cog</v-icon>
          <v-icon color="grey" v-else>fa-users-cog</v-icon>
        </v-avatar>
        
      </v-layout>
    </v-navigation-drawer>
  </div>
</template>
<script>
export default {
  name: 'LeftNavigationMain',
  data: () => ({
    drawer: null,
    
  }),
  methods: {
    selectedProjectRoute () {
      this.$router.push('/project').catch(err => {})
    },
    projectRoute () {
      if (this.$route.name == 'Projects') {
        this.$store.commit('projectView', 'projects-list')
        this.$store.commit('setUi', {leftDrawerComponent: 'projects-list'})
        this.$router.push('/projects')
      } else {
        this.$router.push('/projects').catch(err => {})
      }
      
    }
  }
}
</script>
<style scope="global" lang="scss">
.clickable {
  cursor: pointer;
}
</style>