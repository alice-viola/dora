<template>
  <v-app id="inspire">
    <div class="green" style="width: 100%; height: 5px; position: absolute; z-index: 10000"></div>
    <v-app-bar app v-if="$store.state.user.auth == true">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>PWM {{$route.path.toLowerCase()}}</v-toolbar-title>
      <v-spacer />
      <!--<v-btn icon>
        <v-icon>mdi-magnify</v-icon>
      </v-btn>-->
      <b>{{$store.state.user.name}}</b>
      <v-btn icon v-on:click="logout">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" fixed temporary v-if="$store.state.user.auth == true">
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title class="title">
            Dashboard
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-divider></v-divider>

      <v-list-item>
        <v-list-item-content>
          <v-list-item-title class="title">
            Resources
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-divider></v-divider>
      <v-list
        dense
        nav
      >
        <v-list-item
          v-for="item in $store.state.sidebar.resources"
          :key="item.policyName"
          link
        >
          <v-list-item-content v-on:click="goToResource(item.policyName)">
            <v-list-item-title>{{ item.policyName }}</v-list-item-title>
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
    <v-footer class="green" v-if="$store.state.user.auth == false">
      <v-flex class='text-xs-center'> © 2020 ProM Facility </v-flex>
    </v-footer>
  </v-app>
</template>

<script>
  export default {
    data: () => ({ drawer: null }),
    methods: {
      logout () {
        this.$store.dispatch('logout')
      },
      goToResource (name) {
        this.$router.push('/resource/' + name)
      }
    },
    mounted () {
      if (this.$cookie.get('auth') == 'true') {
        this.$store.commit('user', {
          name: this.$cookie.get('name'),
          auth: true,
          token: this.$cookie.get('pwmtoken')
        })
        this.$store.dispatch('groups')
        this.$router.push('/')
      }
    }
  }
</script>