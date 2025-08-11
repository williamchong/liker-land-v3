<script lang="ts" setup>
const route = useRoute()
const localeRoute = useLocaleRoute()
await navigateTo(localeRoute({ name: 'shelf-walletAddress', query: route.query }), { replace: true })
</script>
