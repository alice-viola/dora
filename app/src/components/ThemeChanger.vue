<template>
      <v-menu
        bottom
        left
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            icon
            v-bind="attrs"
            v-on="on"
          >
            <v-icon color="primary">mdi-dots-vertical</v-icon>
          </v-btn>
        </template>

        <v-list class="pa-md-2 mainbackground lighten-2">
          <v-list-item-content>
            <v-list-item-title class="title">
              Theme 
            </v-list-item-title>
          </v-list-item-content>
          <v-list-item>
            <v-switch v-model="$vuetify.theme.dark" label="Dark" v-on:click="savePreferences()"/>
          </v-list-item>
          <v-list-item>
          <v-radio-group v-model="themeChoice">
            <v-radio
              v-for="n in themes"
              :key="n.name"
              :label="`${n.name}`"
              :value="n.name"
              v-on:click="setTheme(n)"
            ></v-radio>
          </v-radio-group>
          </v-list-item>
        </v-list>
      </v-menu>

</template>
<script>
import Vue from 'vue'

export default {
  name: "ThemeChanger",
  data: () => ({
    menu: false,
    selectedTheme: null,
    themeChoice: 'Default',
    themes: [
      {
        name: "Default",
        dark: {
          mainbackground: "#101010",
          primary: "#F96F5D",
          accent: "#f9705d",
          secondary: "#21dc79",
          success: "#86af3f",
          info: "#f34fc6",
          warning: "#FB8C00",
          error: "#FF5252",
        },
        light: {
          mainbackground: "#fafafa",
          primary: "#F96F5D",
          accent: "#f9705d",
          secondary: "#26ff8c",
          success: "#F96F5D",
          info: "#ff53d0",
          warning: "#7B1FA2",
          error: "#7B1FA2",
        }
      },
      {
        name: "Monokai",
        dark: {
          mainbackground: "#272822",
          primary: "#f92672",
          accent: "#F96F5D",
          secondary: "#689F38",
          success: "#4CAF50",
          info: "#6156d8",
          warning: "#f92672",
          error: "#f8f8f0"
        },
        light: {
          mainbackground: "#fafafa",
          primary: "#f92672",
          accent: "#F96F5D",
          secondary: "#92de4e",
          success: "#00BFA5",
          info: "#7365ff",
          warning: "#f8f8f0",
          error: "#f8f8f0"
        }
      },
      {
        name: "Pink",
        dark: {
          mainbackground: "#AD1457",
          primary: "#880E4F",
          accent: "#F96F5D",
          secondary: "#689F38",
          success: "#4CAF50",
          info: "#6156d8",
          warning: "#1565C0",
          error: "#FF7043"
        },
        light: {
          mainbackground: "#fafafa",
          primary: "#E91E63",
          accent: "#F96F5D",
          secondary: "#92de4e",
          success: "#00BFA5",
          info: "#7365ff",
          warning: "#2e8ac0",
          error: "#ff5e3c"
        }
      }
    ]
  }),
  methods: {
    savePreferences () {
      Vue.prototype.$cookie.set('pwm-theme', {dark: this.$vuetify.theme.dark, themeName: this.selectedTheme.name})
    },
    setDefault () {
      let preferences = Vue.prototype.$cookie.get('pwm-theme')
      if (preferences !== undefined && preferences !== null) {
        this.$vuetify.theme.dark = preferences.dark
        let themeSelected = this.themes.filter((theme) => { return theme.name == preferences.themeName })
        if (themeSelected != undefined && themeSelected.length == 1) {
          this.setTheme(themeSelected[0])  
        } else {
          this.setTheme(this.themes[0])
        }
      } else {
        this.setTheme(this.themes[0])
      }
    },
    setTheme(theme) {
      this.selectedTheme = theme
      this.savePreferences()
      this.menu = false
      this.themeChoice = theme.name
      const name = theme.name
      const dark = theme.dark
      const light = theme.light
      Object.keys(dark).forEach(i => {
        this.$vuetify.theme.themes.dark[i] = dark[i]
      })
      Object.keys(light).forEach(i => {
        this.$vuetify.theme.themes.light[i] = light[i]
      })
    }
  },
  beforeMount () {
    this.setDefault()
  }
};
</script>