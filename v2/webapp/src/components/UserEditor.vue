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
        <v-card-title>
          UI
        </v-card-title>        
        <v-card-text class="pt-2">
          <v-text-field class="pt-2" dense outlined label="Background image link" v-model="preferences.backgroundImage"></v-text-field>
        </v-card-text>
        <v-card-text class="pt-2">
          <ThemeChanger :show="true"/>
        </v-card-text>
        <v-card-actions class="pt-6">
          <v-btn text class="primary--text" label="Save" @click="save">Save</v-btn>
        </v-card-actions>

  </v-card>
</template>
<script type="text/javascript">
import Vue from 'vue'
import ThemeChanger from '@/components/ThemeChanger.vue'

export default {
  name: 'UserEditor',
  props: ['keyuser'],
  components: { ThemeChanger},
  data: function () {
    return {
      preferences: {
        backgroundImage: ''
      }
    }
  },
  watch: {

  },
  methods: {
    save () {
      Vue.prototype.$cookie.set('dora.background.image', this.preferences.backgroundImage)
      this.$router.go()
    },  
    closeDialog() {
      this.$emit('close-dialog')
    }
  },
  beforeMount () {
    this.preferences.backgroundImage = Vue.prototype.$cookie.get('dora.background.image')
  }
}
</script>
