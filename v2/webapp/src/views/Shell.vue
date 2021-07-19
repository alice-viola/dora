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
        return 'ws://' + apiServer.split('http://')[1]
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
            dbg: ''
        }
    },
    methods: {
        connect (item, apiServer) {
            let selectedGroup = this.$store.state.user.selectedGroup
            async function connectTo (containerId, nodeName, authToken) {
                let shellKind = '/bin/bash'
                if (item.meta !== undefined && item.meta.shell !== undefined) {
                    shellKind = item.meta.shell
                }
                var client = new DockerClient({
                    url: webSocketForApiServer(apiServer) + '/pwm/cshell',
                    tty: true,
                    command: '/bin/bash',
                    container: containerId,
                    containername: item.name,
                    group: selectedGroup,
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
                        //this.dbg = [item.c_id, item.node, data]
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
            this.connect(JSON.parse(this.$route.query.item), this.$store.state.apiServer)
        } else{
            this.itemInternal = this.item
            this.connect(this.item, this.$store.state.apiServer)
        }
    }
}
</script>
