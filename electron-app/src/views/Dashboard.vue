<template>
  <div>
    <LeftNavigation pageNavigationName="project-new"/>
  </div>
</template>

<script>
import LeftNavigation from '@/components/LeftNavigation'

export default {
  name: 'Dashboard',
  components: {
    LeftNavigation
  },
  beforeMount () {
  	
  }
}
</script>
