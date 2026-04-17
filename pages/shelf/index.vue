<script lang="ts" setup>
// Fire-and-forget: awaiting navigateTo at top-level <script setup> suspends
// this redirect until the target resolves — an offline stall would hang it.
const route = useRoute()
const localeRoute = useLocaleRoute()
navigateTo(localeRoute({ name: 'shelf-walletAddress', query: route.query }), { replace: true })
</script>
