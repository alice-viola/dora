<template>	
	<div class="black pa-0 text-center" style="height: 100vh">
		<div v-if="workload == null && err == null">
    		<v-progress-circular style="padding-top: 550px"
    		  :size="140"
    		  :width="14"
    		  color="primary"
    		  indeterminate
    		></v-progress-circular>
    		<h1> Connecting to {{$route.query.workload}} </h1>
		</div>
		<Shell class="pa-0" :item="workload" v-if="workload !== null && err == null"/>
		<div v-if="err != null">
			<h1> Cannot connect </h1>
		</div>
	</div>
</template>

<script>

import Shell from '@/components/shell/Shell.vue'

export default {
  name: 'StandaloneShell',
  components: {Shell},
  data: function () {
  	return {
  		workload: null,
  		err: null
  	}
  },
  beforeMount () {
  	setTimeout(function () {
  	console.log(this.$store.state)
	this.$store.state.interface.cli.api.describe.one('Workload', this.$route.query.workload, {}, function (err, data) {
	  	if (err) {
	  	  	this.err = err
	  	} else {
	  	  	this.workload = data
	  	}

	}.bind(this))
}.bind(this), 2000)
  }

}
</script>