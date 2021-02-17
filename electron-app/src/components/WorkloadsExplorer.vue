<template>
  <div>
    <v-btn text color="primary--text" @click="$store.commit('projectView', 'projects-list')"> <v-icon left> fas fa-long-arrow-alt-left </v-icon> Projects </v-btn>
    <v-divider />
    <v-treeview
      dense
      open-all
      v-model="tree"
      :items="workloads"
      activatable
      item-key="name"
      open-on-click
    > 
      <template v-slot:label="{ item, open }" >
        <div @click="selectWorkload(item)">{{item.name}}</div>
      </template>
      <template v-slot:prepend="{ item, open }" >
        <v-icon v-if="item.type == 'zone'">
          {{ open ? 'fa-folder-open primary--text' : 'fa-folder' }}
        </v-icon>
        <v-icon v-if="item.type == 'node'">
          {{ open ? 'fas fa-server primary--text' : 'fas fa-server' }}
        </v-icon>
        <v-icon v-if="item.type == 'workload'" @click="selectWorkload(item)">
          {{ item.data.status == events.WORKLOAD.RUNNING ? 'fas fa-box green--text' : 'fas fa-box yellow--text' }}
        </v-icon>

      </template>
    </v-treeview>
  </div>
</template>
<script>

let events = require('../../../lib/events/global')

export default {
  	name: 'WorkloadsExplorer',
    props: ['header'],
  	components: {
  	  
  	},
  	data: () => {
  		return {
        fetchInterval: undefined,
        tree: [],
        workloads: [],
        events: events
  		} 
  	},
  	methods: {
      selectWorkload (item) {
        this.$store.commit('setWorkloadToShow', item.name)
      },
      mapWorkloads (data) {
        let workloads = {}
        data.forEach(function (workload) {
          if (workloads[workload.node] !== undefined) {
            workloads[workload.node].children.push({name: workload.name, type: 'workload', data: workload})
          } else {
            workloads[workload.node] = {name: workload.node, type: 'node', children: []}
            workloads[workload.node].children.push({name: workload.name, type: 'workload', data: workload})
          }
        }.bind(this))
        this.workloads = Object.values(workloads)
      },
      fetch () {
        this.$store.state.interface.cli.api.get.one('Workload', {}, (err, data) => {
          if (err) {
            
          } else {
            this.mapWorkloads(data)      
          }
        })
      }
  	},
    mounted () {
      this.fetch()
      this.fetchInterval = setInterval(function () {
        this.fetch()
      }.bind(this), 10000)
    },
    beforeDestroy () {
      if (this.fetchInterval !== undefined) {
        clearInterval(this.fetchInterval)
      }
    }
}
</script>
