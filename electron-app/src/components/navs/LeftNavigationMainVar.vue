<template>
  <div>
    <v-navigation-drawer
      app
      dark
      src="https://cdn.vuetifyjs.com/images/backgrounds/bg-1.jpg"
      permanent
      :mini-variant="$store.state.ui.useMini"
    >
      <v-layout column fill-height>

        <v-list class="pt-0" >
          <v-list-item class="mb-4">
              <v-list-item-icon>
                <v-img width="30px" style="border-radius: 30px" src="../../assets/logo_1.png" ></v-img>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title class="overline">deepvirt</v-list-item-title>
                <v-list-item-subtitle>HPC/AI Scheduler</v-list-item-subtitle>
              </v-list-item-content>

              <!--<v-btn icon v-on:click="useMini = !useMini"><v-icon>fa-home</v-icon></v-btn>-->
          </v-list-item>
          <v-list-item
            v-for="(item, i) in items"
            :key="i"
            link
            v-on:click="$router.push(item.push)"
            :class="item.route == $route.name ? 'info' : '' "
          >
              <v-list-item-icon>
                <v-icon :class="item.route == $route.name ? 'primary--text' : 'info--text' ">{{ item.icon }}</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>{{ item.name }}</v-list-item-title>
                <!--<v-list-item-subtitle>{{ item.name }}</v-list-item-subtitle>-->
                
              </v-list-item-content>
          </v-list-item>
       </v-list>
      
    </v-layout>
    </v-navigation-drawer>
  </div>
</template>


<script>

  export default {
    components: {
    },
    data: () => ({
      items: [
        {name: 'Dashboard', icon: 'fa-home', route: 'Dashboard', push: '/dashboard'},
        {name: 'Projects', icon: 'fa-microscope', route: 'Projects', push: '/projects'},
        {name: 'Workloads', icon: 'fab fa-docker', route: 'Workloads', push: '/workloads'},
        {name: 'Disks', icon: 'fas fa-hdd', route: 'Disks', push: '/disks'},
        {name: 'Cluster', icon: 'fas fa-brain', route: 'Cluster', push: '/cluster'},
        {name: 'Settings', icon: 'fa-users-cog', route: 'Settings', push: '/settings'},
      ],
    }),
  }
</script>