<template>
  	<div>
        <v-navigation-drawer floating class="navigationDrawerRight lighten-0 elevation-0" app mini-variant permanent right v-model="rightDrawer" v-if="$store.state.projectView !== 'projects-list' && $store.state.projectView !== 'project-new'">
       
        	<!-- Code -->
       		<v-avatar class="d-block text-center mx-auto mt-4" size="36" @click="$store.state.projectView = 'project-code'" v-if="$store.state.projects[$store.state.ui.selectedProjectIdx].code !== ''">
        	  <v-icon color="primary" v-if="$store.state.projectView == 'project-code'">fas fa-code</v-icon>
        	  <v-icon color="grey" v-else>fas fa-code</v-icon>
        	</v-avatar>

        	<!-- Workloads -->
       		<v-avatar class="d-block text-center mx-auto mt-4" size="36" @click="$store.state.projectView = 'project-workloads'">
        	  <v-icon color="primary" v-if="$store.state.projectView == 'project-workloads'">fab fa-docker</v-icon>
        	  <v-icon color="grey" v-else>fab fa-docker</v-icon>
        	</v-avatar>

        	<!-- Settings -->
       		<v-avatar class="d-block text-center mx-auto mt-4" size="36" @click="$store.state.projectView = 'project-settings'">
        	  <v-icon color="primary" v-if="$store.state.projectView == 'project-settings'">fas fa-sliders-h</v-icon>
        	  <v-icon color="grey" v-else>fas fa-sliders-h</v-icon>
        	</v-avatar>

        	<v-divider class="mt-3"/>

          <!-- Workloads -->
          <v-menu offset-y>
            <template v-slot:activator="{ on, attrs }">
              <!--<v-avatar class="d-block text-center mx-auto mt-4" size="36" @click="spinUpNewWorkload" v-bind="attrs" v-on="on">
                <v-icon color="grey">fas fa-plus</v-icon>
              </v-avatar>-->
              <v-btn
                color="primary"
                dark
                v-bind="attrs"
                v-on="on"
              >
                Wk
              </v-btn>
            </template>
            <v-list>
              <v-list-item
                v-for="(workload, index) in workloads"
                :key="index"
              >
                <v-list-item-title @click="openShell(workload)">{{ workload.name }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>


        	<!-- Sync -->
       		<v-avatar class="d-block text-center mx-auto mt-4" size="36">
        	  <v-icon color="primary" class="activeSync" v-if="$store.state.projects[$store.state.ui.selectedProjectIdx].syncCode == true">fas fa-sync</v-icon>
        	  <v-icon color="grey" v-else>fas fa-sync</v-icon>
        	</v-avatar>

        	<!-- Shell -->
       		<v-avatar class="d-block text-center mx-auto mt-4" size="36" @click="showTerminal = !showTerminal">
        	  <v-icon color="primary" v-if="showTerminal == true">fas fa-terminal</v-icon>
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
   			<Project :project="$store.state.projects[$store.state.ui.selectedProjectIdx]" :showTerminal="showTerminal"/>
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
   		

    <Shell :item="workload" v-if="showTerminal == true" />
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

    <v-dialog width="500" v-model="spinUpWorkloadDialog">
      <SpinUpWorkload v-if="spinUpWorkloadDialog == true"/>
    </v-dialog>

  	</div>
</template>

<script>
// @ is an alias to /src
import LeftNavigation from '@/components/LeftNavigation'
import CreateProject from '@/components/CreateProject.vue'
import Shell from '@/components/Shell.vue'
import Workload from '@/components/Workload.vue'
import Project from '@/views/Project.vue'
import ProjectGeneralSettings from '@/components/ProjectGeneralSettings.vue'
import SpinUpWorkload from '@/components/SpinUpWorkload.vue'


export default {
  name: 'Projects',
  props: ['initialView'],
  components: {
    LeftNavigation, CreateProject, Project, Workload, ProjectGeneralSettings, SpinUpWorkload, Shell
  },
  data: () => {
  	return {
  		view: 'projects-list',
  		projectsLength: 0,
  		deleteProjectDialog: false,
  		rightDrawer: true,

      spinUpWorkloadDialog: false,
      showTerminal: false,
      workloads: [],
      workload: null,
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
    fetch () {
      this.$store.state.interface.cli.api.get.one('Workload', {}, function (err, data) {
        if (err) {
          
        } else {
          this.workloads = data.filter(function (w) {
            return w.name.includes(this.$store.state.projects[this.$store.state.ui.selectedProjectIdx].id)
          }.bind(this))
          console.log(this.workloads)
        }
      }.bind(this))
    },
    openShell (workload) {
      this.$store.state.interface.cli.api.describe.one('Workload', workload.name, {}, function (err, data) {
          if (err) {
            
          } else {
            this.workload = data
            console.log(this.workload)
            this.showTerminal = true
          }
      }.bind(this))

    },
    spinUpNewWorkload () {
      this.spinUpWorkloadDialog = true
    },
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
    this.fetch()
  }
}
</script>
<style  scoped>
.activeSync {
  -webkit-animation:spin 4s linear infinite;
  -moz-animation:spin 4s linear infinite;
  animation:spin 4s linear infinite;
}
@-moz-keyframes spin { 100% { -moz-transform: rotate(360deg); } }
@-webkit-keyframes spin { 100% { -webkit-transform: rotate(360deg); } }
@keyframes spin { 100% { -webkit-transform: rotate(360deg); transform:rotate(360deg); } }
</style>