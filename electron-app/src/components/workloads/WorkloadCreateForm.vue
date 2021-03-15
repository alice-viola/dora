<template>
  <v-container class="mainbackground"  fluid>
  	<v-card class="mainbackground elevation-0">
  		<v-card-title class="overline">
  			Create Workload
  		</v-card-title>

  		<v-card-text>
  			<v-row>
  				<v-col class="col-12">
  					<v-text-field :rules="nameRules" dense outlined v-model="name" label="Name" prepend-icon="fas fa-file-signature"></v-text-field> 
  				</v-col>
          <v-col class="col-12">
            <v-combobox
              clearable
              dense
              outlined
              persistent-hint
              label="Image"
              v-model="image"
              :items="$store.state.docker.images"
              prepend-icon="fab fa-docker"
            ></v-combobox>
            <v-divider />
          </v-col>

          <v-col class="col-6">
            <v-switch inset dense outlined v-model="gpu" label="Attach GPU" prepend-icon="fas fa-file-signature" class="mt-1"></v-switch> 
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
          <v-col class="col-12">
            <v-text-field number dense outlined v-model="resourceCount" :label="'Number of ' + (gpu == true ? 'GPU' : 'CPU')" prepend-icon="fas fa-file-signature"></v-text-field> 
            <v-divider />
          </v-col>

          <v-col class="col-12">
            <v-select outlined dense multiple  v-model="attachedVolumes" :items="volumeNames" label="Persistent storage" />
            <div v-for="av in attachedVolumes">
              <v-row>
                <v-col class="col-8 pt-2">
                  Storage <b>{{av}}</b> mounted at
                </v-col>
                <v-col dense class="col-4 pa-0 pr-2">
                  <v-text-field dense outlined v-model="attachedVolumesMounts[av]" />
                </v-col>
              </v-row>
            </div>
          </v-col>

          <v-col class="col-12">
            <v-divider />

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

import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator'
import anifunny from 'anifunny'

export default {
  	name: 'WorkloadCreateForm',
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

        name: anifunny.generate(),
        image: null,
        gpu: true,
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
      save () {
        if (this.image == null) {
          this.errorInForm = true
          return
        }
        let body = {
          kind: 'Workload',
          apiVersion: 'v1',
          metadata: {
            name: this.name,
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
              image: this.image 
            }
          }
        }

        if (this.gpu == true) {
          body.spec.selectors.gpu = {product_name: this.gpuProductName, count: this.resourceCount}
        } else {
          body.spec.selectors.cpu = {product_name: this.cpuProductName, count: this.resourceCount}
        }

        if (Object.keys(this.attachedVolumes).length !== 0) {
          body.spec.volumes = []
          Object.keys(this.attachedVolumes).forEach(function (attachedVolumeIndex) {
            console.log(this.volumes, this.attachedVolumes[attachedVolumeIndex])
            let volumeName = this.attachedVolumes[attachedVolumeIndex]
            body.spec.volumes.push({
              name: volumeName,
              storage: this.volumes[volumeName].storage,
              group: this.volumes[volumeName].group,
              target: this.attachedVolumesMounts[volumeName],
            })
          }.bind(this))
        }
        console.log(body)

        this.$store.state.interface.cli.api.apply.one(body, {group: '-'}, function (err, data) {
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
      this.name = this.generateName()
      this.fetch()
    }
}
</script>
