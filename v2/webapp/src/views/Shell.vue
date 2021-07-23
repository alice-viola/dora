<template>
    <div class="resource black" style="min-height: 100vh">
        <v-card class="elevation-12 black">
            <v-card-title> <b class="white--text">Workload/</b><b class="primary--text">{{itemInternal.name}}</b></v-card-title>
            <v-card-text>
                {{dbg}}
                <div id="terminal-container" style="margin-top: 25px"></div>
            </v-card-text>
        </v-card>
    </div>
</template>

<script>
// @ is an alias to /src
import axios from 'axios'

function webSocketForApiServer (apiServer) {
    if (process.env.NODE_ENV == 'production') {
        return 'wss://' + window.location.hostname
    } else {
        if (apiServer.split('http://').length === 2) {
            return 'ws://' + apiServer.split('http://')[1]
        } else if (apiServer.split('https://').length === 2) {
            return 'wss://' + apiServer.split('https://')[1]
        }        
        
    }
}

import { Terminal } from 'xterm'
import { AttachAddon } from 'xterm-addon-attach'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
let querystring = require('querystring')
let DockerClient = require('@/js/web-socket-docker-client')
import '../../node_modules/xterm/css/xterm.css'

export default {
    name: 'Shell',
    props: ['item', 'shellKind'],
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
            dbg: '',
            defaultShellKind: '/bin/bash'
        }
    },
    methods: {
        connect (item, apiServer, _shellKind) {
            
            let selectedGroup = this.$store.state.selectedWorkspace
            let zone = this.$store.state.selectedZone
            async function connectTo (containerId, nodeName, authToken) {
                let shellKind = '/bin/bash'
                if (item.meta !== undefined && item.meta.shell !== undefined) {
                    shellKind = item.meta.shell
                }
                var client = new DockerClient({
                    url: webSocketForApiServer(apiServer) + '/pwm/cshell',
                    tty: true,
                    command: _shellKind,
                    container: containerId,
                    containername: item.name,
                    group: selectedGroup,
                    zone: zone,
                    node: nodeName,
                    token: authToken
                })
                return await client.execute().then(() => {
                    let terminalContainer = document.getElementById('terminal-container')
                    let term = new Terminal({cursorBlink: true, screenKeys: true, useStyle: true, rows: 34})
                    const fitAddon = new FitAddon()
                    term.loadAddon(fitAddon)
                    term.focus()
                    fitAddon.fit()
                    term.onData(function(data) {
                        client.stdin.write(data)
                    })
                    term.open(terminalContainer, true)
                    client.stdout.on('data', function (data) {
                        term.write(String.fromCharCode.apply(null, data))
                    })
                    client.stderr.on('data', function (data) {
                        term.write(String.fromCharCode.apply(null, data))
                    })
                    client.on('exit', function (code) {
                        term.writeln('\r\nProcess exited with code ' + code + '\r\n')
                    })
                })
            }
            this.$store.dispatch('shell', {containername: this.itemInternal.name,  cb: function (err, data) {
                if (data) {
                    try {
                        console.log(item)
                        this.terminalDialog = true
                        connectTo(data.c_id, item.node, data.data).bind(this)   
                    } catch (err) {}
                }
            }.bind(this)})
        }
    },
    mounted () {
        
        if (this.item == undefined) {
            this.$store.commit('newWindowShell')
            this.itemInternal = JSON.parse(this.$route.query.item)
            this.$store.commit('selectedWorkspace', this.$route.query.workspace)
            this.$store.commit('selectedZone', this.$route.query.zone)
            this.$store.commit('setApiServer', this.$route.query.apiServer)
            let _sk = this.$route.query.shellKind
            let sk = (_sk == null || _sk == undefined) ? this.defaultShellKind : _sk
            this.connect(JSON.parse(this.$route.query.item), this.$store.state.apiServer, sk)
        } else{
            this.itemInternal = this.item
            let sk = (this.shellKind == null || this.shellKind == undefined) ? this.defaultShellKind : this.shellKind
            this.connect(this.item, this.$store.state.apiServer, sk)
        }
    }
}
</script>
