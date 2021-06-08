<template>
  <div>
    <v-row class="navigationDrawer lighten-0 pa-2">

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
    <h1 class="pa-4 button">Editor </h1>
    <v-treeview
      dense
      
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
        alert(e)
      },
      openFile (item) {
        this.$store.commit('setUi', {fileToShow: item})
      }
  	}
}
</script>
