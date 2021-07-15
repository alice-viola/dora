<template>
  <v-card>
        <v-toolbar
          dark
          dense
          class="elevation-0"
        >
          <v-toolbar-title class="text-h5">
            <v-icon small class="mr-3">
              fas fa-user
            </v-icon>      
            Edit your preferences <b class="text-h5 font-weight-light ml-2"></b> 
          </v-toolbar-title>
            <v-spacer />
            <v-btn
              icon
              dark
              @click="closeDialog()"
            ><v-icon>mdi-close</v-icon></v-btn>            
          </v-toolbar-title>
        </v-toolbar>
        <v-card-text>
          
        </v-card-text>

  </v-card>
</template>
<script type="text/javascript">

export default {
  name: 'UserEditor',
  props: ['keyuser'],
  components: {  },
  data: function () {
    return {

    }
  },
  watch: {

  },
  methods: {
    closeDialog() {
      this.$emit('close-dialog')
    }
  }
}
</script>
