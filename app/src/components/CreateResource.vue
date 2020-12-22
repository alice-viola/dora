<template>
  	<v-card class="elevation-12" style="min-height: 60vh">
    	<v-toolbar class="mainbackground lighten-1" flat>
    	  <v-toolbar-title>New Resource <b>{{selectedResourceKind}}</b></v-toolbar-title>
    	  <v-spacer></v-spacer>
    	  <v-menu
    	    left
    	    bottom
    	  >
    	    <template v-slot:activator="{ on, attrs }">
    	      <v-btn
    	        text
    	        class="primary--text"
    	        v-bind="attrs"
    	        v-on="on"
    	      >
    	       {{selectedResourceKind}}
    	      <v-icon
    	        right
    	      >
    	        mdi-format-align-left
    	      </v-icon>
    	      </v-btn>
    	    </template>
	
    	    <v-list v-if="selectedMode == 'form'">
    	      <v-list-item 
    	        v-for="mode in ['Workload']"
    	        :key="mode"
    	        @click="selectedResourceKind = mode"
    	      >
    	        <v-list-item-title>{{ mode }}</v-list-item-title>
    	      </v-list-item>
    	    </v-list>
    	    <v-list v-if="selectedMode == 'yaml'">
    	      <v-list-item 
    	        v-for="mode in ['Workload', 'CPUWorkload', 'Volume', 'Storage', 'Group']"
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
    	        class="primary--text"
    	        v-bind="attrs"
    	        v-on="on"
    	      >
    	       {{selectedMode}}
    	      <v-icon
    	        right
    	      >
    	        mdi-format-align-left
    	      </v-icon>
    	      </v-btn>
    	    </template>
	
    	    <v-list>
    	      <v-list-item 
    	        v-for="mode in ['form', 'yaml']"
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
    		<v-card flat class="elevation-0 pa-0">
    			<v-card-text>
    				<div class="row">
    					<div class="col-12" style="text-align: right">
    						<v-btn class="primary--text" text v-on:click="applyResource()"> Apply </v-btn>
    					</div>
    				</div>
    			</v-card-text>
    		</v-card>
    	</v-card-text>
    	<v-card-text v-if="selectedMode == 'form' && formResource._internal !== undefined && formResource._internal.toRender == true">
    		<v-card flat class="elevation-0 pa-0 pt-6">
    			<v-card-text class="pa-0"">
    				<div class="row">
    					<div class="col-lg-2 col-12">
    						<v-card-title>
    							General
    						</v-card-title>
    					</div>
    					<div class="col-lg-5 col-6">
    						<v-text-field
    						  	label="Workload name"
    						  	v-model="formResource.metadata.name"
    						  	hide-details="auto"
    						></v-text-field>
    					</div>
    					<div class="col-lg-5 col-6">
        					<v-combobox
        					  v-model="formResource.spec.image.image"
        					  :items="['ubuntu', 'tensorflow/tensorflow:latest-gpu', 'tensorflow/tensorflow:2.1.2-gpu' ,'pytorch/pytorch:1.5-cuda10.1-cudnn7-runtime', 'floydhub/pytorch:1.5.0-gpu.cuda10cudnn7-py3.55']"
        					  label="Base image"
        					></v-combobox>
    					</div>
    				</div>
    			</v-card-text>
    		</v-card>
    		<v-card flat class="elevation-0 pa-0">

    			<v-card-text class="pa-0"">
    				<div class="row" v-if="formResource._internal.attachGPU == true">
    					<div class="col-lg-2 col-12">
    						<v-card-title>
    							Resources
    						</v-card-title>
    					</div>
    					<div class="col-lg-5 col-12" >
        					<v-select
        					  :items="['pwm.all'].concat(resources.gpus)"
        					  v-model="formResource.spec.selectors.gpu.product_name"
        					  label="GPU Model"
        					></v-select>
        				</div>
        				<div class="col-6  col-lg-2" >
    						<v-text-field
    						  	label="Count"
    						  	v-model="formResource.spec.selectors.gpu.count"
    						  	hide-details="auto"
    						></v-text-field>
    					</div>
    					<div class="col-6  col-lg-3">
    						<v-switch
    						  v-model="formResource._internal.attachGPU"
    						  :label="`Attach GPU`"
    						></v-switch>
    					</div>
    				</div>
    				<div class="row" v-else>
    					<div class="col-12 col-lg-2">
    						<v-card-title>
    							Resources
    						</v-card-title>
    					</div>
    					<div class="col-lg-5 col-12">
        					<v-select
        					  :items="['pwm.all'].concat(resources.cpus)"
        					  v-model="formResource.spec.selectors.cpu.product_name"
        					  label="CPU Model"
        					></v-select>
    					</div>
        				<div class="col-6 col-lg-2" >
    						<v-text-field
    						  	label="Count"
    						  	v-model="formResource.spec.selectors.cpu.count"
    						  	hide-details="auto"
    						></v-text-field>
    					</div>
    					<div class="col-6 col-lg-3">
    						<v-switch
    						  v-model="formResource._internal.attachGPU"
    						  :label="`Attach GPU`"
    						></v-switch>
    					</div>
    				</div>
    			</v-card-text>
    		</v-card>

    		<v-card flat class="elevation-0 pa-0">
    			<v-card-text class="pa-0"">
    				<div class="row">
    					<div class="col-12 col-lg-2">
    						<v-card-title>
    							Disks
    						</v-card-title>
    					</div>
    					<div class="col-12 col-lg-10">
        					<v-select
        					  v-model="formResource.spec.volumes"
        					  :items="resources.volumes"
        					  item-text="name"
        					  :menu-props="{ maxHeight: '400' }"
        					  label="Volume"
        					  multiple
        					  :hint="'Pick your desidered persistent volumes. E.g. mounts at ' + formResource.spec.volumes.map((vol) => { return '/' + vol}).toString()"
        					  persistent-hint
        					></v-select>
    					</div>
    				</div>
    			</v-card-text>
    		</v-card>

    		<v-card flat class="elevation-0 pa-0">
    			<v-card-text class="pa-0"">
    				<div class="row">
    					<div class="col-12">
    						<v-expansion-panels flat>
    							<v-expansion-panel>
    							  	<v-expansion-panel-header>
    									<v-card-title class="pa-0 ma-0 grey--text">
    										Advanced
    									</v-card-title>
    							  	</v-expansion-panel-header>
    							  	<v-expansion-panel-content>
    							  		<div class="row">
											<div class="col-6 col-lg-3">
    											<v-text-field
    											  	label="Command"
    											  	v-model="formResource.spec.config.cmd"
    											  	hide-details="auto"
    											></v-text-field>
											</div>
											<div class="col-6 col-lg-3">
    											<v-text-field
    											  	label="Shared memory (bytes)"
    											  	v-model="formResource.spec.config.shmSize"
    											  	hide-details="auto"
    											></v-text-field>
											</div>
    							  		</div>
    							  	</v-expansion-panel-content>
    							</v-expansion-panel>
    						</v-expansion-panels>
    					</div>
    				</div>
    			</v-card-text>
    		</v-card>

    		<v-card flat class="elevation-0 pa-0">
    			<v-card-text class="pa-0"">
    				<div class="row">
    					<div class="col-12" style="text-align: right">
    						<v-btn class="primary--text" text v-on:click="applyResourceForm()"> Apply </v-btn>
    					</div>
    				</div>
    			</v-card-text>
    		</v-card>

    	</v-card-text>
	</v-card>
</template>
<script type="text/javascript">

import dockerNames from 'docker-names'
import yaml from 'js-yaml'
import _ from 'lodash'
import { codemirror } from 'vue-codemirror'
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
  Workload: `
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
   `
}


let Workload = {
	defaults: {
		apiVersion: 'v1',
		kind: 'Workload',
		metadata: {},
		spec: {config: {}},
	},
	defaultFields: [
		{text: 'Workload name', target: 'metadata.name', kind: 'text', default: dockerNames.getRandomName()},
		{text: 'Base image', target: 'spec.image.image', kind: 'text', default: 'ubuntu'},
		{text: 'GPU/CPU', target: 'spec.selectors.gpu.product_name', kind: 'switch', values: ['gpu', 'cpu'], default: 'pwm.all'},
		{text: 'GPU/CPU', target: 'spec.selectors.cpu.product_name', kind: 'switch', values: ['gpu', 'cpu'], default: 'pwm.all'},
		{text: 'Quantity', target: 'spec.selectors.gpu.count', kind: 'number', default: 1},
		{text: 'Quantity', target: 'spec.selectors.cpu.count', kind: 'number', default: 1},
		{text: 'Disks', target: 'spec.volumes', kind: 'array', default: ['home'], template: 'volumeItem' },
	],
	advancedFields: [
		{text: 'Driver', target: 'spec.driver', kind: 'select', default: 'pwm.docker', selectedIn: ['pwm.docker']},
		{text: 'Command', target: 'spec.config.cmd', kind: 'text', default: '/bin/bash'},
		{optional: true, text: 'Shared memory (bytes)', target: 'spec.config.shmSize', kind: 'number', default: '64000000'},
	],
	templates: {
		volumeItem: [
			{text: 'Volume name', kind: 'text'},
			{text: 'Storage', kind: 'text'},
			{text: 'Target', kind: 'text'},
		]
	},
	internal: {
		toRender: false,
		attachGPU: true
	}
}

examples[Workload] = Workload

function getExample(kind, user) {
  	return examples[kind]
}

export default {
  name: 'NewResource',
  components: { codemirror },
  data: function () {
    return {
      formResource: {}, 	
      resourceModel: {Workload: Workload},
      examples: examples,
      selectedMode: 'form',
      selectedResourceKind: 'Workload',
      resources: {nodes: [], gpus: [], storages: [], cpus: [], volumes: []},
      code: '',
      cmOptions: {
        tabSize: 2,
        mode: 'text/yaml',
        lineNumbers: true,
        styleActiveLine: true,
        theme: 'base16-dark',
        line: true,
      },        
    }
  },
  watch: {
    selectedResourceKind (to, from) { 
      this.code = `${getExample(this.selectedResourceKind || 'Workload', this.$store.state.user.name)}`
      this.setFormResource()
    },
    selectedMode (to, from) {
    	if (this.selectedResourceKind !== 'Workload') {
    		this.selectedResourceKind = 'Workload'
    	} else {
    		this.setFormResource()		
    	}
    }
  },
  computed: {
    codemirror() {
      return this.$refs.cmEditor.codemirror
    },
  },
  methods: {
  	setFormResource () {
  		if (this.selectedMode !== 'form') {
  			return
  		}
  		this.formResource = {}
  		Object.keys(this.resourceModel[this.selectedResourceKind].defaults).forEach(function (key) {
  			this.formResource[key] = this.resourceModel[this.selectedResourceKind].defaults[key]
  		}.bind(this))
  		this.resourceModel[this.selectedResourceKind].defaultFields.forEach(function (item) {
  			_.set(this.formResource, item.target, item.default)
  		}.bind(this))
  		this.resourceModel[this.selectedResourceKind].advancedFields.forEach(function (item) {
  			if (item.optional == undefined || item.optional == false) {
  				_.set(this.formResource, item.target, item.default)	
  			}
  		}.bind(this))
  		this.formResource._internal = this.resourceModel[this.selectedResourceKind].internal
  		this.formResource._internal.toRender = true
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
      	let workloadData = {}
      	workloadData.apiVersion = this.formResource.apiVersion
      	workloadData.kind = this.formResource.kind
      	workloadData.metadata = this.formResource.metadata
      	workloadData.spec = {selectors: {}}
      	if (this.formResource._internal.attachGPU) {
          this.formResource.spec.selectors.gpu.count = parseInt(this.formResource.spec.selectors.gpu.count)
      		workloadData.spec.selectors.gpu = this.formResource.spec.selectors.gpu
      	} else {
          this.formResource.spec.selectors.cpu.count = parseInt(this.formResource.spec.selectors.cpu.count)
      		workloadData.spec.selectors.cpu = this.formResource.spec.selectors.cpu
      	}
        console.log(workloadData.spec.selectors)
      	workloadData.spec.image = this.formResource.spec.image
      	workloadData.spec.driver = this.formResource.spec.driver
      	if (this.formResource.spec.volumes.length > 0) {
      		workloadData.spec.volumes = []
      		this.formResource.spec.volumes.forEach((volumeName) => {
      			this.resources.volumes.some((volume) => {
      				if (volume.name == volumeName) {
      					workloadData.spec.volumes.push({name: volume.name, storage: volume.storage, target: '/' + volume.name, group: volume.group})
      					return true
      				}
      			})
      		})
      	}
      	if (this.formResource.spec.config !== undefined) {
      		workloadData.spec.config = this.formResource.spec.config
      	}
      	this.formatResource(workloadData).forEach(function (_resource) {
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
      	this.$store.dispatch('resource', {name: 'CPU', cb: function (data) {
      		let validCpus = [] 
      		data = data.filter((cpu) => {
      			let found = null
      			this.resources.nodes.some((node) => {
      				if (node.name == cpu.node && node.allow.includes('CPUWorkload')) {
      					validCpus.push(cpu)
      				} 
      			})
      		})
      	  	this.resources.cpus = [...new Set(validCpus.map((cpu) => { return cpu.product_name}) )]
      	}.bind(this)}) 
      }.bind(this)})    
      this.$store.dispatch('resource', {name: 'GPU', cb: function (data) {
        this.resources.gpus = [...new Set(data.map((gpu) => { return gpu.product_name}) )]
      }.bind(this)})  
 
      this.$store.dispatch('resource', {name: 'Storage', cb: function (data) {
        this.resources.storages = data.map((storage) => {return storage.name})
      }.bind(this)})
      this.$store.dispatch('resource', {name: 'Volume', cb: function (data) {
        this.resources.volumes = data.map((volume) => {return {name: volume.name, storage: volume.storage, target: '/' + volume.name, group: volume.group}})
      }.bind(this)})
    },

  },
  mounted () {
  	this.setFormResource()	
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