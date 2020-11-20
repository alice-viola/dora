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
    <v-card-text v-if="selectedMode == 'form'">
      <v-container>
      <v-card class="pa-3">
        <v-card-title v-text="'template'"></v-card-title>
          <v-form>
            <v-form-base :col="6" :model="template" :schema="schema" @input="renderYaml" />
          </v-form>
        </v-card>
      </v-container>
      <v-spacer></v-spacer>
      <v-container>
        <v-card class="pa-3">
        <v-card-title v-text="'volumes'"></v-card-title>
          <v-form>
            <v-form-base :col="6" :model="volumes" :schema="vol_schema" @change="addVolumes"/>
          </v-form>
        </v-card>
      </v-container>
      <v-spacer></v-spacer>
      <v-container>
        <v-card class="pa-3">
        <v-card-title v-text="'yaml'"></v-card-title>
          <v-form @submit.prevent>
            <v-form-base :col="6" :model="used" :schema="used_file" @input="applyFile" />
          </v-form>
        </v-card>
      </v-container>
    </v-card-text>
    <v-card-actions>
      <v-btn text color="green" @click="applyResource">Apply</v-btn>
    </v-card-actions>
  </v-card>
</template>
<script>
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
  name: <NAME>
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
  name: <NAME>
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
  WEBWorkload: `
apiVersion: v1
kind: Workload
metadata:
  name: <NAME>
spec:
  driver: pwm.docker
  selectors:
    node:
      name: pwm.all
    cpu:
      product_name: pwm.all
  image: 
    image: nginx
  config: 
    labels:
      - name: traefik.http.routers.<NAME>.rule
        value: Host(\`<URL>\`)
      - name: traefik.docker.network
        value: <NETWORK_NAME>
  network:
    name: <NETWORK_NAME>
    ports:
      - protocol: tcp
        port: <CONTAINER_PORT>
`
  }
  
let template1 = {
  apiVersion: 'v1',
  kind: 'Workload',
  metadata: {
    name: 'metadata.name',
    type: 'string',
    default: 'random-string'
  },
  spec: {
    driver: 'pwm.docker',
    selectors: {
      node: {
        key: 'spec.selectors.node.name',
        type: 'string',
        default: 'pwm.all'
      }, 
      gpu: {
        product_name: {
          key: 'spec.selectors.gpu.product_name',
          type: 'string',
          default: 'pwm.all'
        },
        count: {
          key: 'spec.selectors.gpu.count',
          type: 'int',
          default: 1
        }
      }
    },
    image: 
      {
      registry: {
        key: 'spec.image.registry',
        type: 'string',
        default: ''
      },
      image:{
        key: 'spec.image.image',
        type: 'string',
        default: 'ubuntu'
        }
      },
    config: {
      cmd: {
        key: 'spec.config.cmd',
        type: 'string',
        default: '/bin/bash'
      }
    },
    volumes: [ [Object], [Object] ]
  }
}

const required = msg => v => !!v || msg


function getExample(kind, user) {
  return examples[kind]
}

export default {
  name: 'NewResource',
  components: {
    codemirror, 
    vFormBase
    },
  data: function () {
    return {
      examples: examples,
      selectedMode: 'form',
      selectedResourceKind: 'CPUWorkload',
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
        metadata: 'random-string',
        node: 'pwm.all',
        gpu_type: 'all??',
        gpu_count: '1',
        image_registry: '',
        image_image:'ubuntu',
        cmd: '/bin/bash',
      },

      volumes : {
        name: 'home',
        storage: '',
        target: '/home',
        submit: undefined 
      },

      used: {
        file: []
      },
      used_file: { 
        type: 'file',
        showSize:true,
        counter:true
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
    gpus: function () {
      //TODO: fetchare il database x vedere le risorse disponibili
      return ['Tesla V100-SXM2-16GB','Quadro RTX 6000', 'GeForce GTX 1080 Ti'] 
    },
    vol_schema: function () {
      return {
        name: { type:'text', label:'volume name' },                  
        storage: {
          type: 'select',
          label: 'storage',
          items: this.storage,
          rules: [ required('Storage is required') ]
        },
        target: { type:'text', label:'target direcory' },
        submit: {type: 'btn', label: 'add volume'}
    }
    },
    storage() {
      // fetch db for storages
      return ['storage1', 'storage2']
    },
    schema: function () {
      return {
        kind: { type:'text', label:'kind' },
        metadata: { type:'text', label:'metadata' },                  
        node: { type:'text', label:'node'},
        gpu_type: {
          type:'select',
          label: 'gpu type',
          items: this.gpus,
        },
        gpu_count: {
          type: 'number',
          label:'gpu count',
          min: 'number',            // limit number or range
          max: 'number',
        },
        image_registry:  {
          type:'text',
          label:'registry name',
          hint:'promfacility.registry.eu', 
          clearable:true,
          rules: [ required('Registry is required') ] 
        },
        image_image: {
          type:'text',
          label:'image name',
        },
        cmd: {
          type:'text',
          label:'docker command',
        },
      }
    },
  
  },
  methods: {
    addVolumes({ on, key, obj, params }){
      console.log(on, key, obj, params)
      let test =0
      for (let i = 0; i < 1000000000; i++) {
        test +=1;
      }
     
      console.log(1)
    },
    renderYaml(v){
      // json2yaml
        console.log(v.data)
    },
    applyFile(f){
      //applied file
      console.log(f.data)
    },

    formatResource (inData) {
      if (inData instanceof Array) {
        return inData
      }  else {
        return [inData]
      }
    },
    applyResource () {
      let jsonData = yaml.safeLoadAll(this.code)
      this.formatResource(jsonData).forEach(function (_resource) {
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
    }
  }
}
</script>
<style>
.CodeMirror {
  min-height: 60vh;
  height: auto;
}
</style>