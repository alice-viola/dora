<template>	
  <div style="background-color: black">
    <v-container class="fill-height" fluid v-if="workload == null && err == null" style="height: 100vh">
      <v-row align="center" justify="center" style="text-align: center">
        <v-col cols="12" sm="12" md="12">
          <v-card class="black elevation-0 pa-6"> 
            
            <v-card-text  align="center" justify="center">
              <v-img src="../assets/logo_1.png" style="border-radius: 50%; width: 100px; height: 100px;"></v-img>
            </v-card-text>
            <v-progress-circular
              :size="50"
              :width="2"
              color="primary"
              indeterminate
              class="mt-12 mb-12"
            ></v-progress-circular>
            <h3> Connecting to <b>{{$route.query.workload}}</b> </h3>
            <div v-if="err != null">
              <h1> Cannot connect </h1>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
    <Shell class="pa-0" :item="workload" v-if="workload !== null && err == null"/>
  </div>
</template>

<script>

import Shell from '@/components/shell/Shell.vue'

export default {
  name: 'StandaloneShell',
  components: {Shell},
  data: function () {
  	return {
  		workload: null,
  		err: null
  	}
  },
  beforeMount () {
  	setTimeout(function () {
      this.$store.state.interface.cli.api.describe.one('Workload', this.$route.query.workload, {}, function (err, data) {
	  	  if (err) {
	  	    	this.err = err
	  	  } else {
	  	    	this.workload = data
	  	  }
      }.bind(this))
    }.bind(this), 2000)
  }

}
</script>