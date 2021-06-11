<template>
  <v-container class="mainbackground" fluid id="LoginPage">
    <div id="terminal-container" style="heigth: 90vh; width: 100%"></div>
  </v-container>
</template>
<script>
// @ is an alias to /src
import { Terminal } from 'xterm';
import { AttachAddon } from 'xterm-addon-attach'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import '../../node_modules/xterm/css/xterm.css'


export default {
  name: 'Cli',
  components: {Terminal},
  data: function () {
    return { 
      token: null
    }
  },
  methods: {
    login () {
      
    }
  },
  mounted () {
    let terminalContainer = document.getElementById('terminal-container')
    let term = new Terminal({cursorBlink: true, screenKeys: true, useStyle: true, rows: 34})
    //term.open(document.getElementById('terminal'));
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.focus()
    fitAddon.fit()
    term.open(terminalContainer, true)
    var currentLine = ''
    term.onData((data, key) => {
      console.log(data, data.charCodeAt(0))
      switch (data.charCodeAt(0)) {
        case 13:
          console.log('Ex')
          break;
        case 127:
          console.log(currentLine[currentLine.length -1])
          if (currentLine[currentLine.length -1] !== '$') {
            currentLine -= data
            term.write('\b \b')  
          }
          break;
        default:
          currentLine += data
          term.write(data)
      }
      //if (key.charCodeAt(0) == 13)
      //    term.write('\n');
      //term.write(key);
      
    })
    term.write('\x1B[1;3;31mdoracli\x1B[0m$ ')
  }
}
</script>
<style>
#LoginPage {
  /*background: url(../assets/firmware.svg) no-repeat center center fixed;*/
  -webkit-background-size: cover;
  -moz-background-size: cover;
  -o-background-size: cover;
  background-size: cover;
}
</style>
