<template>
  	<div>
  		<!-- Empty projects -->
   		<v-container fluid v-if="$store.state.userCfg.cfg !== undefined && ($store.state.userCfg.cfg.projects == undefined || $store.state.userCfg.cfg.projects.length == 0)">
			<v-card class="lighten-0 elevation-1">
			    <v-card-title>
			        Projects
			    </v-card-title>
			    <v-card-text>
			        <p>
			        	You don't have any projects, start creating one!
			        </p>
    	      		<v-btn text v-on:click="createProject()">
			        	Create project
			        </v-btn>
			    </v-card-text>
			</v-card>
   		</v-container>

   		<!-- Projects-->
   		<v-container fluid v-else> 
   			<v-row class="pa-0">
   				<!--<v-col class="col-2 pa-2">
      				<v-list dense nav dense class="pa-0 mainbackground lighten-0" style="min-height: 100vh">     

      				  <v-list-item link v-on:click="selectProject(idx)" v-for="(p, idx) in $store.state.userCfg.cfg.projects" :key="idx">
      				    <v-tooltip right>
      				      <template v-slot:activator="{ active, on, attrs }">
      				        <v-list-item-icon>
      				          <v-icon color="primary" v-if="selectedProjectIdx == idx">fa-vial</v-icon>
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
   				</v-col>-->
   				<v-col class="col-12 pa-2">
   					<v-card class="mainbackground lighten-0 elevation-0" >
   						<v-card-title> Project {{$store.state.userCfg.cfg.projects[$store.state.ui.selectedProjectIdx].name}} </v-card-title>
   						<v-card-subtitle> Tensorflow </v-card-subtitle>
   						<v-card-text> {{$store.state.userCfg.cfg.projects[$store.state.ui.selectedProjectIdx].description}} </v-card-text>
   						<v-card-text> Root <i>{{$store.state.userCfg.cfg.projects[$store.state.ui.selectedProjectIdx].code}}</i> </v-card-text>
   						<v-card-actions>
    	      				<v-btn class="primary--text" text @click="goToProject()">
			        			Go
			        		</v-btn>
    	      				<v-btn class="secondary--text" text>
			        			Modify
			        		</v-btn>
    	      				<v-btn class="warning--text" text @click="deleteProject()">
			        			Delete
			        		</v-btn>
			        	</v-card-actions>
			    	</v-card>
   				</v-col>
   			</v-row>
   		</v-container>

   		<!-- Create Project button -->
    	<v-fab-transition>
    	  <v-btn
    	    style="position: fixed; bottom: 15px; right: 15px; z-index: 10"
    	    key="newResource"
    	    color="primary"
    	    fab
    	    small
    	    @click="showProjectCreator = true"
    	  >
    	    <v-icon>fa-plus</v-icon>
    	  </v-btn>
    	</v-fab-transition>


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

    	<!-- Create Project dialog -->
		<v-dialog fullscreen hide-overlay v-model="showProjectCreator">
      		<v-card>
      		  	<v-toolbar dark color="primary">
      		    	<v-btn icon dark @click="showProjectCreator = false">
      		      		<v-icon>fa-times-circle</v-icon>
      		    	</v-btn>
          			<v-toolbar-title>New Project</v-toolbar-title>
          			<v-spacer></v-spacer>
					<v-btn icon dark @click="saveProject = true">
      		      		<v-icon>fa-save</v-icon>
      		    	</v-btn>
				</v-toolbar>				
				<v-card-text class="pa-0">
					<CreateProject :saveProject="saveProject"/>
				</v-card-text>
			</v-card>
		</v-dialog>
  	</div>
</template>

<script>
// @ is an alias to /src
import CreateProject from '@/components/CreateProject.vue'

export default {
  name: 'Projects',
  components: {
    CreateProject
  },
  data: () => {
  	return {
  		projectsLength: 0,
  		showProjectCreator: false,
  		saveProject: false,
  		deleteProjectDialog: false
  	}
  },
  methods: {
  	checkIfThereAreProjects () {
  		if (this.$store.state.userCfg.cfg !== undefined && (this.$store.state.userCfg.cfg.projects == undefined || 	this.$store.state.userCfg.cfg.projects.length == 0)) {
  			this.projectsLength = 0
  		} else {
  			this.projectsLength = this.$store.state.userCfg.cfg.projects.length
  		}
  	},
  	createProject () {
  		this.showProjectCreator = true
  	},
  	goToProject () {
  		this.$router.push({name: 'Project', params: {project: this.$store.state.userCfg.cfg.projects[this.$store.state.ui.selectedProjectIdx]}})
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
  updated () {
  	this.$store.commit('setUi', {leftDrawerComponent: 'projects-explorer'})
  },
  beforeMount () {
  	this.$store.commit('setUi', {leftDrawerComponent: 'projects-explorer'})
  	//this.$store.state.ui.leftDrawerComponent = 'projects-explorer'
  	this.checkIfThereAreProjects()
  }
}
</script>
