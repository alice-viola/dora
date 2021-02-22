<template>
  <div>
    <!-- Code -->
    <!--<LeftNavigation pageNavigationName="files-explorer" v-if="projectView == 'project-code'"/>-->
    <!-- Workloads -->
    <LeftNavigation pageNavigationName="workloads-explorer" v-if="$store.state.ui.projectView == 'project-workloads'"/>
    <!-- Settings -->
    <LeftNavigation pageNavigationName="project-settings" v-if="$store.state.ui.projectView == 'project-settings'" />
    
    <!-- !!!!!!!!! -->
    <!-- Right Menu -->
    <v-navigation-drawer floating class="navigationDrawerRight lighten-0 elevation-4" app mini-variant permanent right v-model="rightDrawer">
       <!-- Code -->
       <v-avatar class="d-block text-center mx-auto mt-4" size="36" @click="$store.state.ui.projectView = 'project-code'" v-if="$store.state.projects[$store.state.ui.selectedProjectIdx].code !== ''">
         <v-icon color="primary" v-if="$store.state.ui.projectView == 'project-code'">fas fa-code</v-icon>
         <v-icon color="grey" v-else>fas fa-code</v-icon>
       </v-avatar>

       <!-- Workloads -->
       <v-avatar class="d-block text-center mx-auto mt-4" size="36" @click="$store.state.ui.projectView = 'project-workloads'">
         <v-icon color="primary" v-if="$store.state.ui.projectView == 'project-workloads'">fab fa-docker</v-icon>
         <v-icon color="grey" v-else>fab fa-docker</v-icon>
       </v-avatar>

       <!-- Settings -->
       <v-avatar class="d-block text-center mx-auto mt-4" size="36" @click="$store.state.ui.projectView = 'project-settings'">
         <v-icon color="primary" v-if="$store.state.ui.projectView == 'project-settings'">fas fa-sliders-h</v-icon>
         <v-icon color="grey" v-else>fas fa-sliders-h</v-icon>
       </v-avatar>

       <!-- Wk spinner -->
       <v-avatar class="d-block text-center mx-auto mt-4" size="36" @click="spinUpNewWorkload">
         <v-icon color="secondary">fas fa-plus</v-icon>
       </v-avatar>

       <!-- Wk connect standalone shell -->
       <v-menu offset-y>
          <template v-slot:activator="{ on, attrs }">
            <v-avatar class="d-block text-center mx-auto mt-4" size="36">
              <v-btn
                icon
                v-bind="attrs"
                v-on="on"
                @click="fetch"
              >
              <v-icon color="secondary">fas fa-terminal</v-icon>
              </v-btn>
            </v-avatar>
          </template>
          <v-list class="pa-2"  style="min-width: 300px">
            <h3 class="overline">
              Connect to
            </h3>
            <v-list-item
              v-for="(workload, index) in runningWorkloads"
              :key="index"
              style="cursor: pointer; "
            >
             <b class="primary--text" @click="openShell(workload)">{{ workload.name }}</b>
            </v-list-item>
          </v-list>
       </v-menu>

       <!-- Sync -->
       <v-avatar class="d-block text-center mx-auto mt-4" size="36">
         <v-icon color="primary" class="activeSync" v-if="$store.state.projects[$store.state.ui.selectedProjectIdx].syncCode == true">fas fa-sync</v-icon>
         <v-icon color="grey" v-else>fas fa-sync</v-icon>
       </v-avatar>

     </v-navigation-drawer>

     <!-- !!!!!!!!!! -->
     <!-- Page Views -->
     <div v-if="$store.state.ui.projectView == 'project-code'" class="ma-2">
      <CodeEditorExtended />
     </div>

     <div v-if="$store.state.ui.projectView == 'project-settings'">
      <ProjectGeneralSettings />
     </div>

     <div v-if="$store.state.ui.projectView == 'project-workloads'">
      <Workload />
     </div>


     <!-- !!!!!!! -->
     <!-- DIALOGS -->
    <v-dialog width="500" v-model="spinUpWorkloadDialog">
      <SpinUpWorkload v-if="spinUpWorkloadDialog == true"/>
    </v-dialog>


  </div>
  
</template>

<script>
const { BrowserWindow } = require('electron').remote

import LeftNavigation from '@/components/navs/LeftNavigation'
import CodeEditor from '@/components/code/CodeEditor.vue'
import CodeEditorExtended from '@/components/code/CodeEditorExtended.vue'
import ProjectGeneralSettings from '@/components/projects/ProjectGeneralSettings.vue'
import SpinUpWorkload from '@/components/workloads/SpinUpWorkload.vue'
import Workload from '@/components/workloads/Workload.vue'
import Shell from '@/components/shell/Shell.vue'
let fse = require('../../../lib/interfaces/fs')


export default {
  name: 'Project',
  components: {
    CodeEditor, CodeEditorExtended, LeftNavigation, ProjectGeneralSettings, SpinUpWorkload, Workload
  },
  data: () => {
  	return {
      projectsLength: 0,
      deleteProjectDialog: false,
      rightDrawer: true,

      spinUpWorkloadDialog: false,
      workloads: [],
      runningWorkloads: [],
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
          this.runningWorkloads = this.workloads.filter(function (w) {
            return w.status == 'RUNNING'
          }.bind(this))
        }
      }.bind(this))
    },
    spinUpNewWorkload () {
      this.spinUpWorkloadDialog = true
    },
    async openShell (workload) {
      console.log(process.env.NODE_ENV)
      const modalPath = process.env.NODE_ENV === 'development'
          ? 'http://localhost:8080/#/'
          : `file://${__dirname}/index.html/#/Shell`
      let win = new BrowserWindow({
        width: 1024,
        height: 640,
        webPreferences: {nodeIntegration: true, enableRemoteModule: true },
        //show: true,
      })
      //if (process.env.WEBPACK_DEV_SERVER_URL) {
      //  // Load the url of the dev server if in development mode
      //  await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
      //  if (!process.env.IS_TEST) win.webContents.openDevTools()
      //} else {
      //  //createProtocol('app')
      //  // Load the index.html when not in development
      //  win.loadURL('app://./index.html')
      //}
      win.loadURL('http://localhost:8080/#/StandaloneShell?workload=' + workload.name)
      win.once('ready-to-show', function () {
        win.setTitle('pwm-app@' + workload.name)
        win.setMenuBarVisibility(false)
      })
      
    }
  },
  beforeMount () {
    this.project = this.$store.state.projects[this.$store.state.ui.selectedProjectIdx]
  	if (this.project == null || this.project == undefined) {
      this.$router.push('/projects')
      return
    } else {
      this.fetch()
    }
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