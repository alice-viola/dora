<template>
  	<div>
  		
      <v-tabs v-model="tab" align-with-title>
        <v-tabs-slider color="secondary"></v-tabs-slider>
        <v-tab v-for="item in items" :key="item">
          {{ item }}
        </v-tab>
      </v-tabs>


      <v-container fluid v-if="($store.state.projects == undefined || $store.state.projects.length == 0) && tab == 0">
          <v-alert
            border="left"
            color="primary"
            dark
          >
            You don't have any projects, start creating one!
          </v-alert>
      </v-container>
      <v-container fluid v-if="($store.state.projects != undefined && $store.state.projects.length != 0) && tab == 0" class="pa-2">
          <v-row>
            <v-col class="col-3 pa-4">
              <ProjectsExplorer />
            </v-col>
            <v-col class="col-9 pa-4">
              <v-card class="mainbackground lighten-0 elevation-0" >
                <v-card-title class="button">
                  {{$store.state.projects[$store.state.ui.selectedProjectIdx].name}} 
                  <v-spacer />
                  <v-btn icon large class="primary--text" @click="deleteProject()">
                    <v-icon large>fas fa-times</v-icon>
                  </v-btn>
                </v-card-title>
                <v-card-title class="overline">
                  {{$store.state.projects[$store.state.ui.selectedProjectIdx].id}}
                </v-card-title>
                <v-card-subtitle> {{$store.state.projects[$store.state.ui.selectedProjectIdx].framework}} </v-card-subtitle>
                <v-card-text class="lighten-0"> {{$store.state.projects[$store.state.ui.selectedProjectIdx].description}} </v-card-text>
                <v-card-text> Root <i>{{$store.state.projects[$store.state.ui.selectedProjectIdx].code}}</i> </v-card-text>
                <v-card-actions>
                  <v-btn large text class="primary--text" @click="openProject($store.state.projects[$store.state.ui.selectedProjectIdx].id)">
                    Open
                  </v-btn>

                  </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
      </v-container>
      <v-container fluid v-if="($store.state.projects != undefined && $store.state.projects.length != 0) && tab > 0" class="pa-0">
        <Project />
      </v-container>
		<v-dialog v-model="deleteProjectDialog" width="50vw">
		  <v-card class="elevation-12">
		    <v-toolbar
		      color="primary" dark flat>
		      <v-toolbar-title>Confirm deletion</v-toolbar-title>
		      <v-spacer></v-spacer>
		    </v-toolbar>
		    <v-card-text>
		      <h3 class="pa-md-4 mx-lg-auto">Are you sure you want to delete this item?</h3>
          <p class="pa-md-4 mx-lg-auto"> The filesystem will be preserved, no data will be deleted </p>
		    </v-card-text>
		    <v-card-actions>
		        <v-btn text @click="deleteProjectDialog = false">Cancel</v-btn>
		        <v-btn text color="primary" @click="confirmDeleteProject">Delete</v-btn>
		    </v-card-actions>
		  </v-card>
		</v-dialog> 
  </div>
</template>

<script>
// @ is an alias to /src
import Shell from '@/components/shell/Shell.vue'
import Workload from '@/components/workloads/Workload.vue'
import Project from '@/views/Project.vue'
import ProjectGeneralSettings from '@/components/projects/ProjectGeneralSettings.vue'
import ProjectsExplorer from '@/components/projects/ProjectsExplorer.vue'
import SpinUpWorkload from '@/components/workloads/SpinUpWorkload.vue'


export default {
  name: 'Projects',

  components: {
    Project, ProjectsExplorer
  },
  data: () => {
  	return {
      tab: null,
      items: ['Explorer'],
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
      this.items.push(this.$store.state.projects[this.$store.state.ui.selectedProjectIdx].name)
      this.tab = this.items.length -1
      this.$store.state.ui.selectedProjectId = id
      //this.$router.push('/project')
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