<template>
  <v-card
    class="mx-auto elevation-2"
    :style="'cursor: pointer; border-left: 2px solid ' + color"
   >
    <div @click="showResourceDetail()">
    <v-card-title class="mb-0 pb-0">
      <span class="subheading">{{workload.name}}</span>
      <v-spacer/>
      <v-card-subtitle class="ma-0 pa-0" style="text-transform: capitalize">{{workload.state}}</v-card-subtitle>
      <!--<v-icon small class="mr-1 blink" v-if="$store.getters.syncData(workload)">fas fa-cloud-upload-alt</v-icon>-->
      <v-icon small class="mr-1 rotating" v-if="$store.getters.syncData(workload)">fas fa-spinner</v-icon>

    </v-card-title>
    <v-card-subtitle class=" pb-0 mb-0 mt-1" v-if="workload.image !== undefined && workload.image !== null && workload.image !== ''">
      <v-icon small class="mr-1">
        fab fa-docker
      </v-icon>      
      <span class="subheading mr-2 success--text">{{workload.image}}</span>
    </v-card-subtitle>

    <v-card-text>
      
    </v-card-text>
    </div>
    <v-card-actions class="pt-0 mt-0 pa-0 mainbackground lighten-1">
      <v-list-item class="grow">
        <v-row align="center">
        <v-icon small :class="classColorForReplica()" v-if="workload.replica !== undefined && workload.replica !== null && workload.replica !== ''">
          fa-server
        </v-icon>
        <span class="subheading mr-2"  v-if="workload.replica !== undefined && workload.replica !== null && workload.replica !== ''">{{workload.replica}}</span>
        
        <span class="mr-1">·</span>
        <v-icon small class="mr-1" v-if="workload.replica !== undefined && workload.replica !== null && workload.replica !== ''">
          fa-brain
        </v-icon>
        <span class="subheading mr-2"  v-if="workload.gpu !== undefined && workload.gpu !== null && workload.gpu !== ''">{{workload.gpu}}</span>

        <span class="mr-1">·</span>
        <v-icon small class="mr-1">
          fas fa-clock
        </v-icon>
        <span class="subheading mr-2">{{workload.eta}}</span>  
      </v-row>
      
        <v-icon class="ml-4" small color="red" @click="scaleDownToZero()">
            fas fa-stop
        </v-icon>        
        <v-icon class="ml-4" small :color="workload.replica !== undefined && workload.replica !== null && workload.replica[0] !== '0' ? 'teal' : 'info'" @click="scaleDown()">
            fas fa-minus
        </v-icon>        
        <v-icon class="ml-4" small :color="workload.replica !== undefined && workload.replica !== null ? 'green' : 'info'" @click="scaleUp(1)">
            fas fa-plus
        </v-icon>        
      </v-list-item>
      

    </v-card-actions>
    <v-dialog fullscreen  v-model="showResourceDetailDialog" >
      <WorkloadEditor :_workload="workload" :keywk="wkDialogKey" v-on:close-dialog="showResourceDetailDialog = false"  v-if="showResourceDetailDialog"/>
    </v-dialog>
  </v-card>
</template>
<script>

import WorkloadEditor from '@/components/WorkloadEditor.vue'

export default {
  name: 'ContainerCard',
  props: ['workload', 'color'],
  components: {
      WorkloadEditor
  },
  data: function () {
    return {
      showResourceDetailDialog: false,
      wkDialogKey: 0,
    }
  },
  methods: {
    closeDialog: function(){
      this.createNewWorkloadDialog = false
    },      
    scaleDownToZero () {
      this.$store.dispatch('describe', {name: this.workload.name, workspace: this.workload.workspace, kind: 'Workload', cb: function (data) {
        if (data.length == 1) {
          let newWk = {}
          newWk.kind = 'Workload'
          newWk.metadata = {name: this.workload.name, workspace: this.workload.workspace}
          newWk.spec = data[0].resource  
          newWk.spec.replica.count = 0
          this.$store.dispatch('apply', newWk)
        }
      }.bind(this)})                 
    },
    scaleDown () {
      this.$store.dispatch('describe', {name: this.workload.name, workspace: this.workload.workspace, kind: 'Workload', cb: function (data) {
        if (data.length == 1) {
          let newWk = {}
          newWk.kind = 'Workload'
          newWk.metadata = {name: this.workload.name, workspace: this.workload.workspace}
          newWk.spec = data[0].resource  
          if (parseInt(newWk.spec.replica.count) > 0) {
            newWk.spec.replica.count = parseInt(newWk.spec.replica.count) - 1 
            this.$store.dispatch('apply', newWk)
          }
        }
      }.bind(this)})         
    },
    scaleUp (q) {
      this.$store.dispatch('describe', {name: this.workload.name, workspace: this.workload.workspace, kind: 'Workload', cb: function (data) {
        if (data.length == 1) {
          let newWk = {}
          newWk.kind = 'Workload'
          newWk.metadata = {name: this.workload.name, workspace: this.workload.workspace}
          newWk.spec = data[0].resource  
          newWk.spec.replica.count = q !== null ? parseInt(newWk.spec.replica.count) + 1 : q 
          this.$store.dispatch('apply', newWk)
        }
      }.bind(this)})   
    },    
    showResourceDetail() {
      this.wkDialogKey = Math.random()
      this.showResourceDetailDialog = true
    },
    classColorForReplica () {
      if (this.workload.replica !== undefined) {
        let r1 = this.workload.replica.split('/')[0]
        let r2 = this.workload.replica.split('/')[1]
        if (r1 == '0' && r2 == '0') {
          return 'mr-1 ml-1 grey--text'
        } else if (r1 == r2) {
          return 'mr-1 ml-1 success--text'
        } else {
          return 'mr-1 ml-1 error--text'
        }
      } else {
        return 'mr-1 ml-1'
      }
    },
    deleteWk () {
      this.$store.dispatch('delete', {
        kind: 'Workload',
        name: this.workload.name,
        workspace: this.workload.workspace,
      })
    }
  }
}
</script>
<style>
@-webkit-keyframes rotating /* Safari and Chrome */ {
  from {
    -webkit-transform: rotate(0deg);
    -o-transform: rotate(0deg);
    transform: rotate(0deg);
  }
  to {
    -webkit-transform: rotate(360deg);
    -o-transform: rotate(360deg);
    transform: rotate(360deg);
  }
}
@keyframes rotating {
  from {
    -ms-transform: rotate(0deg);
    -moz-transform: rotate(0deg);
    -webkit-transform: rotate(0deg);
    -o-transform: rotate(0deg);
    transform: rotate(0deg);
  }
  to {
    -ms-transform: rotate(360deg);
    -moz-transform: rotate(360deg);
    -webkit-transform: rotate(360deg);
    -o-transform: rotate(360deg);
    transform: rotate(360deg);
  }
}
.rotating {
  -webkit-animation: rotating 2s linear infinite;
  -moz-animation: rotating 2s linear infinite;
  -ms-animation: rotating 2s linear infinite;
  -o-animation: rotating 2s linear infinite;
  animation: rotating 2s linear infinite;
}

@keyframes blink {
  from {
    color: rgba(255,255,255,1);
  }
  to {
   color: rgba(0,255,255,0.5);
  }
}
.blink {
  animation: blink 3s linear infinite;
  -webkit-animation: blink 3s linear infinite;
}
</style>

