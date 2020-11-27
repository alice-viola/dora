<template>
  <v-card class="elevation-12" style="min-height: 80vh">
    <v-toolbar
      color="gray" dark flat>
      <v-toolbar-title>New Resource <b>{{selectedResourceKind}}</b></v-toolbar-title>
      <v-spacer></v-spacer>
      <v-menu
        left
        bottom
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            text
            color="white"
            v-bind="attrs"
            v-on="on"
          >
           {{selectedResourceKind}}
          <v-icon
            right
            dark
          >
            mdi-format-align-left
          </v-icon>
          </v-btn>
        </template>

        <v-list>
          <v-list-item 
            v-for="mode in Object.keys(examples)"
            :key="mode"
            @click="selectedResourceKind = mode"
          >
            <v-list-item-title>{{ mode }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-menu
        left
        bottom
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            text
            color="white"
            v-bind="attrs"
            v-on="on"
          >
           {{selectedMode}}
          <v-icon
            right
            dark
          >
            mdi-format-align-left
          </v-icon>
          </v-btn>
        </template>

        <v-list>
          <v-list-item 
            v-for="mode in ['yaml', 'form']"
            :key="mode"
            @click="selectedMode = mode"
          >
            <v-list-item-title>{{ mode }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-toolbar>
    <v-card-text v-if="selectedMode == 'yaml'">
       <codemirror v-model="code" :options="cmOptions" @ready="onCmReady"/>
    </v-card-text>
    <!-- F O R M -->
    <v-card-text v-if="selectedMode == 'form'">
      <v-container>
      <v-card elevation="0">
        <v-toolbar>
          <v-toolbar-title>Template</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>
        <v-card-text>
          <v-form>
            <v-form-base color="green" :col="6" :model="template" :schema="schema"/>
          </v-form>
        </v-card-text>
        </v-card>
      </v-container>
      <v-spacer></v-spacer>
      <v-container>
        <v-card elevation="0">
          <v-toolbar>
            <v-toolbar-title>Volumes</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn elevation="6" icon @click="addVolumes">
              <v-icon>mdi-shape-square-rounded-plus</v-icon>
            </v-btn>
          </v-toolbar>
          <v-card-text>
            <v-form v-for="(v, index) in volumes" :key="index">
                <v-form-base :col="6" :model="v" :schema="volumes_schema[index]"/>
                <v-btn v-if="volumes.length>1" color="warning" @click="removeVolume(index)" small>
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
            </v-form>
          </v-card-text>
        
        </v-card>
      </v-container>
      <v-spacer></v-spacer>
    </v-card-text>
    <v-card-actions>
      <v-btn text color="green" @click="applyResource">Apply</v-btn>
    </v-card-actions>
  </v-card>
</template>
<script>

import dockerNames from 'docker-names'
import yaml from 'js-yaml'
import { codemirror } from 'vue-codemirror'
import vFormBase from 'vuetify-form-base'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/yaml-frontmatter/yaml-frontmatter.js'
import 'codemirror/theme/base16-dark.css'


let examples = {
  CPUWorkload: `
apiVersion: v1
kind: Workload
metadata:
  name: ` + dockerNames.getRandomName() + `
spec:
  driver: pwm.docker
  selectors:
    node:
      name: pwm.all
    cpu:
      product_name: pwm.all
      count: 1
  image: 
    image: ubuntu
  config: 
    cmd: /bin/bash
  volumes:
    - name: home
      storage: pwmzfs01
      target: /home
   `,
  GPUWorkload: `
apiVersion: v1
kind: Workload
metadata:
  name: ` + dockerNames.getRandomName() + `
spec:
  driver: pwm.docker
  selectors:
    node:
      name: pwm.all
    gpu:
      product_name: pwm.all
      count: 1
  image: 
    image: ubuntu
  config: 
    cmd: /bin/bash
  volumes:
    - name: home
      storage: pwmzfs01
      target: /home
   `,
  Volume: `
apiVersion: v1
kind: Volume
metadata:
  name: home
spec:
  storage: pwmzfs01
  subPath: /home
   `,
  Storage: `
apiVersion: v1
kind: Storage
metadata:
  name: example-storage
spec:
  accessModes: ReadWriteMany 
  capacity: 
    storage: 30Gi 
  kind: nfs
  nfs:
    server: <IP_ADDRESS>
    path: /<MOUNT_PATH>
   `,
  Group: `
apiVersion: v1
kind: Group
metadata:
  name: <GROUP_NAME>
   `,
//   WEBWorkload: `
// apiVersion: v1
// kind: Workload
// metadata:
//   name: <NAME>
// spec:
//   driver: pwm.docker
//   selectors:
//     node:
//       name: pwm.all
//     cpu:
//       product_name: pwm.all
//   image: 
//     image: nginx
//   config: 
//     labels:
//       - name: traefik.http.routers.<NAME>.rule
//         value: Host(\`<URL>\`)
//       - name: traefik.docker.network
//         value: <NETWORK_NAME>
//   network:
//     name: <NETWORK_NAME>
//     ports:
//       - protocol: tcp
//         port: <CONTAINER_PORT>
// `
  }
  
const required = msg => v => !!v || msg

function getExample(kind, user) {
  return examples[kind]
}

export default {
  name: 'NewResource',
  components: { codemirror, vFormBase },
  data: function () {
    return {
      examples: examples,
      selectedMode: 'yaml',
      selectedResourceKind: 'GPUWorkload',
      resources: {nodes: [], gpus: [], storages: []},
      code: '',
      cmOptions: {
        tabSize: 2,
        mode: 'text/yaml',
        lineNumbers: true,
        styleActiveLine: true,
        theme: 'base16-dark',
        line: true,
      },
  
      template: {
        kind: 'Workload',
        name: dockerNames.getRandomName(),
        node: 'pwm.all',
        gpu_type: 'pwm.all',
        gpu_count: '1',
        image_registry: 'index.docker.io',
        image_image: 'ubuntu',
        cmd: '',
      },
     
      volumes_schema : [],
      volumes: [],

      used: {
        file: []
      },
      used_file: { 
        type: 'file',
        showSize: true,
        counter: true
      }
        
    }
  },
  watch: {
    selectedResourceKind (to, from) { 
      this.code = `${getExample(this.selectedResourceKind || 'Workload', this.$store.state.user.name)}`
    },    
  },
  computed: {
    codemirror() {
      return this.$refs.cmEditor.codemirror
    },

    schema: function () {
      return {
        kind: {
          type: 'select',
          label: 'Kind',
          items: ['Workload'],
        },
        name: { type: 'text', label: 'name' },                  
        node: {
          type: 'select',
          label: 'Node selector',
          items: ['pwm.all'].concat(this.resources.nodes.map((node) => {return node.name})),
          selected: 0
        },
        gpu_type: {
          type: 'select',
          label: 'GPU type',
          items: ['pwm.all'].concat(this.resources.gpus),
        },
        gpu_count: {
          type: 'number',
          label: 'GPU count',
          min: 'number', // limit number or range
          max: 'number',
        },
        image_registry:  {
          type: 'text',
          label: 'Registry name',
          hint: 'index.docker.io', 
          clearable: true,
          rules: [ required('Registry is required') ] 
        },
        image_image: {
          type: 'text',
          label: 'Image name',
          rules: [ required('Image is required') ] 
        },
        cmd: {
          type: 'text',
          label: 'Command',
          hint: 'Default as Dockerfile', 
        },
      }
    },
  
  },
  methods: {

    volume_schema () {
      let schema = {
        name: { type:'text', label:'Volume name' },                  
        storage: {
          type: 'select',
          label: 'Storage',
          items: this.resources.storages,
          rules: [ required('Storage is required') ]
        },
        target: { type:'text', label:'Target direcory' },
      }
      return schema
    },
    volume () {
      let volume = {
        name: '',
        storage: '',
        target: '/home',
      }
      return volume
    },
    addVolumes () {
      this.volumes.push(this.volume())
      this.volumes_schema.push(this.volume_schema())
    },
    removeVolume (index) {
      if (this.volumes.length > 1) {
        this.volumes.splice(index, 1)
        this.volumes_schema.splice(index, 1)
      }
    },
 
    formatResource (inData) {
      if (inData instanceof Array) {
        return inData
      }  else {
        return [inData]
      }
    },
    applyResource () {
      if (this.selectedMode == 'form') {
        this.applyResourceForm()
        return
      }
      let jsonData = yaml.safeLoadAll(this.code)
      this.formatResource(jsonData).forEach(function (_resource) {
        this.$store.dispatch('apply', _resource)
      }.bind(this))
    },
    applyResourceForm () {
      let WorkloadFormatted = {
        apiVersion: 'v1',
        kind: 'Workload',
        metadata: {
          name: this.template.name
        },
        spec: {
          driver: 'pwm.docker',
          selectors: {
            node: {
              name: this.template.node
            },
            gpu: {
              product_name: this.template.gpu_type,
              count: this.template.gpu_count
            }
          },
          image: {
            registry: this.template.image_registry,
            image: this.template.image_image,
          }
        }
      }
      if (this.template.cmd !== '' ) {
        WorkloadFormatted.config = {cmd: this.template.cmd}  
      }
      if (this.volumes == []) {
        this.addVolumes()
      }
      if (this.volumes.name !== '' && this.volumes.storage !== '') {
        if (WorkloadFormatted.spec.volumes == undefined) {
          WorkloadFormatted.spec.volumes = []
        } 
        WorkloadFormatted.spec.volumes = this.volumes 
      }
      
      this.formatResource(WorkloadFormatted).forEach(function (_resource) {
        this.$store.dispatch('apply', _resource)
      }.bind(this))
    },

    onCmReady(cm) {
      setTimeout(function (argument) {
        this.code = `${getExample(this.selectedResourceKind, this.$store.state.user.name)}`
      }.bind(this), 500)
    },
    onCmCodeChange(newCode) {
      this.code = newCode
    },
    fetch () {
      this.$store.dispatch('resource', {name: 'Node', cb: function (data) {
        this.resources.nodes = data
      }.bind(this)})    
      this.$store.dispatch('resource', {name: 'GPU', cb: function (data) {
        this.resources.gpus = [...new Set(data.map((gpu) => { return gpu.product_name}) )]
      }.bind(this)})  
      this.$store.dispatch('resource', {name: 'Storage', cb: function (data) {
        this.resources.storages = data.map((storage) => {return storage.name})
      }.bind(this)})
    },
  },
  mounted () {
    this.fetch() 
  }
}
</script>
<style>
.CodeMirror {
  min-height: 60vh;
  height: auto;
}
</style>