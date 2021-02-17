<template>
	<v-container class="fill-height" fluid id="InitPage">
		<v-row align="center" justify="center">
			<v-col cols="12" sm="8" md="4">
				<v-card class="mainbackground elevation-12 pa-6">
				    <v-card-title class="overline">
				        <h3>Welcome to {{$store.state.appname}}</h3>
				        <v-spacer></v-spacer>
				    </v-card-title>
				    <v-card-subtitle>
				    	<b>It's time to boostrap the application</b>
				    </v-card-subtitle>
				    <v-card-text>
				        <p> Insert a profile Name </p>
				        <v-text-field outlined dense v-model="profileName" prepend-icon="fa-user" label="Profile Name"></v-text-field>
				    </v-card-text>
				    <v-card-text>
				        <p> Insert a <b>valid</b> API Server </p>
				        <v-text-field outlined dense prepend-icon="fas fa-server" v-model="apiServer" label="API Server URL"></v-text-field>
				    </v-card-text>
				    <v-card-text>
				        <p> Insert a <b>valid</b> API Server Token </p>
				        <v-text-field type="password" prepend-icon="fa-lock" outlined dense v-model="apiToken" label="API Server Token"></v-text-field>
				    </v-card-text>
				    <v-card-text v-if="showError == true">
						<v-card class="error lighten-0 elevation-1">
						    <v-card-title>
						        Missing base data
						        <v-spacer></v-spacer>
						    </v-card-title>
						    <v-card-text>
						        <p>
						        	Try to fill every input
						        </p>
						    </v-card-text>
						</v-card>
				    </v-card-text>
				    <v-card-actions>
	    		  		<!--<v-btn class="secondary--text" text @click="skip()">
				        	Skip for now
				        </v-btn>-->
				        <v-spacer />
	    		  		<v-btn class="primary--text" text @click="start()">
				        	Start
				        </v-btn>
				    </v-card-actions>
				</v-card>
			</v-col>
		</v-row>
	</v-container>
</template>

<script>
// @ is an alias to /src

export default {
  name: 'Init',
  data: () => {
  	return {
  		profileName: undefined,
  		apiServer: 'https://',
  		apiToken: undefined,
  		showError: false
  	}
  },
  methods: {
  	start () {
  		if (this.profileName == undefined || this.profileName == '' || this.apiServer == '' || this.apiToken == undefined || this.apiToken == '') {
  			this.showError = true
  		} else {
  			this.$store.dispatch('initUserCfg', {profile: this.profileName, server: this.apiServer, token: this.apiToken, cb: function (err, done) {
  				if (err) {
  					this.showError = true
  				} else {
  					this.$store.dispatch('checkUserCfg')
  					this.$router.push('/dashboard')
  				}
  			}.bind(this)})
  		}
  	}
  },
  components: {
  
  },
  mounted () {
  
  }
}
</script>
<style>
#InitPage {
  background: url(../assets/init01.svg) no-repeat center top;
  min-height: 100vh;
  z-index: -1;
  -webkit-background-size: cover;
  -moz-background-size: cover;
  -o-background-size: cover;
  background-size: cover;
}
</style>