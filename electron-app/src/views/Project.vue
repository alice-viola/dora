<template>
  
    <!-- Project-->
    <div>
    <v-container fluid> 
      <v-app-bar
        app
        flat
        height="32"
        
      >
          <v-tabs
            v-model="tab"
            dense
            background-color="mainbackground lighten-2"
          >
            <v-tab v-for="n in Object.values(files)" :key="n.file.path" @click="openFile(n.file)"> 
              {{n.file.name}}
            </v-tab>
          </v-tabs>
        </v-app-bar>

    	<v-row class="pa-0">
        <!-- Code mirror -->
    		<v-col class="col-12 pa-0" v-if="fileCode !== null">
          <CodeEditor :_code="fileCode" :mode="fileMode" :path="fileSelected" />
    		</v-col>
    	</v-row>
    </v-container>
    </div>
  
</template>

<script>

import CodeEditor from '@/components/CodeEditor.vue'
let fse = require('../../../lib/interfaces/fs')


export default {
  name: 'Project',
  props: ['project'],
  components: {
    CodeEditor
  },
  data: () => {
  	return {
      tree: [],
      fileCode: '',
      files: {},
      fileSelected: '',
      tab: null,
      fileMode: 'python'
  	}
  },
  watch: {
    '$store.state.ui.fileToShow' (to, from) {
      console.log(to)
      this.openFile(to)
    }
  },
  methods: {
    openFile (file) {
      this.fileCode = null
      //this.files[file.path] = {}
      fse.cat(file.path, function (err, fileString) {
        this.fileSelected = file.path
        this.fileCode = fileString
        this.files[file.path] = {file: file, content: fileString}
        this.fileMode = this.$store.state.fileExtensions[file.file].codeMirrorMode
        
          this.tab = Object.keys(this.files).indexOf(file.path)
        
      }.bind(this))
    }
  },
  updated () {
    this.$store.commit('setUi', {leftDrawerComponent: 'files-explorer'})
  },
  beforeMount () {
  	if (this.project == null || this.project == undefined) {
      this.$router.push('projects')
      return
    }
    this.$store.commit('setUi', {leftDrawerComponent: 'files-explorer'})
    fse.tree(this.project.code, function (err, structure) {
      if (err) {

      } else {
        this.$store.commit('setUi', {fileExplorer: [structure]})
      }
    }.bind(this))
  }
}
</script>
