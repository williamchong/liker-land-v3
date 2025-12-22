function generateReadAction({
  urlTemplate,
  price,
  isSoldOut = false,
}: {
  urlTemplate: string
  price?: number
  isSoldOut?: boolean
}) {
  const action: Record<string, unknown> = {
    '@type': 'ReadAction',
    'target': {
      '@type': 'EntryPoint',
      'urlTemplate': urlTemplate,
      'actionPlatform': [
        'https://schema.org/DesktopWebPlatform',
        'https://schema.org/AndroidPlatform',
        'https://schema.org/IOSPlatform',
      ],
    },
  }

  if (price !== undefined) {
    const offer: Record<string, unknown> = {
      '@type': 'Offer',
      'category': price > 0 ? 'purchase' : 'free',
      'price': price,
      'priceCurrency': 'USD',
      'availability': isSoldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    }

    action.expectsAcceptanceOf = offer
  }

  return action
}

export function useStorePageStructuredData({
  items,
  canonicalURL,
  name,
  description,
}: {
  items: Array<{
    classId?: string
    title?: string
    imageUrl?: string
    minPrice?: number
  }>
  canonicalURL: string
  name: string
  description?: string
}) {
  const config = useRuntimeConfig()
  const baseURL = config.public.baseURL
  const bookstoreStore = useBookstoreStore()

  const listItems = items
    .filter(item => item.classId && item.title)
    .map((item, index) => {
      const bookInfo = bookstoreStore.getBookstoreInfoByNFTClassId(item.classId!)
      const authorName = bookInfo?.author?.name || ''

      return {
        '@type': 'ListItem',
        'position': index + 1,
        'item': {
          '@type': 'Book',
          '@id': `${baseURL}/store/${item.classId}`,
          'url': `${baseURL}/store/${item.classId}`,
          'name': item.title,
          'image': item.imageUrl,
          ...(authorName && { author: authorName }),
          'bookFormat': 'https://schema.org/EBook',
          'potentialAction': generateReadAction({
            urlTemplate: `${baseURL}/store/${item.classId}`,
            price: item.minPrice,
          }),
        },
      }
    })

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'url': canonicalURL,
    'name': name,
    ...(description && { description }),
    'numberOfItems': listItems.length,
    'itemListElement': listItems,
  }
}

export function useStructuredData(
  { nftClassId }: { nftClassId: string | Ref<string> | ComputedRef<string> },
) {
  const bookInfo = useBookInfo({ nftClassId })
  const config = useRuntimeConfig()

  function generateOGMetaTags({
    selectedPricingItemIndex = 0,
  }) {
    const nftClassIdValue = toValue(nftClassId)
    const authorName = bookInfo.authorName.value
    const isbn = bookInfo.isbn.value
    const inLanguage = bookInfo.inLanguage.value
    const nftClassOwnerWalletAddress = bookInfo.nftClassOwnerWalletAddress.value

    const pricingItems = bookInfo.pricingItems.value
    const pricingItem = pricingItems[selectedPricingItemIndex]
    if (!pricingItem || bookInfo.isHidden.value || !bookInfo.isApprovedForAds.value) {
      return []
    }
    const meta = [{
      property: 'og:price:amount',
      content: pricingItem.price,
    },
    {
      property: 'product:price:amount',
      content: pricingItem.price,
    },
    {
      property: 'og:price:currency',
      content: 'USD',
    },
    {
      property: 'product:price:currency',
      content: 'USD',
    },
    {
      property: 'product:availability',
      content: pricingItem.isSoldOut ? 'out of stock' : 'in stock',
    },
    {
      property: 'product:brand',
      content: '3ook.com',
    },
    {
      property: 'product:catalog_id',
      content: `${nftClassIdValue}-${pricingItem.index}`,
    },
    {
      property: 'product:retailer_item_id',
      content: `${nftClassIdValue}-${pricingItem.index}`,
    },
    {
      property: 'item_group_id',
      content: nftClassIdValue,
    },
    {
      property: 'product:category',
      content: 543542, // ebook
    },
    {
      property: 'product:condition',
      content: 'new',
    },
    {
      property: 'product:custom_label_0',
      content: nftClassOwnerWalletAddress,
    },
    {
      property: 'product:brand',
      content: '3ook.com',
    },
    {
      property: 'og:type',
      content: 'product',
    }]
    if (isbn) {
      meta.push({
        property: 'product:gtin',
        content: isbn,
      })
      meta.push({
        property: 'product:isbn',
        content: isbn,
      })
    }
    if (authorName) {
      meta.push({
        property: 'product:custom_label_1',
        content: authorName,
      })
    }
    if (inLanguage) {
      meta.push({
        property: 'product:locale',
        content: inLanguage,
      })
    }
    return meta
  }

  function generateBookStructuredData({ canonicalURL }: { canonicalURL: string }) {
    const nftClassIdValue = toValue(nftClassId)
    if (bookInfo.isHidden.value) {
      return []
    }

    const baseURL = config.public.baseURL

    const name = bookInfo.name.value
    const description = bookInfo.description.value
    const image = bookInfo.coverSrc.value
    const authorName = bookInfo.authorName.value
    const publisherName = bookInfo.publisherName.value
    const datePublished = bookInfo.formattedPublishedDate.value
    const rawKeywords = bookInfo.keywords.value
    const keywords = Array.isArray(rawKeywords) ? rawKeywords.join(',') : rawKeywords
    const isbn = bookInfo.isbn.value
    const inLanguage = bookInfo.inLanguage.value

    const pricingItems = bookInfo.pricingItems.value
    const productsStructuredData = pricingItems.map((pricing) => {
      const productId = `${nftClassIdValue}-${pricing.index}`
      const skuId = productId

      return {
        '@context': 'https://schema.org',
        '@type': ['Book', 'Product'],
        '@id': `${canonicalURL}?price_index=${pricing.index}`,
        'url': `${canonicalURL}?price_index=${pricing.index}`,
        'name': pricing?.name ? `${name} - ${authorName} - ${pricing.name}` : `${name} - ${authorName}`,
        image,
        description,
        'brand': {
          '@context': 'https://schema.org',
          '@type': 'Brand',
          'name': '3ook.com',
        },
        'author': authorName,
        'sku': skuId,
        'publisher': publisherName,
        isbn,
        inLanguage,
        datePublished,
        keywords,
        'bookFormat': 'https://schema.org/EBook',
        'bookEdition': pricing?.name,
        'offers': {
          '@context': 'https://schema.org',
          '@type': 'Offer',
          'seller': {
            '@context': 'https://schema.org',
            '@type': 'Person',
            'identifier': bookInfo.nftClassOwnerWalletAddress.value,
          },
          'url': `${canonicalURL}?price_index=${pricing.index}`,
          'price': pricing?.price || 0,
          'priceCurrency': 'USD',
          'availability': pricing?.isSoldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/LimitedAvailability',
          'itemCondition': 'https://schema.org/NewCondition',
          'checkoutPageURLTemplate': `${baseURL}/checkout?products=${productId}&utm_medium=structured-data`,
          'shippingDetails': {
            '@type': 'OfferShippingDetails',
            'shippingRate': {
              '@type': 'MonetaryAmount',
              'value': 0,
              'currency': 'USD',
            },
            'deliveryTime': {
              '@type': 'ShippingDeliveryTime',
              'handlingTime': !pricing.isAutoDeliver
                ? {
                    '@type': 'QuantitativeValue',
                    'minValue': 1,
                    'maxValue': 7,
                    'unitCode': 'DAY',
                  }
                : {
                    '@type': 'QuantitativeValue',
                    'minValue': 0,
                    'maxValue': 0,
                    'unitCode': 'DAY',
                  },
              'transitTime': {
                '@type': 'QuantitativeValue',
                'minValue': 0,
                'maxValue': 0,
                'unitCode': 'DAY',
              },
            },
          },
          'hasMerchantReturnPolicy': {
            '@type': 'MerchantReturnPolicy',
            'returnPolicyCategory': 'https://schema.org/MerchantReturnNotPermitted',
          },
        },
        'potentialAction': generateReadAction({
          urlTemplate: `${baseURL}/store/${nftClassIdValue}`,
          price: pricing?.price || 0,
          isSoldOut: pricing?.isSoldOut || false,
        }),
        'productID': productId,
        'inProductGroupWithID': nftClassIdValue,
      }
    })

    const workExamples = productsStructuredData.map(product => ({
      '@id': product['@id'],
    }))

    const productGroupStructuredData = {
      '@context': 'https://schema.org',
      '@type': ['Book', 'ProductGroup'],
      'url': canonicalURL,
      'name': `${name} - ${authorName}`,
      image,
      description,
      'brand': {
        '@context': 'https://schema.org',
        '@type': 'Brand',
        'name': '3ook.com',
      },
      'author': authorName,
      'sku': nftClassIdValue,
      'publisher': publisherName,
      isbn,
      inLanguage,
      datePublished,
      keywords,
      'bookFormat': 'https://schema.org/EBook',
      'productGroupID': nftClassIdValue,
      'workExample': workExamples,
      'hasVariant': workExamples,
      'variesBy': ['https://schema.org/BookEdition'],
    }

    return [...productsStructuredData, productGroupStructuredData]
  }

  return {
    generateOGMetaTags,
    generateBookStructuredData,
  }
}
