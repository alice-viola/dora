<template>
  <div>
    <v-progress-linear
      :active="isSaving"
      :indeterminate="true"
      absolute
      top
      color="primary"
      ></v-progress-linear>

    <codemirror v-model="code" :options="cmOptions" @ready="onCmReady" @change="onCmCodeChange" @save="onSave"/>
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

let fse = require('../../../lib/interfaces/fs')

export default {
  name: 'CodeEditor',
  props: ['_code', 'mode', 'path'],
  components: { codemirror },
  data: function () {
    return {
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
  computed: {
    codemirror() {
      return this.$refs.cmEditor.codemirror
    },
  },
  methods: {
    onCmReady(cm) {
      setTimeout(function (argument) {
        this.code = dedent(this._code)
      }.bind(this), 200)
    },
    onCmCodeChange (newCode) {
      this.code = newCode
    },
    onSave () {
      this.isSaving = true
      fse.write(this.path, this.code, (err, done) => {
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
  },
  beforeMount () {
    
  }
}
</script>
<style>
.CodeMirror {
  min-height: 95vh;
  height: auto;
}
</style>