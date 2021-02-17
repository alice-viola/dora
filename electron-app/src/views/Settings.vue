<template>
    <div class="resource">
    	<v-container fluid>
    		<LeftNavigation pageNavigationName="settings-navigator"/>
			<v-card class="success lighten-0 elevation-1" v-if="$store.state.ui.settings[$store.state.ui.selectedSettingIdx].id == 'cfg'">
			    <v-card-title>
			        Configuration file
			        <v-spacer></v-spacer>
			    </v-card-title>
			    <v-card-text>
			        <p v-if="$store.state.userCfg.hasConfigFile == true">
			        	Config file loaded
			        </p>
			        <p v-else>
			        	You don't have a config file
			        </p>
    	      		<v-btn text v-on:click="editConfigurationFile()">
			        	Edit configuration file
			        </v-btn>
			    </v-card-text>
			</v-card>
			
			<v-card class="error lighten-0 elevation-1" v-if="$store.state.ui.settings[$store.state.ui.selectedSettingIdx].id == 'devserver'">
			    <v-card-title>
			        Development server
			        <v-spacer></v-spacer>
			    </v-card-title>
			    <v-card-text>
			        <p>
			        	You don't have a development server
			        </p>
    	      		<v-btn text>
			        	Create development server
			        </v-btn>
			    </v-card-text>
			</v-card>

			<v-card class="lighten-0 elevation-1" v-if="$store.state.ui.settings[$store.state.ui.selectedSettingIdx].id == 'preferences'">
			    <v-card-title>
			        Preferences
			        <v-spacer></v-spacer>
			    </v-card-title>
			    <v-card-text>
			        <p> Customize this app </p>
			    </v-card-text>
			    <v-card-text>
			        <v-select rounded label="Editor Theme" :items="['ayu-dark', 'monokai', 'ayu-mirage']" v-model="$store.state.ui.preferences.editor.theme"></v-select>
			    </v-card-text>
			    <v-card-actions>
    	      		<v-btn class="primary--text" text v-on:click="savePreferences()">
			        	Save
			        </v-btn>
			    </v-card-actions>
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
import LeftNavigation from '@/components/LeftNavigation'
import CodeEditor from '@/components/CodeEditor.vue'
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
  	editConfigurationFile () {
  		this.cfgFileYaml = yaml.dump(this.$store.state.userCfg.cfg)
  		this.showConfigurationFile = true
  	},
  	savePreferences () {
  		this.$store.dispatch('savePreferences')
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
