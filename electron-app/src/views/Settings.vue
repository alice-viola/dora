<template>
    <div class="resource">
    	<v-container fluid>
    		<LeftNavigation pageNavigationName="settings-navigator"/>
			<v-card class="mainbackground lighten-0 elevation-0" v-if="$store.state.ui.settings[$store.state.ui.selectedSettingIdx].id == 'cfg'">
    			<div v-if="$store.state.userCfg.hasConfigFile == true">
          <v-alert 
    			  prominent
    			  type="success"
    			>
    			  <v-row align="center">
    			    <v-col class="grow">
    			      The configuration file is loaded
    			    </v-col>
    			  </v-row>
    			</v-alert>
          <v-select outlined label="Change profile" v-model="$store.state.userCfg.profile" :items="Object.keys($store.state.userCfg.cfg.api)" />
          <v-card-actions>
            <v-spacer />
            <v-btn class="primary--text" text v-on:click="changeProfile()">
              Save
             </v-btn>
          </v-card-actions>
        </div>
    		<v-alert v-else
    		  prominent
    		  type="error"
    		>
    		  <v-row align="center">
    		    <v-col class="grow">
    		      The configuration file is NOT loaded
    		    </v-col>
    		  </v-row>
    		</v-alert>
			</v-card>

			
			<v-card class="error lighten-0 elevation-0" v-if="$store.state.ui.settings[$store.state.ui.selectedSettingIdx].id == 'devserver'">

    			<v-alert
    			  prominent
    			  type="error"
    			>
    			  <v-row align="center">
    			    <v-col class="grow">
    			      You don't have a development server
    			    </v-col>
    			  </v-row>
    			</v-alert>
			</v-card>

			<v-card class="mainbackground lighten-0 elevation-0" v-if="$store.state.ui.settings[$store.state.ui.selectedSettingIdx].id == 'images'">
			    <v-card-title>
			        Docker
			        <v-spacer></v-spacer>
              <v-btn class="primary--text" text v-on:click="saveDockerPreferences()">
                Save
              </v-btn>
			    </v-card-title>
			    <v-card-text>
			        <p> Customize the Docker images that you want to pickup in the menus</p>
			    </v-card-text>
			    <v-card-text>
					<v-combobox
					  clearable
					  multiple
					  dense
					  solo
					  persistent-hint
					  chips
					  v-model="$store.state.docker.images"
					></v-combobox>
			    </v-card-text>
			</v-card>

			<v-card class="mainbackground lighten-0 elevation-0" v-if="$store.state.ui.settings[$store.state.ui.selectedSettingIdx].id == 'preferences'">
			    <v-card-title>
			        Preferences
            <v-spacer />
            <v-btn class="primary--text" text v-on:click="savePreferences()">
              Save
             </v-btn>
			    </v-card-title>
			    <v-card-text>
			        <p> Customize this app </p>
			    </v-card-text>
			    <v-card-text>
              <p> Theme </p>
			        <v-select solo  label="Editor Theme" :items="['ayu-dark', 'monokai', 'ayu-mirage', 'discord', 'pwm-web']" v-model="$store.state.ui.preferences.editor.theme"></v-select>
              <p> Random names generator </p>
			        <v-select solo  label="Random name generator" :items="['unique-names-generator','anifunny']" v-model="$store.state.ui.preferences.randomNameGenerator"></v-select>
			    </v-card-text>
			</v-card>
		</v-container>
		<v-dialog  fullscreen hide-overlay v-model="showConfigurationFile">
      		<v-card>
      		  	<v-toolbar dark color="primary">
      		    	<v-btn icon dark @click="showConfigurationFile = false">
      		      		<v-icon>fa-times-circle</v-icon>
      		    	</v-btn>
          			<v-toolbar-title>Configuration file</v-toolbar-title>
          			<v-spacer></v-spacer>
					<v-btn icon dark @click="showConfigurationFile = false">
      		      		<v-icon>fa-save</v-icon>
      		    	</v-btn>
				</v-toolbar>				
				<v-card-text class="pa-0">
					<CodeEditor :_code="cfgFileYaml" mode="yaml" :path="$store.state.userCfg.path"/>
				</v-card-text>
			</v-card>
		</v-dialog>
  	</div>
</template>

<script>
// @ is an alias to /src
import LeftNavigation from '@/components/navs/LeftNavigation'
import CodeEditor from '@/components/code/CodeEditor.vue'
import yaml from 'js-yaml'

export default {
  name: 'Settings',
  data: () => {
  	return {
  		showConfigurationFile: false,
  		cfgFileYaml: ''
  	}
  },
  methods: {
    changeProfile () {
      this.$store.dispatch('changeProfile')
    },
  	editConfigurationFile () {
  		this.cfgFileYaml = yaml.dump(this.$store.state.userCfg.cfg)
  		this.showConfigurationFile = true
  	},
  	savePreferences () {
  		this.$store.dispatch('savePreferences')
      setTimeout(() => {
        location.reload()
      }, 1000)
  	},
  	saveDockerPreferences () {
  		this.$store.dispatch('saveDockerPreferences')	
  	}
  },
  components: {
    LeftNavigation, CodeEditor, yaml
  },
  mounted () {
  	this.$store.commit('setUi', {leftDrawerComponent: 'settings-navigator'})
  }
}
</script>
