<template>
  <UButton
    leading-icon="i-material-symbols-login-rounded"
    :label="$t('login_button')"
    variant="outline"
    size="lg"
    :loading="accountStore.isLoggingIn"
    :disabled="hasLoggedIn"
    @click="handleLogin"
  />
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const accountStore = useAccountStore()
const { loggedIn: hasLoggedIn } = useUserSession()

async function handleLogin() {
  if (hasLoggedIn.value) return
  await accountStore.login()
}
</script>
