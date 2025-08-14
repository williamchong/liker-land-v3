<template>
  <NuxtLayout
    name="default"
    :is-footer-visible-in-mobile="true"
  >
    <AppHeader :is-connect-hidden="false" />

    <main class="w-full max-w-4xl mx-auto px-4 py-8 space-y-12">
      <!-- Hero Section with Banner -->
      <section class="text-center space-y-6">
        <div class="w-full max-w-2xl mx-auto">
          <img
            src="/images/og/default.jpg"
            alt="3ook.com"
            class="w-full h-auto rounded-lg shadow-lg"
          >
        </div>
        <div class="space-y-4">
          <h1 class="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100">
            {{ $t('about_page_hero_title') }}
          </h1>
          <p class="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {{ $t('about_page_hero_subtitle') }}
          </p>
        </div>
      </section>

      <!-- What is 3ook.com Section -->
      <UCard class="p-8">
        <h2 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {{ $t('about_page_what_is_title') }}
        </h2>
        <p class="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
          {{ $t('about_page_what_is_content') }}
        </p>
      </UCard>

      <!-- Key Features Section -->
      <section class="space-y-6">
        <h2 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 text-center">
          {{ $t('about_page_features_title') }}
        </h2>

        <div class="grid md:grid-cols-2 gap-6">
          <UCard class="p-6 space-y-3">
            <div class="flex items-center gap-3">
              <UIcon
                name="i-material-symbols-volume-up-rounded"
                size="24"
                class="text-primary"
              />
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {{ $t('about_page_feature_ai_narration') }}
              </h3>
            </div>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t('about_page_feature_ai_narration_desc') }}
            </p>
          </UCard>

          <UCard class="p-6 space-y-3">
            <div class="flex items-center gap-3">
              <UIcon
                name="i-material-symbols-auto-stories-rounded"
                size="24"
                class="text-primary"
              />
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {{ $t('about_page_feature_dual_format') }}
              </h3>
            </div>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t('about_page_feature_dual_format_desc') }}
            </p>
          </UCard>

          <UCard class="p-6 space-y-3">
            <div class="flex items-center gap-3">
              <UIcon
                name="i-material-symbols-store-rounded"
                size="24"
                class="text-primary"
              />
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {{ $t('about_page_feature_web3') }}
              </h3>
            </div>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t('about_page_feature_web3_desc') }}
            </p>
          </UCard>

          <UCard class="p-6 space-y-3">
            <div class="flex items-center gap-3">
              <UIcon
                name="i-material-symbols-handshake-rounded"
                size="24"
                class="text-primary"
              />
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {{ $t('about_page_feature_author_benefits') }}
              </h3>
            </div>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t('about_page_feature_author_benefits_desc') }}
            </p>
          </UCard>
        </div>
      </section>

      <!-- Mission Section -->
      <UCard class="p-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <h2 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {{ $t('about_page_mission_title') }}
        </h2>
        <p class="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
          {{ $t('about_page_mission_content') }}
        </p>
      </UCard>

      <!-- Team Section -->
      <UCard class="p-8">
        <h2 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {{ $t('about_page_team_title') }}
        </h2>
        <p class="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
          {{ $t('about_page_team_content') }}
        </p>
      </UCard>

      <!-- Platform Evolution Section -->
      <UCard class="p-8">
        <h2 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {{ $t('about_page_platform_title') }}
        </h2>
        <p class="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
          {{ $t('about_page_platform_evolution') }}
        </p>
      </UCard>

      <!-- Get Started Section -->
      <section class="text-center space-y-6">
        <h2 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
          {{ $t('about_page_contact_title') }}
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {{ $t('about_page_contact_content') }}
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <UButton
            :to="localeRoute({ name: 'store' })"
            color="primary"
            size="lg"
            icon="i-material-symbols-store-rounded"
          >
            {{ $t('app_header_store') }}
          </UButton>
          <UButton
            to="https://docs.3ook.com?utm_source=3ookcom&utm_medium=referral&utm_campaign=about_page"
            target="_blank"
            variant="outline"
            size="lg"
            icon="i-material-symbols-question-mark-rounded"
            trailing-icon="i-material-symbols-share-windows-rounded"
          >
            {{ $t('account_page_faq') }}
          </UButton>
        </div>
      </section>
    </main>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const config = useRuntimeConfig()
const baseURL = config.public.baseURL

const pageTitle = computed(() => $t('about_page_title'))
const pageDescription = computed(() => $t('about_page_hero_subtitle'))
const canonicalURL = computed(() => `${baseURL}/about`)

useHead({
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
})
</script>
