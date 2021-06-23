<template>
  <v-app id="inspire">
    <!-- Sidebar -->
    <v-navigation-drawer floating class="elevation-6" v-model="drawer" app v-if="$store.state.user.auth == true && $store.state.ui.hideNavbarAndSidebar == false" :mini-variant="expander" align="center" justify="center">
      <v-list
        dense
        nav
        dense
      >        
        <v-list-item v-if="listOfResourceToDisplay.length !== 0"
          v-for="resource in listOfResourceToDisplay"
          :key="resource"
          link
          v-on:click="goToResource(resource)"
        >
          <v-tooltip left>
            <template v-slot:activator="{ on, attrs }">
              <v-list-item-icon>
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-icon v-bind="attrs" v-on="on" color="primary" v-if="$route.path.split('/')[2] == resource">{{iconForResource(resource)}}</v-icon>
                    <v-icon v-bind="attrs" v-on="on" color="grey" v-else>{{iconForResource(resource)}}</v-icon>
                  </template>
                  <span>{{resource}}</span>
                </v-tooltip>

              </v-list-item-icon>
              <v-list-item-content v-on:click="goToResource(resource)">
                <v-list-item-title>{{ resource }}</v-list-item-title>
              </v-list-item-content>
            </template>
            <span>{{resource}}</span>
          </v-tooltip>
        </v-list-item>
      </v-list>

      <template v-slot:append>
        <div class="pa-2">
          <ThemeChanger/>
        </div>

        <div class="pa-2">
          <v-menu right top>
            <template v-slot:activator="{ on, attrs }">
              <v-btn icon text v-bind="attrs" v-on="on" >
                <v-icon color="primary">
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
                <v-list-item-title v-if="group !== $store.state.user.selectedGroup">{{ group }}</v-list-item-title>
                <v-list-item-title v-else class="primary--text">{{ group }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
  
        <div class="pa-2">
          <v-btn icon v-on:click="logout">
            <v-icon color="primary">mdi-logout</v-icon>
          </v-btn>
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
    <v-app-bar dense app v-if="$store.state.user.auth == true && $store.state.ui.hideNavbarAndSidebar == false" class="elevation-3">
      <!--<v-app-bar-nav-icon @click="drawer = !drawer" v-if="$store.state.ui.isMobile == true || drawer == false"></v-app-bar-nav-icon>-->
      <v-app-bar-nav-icon @click="expander = !expander"><i class="fas fa-arrows-alt-h"></i></v-app-bar-nav-icon>
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>

      <v-toolbar-title v-if="$route.params.name == undefined || $store.state.ui.isMobile == false" style="cursor: pointer" v-on:click="$router.push('/')"><h1 class="overline" style="font-size: 24px !important; font-weight: 100"> <b style="font-weight: 300">Dora</b>WM </h1></v-toolbar-title>
      <v-toolbar-title class="overline ml-2">{{$route.params.name}}</v-toolbar-title>

      <!-- Workspace selector -->
      <v-spacer />
      <v-select
        class = 'pa-2 pt-9'
        v-model="workspace"
        label="Workspace"
        
        dense
        :items="workspaces"
        style="max-width: 200px"
      ></v-select>   

      <!-- Toolbar resource -->
      <v-row v-if="$route.params.name !== undefined && $store.state.ui.isMobile == false && $store.state.ui.resourceView == 1">
        <v-spacer />
        <v-text-field class="mainbackground mt-1" flat
            :label="'Search in ' + $route.params.name + 's'"
            solo
            dense
            v-model="$store.state.search.filter"
            hide-details="auto"
        ></v-text-field>
        <v-pagination v-if="$store.state.search.pages > 1"
          circle
          class="mainbackground mt-0"
          v-model="$store.state.search.page"
          :length="$store.state.search.pages"
          :total-visible="6"
        ></v-pagination>
      </v-row>

      <!-- Toolbar GPU -->
      <v-row v-if="$route.name == 'Stat' && $store.state.ui.isMobile == false" class = 'mt-10'>
          <v-spacer />
          <v-select
            class = 'pa-2'
            v-model="$store.state.ui.stat.type"
            label="Metric"
            outlined
            dense
            :items="['cluster', 'gpus']"
          ></v-select>      
          <v-select v-if="$store.state.ui.stat.filters.length > 0"
            class = 'pa-2'
            v-model="$store.state.ui.stat.filter"
            label="Filter"
            outlined
            dense
            :items="$store.state.ui.stat.filters"
          ></v-select>
          <v-select
            class = 'pa-2'
            v-model="$store.state.ui.stat.period"
            label="Period"
            outlined
            dense
            :items="['1m', '10m', '1h', '1d', '1w', '1M', '1y']"
          ></v-select>
      </v-row>

    </v-app-bar>

    <v-main class="mainbackground">
        <router-view ></router-view>
    </v-main>

    <v-fab-transition v-if="$store.state.user.auth == true && $store.state.ui.hideNavbarAndSidebar == false">
      <v-btn
        style="position: fixed; bottom: 15px; right: 15px; z-index: 10"
        key="newResource"
        color="primary"
        fab
        small
        @click="newResourceDialog = true"
      >
        <v-icon>mdi-plus</v-icon>
      </v-btn>
    </v-fab-transition>

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
    <v-dialog max-width="600px" v-model="newResourceDialog">
      <EditResourceAsYaml v-if="newResourceDialog == true"/>
    </v-dialog>
    <cookie-law theme="blood-orange">
      <div slot="message">
        © 2021 ProM Facility. This site use technical cookies in order to preserve user preferences and authorizations.
      </div>
    </cookie-law>
  </v-app>
</template>

<script>
  import NewResource from '@/components/NewResource.vue'
  import CreateResource from '@/components/CreateResource.vue'
  import EditResourceAsYaml from '@/components/EditResourceAsYaml.vue'
  import ThemeChanger from '@/components/ThemeChanger.vue'
  import CookieLaw from 'vue-cookie-law'

  export default {
    data: () => ({ 
      navDrawKey: 1,
      drawer: null,
      expander: true,
      newResourceDialog: false,
      workspaces: [],
      workspace: '',
      groups: [],
      userTree: {},
      listOfResourceToDisplay: []
    }),
    components: {NewResource, CreateResource, EditResourceAsYaml, CookieLaw, ThemeChanger},
    watch: {
      '$vuetify.breakpoint.width' (to, from) {
        if (to <= 760) {
          this.$store.commit('isMobile', true)
        } else {
          this.$store.commit('isMobile', false)
        }
      },
      '$store.state.groupCallIndex' (to, from) {
        this.getListOfResourceToDisplay()
      },
      workspace (to, from) {
        this.$store.commit('selectedWorkspace', to)
        this.getListOfResourceToDisplay()
      }
    },
    methods: {
      getListOfResourceToDisplay () {
        this.workspaces = this.$store.state.user.workspaces
        this.workspace = this.$store.state.selectedWorkspace
        this.userTree = this.$store.state.user.tree
        let currentZone = this.$store.state.selectedZone
        let currentWorkspace = this.$store.state.selectedWorkspace
        if (Object.keys(this.userTree.zone).length == 1 && this.userTree.zone['All'] !== undefined) {
          currentZone = 'All'
        }
        if (Object.keys(this.userTree.zone[currentZone].workspace).length == 1 && this.userTree.zone[currentZone].workspace['All'] !== undefined) {
          currentWorkspace = 'All'
        }
        let listOfRes = this.userTree.zone[currentZone].workspace[currentWorkspace]
        let listOfResourceToDisplay = []
        Object.keys(listOfRes).forEach(function (resourceKind) {
          if (listOfRes[resourceKind].includes('Get') && resourceKind !== 'Token') {
            listOfResourceToDisplay.push(resourceKind)
          }
        }.bind(this))
        this.listOfResourceToDisplay = Array.from((new Set(listOfResourceToDisplay)).values())
      },
      iconForResource (resource) {
        let icons = {
          'Workload': 'fa-box',
          'Container': 'fab fa-docker',
          'Role': 'fas fa-user-tag',
          'Storage': 'fa-database',
          'Volume': 'fa-hdd',
          'Node': 'fa-server',
          'Group': 'fa-layer-group',
          'Workspace': 'fa-layer-group',
          'User': 'fa-users',
          'CPU': 'fa-microchip',
          'GPU': 'fa-brain',
          'Bind': 'fa-project-diagram',
          'Zone': 'fa-list-ol',
          'Project': 'fas fa-project-diagram',
          'Resourcecredit': 'fas fa-hand-holding-usd',
          'Usercredit': 'fas fa-credit-card'
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
      
    },
    mounted () {
      
      this.getListOfResourceToDisplay()
    },
    created () {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for (let registration of registrations) {
          registration.unregister()
        } 
      })
      if (screen.width <= 760) {
        this.$store.commit('isMobile', true)
      }
    }
  }
</script>
<style scoped>
.v-expansion-panel-content__wrap {
    padding: 0px;
}
.v-btn--example {
  bottom: 15px;
  position: absolute;
  right: 15px;
}
.backimage {
background: #121212;  
background: -webkit-linear-gradient(to bottom, #121212, #171717);
background: linear-gradient(to bottom, #121212, #171717); 
}
</style>