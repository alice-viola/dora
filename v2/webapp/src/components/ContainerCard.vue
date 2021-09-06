<template>
  <v-card
    class="mx-auto elevation-2"
    :style="'cursor: pointer; border-left: 2px solid ' + color"
   >
    <v-card-title>
      <span class="caption">{{container.name}}</span>
    </v-card-title>
    <v-card-subtitle class="pb-0 mb-0" v-if="container.node !== undefined && container.node !== null && container.node !== ''">
        <v-icon small class="mr-1" v-if="container.node !== undefined && container.node !== null && container.node !== ''">
          fa-server
        </v-icon>
        <span class="subheading ml-2"  v-if="container.node !== undefined && container.node !== null && container.node !== ''">{{container.node}}</span>
    </v-card-subtitle>
    <v-card-text v-if="container.status != 'running'">
      <b style="text-transform: uppercase">{{container.status}}</b>
    </v-card-text>
    <v-card-text v-if="container.reason !== null" class="pt-0 mt-0 pb-0">
      {{container.reason}}
    </v-card-text>
    <v-card-actions class="pt-2 mt-3 mainbackground lighten-1">
      <v-row align="center" justify="end">
        <v-icon small class="mr-1 ml-5">
          fas fa-clock
        </v-icon>
        <span class="subheading mr-2">{{container.eta}}</span>
        <v-spacer />
        <v-icon class="mr-6 info--text" small  @click="copyShellCommand()">
            fa-copy
        </v-icon>
        <v-icon class="mr-6 info--text" small  @click="deleteContainer()">
            mdi-restart
        </v-icon>
        <v-icon class="mr-6 info--text" small  @click="stopContainer()">
            mdi-delete
        </v-icon>        
        <v-menu offset-y v-if="container.status == 'running'">
          <template v-slot:activator="{ on, attrs }">      
            <v-btn v-bind="attrs" v-on="on" icon class="mr-4">
              <v-icon class="blue--text" small>
                  fas fa-terminal
              </v-icon>  
            </v-btn>
          </template>    
          <v-list>
            <v-list-item
              v-for="(item, index) in ['/bin/bash', '/bin/sh', '/bin/zsh']"
              :key="index"
              @click="connect(item)"
            >
              <v-list-item-title>{{ item }}</v-list-item-title>
            </v-list-item>
          </v-list>   
        </v-menu>       
      </v-row>
    </v-card-actions>
    <v-dialog v-model="copiedDialog" width="300px">
        <v-card class="elevation-12" style="text-align: center" @click="copiedDialog = false">
            <v-card-title class="overline"> Shell command copied! </v-card-title>
        </v-card>
    </v-dialog>

  </v-card>
</template>
<script>
export default {
  name: 'ContainerCard',
  props: ['container', 'color'],
  components: {
      
  },
  data: function () {
    return {
      copiedDialog: false
    }
  },
  methods: {
    copyShellCommand () {
      let name = this.container.name
      let workspace = this.container.workspace
      let zone = this.container.zone
      let cmd = `dora shell c ${name} -g ${workspace} -z ${zone}`
      navigator.clipboard.writeText(cmd)
      this.copiedDialog = true
    },
    connect (shellKind) {
      this.container.kind = 'Container'
      console.log(this.container)
      let routeData = this.$router.resolve({name: 'Shell', path: '/shell/' + this.container.name , query: {item: JSON.stringify(this.container), shellKind: shellKind, workspace: this.$store.state.selectedWorkspace, zone: this.$store.state.selectedZone, apiServer: this.$store.state.apiServer }})
      window.open(location.origin + '/shell/' +  this.container.name + routeData.href, this.container.name, "height=600,width=1024,toolbar=no,menubar=no,resizable=yes")
    },
    deleteContainer () {
      this.$store.dispatch('delete', {
        kind: 'Container',
        name: this.container.name,
        workspace: this.container.workspace,
      })
    },
    stopContainer () {
      // TODO: Do in a single action
      this.$store.dispatch('delete', {
        kind: 'Container',
        name: this.container.name,
        workspace: this.container.workspace,
      })
      let splitted = this.container.name.split('.')
      splitted.pop()
      let wkName = splitted.join('.')
      this.$store.dispatch('describe', {name: wkName, workspace: this.container.workspace, kind: 'Workload', cb: function (data) {
        if (data.length == 1) {
          let newWk = {}
          newWk.kind = 'Workload'
          newWk.metadata = {name: wkName, workspace: this.container.workspace}
          newWk.spec = data[0].resource  
          if (parseInt(newWk.spec.replica.count) > 0) {
            newWk.spec.replica.count = parseInt(newWk.spec.replica.count) - 1 
            this.$store.dispatch('apply', newWk)
          }
        }
      }.bind(this)})         
    }    
  }
}
</script>