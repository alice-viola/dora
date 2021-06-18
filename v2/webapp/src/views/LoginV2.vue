<template>
  <v-container class="pa-0" fluid id="LoginPageContainer">
    <v-row align="center" justify="left">
      <v-col class="col-1 col-md-8 col-lg-8 mainbackground darken-4 elevation-12 pa-2" id="LoginPage">
        <v-footer style="background: rgba(0,0,0,0); position: absolute; bottom: 0px; right: 0px" v-if="$store.state.user.auth == false">
          <v-flex class='text-xs-center overline'> © 2021 ProM Facility </v-flex>
          <ThemeChanger/>
        </v-footer>
      </v-col>
      <v-col class="col-11 col-md-4 col-lg-4 mainbackground darken-1  elevation-12"  style="height: 100vh" >
        <v-card outlined class="elevation-0 mainbackground darken-1 pa-6">
          <v-card-title style="font-weight: 300; margin-top: 25vh">
            Dora
          </v-card-title>
          <v-card-subtitle class="overline" style="font-weight: 300">
            AI Workload Manager
          </v-card-subtitle>
          <v-card-text class="mt-6">
            <v-card-subtitle style="font-weight: 300">
              Login
            </v-card-subtitle>
            <v-text-field
              id="password"
              dense
              placeholder="Bearer Token"
              name="password"
              class="primary--text ml-4 pr-4"
              prepend-icon="fa-lock"
              type="password"
              v-model="token"
              @keyup.enter="login()"
            >
            </v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn icon text class="ma-0 mr-4" color="primary" v-on:click="login"><v-icon>fas fa-sign-in-alt</v-icon></v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

  </v-container>
</template>
<script>
// @ is an alias to /src

export default {
  name: 'Login',
  data: function () {
    return { 
      token: null
    }
  },
  methods: {
    login () {
      this.$store.dispatch('login', this.token)
    }
  },
  mounted () {
    if (this.$cookie.get('auth') == true) {
      //this.$router.push('/')
      this.$router.push('/resource/Container')
    }
  }
}
</script>
<style>
#LoginPageContainer {
  overflow-y: hide;
}
#LoginPage {
  background: url(../assets/login1.svg) no-repeat center center;
  -webkit-background-size: contain;
  -moz-background-size: contain;
  -o-background-size: contain;
  background-size: contain;
  height: 100vh;
}
</style>
