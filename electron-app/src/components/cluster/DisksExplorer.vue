<template>
  <div>
    <h1 class="pl-4 pt-2 button"> <v-icon class="primary--text">fas fa-hdd </v-icon> Disks</h1>
    <h4 class="pl-4 button info--text">Remote volumes </h4>

    <v-treeview v-if="disks.length !== 0"
      dense
      open-all
      v-model="tree"
      :items="disks"
      activatable
      item-key="name"
      open-on-click
      class="mt-6"
    > 
      <template v-slot:label="{ item, open }" >
        
          <div v-if="item.type == 'volume'" @click="selectDisk(item)">
            <p class="pa-0 ma-0">{{item.name}}</p>
          </div>
          <div v-if="item.type == 'storage'">
            <p class="pa-0 ma-0">Storage <b>{{item.name}}</b></p>
          </div>
        
      </template>
      <template v-slot:prepend="{ item, open }" >
        <v-icon v-if="item.type == 'storage'">
          {{ open ? 'fas fa-server primary--text' : 'fas fa-server' }}
        </v-icon>
        <v-icon v-if="item.type == 'volume' && (item.data.policy != undefined && item.data.policy == 'readonly' )" @click="selectDisk(item)">
          {{ open ? 'fas fa-hdd info--text' : 'fas fa-hdd info--text' }}
        </v-icon>
        <v-icon v-if="item.type == 'volume' && (item.data.policy == undefined)" @click="selectDisk(item)">
          {{ open ? 'fas fa-hdd primary--text' : 'fas fa-hdd' }}
        </v-icon>
      </template>
    </v-treeview>
  </div>
</template>
<script>

import randomstring from 'randomstring'

export default {
  	name: 'DisksExplorer',
  	data: function () {
  		return {
        fetchInterval: undefined,
        tree: [],
        disks: [],
        selectedNode: null
  		} 
  	},
  	methods: {
      selectDisk (item) {
        this.$store.commit('setDiskToShow', item)
        this.$store.commit('setDiskToShowClick', randomstring.generate(4))
      },
      mapDisks (data) {
        let disks = {}
        data.forEach((volume) => {
          if (disks[volume.storage] == undefined) {
            disks[volume.storage] = {name: volume.storage, type: 'storage', children: []}
          }
          disks[volume.storage].children.push({name: volume.name, type: 'volume', data: volume})  
        })
        this.disks = Object.values(disks)
      },
      fetch () {
        this.$store.state.interface.cli.api.get.one('Volume', {group: '-'}, function (err, data) {
          if (err) {
            
          } else {
            this.mapDisks(data)  
          }
        }.bind(this))
      }
  	},
    mounted () {
      this.fetch()
    }
}
</script>
