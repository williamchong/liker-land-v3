<template>
  <div class="plus-stamp relative inline-flex">
    <UAvatar
      class="bg-white border border-muted size-24"
      :src="user?.avatar"
      :alt="user?.displayName || ''"
      icon="i-material-symbols-person-2-rounded"
      size="3xl"
    />

    <template v-if="props.hasStamped">
      <!-- Pushed out by the badge landing. -->
      <div class="plus-stamp-ring absolute inset-0 rounded-full ring-2 ring-theme-cyan pointer-events-none" />

      <!-- Resting placement matches AccountAvatarSection, and stays on this
           wrapper so the keyframes below own transform outright. -->
      <div class="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/4">
        <div class="plus-stamp-badge relative">
          <UserAvatarPlusBadge
            color="primary"
            :tier="likerPlusTier"
          />
          <!-- Clipped separately from the badge so the sweep stays inside the
               pill without cropping its ring. -->
          <div class="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
            <div class="plus-stamp-shimmer absolute inset-0" />
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
</script>

<style scoped>
/* The shimmer starts as the badge settles, so the sequence ends at
   --plus-stamp-duration plus --plus-stamp-shimmer-duration —
   PLUS_STAMP_HOLD_MS in plus/success.vue must stay above that. */
.plus-stamp {
  --plus-stamp-duration: 720ms;
  --plus-stamp-shimmer-duration: 700ms;
}

/* Deliberately less restrained than the book animations in main.css:
   this one runs once per member, ever. */
@keyframes plus-stamp {
  from { opacity: 0; transform: translateY(-28px) rotate(-14deg) scale(2.4); }
  62% { opacity: 1; transform: translateY(0) rotate(2deg) scale(0.92); }
  to { opacity: 1; transform: translateY(0) rotate(0) scale(1); }
}

/* Not gated on a state class: all three elements are mounted only once the
   stamp fires, so their presence is the state. */
.plus-stamp-badge {
  animation: plus-stamp var(--plus-stamp-duration) cubic-bezier(0.3, 0.1, 0.3, 1) forwards;
}

@keyframes plus-stamp-ring {
  from { opacity: 0.8; transform: scale(0.94); }
  to { opacity: 0; transform: scale(1.22); }
}

.plus-stamp-ring {
  opacity: 0;
  animation: plus-stamp-ring 620ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  /* Fires on the 62% frame above, where the badge actually lands. A keyframe
     stop cannot read a custom property, so the two must be changed together. */
  animation-delay: calc(var(--plus-stamp-duration) * 0.62);
}

@keyframes plus-stamp-shimmer {
  from { opacity: 1; transform: translateX(-120%); }
  to { opacity: 1; transform: translateX(120%); }
}

.plus-stamp-shimmer {
  opacity: 0;
  /* Neutral white so the pass reads as light on either badge colour scheme. */
  background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, 0.7) 50%, transparent 65%);
  animation: plus-stamp-shimmer var(--plus-stamp-shimmer-duration) ease-out forwards;
  animation-delay: var(--plus-stamp-duration);
}

@media (prefers-reduced-motion: reduce) {
  /* The badge stays, at rest; the ring and sweep stay at their base opacity 0. */
  .plus-stamp-badge,
  .plus-stamp-ring,
  .plus-stamp-shimmer {
    animation: none;
  }
}
</style>
