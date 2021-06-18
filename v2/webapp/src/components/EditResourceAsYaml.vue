<template>
  	<v-card class="elevation-12" style="min-height: 60vh">
    	<v-toolbar class="mainbackground lighten-1" flat >
    	  <v-toolbar-title class="overline" v-if="originalResource !== undefined">Edit <b >{{originalResource.name}}</b></v-toolbar-title>
        <v-toolbar-title class="overline" v-else>Create</v-toolbar-title>
    	</v-toolbar>

    	<v-card-text>
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
    	
	</v-card>
</template>
<script type="text/javascript">

import yaml from 'js-yaml'
import _ from 'lodash'
import { codemirror } from 'vue-codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/yaml-frontmatter/yaml-frontmatter.js'
import 'codemirror/theme/base16-dark.css'
import 'codemirror/theme/base16-light.css'

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export default {
  name: 'EditResource',
  components: { codemirror },
  props: ['originalResource'],
  data: function () {
    return {
      resource: {},
      code: '',
      cmOptions: {
        tabSize: 2,
        mode: 'text/yaml',
        lineNumbers: true,
        styleActiveLine: true,
        theme: this.$vuetify.theme.dark == true ? 'base16-dark' : 'base16-light',
        line: true,
      },        
    }
  },
  watch: {
    'originalResource.name' (oldR, newR) {
      this.fetch()
    },
    '$vuetify.theme.dark' (to, from) {
      this.cmOptions.theme = this.$vuetify.theme.dark == true ? 'base16-dark' : 'base16-light'
    },
  },
  computed: {
    codemirror() {
      return this.$refs.cmEditor.codemirror
    },
  },
  methods: {
    applyResource () {
      let jsonData = yaml.safeLoadAll(this.code)
      this.formatResource(jsonData).forEach(function (_resource) {
        this.$store.dispatch('apply', _resource)
      }.bind(this))
    },
    onCmReady(cm) {
      if (this.resource.length == 1) {
        let codeObj = {
          kind: capitalizeFirstLetter(this.resource[0].kind), 
          metadata: {name: this.resource[0].name},
          spec: this.resource[0].resource,
        }
        if (this.resource[0].zone !== undefined) {
          codeObj.metadata.zone = this.resource[0].zone
        }
        if (this.resource[0].workspace !== undefined) {
          codeObj.metadata.workspace = this.resource[0].workspace
        }
        setTimeout(function (argument) {
          this.code = `${yaml.safeDump(codeObj)}`
        }.bind(this), 500)
      }
    },
    formatResource (inData) {
      if (inData instanceof Array) {
        return inData
      }  else {
        return [inData]
      }
    },
    onCmCodeChange(newCode) {
      this.code = newCode
    },
    fetch () {
      if (this.originalResource == undefined || this.originalResource == null) {
        this.resource = [{kind: 'Workload', name: 'new', resource: {}}]
        this.onCmReady()
        return
      }
      this.code = ''
      this.$store.dispatch('describe', {
          kind: capitalizeFirstLetter(this.originalResource.kind), 
          name: this.originalResource.name, 
          group: this.originalResource.group, 
          cb: function (data) {
            this.resource = data
            this.onCmReady()
      }.bind(this)}) 
    }
  },
  mounted () {
    this.$forceUpdate()
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