<template>
  <v-container class="mainbackground"  fluid>
    <v-card class="mainbackground elevation-0">
      <v-card-title class="overline">
          SpinUp Workload instances
         <v-spacer></v-spacer>
         <v-btn class="primary--text" text  dark @click="save()">
          Create
         </v-btn>
      </v-card-title>

      <v-card-text>
        <v-row>
          <v-col class="col-6">
            <v-text-field number dense outlined  v-model="istanceCount" label="Instances" prepend-icon="fab fa-docker"></v-text-field> 
          </v-col>
          <v-col class="col-6">
            <v-switch inset dense outlined v-model="gpu" label="Attach GPU" prepend-icon="fas fa-microchip" class="mt-1"></v-switch> 
          </v-col>
          <v-col class="col-6">
            <v-select inset dense outlined v-model="node" label="Node" prepend-icon="fas fa-server" :items="nodes.filter((n) => {
              if (n.gpus == 0 && gpu == false) {
                return true
              } else if (n.gpus > 0 && gpu == true) {
                return true
              }
            }).map((n) => {return n.name })"></v-select> 
          </v-col>
          <v-col class="col-6">
            <v-text-field number dense outlined v-model="resourceCount" :label="'Number of ' + (gpu == true ? 'GPU' : 'CPU')" prepend-icon="fas fa-microchip"></v-text-field> 
          </v-col>

        </v-row>
      </v-card-text>
      <v-card-text v-if="errorInForm == true">
        <p> Input data missing or malformed </p>
      </v-card-text>
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
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator'

export default {
    name: 'SpinUpWorkload',
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

        projectDefaults: undefined,

        name: '',
        image: null,
        gpu: true,
        istanceCount: 1,
        node: 'pwm.all',
        gpuProductName: 'pwm.all',
        cpuProductName: 'pwm.all',
        resourceCount: 1,
        attachedVolumes: [],
        attachedVolumesMounts: {},

        nodes: [],
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
      generateName () {
        if (this.$store.state.ui.preferences.randomNameGenerator == 'unique-names-generator' || this.$store.state.ui.preferences.randomNameGenerator == undefined) {
          return uniqueNamesGenerator({
            dictionaries: [adjectives, colors ], 
            length: 2,
            separator: '.'
          })          
        } else if (this.$store.state.ui.preferences.randomNameGenerator == 'anifunny') {
          return anifunny.generate()  
        }
      },
      compoundInstances (index) {
        let body = {
          kind: 'Workload',
          apiVersion: 'v1',
          metadata: {
            name: this.projectDefaults.id + '.' + this.generateName(),
          },
          spec: {
            driver: 'pwm.docker',
            selectors: {
              node: {
                name: this.node
              },
            },
            config: {
              cmd: '/bin/bash'
            },
            image: {
              image: this.projectDefaults.framework 
            },
            volumes: []
          }
        }

        if (this.gpu == true) {
          body.spec.selectors.gpu = {product_name: this.gpuProductName, count: this.resourceCount}
        } else {
          body.spec.selectors.cpu = {product_name: this.cpuProductName, count: this.resourceCount}
        }

        // Load volume code
        if (this.projectDefaults.codeVolume !== undefined) {
            body.spec.volumes.push({
              name: this.projectDefaults.codeVolume.name,
              storage: this.projectDefaults.codeVolume.storage,
              group: this.projectDefaults.codeVolume.group,
              target: this.projectDefaults.targetMountCode,
            })
        }

        if (this.projectDefaults.dataVolume !== undefined) {
            body.spec.volumes.push({
              name: this.projectDefaults.dataVolume.name,
              storage: this.projectDefaults.dataVolume.storage,
              group: this.projectDefaults.dataVolume.group,
              target: this.projectDefaults.targetMountData,
            })
        }
        return body
      },
      save () {
        let docs = []
        for (var i = 0; i < this.istanceCount; i += 1) {
          docs.push(this.compoundInstances(i))
        }
        this.$store.state.interface.cli.api.apply.batch(docs, {group: '-'}, function (err, data) {
          this.snack = {show: true, err: err, text: data, timeout: 1500}
        }.bind(this))
      },
      fetchNodes (cb) {
        this.$store.state.interface.cli.api.get.one('Node', {}, function (err, data) {
          console.log(err)
          if (err) {
            if (cb) {
              cb()
            }
          } else {
            this.nodes = data
            this.nodes.push({
              name: 'pwm.all',
              gpus: 0
            })
            this.nodes.push({
              name: 'pwm.all',
              gpus: 1
            })
            if (cb) {
              cb()
            }
          }
        }.bind(this))
      },
      fetchVolumes (cb) {
        this.volumes = {}
        this.volumeNames = []
        this.$store.state.interface.cli.api.get.one('Volume', {}, function (err, data) {
          console.log(err)
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
      fetch () {
        this.fetchNodes(this.fetchVolumes)
      }
    },
    mounted () {
      this.projectDefaults = this.$store.state.projects[this.$store.state.ui.selectedProjectIdx]
      this.name = anifunny.generate()
      this.fetch()
    }
}
</script>
