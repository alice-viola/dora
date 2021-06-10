<template>
  <v-card v-if="workload !== null">
    <v-card-title class="text-h5 font-weight-bold">
      <v-icon small class="mr-3">
        fas fa-box
      </v-icon>      
      Workload <b class="text-h5 font-weight-light ml-2">{{workload.name}}</b>
    </v-card-title>
    <v-card-subtitle class="text-h6 font-weight-light">
      <v-icon small class="mr-2 ml-0">fa-list-ol</v-icon> Zone: {{workload.zone}}<v-icon small class="mr-2 ml-3"> fa-layer-group</v-icon> Workspace: {{workload.workspace}}
    </v-card-subtitle>
    <v-card-text class="text-h6 font-weight-bold pb-0 mb-0">
      <div class="row">
        <div class="col-lg-6 col-12">
            <v-text-field
              v-model="templateWorkload.spec.image.image"
              label="Base image"
              dense
              outlined
            ></v-text-field>
        </div>
        <div class="col-lg-6 col-12">
            <v-text-field
            v-model="templateWorkload.spec.config.cmd"
              label="Command"
              dense
              outlined
            ></v-text-field>
        </div>
        <div class="col-lg-6 col-12">
            <v-text-field
              v-model="templateWorkload.spec.replica.count"
              label="Replica"
              dense
              outlined
            ></v-text-field>
        </div>
      </div>
    </v-card-text>
    <v-card-text v-if="workload.status == 'failed' && workload.reason !== null">
      {{workload.reason}}
    </v-card-text>
    <v-card-subtitle class="text-h6 font-weight-bold pb-0 mb-0" v-if="workload.image !== undefined && workload.image !== null && workload.image !== ''">

    </v-card-subtitle>
    <v-card-actions>
      <v-btn class="warning--text" text @click="deleteWk()">Delete </v-btn>
      <v-spacer />
      <v-btn class="primary--text" text @click="updateWk()">Update </v-btn>
    </v-card-actions>
  </v-card>
</template>
<script type="text/javascript">

import anifunny from 'anifunny'
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator'
import yaml from 'js-yaml'
import _ from 'lodash'
import { codemirror } from 'vue-codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/yaml-frontmatter/yaml-frontmatter.js'
import 'codemirror/theme/base16-dark.css'
import 'codemirror/theme/base16-light.css'

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
  props: ['_workload'],
  components: { codemirror },
  data: function () {
    return {
      isToUpdate: false,
      workload: null,

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
            }
          },
          image: {
            image: 'ubuntu'
          },
          config: {
            cmd: '/bin/bash'
          }
        }
      }
    }
  },
  watch: {

  },
  methods: {
    updateWk () {
        this.$store.dispatch('apply', this.templateWorkload)
    },

    fetch () {
      if (this.isToUpdate == true) {
        this.$store.dispatch('describe', {name: this.workload.name, workspace: this.workload.workspace, kind: 'Workload', cb: function (data) {
          if (data.length == 1) {
            let wk = data[0]
            this.templateWorkload.metadata = {name: wk.name, workspace: wk.workspace}
            this.templateWorkload.spec = wk.resource  
          }
        }.bind(this)})         
      }

      //this.$store.dispatch('resource', {name: 'GPU', cb: function (data) {
      //  this.resources.gpus = [...new Set(data.map((gpu) => { return gpu.product_name}) )]
      //}.bind(this)})  
      //this.$store.dispatch('resource', {name: 'CPU', cb: function (data) {
      //  this.resources.cpus = [...new Set(data.map((cpu) => { return cpu.product_name}) )]
      //}.bind(this)})  
      //this.$store.dispatch('resource', {name: 'Storage', cb: function (data) {
      //  this.resources.storages = data.map((storage) => {return storage.name})
      //}.bind(this)})
      //this.$store.dispatch('resource', {name: 'Volume', cb: function (data) {
      //  this.resources.volumes = data.map((volume) => {return {name: volume.name, storage: volume.storage, target: '/' + volume.name, group: volume.group}})
      //}.bind(this)})
    },

  },
  mounted () {
    if (this._workload !== undefined) {
      this.isToUpdate = true
      this.workload = JSON.parse(JSON.stringify(this._workload))
    }
    this.fetch() 
  }
}
</script>
