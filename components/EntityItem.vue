<template>
  <UTooltip
    :text="props.walletAddress"
    :disabled="!props.walletAddress || !!displayName"
  >
    <TagItem
      ref="lazyLoadTrigger"
      :label="label"
    >
      <template #prepend>
        <UAvatar
          :alt="name"
          size="xs"
          icon="i-material-symbols-person-2-rounded"
        />
      </template>
    </TagItem>
  </UTooltip>
</template>

<script setup lang="ts">
const props = defineProps({
  name: {
    type: String,
    default: '',
  },
  walletAddress: {
    type: String,
    default: '',
  },
})

const metadataStore = useMetadataStore()

useVisibility('lazyLoadTrigger', (visible) => {
  if (visible) {
    if (props.walletAddress) {
      metadataStore.lazyFetchLikerInfoByWalletAddress(props.walletAddress).catch(() => {
        console.warn(`Failed to fetch Liker info of the wallet [${props.walletAddress}]`)
      })
    }
  }
})

const displayName = computed(() => {
  const likerInfo = metadataStore.getLikerInfoByWalletAddress(props.walletAddress)
  return likerInfo?.displayName || props.name
})

const label = computed(() => {
  if (displayName.value) return displayName.value
  return `${props.walletAddress.slice(0, 10)}...${props.walletAddress.slice(-9)}`
})
</script>
