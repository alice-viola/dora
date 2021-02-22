<template>
  <v-container class="mainbackground"  fluid>
  	<v-card class="mainbackground lighten-0 elevation-1">
  		<v-card-title class="overline">
  			General
  		</v-card-title>
  		<v-card-text>
  			<v-row>
          <v-col class="col-12 pb-0">
            <v-text-field outlined dense prepend-icon="fas fa-file-signature" label="Name" v-model="name" />
          </v-col>
          <v-col class="col-12 pt-0 pb-0">
            <v-text-field outlined dense prepend-icon="fas fa-file-signature" label="Description" v-model="description"/>
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
    		</v-row>
  		</v-card-text>
  	</v-card>

    <v-card class="mainbackground lighten-0 elevation-1 mt-4">
      <v-card-title class="overline">
        Local folders
      </v-card-title>
      <v-card-text>
          <v-col class="col-12" style="text-align: center">
            <v-row>
              <v-col class="col-10">
                <v-text-field prepend-icon="fas fa-folder" outlined dense v-model="selectedFolders.code" />   
              </v-col>
              <v-col class="col-2">
                <v-btn rounded class="primary" text @click="openFsDialog('code')" ><v-icon left small class="ma-2"> fas fa-search </v-icon> Code </v-btn>  
              </v-col>
            </v-row>
          </v-col>
          <v-col class="col-12" style="text-align: center">
            <v-row>
              <v-col class="col-10">
                <v-text-field prepend-icon="fas fa-folder" outlined dense v-model="selectedFolders.data" />   
              </v-col>
              <v-col class="col-2">
                <v-btn rounded class="primary" text @click="openFsDialog('data')" ><v-icon left small class="ma-2"> fas fa-search </v-icon> Data </v-btn>  
              </v-col>
            </v-row>
          </v-col>
          <v-col class="col-12" style="text-align: center">
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card class="mainbackground lighten-0 elevation-1 mt-4">
      <v-card-title class="overline">
        Persistent storage and sync
      </v-card-title>
      <v-card-text>
          <v-col class="col-12" style="text-align: center">
            <v-row>
              <v-col class="col-3">
                Local
                <v-text-field readonly prepend-icon="fas fa-folder" outlined dense :label="selectedFolders.code" />   
              </v-col>
              <v-col class="col-4">
                Storage
                <v-select prepend-icon="fas fa-arrow-right" outlined dense clearable  v-model="attachedVolumeCode" :items="volumeNames" label="Persistent storage" />
              </v-col>
              <v-col class="col-3">
                Mount target
                <v-text-field prepend-icon="fas fa-arrow-right" outlined dense v-model="mounts.code" />   
              </v-col>
              <v-col class="col-2 pt-5">
                <v-switch inset v-model="syncCode"  class="primary--text" label="Sync" v-if="selectedFolders.code !== undefined && selectedFolders.code !== ''">  </v-switch>  
                <v-switch inset  class="primary--text" label="Sync" disabled v-else></v-switch> 
              </v-col>
            </v-row>
          </v-col>
          <v-col class="col-12" style="text-align: center">
            <v-row>
              <v-col class="col-3">
                Local
                <v-text-field readonly prepend-icon="fas fa-folder" outlined dense :label="selectedFolders.data" />   
              </v-col>
              <v-col class="col-4">
                Storage
                <v-select prepend-icon="fas fa-arrow-right" outlined dense clearable v-model="attachedVolumeData" :items="volumeNames" label="Persistent storage" />
              </v-col>
              <v-col class="col-3">
                Mount target
                <v-text-field prepend-icon="fas fa-arrow-right" outlined dense v-model="mounts.data" />   
              </v-col>
              <v-col class="col-2 pt-5">
                <v-switch inset v-model="syncData" class="primary--text" label="Sync" v-if="selectedFolders.data !== undefined && selectedFolders.data !== ''">  </v-switch>  
                <v-switch inset  class="primary--text" label="Sync" disabled v-else></v-switch> 
              </v-col>
            </v-row>
          </v-col>
          <v-col class="col-12" style="text-align: center">
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-text v-if="errorInForm == true">
        <p> Input data missing or malformed </p>
      </v-card-text>
      <v-card-actions>
         <v-spacer></v-spacer>
         <v-btn class="primary--text" text  dark @click="save()">
          Save
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
  	name: 'ProjectGeneralSettings',
  	components: {
  	  
  	},
  	watch: {
      attachedVolumes (to, from) {
        to.forEach(function (volumeName) {
          this.attachedVolumesMounts[volumeName] = '/' + volumeName
        }.bind(this))
      },
      attachedVolumeCode (to, from) {
        if (to == null) {
          this.mounts.code = null  
        } else {
          this.mounts.code = '/' + to
        }
      },
      attachedVolumeData (to, from) {
        if (to == null ) {
          this.mounts.data = null  
        } else {
          this.mounts.data = '/' + to
        }
      },
  	},
  	data: () => {
  		return {
        snack: {show: false, text: '', err: false, timeout: 1500},
        errorInForm: false,

        id: undefined,
        name: undefined,
        description: '',
        framework: null,
        selectedFolders: {code: undefined, data: ''},
        mounts: {code: undefined, data: ''},
        attachedVolumeCode: undefined,
        attachedVolumeData: undefined,
        syncCode: false,
        syncData: false,
        volumes: {},
        volumeNames: [], // Here to workaround Vue's reactivity to Objects

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
        this.fetchVolumes(() => {})
      },
      fetchVolumes (cb) {
        this.volumes = {}
        this.volumeNames = []
        this.$store.state.interface.cli.api.get.one('Volume', {}, function (err, data) {
          if (err) {
            if (cb) {
              cb()
            }
          } else {
            data.forEach (function (volume) {
              this.volumeNames.push(volume.name)
              this.volumes[volume.name] = volume
            }.bind(this))
            if (cb) {
              cb()
            }
          }
        }.bind(this))
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
        
        this.$store.dispatch('saveProject', {
          id: this.id,
          name: this.name,
          description: this.description,
          code: this.selectedFolders.code,
          data: this.selectedFolders.data,
          codeVolume: this.volumes[this.attachedVolumeCode] || undefined,
          dataVolume: this.volumes[this.attachedVolumeData] || undefined,
          targetMountCode: this.mounts.code,
          targetMountData: this.mounts.data,
          syncCode: this.syncCode,
          syncData: this.syncData,
          framework: this.framework
        })
        this.snack = {show: true, err: null, text: 'Project saved', timeout: 1500}
      }
  	},
    mounted () {
      this.fetch()
      this.id = this.$store.state.projects[this.$store.state.ui.selectedProjectIdx].id 
      this.name = this.$store.state.projects[this.$store.state.ui.selectedProjectIdx].name 
      this.description = this.$store.state.projects[this.$store.state.ui.selectedProjectIdx].description 
      this.framework = this.$store.state.projects[this.$store.state.ui.selectedProjectIdx].framework
      if (this.$store.state.projects[this.$store.state.ui.selectedProjectIdx].codeVolume !== undefined && this.$store.state.projects[this.$store.state.ui.selectedProjectIdx].codeVolume.name !== undefined) {
        this.attachedVolumeCode = this.$store.state.projects[this.$store.state.ui.selectedProjectIdx].codeVolume.name   
      }
      if (this.$store.state.projects[this.$store.state.ui.selectedProjectIdx].dataVolume !== undefined && this.$store.state.projects[this.$store.state.ui.selectedProjectIdx].dataVolume.name !== undefined) {
        this.attachedVolumeData = this.$store.state.projects[this.$store.state.ui.selectedProjectIdx].dataVolume.name   
      }
      this.selectedFolders['code'] = this.$store.state.projects[this.$store.state.ui.selectedProjectIdx].code 
      this.selectedFolders['data'] = this.$store.state.projects[this.$store.state.ui.selectedProjectIdx].data 
      this.mounts['code'] = this.$store.state.projects[this.$store.state.ui.selectedProjectIdx].mountCode
      this.syncCode = this.$store.state.projects[this.$store.state.ui.selectedProjectIdx].syncCode 
      this.syncData = this.$store.state.projects[this.$store.state.ui.selectedProjectIdx].syncData 
    }
}
</script>
