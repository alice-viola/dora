<template>
  <div>
    <h1 class="pl-4 pt-2 button"> <v-icon class="primary--text">fas fa-hdd </v-icon> Disks</h1>
    <h4 class="pl-4 button info--text">Remote volumes </h4>

    <v-switch class="pa-3 mt-6" label="Show readonly disks" v-model="$store.state.ui.showReadonlyVolumes"></v-switch>
    <v-treeview v-if="disks.length !== 0"
      dense
      open-all
      v-model="tree"
      :items="disks"
      activatable
      item-key="name"
      open-on-click
      
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
        fetchedDisks: [],
        disks: [],
        selectedNode: null,
        firstDisk: null
  		} 
  	},
    watch: {
      '$store.state.ui.showReadonlyVolumes' (to, from) {
        this.mapDisks()
      }
    },
  	methods: {
      selectDisk (item) {
        this.$store.commit('setDiskToShow', item)
        this.$store.commit('setDiskToShowClick', randomstring.generate(4))
      },
      mapDisks (cb) {
        let data = this.fetchedDisks
        let disks = {}
        data.forEach((volume) => {
          if (this.$store.state.ui.showReadonlyVolumes == 1) {
            if (disks[volume.storage] == undefined) {
              disks[volume.storage] = {name: volume.storage, type: 'storage', children: []}
            }
            disks[volume.storage].children.push({name: volume.name, type: 'volume', data: volume})    
            if (this.firstDisk == null) {
              this.firstDisk = {name: volume.name, type: 'volume', data: volume}
            }
          } else {
            if (volume.policy == undefined || volume.policy != 'readonly') {
              if (disks[volume.storage] == undefined) {
                disks[volume.storage] = {name: volume.storage, type: 'storage', children: []}
              }
              disks[volume.storage].children.push({name: volume.name, type: 'volume', data: volume})   
              if (this.firstDisk == null) {
                this.firstDisk = {name: volume.name, type: 'volume', data: volume}
              }
            }
          }
          
        })
        this.disks = Object.values(disks)
        if (cb !== undefined) {
          cb()
        }
      },
      fetch (cb) {
        this.$store.state.interface.cli.api.get.one('Volume', {group: '-'}, function (err, data) {
          if (err) {
            
          } else {
            this.fetchedDisks = data
            this.mapDisks(cb)  
          }
        }.bind(this))
      }
  	},
    mounted () {
      this.fetch((function () {
        this.selectDisk(this.firstDisk)
      }).bind(this))

    }
}
</script>
