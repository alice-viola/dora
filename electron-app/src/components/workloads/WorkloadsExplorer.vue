<template>
  <div class="mainbackground">
    <h1 class="pl-4 pt-2 button"> Workloads</h1>
    <h4 class="pl-4 button info--text">All projects </h4>

    <!--<h1 class="pa-4 button"><v-icon class="mr-4">fab fa-docker</v-icon> Workloads </h1>-->
    <div class="pa-0" v-if="$route.name != 'Project'">
      <v-btn text color="primary"  class="ma-0" @click="createWorkloadDialog = true" > New Workload  <v-icon small class="ml-2"> fab fa-docker</v-icon> </v-btn>
    </div>
    <v-treeview v-if="workloads.length !== 0"
      dense
      open-all
      v-model="tree"
      :items="workloads"
      activatable
      item-key="name"
      open-on-click
      class="mt-6"
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
    <v-dialog width="500" v-model="createWorkloadDialog">
      <WorkloadCreateForm v-if="createWorkloadDialog == true"/>
    </v-dialog>
  </div>
</template>
<script>

import WorkloadCreateForm from '@/components/workloads/WorkloadCreateForm'
let events = require('../../../../lib/events/global')
let randomstring = require('randomstring')

export default {
  	name: 'WorkloadsExplorer',
    props: ['header'],
  	components: {
  	  WorkloadCreateForm
  	},
  	data: () => {
  		return {
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
