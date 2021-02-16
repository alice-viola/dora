<template>
  <div>
    <v-treeview
      dense
      open-all
      v-model="tree"
      :items="$store.state.ui.fileExplorer"
      activatable
      item-key="name"
      open-on-click
    >
      <template v-slot:prepend="{ item, open }">
        <v-icon v-if="!item.file">
          {{ open ? 'fa-folder-open' : 'fa-folder primary--text' }}
        </v-icon>
        <v-icon v-else @click="openFile(item)">
          {{ $store.state.fileExtensions[item.file.toLowerCase()].icon }}
        </v-icon>
      </template>
      <template v-slot:append="{ item, open }">
      </template>
    </v-treeview>
  </div>
</template>

<script>

export default {
  	name: 'FilesExplorer',
  	components: {
  	  
  	},
  	data: () => {
  		return {
        tree: []
  		} 
  	},
  	methods: {
      openFile (item) {
        this.$store.commit('setUi', {fileToShow: item})
      }
  	}
}
</script>
