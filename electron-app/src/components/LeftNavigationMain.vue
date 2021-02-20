<template>

      <v-navigation-drawer
        v-model="drawer"
        absolute
        permanent
        class="navigationDrawerMain darken-0 elevation-0"
        floating
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
          <v-icon color="primary" v-if="$route.name == 'Workloads'">fab fa-docker</v-icon>
          <v-icon color="grey" v-else>fas fa-box</v-icon>
        </v-avatar>

        <!-- Settings -->
       <v-avatar v-on:click="$router.push('/settings').catch(err => {})" class="d-block text-center mx-auto mt-4 clickable" size="36">
          <v-icon color="primary" v-if="$route.name == 'Settings'">fa-users-cog</v-icon>
          <v-icon color="grey" v-else>fa-users-cog</v-icon>
        </v-avatar>

      </v-navigation-drawer>
</template>
<script>
export default {
  name: 'LeftNavigationMain',
  data: () => ({
    drawer: null,
    
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
  }
}
</script>
<style scope="global" lang="scss">
.clickable {
  cursor: pointer;
}
</style>