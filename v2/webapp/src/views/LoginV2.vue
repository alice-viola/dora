<template>
  <v-container class="pa-0" fluid id="LoginPageContainer">
    <v-row>
      <v-col class="col-1 col-md-8 col-lg-8  elevation-12 pa-2" :id="showDefaultImage == true ? 'LoginPage' : ''">
        <v-footer style="background: rgba(0,0,0,0); position: absolute; bottom: 0px; right: 0px" v-if="$store.state.user.auth == false">
          <v-flex class='text-xs-center overline'> © 2021 ProM Facility </v-flex>
        </v-footer>
        <ThemeChanger style="position: absolute; top: 0px; right: 0px;"/>
      </v-col>
      <v-col class="col-11 col-md-4 col-lg-4 mainbackground   elevation-12"  style="height: 100vh" >
        <v-card outlined class="elevation-0 mainbackground  pa-6">
          <v-card-title style="font-weight: 300; margin-top: 25vh">
            Dora
          </v-card-title>
          <v-card-subtitle class="overline" style="font-weight: 300">
            an all-in-one solution for training, testing and maintaining your AI based software
          </v-card-subtitle>
          <v-card-text class="mt-6 pa-0" v-if="$store.state.isElectron == false">
            <v-card-subtitle class="overline" style="font-weight: 300">
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
          <v-card-text v-else>
            <div v-if="$store.state.profiles !== null && createNewProfile == false" >
              <v-select outlined v-model="profile" :items="Object.keys($store.state.profiles.api)" label="Select your profile"></v-select>
            </div>
            <div v-else>
              <v-text-field
                id="profile"
                dense
                placeholder="Profile name"
                name="profile"
                class="primary--text ml-4 pr-4"
                prepend-icon="fa-user"
                v-model="profile"
              ></v-text-field>
              <v-text-field
                id="apiserver"
                dense
                placeholder="Api server"
                name="apiserver"
                class="primary--text ml-4 pr-4"
                prepend-icon="fa-server"
                v-model="apiserver"
              ></v-text-field>              
              <v-text-field
                id="password"
                dense
                placeholder="Bearer Token"
                name="password"
                class="primary--text ml-4 pr-4"
                prepend-icon="fa-lock"
                type="password"
                v-model="token"
              ></v-text-field>
              <v-alert v-if="profileErrCreation == true"> 
                Error at profile creation
              </v-alert>                
            </div>
          </v-card-text>
          
          <v-card-actions>
            <div v-if="$store.state.isElectron == true">
            <v-btn icon text class="ma-0 ml-10" color="primary" v-if="createNewProfile == false" v-on:click="createNewProfile = true"><v-icon left>fas fa-plus</v-icon> Add new </v-btn>
            <v-btn icon text class="ma-0 ml-10" color="primary" v-if="createNewProfile == true" v-on:click="createNewProfile = false"><v-icon left>fas fa-minus</v-icon> Back</v-btn>
            </div>
            <v-spacer></v-spacer>
            <v-btn icon text class="ma-0 mr-8" color="primary" v-if="createNewProfile == false" v-on:click="login"><v-icon left>fas fa-sign-in-alt</v-icon> login </v-btn>
            <v-btn text class="primary--text ma-0 mr-4" v-if="$store.state.isElectron == true && createNewProfile == true" @click="createProfile"> Create profile </v-btn>
          </v-card-actions>
          

          <!--<v-card-subtitle class="overline" style="font-weight: 300">
            Documentation 
          </v-card-subtitle>
          <v-card-text>
            Online documentation for Dora
          </v-card-text>
          <v-card-actions class="mt-0 pt-0">
            <v-spacer></v-spacer>
            <v-btn class="primary--text" style="margin-left: -15px;" small text @click="$router.push('/doc/v1/intro')"> Go </v-btn>
          </v-card-actions>-->
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
// @ is an alias to /src
import Vue from 'vue'
import ThemeChanger from '@/components/ThemeChanger'

export default {
  name: 'Login',
  components: {ThemeChanger},
  data: function () {
    return { 
      token: null,
      profile: null,
      apiserver: null,

      profiles: [],
      profileErrCreation: false,
      createNewProfile: false
    }
  },
  methods: {
    login () {
      if (this.$store.state.isElectron == true) {
        this.token = this.$store.state.profiles.api[this.profile].auth.token      
        this.$store.commit('setApiServer', this.$store.state.profiles.api[this.profile].server[0])
      } 
      this.$store.dispatch('login', this.token)
    },
    createProfile () {
      this.$store.commit('createProfile', {
        profile: this.profile,
        apiserver: this.apiserver,
        token: this.token,
        cb: function (res) {
          this.profileErrCreation = res
          if (this.profileErrCreation == null) {
            this.$forceUpdate()
          } 
        }.bind(this)
      })
    }
  },
  mounted () {
    if (this.$cookie.get('auth') == true) {
      this.$router.push('/')
    }
  },
  beforeMount () {
    this.backgroundImage = Vue.prototype.$cookie.get('dora.background.image')    
    this.showDefaultImage = (this.backgroundImage == '' || this.backgroundImage == null || this.backgroundImage == 'null')
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
