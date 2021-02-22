<template>
  <v-container class="fill-height" fluid id="LoadedPage">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="mainbackground elevation-12 pa-6">
            <v-card-title class="overline">
                <h1>PROM<b>WM</b></h1>
                <v-spacer></v-spacer>
                <v-btn class="primary--text" text @click="$router.push('/projects')">
                  Let's start!
                </v-btn>
            </v-card-title>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import LeftNavigation from '@/components/navs/LeftNavigation'

export default {
  name: 'Dashboard',
  components: {
    LeftNavigation
  },
  beforeMount () {
  	
  }
}
</script>
<style>
#LoadedPage {
  background: url(../assets/init01.svg) no-repeat center top;
  min-height: 100vh;
  z-index: -1;
  -webkit-background-size: cover;
  -moz-background-size: cover;
  -o-background-size: cover;
  background-size: cover;
}
</style>