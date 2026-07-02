<template>
  <NuxtLayout
    name="default"
    :is-footer-visible="true"
  >
    <div class="flex flex-col grow gap-12 w-full max-w-4xl mx-auto px-4 pt-12 pb-4">
      <header class="space-y-3 text-center">
        <h1
          class="text-3xl md:text-4xl font-bold text-highlighted"
          v-text="$t('contact_page_title')"
        />
        <p
          class="text-lg text-muted leading-relaxed max-w-2xl mx-auto"
          v-text="$t('contact_page_description')"
        />
      </header>

      <div class="grid md:grid-cols-3 gap-6">
        <UCard
          v-for="method in contactMethods"
          :key="method.key"
          class="flex flex-col"
          :ui="cardUI"
        >
          <div class="flex items-center gap-2">
            <UIcon
              :name="method.icon"
              size="28"
              class="text-primary"
            />
            <h2
              class="text-xl font-semibold text-highlighted"
              v-text="method.title"
            />
          </div>
          <p
            class="text-muted"
            v-text="method.content"
          />
          <UButton
            class="mt-auto self-center"
            color="primary"
            v-bind="method.button"
          />
        </UCard>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
})

const { t: $t } = useI18n()
const config = useRuntimeConfig()
const baseURL = config.public.baseURL
const intercom = useIntercom()

const cardUI = { body: 'flex flex-col items-start grow gap-3' }

function handleEmailClick() {
  useLogEvent('contact_page_email_click')
}

function handleChatClick() {
  useLogEvent('contact_page_chat_click')
  intercom.show()
}

function handleHelpCenterClick() {
  useLogEvent('contact_page_help_center_click')
}

const contactMethods = computed(() => [
  {
    key: 'email',
    icon: 'i-material-symbols-mail-outline-rounded',
    title: $t('contact_page_email_title'),
    content: $t('contact_page_email_content'),
    button: {
      to: `mailto:${CUSTOMER_SERVICE_EMAIL}`,
      label: CUSTOMER_SERVICE_EMAIL,
      variant: 'outline',
      icon: 'i-material-symbols-mail-outline-rounded',
      onClick: handleEmailClick,
    },
  },
  {
    key: 'chat',
    icon: 'i-material-symbols-support-agent-rounded',
    title: $t('contact_page_chat_title'),
    content: $t('contact_page_chat_content'),
    button: {
      label: $t('contact_page_chat_button_label'),
      icon: 'i-material-symbols-chat-bubble-outline-rounded',
      onClick: handleChatClick,
    },
  },
  {
    key: 'help',
    icon: 'i-material-symbols-help-outline-rounded',
    title: $t('contact_page_help_center_title'),
    content: $t('contact_page_help_center_content'),
    button: {
      to: DOCS_SITE_URL,
      target: '_blank',
      rel: 'noopener noreferrer',
      label: $t('contact_page_help_center_button_label'),
      variant: 'outline',
      trailingIcon: 'i-material-symbols-open-in-new-rounded',
      onClick: handleHelpCenterClick,
    },
  },
] as const)

const pageTitle = computed(() => $t('contact_page_title'))
const pageDescription = computed(() => $t('contact_page_description'))
const canonicalURL = computed(() => `${baseURL}/contact`)

useHead(() => ({
  title: pageTitle.value,
  meta: [
    { name: 'description', content: pageDescription.value },
    { property: 'og:title', content: pageTitle.value },
    { property: 'og:description', content: pageDescription.value },
    { property: 'og:image', content: `${baseURL}/images/og/default.jpg` },
    { property: 'og:url', content: canonicalURL.value },
    { property: 'og:type', content: 'website' },
  ],
  link: [
    { rel: 'canonical', href: canonicalURL.value },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        'name': pageTitle.value,
        'description': pageDescription.value,
        'url': canonicalURL.value,
        'about': { '@id': `${baseURL}/#organization` },
      }),
    },
  ],
}))
</script>
