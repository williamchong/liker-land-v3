export function useFormatPrice() {
  const { t: $t } = useI18n()
  return (price: number) => {
    if (price > 0) {
      return `$${new Intl.NumberFormat('en-US').format(price)}`
    }
    return $t('price_free')
  }
}
