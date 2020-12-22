<template>
  <v-app id="inspire" class="red">
    <div class="primary" style="width: 100%; height: 5px; position: absolute; z-index: 10000"></div>

    <!-- Sidebar -->
    <v-navigation-drawer class="mainbackground lighten-2 elevation-12" v-model="drawer" app v-if="$store.state.user.auth == true && $store.state.ui.hideNavbarAndSidebar == false" :mini-variant="true" align="center"
        justify="center">
      <template v-slot:prepend>
        <div class="pa-2">
          <b class="primary--text">PWM</b>
        </div>
      </template>

      <v-list
        dense
        nav
        v-if="groups !== undefined && groups.length > 0"
        v-model="navDrawKey"
        dense
      >        
        <v-list-item-group
          v-model="navDrawKey"
          active-class="primary"
        >
        <v-list-item v-on:click="$router.push('/resources')" :key="'Dashboard'">
          <v-tooltip right>
            <template v-slot:activator="{ active, on, attrs }">
              <v-list-item-icon v-on:click="$router.push('/resources')" v-bind="attrs" v-on="on">
                <v-icon color="secondary">fa-tachometer-alt</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>Dashboard</v-list-item-title>
              </v-list-item-content>
            </template>
            <span>Dashboard</span>
          </v-tooltip>
        </v-list-item>

        <v-list-item
          v-for="[key, value] in Object.entries(groups.filter((group) => { return group.name == $store.state.user.name})[0].policy)"
          :key="key"
          link
          v-if="value.includes('get') && key !== 'token'"
          v-on:click="goToResource(key)"
        >
          <v-tooltip right>
            <template v-slot:activator="{ on, attrs }">
              <v-list-item-icon v-bind="attrs" v-on="on">
                <v-icon color="secondary">{{iconForResource(key)}}</v-icon>
              </v-list-item-icon>
              <v-list-item-content v-on:click="goToResource(key)">
                <v-list-item-title>{{ key }}</v-list-item-title>
              </v-list-item-content>
            </template>
            <span>{{key}}</span>
          </v-tooltip>
        </v-list-item>

        </v-list-item-group>
      </v-list>

      <template v-slot:append>
        <div class="pa-2">
          <ThemeChanger/>
        </div>
      </template>

    </v-navigation-drawer>

    <!-- Navbar -->
    <v-progress-linear
      indeterminate
      color="red darken-2"
      style="height: 5px; position: absolute; z-index: 10000"
      v-if="$store.state.ui.fetchingNewData == true"
    ></v-progress-linear>
    <v-app-bar dense app v-if="$store.state.user.auth == true && $store.state.ui.hideNavbarAndSidebar == false" class="mainbackground lighten-1 elevation-4">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>{{$route.path.toLowerCase()}}</v-toolbar-title>
      <v-spacer />
        
      <v-btn
        color="primary"
        fab
        small
        dark
        icon
        @click="newResourceDialog = true"
      >
        <v-icon small>fa-pen</v-icon>
      </v-btn>

      
      <v-menu
        left
        bottom
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            text
            
            v-bind="attrs"
            v-on="on"
          >
           <div v-if="$store.state.user.selectedGroup !== $store.state.user.name">{{$store.state.user.selectedGroup}}</div>
          <v-icon
            right
            color="primary"
          >
            mdi-account-group-outline
          </v-icon>
          </v-btn>
        </template>
        <v-list v-if="groups !== undefined">
          <v-list-item 
            v-for="group in groups.map((g) => { return g.name })"
            :key="group"
            @click="$store.commit('selectedGroup', group)"
          >
            <v-list-item-title>{{ group }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-btn icon v-on:click="logout">
        <v-icon color="primary">mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main class="mainbackground">
      <router-view ></router-view>
    </v-main>

    <v-dialog v-model="$store.state.apiResponse.dialog" width="50vw">
      <v-card class="elevation-12">
        <v-toolbar
          :color="$store.state.apiResponse.type == 'Error' ? 'red' : 'green'" dark flat>
          <v-toolbar-title>API Response</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>
        <v-card-text>
          <h3 class="pa-md-4 mx-lg-auto">{{$store.state.apiResponse.text}}</h3>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-dialog v-model="newResourceDialog" >
      <CreateResource />
      <!--<NewResource/>-->
    </v-dialog>
    <v-footer class="primary" v-if="$store.state.user.auth == false">
      <v-flex class='text-xs-center'> © 2020 ProM Facility </v-flex>
      <ThemeChanger/>
    </v-footer>
    <cookie-law theme="blood-orange">
      <div slot="message">
        © 2020 ProM Facility. This site use technical cookies in order to preserve user preferences and authorizations.
      </div>
    </cookie-law>
  </v-app>
</template>

<script>
  import NewResource from '@/components/NewResource.vue'
  import CreateResource from '@/components/CreateResource.vue'
  import ThemeChanger from '@/components/ThemeChanger.vue'
  import CookieLaw from 'vue-cookie-law'

  export default {
    data: () => ({ 
      navDrawKey: 1,
      drawer: null,
      newResourceDialog: false,
      groups: []
    }),
    components: {NewResource, CreateResource, CookieLaw, ThemeChanger},
    methods: {
      iconForResource (resource) {
        let icons = {
          'Workload': 'fa-boxes',
          'Storage': 'fa-database',
          'Volume': 'fa-hdd',
          'Node': 'fa-server',
          'Group': 'fa-layer-group',
          'User': 'fa-users',
          'CPU': 'fa-microchip',
          'GPU': 'fa-brain',
          'Bind': 'fa-project-diagram',
          'ResourceCredit': 'fa-money-check',
          'Zone': 'fa-list-ol'
        }
        return icons[resource]
      },
      logout () {
        this.$store.dispatch('logout')
      },
      goToResource (name) {
        this.$router.push('/resource/' + name)
      }
    },
    updated () {
      this.groups = this.$store.state.user.groups
    },
    mounted () {
      this.groups = this.$store.state.user.groups
    }
  }
</script>