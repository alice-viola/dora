<template>
  <v-card v-if="workload !== null">
        <v-toolbar
          dark
          dense
          class="elevation-0"
        >
          <v-toolbar-title class="text-h5">
            <v-icon small class="mr-3">
              fas fa-box
            </v-icon>      
            Workload <b class="text-h5 font-weight-light ml-2">{{templateWorkload.metadata.name}}</b> 
            <v-icon small class="mr-2 ml-4">fa-list-ol</v-icon> Zone: {{workload.zone}}<v-icon small class="mr-2 ml-3"> fa-layer-group</v-icon> Workspace: {{templateWorkload.metadata.workspace}}
          </v-toolbar-title>
          <v-spacer />
          <v-btn class="primary--text" text @click="deleteWk()" v-if="isToUpdate == true">Delete </v-btn>      
          <v-btn class="blue--text" text @click="updateWk()" v-if="isToUpdate == true">Update </v-btn>
          <v-btn class="warning--text" text @click="updateWk()" v-else>Create </v-btn>              
          <v-btn
            icon
            dark
            @click="closeDialog()"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>

          <template v-slot:extension>
            <v-tabs
              v-model="tabContainer"
              centered
              dark
              icons-and-text
            >
              <v-tabs-slider></v-tabs-slider>

              <v-tab>
                Resource
                <v-icon>fab fa-docker</v-icon>
              </v-tab> 
              <v-divider
                class="mx-4"
                vertical
              ></v-divider>      
              <v-tab>
                Versions
                <v-icon>mdi-account-box</v-icon>
              </v-tab>                              
              <v-tab>
                Log
                <v-icon>mdi-account-box</v-icon>
              </v-tab>                    
            </v-tabs>
          </template>


        </v-toolbar>    
    <v-tabs vertical v-if="tabContainer == 0">
      <v-tab>
        <v-icon left>fab fa-docker</v-icon>
        Container
      </v-tab>
      <v-tab>
        <v-icon left>
          fas fa-brain
        </v-icon>
        Hardware
      </v-tab>
      <v-tab>
        <v-icon left>
          fa-hdd
        </v-icon>
        Data sync
      </v-tab>
      <v-tab>
        <v-icon left>
          fas fa-sliders-h
        </v-icon>
        Scheduler
      </v-tab>

      <v-tab-item class="pl-6 pt-0 mt-0">
        <!-- Container -->
        <div class="row">
          <div class="col-lg-4 col-12 pt-0 pb-0" v-if="isToUpdate == false">
            <v-card-title class="overline pl-0">Workload  Name</v-card-title>
              <v-text-field
                v-model="templateWorkload.metadata.name"
                label="Name"
                dense
                outlined
              ></v-text-field>
          </div>     
          <div class="col-lg-12 col-12 pt-0 pb-0">
            <v-card-title class="overline pl-0"> Workload instances </v-card-title>
          </div>
          <div class="col-lg-4 col-12">
              <v-text-field
                v-model="templateWorkload.spec.replica.count"
                label="Number of instances"
                dense
                outlined
              ></v-text-field>
          </div>             
          <div class="col-lg-12 col-12 pt-0 pb-0">
            <v-card-title class="overline pl-0"> Container image options </v-card-title>
          </div>
          <div class="col-lg-6 col-12">
              <v-text-field
                v-model="templateWorkload.spec.image.image"
                label="Base image"
                dense
                outlined
              ></v-text-field>
          </div>
          <div class="col-lg-6 col-12">
              <v-select 
                :items="['IfNotPresent', 'Always']"
                v-model="templateWorkload.spec.image.pullPolicy"
                label="Pull policy"
                outlined
                dense
              ></v-select>
          </div>      
          <div class="col-lg-12 col-12" >
              <v-text-field
              v-model="templateWorkload.spec.config.cmd"
                label="Start containers with"
                dense
                outlined
              ></v-text-field>
          </div>              
          <!--<div class="col-lg-12 col-12" >
              <v-text-field  v-for="n in parseInt(templateWorkload.spec.replica.count)" :key=n
              v-model="templateWorkload.spec.config.cmd"
                :label="'Override instance ' + n  + ' start command with:'"
                dense
                outlined
              ></v-text-field>
          </div>-->

          </div>
      </v-tab-item>


      <!-- Hardware -->
      <v-tab-item class="pl-6 pt-0 mt-0">
          <div class="row">
          <div class="col-lg-12 col-12 pt-0 pb-0">
            <v-card-title class="overline pl-0"> Resources </v-card-title>
          </div>
        
          <div class="col-lg-4 col-12 pt-0 pb-0" v-if="gpuSupport == true && resources.gpus !== undefined">
              <v-select 
                :items="['All'].concat(resources.gpus)"
                v-model="templateWorkload.spec.selectors.gpu.product_name"
                label="GPU Model"
                outlined
                dense
              ></v-select>
          </div>
          <div class="col-lg-4 col-12 pt-0 pb-0" v-if="gpuSupport == true && resources.gpus !== undefined">
            <v-text-field
                label="Count"
                v-model="templateWorkload.spec.selectors.gpu.count"
                hide-details="auto"
                outlined
                dense
            ></v-text-field>
          </div>
          <div class="col-lg-4 col-12 pt-0 pb-0" v-if="gpuSupport == true && resources.gpus !== undefined">
            <v-switch
              v-model="gpuSupport"
              :label="`Attach GPU`"
              dense
              style="margin-top: -5px"
            ></v-switch>
          </div>
         <div class="col-lg-4 col-12 pt-0 pb-0" v-if="gpuSupport == false && resources.cpus !== undefined">
              <v-select 
                :items="['All'].concat(resources.cpus)"
                v-model="templateWorkload.spec.selectors.cpu.product_name"
                label="CPU Model"
                outlined
                dense
              ></v-select>
          </div>
          <div class="col-lg-4 col-12 pt-0 pb-0" v-if="gpuSupport == false && resources.cpus !== undefined">
            <v-text-field
                label="Count"
                v-model="templateWorkload.spec.selectors.cpu.count"
                hide-details="auto"
                outlined
                dense
            ></v-text-field>
          </div>
          <div class="col-lg-4 col-12 pt-0 pb-0" v-if="gpuSupport == false && resources.cpus !== undefined">
            <v-switch
              v-model="gpuSupport"
              :label="`Attach GPU`"
              dense
              style="margin-top: -5px"
            ></v-switch>
          </div>
          </div>        
      </v-tab-item>

      <!-- Data Sync -->
      <v-tab-item class="pl-6 pt-0 mt-0">
        <!-- Volumes -->
        <v-card-title class="overline pl-0"> Volumes </v-card-title>
        <v-select 
          :items="resources.volumes"
          label="Volumes"
          outlined
          dense
        ></v-select>    
        <!-- Sync -->
        <div v-if="this.$store.state.isElectron == true">
          <v-card-title class="overline pl-0"> Sync </v-card-title>
        </div>
        <div v-else>
          <h3> Sync modification is disabled </h3> 
        </div>        

      </v-tab-item>

      <v-tab-item class="pl-6 pt-0 mt-0">
          <div class="row">
          <div class="col-lg-12 col-12 pt-0 pb-0">
            <v-card-title class="overline pl-0"> Config </v-card-title>
          </div>

          <div class="col-lg-4 col-12 pt-0 pb-0">
            <v-select 
              :items="['Random', 'FanOut', 'SameNode']"
              label="Node affinity"
              outlined
              dense
            ></v-select>  
          </div>
          <div class="col-lg-6 col-12 pt-0 pb-0">
            <v-select 
              :items="['Never', 'Always']"
              v-model="templateWorkload.spec.config.restartPolicy"
              label="Restart policy"
              outlined
              dense
            ></v-select>
          </div>
          </div>

      </v-tab-item>

    </v-tabs>

    <v-card-text v-if="workload.status == 'failed' && workload.reason !== null">
      {{workload.reason}}
    </v-card-text>
    <v-card-subtitle class="text-h6 font-weight-bold pb-0 mb-0" v-if="workload.image !== undefined && workload.image !== null && workload.image !== ''">
    </v-card-subtitle>

  </v-card>
</template>
<script type="text/javascript">

import anifunny from 'anifunny'
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator'
import yaml from 'js-yaml'
import _ from 'lodash'

function generateName () {
  //return anifunny.generate()
  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors ], 
    length: 2,
    separator: '.'
  })
}

export default {
  name: 'WorkloadEditor',
  props: ['_workload', 'keywwk'],
  components: {  },
  data: function () {
    return {
      isToUpdate: false,
      workload: null,

      resources: {},

      gpuSupport: true,

      tabContainer: 0,

      templateWorkload: {
        apiVersion: 'v1',
        kind: 'Workload',
        metadata: {
          name: null
        },
        spec: {
          selectors: {
            gpu: {
              product_name: 'All',
              count: 1
            },
            cpu: {
              product_name: 'All',
              count: 1
            },
          },
          image: {
            image: 'ubuntu',
            pullPolicy: 'IfNotPresent'
          },
          config: {
            restartPolicy: 'Never',
            cmd: '/bin/bash'
          }
        }
      }
    }
  },
  watch: {

  },
  methods: {
    closeDialog () {
      this.$emit('close-dialog')
    },
    updateWk () {
      if (this.gpuSupport == true) {
        delete this.templateWorkload.spec.selectors.cpu
      } else {
        delete this.templateWorkload.spec.selectors.gpu
      }
      this.$store.dispatch('apply', this.templateWorkload)
    },

    fetch () {
      if (this.isToUpdate == true) {
        this.$store.dispatch('describe', {name: this.workload.name, workspace: this.workload.workspace, kind: 'Workload', cb: function (data) {
          if (data.length == 1) {
            let wk = data[0]
            this.templateWorkload.metadata = {name: wk.name, workspace: wk.workspace}
            this.templateWorkload.spec = wk.resource  
            if (this.templateWorkload.spec.selectors.gpu == undefined) {
              this.templateWorkload.spec.selectors.gpu = {product_name: 'All', count: 1}
            }
            if (this.templateWorkload.spec.selectors.cpu == undefined) {
              this.templateWorkload.spec.selectors.cpu = {product_name: 'All', count: 1}
            } else {
              this.gpuSupport = false
            }
            if (this.templateWorkload.spec.image.pullPolicy == undefined) {
              this.templateWorkload.spec.image.pullPolicy = 'IfNotPresent'
            }
            if (this.templateWorkload.spec.config.restartPolicy == undefined) {
              this.templateWorkload.spec.config.restartPolicy = 'Never'
            }
            if (this.templateWorkload.spec.config.cmd == undefined) {
              this.templateWorkload.spec.config.cmd = '/bin/bash'
            }

          }
        }.bind(this)})         
      }
    },
    deleteWk () {
      this.$store.dispatch('delete', {
        kind: 'Workload',
        name: this.workload.name,
        workspace: this.workload.workspace,
      })
    },    
    fetchResources (cb) {
      this.$store.dispatch('resource', {name: 'GPU', cb: function (datagpu) {
        this.resources.gpus = [...new Set(datagpu.map((gpu) => { return gpu.product_name}) )]
      
        this.$store.dispatch('resource', {name: 'CPU', cb: function (datacpu) {
          this.resources.cpus = [...new Set(datacpu.map((cpu) => { return cpu.product_name}) )]
      
          this.$store.dispatch('resource', {name: 'Storage', cb: function (datastore) {
            this.resources.storages = datastore.map((storage) => {return storage.name})
          
            this.$store.dispatch('resource', {name: 'Volume', cb: function (datavol) {
              this.resources.volumes = datavol.map((volume) => {return {name: volume.name, storage: volume.storage, target: '/' + volume.name, group: volume.group}})
              cb()
            }.bind(this)}) 
          }.bind(this)})      
        }.bind(this)}) 
      }.bind(this)})  
    }
  },
  mounted () {
    this.fetchResources(function () {
      if (this._workload !== undefined && this._workload !== null) {
        this.isToUpdate = true
        this.workload = JSON.parse(JSON.stringify(this._workload))
        this.fetch() 
      } else {
        this.templateWorkload = {
          kind: 'Workload',
          metadata: {
            name: generateName(),
            workspace: this.$store.state.selectedWorkspace,
            zone: this.$store.state.selectedZone,
          },
          spec: {
            replica: {
              count: 0
            },
            driver: 'Docker',
            selectors: {
              gpu: {
                product_name: 'All',
                count: 1
              },
              cpu: {
                product_name: 'All',
                count: 1
              }
            },
            image: {
              image: 'ubuntu',
              pullPolicy: 'IfNotPresent'
            },
            config: {
              cmd: '/bin/bash',
              restartPolicy: 'Never'
            }
          }
        }
        this.workload = {
          name: this.templateWorkload.metadata.name,
          workspace: this.templateWorkload.metadata.workspace,
        }
      }
    }.bind(this))
  },
  beforeMount () {
    
  }
}
</script>
