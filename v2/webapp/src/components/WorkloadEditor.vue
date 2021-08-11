<template>
  <v-card v-if="workload !== null">
        <v-toolbar dense class="elevation-0">
          <v-toolbar-title class="text-h5">
            <v-icon small class="mr-3">
              fas fa-box
            </v-icon>      
            Workload Editor
          </v-toolbar-title>
          <v-spacer />
          <v-btn icon class="red--text mr-12" text @click="deleteWk()" v-if="isToUpdate == true"><v-icon>fas fa-trash</v-icon></v-btn>      
          <v-btn icon class="green--text" text @click="updateWk()" v-if="isToUpdate == true"><v-icon>fas fa-save</v-icon> </v-btn>
          <v-btn icon class="green--text" text @click="updateWk()" v-else><v-icon>fas fa-save</v-icon> </v-btn>              
          <v-btn
            class="ml-12"
            icon
            @click="closeDialog()"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>    
        <v-card outlined>
          <v-card-text class="mb-0 pb-0  ">
            <v-row>
              <v-col class="col-md-3 col-12">
                <v-icon small class="mr-2 ml-3">fas fa-box </v-icon>  Workload: {{templateWorkload.metadata.name}} <br>
                <v-icon small class="mr-2 ml-3">fa-list-ol</v-icon> Zone: {{templateWorkload.metadata.zone}}<br><v-icon small class="mr-2 ml-3"> fa-layer-group</v-icon> Workspace: {{templateWorkload.metadata.workspace}}   
              </v-col>
              <v-col class="col-md-6 col-12">
                <v-text-field :disabled="isToUpdate == true" class="pt-3"
                  v-model="templateWorkload.metadata.name"
                  label="Name"
                  dense
                  outlined
                ></v-text-field>
              </v-col>
            </v-row>
            </v-card-text>     
        </v-card>
    <v-tabs class="mt-0 pt-0" style="border-bottom: 1px solid rgba(255,255,255,0.1)"
      v-model="tabContainer"
      centered
      
    >
      <v-tabs-slider></v-tabs-slider>
      <v-tab>
        <v-icon left>fab fa-docker</v-icon>
        Resource
      </v-tab> 
      <v-divider class="mx-4" vertical></v-divider>      
      <v-tab>
        <v-icon left>fab fa-docker</v-icon>
        Containers
      </v-tab> 
      <v-divider class="mx-4" vertical></v-divider>
      <v-tab>
        <v-icon left>mdi-account-box</v-icon>
        Versions
      </v-tab> 
      <v-divider class="mx-4" vertical></v-divider>                                   
      <v-tab>
        <v-icon left>mdi-account-box</v-icon>
        Event registry
      </v-tab>  
      <v-divider class="mx-4" vertical></v-divider>        
      <v-tab>
        <v-icon left>fas fa-network-wired</v-icon>
        Network topology
      </v-tab>  
      <v-divider class="mx-4" vertical></v-divider>           
      <v-tab>
        <v-icon left>fab fa-github</v-icon>
        Webhook
      </v-tab>                                  
    </v-tabs>        

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
          fas fa-network-wired
        </v-icon>
        Networks
      </v-tab>      
      <v-tab>
        <v-icon left>
          fas fa-sliders-h
        </v-icon>
        Scheduler
      </v-tab>

      <v-tab-item >
        <!-- Container -->
        <v-container>
        <div class="row">
  
          <div class="col-12 col-lg-12 pt-0 pb-0">
            <v-card-title class="overline pl-0"> Workload instances </v-card-title>
          </div>
          <div class="col-lg-4 col-12 pt-0 pb-0">
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
          <div class="col-lg-6 col-12 pt-0 pb-0">
              <v-text-field
                v-model="templateWorkload.spec.image.image"
                label="Base image"
                dense
                outlined
              ></v-text-field>
          </div>
          <div class="col-lg-6 col-12 pt-0 pb-0">
              <v-select 
                :items="['IfNotPresent', 'Always']"
                v-model="templateWorkload.spec.image.pullPolicy"
                label="Pull policy"
                outlined
                dense
              ></v-select>
          </div>      
          <div class="col-lg-12 col-12 pt-0 pb-0">
            <v-card-title class="overline pl-0"> Container runtime options </v-card-title>
          </div>          
          <div class="col-lg-12 col-12 pt-0 pb-0" >
              <v-text-field
              v-model="templateWorkload.spec.config.cmd"
                label="Start containers with"
                dense
                outlined
              ></v-text-field>
          </div>      
          <div class="col-lg-12 col-12 pt-0 pb-0" >
              <v-text-field
              v-model="templateWorkload.spec.config.shmSize"
                :label="'Shared memory in bytes. Current value in megabytes ' + parseInt(templateWorkload.spec.config.shmSize) / 1000000 + ' MB'"
                dense
                outlined
              ></v-text-field>
          </div>                
          <!--<div class="col-lg-12 col-12 pt-0 pb-0" >
              <v-text-field
              v-model="templateWorkload.meta.shell"
                label="Exec shell with"
                dense
                outlined
              ></v-text-field>
          </div>-->                        
          </div>
        </v-container>
      </v-tab-item>


      <!-- Hardware -->
      <v-tab-item >
        <v-container>
          <div class="row">
          <div class="col-lg-12 col-12 pt-0 pb-0">
            <v-card-title class="overline pl-0"> Resources </v-card-title>
          </div>

          <v-tabs v-model="gpuSupport">
            <v-tab>
              <v-icon left>
                fas fa-microchip
              </v-icon>
              CPU Workload
            </v-tab> 
            <v-tab>
              <v-icon left>fas fa-brain</v-icon>
              GPU Workload
            </v-tab>              
          </v-tabs>    
          <div v-if="gpuSupport == 1">
            <div v-if="resources.gpus !== undefined && resources.gpus.length > 0">
              <v-row class="ml-1 mt-4">
                <div class="col-8">
                  <v-select 
                    :items="resources.gpus"
                    v-model="templateWorkload.spec.selectors.gpu.product_name"
                    label="Suitable GPU Model"
                    multiple
                    outlined
                    dense
                  >
                    <template v-slot:prepend-item>
                      <v-list-item
                        ripple
                        @click="toggleAllGpus"
                      >
                        <v-list-item-action>
                          <v-icon >
                            mdi-close-box
                          </v-icon>
                        </v-list-item-action>
                        <v-list-item-content>
                          <v-list-item-title>
                            Select All
                          </v-list-item-title>
                        </v-list-item-content>
                      </v-list-item>
                      <v-divider class="mt-2"></v-divider>
                    </template>
                    
                  </v-select>
                </div>
                <div class="col-4">
                  <v-text-field
                      label="Count"
                      v-model="templateWorkload.spec.selectors.gpu.count"
                      hide-details="auto"
                      outlined
                      dense
                  ></v-text-field>
              </div>  
              </v-row>            
            </div>
            <div v-else>
              <v-alert class="info"> No node with GPU support </v-alert>
            </div>
          </div>  

          <div v-if="gpuSupport == 0">
            <div v-if="resources.cpus !== undefined && resources.cpus.length > 0">
              <v-row class="ml-1 mt-4">
                <div class="col-8">
                  <v-select 
                    :items="resources.cpus"
                    v-model="templateWorkload.spec.selectors.cpu.product_name"
                    label="Suitable CPU Model"
                    multiple
                    outlined
                    dense
                  >
                    <template v-slot:prepend-item>
                      <v-list-item
                        ripple
                        @click="toggleAllCpus"
                      >
                        <v-list-item-action>
                          <v-icon >
                            mdi-close-box
                          </v-icon>
                        </v-list-item-action>
                        <v-list-item-content>
                          <v-list-item-title>
                            Select All
                          </v-list-item-title>
                        </v-list-item-content>
                      </v-list-item>
                      <v-divider class="mt-2"></v-divider>
                    </template>
                    

                  </v-select>
                </div>
                <div class="col-4">
                  <v-text-field
                      label="Count"
                      v-model="templateWorkload.spec.selectors.cpu.count"
                      hide-details="auto"
                      outlined
                      dense
                  ></v-text-field>
              </div>  
              </v-row>            
            </div>
            <div v-else>
              <v-alert class="info"> No node with CPU support </v-alert>
            </div>
          </div>      
        </div>   
        </v-container>      
      </v-tab-item>

      <!-- Data Sync -->
      <v-tab-item>
        <v-container>
        <!-- Volumes -->
        <v-card-title class="overline pl-0"> Attached Volumes </v-card-title>
        <v-select 
          :items="resources.volumes"
          v-model="temp.volumes"
          item-text="groupname"
          item-value="groupname"
          label="Volumes"
          outlined
          multiple
          dense
        ></v-select>    
        <!-- Sync -->
        <v-card class="elevation-0">
          <v-card-title class="overline pl-0"> Sync code </v-card-title>
          <v-card-subtitle class="pa-0"> Sync file and folders in real-time from your PC to Dora volumes </v-card-subtitle>

          <v-card-text class="pt-4" v-if="$store.state.isElectron == false">
            <h3> Sync modification is available only in the Desktop app </h3> 
          </v-card-text>
          <v-card-text class="pt-4 pa-0">
            <p> Sync is possible due the access to your local filesystem. It's usefull in order to transfer code files from your PC to the containers on Dora, so you can edit in real time the code on this PC and the sync function will transfer every modified or appended file. 
             </p>
            <v-alert
              type="info"
            >Keep in mind that sync ignores the files listed in the .gitignore file eventually present in the root path of the folder to sync</v-alert>             
          </v-card-text>
          <v-card-text class="pt-4 pa-0">
            <div v-for="(s, index) in syncFolders" :key="index" @ref="syncFolders.length" class="pa-0">
            <v-row class="pa-0">
              <v-col class="col-1">
                <v-btn class="pt-2" :disabled="$store.state.isElectron == false" small icon @click="removeSyncAt(index)"><v-icon>fa fa-trash</v-icon></v-btn>
              </v-col>                  
              <v-col class="col-1" v-if="$store.state.isElectron == true">
                <v-btn text class="primary--text" @click="chooseSyncFolder(index)" ><v-icon left small class="ma-2"> fas fa-search </v-icon> </v-btn>  
              </v-col>              
              <v-col class="col-3">
                <v-text-field dense :disabled="$store.state.isElectron == false" outlined v-model="s.src" label="Local path"></v-text-field>
              </v-col> 
              <v-col class="col-2">
                <v-select dense :disabled="$store.state.isElectron == false" outlined v-model="s.volume" label="Volume" :items="resources.volumes" item-text="groupname" item-value="groupname"></v-select>
              </v-col> 
              <v-col class="col-3">
                <v-text-field dense :disabled="$store.state.isElectron == false" outlined v-model="s.dst" label="Remote path"></v-text-field>
              </v-col>               
              <v-col class="col-1">
                <v-checkbox class="pt-0 mt-2" dense :disabled="$store.state.isElectron == false" outlined v-model="s.active" label="Active"></v-checkbox>
              </v-col>                                         
            </v-row>
          </div>
          </v-card-text>
          <v-card-actions>
            <v-btn text @click="addSync"> Add sync </v-btn>
          </v-card-actions>
        </v-card>
        </v-container>
      </v-tab-item>
      
      <!-- Network -->
      <v-tab-item>
        <v-container>

        <v-card class="elevation-0">
          <v-card-title class="overline pl-0"> Network </v-card-title>
          <v-card-subtitle class="pa-0">Enable network connectivity between workload containers.</v-card-subtitle>
          <v-card-text>
            <v-radio-group row v-model="templateWorkload.spec.network.mode">
              <v-radio
                label="none"
                value="none"
              ></v-radio>                
              <v-radio
                label="bridge"
                value="bridge"
              ></v-radio>
              <v-radio
                label="host"
                value="host"
              ></v-radio>              
            </v-radio-group>
          </v-card-text>
          <div v-if="templateWorkload.spec.network.mode == 'none'">
            <v-alert
              type="info"
            >Your workload will have free egress but no ingress</v-alert>  
          </div>
          <div v-if="templateWorkload.spec.network.mode == 'host'">
            <v-alert
              type="info"
            >Your workload will have the same network than the host. Usefull for some kind of multinode training. Requires special permission. </v-alert>  
          </div>          
          <div v-if="templateWorkload.spec.network.mode == 'bridge'">
          <v-card-text class="pt-4 pa-0">
            <p> You can use the node ports between <b>25000 and 25100</b>.
             </p>
            <v-alert
              type="info"
            >In case of replica major then one, the system will increase the node port number of the subsequent replicas by one</v-alert>             
          </v-card-text>
          <v-card-text class="pt-4 pa-0">
            <div v-for="(s, index) in networkServices" :key="index" @ref="networkServices.length" class="pa-0">
            <v-row class="pa-0">
              <v-col class="col-1">
                <v-btn class="pt-2" small icon @click="removeServiceAt(index)"><v-icon>fa fa-trash</v-icon></v-btn>
              </v-col>   
              <v-col class="col-2">
                <v-select dense outlined v-model="s.kind" label="Kind" :items="['NodePort']"></v-select>
              </v-col>                                         
              <v-col class="col-2">
                <v-select dense outlined v-model="s.protocol" label="protocol" :items="['tcp', 'udp']"></v-select>                
              </v-col>               
              <v-col class="col-2">
                <v-text-field dense outlined v-model="s.name" label="Service name"></v-text-field>
              </v-col>               
              <v-col class="col-2">
                <v-text-field dense outlined v-model="s.port" label="Container port"></v-text-field>         
              </v-col>               
              <v-col class="col-2">
                <v-text-field dense outlined v-model="s.nodePort" label="Node port"></v-text-field>         
              </v-col>                                                      
            </v-row>
          </div>
          </v-card-text>
          <v-card-actions>
            <v-btn text @click="addService"> Add service </v-btn>
          </v-card-actions>
          </div>
        </v-card>          

        </v-container>
      </v-tab-item>
      
      <!-- Scheduler -->
      <v-tab-item>
        <v-container>
          <div class="row">
          <div class="col-lg-12 col-12 pt-0 pb-0">
            <v-card-title class="overline pl-0"> Config </v-card-title>
          </div>

          <div class="col-lg-4 col-12 pt-0 pb-0">
            <v-select 
              :items="['First', 'Random', 'Distribute', 'Fill']"
              v-model="templateWorkload.spec.config.affinity"
              label="Scheduler replica strategy"
              outlined
              dense
            ></v-select>  
            <v-card-text class="pt-0 pa-0"><p v-if="templateWorkload.spec.config.affinity == 'First'">
              Every container of this workload will be in the first available node
            </p></v-card-text>
            <v-card-text class="pt-0 pa-0"><p v-if="templateWorkload.spec.config.affinity == 'Random'">
              Every container of this workload will be put in a suitable random node
            </p></v-card-text>
            <v-card-text class="pt-0 pa-0"><p v-if="templateWorkload.spec.config.affinity == 'Distribute'">
              Every container of this workload will be put in some suitable nodes in order to fill
              every node with the same amount of workload containers.
            </p></v-card-text>  
            <v-card-text class="pt-0 pa-0"><p v-if="templateWorkload.spec.config.affinity == 'Fill'">
              Every container of this workload will be put in a suitable node in order to fill
              it before scheduling in another node.
            </p></v-card-text>
          </div>
          <div class="col-lg-6 col-12 pt-0 pb-0">
            <v-select 
              :items="['Never', 'Always']"
              v-model="templateWorkload.spec.config.restartPolicy"
              label="Restart policy"
              outlined
              dense
            ></v-select>
            <v-card-text class="pt-0 pa-0"><p v-if="templateWorkload.spec.config.restartPolicy == 'Never'">
              When a container die the scheduler will not restart it
            </p></v-card-text>  
            <v-card-text class="pt-0 pa-0"><p v-if="templateWorkload.spec.config.restartPolicy == 'Always'">
              When a container die the scheduler will restart it, forever.
            </p></v-card-text>                        
          </div>
          </div>
          </v-container>
      </v-tab-item>

    </v-tabs>




    <!------------------>
    <!------------------>
    <!------------------>
    <div v-if="tabContainer == 1">
      <v-container v-if="containers.length == 0">
        <v-alert class="info">
          No containers for this workload
        </v-alert>    
      </v-container>
      <v-container v-else>
        <v-card class="mt-2 mainbackground lighten-1"  v-for="(c, index) in containers" @key="c.id">
          <v-card-title class="overline">{{c.name}}</b>
            <v-spacer/> 
        
          </v-card-title>
    
        </v-card>   
      </v-container>
    </div>


    <!-- Versions -->
    <div v-if="tabContainer == 2">
      <v-container>

        <v-alert type="info" v-if="versions == undefined  || versions.length == 0">
          No versions for this workload
        </v-alert>
        <v-card class="mt-2 mainbackground lighten-1" v-else v-for="(e, index) in versions" @key="e.id">
          <v-card-title class="overline"><b v-if="index == 0">v{{versions.length - index}} (current)</b><b v-else>v{{versions.length - index}}</b>
            <v-spacer/> 
            <v-btn class="primary--text" text @click="rollback(e.resource, e.id)" v-if="index != 0 && e.id == loaded"> Loaded </v-btn>
            <v-btn class="primary--text" text @click="rollback(e.resource, e.id)" v-if="index != 0 && e.id != loaded"> Load </v-btn>
            {{e.insdate}} 
          </v-card-title>
          <v-card-subtitle>Replica: {{e.resource.spec.replica.count }}</v-card-subtitle>
          <v-card-text class="pb-0">Image: {{e.resource.spec.image.image}}</v-card-text>
          <v-card-text class="pt-0">Selectors: {{e.resource.spec.selectors}}</v-card-text>
        </v-card>         
      </v-container>
    </div>

    <!-- Events -->
    <div v-if="tabContainer == 3">
      <v-container>
        <v-alert type="info" v-if="events == undefined  || events.length == 0">
          No event registered for this workload
        </v-alert>
        <v-card class="mainbackground lighten-1 mt-2" v-else v-for="e in events" @key="e.id">
          <v-card-title class="overline">
            <v-icon class="green--text" left v-if="e.resource.kind == 'ScaleUp'">fas fa-arrow-up</v-icon> From {{e.origin}} to {{e.resource.destination}}
            <v-spacer/> {{e.insdate}} 
          </v-card-title>
          <v-card-text>{{e.resource.text}}</v-card-text>
        </v-card>         
      </v-container>
    </div>

    <!-- Network topology -->
    <div v-if="tabContainer == 4">
      <v-container>
        WIP
       <!-- {{templateWorkload}}
        <v-alert type="info" v-if="templateWorkload.spec.network.ports == undefined || templateWorkload.spec.network.ports.length == 0">
          No network available for this workload
        </v-alert>
        <div v-else>
          <v-row>
            <v-col class="col-12" v-for="n in computeNetworkTopology()">
              {{n}}
            </v-col>
          </v-row>
        </div>-->
      </v-container>
    </div>    

    <!-- Github -->
    <div v-if="tabContainer == 5">
      <v-container>
      <v-card class="elevation-0">
      <v-card-title><h3>GitHub Integration</h3></v-card-title>
      <v-card-subtitle>Add actions linked with you repo</v-card-subtitle>
      <v-card-text>
        <div v-for="(webhook, index) in githubWebhookIntegrations" @key="index" @ref="templateWorkload.meta.integrations.github.webhooks.length">
          <v-row class="pt-0 mt-0">
            <v-col class="col-3">
              <v-text-field outlined dense v-model="webhook.path" placeholder="Path" persistent-hint :hint="$store.state.apiServer + '/v1/igw/' + workload.zone  + '/' + workload.workspace + '/' + workload.name + '/' + webhook.path"></v-text-field>
            </v-col>
            <v-col class="col-2">
              <v-text-field outlined type="password" dense v-model="webhook.secret" placeholder="Secret"></v-text-field>
            </v-col>
            <v-col class="col-2">
              <v-select outlined dense v-model="webhook.requestedAction" placeholder="Action" :items="['ScaleUp', 'ScaleDown', 'Stop', 'Logs']"></v-select>
            </v-col>  
            <v-col class="col-2">
              <v-text-field outlined type="text" dense v-model="webhook.branch" placeholder="On branch"></v-text-field>
            </v-col>            
            <v-col class="col-1 pt-4">
              <v-btn small icon @click="removeWebhookAt(index)"><v-icon>fa fa-trash</v-icon></v-btn>
            </v-col>      
            <v-col class="col-1 pt-0">
              <v-checkbox  v-model="webhook.active" label="Active"></v-checkbox>
            </v-col>                                     
          </v-row>                   
        </div>
        <v-btn text @click="addWebhook"> Add webhook </v-btn>  
      </v-card-text>
      </v-card>
    </v-container>
    </div>



  </v-card>
</template>
<script type="text/javascript">

import async from 'async'
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
      events: [],
      versions: [],

      resources: {},

      gpuSupport: 1,

      tabContainer: 0,

      templateWorkload: {},

      temp: {
        volumes: []
      },

      containers: [],

      loaded: -1
    }
  },
  watch: {
    gpuSupport (newval, oldval) {
      switch (newval) {
        case 1: 
          this.templateWorkload.spec.selectors.cpu.product_name = []
          this.templateWorkload.spec.selectors.gpu.product_name = []

        case 0:
          this.templateWorkload.spec.selectors.gpu.product_name = []
          this.templateWorkload.spec.selectors.cpu.product_name = []
      }
    }
  },
  computed: {
    githubWebhookIntegrations () {
      return this.templateWorkload.meta.integrations.github.webhooks
    },  
    syncFolders () {
      return this.templateWorkload.meta.sync
    },
    networkServices () {
      return this.templateWorkload.spec.network.ports
    } 
  },
  methods: {
    rollback (wk, vID) {
      this.loaded = vID
      this.templateWorkload = wk
    },
    toggleAllGpus () {
      if (this.templateWorkload.spec.selectors.gpu.product_name.length == this.resources.gpus.length) {
        this.templateWorkload.spec.selectors.gpu.product_name = []
      } else {
        this.templateWorkload.spec.selectors.gpu.product_name = this.resources.gpus
      }
    },

    toggleAllCpus () {
      if (this.templateWorkload.spec.selectors.cpu.product_name.length == this.resources.cpus.length) {
        this.templateWorkload.spec.selectors.cpu.product_name = []
      } else {
        this.templateWorkload.spec.selectors.cpu.product_name = this.resources.cpus
      }
    },   

    addService () {
      if (this.templateWorkload.spec.network == undefined) {
        this.templateWorkload.spec.network = {mode: 'none'}
      }
      if (this.templateWorkload.spec.network.ports == undefined) {
        this.templateWorkload.spec.network.ports = []
      }  
      if (!Array.isArray(this.templateWorkload.spec.network.ports)) {
        this.templateWorkload.spec.network.ports = []
      }            
      this.templateWorkload.spec.network.ports.push({name: '', kind: 'NodePort', protocol: 'tcp', mode: 'default', port: 6006, nodePort: '-'})
    }, 

    removeServiceAt (index) {
      this.templateWorkload.spec.network.ports.splice(index, 1)
    },       

    chooseSyncFolder (index) {
      const { dialog } = require('electron').remote
      let selectedCodeFolder = dialog.showOpenDialogSync({
        properties: ['openDirectory']
      })[0]
      if (selectedCodeFolder) {
        this.templateWorkload.meta.sync[index].src = selectedCodeFolder
      }      
    },

    addSync () {
      console.log(this.templateWorkload.meta)
      if (this.templateWorkload.meta == undefined) {
        this.templateWorkload.meta = {}
      }
      if (this.templateWorkload.meta.sync == undefined) {
        this.templateWorkload.meta.sync = []
      }  
      if (!Array.isArray(this.templateWorkload.meta.sync)) {
        this.templateWorkload.meta.sync = []
      }            
      this.templateWorkload.meta.sync.push({src: '', volume: '', dst: '', active: true})
    },

    removeSyncAt (index) {
      this.templateWorkload.meta.sync.splice(index, 1)
    },

    addWebhook () {
      this.templateWorkload.meta.integrations.github.webhooks.push({
        path: '',
        secret: '',
        requestedAction: 'ScaleUp',
        active: true,
        branch: 'All'
      })
    },

    removeWebhookAt (index) {
      this.templateWorkload.meta.integrations.github.webhooks.splice(index, 1)
    },

    closeDialog () {
      this.$emit('close-dialog')
    },

    updateWk () {
      if (this.gpuSupport == 1) {
        delete this.templateWorkload.spec.selectors.cpu
        if (this.templateWorkload.spec.selectors.gpu.product_name.length == 0) {
          this.templateWorkload.spec.selectors.gpu.product_name = 'All'
        }
      } else {
        delete this.templateWorkload.spec.selectors.gpu
        if (this.templateWorkload.spec.selectors.cpu.product_name.length == 0) {
          this.templateWorkload.spec.selectors.cpu.product_name = 'All'
        }

      }
      
      this.templateWorkload.spec.volumes = this.resources.volumes.filter((v) => {
        let codevol = v.workspace + '.' + v.name
        console.log(codevol)
        if (this.temp.volumes.includes(codevol) && !this.templateWorkload.spec.volumes.includes(codevol)) {
          return true
        } else {
          return false
        }
      })
      console.log(this.templateWorkload.spec.volumes)
      
      this.$store.commit('saveSyncData', this.templateWorkload)
      this.$store.dispatch('apply', this.templateWorkload)
      this.closeDialog()
    },

    fetch () {
      if (this.isToUpdate == true) {
        this.$store.dispatch('describe', {name: this.workload.name, workspace: this.workload.workspace, kind: 'Workload', cb: function (data) {
          if (data.length == 1) {
            this.fetchEvents({
              resource_id: data[0].id
            }) 
            this.fetchVersions({
              resource_id: data[0].id
            })
            let wk = data[0]
            this.templateWorkload.meta = wk.meta
            this.templateWorkload.metadata = {name: wk.name, workspace: wk.workspace, zone: wk.zone}
            this.templateWorkload.spec = wk.resource

            if (this.templateWorkload.meta == null || this.templateWorkload.meta == undefined) {
              this.templateWorkload.meta = {}
            } 
            if (this.templateWorkload.meta.sync == undefined) {
              this.templateWorkload.meta.sync = []
            }

            this.temp.volumes = wk.resource.volumes.map((v) => {
              return v.workspace + '.' + v.name
            })       
            
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
            if (this.templateWorkload.spec.config.affinity == undefined) {
              this.templateWorkload.spec.config.affinity = 'First'
            }  
            if (this.templateWorkload.spec.network == undefined) {
              this.templateWorkload.spec.network = {mode: 'none', ports: []}
            } 
            if (this.templateWorkload.spec.network.ports == undefined) {
              this.templateWorkload.spec.network.ports = []
            } 
            if (this.templateWorkload.meta.integrations == undefined || this.templateWorkload.meta.integrations.github == undefined || this.templateWorkload.meta.integrations.github.webhooks == undefined) {
              this.templateWorkload.meta.integrations = {github: {webhooks: []}} 
            }    
            this.fetchContainers()
          }
        }.bind(this)})         
      }
    },

    deleteWk () {
      this.$store.commit('deleteSyncData', this.templateWorkload)
      this.$store.dispatch('delete', {
        kind: 'Workload',
        name: this.workload.name,
        workspace: this.workload.workspace,
      })
    },  

    fetchEvents (args) {
      this.$store.dispatch('getEvents', {kind: 'Workload', name: this.workload.name, resource_id: args.resource_id, cb: function (data) {
        if (data.data.length > 0) {
          this.events = data.data.map((e) => {
            e.resource = JSON.parse(e.resource)
            return e
          }).sort((a, b) => {
            return new Date(b.insdate) - new Date(a.insdate)
          })
        }
      }.bind(this)})
    }, 

    computeNetworkTopology () {
      let networkTopology = []
      let data = []
      let queue = []      

    },

    fetchContainers () {
      let queue = []  
      let store = this.$store
      let workload = this.workload
      let containers = []
      for (var i = 0; i < this.templateWorkload.spec.replica.count; i += 1) {
        queue.push(function (cb) {
          store.dispatch('describe', {name: workload.name + '.' + i, workspace: workload.workspace, kind: 'Container', cb: function (data) {
            if (data.length == 1) {
              containers.push(data[0])  
            }
            
            cb(null)
          }})
        })
      }
      async.parallel(queue, (err, d) => {
        this.containers = containers
        console.log(this.containers)
      })      
    },

    fetchVersions (args) {
      this.$store.dispatch('getVersions', {kind: 'Workload', name: this.workload.name, resource_id: args.resource_id, cb: function (data) {
        if (data.data.length > 0) {
          this.versions = data.data.map((e) => {
            e.resource = JSON.parse(e.resource)
            return e
          }).sort((a, b) => {
            return new Date(b.insdate) - new Date(a.insdate)
          })
        }
      }.bind(this)})
    },     

    fetchResources (cb) {
      this.resources.volumes = []
      this.temp.volumes = []
      this.$store.dispatch('resource', {name: 'GPU', cb: function (datagpu) {
        this.resources.gpus = [...new Set(datagpu.filter((gpu) => {return gpu.allowed == true }).map((gpu) => { return gpu.product_name}) )]
      
        this.$store.dispatch('resource', {name: 'CPU', cb: function (datacpu) {
          this.resources.cpus = [...new Set(datacpu.filter((cpu) => {return cpu.allowed == true }).map((cpu) => { return cpu.product_name}) )]
      
          this.$store.dispatch('resource', {name: 'Storage', cb: function (datastore) {
            this.resources.storages = datastore.map((storage) => {return storage.name})
            
            let workspaces = []

            for (var i = 0; i < this.$store.state.user.workspaces.length; i += 1) {
              let able = this.$store.getters.capability({
                zone: this.$store.state.selectedZone,
                workspace: this.$store.state.user.workspaces[i],
                kind: 'Volume',
                operation: 'Use'
              })
              if (able == true) {
                workspaces.push(this.$store.state.user.workspaces[i])
              }
            } 
            workspaces.forEach(function (w, indexWs) {
              this.$store.dispatch('resource', {name: 'Volume', workspace: w, cb: function (datavol, index) {
                let volumes = datavol.map((volume) => {return {name: volume.name, storage: volume.storage, target: '/' + volume.name, workspace: volume.workspace, group: volume.workspace, _vol: index, groupname: volume.workspace + '.' + volume.name}})
                volumes.forEach(function (vol) {
                  console.log(vol.groupname, this.resources.volumes.map((v) => {return v.groupname}).includes(vol.groupname))
                  if (!this.resources.volumes.map((v) => {return v.groupname}).includes(vol.groupname)) {
                    this.resources.volumes.push(vol)
                  }
                }.bind(this))
                //this.resources.volumes = this.resources.volumes.concat(this.resources.volumes, volumes)
                if (indexWs == workspaces.length - 1) {
                  cb()
                }
              }.bind(this)
            }) 
            }.bind(this))
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
        this.workload = {
          name: this.templateWorkload.metadata.name,
          workspace: this.templateWorkload.metadata.workspace,
        }
      }
    }.bind(this))
  },
  beforeMount () {
    this.templateWorkload = {
      kind: 'Workload',
      metadata: {
        name: generateName(),
        workspace: this.$store.state.selectedWorkspace,
        zone: this.$store.state.selectedZone,
      },
      meta: {
        integrations: {
          github: {
            webhooks: []
          }
        },
        sync: [],
        shell: '/bin/bash'
      },
      spec: {
        replica: {
          count: 0
        },
        driver: 'Docker',
        selectors: {
          gpu: {
            product_name: [],
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
          restartPolicy: 'Never',
          affinity: 'First',
          shmSize: '1000000000'
        },
        volumes: [],
        network: {ports: [], mode: 'none'}
      }
    }

  }  
}
</script>
