<template>
  <v-container class="mainbackground"  fluid>
  	<v-card class="mainbackground elevation-0">
  		<v-card-title class="overline">
  			Create Project
  		</v-card-title>
  		<v-card-text>
  			<v-row>
          <v-col class="col-12 pb-0">
            <v-text-field outlined dense prepend-icon="fas fa-file-signature" label="Name" v-model="name" />
          </v-col>
          <v-col class="col-12 pt-0 pb-0">
            <v-text-field outlined dense prepend-icon="fas fa-file-signature" label="Description" v-model="description"/>
          </v-col>
          <v-col class="col-12">
            <v-divider />
          </v-col>
          <v-col class="col-12 pt-0 pb-0">
            <v-combobox
              clearable
              dense
              outlined
              persistent-hint
              label="Default image"
              v-model="framework"
              :items="$store.state.docker.images"
              prepend-icon="fab fa-docker"
            ></v-combobox>
          </v-col>
          <v-col class="col-12">
            <v-divider />
          </v-col>
          <v-col class="col-12" style="text-align: center">
            <v-btn rounded class="primary" text @click="openFsDialog('code')" ><v-icon left small class="ma-2"> fas fa-search </v-icon> Select Code local folder </v-btn>  
          </v-col>
          <v-col class="col-12" style="text-align: center">
            <v-btn rounded class="primary" text @click="openFsDialog('data')"><v-icon left small class="ma-2"> fas fa-search </v-icon> Select Data local folder </v-btn>  
          </v-col>
    		</v-row>
  		</v-card-text>
      <v-card-text v-if="errorInForm == true">
        <p> Input data missing or malformed </p>
      </v-card-text>
  		<v-card-actions>
			   <v-spacer></v-spacer>
			   <v-btn class="primary--text" text  dark @click="save()">
			   	Create
			   </v-btn>
  		</v-card-actions>
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
  </v-container>
</template>

<script>

import anifunny from 'anifunny'
import randomstring from 'randomstring'
const { dialog } = require('electron').remote

export default {
  	name: 'ProjectCreateForm',
  	components: {
  	  
  	},
  	watch: {
      attachedVolumes (to, from) {
        to.forEach(function (volumeName) {
          this.attachedVolumesMounts[volumeName] = '/' + volumeName
        }.bind(this))
      }
  	},
  	data: () => {
  		return {
        snack: {show: false, text: '', err: false, timeout: 1500},
        errorInForm: false,

        name: undefined,
        description: '',
        framework: null,
        selectedFolders: {code: undefined, data: ''}

  		}
  	},
    computed: {
      nameRules () {
        const rules = []
        const rule1 = v => (v || '').indexOf(' ') < 0 || 'No spaces are allowed'
        const rule2 = v => (v || '').indexOf('-') < 0 || 'No dash are allowed'
        rules.push(rule1)
        rules.push(rule2)
        return rules
      },
    },
  	methods: {
      fetch () {
        this.fetchNodes(this.fetchVolumes)
      },
      openFsDialog (type) {
        let selectedCodeFolder = dialog.showOpenDialogSync({
          properties: ['openDirectory']
        })[0]
        if (selectedCodeFolder) {
          this.selectedFolders[type] = selectedCodeFolder
        }
      },
      save () {
        if (this.name == undefined || this.selectedFolders.code == undefined || this.name == '' || this.selectedFolders.code == '') {
          this.snack = {show: true, err: true, text: 'Project not created', timeout: 1500}
          return
        }
        
        this.$store.dispatch('addProject', {
          id: randomstring.generate(24),
          name: this.name,
          description: this.description,
          code: this.selectedFolders.code,
          data: this.selectedFolders.data,
          framework: this.framework
        })
        this.snack = {show: true, err: null, text: 'Project created', timeout: 1500}
      }
  	},
    mounted () {
      
    }
}
</script>
