<template>
	<v-container fluid class="pa-0 black">
      <v-app-bar
        app
        flat
        height="72"
        black
      >
      	<div v-if="showShell == false">
      		<v-btn text @click="openShell"> Open Shell </v-btn>
      		<v-btn text> Commit </v-btn>
      		<v-btn text @click="pauseWorkload" v-if="workload.currentStatus == $store.state.GE.WORKLOAD.RUNNING"> Pause </v-btn>
      		<v-btn text @click="resumeWorkload" v-if="workload.currentStatus == $store.state.GE.WORKLOAD.PAUSED"> Resume </v-btn>
      		<v-btn text> Stop </v-btn>
      		<v-btn text @click="deleteWorkload"> Delete </v-btn>
      	</div>
      	<div v-else>
      		<v-btn text @click="closeShell"> Close Shell </v-btn>
      	</div>
      	
  	</v-app-bar>
	<v-card v-if="workload !== null && showShell == false" class="mainbackground" flat>
	    <v-card-title class="overline">
	        <b>{{workload.kind}}</b>/{{workload.metadata.name}}
	        <v-spacer></v-spacer>
	    </v-card-title>
	    <v-card-text v-if="workload !== null">
	        <v-row>
	            <v-col col="4" v-if="workload.status !== undefined">
	                <v-timeline align-top dense>
	                    <v-timeline-item
	                      :color="(status.status == 'RUNNING' || status.status == 'CREATED') ?  'success' : 'warning'"
	                      small
	                      v-for="status in workload.status"
	                      :key="status.status + status.data"
	                    >
	                      <v-row class="pt-1">
	                        <v-col cols="3">
	                          <strong>{{status.status}}</strong>
	                        </v-col>
	                        <v-col>
	                          <strong>{{status.reason}}</strong>
	                          <div class="caption">
	                            
	                            {{status.data.split('T')[0]}} <br>{{status.data.split('T')[1]}}
	                          </div>
	                        </v-col>
	                      </v-row>
	                    </v-timeline-item>
	                </v-timeline>
	            </v-col>
	            <v-col col="8">
	              <v-col col="12" v-if="workload.kind == 'Workload'">
	                <h3>Image: {{workload.spec.image.image}}</h3>
	              </v-col>
	              <v-col col="12">
	                  <h3> Metadata </h3>
	                  Name: {{workload.metadata.name}}
	                  Group: {{workload.metadata.group}}
	              </v-col>
	              <v-col col="12">
	                  <h3> Spec </h3>
	                  {{workload.spec}}
	              </v-col>
	              <v-col col="12" v-if="workload.kind == 'Workload' && (workload.scheduler !== undefined && (workload.scheduler.gpu !== 	undefined || workload.scheduler.cpu !== undefined))">
	                  <h3> Assigned resources </h3>
	                  <div v-if="workload.scheduler.gpu !== undefined">
	                    <div v-for="gpu in workload.scheduler.gpu">
	                      {{gpu.uuid}}
	                    </div>
	                  </div>
	                  <div v-if="workload.scheduler.cpu !== undefined">
	                    <div v-for="cpu in workload.scheduler.cpu">
	                      {{cpu.uuid}}
	                    </div>
	                  </div>
	              </v-col>
	            </v-col>
	        </v-row>
	    </v-card-text>
	</v-card>
	<v-card v-if="showShell == true" class="pa-0">
		<Shell :item="workload"/>
	</v-card>
	</v-container>
</template>

<script>
// @ is an alias to /src

import Shell from '@/components/Shell'

export default {
  	name: 'Workload',
  	components: {
  		Shell
  	},
  	data: () => {
  		return {
  			workload: null,
  			showShell: false
  		}
  	},
  	computed: {
  		workloadToShow () {
  			return this.$store.state.workloadToShow
  		}
  	},
  	watch: {
  		workloadToShow (to, from) {
    	  	this.$store.state.interface.cli.api.describe.one('Workload', to, {}, function (err, data) {
    	  		console.log(err)
    	  	  	if (err) {
    	  	  	  
    	  	  	} else {
    	  	  		console.log(data)
    	  	  	  this.workload = data
    	  	  	}
      		}.bind(this))
    	}
  	},
  	methods: {
  		deleteWorkload () {
  			this.$store.state.interface.cli.api.remove.named('Workload', this.workload.metadata.name, {}, function (err, data) {})
  		},
  		pauseWorkload () {
  			this.$store.state.interface.cli.api.pause.one(this.workload.metadata.name, {}, function (err, data) {})
  		},
  		resumeWorkload () {
  			this.$store.state.interface.cli.api.resume.one(this.workload.metadata.name, {}, function (err, data) {})
  		},
  		openShell () {
  			this.showShell = true
  		},
  		closeShell () {
  			this.showShell = false
  		}
  	},
  	mounted () {
  	
  	}
}
</script>