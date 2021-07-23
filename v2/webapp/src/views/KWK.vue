<template>
    <div class="resource">
        <ResourceCardWk v-if="$store.state.ui.isMobile == false" />
        <ResourceCardWkMobile v-else />
    </div>
</template>

<script>
// @ is an alias to /src
import ResourceCardWk from '@/views/ResourceCardWk.vue'
import ResourceCardWkMobile from '@/views/ResourceCardWkMobile.vue'
//import CreateResource from '@/components/CreateResource.vue'

export default {
    name: 'KWK',
    components: {
        ResourceCardWk, ResourceCardWkMobile
    }
}
</script>
<style>

</style>