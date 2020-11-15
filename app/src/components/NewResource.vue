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
        <h3> Form is not implemented yet </h3>
    </v-card-text>
    <v-card-actions>
      <v-btn text color="green" @click="applyResource">Apply</v-btn>
    </v-card-actions>
  </v-card>
</template>
<script>
import yaml from 'js-yaml'
import { codemirror } from 'vue-codemirror'
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
   `
  }
  

function getExample(kind, user) {
  return examples[kind]
}

export default {
  name: 'NewResource',
  components: {codemirror},
  data: function () {
    return {
      examples: examples,
      selectedMode: 'yaml',
      selectedResourceKind: 'CPUWorkload',
      code: '',
      cmOptions: {
        tabSize: 2,
        mode: 'text/yaml',
        lineNumbers: true,
        styleActiveLine: true,
        theme: 'base16-dark',
        line: true,
      }
    }
  },
  watch: {
    selectedResourceKind (to, from) { 
      this.code = `${getExample(this.selectedResourceKind || 'Workload', this.$store.state.user.name)}`
    }
  },
  computed: {
    codemirror() {
      return this.$refs.cmEditor.codemirror
    }
  },
  methods: {
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