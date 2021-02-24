<template>
  <div>
    <h1 class="pl-4 pt-2 button"> {{$store.state.projects[$store.state.ui.selectedProjectIdx].name}}</h1>
    <h4 class="pl-4 button info--text" v-if="$store.state.ui.projectView == 'project-settings'">Settings </h4>
    <h4 class="pl-4 button info--text" v-if="$store.state.ui.projectView == 'project-workloads'">Workloads </h4>
    <h4 class="pl-4 button info--text" v-if="$store.state.ui.projectView == 'project-code'">Code </h4>

    <v-row class="navigationDrawer lighten-0 pa-2 pt-6 pl-0">
       <!-- Settings -->
       <v-avatar class="d-block text-center mx-auto" size="36" @click="$store.state.ui.projectView = 'project-settings'">
         <v-icon color="primary" v-if="$store.state.ui.projectView == 'project-settings'">fas fa-sliders-h</v-icon>
         <v-icon color="grey" v-else>fas fa-sliders-h</v-icon>
       </v-avatar>

       <!-- Workloads -->
       <v-avatar class="d-block text-center mx-auto" size="36" @click="$store.state.ui.projectView = 'project-workloads'">
         <v-icon color="primary" v-if="$store.state.ui.projectView == 'project-workloads'">fab fa-docker</v-icon>
         <v-icon color="grey" v-else>fab fa-docker</v-icon>
       </v-avatar>

       <v-avatar class="d-block text-center mx-auto" size="36" @click="$store.state.ui.projectView = 'project-code'" v-if="$store.state.projects[$store.state.ui.selectedProjectIdx].code !== ''">
         <v-icon color="primary" v-if="$store.state.ui.projectView == 'project-code'">fas fa-code</v-icon>
         <v-icon color="grey" v-else>fas fa-code</v-icon>
       </v-avatar>
    </v-row>

    <div class="mt-6">
      <!-- Settings Nav -->
      <v-list dense nav dense v-if="$store.state.ui.projectView == 'project-settings'">
        <v-list-item link v-on:click="setSettingToShow(p.id)" v-for="(p, idx) in $store.state.ui.projectSettings" :key="idx">
          <v-tooltip right>
            <template v-slot:activator="{ active, on, attrs }">
              <v-list-item-icon>
                <v-icon color="primary" v-if="$store.state.ui.projectSettingView == p.id">{{p.icon}}</v-icon>
                <v-icon color="grey" v-else>{{p.icon}}</v-icon>
              </v-list-item-icon>
              <v-list-item-content v-on:click="setSettingToShow(idx)">
                <v-list-item-title>{{p.name}}</v-list-item-title>
                <v-list-item-subtitle>{{p.desc}}</v-list-item-subtitle>
              </v-list-item-content>
            </template>
            <span>{{p.name}}</span>
          </v-tooltip>
        </v-list-item>
      </v-list>

      <!-- Code Nav -->
      <v-treeview
        dense
        v-model="treeCode"
        :items="$store.state.ui.fileExplorer"
        activatable
        item-key="name"
        open-on-click
        v-if="$store.state.ui.projectView == 'project-code'"
      >
        <template v-slot:label="{ item, open }" >
          <div @click="openFile(item)">{{item.name}}</div>
        </template>
        <template v-slot:prepend="{ item, open }" >
          <v-icon v-if="!item.file">
            {{ open ? 'fa-folder-open primary--text' : 'fa-folder' }}
          </v-icon>
          <v-icon v-else @click="openFile(item)">
            {{ $store.state.fileExtensions[item.file.toLowerCase()].icon }}
          </v-icon>
        </template>
        <template v-slot:append="{ item, open }">
        </template>
      </v-treeview>

      <!-- Workloads Nav -->
      <v-treeview
        dense
        open-all
        v-model="treeWorkloads"
        :items="workloads"
        activatable
        item-key="name"
        open-on-click
        class="mt-6"
        v-if="$store.state.ui.projectView == 'project-workloads'"
      > 
        <template v-slot:label="{ item, open }" >
          <div v-if="item.type == 'workload'" @click="selectWorkload(item)">
            <p class="pa-0 ma-0">{{item.name}}</p><p class="overline ma-0">{{item.data.status}}</p>
          </div>
          <div v-else>{{item.name}}</div>
        </template>
        <template v-slot:prepend="{ item, open }" >
          <v-icon v-if="item.type == 'zone'">
            {{ open ? 'fa-folder-open primary--text' : 'fa-folder' }}
          </v-icon>
          <v-icon v-if="item.type == 'node'">
            {{ open ? 'fas fa-server primary--text' : 'fas fa-server' }}
          </v-icon>
          <v-icon v-if="item.type == 'workload'" @click="selectWorkload(item)">
            fab fa-docker
          </v-icon>
        </template>
      </v-treeview>
    </div>
  </div>
</template>
<script>

let events = require('../../../../lib/events/global')
let randomstring = require('randomstring')

export default {
  	name: 'WorkloadsExplorer',
    props: ['header'],
  	components: {
  	  
  	},
  	data: () => {
  		return {
        treeCode: [],
        treeWorkloads: [],
        createWorkloadDialog: false,
        fetchInterval: undefined,
        tree: [],
        workloads: [],
        events: events,
        firstWorkload: undefined
  		} 
  	},
  	methods: {
      selectWorkload (item) {
        this.$store.commit('setWorkloadToShow', item.name)
        this.$store.commit('setWorkloadToShowClick', randomstring.generate())
      },
      mapWorkloads (data) {
        let workloads = {}
        data.forEach(function (workload) {
          if (workloads[workload.node] !== undefined) {
            if (this.firstWorkload == undefined) {
              this.firstWorkload = workload
            }
            workloads[workload.node].children.push({name: workload.name, type: 'workload', data: workload})
          } else {
            if (this.firstWorkload == undefined) {
              this.firstWorkload = workload
            }
            workloads[workload.node] = {name: workload.node, type: 'node', children: []}
            workloads[workload.node].children.push({name: workload.name, type: 'workload', data: workload})
          }
        }.bind(this))
        this.workloads = Object.values(workloads)
        if (this.firstWorkload !== 'done') {
          this.selectWorkload(this.firstWorkload)
          this.firstWorkload = 'done'
        }
      },
      fetch () {
        this.$store.state.interface.cli.api.get.one('Workload', {group: '-'}, function (err, data) {
          if (err) {
            
          } else {
            if (this.$route.name == 'Project') {
              let filteredData = data.filter(function (w) {
                return w.name.includes(this.$store.state.projects[this.$store.state.ui.selectedProjectIdx].id)
              }.bind(this))
              this.mapWorkloads(filteredData)   
            } else {
              this.mapWorkloads(data)     
            }
            this.$store.commit('workloads', data)   
          }
        }.bind(this))
      },
      setSettingToShow (idx) {
        this.$store.state.ui.projectSettingView = idx
      },
      openFile (item) {
        this.$store.commit('setUi', {fileToShow: item})
      }
  	},
    mounted () {
      this.fetch()
      this.fetchInterval = setInterval(function () {
        this.fetch()
      }.bind(this), 2000)
    },
    beforeDestroy () {
      if (this.fetchInterval !== undefined) {
        clearInterval(this.fetchInterval)
      }
    }
}
</script>
