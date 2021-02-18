<template>
    
        <div :id="randomTerminalId" style="min-height: 95vh"></div>
    
</template>

<script>
// @ is an alias to /src
import axios from 'axios'

function webSocketForApiServer (apiServer) {
    if (apiServer.includes('http://')) {
        return 'ws://' + apiServer.split('http://')[1]
    } else {
        return 'wss://' + apiServer.split('https://')[1]
    }
}

import { Terminal } from 'xterm'
import { AttachAddon } from 'xterm-addon-attach'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
let querystring = require('querystring')
let randomstring = require('randomstring')
let DockerClient = require('../../../lib/interfaces/web-socket-docker-client')
import '../../node_modules/xterm/css/xterm.css'

export default {
    name: 'Shell',
    props: ['item'],
    watch: {
        $route(to, from) { 
            if (to !== from) { 
                this.resourceKind = this.$route.params.name
                this.fetch() 
            } 
        }
    },
    data: function () {
        return {
            itemInternal: {},
            terminalDialog: false,
            deleteItemDialog: false,
            fetchInterval: undefined,
            search: '',
            resourceKind: this.$route.params.name,
            resource: {},
            headers: [],
            fitAddon: null
        }
    },
    methods: {
        resizeHandler () {
            this.fitAddon.fit()
        },
        connect (item, apiServer) {
            async function connectTo (containerId, nodeName, authToken, randomTerminalId, fitAddon) {
                var client = new DockerClient({
                    url: webSocketForApiServer(apiServer) + '/pwm/cshell',
                    tty: true,
                    command: '/bin/bash',
                    container: containerId,
                    containername: item.metadata.name,
                    group: '-',
                    node: nodeName,
                    token: authToken
                })
                return await client.execute().then(function () {
                    console.log(this)
                    let terminalContainer = document.getElementById(randomTerminalId)
                    let term = new Terminal({cursorBlink: true, screenKeys: true, useStyle: true})
                    
                    term.loadAddon(fitAddon)
                    term.focus()
                    term.open(terminalContainer, true)
                    fitAddon.fit()
                    term.onData(function(data) {
                        client.stdin.write(data)
                    })
                    
                    client.stdout.on('data', function (data) {
                        term.write(String.fromCharCode.apply(null, data))
                    })
                    client.stderr.on('data', function (data) {
                        term.write(String.fromCharCode.apply(null, data))
                    })
                    client.on('exit', function (code) {
                        term.writeln('\r\nProcess exited with code ' + code + '\r\n')
                    })
                }.bind(this))
            }
            this.$store.state.interface.cli.api.shell.token(function (err, data) {
                if (err == null && data !== null) {
                    try {
                        connectTo(item.scheduler.container.id, item.scheduler.node, data, this.randomTerminalId, this.fitAddon).bind(this)   
                    } catch (err) {}
                }
            }.bind(this))
        }
    },
    created () {
        window.addEventListener("resize", this.resizeHandler)
    },
    mounted () {
        this.fitAddon = new FitAddon()
        this.itemInternal = this.item
        this.connect(this.item, this.$store.state.userCfg.cfg.api[this.$store.state.userCfg.cfg.profile].server[0])
    },
    beforeMount () {
        this.randomTerminalId = randomstring.generate()
    },
    destroyed () {
        window.removeEventListener("resize", this.resizeHandler)
    }
}
</script>
