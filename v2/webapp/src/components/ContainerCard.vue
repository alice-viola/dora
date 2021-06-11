<template>
  <v-card
    class="mx-auto"
    :style="'cursor: pointer; border-left: 2px solid ' + color"
   >
    <v-card-title>
      <span class="caption">{{container.name}}</span>
    </v-card-title>
    <v-card-subtitle class="overline pb-0 mb-0" v-if="container.node !== undefined && container.node !== null && container.node !== ''">
        <v-icon small class="mr-1" v-if="container.node !== undefined && container.node !== null && container.node !== ''">
          fa-server
        </v-icon>
        <span class="subheading ml-2"  v-if="container.node !== undefined && container.node !== null && container.node !== ''">{{container.node}}</span>
    </v-card-subtitle>

    <v-card-text v-if="container.status == 'failed' && container.reason !== null">
      {{container.reason}}
    </v-card-text>

    <v-card-text v-if="container.status != 'running'">
      {{container.status}}
    </v-card-text>

    <v-card-actions class="pt-0 mt-3">
      <v-row align="center" justify="end">
        <v-icon small class="mr-1 ml-5">
          fas fa-clock
        </v-icon>
        <span class="subheading mr-2">{{container.eta}}</span>
        <v-spacer />
        <v-icon class="mr-4" small  @click="connect" v-if="container.status == 'running'">
            fas fa-terminal
        </v-icon>
        <v-icon class="mr-4" small  @click="deleteContainer()">
            mdi-delete
        </v-icon>
      </v-row>
    </v-card-actions>
  </v-card>
</template>
<script>
export default {
  name: 'ContainerCard',
  props: ['container', 'color'],
  components: {
      
  },
  methods: {
    calcWatt () {

    },
    connect () {
      this.container.kind = 'Container'
      let routeData = this.$router.resolve({name: 'Shell', path: '/shell/' + this.container.name , query: {item: JSON.stringify(this.container) }})
      window.open(location.origin + '/shell/' +  this.container.name + routeData.href, this.container.name, "height=600,width=1024,toolbar=no,menubar=no,resizable=yes")
    },
    deleteContainer () {
      this.$store.dispatch('delete', {
        kind: 'Container',
        name: this.container.name,
        workspace: this.container.workspace,
      })
    }
  }
}
</script>