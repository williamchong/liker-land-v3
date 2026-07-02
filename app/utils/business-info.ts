export const COMPANY_LEGAL_NAME = 'Liker Land, Inc.'

export const CUSTOMER_SERVICE_EMAIL = 'cs@3ook.com'

export const DOCS_SITE_URL = 'https://docs.3ook.com'

const DOCS_ARTICLE_IDS = {
  privacy: '11847198',
  terms: '11847208',
  shippingReturnRefund: '11847212',
} as const

export function getDocsArticleURL(
  article: keyof typeof DOCS_ARTICLE_IDS,
  locale?: string,
) {
  const docsLocale = locale === 'en' ? 'en' : 'zh-TW'
  return `${DOCS_SITE_URL}/${docsLocale}/articles/${DOCS_ARTICLE_IDS[article]}`
}
