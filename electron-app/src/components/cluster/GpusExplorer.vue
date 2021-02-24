<template>
  <div>
    <h1 class="pl-4 pt-2 button"> GPUs</h1>
    <h4 class="pl-4 button info--text">Cluster resources </h4>

    <v-treeview v-if="gpus.length !== 0"
      dense
      open-all
      v-model="tree"
      :items="gpus"
      activatable
      item-key="name"
      open-on-click
      class="mt-6"
    > 
      <template v-slot:label="{ item, open }" >
        
          <div v-if="item.type == 'gpu'" @click="selectGpu(item)">
            <p class="pa-0 ma-0">{{item.name}}</p>
          </div>
          <div v-if="item.type == 'gpu-kind'" @click="selectGpuNode(item)">
            <p class="pa-0 ma-0">{{item.name}}</p>
          </div>
        
      </template>
      <template v-slot:prepend="{ item, open }" >
        <v-icon v-if="item.type == 'gpu-kind'">
          {{ open ? 'fas fa-brain primary--text' : 'fas fa-brain' }}
        </v-icon>
        <v-icon v-if="item.type == 'gpu'">
          {{ open ? 'fas fa-server primary--text' : 'fas fa-server' }}
        </v-icon>
      </template>
    </v-treeview>
  </div>
</template>
<script>

import randomstring from 'randomstring'

export default {
  	name: 'GpusExplorer',
  	data: function () {
  		return {
        fetchInterval: undefined,
        tree: [],
        gpus: [],
        selectedNode: null
  		} 
  	},
  	methods: {
      selectGpu (item) {
        this.$store.commit('setGpuNodeToShow', item.name)
        this.$store.commit('setGpuNodeToShowClick', randomstring.generate(4))
      },
      mapGpus (data) {
        let firstNode = null
        let gpus = {}
        data.forEach(function (gpu) {
          if (gpus[gpu.product_name] == undefined) {
            gpus[gpu.product_name] = {name: gpu.product_name, type: 'gpu-kind', children: []}
          }
          let hasNode = false
          gpus[gpu.product_name].children.forEach((ch) => {
            if (ch.name == gpu.node) {
              hasNode = true
            }
          })
          if (hasNode == false) {
            if (firstNode == null) {
              firstNode = gpu.node
            }
            gpus[gpu.product_name].children.push({name: gpu.node, type: 'gpu', data: gpu})  
          }
          
        })
        this.gpus = Object.values(gpus)
        this.$store.commit('setGpuNodeToShowClick', randomstring.generate(4))
        if (this.selectedNode == null) {
          this.selectedNode = firstNode
          this.$store.commit('setGpuNodeToShow', firstNode)
        }
      },
      fetch () {
        this.$store.state.interface.cli.api.get.one('GPU', {group: '-'}, function (err, data) {
          if (err) {
            
          } else {
            this.mapGpus(data)  
          }
        }.bind(this))
      }
  	},
    mounted () {
      this.fetch()
      this.fetchInterval = setInterval(function () {
        this.fetch()
      }.bind(this), 20000)
    },
    beforeDestroy () {
      if (this.fetchInterval !== undefined) {
        clearInterval(this.fetchInterval)
      }
    }
}
</script>
