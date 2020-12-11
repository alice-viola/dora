<template>

       <!--      dark-mode switch -->

       <v-card-text>
        <v-switch v-model="$vuetify.theme.dark" />
        <v-card class="my-2"
          
          @click="setTheme(theme)"
          hover
          outlined
          v-for="(theme, index) in themes"
          :key="index"
        >
          <v-list-item>
            <v-list-item-content>
              <v-list-item-title class="font-weight-bold">
                {{ theme.name }}</v-list-item-title
              >
            </v-list-item-content>

          </v-list-item>

        </v-card>
      </v-card-text>
         <!--      menu content end -->
   
     </template>
<script>
export default {
  name: "ThemeChanger",
  data: () => ({
    menu: false,
    themes: [
      {
        name: "Theme 1",
        dark: {
          primary: "#21CFF3",
          accent: "#E91E63",
          secondary: "#21dc79",
          success: "#86af3f",
          info: "#f34fc6",
          warning: "#FB8C00",
          error: "#FF5252",
          navbar: "black"
        },
        light: {
          primary: "#22daff",
          accent: "#E91E63",
          secondary: "#26ff8c",
          success: "#a5d64c",
          info: "#ff53d0",
          warning: "#ff8e00",
          error: "#ff5252",
          navbar: "white"
        }
      },
      {
        name: "Theme 2",
        dark: {
          primary: "#E65100",
          accent: "#7CB342",
          secondary: "#689F38",
          success: "#4CAF50",
          info: "#6156d8",
          warning: "#1565C0",
          error: "#FF7043"
        },
        light: {
          primary: "#ffa450",
          accent: "#a1e754",
          secondary: "#92de4e",
          success: "#6dff74",
          info: "#7365ff",
          warning: "#2e8ac0",
          error: "#ff5e3c"
        }
      }
    ]
  }),
  methods: {
    setTheme(theme) {
      console.log(theme)
      // close menu
      this.menu = false;
      const name = theme.name;
      const dark = theme.dark;
      const light = theme.light;
      // set themes
      Object.keys(dark).forEach(i => {
        this.$vuetify.theme.themes.dark[i] = dark[i];
      });
      Object.keys(light).forEach(i => {
        this.$vuetify.theme.themes.light[i] = light[i];
      });
      // also save theme name to disable selection
      //this.$vuetify.theme.themes.name = name;
    }
  }
};
</script>