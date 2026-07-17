<template>
  <section
    v-if="isCivicMember"
    class="space-y-3"
  >
    <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
      <AccountSettingsItem
        icon="i-material-symbols-group-add-rounded"
        :label="$t('civic_member_card_title')"
      >
        <div class="flex flex-col gap-1 text-sm/5">
          <div
            v-if="membersStatus"
            v-text="$t('civic_member_card_seats_usage', {
              used: membersStatus.used,
              total: membersStatus.total,
            })"
          />
          <div
            class="text-xs text-muted"
            v-text="$t('civic_member_card_lifecycle_note')"
          />
        </div>

        <template #right>
          <UButton
            :label="$t('civic_member_invite_button')"
            color="primary"
            :loading="isStatusLoading"
            :disabled="isInviteButtonDisabled"
            @click="handleOpenInviteModal"
          />
        </template>
      </AccountSettingsItem>

      <ul
        v-if="members.length"
        class="divide-y-1 divide-(--ui-border)"
      >
        <li
          v-for="member in members"
          :key="member.inviteId"
          class="flex items-center justify-between gap-3 px-4 py-3"
        >
          <div class="min-w-0">
            <div
              class="text-sm truncate"
              v-text="member.name || member.email"
            />
            <div
              v-if="member.name"
              class="text-xs text-muted truncate"
              v-text="member.email"
            />
          </div>

          <div class="flex items-center gap-3 shrink-0">
            <div class="flex flex-col items-end gap-1">
              <UBadge
                :label="member.statusBadge.label"
                :color="member.statusBadge.color"
                variant="subtle"
                size="sm"
              />
              <div
                v-if="member.dateLabel"
                class="text-xs text-muted"
                v-text="member.dateLabel"
              />
            </div>
            <UButton
              :label="$t('civic_member_revoke_button')"
              variant="ghost"
              color="error"
              size="xs"
              @click="handleOpenRevokeModal(member)"
            />
          </div>
        </li>
      </ul>
    </UCard>

    <UModal
      v-model:open="isInviteModalOpen"
      :title="$t('civic_member_invite_modal_title')"
      :description="$t('civic_member_invite_modal_description')"
      :dismissible="!isInviting"
      :close="!isInviting"
      :ui="{
        body: 'flex flex-col gap-6',
        footer: 'flex justify-end gap-3',
      }"
    >
      <template #body>
        <UFormField
          :label="$t('civic_member_invite_email_label')"
          :error="formErrors.email"
          :required="true"
        >
          <UInput
            v-model="formData.email"
            class="w-full"
            placeholder="example@email.com"
            type="email"
            size="xl"
            :disabled="isInviting"
          />
        </UFormField>

        <UFormField :label="$t('civic_member_invite_name_label')">
          <UInput
            v-model="formData.name"
            class="w-full"
            type="text"
            size="xl"
            :disabled="isInviting"
          />
        </UFormField>

        <UFormField :label="$t('civic_member_invite_message_label')">
          <UTextarea
            v-model="formData.message"
            class="w-full"
            :placeholder="$t('civic_member_invite_message_placeholder')"
            :disabled="isInviting"
            size="xl"
            :rows="3"
          />
        </UFormField>
      </template>

      <template #footer>
        <UButton
          :label="$t('common_cancel')"
          variant="outline"
          color="neutral"
          :disabled="isInviting"
          @click="isInviteModalOpen = false"
        />
        <UButton
          :label="$t('civic_member_invite_submit_button')"
          color="primary"
          :loading="isInviting"
          :disabled="!formData.email.trim()"
          @click="handleInviteMember"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="isRevokeModalOpen"
      :title="$t('civic_member_revoke_confirm_title')"
      :description="$t('civic_member_revoke_confirm_description', {
        email: revokingMember?.email || '',
      })"
      :dismissible="!isRevoking"
      :close="!isRevoking"
      :ui="{ footer: 'flex justify-end gap-3' }"
    >
      <template #footer>
        <UButton
          :label="$t('common_cancel')"
          variant="outline"
          color="neutral"
          :disabled="isRevoking"
          @click="isRevokeModalOpen = false"
        />
        <UButton
          :label="$t('civic_member_revoke_button')"
          color="error"
          :loading="isRevoking"
          @click="handleRevokeMember"
        />
      </template>
    </UModal>
  </section>
</template>

<script setup lang="ts">
import type {
  SharedMemberEntry,
  FetchSharedMembersResponseData,
} from '~/composables/use-plus-gift-session-api'

const { t: $t, locale } = useI18n()
const { isCivicMember } = useSubscription()
const { inviteSharedMember, fetchSharedMembers, revokeSharedMember } = usePlusGiftSessionAPI()
const { handleError } = useErrorHandler()
const toast = useToast()

const membersStatus = ref<FetchSharedMembersResponseData | undefined>()
const isStatusLoading = ref(false)
const isInviteModalOpen = ref(false)
const isInviting = ref(false)
const isRevokeModalOpen = ref(false)
const isRevoking = ref(false)
const revokingMember = ref<SharedMemberEntry | undefined>()

const formData = reactive({
  email: '',
  name: '',
  message: '',
})

const formErrors = reactive({
  email: '',
})

const members = computed(() => (membersStatus.value?.members || []).map(member => ({
  ...member,
  statusBadge: getMemberStatusBadge(member.status),
  dateLabel: formatMemberDate(member),
})))
const remainingSeats = computed(() => membersStatus.value?.remaining)

const isInviteButtonDisabled = computed(() =>
  isStatusLoading.value || remainingSeats.value === 0)

// Load seat usage/member list quietly; the card still works without it.
// isCivicMember means the viewer holds the Civic tier (the seat giver) — not
// that they occupy someone else's seat.
watchImmediate(isCivicMember, async (hasCivicTier) => {
  if (!hasCivicTier || import.meta.server) return
  await refreshMembers()
})

async function refreshMembers() {
  try {
    isStatusLoading.value = true
    membersStatus.value = await fetchSharedMembers()
  }
  catch (error) {
    console.warn('Failed to fetch shared member seats:', error)
  }
  finally {
    isStatusLoading.value = false
  }
}

function getMemberStatusBadge(status: SharedMemberEntry['status']): {
  label: string
  color: 'success' | 'warning'
} {
  if (status === 'claimed') {
    return { label: $t('civic_member_status_active'), color: 'success' }
  }
  return { label: $t('civic_member_status_pending'), color: 'warning' }
}

function formatMemberDate(member: SharedMemberEntry) {
  // The API emits millisecond timestamps (Firestore toMillis()).
  const timestamp = member.claimTimestamp || member.timestamp
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleDateString(locale.value)
}

function handleOpenInviteModal() {
  formData.email = ''
  formData.name = ''
  formData.message = ''
  formErrors.email = ''
  isInviteModalOpen.value = true
  useLogEvent('civic_member_invite_modal_open')
}

watch(() => formData.email, () => {
  formErrors.email = ''
})

async function handleInviteMember() {
  if (isInviting.value) return

  const email = normalizeEmail(formData.email)
  if (!validateEmail(email)) {
    formErrors.email = $t('gift_plus_invalid_email')
    return
  }

  try {
    isInviting.value = true
    await inviteSharedMember({
      email,
      name: formData.name.trim() || undefined,
      message: formData.message.trim() || undefined,
    })
    await refreshMembers()

    useLogEvent('civic_member_invited', { member_email: email })
    isInviteModalOpen.value = false
    toast.add({
      title: $t('civic_member_invited_toast_title'),
      description: $t('civic_member_invited_toast_description', { email }),
      color: 'success',
    })
  }
  catch (error) {
    const { message, statusCode } = parseError(error)
    if (statusCode === 429 || message === 'SHARED_MEMBER_SEATS_EXHAUSTED') {
      toast.add({
        title: $t('civic_member_seats_exhausted_error'),
        color: 'error',
      })
    }
    else if (statusCode === 409 || message === 'SHARED_MEMBER_ALREADY_INVITED') {
      toast.add({
        title: $t('civic_member_already_invited_error'),
        color: 'error',
      })
    }
    else {
      await handleError(error, { title: $t('civic_member_invite_error') })
    }
  }
  finally {
    isInviting.value = false
  }
}

function handleOpenRevokeModal(member: SharedMemberEntry) {
  revokingMember.value = member
  isRevokeModalOpen.value = true
}

async function handleRevokeMember() {
  const member = revokingMember.value
  if (!member || isRevoking.value) return

  try {
    isRevoking.value = true
    await revokeSharedMember(member.inviteId)
    await refreshMembers()

    useLogEvent('civic_member_revoked', { member_email: member.email })
    isRevokeModalOpen.value = false
    toast.add({
      title: $t('civic_member_revoked_toast_title'),
      color: 'success',
    })
  }
  catch (error) {
    await handleError(error, { title: $t('civic_member_revoke_error') })
  }
  finally {
    isRevoking.value = false
  }
}
</script>
