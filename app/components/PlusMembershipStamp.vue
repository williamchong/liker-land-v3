<template>
  <div class="relative inline-flex">
    <UAvatar
      class="bg-white border border-muted size-24"
      :src="user?.avatar"
      :alt="user?.displayName || ''"
      icon="i-material-symbols-person-2-rounded"
      size="3xl"
    />

    <template v-if="props.hasStamped">
      <!-- Pushed out by the badge landing. -->
      <div
        data-plus-stamp-ring
        class="absolute inset-0 rounded-full ring-2 ring-theme-cyan pointer-events-none"
      />

      <!-- Resting placement matches AccountAvatarSection, and stays on this
           wrapper so the keyframes in main.css own transform outright. -->
      <div class="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/4">
        <div
          data-plus-stamp-badge
          class="relative"
        >
          <UserAvatarPlusBadge
            color="primary"
            :tier="likerPlusTier"
          />
          <!-- Clipped separately from the badge so the sweep stays inside the
               pill without cropping its ring. -->
          <div class="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
            <div
              data-plus-stamp-shimmer
              class="absolute inset-0"
              :style="shimmerStyle"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Only the trigger is a prop: it carries the success page's route-query and
// tier-match logic, which this component cannot derive. Avatar and tier come
// from the same composables AccountAvatarSection reads.
const props = defineProps<{
  hasStamped?: boolean
}>()

const { user } = useUserSession()
const { likerPlusTier } = useSubscription()

// Neutral white so the pass reads as light on either badge colour scheme.
const shimmerStyle = {
  background: 'linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, 0.7) 50%, transparent 65%)',
}
</script>
