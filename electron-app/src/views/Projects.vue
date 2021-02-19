<template>
  	<div>
        <v-navigation-drawer class="mainbackground lighten-2 elevation-4" app mini-variant permanent right v-model="rightDrawer" v-if="$store.state.projectView !== 'projects-list' && $store.state.projectView !== 'project-new'">
       
        	<!-- Code -->
       		<v-avatar class="d-block text-center mx-auto mt-4" size="36" @click="$store.state.projectView = 'project-code'" v-if="$store.state.projects[$store.state.ui.selectedProjectIdx].code !== ''">
        	  <v-icon color="primary" v-if="$store.state.projectView == 'project-code'">fas fa-code</v-icon>
        	  <v-icon color="grey" v-else>fas fa-code</v-icon>
        	</v-avatar>

        	<!-- Workloads -->
       		<v-avatar class="d-block text-center mx-auto mt-4" size="36" @click="$store.state.projectView = 'project-workloads'">
        	  <v-icon color="primary" v-if="$store.state.projectView == 'project-workloads'">fab fa-docker</v-icon>
        	  <v-icon color="grey" v-else>fas fa-box</v-icon>
        	</v-avatar>

        	<!-- Settings -->
       		<v-avatar class="d-block text-center mx-auto mt-4" size="36" @click="$store.state.projectView = 'project-settings'">
        	  <v-icon color="primary" v-if="$store.state.projectView == 'project-settings'">fas fa-sliders-h</v-icon>
        	  <v-icon color="grey" v-else>fas fa-sliders-h</v-icon>
        	</v-avatar>

        	<v-divider class="mt-3"/>

        	<!-- Sync -->
       		<v-avatar class="d-block text-center mx-auto mt-4" size="36">
        	  <v-icon color="primary" v-if="$store.state.projectView == 'project-settings'">fas fa-sync</v-icon>
        	  <v-icon color="grey" v-else>fas fa-sync</v-icon>
        	</v-avatar>

        	<!-- Shell -->
       		<v-avatar class="d-block text-center mx-auto mt-4" size="36">
        	  <v-icon color="primary" v-if="$store.state.projectView == 'project-settings'">fas fa-terminal</v-icon>
        	  <v-icon color="grey" v-else>fas fa-terminal</v-icon>
        	</v-avatar>

        </v-navigation-drawer>
  		
  			<!-- Empty projects -->
        <v-container fluid v-if="($store.state.projects == undefined || $store.state.projects.length == 0)">
        	<LeftNavigation pageNavigationName="projects-explorer"/>
          <v-alert
            border="top"
            color="info"
            dark
          >
            You don't have any projects, start creating one!
          </v-alert>
        </v-container>

      <!-- New project -->
      <v-container fluid v-if="$store.state.projectView == 'projects-list' && ($store.state.projects != undefined && $store.state.projects.length != 0)">
        <LeftNavigation pageNavigationName="projects-explorer"/>
          <v-row>
            <v-col class="col-12 pa-2">
              <v-card class="mainbackground lighten-2 elevation-4" >
                <v-card-title> Project {{$store.state.projects[$store.state.ui.selectedProjectIdx].name}} </v-card-title>
                <v-card-subtitle> Tensorflow </v-card-subtitle>
                <v-card-text> {{$store.state.projects[$store.state.ui.selectedProjectIdx].description}} </v-card-text>
                <v-card-text> Root <i>{{$store.state.projects[$store.state.ui.selectedProjectIdx].code}}</i> </v-card-text>
                <v-card-actions>
                  <v-btn rounded small class="primary" text @click="$store.state.projectView = 'project-settings'">
                    Open
                  </v-btn>
                  <v-spacer />
                  <v-btn rounded  small  class="warning" text @click="deleteProject()">
                    Delete
                  </v-btn>
                  </v-card-actions>
              </v-card>
            </v-col>
          </v-row>

      </v-container>

   		<!-- Code -->
   		<v-container fluid v-if="$store.state.projectView == 'project-code'" class="pa-0">
   			<LeftNavigation pageNavigationName="files-explorer"/>
   			<Project :project="$store.state.projects[$store.state.ui.selectedProjectIdx]" />
   		</v-container>
      
      <!-- Settings -->
      <v-container fluid v-if="$store.state.projectView == 'project-settings'" class="pa-0">
        <LeftNavigation pageNavigationName="project-settings"/>
        <ProjectGeneralSettings />
      </v-container>

   		<!-- Workloads -->
		  <v-container fluid v-if="$store.state.projectView == 'project-workloads'" class="pa-0">
		  	<LeftNavigation pageNavigationName="workloads-explorer"/>
		  	<Workload />
		  </v-container>
   		
		<!-- Dialogs -->
		<!-- Delete project -->
		<v-dialog v-model="deleteProjectDialog" width="50vw">
		  <v-card class="elevation-12">
		    <v-toolbar
		      color="red" dark flat>
		      <v-toolbar-title>Confirm deletion</v-toolbar-title>
		      <v-spacer></v-spacer>
		    </v-toolbar>
		    <v-card-text>
		      <h3 class="pa-md-4 mx-lg-auto">Are you sure you want to delete this item?</h3>
		    </v-card-text>
		    <v-card-actions>
		        <v-btn text @click="deleteProjectDialog = false">Cancel</v-btn>
		        <v-btn text color="red" @click="confirmDeleteProject">Delete</v-btn>
		    </v-card-actions>
		  </v-card>
		</v-dialog> 

  	</div>
</template>

<script>
// @ is an alias to /src
import LeftNavigation from '@/components/LeftNavigation'
import CreateProject from '@/components/CreateProject.vue'
import Workload from '@/components/Workload.vue'
import Project from '@/views/Project.vue'
import ProjectGeneralSettings from '@/components/ProjectGeneralSettings.vue'


export default {
  name: 'Projects',
  props: ['initialView'],
  components: {
    LeftNavigation, CreateProject, Project, Workload, ProjectGeneralSettings
  },
  data: () => {
  	return {
  		view: 'projects-list',
  		projectsLength: 0,
  		deleteProjectDialog: false,
  		rightDrawer: true
  	}
  },
  watch: {
  	'$store.state.projectView' (to, from) {
  		switch (to) {
  			case 'projects-list':
  				this.$store.commit('setUi', {leftDrawerComponent: 'projects-explorer'})
  				break
  			case 'project-new':
  				this.$store.commit('setUi', {leftDrawerComponent: 'project-new'})
  				break
  			case 'project-code':
  				this.$store.commit('setUi', {leftDrawerComponent: 'files-explorer'})
  				break
  			case 'project-workloads':
  				this.$store.commit('setUi', {leftDrawerComponent: 'workloads-explorer'})
  				break
  		}
  	}
  },
  methods: {
  	checkIfThereAreProjects () {
  		if (this.$store.state.projects !== undefined && this.$store.state.projects.length == 0) {
  			this.projectsLength = 0
  		} else {
  			this.projectsLength = this.$store.state.projects.length
  		}
  	},
  	createProject () {
  		this.showProjectCreator = true
  	},
  	deleteProject () {
  		this.deleteProjectDialog = true
  	},
  	confirmDeleteProject () {
  		this.$store.dispatch('delProject', {index: this.$store.state.ui.selectedProjectIdx })
  		this.checkIfThereAreProjects()
  		this.$store.commit('setUi', {selectedProjectIdx: 0})
  	}
  },
  beforeMount () {
  	this.$store.commit('setUi', {leftDrawerComponent: 'projects-list'})
  	this.checkIfThereAreProjects()
  }
}
</script>
