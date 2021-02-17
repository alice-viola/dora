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
      @click="handler"
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
  </div>
</template>

<script>

export default {
  	name: 'FilesExplorer',
    props: ['header'],
  	components: {
  	  
  	},
  	data: () => {
  		return {
        tree: []
  		} 
  	},
  	methods: {
      handler (e) {
        console.log(e)
      },
      openFile (item) {
        this.$store.commit('setUi', {fileToShow: item})
      }
  	}
}
</script>
