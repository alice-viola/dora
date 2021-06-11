<template>
  <v-card
    class="mx-auto"
    :style="'cursor: pointer; border-left: 2px solid ' + color"
   >
    <v-card-title class="mb-0 pb-0">
      <span class="caption">{{workload.name}}</span>
    </v-card-title>
    <v-card-subtitle class="overline pb-0 mb-0 mt-1" v-if="workload.image !== undefined && workload.image !== null && workload.image !== ''">
      <v-icon small class="mr-1">
        fab fa-docker
      </v-icon>      
      <span class="subheading mr-2">{{workload.image}}</span>
    </v-card-subtitle>


    <v-card-text v-if="workload.status == 'failed' && workload.reason !== null">
      {{workload.reason}}
    </v-card-text>

    <v-card-actions class="pt-0 mt-0">
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
      </v-list-item>
    </v-card-actions>
    <v-card-actions class="pt-0 mt-0">
      <v-row align="center" >
        <v-icon class="ml-4" small color="primary" @click="scaleDownToZero()">
            fas fa-minus
        </v-icon>
      </v-row>
      <v-row align="center" justify="end">
        <v-icon class="mr-4" small color="primary" @click="showResourceDetail()">
            mdi-pencil
        </v-icon>
        <v-icon class="mr-4" small color="primary" @click="deleteWk()">
            mdi-delete
        </v-icon>
      </v-row>
    </v-card-actions>
    <v-dialog max-width="800px" v-model="showResourceDetailDialog" >
      <WorkloadEditor :_workload="workload" :keywk="wkDialogKey" v-if="showResourceDetailDialog"/>
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
      wkDialogKey: 0
    }
  },
  methods: {
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
      //workload.replica !== undefined ? (workload.replica.split('/')[1] / workload.replica.split('/')[0] !== 1 ? 'mr-1 ml-1 error--text' : 'mr-1 ml-1 success--text') : 'mr-1 ml-1 success--text' 
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