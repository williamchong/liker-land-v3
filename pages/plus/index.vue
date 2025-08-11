<script setup lang="ts">
const route = useRoute()
const localeRoute = useLocaleRoute()
await navigateTo(localeRoute({ name: 'pricing', query: route.query }))
</script>
