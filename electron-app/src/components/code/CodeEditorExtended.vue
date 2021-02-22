<template>
  <div>
    <LeftNavigation pageNavigationName="files-explorer"/>

    <v-app-bar app flat height="37" black class="mainbackground lighten-0">
      <v-spacer />
      <v-select v-model="$store.state.ui.columns" :items="[1, 2, 3]" />
    </v-app-bar>

    <v-progress-linear
      :active="isSaving"
      :indeterminate="true"
      absolute
      top
      color="primary"
    ></v-progress-linear>
    <v-row>
      <v-col style="overflow:auto" v-for="(tab, index) in $store.state.ui.tabs.length" :key="tab" :class="'pa-0 col-' + (12 / $store.state.ui.tabs.length).toString()" >
        <v-tabs :background-color="'mainbackground lighten-'+ (index == $store.state.ui.onFocusTab ? '1' : '0')" v-model="$store.state.ui.tabs[index].openFileToShow"> 
          <v-tab :class="'mainbackground lighten-' + (index == $store.state.ui.onFocusTab ? '1' : '0')" v-for="file in tabFiles(index)" :key="file.path"> <b  @click="tabSelectFile(index, file)">{{ file.name }}</b> <v-icon small class="ml-4" @click="tabDelFile(index, file)">fas fa-times</v-icon> </v-tab>
        </v-tabs>
        <codemirror v-if="tabSelectedFile(index) !== undefined" v-model="tabSelectedFile(index).content" :options="cmOptions" @ready="onCmReady" @change="onCmCodeChange" @save="onSave" @focus="clickOnTab(index)"/>
        <codemirror v-else :options="cmOptions" @ready="onCmReady" @change="onCmCodeChange" @save="onSave" @focus="clickOnTab(index)"/>
      </v-col>
    </v-row>
  </div>
</template>
<script type="text/javascript">
import { codemirror } from 'vue-codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/python/python.js'
import 'codemirror/mode/javascript/javascript.js'
import 'codemirror/mode/css/css.js'
import 'codemirror/mode/yaml-frontmatter/yaml-frontmatter.js'
import 'codemirror/theme/base16-dark.css'
import 'codemirror/theme/base16-light.css'
import 'codemirror/theme/ayu-dark.css'
import 'codemirror/theme/ayu-mirage.css'
import 'codemirror/theme/monokai.css'
import dedent from "dedent"

import LeftNavigation from '@/components/navs/LeftNavigation'
let fse = require('../../../../lib/interfaces/fs')

export default {
  name: 'CodeEditor',
  props: ['_code', 'mode', 'path'],
  components: { codemirror, LeftNavigation },
  data: function () {
    return {
      inMemoryFiles: {},

      isSaving: false,
      code: '',
      cmOptions: {
        tabSize: 2,
        mode: 'python',
        lineNumbers: true,
        styleActiveLine: true,
        theme: this.$store.state.ui.preferences.editor.theme,
        line: true,
        extraKeys: {
          'Ctrl-S': this.onSave
        },
        extraKeys: {
          'Cmd-S': this.onSave
        },
      },        
    }
  },
  watch: {
    '$store.state.ui.columns' (to, from) {
      if (to > from) {
        this.addTab()
      } else {
        this.delTab()
      }
    },
    '$store.state.ui.fileToShow' (to, from) {
      this.openFile(to)
    }
  },
  computed: {
    codemirror() {
      return this.$refs.cmEditor.codemirror
    },
  },
  methods: {
    // Tab specific methods

    tabOpenFileToShow (tabIndex) {
      return this.$store.state.ui.tabs[tabIndex].openFileToShow
    },

    tabSelectedFile (tabIndex) {
      return this.$store.state.ui.tabs[tabIndex]._files[this.$store.state.ui.tabs[tabIndex].openFileToShow]
    },
  
    tabSelectLastFile (tabIndex) {
      this.$store.state.ui.tabs[tabIndex].openFileToShow = this.$store.state.ui.tabs[tabIndex]._files.length - 1
    },

    tabSelectFile (tabIndex, filePath) {
      this.$store.state.ui.tabs[tabIndex]._files.some((file, index) => {
        if (filePath == file.path) {
          this.$store.state.ui.tabs[tabIndex].openFileToShow = index
          return true
        }
      })    
    },
  
    tabSetFileContent (tabIndex, filePath, contentString) {
      this.$store.state.ui.tabs[tabIndex]._files.some((file, index) => {
        if (filePath == file.path) {
          this.$store.state.ui.tabs[tabIndex]._files[index].content = contentString
          return true
        }
      })   
    },
  
    tabFiles (tabIndex) {
      return this.$store.state.ui.tabs[tabIndex]._files
    },
  
    tabAddFile (tabIndex, newfile) {
      let found = false
      this.$store.state.ui.tabs[tabIndex]._files.some((file, index) => {
        if (newfile.path == file.path) {
          found = true
          return true
        }
      })   
      if (found == false) {
        this.$store.state.ui.tabs[tabIndex]._files.push(newfile)
      }
    },
  
    tabDelFile (tabIndex, oldfile) {
      let found = false
      let indexFound = 0
      this.$store.state.ui.tabs[tabIndex]._files.some((file, index) => {
        if (oldfile.path == file.path) {
          found = true
          indexFound = index
          return true
        }
      })   
      if (found == true) {
        this.$store.state.ui.tabs[tabIndex]._files.splice(indexFound, 1)
        this.tabSelectLastFile(tabIndex)
      }
    },

    // End tab specific methods

    clickOnTab (index) {
      console.log('--->', index)
      this.$store.state.ui.onFocusTab = index
    },

    addTab () {
      this.$store.state.ui.tabs.push({_files: [], openFileToShow: 0})
    },
    delTab () {
      this.$store.state.ui.tabs.splice(this.$store.state.ui.tabs.length - 1, 1)
    },
    reopenFile (fileTab, file, tabIndex) {
      this.$store.state.ui.tabs[tabIndex].selectedFile = file
      this.$store.state.ui.tabs[tabIndex].code = this.inMemoryFiles[file]
    },
    closeFile (fileTab, file, tabIndex) {
      let fileIndex = this.$store.state.ui.tabs[tabIndex].files.indexOf(file)
      this.$store.state.ui.tabs[tabIndex].files.splice(fileIndex, 1)
      if (this.$store.state.ui.tabs[tabIndex].files.length == 0) {
        this.$store.state.ui.tabs[tabIndex].code = ''
      } else {
        let lastFile = this.$store.state.ui.tabs[tabIndex].files[this.$store.state.ui.tabs[tabIndex].files.length -1]
        this.$store.state.ui.tabs[tabIndex].selectedFile = lastFile
      }
    },
    openFile (file) {
      if (this.$store.state.ui.tabs == null || this.$store.state.ui.tabs.length == 0) {
        this.addTab()
      }
      
      fse.cat(file.path, function (err, fileString) {      
        if (err || fileString == '') {
          console.log(err)
        } else {
          if (this.$store.state.ui.tabs.length == 1) {
            this.tabAddFile(this.$store.state.ui.onFocusTab, file)
            let fileCode = dedent(fileString)   
            this.tabSetFileContent(this.$store.state.ui.onFocusTab, file.path, fileCode)   
            this.tabSelectFile(this.$store.state.ui.onFocusTab, file.path)
          } else {
            //let minNumberOfFiles = Infinity
            //let tabIndex = 0
            //this.tabs.forEach((tab, index) => {
            //  if (tab._files !== undefined) {
            //    if (tab._files.length < minNumberOfFiles) {
            //      minNumberOfFiles = tab._files.length
            //      tabIndex = index
            //    }
            //  }
            //})
            this.tabAddFile(this.$store.state.ui.onFocusTab, file)
            let fileCode = dedent(fileString)   
            this.tabSetFileContent(this.$store.state.ui.onFocusTab, file.path, fileCode)   
            this.tabSelectFile(this.$store.state.ui.onFocusTab, file.path)
          }
          
          this.cmOptions.mode = this.$store.state.fileExtensions[file.file].codeMirrorMode
        }
      }.bind(this))
    },
    onCmReady(cm) {
      setTimeout(function (argument) {
        //this.code = dedent(this._code)
      }.bind(this), 200)
    },
    onCmCodeChange (newCode) {
      this.code = newCode
    },
    onSave (tabIndex) {
      
      this.isSaving = true
      let fileToSave = this.tabSelectedFile(this.$store.state.ui.onFocusTab)
      fse.write(fileToSave.path, fileToSave.content, (err, done) => {
        console.log(err, done)
        setTimeout(function () {this.isSaving = false}.bind(this), 200)
      })
    }
  },
  updated () {
    this.cmOptions.mode = this.mode || 'python'
  },
  mounted () {
    this.cmOptions.mode = this.mode || 'python'
    
    this.project = this.$store.state.projects[this.$store.state.ui.selectedProjectIdx]
    if (this.project == null || this.project == undefined) {
      this.$router.push('/projects')
      return
    }
    fse.tree(this.project.code, function (err, structure) {
      if (err) {

      } else {
        this.$store.commit('setUi', {fileExplorer: [structure]})
      }
    }.bind(this))
  }
}
</script>
<style>
.CodeMirror {
  min-height: 95vh;
  height: auto;
}
</style>