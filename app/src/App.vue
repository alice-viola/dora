<template>
  <v-app id="inspire">
    <div class="green" style="width: 100%; height: 5px; position: absolute; z-index: 10000"></div>
    <v-progress-linear
      indeterminate
      color="red darken-2"
      style="height: 5px; position: absolute; z-index: 10000"
      v-if="$store.state.ui.fetchingNewData == true"
    ></v-progress-linear>
    <v-app-bar app v-if="$store.state.user.auth == true">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>PWM {{$route.path.toLowerCase()}}</v-toolbar-title>
      <v-spacer />
      <v-btn
        color="green"
        fab
        small
        dark
        icon
        @click="newResourceDialog = true"
      >
        <v-icon>mdi-new-box</v-icon>
      </v-btn>
      <v-menu
        left
        bottom
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            text
            color="green"
            v-bind="attrs"
            v-on="on"
          >
           {{$store.state.user.selectedGroup}}
          <v-icon
            right
            dark
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
      <!--<b>{{$store.state.user.name}}</b>-->
      <v-btn icon v-on:click="logout">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" 
        fixed
        permanent
        expand-on-hover
        v-if="$store.state.user.auth == true">
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title class="title">
            Dashboard
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-divider></v-divider>
      <v-list
        dense
        nav
      >
        <v-list-item v-on:click="$router.push('/resources')">
          <v-list-item-icon v-on:click="goToResource(key)">
            <v-icon small>Re</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Resources</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>    
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title class="title">
            Resources
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-divider></v-divider>
      <v-list v-if="groups !== undefined && groups.length > 0"
        dense
        nav
      >
        <v-list-item
          v-for="[key, value] in Object.entries(groups.filter((group) => { return group.name == $store.state.user.selectedGroup})[0].policy)"
          :key="key"
          link
          v-if="value.includes('get') && key !== 'token'"
        >
          <v-list-item-icon v-on:click="goToResource(key)">
            <v-icon small>{{key[0].toUpperCase() + key[1]}}</v-icon>
          </v-list-item-icon>

          <v-list-item-content v-on:click="goToResource(key)">
            <v-list-item-title>{{ key }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>

    </v-navigation-drawer>
    <router-view></router-view>
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
      <NewResource/>
    </v-dialog>
    <v-footer class="green" v-if="$store.state.user.auth == false">
      <v-flex class='text-xs-center'> © 2020 ProM Facility </v-flex>
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
  import CookieLaw from 'vue-cookie-law'
  export default {
    data: () => ({ 
      drawer: null,
      newResourceDialog: false,
      groups: []
    }),
    components: {NewResource, CookieLaw},
    methods: {
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
      console.log('->', this.$store.state.user)
      this.groups = this.$store.state.user.groups
    }
  }
</script>