<template>
  <v-container class="fill-height" fluid id="LoadedPage">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="mainbackground elevation-0 pa-6"> 
            <v-card-title>
              <v-spacer/> 
                <h2><b>PROM</b>WM</h2>
                <v-spacer/>
            </v-card-title>
            <v-card-text  align="center" justify="center">
              <v-img src="../assets/logo_1.png" style="border-radius: 50%; width: 200px; height: 200px;"></v-img>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
                <v-btn class="primary--text" text @click="$router.push('/projects')">
                  Let's start!
                </v-btn>
              <v-spacer />
            </v-card-actions>

        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>


export default {
  name: 'Dashboard',
  components: {
    
  },
  beforeMount () {
  	
  }
}
</script>
<style>
#LoadedPage {
  /*background: url(../assets/init01.svg) no-repeat center top;*/
  min-height: 100vh;
  z-index: -1;
  -webkit-background-size: cover;
  -moz-background-size: cover;
  -o-background-size: cover;
  background-size: cover;
}
</style>