<template>
  <v-app id="inspire">
    <!-- Sidebar -->
    <v-navigation-drawer floating class="elevation-6" v-model="drawer" app v-if="$store.state.user.auth == true && $store.state.ui.hideNavbarAndSidebar == false" :mini-variant="false" align="center" justify="center">
      <v-list
        dense
        nav
      >        
        <v-list-item link v-on:click="$router.push('/')">
          <v-tooltip left>
            <template v-slot:activator="{ on, attrs }">
              <v-list-item-icon>
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-icon v-bind="attrs" v-on="on" color="primary" v-if="$route.path == '/'">fas fa-columns</v-icon>
                    <v-icon v-bind="attrs" v-on="on" color="grey" v-else>fas fa-columns</v-icon>
                  </template>
                  <span>Control panel</span>
                </v-tooltip>

              </v-list-item-icon>
              <v-list-item-content v-on:click="$router.push('/')">
                <v-list-item-title>Control panel</v-list-item-title>
              </v-list-item-content>
            </template>
            <span>Control panel</span>
          </v-tooltip>
        </v-list-item>

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
          <v-btn icon v-on:click="logout">
            <v-icon>mdi-logout</v-icon>
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
    <v-app-bar dense app v-if="$store.state.user.auth == true && $store.state.ui.hideNavbarAndSidebar == false" class="elevation-4">
      <v-app-bar-nav-icon @click="drawer = !drawer" ></v-app-bar-nav-icon>
      <!--<v-app-bar-nav-icon @click="expander = !expander"><i class="fas fa-arrows-alt-h"></i></v-app-bar-nav-icon>
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>-->

      <v-toolbar-title v-if="$route.params.name == undefined || $store.state.ui.isMobile == false" style="cursor: pointer" v-on:click="$router.push('/')"><h1 class="overline" style="font-size: 24px !important; font-weight: 100"> <b style="font-weight: 300">Dora</b>WM </h1></v-toolbar-title>
      <!--<v-toolbar-title class="overline ml-2">{{$route.params.name}}</v-toolbar-title>-->
    <!-- ZONE -->
    <v-divider
      class="mx-4"
      vertical
    ></v-divider>         
          <v-menu
            bottom
            right            
          >
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                dark
                icon
                v-bind="attrs"
                v-on="on"
                class="green--text"
              >
                <v-icon>fas fa-globe-europe</v-icon>                
              </v-btn>
            </template>
            <v-list>
              <v-list-item
                v-for="(item, i) in zones"
                :key="i"
                @click="zone = item"
              >
                <v-list-item-title v-if="item == zone"><b>{{ item }}</b></v-list-item-title>
                <v-list-item-title v-else>{{ item }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
          dc.rov.01
    <v-divider
      class="mx-4"
      vertical
    ></v-divider>
          <!-- WORKSPACE -->
          <v-menu
            bottom
            right            
          >
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                dark
                icon
                v-bind="attrs"
                v-on="on"
                class="teal--text"
              >
                <v-icon>fa-layer-group</v-icon>                
              </v-btn>
            </template>

            <v-list>
              <v-list-item
                v-for="(item, i) in workspaces"
                :key="i"
                @click="workspace = item"
              >
                <v-list-item-title v-if="item == workspace"><b>{{ item }}</b></v-list-item-title>
                <v-list-item-title v-else>{{ item }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
          {{workspace}}

      <v-spacer />
      <v-divider
        class="mx-4"
        vertical
      ></v-divider>
      <b v-if="credits !== null" :class="credits.outOfCredit == true ? 'error--text' : '' ">{{parseInt(credits.weekly)}} C</b>
      <v-divider
        class="mx-4"
        vertical
      ></v-divider>      
      
      <v-btn text v-on:click="$router.push('/')">
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
              <v-icon v-bind="attrs" v-on="on"  class="blue--text" v-if="$route.path == '/'">fas fa-columns</v-icon>
              <v-icon v-bind="attrs" v-on="on"  v-else>fas fa-columns</v-icon>
          </template>
          <span>Control panel</span>
        </v-tooltip>
      </v-btn>
      <v-btn text v-for="resource in listOfResourceToDisplayForToolbar" v-bind:key="resource" v-on:click="goToResource(resource)">
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-icon class="blue--text" v-bind="attrs" v-on="on" v-if="'/resource/' + resource == $route.path">{{iconForResource(resource)}}</v-icon>
            <v-icon v-bind="attrs" v-on="on" v-else>{{iconForResource(resource)}}</v-icon>
          </template>
          <span>{{resource}}</span>
        </v-tooltip>
      </v-btn>

      <v-divider
        class="mx-4"
        vertical
      ></v-divider>      
      <ThemeChanger/>
      <v-btn icon v-on:click="logout">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main class="mainbackground">
        <router-view ></router-view>
    </v-main>

    <!--<v-fab-transition v-if="$store.state.user.auth == true && $store.state.ui.hideNavbarAndSidebar == false">
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
    </v-fab-transition>-->

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
      tabResource: 1,
      navDrawKey: 1,
      drawer: false,
      expander: true,
      newResourceDialog: false,
      workspaces: [],
      zones: [],
      workspace: '',
      groups: [],
      userTree: {},
      listOfResourceToDisplay: [],
      listOfResourceToDisplayForToolbar: [],
      listOfResourceToDisplayForMenu: [],
      credits: null
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
      },
      '$store.state.user.auth' (to, from) {
        if (to == true) {
          this.checkCredits()
        }
      }
    },
    methods: {
      checkCredits (onlyOne) {
        console.log('check 1')
        let _check = function  () {
          console.log('check 3')
          this.$store.dispatch('userCredits', function (data) {
            this.credits = data
          }.bind(this))
        }.bind(this)
        _check()
        if (onlyOne == true) {
          return
        }
        setInterval(function () {
          console.log('check 2')
          _check()
        }.bind(this), 1000)
      },
      getListOfResourceToDisplay () {
        // console.log(this.$store.state.user.workspaces)
        // console.log(this.$store.state.selectedWorkspace)
        // console.log(this.$store.state.user.tree)
        //this.workspaces = this.$store.state.user.workspaces
        this.workspace = this.$store.state.selectedWorkspace
        this.userTree = this.$store.state.user.tree
        let currentZone = this.$store.state.selectedZone
        let currentWorkspace = this.$store.state.selectedWorkspace
        if (Object.keys(this.userTree.zone).length == 1 && this.userTree.zone['All'] !== undefined) {
          currentZone = 'All'
        }
        this.workspaces = Object.keys(this.userTree.zone[currentZone].workspace)
        this.zones = Object.keys(this.userTree.zone)
        let listOfRes = this.userTree.zone[currentZone].workspace[currentWorkspace]
        let listOfResourceToDisplay = []
        Object.keys(listOfRes).forEach(function (resourceKind) {
          if (listOfRes[resourceKind].includes('Get') && resourceKind !== 'Token') {
            listOfResourceToDisplay.push(resourceKind)
          }
        }.bind(this))
        this.listOfResourceToDisplay = Array.from((new Set(listOfResourceToDisplay)).values())
        let toToolbar = ['Workload', 'Container', 'Workspace', 'Resourcecredit']
        let toMenu = ['Node', 'Storage', 'GPU', 'CPU', 'Zone', 'Project', 'Role', 'Volume', 'Usercredit']
        this.listOfResourceToDisplayForToolbar = this.listOfResourceToDisplay.filter((l) => {
          return toToolbar.includes(l)
        })
        this.listOfResourceToDisplayForMenu = this.listOfResourceToDisplay.filter((l) => {
          return toMenu.includes(l)
        })        
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
    mounted () {
      var userAgent = navigator.userAgent.toLowerCase()
      if (userAgent.indexOf(' electron/') > -1) {
        this.$store.commit('setIsElectron', true)
      }
      this.getListOfResourceToDisplay()
      this.checkCredits(true)
    },
    created () {
      var userAgent = navigator.userAgent.toLowerCase()
      if (userAgent.indexOf(' electron/') > -1) {
        this.$store.commit('setIsElectron', true)
      }
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