<template>
  <v-card class="mainbackground lighten-0 elevation-0">
    <h1 class="pl-4 pt-2 button"> Projects </h1>
    <h4 class="pl-4 button info--text">Open and create projects</h4>
    <!--<h1 class="pa-4 button"><v-icon class="mr-4">fas fa-vials</v-icon> Projects </h1>-->
    <div class="pa-0">
      <v-btn text color="primary" @click="createProjectDialog = true" > New Project <v-icon small class="ml-2"> fas fa-vial</v-icon> </v-btn>
    </div>
    
    <v-list dense nav dense class="mt-6">
      <v-list-item link v-on:click="selectProject(idx)" v-for="(p, idx) in $store.state.projects" :key="idx">
        <v-tooltip right>
          <template v-slot:activator="{ active, on, attrs }">
            <v-list-item-icon>
              <v-icon color="primary" v-if="$store.state.ui.selectedProjectIdx == idx">fa-vial</v-icon>
              <v-icon color="grey" v-else>fa-vial</v-icon>
            </v-list-item-icon>
            <v-list-item-content v-on:click="selectProject(idx)">
              <v-list-item-title>{{p.name}}</v-list-item-title>
              <v-list-item-subtitle>{{p.description}}</v-list-item-subtitle>
            </v-list-item-content>
          </template>
          <span>{{p.name}}</span>
        </v-tooltip>
      </v-list-item>
    </v-list>
    <v-dialog width="500" v-model="createProjectDialog">
      <ProjectCreateForm v-if="createProjectDialog == true"/>
    </v-dialog>
  </v-card>
</template>

<script>

import ProjectCreateForm from '@/components/projects/ProjectCreateForm'

export default {
  	name: 'ProjectsExplorer',
  	components: {
  	   ProjectCreateForm
  	},
  	data: () => {
  		return {
        createProjectDialog: false,
        selectedProjectIdx: 0 
  		}
  	},
  	methods: {
      selectProject (idx) {
        this.$store.commit('projectView', 'projects-list')
        this.$store.commit('setUi', {selectedProjectIdx: idx})
      }
  	}
}
</script>
