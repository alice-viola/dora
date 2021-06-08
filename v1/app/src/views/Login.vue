<template>
  <v-container class="fill-height mainbackground" fluid id="LoginPage">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card outlined class="mainbackground elevation-0">
          <v-toolbar
             class="mainbackground" flat>
            <v-toolbar-title><h1 class="overline" style="font-size: 24px !important; font-weight: 300"> <b style="font-weight: 500">Prom</b>WM </h1></v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
          <v-card-text>
            <v-text-field
              id="password"
              outlined
              dense
              placeholder="Bearer Token"
              name="password"
              class="primary--text"
              prepend-icon="fa-lock"
              type="password"
              v-model="token"
              @keyup.enter="login()"
            >
            <template v-slot:append-outer>
              <v-btn icon text class="ma-0" color="primary" v-on:click="login"><v-icon style="margin-top: -10px">fas fa-check</v-icon></v-btn>
            </template>
            </v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            
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
  		this.$router.push('/')
  	}
  }
}
</script>
<style>
#LoginPage {
  /*background: url(../assets/firmware.svg) no-repeat center center fixed;*/
  -webkit-background-size: cover;
  -moz-background-size: cover;
  -o-background-size: cover;
  background-size: cover;
}
</style>
