<template>
  	<div>
  		<LeftNavigation pageNavigationName="projects-explorer"/>
      <v-container fluid v-if="($store.state.projects == undefined || $store.state.projects.length == 0)">
          <v-alert
            border="top"
            color="info"
            dark
          >
            You don't have any projects, start creating one!
          </v-alert>
      </v-container>
      <v-container fluid v-if="($store.state.projects != undefined && $store.state.projects.length != 0)">
          <v-row>
            <v-col class="col-12 pa-2">
              <v-card class="mainbackground lighten-0 elevation-4" >
                <v-card-title> Project {{$store.state.projects[$store.state.ui.selectedProjectIdx].name}} </v-card-title>
                <v-card-subtitle> Tensorflow </v-card-subtitle>
                <v-card-text> {{$store.state.projects[$store.state.ui.selectedProjectIdx].description}} </v-card-text>
                <v-card-text> Root <i>{{$store.state.projects[$store.state.ui.selectedProjectIdx].code}}</i> </v-card-text>
                <v-card-actions>
                  <v-btn rounded small class="primary" text @click="openProject($store.state.projects[$store.state.ui.selectedProjectIdx].id)">
                    Open
                  </v-btn>
                  <v-spacer />
                  <v-btn text  small  class="warning--text" @click="deleteProject()">
                    Delete
                  </v-btn>
                  </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
      </v-container>

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
import LeftNavigation from '@/components/navs/LeftNavigation'
import Shell from '@/components/shell/Shell.vue'
import Workload from '@/components/workloads/Workload.vue'
import Project from '@/views/Project.vue'
import ProjectGeneralSettings from '@/components/projects/ProjectGeneralSettings.vue'
import SpinUpWorkload from '@/components/workloads/SpinUpWorkload.vue'


export default {
  name: 'Projects',

  components: {
    LeftNavigation, Project
  },
  data: () => {
  	return {
  		view: 'projects-list',
  		projectsLength: 0,
  		deleteProjectDialog: false,

      
      
      workloads: [],
      workload: null,
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
    openProject (id) {
      this.$store.state.ui.selectedProjectId = id
      this.$router.push('/project')
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
      this.deleteProjectDialog = false
  		this.$store.dispatch('delProject', {index: this.$store.state.ui.selectedProjectIdx })
  		this.checkIfThereAreProjects()
  		this.$store.commit('setUi', {selectedProjectIdx: 0})
  	}
  }
}
</script>