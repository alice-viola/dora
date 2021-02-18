<template>
	<v-container fluid class="black pa-0">
      	<v-app-bar
      	  app
      	  flat
      	  height="37"
      	  black
      	  class="mainbackground lighten-2"
      	  v-if="workload !== null"
      	>
      		<v-label><b>{{workload.metadata.name.toUpperCase()}}</b>  <b :class="workload.currentStatus == $store.state.GE.WORKLOAD.RUNNING ? 'success--text' : 'warning--text'">{{workload.currentStatus}}</b> </v-label>
      		<v-spacer/>
      		<div v-if="showShell == false && workload !== null">
      			<v-btn text @click="openShell" v-if="workload.currentStatus == $store.state.GE.WORKLOAD.RUNNING"> <v-icon small left>fas fa-terminal</v-icon> Open Shell </v-btn>
      			<!--<v-btn text @click="commitWorkload" v-if="workload.currentStatus == $store.state.GE.WORKLOAD.RUNNING"> <v-icon small left>fas fa-save</v-icon> Commit </v-btn>-->
      			<v-btn text @click="pauseWorkload" v-if="workload.currentStatus == $store.state.GE.WORKLOAD.RUNNING"> <v-icon small left>fas fa-pause</v-icon> Pause </v-btn>
      			<v-btn text @click="resumeWorkload" v-if="workload.currentStatus == $store.state.GE.WORKLOAD.PAUSED"> <v-icon small left>fas fa-play</v-icon> Resume </v-btn>
      			<v-btn text @click="deleteWorkload"> <v-icon small left>fas fa-trash</v-icon> Delete </v-btn>
      		</div>
      		<div v-else>
      			<v-btn text @click="closeShell"> <v-icon small left>fas fa-terminal</v-icon> Close Shell </v-btn>
      		</div>
      		
  		</v-app-bar>
		<v-card v-if="workload !== null && showShell == false" class="mainbackground" flat>
			<v-card-title class="overline">
				Credits per running hour {{workload.creditsPerHour || '---'}}
			</v-card-title>
		    <v-card-text v-if="workload !== null">
		        <v-row>
		            <v-col col="4" v-if="workload.status !== undefined">
		                <v-timeline small :reverse="true" align-top dense>
		                    <v-timeline-item
		                      :color="(status.status == 'RUNNING' || status.status == 'CREATED') ?  'success' : 'warning'"
		                      small
		                      v-for="status in workload.status"
		                      :key="status.status + status.data"
		                    >
		                      <v-row class="pt-1">
		                        <v-col cols="6">
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
		<v-card v-if="showShell == true && workload !== null" class="mainbackground pa-1" flat >
			<Shell :item="workload"/>
		</v-card>
    	<v-snackbar
    	  v-model="snack.show"
    	  :timeout="snack.timeout"
    	  :color="snack.err == null ? 'success' : 'warning'"

    	>
    	  {{ snack.text }}
	
    	  <template v-slot:action="{ attrs }">
    	    <v-btn
    	      color="white"
    	      text
    	      v-bind="attrs"
    	      @click="snack.show = false"
    	    >
    	      Close
    	    </v-btn>
    	  </template>
    	</v-snackbar>
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
  			fetchInterval: undefined,
  			workload: null,
  			showShell: false,
  			snack: {show: false, text: '', err: false, timeout: 1500}
  		}
  	},
  	computed: {
  		workloadToShow () {
  			return this.$store.state.workloadToShow
  		}
  	},
  	watch: {
  		'$store.state.workloadToShowClick' (to, from) {
  			this.showShell = false
  			this.fetch()
    	}
  	},
  	methods: {
  		fetch () {
    	  	this.$store.state.interface.cli.api.describe.one('Workload', this.$store.state.workloadToShow, {}, function (err, data) {
    	  	  	if (err) {
    	  	  	  
    	  	  	} else {
    	  	  	  	this.workload = data
    	  	  	}
      		}.bind(this))
  		},
  		deleteWorkload () {
  			this.$store.state.interface.cli.api.remove.named('Workload', this.workload.metadata.name, {}, function (err, data) {
  				this.snack = {show: true, err: err, text: data, timeout: 1500}
  			}.bind(this))
  		},
  		pauseWorkload () {
  			this.$store.state.interface.cli.api.pause.one(this.workload.metadata.name, {}, function (err, data) {
  				this.snack = {show: true, err: err, text: data, timeout: 1500}
  			}.bind(this))
  		},
  		commitWorkload () {
  			
  		},
  		resumeWorkload () {
  			this.$store.state.interface.cli.api.resume.one(this.workload.metadata.name, {}, function (err, data) {
  				this.snack = {show: true, err: err, text: data, timeout: 1500}
  			}.bind(this))
  		},
  		openShell () {
  			this.showShell = true
  		},
  		closeShell () {
  			this.showShell = false
  		}
  	},
  	mounted () {
  		this.fetchInterval = setInterval(function () {
  			this.fetch()
  		}.bind(this), 2000)
  	},
  	destroyed () {
  		if (this.fetchInterval !== undefined) {
  			clearInterval(this.fetchInterval)
  		}
  	}
}
</script>