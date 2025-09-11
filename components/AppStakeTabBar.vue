<template>
  <nav class="bg-white border-t border-[#EBEBEB] fixed bottom-0 left-0 right-0 pb-safe">
    <ul class="flex justify-around items-center w-full max-w-md min-h-14 mx-auto">
      <li
        v-for="item in menuItems"
        :key="item.label"
        class="flex-1"
      >
        <UButton
          v-if="item.key === 'store'"
          class="flex-col gap-0"
          :label="item.label"
          :icon="item.icon"
          :color="item.isActive ? 'primary' : 'neutral'"
          variant="link"
          size="xl"
          block
          :ui="{ label: 'text-xs' }"
          @click="handleExitStakeMode"
        />
        <UButton
          v-else
          class="flex-col gap-0"
          :label="item.label"
          :icon="item.icon"
          :color="item.isActive ? 'primary' : 'neutral'"
          variant="link"
          :to="item.to"
          size="xl"
          block
          :ui="{ label: 'text-xs' }"
        />
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const route = useRoute()
const getRouteBaseName = useRouteBaseName()

const menuItems = computed(() =>
  [
    {
      key: 'stake',
      label: $t('stake_tab_bar_explore'),
      icon: 'i-material-symbols-explore-outline',
      iconActive: 'i-material-symbols-explore',
      routeName: 'stake',
    },
    {
      key: 'collective',
      label: $t('stake_tab_bar_dashboard'),
      icon: 'i-material-symbols-dashboard-outline',
      iconActive: 'i-material-symbols-dashboard',
      routeName: 'collective',
    },
    {
      key: 'store',
      label: $t('stake_tab_bar_exit'),
      icon: 'i-material-symbols-exit-to-app-outline',
      iconActive: 'i-material-symbols-exit-to-app',
    },
  ].map((tab) => {
    const isActive = getRouteBaseName(route)?.startsWith(tab.key)
    const to = tab.key !== 'store' && tab.routeName ? localeRoute({ name: tab.routeName }) : undefined

    return {
      key: tab.key,
      label: tab.label,
      to,
      icon: isActive ? tab.iconActive : tab.icon,
      isActive,
    }
  }),
)

async function handleExitStakeMode() {
  // Navigate to store (stake mode will be auto-detected by route)
  await navigateTo(localeRoute({ name: 'store-index' }))
}
</script>
